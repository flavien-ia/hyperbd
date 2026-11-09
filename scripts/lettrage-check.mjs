#!/usr/bin/env node
// Le contrôle mécanique d'un placement de bulles.
//
//   node lettrage-check.mjs <plancheId> [--largeur-mm 420]
//
// Ce que l'œil d'un agent rate, et qu'un calcul voit : une bulle qui déborde
// de la case de sa réplique, qui mord sur la reliure, qui en chevauche une
// autre, deux bulles d'une même case lues dans le mauvais ordre, une queue qui
// pointe hors de la case ou dans sa propre bulle, un texte trop petit pour
// l'impression. Il ne dit pas si une bulle couvre un visage ni si sa queue
// vise la bonne bouche : ça, c'est le rendu avec repères et le juge qui le
// disent. Il rend la liste des problèmes, bulle par bulle, avec les numéros du
// rendu avec repères (`rendu --repere`), et sort en 1 s'il y en a.
//
// Sans dépendance : il lit la planche et son lettrage par l'atelier, comme le
// reste du harnais.

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const STUDIO = join(ICI, "studio.mjs");

const args = process.argv.slice(2);
const plancheId = args.find((a) => !a.startsWith("--"));
const opt = (nom, defaut) => {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
if (!plancheId) {
  console.error("Usage : lettrage-check.mjs <plancheId> [--largeur-mm 420]");
  process.exit(2);
}
const largeurMm = Number(opt("largeur-mm", "420"));

const lire = (...a) => JSON.parse(execFileSync("node", [STUDIO, ...a]).toString());
const { planche } = lire("planche", plancheId);
const { lettrage } = lire("lettrage", plancheId);

const modules = planche?.scriptModules;
const cases = modules?.cases ?? [];
const pageSeule = Boolean(modules?.pageSeule);
// Le rapport largeur / hauteur de l'image : une double page de l'atelier, ou
// une page seule.
const tailleImage = String(planche?.draft?.size ?? (pageSeule ? "1088x1536" : "1536x1088"));
const [iw, ih] = tailleImage.split("x").map(Number);
const ratio = iw && ih ? iw / ih : pageSeule ? 0.708 : 1.412;

/** La boîte d'une bulle, en fractions de l'image, estimée d'après son texte. */
function boite(b) {
  const fs = b.fontSize ?? 0.00495;
  const w = b.w ?? 0.18;
  const pad = b.pad ?? 1;
  const utile = Math.max(w - fs * 1.9 * pad - fs * 0.3, fs * 4);
  const largeurTexte = (b.text ?? "").length * fs * 0.56;
  const lignes = Math.max(1, Math.ceil(largeurTexte / utile));
  const hauteur = (lignes * fs * 1.25 + fs * 1.7 * pad) * ratio;
  const h = b.h ? Math.max(b.h, hauteur) : hauteur;
  return { x0: b.x - w / 2, x1: b.x + w / 2, y0: b.y - h / 2, y1: b.y + h / 2, lignes };
}

/** La case qui porte une réplique : celle dont le script contient sa ligne. */
function caseDe(b) {
  const raw = (b.raw ?? "").trim();
  return cases.find((c) =>
    (c.script ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .includes(raw),
  );
}

const dans = (p, l, marge = 0) =>
  p.x >= l.x + marge && p.x <= l.x + l.w - marge && p.y >= l.y + marge && p.y <= l.y + l.h - marge;
const chevauche = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const bulles = (lettrage?.bulles ?? []).filter((b) => b.kind === "bulle" || b.kind === undefined);
const problemes = [];
const dire = (n, quoi, faire) => problemes.push({ bulle: n, quoi, faire });

const boites = bulles.map(boite);
bulles.forEach((b, i) => {
  const n = i + 1;
  const bx = boites[i];
  const c = caseDe(b);
  const l = c?.layout;
  if (!c) {
    dire(n, `réplique introuvable dans les cases : « ${b.raw} »`, "vérifier le script de la planche");
  } else if (!l) {
    dire(n, `la case ${c.id} n'a pas d'emplacement`, "poser le gabarit (layout) de la planche");
  } else {
    const M = 0.006;
    if (bx.x0 < l.x + M || bx.x1 > l.x + l.w - M || bx.y0 < l.y + M || bx.y1 > l.y + l.h - M) {
      dire(
        n,
        `déborde de sa case ${c.id} (bulle x ${bx.x0.toFixed(3)}..${bx.x1.toFixed(3)}, y ${bx.y0.toFixed(3)}..${bx.y1.toFixed(3)} ; case x ${l.x.toFixed(3)}..${(l.x + l.w).toFixed(3)}, y ${l.y.toFixed(3)}..${(l.y + l.h).toFixed(3)})`,
        "la rentrer dans sa case, ou réduire sa largeur",
      );
    }
    if (!pageSeule && c.page !== "both" && bx.x0 < 0.515 && bx.x1 > 0.485) {
      dire(n, "mord sur la reliure", "la décaler hors de la bande centrale (x entre 0,485 et 0,515)");
    }
    if (!b.tail) {
      dire(n, "n'a pas de queue", "lui donner une queue qui pointe la bouche du locuteur");
    } else {
      const t = b.tail;
      if (!dans(t, l)) dire(n, `sa queue sort de la case ${c.id}`, "pointer la bouche du locuteur dans la case, ou le bord d'où il parle s'il est hors champ");
      if (t.x >= bx.x0 && t.x <= bx.x1 && t.y >= bx.y0 && t.y <= bx.y1) {
        dire(n, "sa queue pointe dans sa propre bulle", "écarter la pointe vers la bouche du locuteur");
      }
      // Ce qui dépasse de la bulle, en fraction de la largeur de l'image :
      // la distance de la pointe au bord de l'ellipse, dans sa direction.
      const dx = t.x - b.x;
      const dy = (t.y - b.y) / ratio;
      const d = Math.hypot(dx, dy);
      const a = (bx.x1 - bx.x0) / 2;
      const bb = (bx.y1 - bx.y0) / 2 / ratio;
      const r = d > 0 ? 1 / Math.sqrt((dx / d) ** 2 / a ** 2 + (dy / d) ** 2 / bb ** 2) : 0;
      const depasse = d - r;
      if (depasse > 0.035) {
        dire(n, `queue trop longue (${depasse.toFixed(3)} de la largeur hors de la bulle)`, "rapprocher la BULLE de son locuteur : la queue dépasse de 0,012 à 0,03, elle désigne sans traverser la case");
      } else if (depasse < 0.008 && d > r) {
        dire(n, "queue à peine visible", "écarter un peu la pointe vers le locuteur");
      }
    }
  }
  const mm = (b.fontSize ?? 0.00495) * largeurMm;
  if (mm < 1.8) dire(n, `texte de ${mm.toFixed(2)} mm à l'impression`, "agrandir le corps (fontSize) : 2 mm au moins");
});

// Chevauchements, et ordre de lecture dans une même case.
for (let i = 0; i < bulles.length; i++) {
  for (let j = i + 1; j < bulles.length; j++) {
    if (chevauche(boites[i], boites[j])) dire(i + 1, `chevauche la bulle ${j + 1}`, "les écarter");
    const ci = caseDe(bulles[i]);
    const cj = caseDe(bulles[j]);
    if (ci && ci === cj) {
      const avant = bulles[i].y < bulles[j].y - 0.02 || (Math.abs(bulles[i].y - bulles[j].y) <= 0.02 && bulles[i].x <= bulles[j].x);
      if (!avant) dire(j + 1, `se lit avant la bulle ${i + 1} alors qu'elle la suit dans le script`, "la poser plus bas ou plus à droite que la précédente");
    }
  }
}

const sortie = {
  planche: planche?.title,
  bulles: bulles.map((b, i) => ({
    n: i + 1,
    locuteur: b.name,
    case: caseDe(b)?.id ?? null,
    x: b.x,
    y: b.y,
    w: b.w,
    lignes: boites[i].lignes,
    queue: b.tail ?? null,
  })),
  problemes,
  verdict: problemes.length ? "A_CORRIGER" : "OK",
};
console.log(JSON.stringify(sortie, null, 2));
process.exit(problemes.length ? 1 : 0);
