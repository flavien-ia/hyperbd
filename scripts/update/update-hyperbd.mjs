#!/usr/bin/env node
// update-hyperbd.mjs : mise à jour du plugin HyperBD.
//
// Le plugin se distribue de deux façons, et une seule des deux a besoin de ce script :
//   - suivi par Claude Code (`/plugin marketplace add flavien-ia/hyperbd`, ou un dossier
//     déclaré comme marketplace) : Claude Code met à jour lui-même, on ne touche à rien
//     et on le dit ;
//   - téléversé à la main dans Claude Desktop (l'archive de la page de documentation) :
//     personne ne prévient que la version a changé. C'est notre travail.
// Le mode se lit dans le registre de Claude Code, jamais deviné.
//
//   node update-hyperbd.mjs check    [--plugin-dir DIR]
//   node update-hyperbd.mjs download [--plugin-dir DIR]
//   node update-hyperbd.mjs install  --zip FICHIER [--plugin-dir DIR]
//
// Aucun compte, aucune clé : le plugin est open source, la version publiée se lit sur
// l'atelier (qui la lit sur GitHub) et l'archive se télécharge sans jeton.
//
// Sortie (stdout) : un objet JSON unique. Codes : 0 = fait, 1 = erreur, 2 = réseau injoignable.

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ATELIER = "https://app.studio-entremondes.fr";
/** Ce que l'atelier annonce de la version publiée : numéro, empreinte, date. */
const MANIFESTE_COURANT = `${ATELIER}/api/plugin/current`;
/** L'archive elle-même (une redirection vers la release GitHub). */
const TELECHARGEMENT = `${ATELIER}/api/plugin/download`;
/** Si l'atelier ne répond pas, la release GitHub dit au moins la version. */
const RELEASE_GITHUB = "https://api.github.com/repos/flavien-ia/hyperbd/releases/latest";
/** Le nom de la marketplace où Claude Desktop range ce qu'on lui téléverse. */
const MARKETPLACE_TELEVERSEMENTS = "local-desktop-app-uploads";
const DOSSIER_TRAVAIL = path.join(homedir(), ".hyperbd", "updates");
const ENTETES = { "User-Agent": "hyperbd-update", Accept: "application/json" };

const args = process.argv.slice(2);
const commande = args[0];
function arg(nom, defaut = null) {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : defaut;
}

// Jamais process.exit() ici : sous Windows, sortir dans les millisecondes qui suivent
// une réponse HTTPS avorte le processus avec un faux code. On pose le code et on laisse
// la boucle se vider.
function rendre(objet, code = 0) {
  process.stdout.write(JSON.stringify(objet, null, 2) + "\n");
  process.exitCode = code;
}

function lireJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function comparerVersions(a, b) {
  const na = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const nb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((na[i] || 0) > (nb[i] || 0)) return 1;
    if ((na[i] || 0) < (nb[i] || 0)) return -1;
  }
  return 0;
}

// ── Repérage du plugin et de son mode d'installation ────────────────────────

function dossierPlugin() {
  const fourni = arg("--plugin-dir");
  if (fourni) return path.resolve(fourni);
  // Depuis scripts/update/ : deux crans au-dessus.
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/**
 * Deux rangements possibles : `<marketplace>/hyperbd` (téléversement dans Claude
 * Desktop) ou `cache/<marketplace>/hyperbd/<version>` (marketplace suivie par
 * Claude Code). Dans les deux cas, le nom de la marketplace est dans le chemin ;
 * on le confronte au registre pour savoir qui gère la mise à jour.
 */
function modeInstallation(pluginDir) {
  const registre = path.join(homedir(), ".claude", "plugins", "known_marketplaces.json");
  let connus = {};
  if (existsSync(registre)) {
    try {
      connus = lireJson(registre);
    } catch {
      connus = {};
    }
  }
  const meme = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
  const candidats = [pluginDir, path.dirname(pluginDir), path.dirname(path.dirname(pluginDir))];
  let nom = null;
  for (const [n, e] of Object.entries(connus)) {
    if (candidats.some((c) => meme(e?.installLocation, c) || meme(e?.source?.path, c))) {
      nom = n;
      break;
    }
  }
  if (!nom) {
    const parNom = path.basename(path.dirname(pluginDir));
    if (connus[parNom]) nom = parNom;
    else if (path.basename(path.dirname(path.dirname(pluginDir))) in connus) {
      nom = path.basename(path.dirname(path.dirname(pluginDir)));
    }
  }
  const entree = nom ? connus[nom] : null;
  const marketplaceDir = entree?.installLocation || path.dirname(pluginDir);
  // Une marketplace suivie (GitHub ou dossier) appartient à Claude Code. Le seul cas
  // où notre aide sert : le rangement des téléversements, et un registre muet.
  const manuel = !entree || nom === MARKETPLACE_TELEVERSEMENTS;
  return {
    mode: manuel ? "manuel" : "marketplace",
    marketplace: nom,
    marketplaceDir,
    sourceRegistre: entree?.source?.source ?? null,
  };
}

/** La version publiée, et son empreinte quand l'atelier la connaît. */
async function versionPubliee() {
  try {
    const r = await fetch(MANIFESTE_COURANT, { headers: ENTETES });
    if (r.ok) {
      const j = await r.json();
      if (j?.version) return { version: j.version, sha256: j.sha256 ?? null, source: "atelier" };
    }
  } catch {
    // L'atelier ne répond pas : la release GitHub dira la version.
  }
  const r = await fetch(RELEASE_GITHUB, { headers: { ...ENTETES, Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`GitHub a répondu ${r.status}`);
  const j = await r.json();
  const version = String(j.tag_name || "").replace(/^v/, "");
  if (!version) throw new Error("aucune release publiée");
  const sha = /\b([0-9a-f]{64})\b/.exec(String(j.body || ""))?.[1] ?? null;
  return { version, sha256: sha, source: "github" };
}

// ── Lecture d'archive zip (sans dépendance) ─────────────────────────────────
// L'archive vient de `scripts/empaqueter.mjs` (deflate ou stockage, pas de zip64,
// pas de chiffrement). Tout autre cas lève une erreur plutôt que d'écrire des
// fichiers douteux.

function lireArchive(buf) {
  let fin = -1;
  const plancher = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= plancher; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error("archive illisible (fin de répertoire introuvable)");
  const nombre = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  if (p === 0xffffffff) throw new Error("archive au format zip64, non gérée");

  const entrees = [];
  for (let i = 0; i < nombre; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("répertoire d'archive corrompu");
    const methode = buf.readUInt16LE(p + 10);
    const tailleComp = buf.readUInt32LE(p + 20);
    const lNom = buf.readUInt16LE(p + 28);
    const lExtra = buf.readUInt16LE(p + 30);
    const lComm = buf.readUInt16LE(p + 32);
    const decalage = buf.readUInt32LE(p + 42);
    const nom = buf.toString("utf8", p + 46, p + 46 + lNom);
    entrees.push({ nom, methode, tailleComp, decalage });
    p += 46 + lNom + lExtra + lComm;
  }

  return entrees
    .filter((e) => !e.nom.endsWith("/"))
    .map((e) => {
      if (buf.readUInt32LE(e.decalage) !== 0x04034b50) throw new Error(`entrée illisible : ${e.nom}`);
      const lNom = buf.readUInt16LE(e.decalage + 26);
      const lExtra = buf.readUInt16LE(e.decalage + 28);
      const debut = e.decalage + 30 + lNom + lExtra;
      const brut = buf.subarray(debut, debut + e.tailleComp);
      if (e.methode === 0) return { nom: e.nom, contenu: brut };
      if (e.methode === 8) return { nom: e.nom, contenu: inflateRawSync(brut) };
      throw new Error(`compression non gérée (${e.methode}) : ${e.nom}`);
    });
}

function extraire(entrees, destination) {
  for (const e of entrees) {
    // Une archive ne doit jamais pouvoir écrire hors de sa destination.
    if (e.nom.includes("..") || path.isAbsolute(e.nom) || /^[A-Za-z]:/.test(e.nom)) {
      throw new Error(`chemin refusé dans l'archive : ${e.nom}`);
    }
    const cible = path.join(destination, e.nom);
    mkdirSync(path.dirname(cible), { recursive: true });
    writeFileSync(cible, e.contenu);
  }
}

// ── Commandes ───────────────────────────────────────────────────────────────

async function cmdCheck() {
  const pluginDir = dossierPlugin();
  const manifeste = path.join(pluginDir, ".claude-plugin", "plugin.json");
  if (!existsSync(manifeste)) {
    return rendre(
      { ok: false, raison: "plugin_introuvable", pluginDir, message: `Aucun plugin HyperBD dans ${pluginDir}.` },
      1,
    );
  }
  const locale = lireJson(manifeste).version;
  const install = modeInstallation(pluginDir);

  let publiee;
  try {
    publiee = await versionPubliee();
  } catch (e) {
    return rendre(
      {
        ok: false,
        offline: true,
        ...install,
        pluginDir,
        localVersion: locale,
        message: `Impossible de joindre l'atelier ni GitHub : ${e.message}`,
      },
      2,
    );
  }

  rendre({
    ok: true,
    ...install,
    pluginDir,
    localVersion: locale,
    publishedVersion: publiee.version,
    publishedFrom: publiee.source,
    updateAvailable: comparerVersions(publiee.version, locale) > 0,
    // Une installation suivie par Claude Code se met à jour par lui : remplacer les
    // fichiers dans son dos le mettrait en désaccord avec son registre.
    commandeNative: install.mode === "marketplace" ? `/plugin marketplace update ${install.marketplace}` : null,
  });
}

async function cmdDownload() {
  mkdirSync(DOSSIER_TRAVAIL, { recursive: true });
  let reponse;
  try {
    reponse = await fetch(TELECHARGEMENT, { headers: { "User-Agent": ENTETES["User-Agent"] } });
  } catch (e) {
    return rendre({ ok: false, offline: true, message: `Téléchargement injoignable : ${e.message}` }, 2);
  }
  if (!reponse.ok) {
    return rendre({ ok: false, message: `L'atelier a répondu ${reponse.status} au téléchargement.` }, 1);
  }
  const buf = Buffer.from(await reponse.arrayBuffer());

  let entrees;
  try {
    entrees = lireArchive(buf);
  } catch (e) {
    return rendre({ ok: false, message: `Archive inexploitable : ${e.message}` }, 1);
  }
  const manifeste = entrees.find((e) => e.nom === "hyperbd/.claude-plugin/plugin.json");
  if (!manifeste) {
    return rendre({ ok: false, message: "L'archive ne contient pas de plugin HyperBD." }, 1);
  }
  const version = JSON.parse(manifeste.contenu.toString("utf8")).version;
  const empreinte = createHash("sha256").update(buf).digest("hex");

  // Vérification d'intégrité : l'atelier publie l'empreinte de l'archive de la version
  // courante, on refait le calcul sur ce qu'on a reçu. Un écart veut dire que le
  // téléchargement n'est pas ce qui a été publié : on ne remplace pas une
  // installation qui marche par un fichier dont on ne sait pas ce qu'il est.
  //
  // La comparaison n'a de sens que si le manifeste décrit LA MÊME version que
  // l'archive reçue (un cache pas encore rafraîchi, une release survenue entre les
  // deux appels) ; sinon on installe sans vérifier : refuser une mise à jour valide
  // est la pire des deux erreurs. Idem quand aucune empreinte n'a été publiée.
  let attendue = null;
  try {
    const p = await versionPubliee();
    if (p.version === version && typeof p.sha256 === "string" && p.sha256.length === 64) attendue = p.sha256;
  } catch {
    // Manifeste injoignable : le téléchargement, lui, a réussi.
  }
  if (attendue && attendue !== empreinte) {
    return rendre(
      {
        ok: false,
        reason: "sha256-mismatch",
        expected: attendue,
        got: empreinte,
        message:
          "L'archive téléchargée ne correspond pas à l'empreinte publiée. Rien n'a été installé. Réessayer plus tard, et si l'écart persiste, vérifier l'empreinte sur la release GitHub avant d'installer quoi que ce soit.",
      },
      1,
    );
  }

  const fichier = path.join(DOSSIER_TRAVAIL, `hyperbd-${version}.zip`);
  writeFileSync(fichier, buf);
  rendre({
    ok: true,
    file: fichier,
    version,
    files: entrees.length,
    sizeBytes: buf.length,
    sha256: empreinte,
    sha256Verified: attendue !== null,
  });
}

function cmdInstall() {
  const zip = arg("--zip");
  if (!zip || !existsSync(zip)) return rendre({ ok: false, message: "Archive absente : passer --zip <fichier>." }, 1);
  const pluginDir = dossierPlugin();
  const install = modeInstallation(pluginDir);
  if (install.mode === "marketplace" && !args.includes("--force")) {
    return rendre(
      {
        ok: false,
        raison: "gere_par_claude_code",
        message: `Ce plugin est suivi par Claude Code : /plugin marketplace update ${install.marketplace}.`,
      },
      1,
    );
  }

  const manifesteActuel = path.join(pluginDir, ".claude-plugin", "plugin.json");
  const ancienne = existsSync(manifesteActuel) ? lireJson(manifesteActuel).version : "inconnue";

  let entrees;
  try {
    entrees = lireArchive(readFileSync(zip));
  } catch (e) {
    return rendre({ ok: false, message: `Archive inexploitable : ${e.message}` }, 1);
  }

  // On déballe et on contrôle AVANT de toucher au plugin en place : tant que la
  // nouvelle version n'est pas prouvée complète, l'installation actuelle ne bouge pas.
  const temporaire = path.join(DOSSIER_TRAVAIL, `extraction-${process.pid}`);
  rmSync(temporaire, { recursive: true, force: true });
  mkdirSync(temporaire, { recursive: true });
  let nouvelle;
  try {
    extraire(entrees, temporaire);
    const racine = path.join(temporaire, "hyperbd");
    nouvelle = lireJson(path.join(racine, ".claude-plugin", "plugin.json")).version;
    // Les trois piliers du plugin : les skills portent les commandes, les scripts
    // parlent à l'atelier, les gabarits portent les juges. Une archive amputée est
    // refusée avant d'avoir touché à l'installation en place.
    for (const requis of ["skills", "scripts", "templates"]) {
      const p = path.join(racine, requis);
      if (!existsSync(p) || readdirSync(p).length === 0) throw new Error(`dossier ${requis} absent ou vide`);
    }
    if (entrees.length < 30) throw new Error(`archive trop maigre (${entrees.length} fichiers)`);
  } catch (e) {
    rmSync(temporaire, { recursive: true, force: true });
    return rendre({ ok: false, message: `Nouvelle version incomplète, rien n'a été remplacé : ${e.message}` }, 1);
  }

  const sauvegarde = `${pluginDir}-backup-${ancienne}`;
  rmSync(sauvegarde, { recursive: true, force: true });
  try {
    if (existsSync(pluginDir)) renameSync(pluginDir, sauvegarde);
    renameSync(path.join(temporaire, "hyperbd"), pluginDir);
  } catch (e) {
    // Permutation ratée : on remet l'ancienne en place plutôt que de laisser un trou.
    if (!existsSync(pluginDir) && existsSync(sauvegarde)) renameSync(sauvegarde, pluginDir);
    rmSync(temporaire, { recursive: true, force: true });
    return rendre({ ok: false, message: `Remplacement impossible, version précédente restaurée : ${e.message}` }, 1);
  }
  rmSync(temporaire, { recursive: true, force: true });

  const posee = lireJson(path.join(pluginDir, ".claude-plugin", "plugin.json")).version;
  if (posee !== nouvelle) {
    rmSync(pluginDir, { recursive: true, force: true });
    renameSync(sauvegarde, pluginDir);
    return rendre({ ok: false, message: "Vérification finale en échec, version précédente restaurée." }, 1);
  }

  // Le catalogue de la marketplace : par NOM, jamais par index (il porte aussi
  // d'autres plugins téléversés).
  let catalogue = false;
  const fichierCatalogue = path.join(install.marketplaceDir, ".claude-plugin", "marketplace.json");
  if (existsSync(fichierCatalogue)) {
    try {
      const j = lireJson(fichierCatalogue);
      const entree = (j.plugins || []).find((p) => p.name === "hyperbd");
      if (entree) {
        entree.version = nouvelle;
        writeFileSync(fichierCatalogue, JSON.stringify(j, null, 2) + "\n");
        catalogue = true;
      }
    } catch {
      catalogue = false;
    }
  }

  rendre({
    ok: true,
    oldVersion: ancienne,
    version: nouvelle,
    pluginDir,
    backup: sauvegarde,
    catalogueMisAJour: catalogue,
  });
}

try {
  if (commande === "check") await cmdCheck();
  else if (commande === "download") await cmdDownload();
  else if (commande === "install") cmdInstall();
  else rendre({ ok: false, message: "Commande attendue : check | download | install" }, 1);
} catch (e) {
  rendre({ ok: false, message: e?.message || String(e) }, 1);
}
