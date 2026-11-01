#!/usr/bin/env node
// recette-place.mjs : ce qu'une mise à jour promet, selon l'endroit où vit le plugin.
//
// Sous Claude Desktop 4.29, les plugins téléversés vivent dans un registre à lui
// (`...\rpm\...\plugin_<id>`), qui efface en quelques minutes tout dossier qu'il ne connaît
// pas : promettre l'ancienne version « gardée de côté » y est faux. Tenu ici : une vraie
// installation (le vrai script, une vraie archive, des dossiers jetables, un répertoire
// personnel jetable) dit `backupKept` et `desktop`, et les textes suivent ces deux champs.
//
//   node scripts/update/recette-place.mjs
//
// Lancée aussi par scripts/verifier.mjs. Aucun réseau, rien d'écrit hors du dossier jetable.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const NOM = "hyperbd";
const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { placeDuPlugin } = await import(pathToFileURL(join(RACINE, "scripts", "plugin-place.mjs")).href);

let echecs = 0;
function ok(quoi, vrai, detail = "") {
  if (!vrai) echecs++;
  console.log(`${vrai ? "  ok  " : " ÉCHEC"} ${quoi}${vrai || !detail ? "" : ` : ${String(detail).slice(0, 400)}`}`);
}
const lire = (rel) => readFileSync(join(RACINE, rel), "utf8");

/** Une archive sans compression : assez pour le lecteur du script (il ne relit pas le CRC). */
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
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(n.length, 26);
    locales.push(h, n, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
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
  const rpm = placeDuPlugin("C:\\Users\\x\\AppData\\Roaming\\Claude\\Claude-Data\\claude_pzs8sxrjxfjjc\\rpm\\a859f234\\c851960e\\plugin_01E2Fc5UoFNisCLPWJVHhihQ", NOM);
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

  const installer = (dossier) => {
    mkdirSync(join(dossier, ".claude-plugin"), { recursive: true });
    writeFileSync(join(dossier, ".claude-plugin", "plugin.json"), manifeste("1.0.0"));
    const r = spawnSync(process.execPath, [join(RACINE, "scripts", "update", `update-${NOM}.mjs`), "install", "--zip", zip, "--plugin-dir", dossier], {
      encoding: "utf8",
      env: { ...process.env, HOME: maison, USERPROFILE: maison },
    });
    try {
      return JSON.parse(r.stdout);
    } catch {
      return { ok: false, brut: r.stdout + r.stderr };
    }
  };
  const version = (dossier) => JSON.parse(readFileSync(join(dossier, ".claude-plugin", "plugin.json"), "utf8")).version;

  const marche = join(maison, ".claude", "plugins", "marketplaces", "local-desktop-app-uploads", NOM);
  let r = installer(marche);
  ok("dans un dossier de marketplace : installée, sauvegarde gardée et annoncée", r.ok === true && version(marche) === "9.9.9" && r.backupKept === true && r.desktop === false && existsSync(r.backup) && version(r.backup) === "1.0.0", JSON.stringify(r));

  const desktop = join(boite, "Claude-Data", "claude_pzs8sxrjxfjjc", "rpm", "a859f234", "c851960e", "plugin_01TESTdesktop");
  r = installer(desktop);
  ok("dans le registre de Desktop : installée, aucune sauvegarde promise", r.ok === true && version(desktop) === "9.9.9" && r.backupKept === false && r.desktop === true && r.place === "desktop", JSON.stringify(r));

  const ailleurs = join(boite, "ailleurs", NOM);
  r = installer(ailleurs);
  ok("ailleurs : installée, aucune sauvegarde promise", r.ok === true && version(ailleurs) === "9.9.9" && r.backupKept === false && r.desktop === false, JSON.stringify(r));
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

console.log(echecs ? `\n${echecs} échec(s).` : "\nLa mise à jour dit vrai sur sa sauvegarde.");
process.exitCode = echecs ? 1 : 0;
