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
    },
  };
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
