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
//   drop-planche <plancheId>               retirer une planche de l'album
//   rendu <plancheId> --out f.png          la planche lettrée, en image
//         [--largeur 1536] [--locale en] [--sans-texte] [--calque]
//   write <planche> --file <json>          écrit titre / script / casting
//   generate <planche> [--n 1] [--quality medium] [--mode planche] [--case ID]
//                      [--extra "..."] [--wait]
//   generation <id>                        où en est une génération
//   validate <variante> [--case ID]        retenir une variante
//   upscale <variante> [--scale 2|4]       agrandir (Topaz)
//   lettrage <planche>                     lire le lettrage
//   derive-lettrage <planche> [--positional] [--remplacer]
//   set-lettrage <planche> [--text-file F] [--file bulles.json] [--locale xx]
//                          [--valider|--devalider]
//   locales <projet>                       les langues, et où elles en sont
//   repliques <projet> [--scene <id>]      les répliques du script, case par case
//   shares <projet>                        les liens de lecture
//   share-locale <lienId> [--locale xx]    la langue qu'un lien sert
//   costs <projet>                         ce que le projet a coûté
//
//   -- la Toile (le scénario) --
//   nodes <projet> [--ecartes]             les blocs et les liens
//   node <id>                              un bloc, corps compris
//   new-node <projet> --file <json>        poser un bloc
//   scenario <projet> --file <json>        poser un lot de blocs et de liens
//   write-node <id> --file <json>          écrire un bloc
//   set-status <id> --status S [--raison R] valider ou écarter
//   promote <id> [--acte]                  une note devient une scène
//   reorder-scenes <projet> --file <json>  l'ordre du récit
//   edges <projet>                         les liens
//   new-edge --from A --to B [--type T] [--label L]
//   drop-edge <id>
//   docs <projet> [--kind K]               les textes du projet
//   doc <id>                               un texte, corps compris
//   new-doc <projet> --file <json>         en écrire un
//   write-doc <id> --file <json>           le réécrire
//   journal <projet> [--limite N]          les décisions
//   journal-add <projet> --file <json>     en consigner une
//   version <projet>                       le numéro du dernier changement
//   changes <projet> [--since N]           ce qui a changé
//
//   -- le laboratoire (images sans planche) --
//   essai <projet> --prompt-file F [--kind K] [--label L] [--n 1]
//         [--quality low] [--size WxH] [--refs id,id] [--essais id,id] [--wait]
//   essais <projet> [--kind K]             ce que le laboratoire a produit
//   essai-detail <id>                      un essai et ses images
//   keep <imageId> [--off]                 retenir une image (survit à la purge)
//   promote-image <imageId> --entry <id>   la verser dans la bibliothèque
//   promote-image <imageId> --style "N"    en faire une planche de style
//   drop-essai <id>
//
//   -- écrire dans la bibliothèque de l'univers --
//   new-entry <projet> --kind K --name N [--parent id] [--color hex] [--snippet "..."]
//   set-entry <projet> <entryId> --file patch.json
//   drop-entry <projet> <entryId>
//   entry-image <projet> <entryId> --file image.png    dépose et inscrit
//   star <projet> <imageId>                            bascule l'étoile (max 3)
//   drop-image <projet> <imageId>
//
//   -- les sources (ce à quoi les affirmations de l'album renvoient) --
//   sources <projet>                       la liste, sans les fiches
//   source <id>                            une source, fiche comprise
//   new-source <projet> --file s.json      { title, slug?, url?, replique?, body? }
//   write-source <id> --file patch.json
//   drop-source <id>
//   sources-public <projet> [--off]        ouvrir (ou fermer) la page publique
//   sources-public <projet> --etat         est-elle ouverte ?
//
//   -- le cadre de génération (la DA verrouillée) --
//   get-template <projet>                  le cadre en vigueur
//   set-template <projet> --file cadre.txt [--label "DA v2"] [--double-page "..."]
//
//   -- les travaux longs (agrandissement, exports) --
//   upscale-batch <projet> [--model M] [--scale 2|4] [--planches id,id]
//                 [--force] [--yes] [--wait]   sans --yes : chiffre, ne lance rien
//   jobs <projet>                          les travaux du projet
//   job <id>                               où en est un travail
//   job-continue <id>                      relancer une tranche arrêtée
//   job-cancel <id>
//   export <projet> --kind avec-texte|sans-texte|calques|pdf|master
//          [--locale xx] [--planches id,id] [--exige-upscale] [--wait]
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
    /**
     * Le DÉTAIL, pas seulement le message.
     *
     * L'atelier renvoie les champs fautifs (« status : valeur attendue parmi
     * idee, discute, valide, ecarte ») ; les jeter laissait « Requête
     * invalide. » tout seul, et un agent n'a plus qu'à deviner lequel des
     * quarante champs il a mal rempli. Chaque devinette est un aller-retour.
     */
    const d = data?.error?.details;
    throw new Error(d ? `${m} ${JSON.stringify(d)}` : m);
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

/** Même attente que pour une génération : un essai se fabrique en minutes. */
async function attendreEssai(essaiId, { intervalleMs = 8000, maxMs = 900000 } = {}) {
  const debut = Date.now();
  for (;;) {
    const { essai, images } = await appel(`/essais/${essaiId}`);
    if (essai.status === "done") return { essai, images };
    if (essai.status === "error") {
      throw new Error(essai.errorMessage ?? "L'essai a échoué.");
    }
    if (Date.now() - debut > maxMs) {
      throw new Error(
        `Toujours en cours : suivre \`essai-detail ${essaiId}\`.`,
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

/**
 * Attend qu'un travail long se termine.
 *
 * Les tranches s'enchaînent toutes seules : on ne fait que regarder. Si rien
 * ne bouge pendant longtemps, on relance une tranche plutôt que d'abandonner,
 * parce qu'une tranche morte se ressuscite par un simple appel.
 */
async function attendreJob(jobId, maxMs = 900000) {
  const debut = Date.now();
  let dernierMouvement = Date.now();
  let dernierFait = -1;
  while (Date.now() - debut < maxMs) {
    await new Promise((r) => setTimeout(r, 3000));
    const { job } = await appel(`/jobs/${jobId}`);
    if (job.progress?.fait !== dernierFait) {
      dernierFait = job.progress?.fait;
      dernierMouvement = Date.now();
    }
    if (job.status === "done" || job.status === "cancelled") return { job };
    if (job.status === "error") return { job };
    if (Date.now() - dernierMouvement > 120000) {
      await appel(`/jobs/${jobId}/continue`, { method: "POST" });
      dernierMouvement = Date.now();
    }
  }
  return { job: { id: jobId, status: "timeout" } };
}

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
  lettrage: () =>
    appel(
      `/planches/${arg(0)}/lettrage${
        typeof o.locale === "string" ? `?locale=${o.locale}` : ""
      }`,
    ),

  /** Les langues de l'album, et où chacune en est. */
  locales: () => appel(`/projects/${arg(0)}/locales`),

  /**
   * Les répliques telles que le script les porte, case par case.
   *
   * C'est l'atelier qui les extrait, avec le code qui sert à dériver le
   * lettrage : la convention d'écriture n'a qu'une seule implémentation, et
   * ni le linter ni les juges ne la réécrivent dans leur coin.
   *
   *   repliques <projet> [--scene <id>] [--planche <id>] [--scripts]
   *
   * `--scripts` ajoute le découpage (en-tête, ambiance, script des cases). Il
   * pèse : ne le demander que pour le contrôle mécanique, qui doit lire les
   * descriptions.
   */
  repliques: () => {
    const q = new URLSearchParams();
    if (typeof o.scene === "string") q.set("scene", o.scene);
    if (typeof o.planche === "string") q.set("planche", o.planche);
    if (o.scripts) q.set("scripts", "1");
    const qs = q.toString();
    return appel(`/projects/${arg(0)}/repliques${qs ? `?${qs}` : ""}`);
  },

  "create-planche": () =>
    appel(`/projects/${arg(0)}/planches`, {
      method: "POST",
      body: {
        title: typeof o.title === "string" ? o.title : "",
        kind: o.separator ? "separator" : "planche",
        ...(typeof o.after === "string" ? { afterId: o.after } : {}),
      },
    }),

  /** Retirer une planche de l'album (elle emporte son lettrage). */
  "drop-planche": () => appel(`/planches/${arg(0)}`, { method: "DELETE" }),

  /**
   * La planche lettrée, en image, fabriquée par l'atelier.
   *
   * C'est la seule façon de VOIR ce qu'on vient de composer sans navigateur.
   * Le juge du placement s'en sert : on ne juge pas des coordonnées, on juge
   * ce qu'on voit.
   *
   *   rendu <plancheId> --out <fichier.png> [--largeur 1536] [--locale en]
   *                     [--sans-texte] [--calque]
   *
   * Le corps est une image : cette commande sort du chemin JSON du CLI et
   * écrit les octets elle-même. Les avertissements du serveur (une police
   * absente, un lettrage non validé) voyagent en en-tête et sont remontés
   * ici : un rendu approximatif qui ne s'annonce pas est pire qu'un échec.
   */
  async rendu() {
    if (!o.out) throw new Error("Il faut --out <fichier.png>.");
    const { url, token } = lireAcces();
    const q = new URLSearchParams();
    if (o.largeur) q.set("largeur", String(o.largeur));
    if (typeof o.locale === "string") q.set("locale", o.locale);
    if (o["sans-texte"]) q.set("texte", "0");
    if (o.calque) q.set("calque", "1");
    const qs = q.toString();

    const r = await fetch(
      `${url.replace(/\/$/, "")}/api/v1/planches/${arg(0)}/rendu${qs ? `?${qs}` : ""}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!r.ok) {
      const t = await r.text();
      let m = `HTTP ${r.status}`;
      try {
        m = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.error ?? m;
      } catch {
        /* le corps n'est pas du JSON : on garde le code */
      }
      throw new Error(typeof m === "string" ? m : JSON.stringify(m));
    }

    const octets = Buffer.from(await r.arrayBuffer());
    writeFileSync(o.out, octets);
    const avertissements = r.headers.get("x-avertissements");
    return {
      ok: true,
      fichier: o.out,
      octets: octets.length,
      dimensions: r.headers.get("x-dimensions"),
      ...(avertissements ? { avertissements: avertissements.split(" | ") } : {}),
    };
  },

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

  // ── La Toile ────────────────────────────────────────────────────────────

  nodes: () =>
    appel(`/projects/${arg(0)}/nodes${o.ecartes ? "?ecartes=1" : ""}`),
  node: () => appel(`/nodes/${arg(0)}`),

  "new-node"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/projects/${arg(0)}/nodes`, {
      method: "POST",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  /**
   * Pose un lot de blocs (et leurs liens) d'un coup.
   *
   * C'est la façon de proposer : les cinq prémisses arrivent ensemble, la
   * personne les voit d'un regard et arbitre. Les positions sont facultatives,
   * l'atelier range la grappe en grille.
   */
  scenario() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/projects/${arg(0)}/scenario`, {
      method: "POST",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  "write-node"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/nodes/${arg(0)}`, {
      method: "PATCH",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  "set-status": () =>
    appel(`/nodes/${arg(0)}/status`, {
      method: "POST",
      body: {
        status: typeof o.status === "string" ? o.status : "valide",
        ...(typeof o.raison === "string" ? { raison: o.raison } : {}),
      },
    }),

  promote: () =>
    appel(`/nodes/${arg(0)}/promote`, {
      method: "POST",
      body: { type: o.acte ? "acte" : "scene" },
    }),

  "drop-node": () => appel(`/nodes/${arg(0)}`, { method: "DELETE" }),

  "reorder-scenes"() {
    if (!o.file) throw new Error("Il faut --file <JSON : { orderedIds: [] }>.");
    return appel(`/projects/${arg(0)}/nodes/reorder`, {
      method: "POST",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  edges: () => appel(`/projects/${arg(0)}/edges`),

  "new-edge": () =>
    appel(`/projects/${o.projet ?? "_"}/edges`, {
      method: "POST",
      body: {
        from: o.from,
        to: o.to,
        type: typeof o.type === "string" ? o.type : "libre",
        label: typeof o.label === "string" ? o.label : "",
      },
    }),

  "drop-edge": () => appel(`/edges/${arg(0)}`, { method: "DELETE" }),

  docs: () =>
    appel(
      `/projects/${arg(0)}/docs${typeof o.kind === "string" ? `?kind=${o.kind}` : ""}`,
    ),
  doc: () => appel(`/docs/${arg(0)}`),

  "new-doc"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/projects/${arg(0)}/docs`, {
      method: "POST",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  "write-doc"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/docs/${arg(0)}`, {
      method: "PATCH",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  journal: () =>
    appel(
      `/projects/${arg(0)}/journal${o.limite ? `?limite=${o.limite}` : ""}`,
    ),

  "journal-add"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/projects/${arg(0)}/journal`, {
      method: "POST",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  version: () => appel(`/projects/${arg(0)}/version`),
  changes: () =>
    appel(`/projects/${arg(0)}/changes?since=${o.since ?? 0}`),

  // ── Le laboratoire ──────────────────────────────────────────────────────

  /**
   * Lance un essai : une image qui n'appartient à aucune planche.
   *
   * Le prompt vient d'un FICHIER : un cadre de direction artistique fait des
   * paragraphes, avec des accents et des retours à la ligne que la ligne de
   * commande abîme.
   */
  async essai() {
    if (!o["prompt-file"]) {
      throw new Error("Il faut --prompt-file <chemin d'un texte>.");
    }
    const lancement = await appel(`/projects/${arg(0)}/essais`, {
      method: "POST",
      body: {
        kind: typeof o.kind === "string" ? o.kind : "libre",
        label: typeof o.label === "string" ? o.label : "",
        prompt: readFileSync(o["prompt-file"], "utf8"),
        n: o.n ? Number(o.n) : 1,
        quality: typeof o.quality === "string" ? o.quality : "low",
        ...(typeof o.size === "string" ? { size: o.size } : {}),
        ...(typeof o.refs === "string"
          ? { universeImageIds: o.refs.split(",") }
          : {}),
        ...(typeof o.essais === "string"
          ? { essaiImageIds: o.essais.split(",") }
          : {}),
      },
    });
    if (!o.wait) return lancement;
    return { ...lancement, ...(await attendreEssai(lancement.essaiId)) };
  },

  essais: () =>
    appel(
      `/projects/${arg(0)}/essais${typeof o.kind === "string" ? `?kind=${o.kind}` : ""}`,
    ),
  "essai-detail": () => appel(`/essais/${arg(0)}`),

  keep: () =>
    appel(`/essai-images/${arg(0)}/keep`, {
      method: "POST",
      body: { kept: !o.off },
    }),

  "promote-image": () =>
    appel(`/essai-images/${arg(0)}/promote`, {
      method: "POST",
      body:
        typeof o.style === "string"
          ? { styleEntry: { name: o.style } }
          : { entryId: o.entry },
    }),

  "drop-essai": () => appel(`/essais/${arg(0)}`, { method: "DELETE" }),

  // ── Écrire dans la bibliothèque ─────────────────────────────────────────

  "new-entry": () =>
    appel(`/projects/${arg(0)}/universe/entries`, {
      method: "POST",
      body: {
        kind: typeof o.kind === "string" ? o.kind : "character",
        name: o.name,
        ...(typeof o.snippet === "string" ? { promptSnippet: o.snippet } : {}),
        ...(typeof o.parent === "string" ? { parentId: o.parent } : {}),
        ...(typeof o.color === "string" ? { bubbleColor: o.color } : {}),
      },
    }),

  "set-entry"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/projects/${arg(0)}/universe/entries/${arg(1)}`, {
      method: "PATCH",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  "drop-entry": () =>
    appel(`/projects/${arg(0)}/universe/entries/${arg(1)}`, {
      method: "DELETE",
    }),

  /**
   * Dépose une image sur une entrée, en trois temps : demander l'adresse,
   * pousser le fichier vers le stockage, inscrire la clé. L'application ne
   * voit jamais passer les octets.
   */
  async "entry-image"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'une image>.");
    const ext = (o.file.split(".").pop() ?? "png").toLowerCase();
    const type = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
    const { key, uploadUrl } = await appel(
      `/projects/${arg(0)}/universe/entries/${arg(1)}/upload`,
      { method: "POST", body: { contentType: type, ext } },
    );
    const octets = readFileSync(o.file);
    const envoi = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": type },
      body: octets,
    });
    if (!envoi.ok) throw new Error(`Dépôt refusé (${envoi.status}).`);
    return appel(`/projects/${arg(0)}/universe/entries/${arg(1)}/images`, {
      method: "POST",
      body: { key },
    });
  },

  star: () =>
    appel(`/projects/${arg(0)}/universe/images/${arg(1)}/default`, {
      method: "POST",
    }),

  "drop-image": () =>
    appel(`/projects/${arg(0)}/universe/images/${arg(1)}`, {
      method: "DELETE",
    }),

  /**
   * Écrit le lettrage d'une planche.
   *
   * `--file` porte les bulles complètes (c'est par là qu'on pose un QR ou
   * qu'on écrit une traduction), `--text-file` le seul texte source.
   * `--locale` écrit dans une langue au lieu de celle du script.
   */
  "set-lettrage": () =>
    appel(`/planches/${arg(0)}/lettrage`, {
      method: "PUT",
      body: {
        ...(o["text-file"]
          ? { text: readFileSync(o["text-file"], "utf8") }
          : {}),
        ...(o.file ? JSON.parse(readFileSync(o.file, "utf8")) : {}),
        ...(typeof o.locale === "string" ? { locale: o.locale } : {}),
        ...(o.valider ? { validated: true } : {}),
        ...(o.devalider ? { validated: false } : {}),
      },
    }),

  /** Les liens de lecture de l'album. */
  shares: () => appel(`/projects/${arg(0)}/shares`),

  /** La langue qu'un lien de partage sert. Sans `--locale` : celle du script. */
  "share-locale": () =>
    appel(`/shares/${arg(0)}/locale`, {
      method: "PUT",
      body: { locale: typeof o.locale === "string" ? o.locale : null },
    }),

  // ── Les sources : ce à quoi les affirmations de l'album renvoient ───────

  sources: () => appel(`/projects/${arg(0)}/sources`),

  "source": () => appel(`/sources/${arg(0)}`),

  "new-source"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/projects/${arg(0)}/sources`, {
      method: "POST",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  "write-source"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un JSON>.");
    return appel(`/sources/${arg(0)}`, {
      method: "PATCH",
      body: JSON.parse(readFileSync(o.file, "utf8")),
    });
  },

  "drop-source": () => appel(`/sources/${arg(0)}`, { method: "DELETE" }),

  // Ouvrir la page publique avant le tirage : un QR imprimé qui pointe une
  // page fermée ne se rattrape pas.
  "sources-public": () =>
    o.etat
      ? appel(`/projects/${arg(0)}/sources-public`)
      : appel(`/projects/${arg(0)}/sources-public`, {
          method: "PUT",
          body: { ouvert: !o.off },
        }),
  // ── Le cadre de génération (la DA verrouillée) ──────────────────────────

  "get-template": () => appel(`/projects/${arg(0)}/prompt-template`),

  "set-template"() {
    if (!o.file) throw new Error("Il faut --file <chemin d'un fichier texte>.");
    return appel(`/projects/${arg(0)}/prompt-template`, {
      method: "PUT",
      body: {
        content: readFileSync(o.file, "utf8"),
        ...(typeof o["double-page"] === "string"
          ? { doublePage: o["double-page"] }
          : {}),
        ...(typeof o.label === "string" ? { label: o.label } : {}),
      },
    });
  },
  // ── Les travaux longs (agrandissement, exports) ─────────────────────────

  jobs: () => appel(`/projects/${arg(0)}/jobs`),
  job: () => appel(`/jobs/${arg(0)}`),
  "job-continue": () => appel(`/jobs/${arg(0)}/continue`, { method: "POST" }),
  "job-cancel": () => appel(`/jobs/${arg(0)}`, { method: "DELETE" }),

  /**
   * Agrandir les planches validées, pour le tirage.
   *
   * En DEUX temps par défaut : sans --yes, la commande chiffre ce que cela
   * coûterait et ne lance rien. Des crédits Topaz ne se dépensent pas par
   * surprise.
   */
  async "upscale-batch"() {
    const body = {
      kind: "upscale-batch",
      params: {
        model: typeof o.model === "string" ? o.model : "High Fidelity V2",
        scale: o.scale ? Number(o.scale) : 2,
        ...(o.force ? { force: true } : {}),
        ...(typeof o.planches === "string"
          ? { plancheIds: o.planches.split(",") }
          : {}),
      },
      confirmer: Boolean(o.yes),
    };
    const lancement = await appel(`/projects/${arg(0)}/jobs`, {
      method: "POST",
      body,
    });
    if (!o.wait || !lancement.jobId) return lancement;
    return { ...lancement, ...(await attendreJob(lancement.jobId)) };
  },
  /**
   * Sortir l'album de l'atelier.
   *
   * Cinq sorties : les planches lettrées, les planches nues, les calques de
   * texte (PNG transparent et SVG vectoriel), le PDF de lecture, et le master
   * de tirage avec sa page de titre et ses mentions.
   */
  async export() {
    const genres = {
      "avec-texte": "export-avec-texte",
      "sans-texte": "export-sans-texte",
      calques: "export-calques",
      pdf: "export-pdf-lecture",
      master: "export-master",
    };
    const kind = genres[o.kind ?? "pdf"];
    if (!kind) {
      throw new Error(
        `Genre inconnu. Au choix : ${Object.keys(genres).join(", ")}.`,
      );
    }
    const lancement = await appel(`/projects/${arg(0)}/jobs`, {
      method: "POST",
      body: {
        kind,
        params: {
          ...(typeof o.locale === "string" ? { locale: o.locale } : {}),
          ...(typeof o.planches === "string"
            ? { plancheIds: o.planches.split(",") }
            : {}),
          ...(o["exige-upscale"] ? { exigeUpscale: true } : {}),
        },
        confirmer: true,
      },
    });
    if (!o.wait || !lancement.jobId) return lancement;
    return { ...lancement, ...(await attendreJob(lancement.jobId)) };
  },
};

const fn = commandes[commande];
if (!fn) {
  console.error(
    `Commande inconnue : ${commande ?? "(aucune)"}.\n` +
      `Connues : ${Object.keys(commandes).join(", ")}.`,
  );
  process.exit(2);
}

// `Promise.resolve().then(fn)` et non `fn()` : plusieurs commandes valident
// leurs arguments AVANT tout appel réseau (« il faut --file »). Ce jet
// synchrone passait à côté du `.catch()` et sortait une trace de pile sur
// stderr, avec un stdout vide : tout appelant qui lit du JSON s'y cassait.
// Le contrat est « du JSON, toujours », y compris pour dire non.
Promise.resolve()
  .then(fn)
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
  })
  .catch((e) => {
    console.log(JSON.stringify({ erreur: e.message }, null, 2));
    // `exitCode` et non `exit()` : couper le processus pendant qu'une requête
    // se referme fait planter libuv sous Windows, et le code de sortie devient
    // 127 au lieu de 1, et un appelant qui teste l'échec s'y trompe.
    process.exitCode = 1;
  });
