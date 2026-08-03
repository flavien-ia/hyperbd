#!/usr/bin/env node
// Le client de l'atelier : tout ce que le harnais demande à la plateforme
// passe par ici.
//
// Un seul endroit sait où vit le jeton, comment se forme une adresse, et
// comment on attend une génération. Les skills, elles, décrivent des
// intentions ; elles n'ont jamais à se souvenir d'un en-tête.
//
// Usage :
//   node studio.mjs <commande> [options]
//
//   connect --url <url> --token <jeton>   enregistre l'accès et le vérifie
//   me                                     qui suis-je, quelles clés j'ai
//   projects                               mes projets
//   project <id|slug>                      un projet et ce qu'il permet
//   universe <projet>                      personnages, décors, styles
//   planches <projet>                      l'album, dans l'ordre
//   planche <id>                           une planche en détail
//   create-planche <projet> [--title T] [--after ID] [--separator]
//   write <planche> --file <json>          écrit titre / script / casting
//   generate <planche> [--n 1] [--quality medium] [--mode planche] [--case ID]
//                      [--extra "..."] [--wait]
//   generation <id>                        où en est une génération
//   validate <variante> [--case ID]        retenir une variante
//   upscale <variante> [--scale 2|4]       agrandir (Topaz)
//   lettrage <planche>                     lire le lettrage
//   derive-lettrage <planche> [--positional] [--remplacer]
//   set-lettrage <planche> [--text-file F] [--valider|--devalider]
//   costs <projet>                         ce que le projet a coûté
//
// Sortie : JSON sur stdout (exit 0), ou `{ "erreur": ... }` (exit 1).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

/** Le fichier d'accès vit hors du projet : un jeton n'a rien à faire dans un dépôt. */
const FICHIER_ACCES = join(homedir(), ".hyperbd", "acces.json");

function lireAcces() {
  if (!existsSync(FICHIER_ACCES)) {
    throw new Error(
      "Aucun accès enregistré. Lancer `/bd-connect` pour relier un compte de l'atelier.",
    );
  }
  return JSON.parse(readFileSync(FICHIER_ACCES, "utf8"));
}

function ecrireAcces(acces) {
  mkdirSync(dirname(FICHIER_ACCES), { recursive: true });
  writeFileSync(FICHIER_ACCES, JSON.stringify(acces, null, 2) + "\n", {
    mode: 0o600,
  });
}

async function appel(chemin, options = {}) {
  const { url, token } = options.acces ?? lireAcces();
  const reponse = await fetch(`${url.replace(/\/$/, "")}/api/v1${chemin}`, {
    method: options.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const texte = await reponse.text();
  let data;
  try {
    data = texte ? JSON.parse(texte) : {};
  } catch {
    throw new Error(`Réponse illisible (${reponse.status}) : ${texte.slice(0, 200)}`);
  }
  if (!reponse.ok) {
    const m = data?.error?.message ?? `HTTP ${reponse.status}`;
    throw new Error(m);
  }
  return data;
}

/** Options de ligne de commande : `--cle valeur` et `--drapeau`. */
function opts(args) {
  const o = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith("--")) continue;
    const cle = args[i].slice(2);
    const suivant = args[i + 1];
    if (suivant && !suivant.startsWith("--")) {
      o[cle] = suivant;
      i++;
    } else {
      o[cle] = true;
    }
  }
  return o;
}

/**
 * Attend qu'une génération aboutisse.
 *
 * Le rythme est lâche à dessein : une image se fabrique en minutes, interroger
 * toutes les secondes ne la ferait pas arriver plus vite et ferait du bruit
 * pour rien.
 */
async function attendre(generationId, { intervalleMs = 8000, maxMs = 900000 } = {}) {
  const debut = Date.now();
  for (;;) {
    const { generation, outputs } = await appel(`/generations/${generationId}`);
    if (generation.status === "done") return { generation, outputs };
    if (generation.status === "error") {
      throw new Error(generation.errorMessage ?? "La génération a échoué.");
    }
    if (Date.now() - debut > maxMs) {
      throw new Error(
        `Toujours en cours après ${Math.round(maxMs / 60000)} minutes : ` +
          `suivre \`generation ${generationId}\`.`,
      );
    }
    await new Promise((r) => setTimeout(r, intervalleMs));
  }
}

const [, , commande, ...reste] = process.argv;
const o = opts(reste);
const positionnels = reste.filter((a) => !a.startsWith("--"));
const arg = (i) => {
  const valeurs = [];
  for (let k = 0; k < reste.length; k++) {
    if (reste[k].startsWith("--")) {
      if (reste[k + 1] && !reste[k + 1].startsWith("--")) k++;
      continue;
    }
    valeurs.push(reste[k]);
  }
  return valeurs[i];
};

const commandes = {
  async connect() {
    if (!o.url || !o.token) {
      throw new Error("Il faut --url et --token.");
    }
    const acces = { url: o.url, token: o.token };
    // On vérifie AVANT d'enregistrer : un accès sauvegardé doit être un accès
    // qui marche, sinon l'erreur ressortirait plus tard, loin de sa cause.
    const moi = await appel("/me", { acces });
    ecrireAcces(acces);
    return { ok: true, fichier: FICHIER_ACCES, ...moi };
  },
  me: () => appel("/me"),
  projects: () => appel("/projects"),
  project: () => appel(`/projects/${arg(0)}`),
  universe: () => appel(`/projects/${arg(0)}/universe`),
  planches: () => appel(`/projects/${arg(0)}/planches`),
  planche: () => appel(`/planches/${arg(0)}`),
  costs: () => appel(`/projects/${arg(0)}/costs`),
  lettrage: () => appel(`/planches/${arg(0)}/lettrage`),

  "create-planche": () =>
    appel(`/projects/${arg(0)}/planches`, {
      method: "POST",
      body: {
        title: typeof o.title === "string" ? o.title : "",
        kind: o.separator ? "separator" : "planche",
        ...(typeof o.after === "string" ? { afterId: o.after } : {}),
      },
    }),

  /**
   * Écrit une planche depuis un fichier JSON (titre, script, casting).
   *
   * Par fichier et non par argument : un découpage contient des retours à la
   * ligne, des guillemets et des accents, que la ligne de commande abîme.
   */
  write() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/planches/${arg(0)}`, {
      method: "PATCH",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  async generate() {
    const lancement = await appel(`/planches/${arg(0)}/generations`, {
      method: "POST",
      body: {
        n: o.n ? Number(o.n) : 1,
        quality: typeof o.quality === "string" ? o.quality : "medium",
        mode: typeof o.mode === "string" ? o.mode : "planche",
        ...(typeof o.case === "string" ? { caseId: o.case } : {}),
        ...(typeof o.extra === "string" ? { extraPrompt: o.extra } : {}),
        ...(typeof o.base === "string"
          ? { baseOutputIds: o.base.split(",") }
          : {}),
      },
    });
    if (!o.wait) return lancement;
    const fin = await attendre(lancement.generationId);
    return { ...lancement, ...fin };
  },

  generation: () => appel(`/generations/${arg(0)}`),

  validate: () =>
    appel(`/outputs/${arg(0)}/validate`, {
      method: "POST",
      body: typeof o.case === "string" ? { caseId: o.case } : {},
    }),

  upscale: () =>
    appel(`/outputs/${arg(0)}/upscale`, {
      method: "POST",
      body: { scale: o.scale ? Number(o.scale) : 2 },
    }),

  "derive-lettrage": () =>
    appel(`/planches/${arg(0)}/lettrage/derive`, {
      method: "POST",
      body: {
        match: o.positional ? "positional" : "similarity",
        remplacer: Boolean(o.remplacer),
      },
    }),

  "set-lettrage": () =>
    appel(`/planches/${arg(0)}/lettrage`, {
      method: "PUT",
      body: {
        ...(o["text-file"]
          ? { text: readFileSync(o["text-file"], "utf8") }
          : {}),
        ...(o.valider ? { validated: true } : {}),
        ...(o.devalider ? { validated: false } : {}),
      },
    }),
};

const fn = commandes[commande];
if (!fn) {
  console.error(
    `Commande inconnue : ${commande ?? "(aucune)"}.\n` +
      `Connues : ${Object.keys(commandes).join(", ")}.`,
  );
  process.exit(2);
}

fn()
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
  })
  .catch((e) => {
    console.log(JSON.stringify({ erreur: e.message }, null, 2));
    process.exit(1);
  });
