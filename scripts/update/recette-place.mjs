#!/usr/bin/env node
// recette-place.mjs : ce qu'une mise à jour promet, selon l'endroit où vit le plugin.
//
// Sous Claude Desktop 4.29, les plugins téléversés vivent dans un registre à lui
// (`...\rpm\...\plugin_<id>`), qui efface en quelques minutes tout dossier qu'il ne connaît
// pas : promettre l'ancienne version « gardée de côté » y est faux. Tenu ici : une vraie
// installation (le vrai script, une vraie archive, des dossiers jetables, un répertoire
// personnel jetable) dit `backupKept` et `desktop`, et les textes suivent ces deux champs.
// Tenu aussi : l'installation n'accepte qu'une archive dont l'empreinte est confirmée par
// la release GitHub. Le réseau est remplacé par un faux `fetch` chargé avec `--require`
// (fichier jetable), le script lui-même n'a aucune porte de contournement.
// Tenu enfin : l'archive doit être signée par la clé que porte la version installée. Pour
// le vérifier sans la clé privée de publication, la recette installe une copie de l'outil
// de mise à jour dont le fichier `allowed_signers` porte une clé générée pour l'occasion
// (ssh-keygen, dossier jetable), signe ses archives avec, et contrôle qu'une bonne
// signature passe, qu'une archive modifiée, une signature d'une autre clé, une signature
// absente, une clé installée absente ou un ssh-keygen introuvable sont refusés.
//
//   node scripts/update/recette-place.mjs
//
// Lancée aussi par scripts/verifier.mjs. Aucun réseau, rien d'écrit hors du dossier jetable.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { crc32 } from "node:zlib";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const NOM = "hyperbd";
const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { placeDuPlugin } = await import(pathToFileURL(join(RACINE, "scripts", "plugin-place.mjs")).href);
const { verifierSignature, trouverSshKeygen, PRINCIPAL } = await import(pathToFileURL(join(RACINE, "scripts", "update", "signature.mjs")).href);

let echecs = 0;
function ok(quoi, vrai, detail = "") {
  if (!vrai) echecs++;
  console.log(`${vrai ? "  ok  " : " ÉCHEC"} ${quoi}${vrai || !detail ? "" : ` : ${String(detail).slice(0, 400)}`}`);
}
const lire = (rel) => readFileSync(join(RACINE, rel), "utf8");

/** Une archive sans compression, avec son CRC-32 (le lecteur du script le recalcule). */
function archive(fichiers) {
  const locales = [];
  const centrales = [];
  let decalage = 0;
  for (const [nom, texte] of Object.entries(fichiers)) {
    const data = Buffer.from(texte, "utf8");
    const n = Buffer.from(nom, "utf8");
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt32LE(crc32(data) >>> 0, 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(n.length, 26);
    locales.push(h, n, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt32LE(crc32(data) >>> 0, 16);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(decalage, 42);
    centrales.push(c, n);
    decalage += 30 + n.length + data.length;
  }
  const repertoire = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(Object.keys(fichiers).length, 8);
  fin.writeUInt16LE(Object.keys(fichiers).length, 10);
  fin.writeUInt32LE(repertoire.length, 12);
  fin.writeUInt32LE(decalage, 16);
  return Buffer.concat([...locales, repertoire, fin]);
}

console.log("Où vit le plugin");
{
  const mp = placeDuPlugin(`C:/Users/x/.claude/plugins/marketplaces/local-desktop-app-uploads/${NOM}`, NOM);
  ok("un dossier de marketplace : la sauvegarde tient", mp.place === "marketplace" && mp.backupKept === true && mp.desktop === false, JSON.stringify(mp));
  const rpm = placeDuPlugin("C:\\Users\\x\\AppData\\Roaming\\Claude\\Claude-Data\\claude_abcd1234efgh5\\rpm\\0a1b2c3d\\4e5f6a7b\\plugin_01AbCdEfGhIjKlMnOpQrStUv", NOM);
  ok("le registre de Claude Desktop : pas de promesse, et Desktop le dit", rpm.place === "desktop" && rpm.backupKept === false && rpm.desktop === true, JSON.stringify(rpm));
  const ailleurs = placeDuPlugin(`/home/x/plugins/${NOM}`, NOM);
  ok("ailleurs : pas de promesse, pas Desktop", ailleurs.place === "hors_marketplace" && ailleurs.backupKept === false && ailleurs.desktop === false, JSON.stringify(ailleurs));
  const autreNom = placeDuPlugin("/home/x/.claude/plugins/marketplaces/m/autre-nom", NOM);
  ok("un dossier de marketplace qui ne porte pas le nom du plugin : pas de promesse", autreNom.backupKept === false, JSON.stringify(autreNom));
}

console.log("\nUne vraie installation, dans des dossiers jetables");
const boite = mkdtempSync(join(tmpdir(), `${NOM}-recette-place-`));
try {
  const maison = join(boite, "maison");
  mkdirSync(maison, { recursive: true });
  const manifeste = (version) => JSON.stringify({ name: NOM, version });
  const neuve = { [`${NOM}/.claude-plugin/plugin.json`]: manifeste("9.9.9") };
  for (let i = 0; i < 36; i++) {
    neuve[`${NOM}/${["skills/a", "scripts", "templates/t"][i % 3]}/f${i}.txt`] = `fichier ${i}\n`;
  }
  const zip = join(boite, "neuve.zip");
  writeFileSync(zip, archive(neuve));
  const sha = createHash("sha256").update(readFileSync(zip)).digest("hex");

  // Les clés de la recette : celle que la « version installée » déclare, et une autre.
  const keygen = trouverSshKeygen();
  if (!keygen) throw new Error("ssh-keygen introuvable : la recette de la signature ne peut pas tourner");
  const genererCle = (nom) => {
    const f = join(boite, nom);
    const r = spawnSync(keygen, ["-q", "-t", "ed25519", "-N", "", "-C", nom, "-f", f], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (r.status !== 0) throw new Error(`génération de clé impossible : ${r.stdout}${r.stderr}`);
    return f;
  };
  const cleRecette = genererCle("cle-recette");
  const cleIntruse = genererCle("cle-intruse");
  const signer = (fichier, cle = cleRecette, espace = "file") => {
    rmSync(`${fichier}.sig`, { force: true });
    const r = spawnSync(keygen, ["-Y", "sign", "-f", cle, "-n", espace, fichier], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (r.status !== 0) throw new Error(`signature impossible : ${r.stdout}${r.stderr}`);
    return `${fichier}.sig`;
  };
  signer(zip);

  // La « version installée » : une copie de l'outil de mise à jour, avec la clé de la recette.
  const outil = join(boite, "outil");
  mkdirSync(join(outil, "scripts", "update"), { recursive: true });
  for (const f of ["scripts/plugin-place.mjs", "scripts/update/update-hyperbd.mjs", "scripts/update/signature.mjs"]) {
    copyFileSync(join(RACINE, f), join(outil, f));
  }
  const signatairesRecette = join(outil, "scripts", "update", "allowed_signers");
  const clePublique = readFileSync(`${cleRecette}.pub`, "utf8").trim().split(/\s+/).slice(0, 2).join(" ");
  writeFileSync(signatairesRecette, `# clé de la recette\n${PRINCIPAL} namespaces="file" ${clePublique}\n`);
  const SCRIPT = join(outil, "scripts", "update", `update-${NOM}.mjs`);

  // Le faux réseau : ce que l'atelier et GitHub publieraient pour la 9.9.9.
  // `fichiers.zip` : l'archive que sert le téléchargement de l'atelier ; `fichiers.sig` :
  // la signature publiée sur la release GitHub (absente : 404).
  const fauxReseau = (atelier, github, fichiers = {}) => {
    const p = join(boite, `reseau-${Math.random().toString(36).slice(2)}.cjs`);
    writeFileSync(
      p,
      `const fs = require("node:fs");
const rep = (corps) => ({ ok: corps !== null, status: corps === null ? 404 : 200, headers: { get: () => null }, json: async () => corps, text: async () => (typeof corps === "string" ? corps : JSON.stringify(corps)) });
const fichier = (f) => (f === null || !fs.existsSync(f) ? rep(null) : { ok: true, status: 200, headers: { get: () => null }, text: async () => fs.readFileSync(f, "utf8"), arrayBuffer: async () => { const b = fs.readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); } });
globalThis.fetch = async (url) => {
  url = String(url);
  if (url.includes("app.studio-entremondes.fr/api/plugin/download")) return fichier(${JSON.stringify(fichiers.zip ?? null)});
  if (url.includes("app.studio-entremondes.fr")) return rep(${JSON.stringify(atelier)});
  if (url.includes("api.github.com")) { if (${JSON.stringify(github)} === "panne") throw new Error("réseau coupé"); return rep(${JSON.stringify(github)}); }
  if (url.startsWith("https://github.com/") && url.endsWith(".zip.sig")) return fichier(${JSON.stringify(fichiers.sig ?? null)});
  throw new Error("adresse inattendue : " + url);
};\n`,
    );
    return p;
  };
  const githubBon = { tag_name: "v9.9.9", body: `SHA-256 : \`${sha}\``, assets: [{ name: `${NOM}-v9.9.9.zip`, digest: `sha256:${sha}` }] };
  const reseauBon = fauxReseau({ version: "9.9.9", sha256: sha }, githubBon);

  const lancer = (reseau, ...argv) => {
    const r = spawnSync(process.execPath, ["--require", reseau, SCRIPT, ...argv], {
      encoding: "utf8",
      env: { ...process.env, HOME: maison, USERPROFILE: maison },
    });
    try {
      return JSON.parse(r.stdout);
    } catch {
      return { ok: false, brut: r.stdout + r.stderr };
    }
  };
  const installer = (dossier, reseau = reseauBon, archiveAPoser = zip) => {
    mkdirSync(join(dossier, ".claude-plugin"), { recursive: true });
    writeFileSync(join(dossier, ".claude-plugin", "plugin.json"), manifeste("1.0.0"));
    return lancer(reseau, "install", "--zip", archiveAPoser, "--plugin-dir", dossier);
  };
  const version = (dossier) => JSON.parse(readFileSync(join(dossier, ".claude-plugin", "plugin.json"), "utf8")).version;

  const marche = join(maison, ".claude", "plugins", "marketplaces", "local-desktop-app-uploads", NOM);
  let r = installer(marche);
  ok("dans un dossier de marketplace : installée, sauvegarde gardée et annoncée", r.ok === true && version(marche) === "9.9.9" && r.backupKept === true && r.desktop === false && existsSync(r.backup) && version(r.backup) === "1.0.0", JSON.stringify(r));

  const desktop = join(boite, "Claude-Data", "claude_abcd1234efgh5", "rpm", "0a1b2c3d", "4e5f6a7b", "plugin_01TESTdesktop");
  r = installer(desktop);
  ok("dans le registre de Desktop : installée, aucune sauvegarde promise", r.ok === true && version(desktop) === "9.9.9" && r.backupKept === false && r.desktop === true && r.place === "desktop", JSON.stringify(r));

  const ailleurs = join(boite, "ailleurs", NOM);
  r = installer(ailleurs);
  ok("ailleurs : installée, aucune sauvegarde promise", r.ok === true && version(ailleurs) === "9.9.9" && r.backupKept === false && r.desktop === false, JSON.stringify(r));

  console.log("\nL'empreinte, avant de rien poser");
  const refusee = (quoi, reseau, raison) => {
    const d = join(boite, `refus-${Math.random().toString(36).slice(2)}`, NOM);
    const res = installer(d, reseau);
    ok(quoi, res.ok === false && res.reason === raison && version(d) === "1.0.0", JSON.stringify(res));
  };
  const autre = "0".repeat(64);
  refusee("GitHub injoignable : refus, rien d'installé", fauxReseau({ version: "9.9.9", sha256: sha }, "panne"), "sha256-unverifiable");
  refusee("aucune empreinte sur GitHub : refus, même si l'atelier confirme", fauxReseau({ version: "9.9.9", sha256: sha }, { tag_name: "v9.9.9", body: "", assets: [] }), "sha256-unverifiable");
  refusee("GitHub donne une autre empreinte : refus", fauxReseau(null, { ...githubBon, body: "", assets: [{ name: `${NOM}-v9.9.9.zip`, digest: `sha256:${autre}` }] }), "sha256-mismatch");
  refusee("l'atelier et GitHub divergent : refus", fauxReseau({ version: "9.9.9", sha256: autre }, githubBon), "sha256-mismatch");
  {
    const d = join(boite, "github-seul", NOM);
    const res = installer(d, fauxReseau(null, githubBon));
    ok("l'atelier muet, GitHub confirme : installée", res.ok === true && version(d) === "9.9.9", JSON.stringify(res));
  }
  {
    const abimee = Buffer.from(readFileSync(zip));
    const i = abimee.indexOf(Buffer.from("fichier 0\n"));
    abimee[i] = 0x46; // « Fichier » : même taille, CRC faux.
    const zipAbime = join(boite, "abimee.zip");
    writeFileSync(zipAbime, abimee);
    // Signée et confirmée par GitHub : seul le CRC-32 peut l'arrêter.
    signer(zipAbime);
    const shaAbime = createHash("sha256").update(abimee).digest("hex");
    const reseau = fauxReseau(null, { tag_name: "v9.9.9", body: "", assets: [{ name: `${NOM}-v9.9.9.zip`, digest: `sha256:${shaAbime}` }] });
    const d = join(boite, "abimee", NOM);
    const res = installer(d, reseau, zipAbime);
    ok("une entrée au CRC-32 faux : refusée, rien d'installé", res.ok === false && /CRC/.test(res.message || "") && version(d) === "1.0.0", JSON.stringify(res));
  }

  console.log("\nLa signature, avant d'ouvrir l'archive");
  {
    // Chaque cas a sa propre copie de l'archive, et donc sa propre signature (ou aucune).
    const copie = (nom) => {
      const f = join(boite, `${nom}.zip`);
      copyFileSync(zip, f);
      return f;
    };
    const refusSig = (quoi, archiveAPoser, raison, reseau = reseauBon) => {
      const d = join(boite, `sig-${Math.random().toString(36).slice(2)}`, NOM);
      const res = installer(d, reseau, archiveAPoser);
      ok(quoi, res.ok === false && res.reason === raison && version(d) === "1.0.0" && typeof res.message === "string" && res.message.length > 40, JSON.stringify(res));
    };

    const bonne = installer(join(boite, "sig-bonne", NOM));
    ok("une bonne signature : installée, et le JSON le dit", bonne.ok === true && bonne.signatureVerified === true, JSON.stringify(bonne));

    refusSig("aucune signature à côté de l'archive : refus, rien d'installé", copie("sans-signature"), "signature-missing");

    const modifiee = copie("modifiee");
    copyFileSync(`${zip}.sig`, `${modifiee}.sig`);
    {
      // Un octet changé après la signature ; GitHub « confirme » cette archive-là, pour
      // que seule la signature puisse l'arrêter.
      const b = readFileSync(modifiee);
      const i = b.indexOf(Buffer.from("fichier 1\n"));
      b[i] = 0x46;
      writeFileSync(modifiee, b);
      const shaModifiee = createHash("sha256").update(b).digest("hex");
      const reseauComplice = fauxReseau({ version: "9.9.9", sha256: shaModifiee }, { tag_name: "v9.9.9", body: `\`${shaModifiee}\``, assets: [{ name: `${NOM}-v9.9.9.zip`, digest: `sha256:${shaModifiee}` }] });
      refusSig("une archive modifiée après la signature, même confirmée par GitHub : refus", modifiee, "signature-invalid", reseauComplice);
    }

    const intruse = copie("intruse");
    signer(intruse, cleIntruse);
    refusSig("une signature faite par une autre clé : refus", intruse, "signature-invalid");

    const espaceGit = copie("espace-git");
    signer(espaceGit, cleRecette, "git");
    refusSig("une signature de la bonne clé, mais pour git et non pour un fichier : refus", espaceGit, "signature-invalid");

    const illisible = copie("illisible");
    writeFileSync(`${illisible}.sig`, "pas une signature\n");
    refusSig("un fichier de signature illisible : refus", illisible, "signature-invalid");

    // Sans la clé dans la version installée, rien ne passe, même une archive bien signée.
    const sauve = readFileSync(signatairesRecette);
    rmSync(signatairesRecette);
    refusSig("la clé manque dans la version installée : refus", zip, "signature-key-missing");
    writeFileSync(signatairesRecette, sauve);

    // ssh-keygen introuvable, et la vraie clé de publication contre une archive de la recette.
    const octets = readFileSync(zip);
    const sig = readFileSync(`${zip}.sig`, "utf8");
    const absent = verifierSignature(octets, sig, { signataires: signatairesRecette, sshKeygen: join(boite, "nulle-part", "ssh-keygen.exe") });
    ok("ssh-keygen introuvable : refus, et le message dit comment l'installer", absent.ok === false && absent.reason === "ssh-keygen-missing" && /OpenSSH/.test(absent.message), JSON.stringify(absent));
    const aucun = verifierSignature(octets, sig, { signataires: signatairesRecette, sshKeygen: null });
    ok("aucun ssh-keygen sur la machine : refus", aucun.ok === false && aucun.reason === "ssh-keygen-missing", JSON.stringify(aucun));
    const vraieCle = verifierSignature(octets, sig);
    ok("la clé de publication du dépôt ne reconnaît pas une signature de la recette", vraieCle.ok === false && vraieCle.reason === "signature-invalid", JSON.stringify(vraieCle));
  }

  console.log("\nLe téléchargement, signature comprise");
  {
    const reseauComplet = (sig) => fauxReseau({ version: "9.9.9", sha256: sha }, githubBon, { zip, sig });
    const res = lancer(reseauComplet(`${zip}.sig`), "download");
    const range = join(maison, ".hyperbd", "updates", `${NOM}-9.9.9.zip`);
    ok(
      "archive signée : gardée, signature rangée à côté, et install la relit",
      res.ok === true && res.signatureVerified === true && res.sha256Verified === true && res.signatureFile === `${range}.sig` && existsSync(`${range}.sig`),
      JSON.stringify(res),
    );
    if (res.ok) {
      const d = join(boite, "apres-download", NOM);
      const posee = installer(d, reseauBon, range);
      ok("l'archive téléchargée s'installe avec sa signature", posee.ok === true && version(d) === "9.9.9", JSON.stringify(posee));
    }
    rmSync(join(maison, ".hyperbd"), { recursive: true, force: true });
    const sansSig = lancer(reseauComplet(null), "download");
    ok("la release ne publie pas de signature : rien n'est gardé", sansSig.ok === false && sansSig.reason === "signature-missing" && !existsSync(join(maison, ".hyperbd", "updates", `${NOM}-9.9.9.zip`)), JSON.stringify(sansSig));
    const intruseSig = join(boite, "intruse.zip.sig");
    const fausse = lancer(reseauComplet(intruseSig), "download");
    ok("la release publie une signature faite par une autre clé : rien n'est gardé", fausse.ok === false && fausse.reason === "signature-invalid", JSON.stringify(fausse));
  }
} finally {
  rmSync(boite, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

console.log("\nLes textes");
{
  const skill = lire(`skills/update-${NOM}/SKILL.md`);
  const fin = skill.slice(skill.indexOf("## Étape 4"));
  ok("la sauvegarde n'est promise que si backupKept est vrai", /`backupKept: true` : ajoute « L'ancienne version est gardée de côté/.test(fin) && /`backupKept: false` : \*\*ne promets jamais de sauvegarde\.\*\*/.test(fin));
  ok("sous Desktop, une phrase dit que l'écran Plugins garde l'ancien numéro", /`desktop: true` : ajoute une phrase : « Claude Desktop continuera d'afficher l'ancien numéro/.test(fin));
  ok("l'étape 3 relève les deux champs", /`backupKept` et `desktop`/.test(skill.slice(skill.indexOf("## Étape 3"), skill.indexOf("## Étape 4"))));
  const description = /^description: (.*)$/m.exec(skill)?.[1] ?? "";
  ok("la description de la skill ne promet plus rien", description.length > 0 && !/de côté|sauvegarde|backup/i.test(description), description);
  for (const f of [`skills/update-${NOM}/SKILL.md`, "README.md"]) {
    const fautives = lire(f).split("\n").filter((l) => /de côté/.test(l) && !l.includes("`backupKept: true`"));
    ok(`${f} : aucune promesse « de côté » hors de la branche backupKept`, fautives.length === 0, fautives.join(" | "));
  }
  ok("SECURITY.md dit que Desktop efface la sauvegarde", /sauvegarde de la version précédente à côté du plugin \(sous Claude\s+Desktop,\s+qui efface les dossiers/.test(lire("SECURITY.md")));
}

console.log(echecs ? `\n${echecs} échec(s).` : "\nLa mise à jour dit vrai sur sa sauvegarde, et n'installe que ce qui est signé.");
process.exitCode = echecs ? 1 : 0;
