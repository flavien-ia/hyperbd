#!/usr/bin/env node
// L'épreuve d'aveugle : est-ce qu'on reconnaît qui parle sans le nom ?
//
// C'est LE test de la différenciation des voix. On retire les noms, on demande
// à un juge d'attribuer chaque réplique, et on compte. Le taux est MESURÉ ici,
// par du code : un modèle qui s'auto-note se trouve toujours bon, et c'est
// exactement l'erreur qu'on ne veut plus commettre.
//
// Deux temps, volontairement séparés :
//
//   prepare  --in <repliques.json> --anon <sortie.md> --cle <cle.json>
//   score    --cle <cle.json> --reponses <reponses.json>
//
// Le juge qui attribue ne voit JAMAIS la clé : elle est écrite dans un fichier
// qu'on ne lui donne pas. Il rend ses réponses, le score se calcule après.
//
// Sortie : JSON sur stdout. Exit 0 même si les voix sont interchangeables :
// c'est une mesure, pas un échec de commande.

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const sous = args[0];
const lire = (nom) => {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : null;
};

/**
 * En dessous, la mesure ne veut plus rien dire : sur huit répliques, une seule
 * erreur fait bouger le taux de douze points.
 */
const ECHANTILLON_MIN = 12;

/** Ce qu'il faut dépasser pour parler de voix différenciées. */
const SEUIL_KAPPA = 0.55;
const SEUIL_TAUX = 0.7;

// ── Mélange déterministe ────────────────────────────────────────────────────

/**
 * L'ordre de la conversation est un indice qui n'a rien à voir avec la voix :
 * dans un échange à deux, l'alternance seule permet de tout attribuer sans
 * lire une syllabe. On mélange donc, sinon on mesure le tour de parole.
 *
 * Le mélange est déterministe (graine tirée du contenu) pour qu'une même
 * épreuve rejouée donne le même ordre, et donc un résultat comparable.
 */
function melangeur(graine) {
  let x = graine >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0x100000000;
  };
}

function melanger(liste, graine) {
  const rnd = melangeur(graine);
  const out = liste.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── prepare ─────────────────────────────────────────────────────────────────

function preparer() {
  const entree = lire("in");
  const sortieAnon = lire("anon");
  const sortieCle = lire("cle");
  if (!entree || !sortieAnon || !sortieCle) {
    throw new Error("Il faut --in <repliques.json> --anon <sortie.md> --cle <cle.json>.");
  }

  const brut = JSON.parse(readFileSync(entree, "utf8"));
  // On accepte la sortie telle quelle de `studio.mjs repliques`, ou une simple
  // liste : l'appelant ne devrait pas avoir à reformater pour être mesuré.
  const repliques = Array.isArray(brut) ? brut : (brut.repliques ?? []);
  if (!repliques.length) throw new Error("Aucune réplique dans le fichier d'entrée.");

  for (const r of repliques) {
    if (!r?.name || !r?.text) {
      throw new Error("Chaque réplique doit porter `name` et `text`.");
    }
  }

  const personnages = [...new Set(repliques.map((r) => r.name))].sort();
  if (personnages.length < 2) {
    throw new Error(
      `Une épreuve d'attribution demande au moins deux locuteurs (ici : ${personnages[0] ?? "aucun"}). Avec un seul, il n'y a rien à distinguer.`,
    );
  }

  const graine = lire("graine")
    ? Number(lire("graine"))
    : parseInt(
        createHash("sha256")
          .update(repliques.map((r) => r.text).join("\n"))
          .digest("hex")
          .slice(0, 8),
        16,
      );

  const ordre = args.includes("--ordre")
    ? repliques.slice()
    : melanger(repliques, graine);

  const cle = {};
  const lignes = ordre.map((r, i) => {
    const n = String(i + 1);
    cle[n] = r.name;
    return `${n}. ??? : « ${r.text} »`;
  });

  const anon = [
    "# Répliques à attribuer",
    "",
    `Locuteurs possibles : ${personnages.join(", ")}.`,
    "",
    "Chaque ligne est une réplique dont le nom a été retiré. Attribue-la à un",
    "locuteur de la liste, en te fondant sur la voix seule : le registre, le",
    "rythme, le vocabulaire, ce que cette personne dirait ou ne dirait jamais.",
    "",
    "L'ordre a été mélangé exprès : il ne porte aucune information.",
    "",
    ...lignes,
    "",
  ].join("\n");

  writeFileSync(sortieAnon, anon, "utf8");
  writeFileSync(
    sortieCle,
    JSON.stringify({ personnages, graine, cle }, null, 2),
    "utf8",
  );

  return {
    ok: true,
    anon: sortieAnon,
    cle: sortieCle,
    repliques: ordre.length,
    personnages,
    melange: !args.includes("--ordre"),
    fiabilite:
      ordre.length < ECHANTILLON_MIN
        ? `échantillon court (${ordre.length} répliques) : le taux sera bruité, à lire comme une indication`
        : "suffisant",
  };
}

// ── score ───────────────────────────────────────────────────────────────────

function noter() {
  const fCle = lire("cle");
  const fRep = lire("reponses");
  if (!fCle || !fRep) throw new Error("Il faut --cle <cle.json> --reponses <reponses.json>.");

  const { personnages, cle } = JSON.parse(readFileSync(fCle, "utf8"));
  const brut = JSON.parse(readFileSync(fRep, "utf8"));
  const reponses = brut.reponses ?? brut;

  const inconnus = [
    ...new Set(Object.values(reponses).filter((v) => v && !personnages.includes(v))),
  ];
  if (inconnus.length) {
    throw new Error(
      `Réponses hors liste : ${inconnus.join(", ")}. Locuteurs attendus : ${personnages.join(", ")}.`,
    );
  }

  const ids = Object.keys(cle);
  const total = ids.length;

  let justes = 0;
  let nonRepondues = 0;
  const parPersonnage = {};
  const confusions = {};

  for (const id of ids) {
    const vrai = cle[id];
    const dit = reponses[id] ?? null;
    parPersonnage[vrai] ??= { total: 0, justes: 0 };
    parPersonnage[vrai].total += 1;

    if (!dit) {
      // Une réplique laissée de côté est une réplique non attribuée : la
      // compter juste reviendrait à récompenser le silence.
      nonRepondues += 1;
      continue;
    }
    if (dit === vrai) {
      justes += 1;
      parPersonnage[vrai].justes += 1;
    } else {
      const k = `${vrai} pris pour ${dit}`;
      confusions[k] = (confusions[k] ?? 0) + 1;
    }
  }

  for (const p of Object.keys(parPersonnage)) {
    const e = parPersonnage[p];
    e.taux = e.total ? Number((e.justes / e.total).toFixed(3)) : 0;
  }

  const taux = total ? justes / total : 0;

  /**
   * Le hasard n'est pas 1/n.
   *
   * La stratégie idiote la plus efficace n'est pas de tirer au sort : c'est de
   * répondre toujours le personnage qui parle le plus. Sur dix répliques de
   * Mira et deux de Tobias, « Mira » partout donne 83 %. C'est donc CE taux
   * qu'il faut battre, sinon on félicite un juge qui n'a rien lu.
   */
  const effectifs = Object.values(parPersonnage).map((e) => e.total);
  const hasard = total ? Math.max(...effectifs) / total : 0;
  const kappa = hasard >= 1 ? null : (taux - hasard) / (1 - hasard);

  /**
   * La note sur 10 de la dimension `differenciation`, calculée ici et non
   * proposée au juge : c'est une mesure, elle ne se négocie pas.
   */
  const note = (k) => {
    if (k === null) return 0;
    if (k >= 0.85) return 10;
    if (k >= 0.7) return 9;
    if (k >= 0.55) return 8;
    if (k >= 0.4) return 6;
    if (k >= 0.25) return 4;
    return 2;
  };

  const differencie = kappa !== null && kappa >= SEUIL_KAPPA && taux >= SEUIL_TAUX;

  return {
    total,
    justes,
    nonRepondues,
    taux: Number(taux.toFixed(3)),
    hasard: Number(hasard.toFixed(3)),
    auDessusDuHasard: kappa === null ? null : Number(kappa.toFixed(3)),
    differenciation: note(kappa),
    verdict: differencie ? "DIFFÉRENCIÉ" : "INTERCHANGEABLE",
    parPersonnage,
    confusions: Object.entries(confusions)
      .sort((a, b) => b[1] - a[1])
      .map(([quoi, n]) => ({ quoi, n })),
    fiabilite:
      total < ECHANTILLON_MIN
        ? `échantillon court (${total} répliques) : à lire comme une indication, pas comme un verdict`
        : "suffisant",
    lecture: differencie
      ? "Les voix se distinguent nettement du réflexe majoritaire."
      : kappa === null
        ? "Un seul locuteur : il n'y a rien à distinguer."
        : `Sous le seuil : on attribue à ${Math.round(taux * 100)} % là où répondre toujours le locuteur dominant en donnerait déjà ${Math.round(hasard * 100)} %.`,
  };
}

try {
  const r =
    sous === "prepare" ? preparer() : sous === "score" ? noter() : null;
  if (!r) throw new Error("Sous-commande attendue : `prepare` ou `score`.");
  console.log(JSON.stringify(r, null, 2));
} catch (e) {
  console.log(JSON.stringify({ erreur: e.message }, null, 2));
  process.exit(1);
}
