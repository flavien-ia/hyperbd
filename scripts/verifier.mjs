// Vérification STATIQUE du plugin : tout ce qui se contrôle sans serveur.
// À lancer avant chaque version : node scripts/verifier.mjs Chaque contrôle dit ce qu'il vérifie et échoue en nommant le
// fichier fautif, pas en comptant des erreurs anonymes.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
let echecs = 0;
const ok = (b, quoi, detail = "") => {
  if (!b) echecs++;
  console.log(`${b ? "  ok  " : " ÉCHEC"} ${quoi}${detail ? ` : ${detail}` : ""}`);
};

// ── 1. Les deux manifestes, en phase ─────────────────────────────────────────
const plugin = JSON.parse(readFileSync(join(RACINE, ".claude-plugin/plugin.json"), "utf8"));
const marche = JSON.parse(readFileSync(join(RACINE, ".claude-plugin/marketplace.json"), "utf8"));
ok(plugin.name === "hyperbd", "nom du plugin", plugin.name);
ok(plugin.version === marche.plugins[0].version, "versions en phase", `${plugin.version} / ${marche.plugins[0].version}`);
// La version vit à trois endroits lisibles par les gens, en plus des manifestes.
const readme = readFileSync(join(RACINE, "README.md"), "utf8");
ok(readme.includes(`**Version ${plugin.version}.**`), "le README annonce la version du manifeste", plugin.version);
const changelog = readFileSync(join(RACINE, "CHANGELOG.md"), "utf8");
const derniereEntree = /^## v(\S+)/m.exec(changelog)?.[1];
ok(derniereEntree === plugin.version, "la dernière entrée du CHANGELOG est celle de la version", derniereEntree ?? "aucune");
for (const f of ["LICENSE", "SECURITY.md", "CHANGELOG.md"]) ok(existsSync(join(RACINE, f)), `${f} présent`);
ok(plugin.repository === "https://github.com/flavien-ia/hyperbd", "URL du dépôt dans le manifeste");

// ── 2. Chaque skill : dossier = frontmatter, description non vide ───────────
const skillsDir = join(RACINE, "skills");
const skills = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
ok(skills.length === 27, "27 skills", String(skills.length));
for (const s of skills) {
  const f = join(skillsDir, s, "SKILL.md");
  if (!existsSync(f)) { ok(false, `SKILL.md manquant`, s); continue; }
  const t = readFileSync(f, "utf8");
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(t);
  if (!fm) { ok(false, `frontmatter absent`, s); continue; }
  const nom = /(?:^|\n)name:\s*(\S+)/.exec(fm[1])?.[1];
  const desc = /(?:^|\n)description:\s*(.+)/.exec(fm[1])?.[1];
  if (nom !== s) ok(false, `nom ≠ dossier`, `${s} vs ${nom}`);
  if (!desc || desc.trim().length < 20) ok(false, `description trop courte`, s);
  // Le dialogue « Téléverser un plugin » de Claude Desktop refuse tout zip dont
  // une description porte un chevron, flèches comprises, sans que rien d'autre
  // ne le signale.
  if (desc && /[<>]/.test(desc)) ok(false, `chevron dans la description (Claude Desktop refuse le zip)`, s);
}
console.log("  ok   frontmatters des 27 skills (nom = dossier, description, sans chevron)");

// ── 3. Chaque chemin ${CLAUDE_SKILL_DIR}/../../<x> référencé EXISTE ─────────
const refs = new Set();
for (const s of skills) {
  const t = readFileSync(join(skillsDir, s, "SKILL.md"), "utf8");
  for (const m of t.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/\.\.\/\.\.\/([A-Za-z0-9_\-./]+)/g)) {
    refs.add(m[1]);
  }
}
let refsKo = 0;
for (const r of refs) {
  if (!existsSync(join(RACINE, r))) { refsKo++; ok(false, "référence morte", r); }
}
ok(refsKo === 0, `${refs.size} chemins référencés par les skills existent tous`);

// ── 4. Aucun chemin absolu (portabilité) ─────────────────────────────────────
let absolus = 0;
for (const s of skills) {
  const t = readFileSync(join(skillsDir, s, "SKILL.md"), "utf8");
  if (/[Cc]:[\\/](DEV|Users)/.test(t)) { absolus++; ok(false, "chemin absolu dans une skill", s); }
}
ok(absolus === 0, "aucun chemin absolu dans les skills");

// ── 5. Les scripts passent node --check ─────────────────────────────────────
function* scriptsDe(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* scriptsDe(p);
    else if (e.endsWith(".mjs")) yield p;
  }
}
const scripts = [...scriptsDe(join(RACINE, "scripts"))];
for (const f of scripts) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
  } catch (e) {
    ok(false, "syntaxe", `${f.replace(RACINE, "")} : ${String(e.stderr).slice(0, 100)}`);
  }
}
ok(true, `syntaxe des ${scripts.length} scripts (node --check)`);

// ── 6. Typographie : cadratins et échappements bannis partout ───────────────
function* fichiers(dir) {
  for (const e of readdirSync(dir)) {
    if (e === ".git" || e === "node_modules") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* fichiers(p);
    else if (/\.(md|mjs|json)$/.test(e)) yield p;
  }
}
let typo = 0;
for (const f of fichiers(RACINE)) {
  const lignes = readFileSync(f, "utf8").split(/\r?\n/);
  lignes.forEach((l, i) => {
    // La classe de caractères du DÉTECTEUR (bd-lint) doit contenir ce qu'elle
    // bannit : c'est le mécanisme d'application, pas de la prose.
    const detecteur = l.includes("[—–]");
    if (!detecteur && /[—–]/.test(l)) { typo++; ok(false, "tiret cadratin", `${f.replace(RACINE, "")}:${i + 1}`); }
    if (/\\u[0-9a-fA-F]{4}/.test(l)) { typo++; ok(false, "échappement unicode", `${f.replace(RACINE, "")}:${i + 1}`); }
  });
}
ok(typo === 0, "typographie propre sur tout le dépôt (md, mjs, json)");

// ── 7. Le CLI documente ce qu'il implémente, et rien d'autre ────────────────
const cli = readFileSync(join(RACINE, "scripts/studio.mjs"), "utf8");
const bloc = cli.slice(cli.indexOf("const commandes = {"));
const implementees = new Set(
  [...bloc.matchAll(/^  (?:async )?(?:"([a-z-]+)"|([a-z-]+))\s*[:(]/gm)].map((m) => m[1] ?? m[2]),
);
const documentees = new Set(
  // Une commande commence par une lettre : les « -- » des séparateurs de
  // sections du bloc d'aide n'en sont pas.
  [...cli.matchAll(/^\/\/   ([a-z][a-z-]*) /gm)].map((m) => m[1]),
);
const nonDoc = [...implementees].filter((c) => !documentees.has(c));
const fantomes = [...documentees].filter((c) => !implementees.has(c));
ok(nonDoc.length === 0, "toute commande implémentée est documentée", nonDoc.join(", ") || `${implementees.size} commandes`);
ok(fantomes.length === 0, "aucune commande documentée sans implémentation", fantomes.join(", "));

// ── 8. Les grilles de juges portent le format strict ────────────────────────
const juges = readdirSync(join(RACINE, "templates/juges")).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
ok(juges.length === 12, "12 grilles de juges", juges.join(", "));
const commun = readFileSync(join(RACINE, "templates/juges/_commun.md"), "utf8");
ok(/SCORES:/.test(commun) && /VERDICT:/.test(commun), "la grille commune porte le format parsable");
// Le juge lettrage a son propre verdict et sa procédure des visages.
const lettrage = readFileSync(join(RACINE, "templates/juges/lettrage.md"), "utf8");
ok(/VALIDER \| AJUSTER \| REFAIRE/.test(lettrage), "le juge lettrage porte son verdict propre");
ok(/Ce que recouvre chaque bulle/.test(lettrage), "le juge lettrage exige le relevé des visages");

// ── 9. Ce que les skills demandent au CLI existe ────────────────────────────
// Chaque appel `studio.mjs" <commande> --option` (ou `"$S" <commande>`) écrit
// dans une skill ou un gabarit doit nommer une commande implémentée, et des
// options que le CLI lit vraiment : une option citée et jamais lue est
// ignorée en silence, et la skill croit avoir demandé ce qu'elle n'a pas eu.
function* textesDuMetier() {
  for (const s of skills) yield [`skills/${s}/SKILL.md`, readFileSync(join(skillsDir, s, "SKILL.md"), "utf8")];
  for (const f of fichiers(join(RACINE, "templates"))) {
    if (f.endsWith(".md")) yield [f.slice(RACINE.length + 1).split("\\").join("/"), readFileSync(f, "utf8")];
  }
}
// Lue directement (`o.option`), ou par son nom (`o["option"]`, `texteDe("option", ...)`).
const optionLue = (opt) => cli.includes(`"${opt}"`) || new RegExp(`\\bo\\.${opt}\\b`).test(cli);
let appels = 0;
let appelsKo = 0;
for (const [nom, texte] of textesDuMetier()) {
  for (const m of texte.matchAll(/(?:studio\.mjs"|"\$S")[ \t]+([a-z][a-z-]*)([^\n`]*)/g)) {
    appels++;
    const [, commandeCitee, suite] = m;
    if (!implementees.has(commandeCitee)) {
      appelsKo++;
      ok(false, "commande citée mais absente du CLI", `${nom} : ${commandeCitee}`);
      continue;
    }
    for (const option of suite.matchAll(/--([a-z][a-z-]*)/g)) {
      if (!optionLue(option[1])) {
        appelsKo++;
        ok(false, "option citée mais jamais lue par le CLI", `${nom} : ${commandeCitee} --${option[1]}`);
      }
    }
  }
}
ok(appelsKo === 0, `${appels} appels au CLI dans les skills et gabarits : commandes et options existent`);

// ── 10. Les restes d'anciennes versions ne reviennent pas ───────────────────
// Chaque motif a déjà égaré quelqu'un : le tuto en onze étapes, des options
// retirées, l'ancien cadre de génération, Mon compte sans son onglet.
const PERIMES = [
  [/sur 11\b/, "le tuto en onze étapes (il en a quatre)"],
  [/--dialogue-mode/, "l'option --dialogue-mode (retirée : l'atelier impose le lettrage posé)"],
  [/--sans-pages-de-garde|pages de garde/, "les pages de garde du master (retirées de l'atelier)"],
  [/prompt_template/, "l'ancien cadre de génération (la DA vit dans le Prompt de style)"],
  [/app\.studio-entremondes\.fr\/compte(?!\?onglet=)/, "Mon compte sans son onglet (jetons et clés : ?onglet=cles)"],
  [/`_toile`/, "la skill _toile (devenue _recit : le fil et l'établi)"],
  [/sur\s+(la|une)\s+Toile|la Corbeille du rail/, "la Toile comme lieu de travail (c'est le fil du récit, ou l'établi)"],
  [/"ancre"\s*:/, "une ancre de lot (l'atelier place tout, un agent ne donne jamais de positions)"],
];
// Les skills-relais gardent les anciens noms le temps d'une version : elles ne
// font que renvoyer vers les nouvelles commandes.
const RELAIS = new Set(["bd-personnages", "bd-design"]);
const ANCIENNES = [
  [/\/bd-personnages\b/, "/bd-personnages (devenu /bd-perso)"],
  [/\/bd-design\b/, "/bd-design (devenu /bd-perso, /bd-decors, /bd-planche-test)"],
];
let perimes = 0;
for (const [nom, texte] of textesDuMetier()) {
  for (const [motif, quoi] of PERIMES) {
    if (motif.test(texte)) {
      perimes++;
      ok(false, "passage périmé", `${nom} : ${quoi}`);
    }
  }
  if ([...RELAIS].some((r) => nom.includes(r))) continue;
  for (const [motif, quoi] of ANCIENNES) {
    if (motif.test(texte)) {
      perimes++;
      ok(false, "ancienne commande", `${nom} : ${quoi}`);
    }
  }
}
ok(perimes === 0, "aucun passage périmé connu dans les skills et gabarits");

// ── La mise à jour : ce qu'elle promet selon l'endroit où vit le plugin ────
// Une vraie installation, dans des dossiers jetables (scripts/update/recette-place.mjs).
const recettePlace = spawnSync(process.execPath, [join(RACINE, "scripts/update/recette-place.mjs")], { encoding: "utf8" });
if (recettePlace.status !== 0) console.log(recettePlace.stdout + recettePlace.stderr);
ok(recettePlace.status === 0, "la mise à jour ne promet une sauvegarde que là où elle dure");

// ── Le client, contre un faux atelier local (scripts/recette-client.mjs) ────
// Ce que le client envoie ou refuse d'envoyer, sans réseau et sans dépense.
const recetteClient = spawnSync(process.execPath, [join(RACINE, "scripts/recette-client.mjs")], { encoding: "utf8" });
if (recetteClient.status !== 0) console.log(recetteClient.stdout + recetteClient.stderr);
ok(recetteClient.status === 0, "le client envoie ce qu'il doit (couverture, rangement des lots, options retirées)");

console.log(`\n${echecs === 0 ? "STATIQUE : tout tient." : `STATIQUE : ${echecs} échec(s).`}`);
process.exitCode = echecs ? 1 : 0;
