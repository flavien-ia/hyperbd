// archive-projet.mjs : l'archive complète d'un projet de l'atelier, fabriquée
// sur cette machine. Commun à HyperBD et HyperMovie (fichier identique dans les
// deux plugins, comparé par `scripts/verifier.mjs` d'HyperMovie).
//
// La même archive que le bouton « Exporter le projet » de l'atelier : les
// lignes du projet (et de son univers), tous ses fichiers, et un sommaire
// (`manifest.json`). Elle se réimporte dans l'atelier par « Importer un
// projet », toujours en projet neuf.
//
// Le .zip s'écrit au fil de l'eau : un album de plusieurs gigaoctets ne passe
// jamais en mémoire, seul un fichier à la fois (quatre téléchargements en
// parallèle). Aucune dépendance : le zip est écrit à la main, avec zip64 dès
// que l'archive dépasse 4 Go.

import { open, rm } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
import * as zlib from "node:zlib";

const FORMAT = "studio-entremondes/projet";
const EN_PARALLELE = 4;
const MAX32 = 0xffffffff;
/** Au-delà, zip64 (le format classique compte en 32 bits). */
const SEUIL64 = MAX32;
const SEUIL64_ENTREES = 0xffff;

// ── CRC-32 : celui de Node quand il existe (rapide), sinon une table ────────
const TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  TABLE[n] = c >>> 0;
}
function crc32(buf) {
  if (typeof zlib.crc32 === "function") return zlib.crc32(buf) >>> 0;
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Un écrivain de zip en flux, entrée après entrée, dans un fichier. */
async function ecrivainZip(chemin) {
  const fh = await open(chemin, "w");
  const maintenant = new Date();
  const dosDate =
    ((maintenant.getFullYear() - 1980) << 9) | ((maintenant.getMonth() + 1) << 5) | maintenant.getDate();
  const dosTime = (maintenant.getHours() << 11) | (maintenant.getMinutes() << 5) | (maintenant.getSeconds() >> 1);
  let position = 0;
  const repertoire = [];
  let file = Promise.resolve();

  const ecrire = async (buf) => {
    await fh.write(buf);
    position += buf.length;
  };

  /** Ajoute une entrée ; `compresser` : deflate (les lignes), sinon stockée (les fichiers). */
  function ajouter(nom, contenu, compresser) {
    // Les écritures passent l'une après l'autre, dans l'ordre d'arrivée.
    const tache = file.then(async () => {
      const corps = compresser ? deflateRawSync(contenu) : contenu;
      if (corps.length >= MAX32 || contenu.length >= MAX32) {
        throw new Error(`Fichier trop gros pour une entrée (${nom}, plus de 4 Go).`);
      }
      const nomBuf = Buffer.from(nom, "utf8");
      const crc = crc32(contenu);
      const methode = compresser ? 8 : 0;
      const decalage = position;
      const entete = Buffer.alloc(30);
      entete.writeUInt32LE(0x04034b50, 0);
      entete.writeUInt16LE(45, 4);
      entete.writeUInt16LE(0x0800, 6); // noms en UTF-8
      entete.writeUInt16LE(methode, 8);
      entete.writeUInt16LE(dosTime, 10);
      entete.writeUInt16LE(dosDate, 12);
      entete.writeUInt32LE(crc, 14);
      entete.writeUInt32LE(corps.length, 18);
      entete.writeUInt32LE(contenu.length, 22);
      entete.writeUInt16LE(nomBuf.length, 26);
      entete.writeUInt16LE(0, 28);
      await ecrire(Buffer.concat([entete, nomBuf]));
      await ecrire(corps);
      repertoire.push({ nomBuf, crc, methode, compresse: corps.length, taille: contenu.length, decalage });
    });
    file = tache.catch(() => undefined);
    return tache;
  }

  async function fermer() {
    await file;
    const debutRep = position;
    for (const e of repertoire) {
      const z64 = e.decalage >= SEUIL64;
      const extra = z64 ? Buffer.alloc(12) : Buffer.alloc(0);
      if (z64) {
        extra.writeUInt16LE(0x0001, 0);
        extra.writeUInt16LE(8, 2);
        extra.writeBigUInt64LE(BigInt(e.decalage), 4);
      }
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0);
      c.writeUInt16LE(45, 4);
      c.writeUInt16LE(45, 6);
      c.writeUInt16LE(0x0800, 8);
      c.writeUInt16LE(e.methode, 10);
      c.writeUInt16LE(dosTime, 12);
      c.writeUInt16LE(dosDate, 14);
      c.writeUInt32LE(e.crc, 16);
      c.writeUInt32LE(e.compresse, 20);
      c.writeUInt32LE(e.taille, 24);
      c.writeUInt16LE(e.nomBuf.length, 28);
      c.writeUInt16LE(extra.length, 30);
      c.writeUInt32LE(z64 ? MAX32 : e.decalage, 42);
      await ecrire(Buffer.concat([c, e.nomBuf, extra]));
    }
    const tailleRep = position - debutRep;
    const n = repertoire.length;
    const zip64 = n >= SEUIL64_ENTREES || debutRep >= SEUIL64 || tailleRep >= SEUIL64;
    if (zip64) {
      const debut64 = position;
      const r = Buffer.alloc(56);
      r.writeUInt32LE(0x06064b50, 0);
      r.writeBigUInt64LE(44n, 4);
      r.writeUInt16LE(45, 12);
      r.writeUInt16LE(45, 14);
      r.writeUInt32LE(0, 16);
      r.writeUInt32LE(0, 20);
      r.writeBigUInt64LE(BigInt(n), 24);
      r.writeBigUInt64LE(BigInt(n), 32);
      r.writeBigUInt64LE(BigInt(tailleRep), 40);
      r.writeBigUInt64LE(BigInt(debutRep), 48);
      const l = Buffer.alloc(20);
      l.writeUInt32LE(0x07064b50, 0);
      l.writeUInt32LE(0, 4);
      l.writeBigUInt64LE(BigInt(debut64), 8);
      l.writeUInt32LE(1, 16);
      await ecrire(Buffer.concat([r, l]));
    }
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054b50, 0);
    fin.writeUInt16LE(zip64 ? 0xffff : n, 8);
    fin.writeUInt16LE(zip64 ? 0xffff : n, 10);
    fin.writeUInt32LE(zip64 ? MAX32 : tailleRep, 12);
    fin.writeUInt32LE(zip64 ? MAX32 : debutRep, 16);
    await ecrire(fin);
    await fh.close();
    return position;
  }

  /** Un export interrompu ne laisse pas derrière lui un .zip illisible. */
  async function abandonner() {
    await fh.close().catch(() => undefined);
    await rm(chemin, { force: true }).catch(() => undefined);
  }

  return { ajouter, fermer, abandonner };
}

/**
 * Fabrique l'archive du projet `projet` (identifiant ou slug) dans `sortie`.
 * `appel(chemin, options)` : le client de l'atelier du plugin.
 * `onProgres(texte)` : où dire où l'on en est (stderr).
 */
export async function exporterProjet({ appel, projet, sortie, onProgres = () => {} }) {
  const enc = encodeURIComponent(projet);
  const debut = await appel(`/projects/${enc}/archive`);
  const zip = await ecrivainZip(sortie);
  const manifeste = {
    format: debut.format,
    version: debut.version,
    exporteLe: new Date().toISOString(),
    projet: debut.projet,
    univers: debut.univers,
    tables: [],
    ids: { projet: [], univers: [] },
    cles: { projet: [], univers: [] },
    manquants: [],
    octets: 0,
  };
  if (debut.format !== FORMAT) throw new Error(`Format d'archive inattendu : ${debut.format}.`);

  try {
    const cles = new Map();
    for (const { nom, groupe } of debut.tables) {
      const table = { nom, groupe, pages: [], lignes: 0 };
      for (let depart = 0; depart !== null; ) {
        const page = await appel(`/projects/${enc}/archive/lignes?table=${encodeURIComponent(nom)}&depart=${depart}`);
        if (page.lignes.length > 0) {
          const chemin = `donnees/${nom}/${String(table.pages.length).padStart(4, "0")}.json`;
          await zip.ajouter(chemin, Buffer.from(JSON.stringify(page.lignes), "utf8"), true);
          table.pages.push(chemin);
          table.lignes += page.lignes.length;
          for (const l of page.lignes) if (typeof l.id === "string") manifeste.ids[groupe].push(l.id);
        }
        // Une clé que l'univers désigne vit dans SON stockage : elle part avec lui.
        for (const c of page.cles) if (groupe === "univers" || !cles.has(c)) cles.set(c, groupe);
        depart = page.suivant;
      }
      manifeste.tables.push(table);
      onProgres(`lignes : ${nom} (${table.lignes})`);
    }

    const aPrendre = [...cles.entries()].map(([cle, groupe]) => ({ cle, groupe }));
    let fait = 0;
    for (let i = 0; i < aPrendre.length; i += 100) {
      const urls = await appel(`/projects/${enc}/archive/urls`, {
        method: "POST",
        body: { cles: aPrendre.slice(i, i + 100) },
      });
      let k = 0;
      await Promise.all(
        Array.from({ length: Math.min(EN_PARALLELE, urls.length) }, async () => {
          while (k < urls.length) {
            const { cle, groupe, url } = urls[k++];
            const r = url ? await fetch(url).catch(() => null) : null;
            if (!r?.ok) {
              manifeste.manquants.push(cle);
            } else {
              const contenu = Buffer.from(await r.arrayBuffer());
              await zip.ajouter(`fichiers/${cle}`, contenu, false);
              manifeste.cles[groupe].push(cle);
              manifeste.octets += contenu.length;
            }
            fait++;
            if (fait % 25 === 0 || fait === aPrendre.length) {
              onProgres(`fichiers : ${fait} / ${aPrendre.length} (${(manifeste.octets / 1e6).toFixed(1)} Mo)`);
            }
          }
        }),
      );
    }

    await zip.ajouter("manifest.json", Buffer.from(JSON.stringify(manifeste, null, 1), "utf8"), true);
    const taille = await zip.fermer();
    return {
      ok: true,
      fichier: sortie,
      projet: manifeste.projet,
      univers: manifeste.univers,
      elements: manifeste.tables.reduce((n, t) => n + t.lignes, 0),
      fichiers: manifeste.cles.projet.length + manifeste.cles.univers.length,
      manquants: manifeste.manquants.length,
      tailleOctets: taille,
    };
  } catch (e) {
    await zip.abandonner();
    throw e;
  }
}
