#!/usr/bin/env node
// empaqueter.mjs : construit l'archive du plugin, telle qu'on la téléverse dans
// Claude Desktop et telle qu'on la publie en release GitHub.
//
//   node scripts/empaqueter.mjs [--out FICHIER] [--copie FICHIER]
//
// Le contenu, ce sont les fichiers suivis par git (donc rien d'oublié, rien de
// traînant), rangés sous un dossier racine `hyperbd/` ; `.gitignore` reste dehors.
// Sans `--out`, l'archive s'appelle `hyperbd-v<version>.zip` dans le dossier
// courant. `--copie` en écrit un second exemplaire, octet pour octet identique
// (l'archive horodatée du dossier de sauvegarde).
//
// Sortie (stdout) : { file, copie, version, files, sizeBytes, sha256 }.
// Aucune dépendance : le zip est écrit à la main (deflate ou stockage, pas de
// zip64), ce que `scripts/update/update-hyperbd.mjs` sait relire.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER_ARCHIVE = "hyperbd";
const EXCLUS = new Set([".gitignore"]);

const args = process.argv.slice(2);
function arg(nom) {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : null;
}

function rendre(objet, code = 0) {
  process.stdout.write(JSON.stringify(objet, null, 2) + "\n");
  process.exitCode = code;
}

// ── CRC-32, tel que le format zip l'attend ──────────────────────────────────
const TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Les horodatages zip sont ceux de MS-DOS : deux secondes de résolution, à partir
// de 1980. Toutes les entrées portent l'heure de l'empaquetage.
const maintenant = new Date();
const dosDate = ((maintenant.getFullYear() - 1980) << 9) | ((maintenant.getMonth() + 1) << 5) | maintenant.getDate();
const dosTime = (maintenant.getHours() << 11) | (maintenant.getMinutes() << 5) | (maintenant.getSeconds() >> 1);

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
}

/** Une entrée prête à écrire : son en-tête local, et sa fiche du répertoire central. */
function entree(nom, contenu, dossier) {
  const nomBuf = Buffer.from(nom, "utf8");
  const crc = dossier ? 0 : crc32(contenu);
  let methode = 0;
  let corps = contenu;
  if (!dossier && contenu.length > 0) {
    const comprime = deflateRawSync(contenu, { level: 9 });
    if (comprime.length < contenu.length) {
      methode = 8;
      corps = comprime;
    }
  }
  // Le bit 11 dit que le nom est en UTF-8 : les accents des noms de fichiers, s'il y
  // en a un jour, arrivent intacts.
  const drapeaux = 0x0800;
  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(drapeaux), u16(methode), u16(dosTime), u16(dosDate),
    u32(crc), u32(corps.length), u32(contenu.length), u16(nomBuf.length), u16(0), nomBuf,
  ]);
  const central = (decalage) =>
    Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(drapeaux), u16(methode), u16(dosTime), u16(dosDate),
      u32(crc), u32(corps.length), u32(contenu.length), u16(nomBuf.length), u16(0), u16(0),
      u16(0), u16(0), u32(dossier ? 0x10 : 0), u32(decalage), nomBuf,
    ]);
  return { local, corps, central };
}

function construire() {
  const suivis = execFileSync("git", ["ls-files", "-z"], { cwd: RACINE })
    .toString("utf8")
    .split("\0")
    .filter((f) => f && !EXCLUS.has(f) && existsSync(path.join(RACINE, f)))
    .sort();
  if (suivis.length === 0) throw new Error("git ls-files ne rend rien : est-on bien dans le dépôt ?");

  // Les dossiers d'abord, chacun une fois, du plus court au plus long : un
  // extracteur strict les veut avant leurs fichiers.
  const dossiers = new Set([`${DOSSIER_ARCHIVE}/`]);
  for (const f of suivis) {
    const morceaux = f.split("/");
    for (let i = 1; i < morceaux.length; i++) dossiers.add(`${DOSSIER_ARCHIVE}/${morceaux.slice(0, i).join("/")}/`);
  }
  const entrees = [...dossiers].sort().map((d) => entree(d, Buffer.alloc(0), true));
  for (const f of suivis) entrees.push(entree(`${DOSSIER_ARCHIVE}/${f}`, readFileSync(path.join(RACINE, f)), false));

  const morceaux = [];
  const centraux = [];
  let decalage = 0;
  for (const e of entrees) {
    centraux.push(e.central(decalage));
    morceaux.push(e.local, e.corps);
    decalage += e.local.length + e.corps.length;
  }
  const repertoire = Buffer.concat(centraux);
  const fin = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entrees.length), u16(entrees.length),
    u32(repertoire.length), u32(decalage), u16(0),
  ]);
  return { octets: Buffer.concat([...morceaux, repertoire, fin]), fichiers: suivis.length };
}

try {
  const version = JSON.parse(readFileSync(path.join(RACINE, ".claude-plugin", "plugin.json"), "utf8")).version;
  const { octets, fichiers } = construire();
  const sortie = path.resolve(arg("--out") ?? `hyperbd-v${version}.zip`);
  mkdirSync(path.dirname(sortie), { recursive: true });
  writeFileSync(sortie, octets);
  const copie = arg("--copie") ? path.resolve(arg("--copie")) : null;
  if (copie) {
    mkdirSync(path.dirname(copie), { recursive: true });
    writeFileSync(copie, octets);
  }
  rendre({
    file: sortie,
    copie,
    version,
    files: fichiers,
    sizeBytes: statSync(sortie).size,
    sha256: createHash("sha256").update(octets).digest("hex"),
  });
} catch (e) {
  rendre({ ok: false, message: e?.message || String(e) }, 1);
}
