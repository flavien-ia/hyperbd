#!/usr/bin/env node
// signature.mjs : vérifie qu'une archive d'HyperBD a bien été signée par la clé de
// publication, celle que porte la version DÉJÀ INSTALLÉE (le fichier `allowed_signers`
// voisin de ce script). L'empreinte SHA-256 prouve que l'archive est celle que GitHub
// publie ; la signature prouve qu'elle vient de qui tient la clé privée, même si
// quelqu'un d'autre tenait à la fois l'atelier et le compte GitHub.
//
// La vérification est confiée à `ssh-keygen -Y verify` (OpenSSH 8.1 et plus, livré avec
// macOS, Linux et Windows 10 et 11), l'archive passant sur son entrée standard.
//
//   node scripts/update/signature.mjs verifier --zip FICHIER [--sig FICHIER.sig]
//
// Sortie (stdout) : un objet JSON. Codes : 0 = signature bonne, 1 = refus.
// Utilisé par update-hyperbd.mjs (download, install) et par la release, qui vérifie la
// signature qu'elle vient de produire avant de la publier.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Le nom sous lequel la clé est déclarée dans `allowed_signers`. */
export const PRINCIPAL = "hyperbd-release";
/** L'espace de noms de la signature : `file`, distinct de `git` (commits et tags). */
export const ESPACE = "file";
/** La clé de la version installée : celle qui tourne, jamais celle de l'archive reçue. */
export const FICHIER_SIGNATAIRES = path.join(path.dirname(fileURLToPath(import.meta.url)), "allowed_signers");
/** Une signature SSH tient en quelques centaines d'octets. */
export const TAILLE_MAX_SIGNATURE = 16 * 1024;

const AIDE_SSH_KEYGEN =
  "Windows 10 et 11 : Paramètres, Système, Fonctionnalités facultatives, ajouter « Client OpenSSH » (ou, dans PowerShell en administrateur : Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0). macOS : il est livré avec le système. Linux : installer le paquet openssh-client (ou openssh) de la distribution. Puis relancer la mise à jour.";

/** Les endroits où chercher ssh-keygen, du plus sûr au plus large. */
function candidats() {
  if (process.platform === "win32") {
    const racine = process.env.SystemRoot || process.env.windir || "C:\\Windows";
    return [
      path.join(racine, "System32", "OpenSSH", "ssh-keygen.exe"),
      // Un Node 32 bits sur un Windows 64 bits voit System32 redirigé : Sysnative le contourne.
      path.join(racine, "Sysnative", "OpenSSH", "ssh-keygen.exe"),
      "ssh-keygen",
    ];
  }
  return ["/usr/bin/ssh-keygen", "/usr/local/bin/ssh-keygen", "/opt/homebrew/bin/ssh-keygen", "ssh-keygen"];
}

/** Le chemin de ssh-keygen, ou null s'il n'y en a pas sur cette machine. */
export function trouverSshKeygen() {
  for (const c of candidats()) {
    if (path.isAbsolute(c)) {
      if (existsSync(c)) return c;
      continue;
    }
    // Par le PATH : on le lance pour de bon, sans rien lui faire faire.
    const r = spawnSync(c, ["-?"], { stdio: "ignore", windowsHide: true });
    if (!r.error) return c;
  }
  return null;
}

function refus(reason, message, detail) {
  return { ok: false, reason, message, ...(detail ? { detail } : {}) };
}

/**
 * Vérifie `octets` (l'archive) contre `signature` (le texte du fichier .sig).
 * Rend { ok: true, signer, keygen } ou un refus { ok: false, reason, message }.
 * `options.signataires` et `options.sshKeygen` ne servent qu'aux recettes : l'outil
 * de mise à jour ne les passe jamais, il prend toujours la clé installée.
 */
export function verifierSignature(octets, signature, options = {}) {
  const signataires = options.signataires ?? FICHIER_SIGNATAIRES;
  const keygen = "sshKeygen" in options ? options.sshKeygen : trouverSshKeygen();

  if (signature === null || signature === undefined || String(signature).trim() === "") {
    return refus(
      "signature-missing",
      "Aucune signature n'accompagne cette archive. Rien n'a été installé. Chaque release d'HyperBD publie, à côté de l'archive, un fichier hyperbd-vX.Y.Z.zip.sig qui prouve qu'elle vient de son auteur : sans lui, on ne peut pas le savoir. Réessayer plus tard (la publication est peut-être en cours) ; si le fichier manque toujours sur la release GitHub, ne pas installer l'archive et écrire à contact@studio-entremondes.fr.",
    );
  }
  const texte = String(signature);
  if (texte.length > TAILLE_MAX_SIGNATURE || !/-----BEGIN SSH SIGNATURE-----[\s\S]+-----END SSH SIGNATURE-----/.test(texte)) {
    return refus(
      "signature-invalid",
      "Le fichier de signature publié n'est pas une signature SSH lisible. Rien n'a été installé. Ne pas installer cette archive à la main ; écrire à contact@studio-entremondes.fr.",
    );
  }
  if (!existsSync(signataires)) {
    return refus(
      "signature-key-missing",
      "La clé publique qui sert à vérifier les mises à jour manque dans la version installée d'HyperBD. Rien n'a été installé. Réinstaller le plugin depuis la page de téléchargement de l'atelier, en vérifiant l'archive à la main comme l'explique le fichier SECURITY.md du plugin.",
    );
  }
  if (!keygen) {
    return refus(
      "ssh-keygen-missing",
      `Pour vérifier la signature de la mise à jour, il faut l'outil ssh-keygen (OpenSSH), introuvable sur cet ordinateur. Rien n'a été installé. ${AIDE_SSH_KEYGEN}`,
    );
  }

  // Un dossier jetable pour la signature, et une copie de la clé sans retours chariot :
  // sous Windows, git peut avoir déposé le fichier en CRLF.
  const boite = mkdtempSync(path.join(tmpdir(), "hyperbd-signature-"));
  try {
    const fSig = path.join(boite, "archive.zip.sig");
    const fCle = path.join(boite, "allowed_signers");
    writeFileSync(fSig, texte.replace(/\r\n/g, "\n"));
    writeFileSync(fCle, readFileSync(signataires, "utf8").replace(/\r\n/g, "\n"));
    const r = spawnSync(keygen, ["-Y", "verify", "-f", fCle, "-I", PRINCIPAL, "-n", ESPACE, "-s", fSig], {
      input: octets,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    if (r.error) {
      if (r.error.code === "ENOENT") {
        return refus(
          "ssh-keygen-missing",
          `Pour vérifier la signature de la mise à jour, il faut l'outil ssh-keygen (OpenSSH), introuvable sur cet ordinateur. Rien n'a été installé. ${AIDE_SSH_KEYGEN}`,
        );
      }
      return refus("signature-invalid", `La vérification de la signature n'a pas pu se faire (${r.error.message}). Rien n'a été installé. Réessayer ; si cela recommence, écrire à contact@studio-entremondes.fr.`);
    }
    const sortie = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
    if (r.status === 0 && sortie.includes(`Good "${ESPACE}" signature for ${PRINCIPAL}`)) {
      return { ok: true, signer: PRINCIPAL, keygen, detail: sortie };
    }
    // Un OpenSSH d'avant la 8.1 ne connaît pas -Y : il affiche son aide.
    if (/illegal option|unknown option|usage:/i.test(sortie)) {
      return refus(
        "ssh-keygen-too-old",
        `L'outil ssh-keygen de cet ordinateur est trop ancien pour vérifier une signature (il faut OpenSSH 8.1 ou plus). Rien n'a été installé. Mettre OpenSSH à jour, puis relancer la mise à jour. ${AIDE_SSH_KEYGEN}`,
        sortie.slice(0, 300),
      );
    }
    return refus(
      "signature-invalid",
      "La signature ne correspond pas à cette archive, ou n'a pas été faite par la clé de publication d'HyperBD. Rien n'a été installé. Ne pas installer cette archive à la main, même si son empreinte semble bonne ; écrire à contact@studio-entremondes.fr.",
      sortie.slice(0, 300),
    );
  } finally {
    rmSync(boite, { recursive: true, force: true });
  }
}

// ── Appelé directement : vérifier une archive posée sur le disque ───────────
const appeleDirectement = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (appeleDirectement) {
  const args = process.argv.slice(2);
  const arg = (nom) => {
    const i = args.indexOf(nom);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : null;
  };
  const rendre = (objet, code) => {
    process.stdout.write(JSON.stringify(objet, null, 2) + "\n");
    process.exitCode = code;
  };
  const zip = arg("--zip");
  if (args[0] !== "verifier" || !zip || !existsSync(zip)) {
    rendre({ ok: false, message: "Usage : node signature.mjs verifier --zip FICHIER [--sig FICHIER.sig]" }, 1);
  } else {
    const fSig = arg("--sig") ?? `${zip}.sig`;
    const sig = existsSync(fSig) ? readFileSync(fSig, "utf8") : null;
    const res = verifierSignature(readFileSync(zip), sig);
    rendre({ ...res, zip: path.resolve(zip), sig: existsSync(fSig) ? path.resolve(fSig) : null }, res.ok ? 0 : 1);
  }
}
