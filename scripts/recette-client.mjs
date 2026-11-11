// Essai du client du harnais contre un faux atelier local : aucune requête
// ne sort de la machine, rien n'est dépensé. On vérifie ce que le client
// ENVOIE (ou refuse d'envoyer) : la couverture sans cases, le rangement des
// lots sur la Toile, les options retirées. Lancé par `verifier.mjs`.
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "studio.mjs");
const maison = mkdtempSync(join(tmpdir(), "hyperbd-essai-"));
mkdirSync(join(maison, ".hyperbd"));

/** Ce que le faux atelier sait répondre. */
const planches = {
  couv: { id: "couv", kind: "couverture", scriptModules: { header: "", cases: [], footer: "", pageSeule: true, description: "Un enfant devant une église." } },
  couvVide: { id: "couvVide", kind: "couverture", scriptModules: { header: "", cases: [], footer: "" } },
  quatrieme: { id: "quatrieme", kind: "quatrieme", scriptModules: { header: "", cases: [], footer: "", description: "Le dos de l'église." } },
  vide: { id: "vide", kind: "planche", scriptModules: { header: "", cases: [], footer: "" } },
  pleine: { id: "pleine", kind: "planche", scriptModules: { header: "", cases: [{ id: "c1", page: "left", script: "x" }], footer: "" } },
};
const toiles = {
  vide: [],
  recit: [{ id: "s1", type: "scene", x: 0, y: 0 }, { id: "a1", type: "acte", x: 0, y: 0 }],
  occupee: [
    { id: "s1", type: "scene", x: 0, y: 0 },
    { id: "n1", type: "note", x: -1360, y: 0 },
    { id: "i1", type: "image", x: -400, y: 240 },
    { id: "n2", type: "note", x: 320, y: 900 }, // à droite : hors de l'établi, ne compte pas
  ],
};

let recues = [];
const serveur = http.createServer((req, res) => {
  let corps = "";
  req.on("data", (d) => (corps += d));
  req.on("end", () => {
    const chemin = req.url.replace("/api/v1", "");
    recues.push({ methode: req.method, chemin, corps: corps ? JSON.parse(corps) : null });
    const rendre = (objet, code = 200) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(objet));
    };
    let m;
    if (req.method === "GET" && (m = /^\/planches\/(\w+)$/.exec(chemin))) return rendre({ planche: planches[m[1]] });
    if (req.method === "GET" && (m = /^\/projects\/(\w+)\/nodes/.exec(chemin))) return rendre({ nodes: toiles[m[1]], edges: [] });
    if (req.method === "POST" && /\/generations$/.test(chemin)) return rendre({ generationId: "g1", status: "running" }, 202);
    if (req.method === "POST" && /\/scenario$/.test(chemin)) return rendre({ nodeIds: [], edgeIds: [] }, 201);
    if (req.method === "POST" && /\/jobs$/.test(chemin)) return rendre({ jobId: null, devis: {} });
    rendre({ error: { message: "route inconnue du faux atelier" } }, 404);
  });
});
await new Promise((r) => serveur.listen(0, "127.0.0.1", r));
writeFileSync(
  join(maison, ".hyperbd", "acces.json"),
  JSON.stringify({ url: `http://127.0.0.1:${serveur.address().port}`, token: "sek_faux" }),
);

function lancer(args) {
  recues = [];
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [STUDIO, ...args], {
      env: { ...process.env, USERPROFILE: maison, HOME: maison },
    });
    let sortie = "";
    p.stdout.on("data", (d) => (sortie += d));
    p.stderr.on("data", (d) => (sortie += d));
    p.on("close", (code) => resolve({ code, sortie, recues: [...recues] }));
  });
}

let echecs = 0;
const ok = (b, quoi, detail = "") => {
  if (!b) echecs++;
  console.log(`${b ? "  ok  " : " ÉCHEC"} ${quoi}${detail ? ` : ${detail}` : ""}`);
};
const lot = (nodes, extra = {}) => {
  const f = join(maison, `lot-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(f, JSON.stringify({ nodes, ...extra }));
  return f;
};
const postes = (r, motif) => r.recues.filter((x) => x.methode === "POST" && motif.test(x.chemin));

// ── La couverture ──────────────────────────────────────────────────────────
let r = await lancer(["generate", "couv", "--quality", "high", "--mode", "planche"]);
ok(r.code === 0 && postes(r, /generations$/).length === 1, "une couverture sans cases mais décrite se génère", `code ${r.code}`);
ok(postes(r, /generations$/)[0]?.corps.dialogueMode === "overlay", "le lettrage posé est toujours demandé");

r = await lancer(["generate", "quatrieme", "--mode", "planche"]);
ok(r.code === 0 && postes(r, /generations$/).length === 1, "une quatrième sans cases mais décrite se génère");

r = await lancer(["generate", "couvVide", "--mode", "planche"]);
ok(r.code === 1 && postes(r, /generations$/).length === 0, "une couverture ni décrite ni découpée est refusée avant toute dépense", r.sortie.trim().slice(0, 90));

r = await lancer(["generate", "vide", "--mode", "planche"]);
ok(r.code === 1 && postes(r, /generations$/).length === 0, "une planche du récit sans cases reste refusée", r.sortie.trim().slice(0, 70));

r = await lancer(["generate", "pleine", "--mode", "planche", "--dialogue-mode", "model"]);
ok(r.code === 0 && postes(r, /generations$/)[0]?.corps.dialogueMode === "overlay", "l'ancienne option --dialogue-mode n'a plus d'effet");

// ── Le rangement des lots ──────────────────────────────────────────────────
const notes = (n) => Array.from({ length: n }, (_, i) => ({ type: "note", title: `Piste ${i + 1}` }));

r = await lancer(["scenario", "vide", "--file", lot(notes(6))]);
let poses = postes(r, /scenario$/)[0]?.corps.nodes ?? [];
ok(poses.length === 6 && poses.every((n) => n.x < -200), "Toile vide : les six notes sont à gauche du récit", poses.map((n) => `${n.x},${n.y}`).join(" "));
ok(new Set(poses.map((n) => `${n.x},${n.y}`)).size === 6, "aucune note n'est posée sur une autre");
ok(poses[0].y === 0 && poses[4].y === 240, "quatre par rangée, la cinquième à la rangée suivante");

r = await lancer(["scenario", "occupee", "--file", lot([...notes(2), { type: "scene", title: "S" }, { type: "acte", title: "C" }])]);
poses = postes(r, /scenario$/)[0]?.corps.nodes ?? [];
const libres = poses.filter((n) => n.type === "note");
ok(libres.every((n) => n.y >= 240 + 320 + 160), "établi occupé : le lot se pose sous le bloc le plus bas, avec un vide", libres.map((n) => `${n.x},${n.y}`).join(" "));
ok(poses.filter((n) => n.type !== "note").every((n) => n.x === 0 && n.y === 0), "une scène et un chapitre sans position se posent à l'origine");

r = await lancer(["scenario", "recit", "--file", lot([{ type: "image", title: "Essai" }, ...notes(4)])]);
poses = postes(r, /scenario$/)[0]?.corps.nodes ?? [];
ok(poses[0].y === 0 && poses[4].y === 380, "un lot qui porte une image prend des rangées plus hautes", poses.map((n) => `${n.x},${n.y}`).join(" "));

r = await lancer(["scenario", "occupee", "--file", lot([{ type: "note", title: "Placée", x: 50, y: 60 }, ...notes(1)])]);
poses = postes(r, /scenario$/)[0]?.corps.nodes ?? [];
ok(poses[0].x === 50 && poses[0].y === 60 && poses[1].x < 0, "un bloc déjà placé garde sa place, l'autre est rangé");

r = await lancer(["scenario", "occupee", "--file", lot(notes(2), { ancre: { x: 500, y: 500 } })]);
const envoye = postes(r, /scenario$/)[0]?.corps;
ok(envoye?.ancre?.x === 500 && envoye.nodes.every((n) => n.x === undefined), "un lot qui donne son ancre est transmis tel quel");
ok(r.recues.filter((x) => x.methode === "GET").length === 0, "et la Toile n'est pas relue pour rien");

// ── Le master ──────────────────────────────────────────────────────────────
r = await lancer(["export", "vide", "--kind", "master", "--sans-pages-de-garde", "--rgb"]);
const params = postes(r, /jobs$/)[0]?.corps.params ?? {};
ok(!("pagesDeGarde" in params) && params.cmyk === false, "le master n'envoie plus le champ que l'atelier refuse", JSON.stringify(params));

serveur.close();
rmSync(maison, { recursive: true, force: true });
console.log(`\n${echecs === 0 ? "ESSAI DU CLIENT : tout passe." : `ESSAI DU CLIENT : ${echecs} échec(s).`}`);
process.exitCode = echecs ? 1 : 0;
