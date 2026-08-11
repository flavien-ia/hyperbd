#!/usr/bin/env node
// Le contrôle mécanique : ce qu'on peut vérifier sans jugement.
//
// Il ne dit jamais si c'est bien écrit (c'est le travail des juges). Il dit ce
// qui est faux de façon vérifiable : une typographie interdite, un synopsis qui
// déborde, une scène sans budget, une carte sans un seul rappel.
//
// Usage :
//   node bd-lint.mjs --projet <slug>          contrôle la Toile d'un projet
//   node bd-lint.mjs --fichier <chemin>       contrôle un texte
//
//   --largeur-mm <n>   largeur de la page imprimée (défaut : 240, format
//                      d'album courant). Sert à dire si le lettrage se lira.
//
// Sortie : JSON { drapeaux: [...], compte: {...} }. Exit 0 même s'il y a des
// drapeaux : c'est un rapport, pas un échec de commande.

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const lire = (nom) => {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : null;
};

/** Deux lignes de synopsis : au-delà, c'est de la mise en scène. */
const SYNOPSIS_MAX = 240;
/** Une question ouverte depuis plus longtemps mérite qu'on la relance. */
const QUESTION_JOURS = 7;
/**
 * Au-delà, une bulle mange sa case. Ce n'est pas un interdit : une tirade peut
 * valoir sa place. C'est un prix, et on le signale pour qu'il soit payé
 * sciemment.
 */
const BULLE_MOTS_MAX = 25;

/**
 * Les marques de valeur de plan reconnues.
 *
 * Volontairement large : abréviations de scénario, formulations en toutes
 * lettres, et l'anglais qu'on croise souvent dans les prompts. Une case dont
 * la description ne dit rien du cadrage laisse le modèle choisir, et il
 * choisit toujours le plan moyen de face.
 */
/**
 * Largeur de la page imprimée, en millimètres.
 *
 * Format d'album le plus courant. Sert à traduire une taille de police (donnée
 * en fraction de la largeur de l'image) en millimètres réels : c'est le seul
 * chiffre qui dise si le texte se lira. Surchargeable par `--largeur-mm`, et
 * toujours rappelé dans le message pour qu'on sache sur quoi le calcul porte.
 */
const LARGEUR_PAGE_MM = 240;

/** En dessous, un lecteur adulte peine sur une bulle. */
const CAPITALE_MIN_MM = 2;

/**
 * Écart de couleur en dessous duquel deux bulles ne se distinguent plus.
 *
 * Mesuré en ΔE (CIE76) : deux bleus voisins d'un même album tombent à 8, deux
 * gris proches à 16, deux couleurs franchement distinctes au-delà de 80.
 */
const DELTA_E_MIN = 25;
/** Même écart, une fois la vision des couleurs simulée : on tolère un peu moins. */
const DELTA_E_MIN_DALTONIEN = 18;

const PLANS = [
  /\[(?:tgp|gp|pm|pa|pl|pe|pt|ps)\]/i,
  /\b(?:tr[èe]s )?gros plan\b/i,
  /\bplan (?:large|moyen|am[ée]ricain|d['’]ensemble|rapproch[ée]|serr[ée]|taille|italien|g[ée]n[ée]ral|fixe|s[ée]quence)\b/i,
  /\bplong[ée]e\b|\bcontre-?plong[ée]e\b/i,
  /\ben plan\b|\bcadr[ée]\w* (?:serr|large|sur)/i,
  /\b(?:close-?up|wide shot|medium shot|establishing shot|extreme close)\b/i,
  /\bvue (?:a[ée]rienne|de dessus|du dessus|subjective)\b/i,
];

const drapeaux = [];
const signaler = (gravite, quoi, ou, quoiFaire) =>
  drapeaux.push({ gravite, quoi, ou, quoiFaire });

/**
 * La typographie du projet.
 *
 * Le tiret cadratin et le demi-cadratin sont proscrits partout, sans exception :
 * c'est une règle de la maison, et elle vaut pour ce qu'écrivent les humains
 * comme pour ce qu'écrivent les agents.
 */
function typographie(texte, ou) {
  if (/[—–]/.test(texte)) {
    signaler(
      "erreur",
      "tiret cadratin ou demi-cadratin",
      ou,
      "remplacer par une virgule, un deux-points, des parenthèses ou un tiret simple",
    );
  }
  if (/\\u[0-9a-fA-F]{4}/.test(texte)) {
    signaler(
      "erreur",
      "caractère échappé au lieu du vrai caractère",
      ou,
      "écrire les accents en clair",
    );
  }
  // L'apostrophe droite dans du français suivi : tolérée dans du code, pas
  // dans de la prose.
  const droites = (texte.match(/[a-zà-ÿ]'[a-zà-ÿ]/gi) ?? []).length;
  if (droites > 2) {
    signaler(
      "avertissement",
      `${droites} apostrophes droites`,
      ou,
      "utiliser l'apostrophe typographique",
    );
  }
}

// ── La couleur des bulles ───────────────────────────────────────────────────
//
// La doctrine dit depuis le début que les couleurs de bulles doivent se
// distinguer, y compris pour un lecteur qui distingue mal les couleurs. Rien
// ne le vérifiait : deux bleus voisins sont passés jusqu'au tirage d'essai, et
// c'est un juge qui les a repérés, par hasard.

const composantes = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/** sRGB vers linéaire : les moyennes de couleur n'ont de sens que là. */
const lineaire = (c) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

/** Vers L*a*b*, l'espace où une distance ressemble à une différence perçue. */
function versLab([r, g, b]) {
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

const ecart = (a, b) => {
  const [A, B] = [versLab(a), versLab(b)];
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
};

/**
 * Simule une vision dichromate (méthode de Viénot, en RGB linéaire).
 *
 * `deuteranope` (pas de cônes M) et `protanope` (pas de cônes L) couvrent
 * l'immense majorité des cas : environ un homme sur douze.
 */
function simuler([r, g, b], type) {
  const L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  const M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  const S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
  const [L2, M2, S2] =
    type === "deuteranope"
      ? [L, 0.494207 * L + 1.24827 * S, S]
      : [2.02344 * M - 2.52581 * S, M, S];
  return [
    0.080944 * L2 - 0.130504 * M2 + 0.116721 * S2,
    -0.010248 * L2 + 0.054019 * M2 - 0.113614 * S2,
    -0.000365 * L2 - 0.004122 * M2 + 0.693513 * S2,
  ];
}

async function appel(chemin) {
  const f = join(homedir(), ".hyperbd", "acces.json");
  if (!existsSync(f)) throw new Error("Aucun accès enregistré (`/bd-connect`).");
  const { url, token } = JSON.parse(readFileSync(f, "utf8"));
  const r = await fetch(`${url.replace(/\/$/, "")}/api/v1${chemin}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const d = JSON.parse((await r.text()) || "{}");
  if (!r.ok) throw new Error(d?.error?.message ?? `HTTP ${r.status}`);
  return d;
}

async function controlerProjet(projet) {
  const { nodes, edges } = await appel(`/projects/${projet}/nodes`);
  const scenes = nodes.filter((n) => n.type === "scene");
  const actes = nodes.filter((n) => n.type === "acte");
  const questions = nodes.filter((n) => n.type === "question");

  for (const n of nodes) {
    const ou = `${n.type} « ${n.title || "sans titre"} »`;
    typographie(`${n.title} ${n.meta?.synopsis ?? ""}`, ou);

    if (n.type === "scene") {
      const syn = n.meta?.synopsis ?? "";
      if (!syn.trim()) {
        signaler("avertissement", "scène sans synopsis", ou, "deux lignes suffisent");
      } else if (syn.length > SYNOPSIS_MAX) {
        signaler(
          "avertissement",
          `synopsis de ${syn.length} caractères`,
          ou,
          `le ramener sous ${SYNOPSIS_MAX} : le reste est de la mise en scène`,
        );
      }
      if (!n.meta?.budgetPlanches) {
        signaler(
          "erreur",
          "scène sans budget de planches",
          ou,
          "sans budget, le total de l'album ne veut rien dire",
        );
      }
      if (!n.aUnCorps && n.status === "valide") {
        signaler(
          "avertissement",
          "scène validée mais pas écrite",
          ou,
          "écrire sa mise en scène, ou la repasser en discutée",
        );
      }
    }

    if (n.type === "question" && n.status !== "valide" && n.status !== "ecarte") {
      signaler(
        "info",
        "question encore ouverte",
        ou,
        "la trancher avant de produire des planches",
      );
    }
  }

  // Une carte sans aucun rappel n'a pas de fil qui la traverse : ce n'est pas
  // une faute, mais cela se signale.
  const rappels = edges.filter((e) => e.type === "rappel");
  if (scenes.length >= 6 && rappels.length === 0) {
    signaler(
      "avertissement",
      "aucun rappel tracé",
      "la carte",
      "relier ce qui est installé à ce qui le paie plus tard",
    );
  }

  await controlerVisuel(projet, nodes);
  const dialogue = await controlerDialogue(projet);

  const budget = scenes.reduce(
    (t, s) => t + (s.meta?.budgetPlanches ?? 0),
    0,
  );

  return {
    compte: {
      actes: actes.length,
      scenes: scenes.length,
      questionsOuvertes: questions.filter(
        (q) => q.status !== "valide" && q.status !== "ecarte",
      ).length,
      rappels: rappels.length,
      budgetPlanches: budget,
      ...dialogue,
    },
  };
}

/**
 * Ce qui se vérifie dans le découpage et les dialogues.
 *
 * Aucune de ces règles ne dit si c'est bien écrit : elles disent qu'une bulle
 * déborde de sa case, qu'une planche ne raconte rien, qu'un cadrage n'a pas été
 * choisi. Toutes sont des AVERTISSEMENTS : la doctrine se transcende, et un
 * linter n'a pas à trancher à la place d'un auteur.
 *
 * Les répliques ne sont pas parsées ici : l'atelier les extrait avec le code
 * qui sert à dériver le lettrage. Une seule implémentation de la convention,
 * donc aucune dérive possible entre ce que le linter voit et ce qui sera lettré.
 */
async function controlerDialogue(projet) {
  const { planches, repliques } = await appel(
    `/projects/${projet}/repliques?scripts=1`,
  );
  if (!planches?.length) return { planchesEcrites: 0, repliques: 0 };

  // Un personnage nommé de deux façons, ce sont deux personnages : deux
  // couleurs de bulle, deux voix, et un juge qui ne peut plus rien attribuer.
  // C'est le cas typique d'une planche écrite avant que le casting soit posé,
  // ou d'un nom raccourci en cours de route.
  const { personnages } = await appel(`/projects/${projet}/universe`);
  const connus = new Set(
    (personnages ?? []).flatMap((p) => [
      (p.name ?? "").trim().toLowerCase(),
      ...(p.variantes ?? []).map((v) => (v.name ?? "").trim().toLowerCase()),
    ]),
  );
  // Deux couleurs de bulle trop proches, ce sont deux personnages qu'on ne
  // distingue plus d'un coup d'œil dans une case où ils parlent tous les deux.
  const colores = (personnages ?? []).filter((p) =>
    /^#[0-9a-f]{6}$/i.test(p.bubbleColor ?? ""),
  );
  for (let i = 0; i < colores.length; i++) {
    for (let j = i + 1; j < colores.length; j++) {
      const [a, b] = [colores[i], colores[j]];
      const [ra, rb] = [a.bubbleColor, b.bubbleColor].map((h) =>
        composantes(h).map(lineaire),
      );
      const ou = `« ${a.name} » et « ${b.name} »`;
      const d = ecart(ra, rb);
      if (d < DELTA_E_MIN) {
        signaler(
          "avertissement",
          `couleurs de bulle trop proches (écart ${Math.round(d)}, il en faut ${DELTA_E_MIN})`,
          ou,
          `${a.bubbleColor} et ${b.bubbleColor} se confondront dans une case où ils parlent tous les deux : écarter la teinte, pas seulement la nuance`,
        );
        continue;
      }
      for (const type of ["deuteranope", "protanope"]) {
        const dd = ecart(simuler(ra, type), simuler(rb, type));
        if (dd < DELTA_E_MIN_DALTONIEN) {
          signaler(
            "avertissement",
            `couleurs de bulle confondues en vision ${type} (écart ${Math.round(dd)} contre ${Math.round(d)} en vision courante)`,
            ou,
            "environ un homme sur douze les verra identiques : jouer aussi sur la clarté, pas seulement sur la teinte",
          );
          break;
        }
      }
    }
  }

  const inconnus = new Map();
  for (const r of repliques ?? []) {
    if (connus.size && !connus.has(r.name.trim().toLowerCase())) {
      inconnus.set(r.name, (inconnus.get(r.name) ?? 0) + 1);
    }
  }
  for (const [nom, n] of inconnus) {
    signaler(
      "avertissement",
      `« ${nom} » parle ${n} fois sans être au casting`,
      "les dialogues",
      "un nom qui ne correspond à aucun personnage de la bibliothèque prend la couleur de bulle par défaut : le renommer, ou l'ajouter au casting",
    );
  }

  for (const r of repliques ?? []) {
    const ou = `${r.plancheTitre}, « ${r.text.slice(0, 40)}${r.text.length > 40 ? "…" : ""} »`;
    typographie(r.text, `réplique de ${r.name} (${ou})`);
    if (r.mots > BULLE_MOTS_MAX) {
      signaler(
        "avertissement",
        `réplique de ${r.mots} mots`,
        `${r.plancheTitre}, « ${r.text.slice(0, 48)}${r.text.length > 48 ? "…" : ""} »`,
        `au-delà de ${BULLE_MOTS_MAX} mots la bulle mange sa case : couper, ou assumer la tirade`,
      );
    }
  }

  // Une ligne de style (l'ambiance de la planche) : on ne la réclame jamais
  // dans l'absolu. Un projet peut très bien s'en passer. Mais si LES AUTRES
  // planches en ont une, celle qui n'en a pas partira ailleurs en couleur.
  const avecAmbiance = planches.filter((p) => (p.footer ?? "").trim()).length;
  const majoriteEnA = avecAmbiance > planches.length / 2;

  for (const p of planches) {
    const cases = p.cases ?? [];
    const description = cases
      .map((c) => c.script ?? "")
      .join("\n")
      .split(/\r?\n/)
      // Une ligne de réplique n'est pas une description d'action : c'est
      // justement ce qui distingue une planche muette d'une planche vide.
      .filter((l) => l.trim() && !/^[^:(\n#>*|[]{1,45}?\s*(?:\([^)\n]*\))?\s*:\s+\S/.test(l.trim()))
      .join(" ")
      .trim();

    const sansParole = p.nbRepliques === 0;
    const sansAction = description.length < 40;

    if (sansParole && sansAction) {
      signaler(
        "avertissement",
        "planche sans parole et sans action décrite",
        `planche « ${p.title || p.slug || p.id} »`,
        "écrire ce qui s'y passe : une planche vide se générera au hasard",
      );
    }

    if (cases.length && !PLANS.some((re) => cases.some((c) => re.test(c.script ?? "")))) {
      signaler(
        "avertissement",
        "aucune valeur de plan dans le découpage",
        `planche « ${p.title || p.slug || p.id} »`,
        "dire les cadrages (plan large, gros plan…) : sans eux le modèle choisit, et il choisit le plan moyen de face",
      );
    }

    if (majoriteEnA && !(p.footer ?? "").trim()) {
      signaler(
        "avertissement",
        "planche sans ligne d'ambiance alors que l'album en a partout",
        `planche « ${p.title || p.slug || p.id} »`,
        "reprendre la ligne d'ambiance des voisines, ou assumer la rupture",
      );
    }
  }

  return {
    planchesEcrites: planches.length,
    repliques: (repliques ?? []).length,
    locuteurs: new Set((repliques ?? []).map((r) => r.name)).size,
  };
}

/**
 * Ce qui se vérifie du côté visuel et documentaire.
 *
 * Trois choses qui ne se voient pas en lisant, et qui coûtent cher plus tard :
 * dessiner sans direction artistique arrêtée, une source qui ne mène nulle
 * part, et un QR imprimé qui vise une fiche disparue.
 */
async function controlerVisuel(projet, nodes) {
  const { docs } = await appel(`/projects/${projet}/docs`);
  const aBibleGraphique = (docs ?? []).some(
    (d) => d.kind === "bible-graphique",
  );

  // On dessine des personnages sans avoir arrêté le style : chaque image
  // produite maintenant sera à refaire quand la DA sera posée.
  const { essais } = await appel(`/projects/${projet}/essais`);
  const dessine = (essais ?? []).some((e) =>
    ["personnage", "decor", "motif"].includes(e.kind),
  );
  if (dessine && !aBibleGraphique) {
    signaler(
      "erreur",
      "des personnages ou des décors sont dessinés sans bible graphique",
      "le projet",
      "poser la direction artistique avant de produire : sinon ces images seront à refaire",
    );
  }

  const { sources } = await appel(`/projects/${projet}/sources`);
  const vivantes = new Set((sources ?? []).map((s) => s.id));

  for (const src of sources ?? []) {
    if (!src.url?.trim()) {
      signaler(
        "avertissement",
        "source sans lien vers le document d'origine",
        `source « ${src.title || src.slug} »`,
        "une fiche qui ne mène à rien remplace la source au lieu d'y conduire",
      );
    }
  }

  // Un QR imprimé vise une ancre pour toujours : si la source a disparu, le
  // lecteur tombera sur du vide, et les albums sont déjà tirés.
  const largeurMm = Number(lire("largeur-mm")) || LARGEUR_PAGE_MM;

  const { planches } = await appel(`/projects/${projet}/planches`);
  for (const p of (planches ?? []).filter((x) => x.kind === "planche")) {
    const { lettrage } = await appel(`/planches/${p.id}/lettrage`);
    const ou = `planche « ${p.title || p.code || p.id} »`;

    // La plus PETITE police de la planche décide si le lecteur peine, pas la
    // moyenne. Le nombre de pixels ne dit rien : seule la taille au tirage le
    // dit, et elle se calcule.
    const polices = (lettrage?.bulles ?? [])
      .filter((b) => b.kind === "bulle" && b.placed)
      .map((b) => b.fontSize)
      .filter((f) => typeof f === "number" && f > 0);
    if (polices.length) {
      const mm = Math.min(...polices) * largeurMm;
      if (mm < CAPITALE_MIN_MM) {
        signaler(
          "avertissement",
          `texte à ${mm.toFixed(2)} mm de capitale sur une page de ${largeurMm / 10} cm`,
          ou,
          `en dessous de ${CAPITALE_MIN_MM} mm un lecteur adulte peine : agrandir la police, ou dire que l'album s'imprime plus grand (--largeur-mm)`,
        );
      }
    }

    for (const b of lettrage?.bulles ?? []) {
      if (b.kind !== "qrcode" || !b.sourceId) continue;
      if (!vivantes.has(b.sourceId)) {
        signaler(
          "erreur",
          "QR code lié à une source retirée",
          ou,
          "remettre la source, ou refaire pointer le QR ailleurs AVANT le tirage",
        );
      }
    }
  }
}

function controlerFichier(chemin) {
  const texte = readFileSync(chemin, "utf8");
  typographie(texte, chemin);
  return {
    compte: {
      caracteres: texte.length,
      lignes: texte.split(/\r?\n/).length,
    },
  };
}

const projet = lire("projet");
const fichier = lire("fichier");

const tache = projet
  ? controlerProjet(projet)
  : fichier
    ? Promise.resolve(controlerFichier(fichier))
    : Promise.reject(new Error("Il faut --projet <slug> ou --fichier <chemin>."));

tache
  .then((r) => {
    const erreurs = drapeaux.filter((d) => d.gravite === "erreur").length;
    console.log(
      JSON.stringify({ ...r, drapeaux, verdict: erreurs === 0 ? "propre" : "a corriger" }, null, 2),
    );
  })
  .catch((e) => {
    console.log(JSON.stringify({ erreur: e.message }, null, 2));
    process.exit(1);
  });
