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
//   node update-hyperbd.mjs install  --zip FICHIER [--sig FICHIER.sig] [--plugin-dir DIR]
//
// Aucun compte, aucune clé : le plugin est open source, la version publiée se lit sur
// l'atelier (qui la lit sur GitHub) et l'archive se télécharge sans jeton. `download`
// et `install` n'acceptent qu'une archive
//   - signée par la clé de publication que porte la version DÉJÀ INSTALLÉE
//     (scripts/update/allowed_signers, vérifiée par ssh-keygen : voir signature.mjs),
//     avant même d'ouvrir l'archive ;
//   - dont l'empreinte SHA-256 est confirmée par la release GitHub de sa version
//     (voir controlerEmpreinte).
// Sinon, ils refusent. `download` range la signature à côté de l'archive
// (`<archive>.sig`), où `install` la relit ; `--sig FICHIER` en désigne une autre.
//
// Sortie (stdout) : un objet JSON unique. Codes : 0 = fait, 1 = erreur, 2 = réseau injoignable.

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateRawSync, crc32 } from "node:zlib";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { placeDuPlugin } from "../plugin-place.mjs";
import { verifierSignature, TAILLE_MAX_SIGNATURE } from "./signature.mjs";

const ATELIER = "https://app.studio-entremondes.fr";
/** Ce que l'atelier annonce de la version publiée : numéro, empreinte, date. */
const MANIFESTE_COURANT = `${ATELIER}/api/plugin/current`;
/** L'archive elle-même (une redirection vers la release GitHub). */
const TELECHARGEMENT = `${ATELIER}/api/plugin/download`;
/** Si l'atelier ne répond pas, la release GitHub dit au moins la version. */
const RELEASE_GITHUB = "https://api.github.com/repos/flavien-ia/hyperbd/releases/latest";
/** La release d'une version précise : GitHub y calcule lui-même l'empreinte de l'archive. */
const RELEASE_GITHUB_TAG = (version) => `https://api.github.com/repos/flavien-ia/hyperbd/releases/tags/v${version}`;
/** La signature de l'archive, publiée comme asset de la même release. */
const SIGNATURE_GITHUB = (version) => `https://github.com/flavien-ia/hyperbd/releases/download/v${version}/hyperbd-v${version}.zip.sig`;
/** Une version, et rien d'autre : elle finit dans des noms de fichiers et des adresses. */
const FORMAT_VERSION = /^\d+\.\d+\.\d+$/;
/** Plafonds : l'archive publiée pèse moins d'un mégaoctet, décompressée comprise. */
const TAILLE_MAX_ARCHIVE = 50 * 1024 * 1024;
const TAILLE_MAX_DECOMPRESSEE = 50 * 1024 * 1024;
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

function versionValide(v) {
  return typeof v === "string" && FORMAT_VERSION.test(v);
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
      if (versionValide(j?.version)) return { version: j.version, sha256: j.sha256 ?? null, source: "atelier" };
    }
  } catch {
    // L'atelier ne répond pas : la release GitHub dira la version.
  }
  const r = await fetch(RELEASE_GITHUB, { headers: { ...ENTETES, Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`GitHub a répondu ${r.status}`);
  const j = await r.json();
  const version = String(j.tag_name || "").replace(/^v/, "");
  if (!versionValide(version)) throw new Error("aucune release publiée sous un numéro lisible");
  const sha = /\b([0-9a-f]{64})\b/.exec(String(j.body || ""))?.[1] ?? null;
  return { version, sha256: sha, source: "github" };
}

// ── Vérification de l'empreinte ─────────────────────────────────────────────
// L'archive se télécharge par l'atelier ; l'empreinte que l'atelier publie prouve
// seulement que le transfert est intact, pas que l'atelier est honnête. La source
// indépendante est GitHub : l'empreinte que GitHub calcule lui-même sur l'archive
// de la release (champ `digest`), et celle écrite dans les notes de la release.
// Règle : au moins une source GitHub doit confirmer, et aucune source disponible
// ne doit dire autre chose. Sinon, on n'installe pas.

const HEX64 = /^[0-9a-f]{64}$/;

async function empreintesPubliees(version) {
  const sources = [];
  const erreurs = [];
  try {
    const r = await fetch(MANIFESTE_COURANT, { headers: ENTETES });
    if (r.ok) {
      const j = await r.json();
      const sha = String(j?.sha256 ?? "").toLowerCase();
      if (j?.version === version && HEX64.test(sha)) sources.push({ source: "atelier", sha256: sha, independante: false });
    } else erreurs.push(`atelier : ${r.status}`);
  } catch (e) {
    erreurs.push(`atelier : ${e.message}`);
  }
  try {
    const r = await fetch(RELEASE_GITHUB_TAG(version), { headers: { ...ENTETES, Accept: "application/vnd.github+json" } });
    if (r.ok) {
      const j = await r.json();
      const nomArchive = `hyperbd-v${version}.zip`;
      const asset = (j.assets || []).find((a) => a?.name === nomArchive);
      const digest = /^sha256:([0-9a-f]{64})$/i.exec(String(asset?.digest ?? ""))?.[1]?.toLowerCase();
      if (digest) sources.push({ source: "github-archive", sha256: digest, independante: true });
      const notes = /\b([0-9a-f]{64})\b/i.exec(String(j.body || ""))?.[1]?.toLowerCase();
      if (notes) sources.push({ source: "github-notes", sha256: notes, independante: true });
    } else erreurs.push(`GitHub : ${r.status}`);
  } catch (e) {
    erreurs.push(`GitHub : ${e.message}`);
  }
  return { sources, erreurs };
}

/** Rend null si l'archive est confirmée, sinon l'objet de refus à renvoyer tel quel. */
async function controlerEmpreinte(version, empreinte) {
  const { sources, erreurs } = await empreintesPubliees(version);
  const discordantes = sources.filter((s) => s.sha256 !== empreinte);
  if (discordantes.length > 0) {
    return {
      ok: false,
      reason: "sha256-mismatch",
      got: empreinte,
      sources,
      message:
        "L'archive ne correspond pas à l'empreinte publiée (ou les sources publiées ne s'accordent pas entre elles). Rien n'a été installé. Réessayer plus tard ; si l'écart persiste, vérifier l'empreinte sur la release GitHub avant d'installer quoi que ce soit.",
    };
  }
  if (!sources.some((s) => s.independante)) {
    const pourquoi = erreurs.join(" ; ") || `aucune empreinte publiée sur GitHub pour la version ${version}`;
    return {
      ok: false,
      reason: "sha256-unverifiable",
      got: empreinte,
      sources,
      erreurs,
      message: `Impossible de confirmer l'empreinte de l'archive auprès de GitHub (${pourquoi}). Rien n'a été installé. Réessayer plus tard, ou comparer à la main l'empreinte ${empreinte} à celle de la release v${version} sur https://github.com/flavien-ia/hyperbd/releases.`,
    };
  }
  return null;
}

// ── Vérification de la signature ────────────────────────────────────────────
// L'empreinte confirmée par GitHub ne protège pas de qui tiendrait à la fois l'atelier
// et le compte GitHub : il publierait une archive piégée ET son empreinte. La signature,
// elle, ne se fait qu'avec la clé privée de publication, qui ne vit ni sur l'atelier ni
// sur GitHub. On la vérifie contre la clé publique de la version installée (jamais
// celle de l'archive reçue), avant d'ouvrir l'archive. Pas de signature, pas de mise à
// jour : il n'y a pas d'option pour passer outre.

/** Le texte de la signature publiée pour cette version, ou null si la release n'en a pas. */
async function telechargerSignature(version) {
  let r;
  try {
    r = await fetch(SIGNATURE_GITHUB(version), { headers: { "User-Agent": ENTETES["User-Agent"] } });
  } catch (e) {
    return { texte: null, erreur: `GitHub injoignable (${e.message})` };
  }
  if (!r.ok) return { texte: null, erreur: `GitHub a répondu ${r.status}` };
  const texte = await r.text();
  if (texte.length > TAILLE_MAX_SIGNATURE) return { texte: null, erreur: "signature anormalement longue" };
  return { texte, erreur: null };
}

/** Rend null si la signature est bonne, sinon l'objet de refus à renvoyer tel quel. */
function controlerSignature(octets, signature, contexte = {}) {
  const res = verifierSignature(octets, signature);
  if (res.ok) return null;
  return { ...res, ...contexte };
}

// ── Lecture d'archive zip (sans dépendance) ─────────────────────────────────
// L'archive vient de `scripts/empaqueter.mjs` (deflate ou stockage, pas de zip64,
// pas de chiffrement). Tout autre cas lève une erreur plutôt que d'écrire des
// fichiers douteux. Chaque entrée est décompressée sous un plafond commun, et son
// CRC-32 est recalculé quand Node sait le faire (zlib.crc32, Node 20.15 et plus).

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
    const crc = buf.readUInt32LE(p + 16);
    const tailleComp = buf.readUInt32LE(p + 20);
    const taille = buf.readUInt32LE(p + 24);
    const lNom = buf.readUInt16LE(p + 28);
    const lExtra = buf.readUInt16LE(p + 30);
    const lComm = buf.readUInt16LE(p + 32);
    const decalage = buf.readUInt32LE(p + 42);
    const nom = buf.toString("utf8", p + 46, p + 46 + lNom);
    entrees.push({ nom, methode, crc, tailleComp, taille, decalage });
    p += 46 + lNom + lExtra + lComm;
  }

  let total = 0;
  return entrees
    .filter((e) => !e.nom.endsWith("/"))
    .map((e) => {
      const reste = TAILLE_MAX_DECOMPRESSEE - total;
      if (e.taille > reste) throw new Error(`archive trop volumineuse une fois décompressée : ${e.nom}`);
      if (buf.readUInt32LE(e.decalage) !== 0x04034b50) throw new Error(`entrée illisible : ${e.nom}`);
      const lNom = buf.readUInt16LE(e.decalage + 26);
      const lExtra = buf.readUInt16LE(e.decalage + 28);
      const debut = e.decalage + 30 + lNom + lExtra;
      const brut = buf.subarray(debut, debut + e.tailleComp);
      let contenu;
      if (e.methode === 0) contenu = brut;
      else if (e.methode === 8) {
        try {
          contenu = inflateRawSync(brut, { maxOutputLength: Math.max(1, reste) });
        } catch (err) {
          throw new Error(`entrée indécompressable ou trop volumineuse : ${e.nom} (${err.code || err.message})`);
        }
      } else throw new Error(`compression non gérée (${e.methode}) : ${e.nom}`);
      if (contenu.length !== e.taille) throw new Error(`taille annoncée fausse : ${e.nom}`);
      total += contenu.length;
      if (total > TAILLE_MAX_DECOMPRESSEE) throw new Error("archive trop volumineuse une fois décompressée");
      if (typeof crc32 === "function" && crc32(contenu) >>> 0 !== e.crc) throw new Error(`CRC-32 faux, archive abîmée : ${e.nom}`);
      return { nom: e.nom, contenu };
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
  // La version annoncée dit quelle signature aller chercher. Elle ne prouve rien :
  // l'archive doit être signée pour CETTE version, et porter ce numéro.
  let attendue;
  try {
    attendue = (await versionPubliee()).version;
  } catch (e) {
    return rendre({ ok: false, offline: true, message: `Impossible de joindre l'atelier ni GitHub : ${e.message}` }, 2);
  }
  let reponse;
  try {
    reponse = await fetch(TELECHARGEMENT, { headers: { "User-Agent": ENTETES["User-Agent"] } });
  } catch (e) {
    return rendre({ ok: false, offline: true, message: `Téléchargement injoignable : ${e.message}` }, 2);
  }
  if (!reponse.ok) {
    return rendre({ ok: false, message: `L'atelier a répondu ${reponse.status} au téléchargement.` }, 1);
  }
  const annoncee = Number(reponse.headers?.get?.("content-length") || 0);
  if (annoncee > TAILLE_MAX_ARCHIVE) {
    return rendre({ ok: false, message: `Archive refusée : ${annoncee} octets, au-delà du plafond.` }, 1);
  }
  const buf = Buffer.from(await reponse.arrayBuffer());
  if (buf.length > TAILLE_MAX_ARCHIVE) {
    return rendre({ ok: false, message: `Archive refusée : ${buf.length} octets, au-delà du plafond.` }, 1);
  }

  // La signature d'abord : une archive non signée n'est même pas ouverte.
  const { texte: signature, erreur: erreurSignature } = await telechargerSignature(attendue);
  const refusSignature = controlerSignature(buf, signature, erreurSignature ? { cause: erreurSignature } : {});
  if (refusSignature) return rendre(refusSignature, 1);

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
  let version;
  try {
    version = JSON.parse(manifeste.contenu.toString("utf8")).version;
  } catch {
    version = null;
  }
  if (!versionValide(version)) {
    return rendre({ ok: false, message: "L'archive annonce un numéro de version illisible : rien n'a été gardé." }, 1);
  }
  if (version !== attendue) {
    return rendre(
      {
        ok: false,
        reason: "version-mismatch",
        message: `L'archive reçue porte la version ${version}, alors que la version publiée est la ${attendue}. Rien n'a été gardé. Réessayer plus tard.`,
      },
      1,
    );
  }
  const empreinte = createHash("sha256").update(buf).digest("hex");

  // L'empreinte de ce qu'on a reçu doit être confirmée par GitHub (voir
  // controlerEmpreinte) : pas d'empreinte vérifiable, pas d'archive gardée.
  const refus = await controlerEmpreinte(version, empreinte);
  if (refus) return rendre(refus, 1);

  const fichier = path.join(DOSSIER_TRAVAIL, `hyperbd-${version}.zip`);
  writeFileSync(fichier, buf);
  writeFileSync(`${fichier}.sig`, signature);
  rendre({
    ok: true,
    file: fichier,
    signatureFile: `${fichier}.sig`,
    version,
    files: entrees.length,
    sizeBytes: buf.length,
    sha256: empreinte,
    sha256Verified: true,
    signatureVerified: true,
  });
}

async function cmdInstall() {
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
  let ancienne = "inconnue";
  try {
    const v = existsSync(manifesteActuel) ? lireJson(manifesteActuel).version : null;
    if (versionValide(v)) ancienne = v;
  } catch {
    // Manifeste illisible : la sauvegarde s'appellera « inconnue ».
  }

  const octets = readFileSync(zip);
  if (octets.length > TAILLE_MAX_ARCHIVE) {
    return rendre({ ok: false, message: `Archive refusée : ${octets.length} octets, au-delà du plafond.` }, 1);
  }

  // La signature, avant d'ouvrir l'archive : celle que `download` a rangée à côté
  // (`<archive>.sig`), ou celle que désigne --sig. Vérifiée contre la clé de la version
  // installée, celle qui tourne en ce moment.
  const fichierSignature = arg("--sig") ?? `${zip}.sig`;
  let signature = null;
  if (existsSync(fichierSignature)) {
    const brut = readFileSync(fichierSignature);
    signature = brut.length > TAILLE_MAX_SIGNATURE ? "signature trop longue" : brut.toString("utf8");
  }
  const refusSignature = controlerSignature(octets, signature, signature === null ? { cherchee: fichierSignature } : {});
  if (refusSignature) return rendre(refusSignature, 1);

  let entrees;
  try {
    entrees = lireArchive(octets);
  } catch (e) {
    return rendre({ ok: false, message: `Archive inexploitable : ${e.message}` }, 1);
  }

  // Même règle qu'au téléchargement, sur le fichier qu'on s'apprête à poser : une
  // archive venue d'ailleurs, ou remplacée entre les deux étapes, ne passe pas.
  let annoncee = null;
  try {
    const m = entrees.find((e) => e.nom === "hyperbd/.claude-plugin/plugin.json");
    annoncee = m ? JSON.parse(m.contenu.toString("utf8"))?.version ?? null : null;
  } catch {
    annoncee = null;
  }
  if (!versionValide(annoncee)) {
    return rendre({ ok: false, message: "L'archive ne contient pas de plugin HyperBD sous un numéro de version lisible." }, 1);
  }
  const refus = await controlerEmpreinte(annoncee, createHash("sha256").update(octets).digest("hex"));
  if (refus) return rendre(refus, 1);

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
    if (nouvelle !== annoncee) throw new Error("numéro de version incohérent dans l'archive");
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

  // La sauvegarde n'est promise que dans un dossier de marketplace : le registre des plugins
  // téléversés de Claude Desktop l'efface en quelques minutes (voir scripts/plugin-place.mjs).
  const { place, backupKept, desktop } = placeDuPlugin(pluginDir, "hyperbd");
  rendre({
    ok: true,
    oldVersion: ancienne,
    version: nouvelle,
    signatureVerified: true,
    pluginDir,
    backup: sauvegarde,
    backupKept,
    desktop,
    place,
    catalogueMisAJour: catalogue,
  });
}

try {
  if (commande === "check") await cmdCheck();
  else if (commande === "download") await cmdDownload();
  else if (commande === "install") await cmdInstall();
  else rendre({ ok: false, message: "Commande attendue : check | download | install" }, 1);
} catch (e) {
  rendre({ ok: false, message: e?.message || String(e) }, 1);
}
