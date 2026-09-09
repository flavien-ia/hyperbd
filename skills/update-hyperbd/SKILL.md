---
name: update-hyperbd
description: Met le plugin HyperBD à jour vers la dernière version publiée. Lit d'abord comment il a été installé : suivi par Claude Code (marketplace), la mise à jour lui appartient et on indique la commande ; téléversé à la main dans Claude Desktop, on télécharge, on vérifie l'empreinte, on remplace en gardant l'ancienne version de côté. Utiliser quand la personne dit « /update-hyperbd », « mets à jour HyperBD », « y a-t-il une nouvelle version ? », ou demande si son plugin est à jour.
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js 18 ou plus. Ni compte ni clé : le plugin est open source, la version publiée se lit sur l'atelier et l'archive se télécharge sans jeton."
---

# Mettre HyperBD à jour

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de chemin interne : « je vérifie s'il existe une version plus récente », « je remplace les fichiers du plugin », jamais « je dézippe ».
- Montre l'avancement sous forme d'une courte liste à cocher.

HyperBD s'installe de deux façons, et une seule des deux a besoin de toi :

- **Suivi par Claude Code** (`/plugin marketplace add flavien-ia/hyperbd`, ou un dossier déclaré comme marketplace) : Claude Code tient le dépôt et met le plugin à jour lui-même. Remplacer ses fichiers dans son dos le mettrait en désaccord avec son registre. Tu indiques la commande et tu t'arrêtes.
- **Téléversé à la main** (l'archive de la page de documentation, déposée dans Claude Desktop) : personne ne prévient qu'une version est sortie. C'est le cas pour lequel cette skill existe.

Le mode se lit dans le registre de Claude Code, jamais deviné.

## Étape 1 : vérifier

```bash
PLUGIN_DIR="${CLAUDE_SKILL_DIR}/../.."
node "$PLUGIN_DIR/scripts/update/update-hyperbd.mjs" check
```

Lis le JSON :

- `offline: true` : « Je n'arrive pas à joindre l'atelier pour l'instant, réessaie un peu plus tard. » **STOP.**
- `mode: "marketplace"` : la mise à jour appartient à Claude Code. Donne les deux versions, puis la commande de `commandeNative`, en précisant qu'elle se tape dans Claude Code. **STOP** (rien à télécharger).
- `updateAvailable: false` : « Ton plugin est déjà à jour (version `localVersion`). » **STOP.**
- `updateAvailable: true` et `mode: "manuel"` : annonce « Une nouvelle version est disponible : `publishedVersion` (tu as la `localVersion`). Je la télécharge et je l'installe ? » Attends le oui.

## Étape 2 : télécharger

```bash
node "$PLUGIN_DIR/scripts/update/update-hyperbd.mjs" download
```

Le JSON donne `file` (l'archive, dans `~/.hyperbd/updates/`), `version`, `files`, `sha256` et `sha256Verified`.

**Le téléchargement se vérifie tout seul.** Le script compare l'empreinte de ce qu'il a reçu à celle que l'atelier publie pour cette version, et rend `ok: false, reason: "sha256-mismatch"` plutôt que de te tendre une archive à installer. Dans ce cas, **arrête-toi** : dis que le téléchargement ne correspond pas à ce qui a été publié, que rien n'a été installé, et que la même empreinte figure sur la release GitHub si la personne veut vérifier elle-même. Pas de nouvel essai à l'aveugle, pas d'installation quand même.

`sha256Verified: false` veut dire qu'aucune empreinte n'était publiée pour cette version (ou que l'atelier n'a pas répondu à cette seconde question). Ce n'est pas une erreur : continue, sans en parler.

⚠️ **Compare `version` avec la `publishedVersion` de l'étape 1.** Si elles diffèrent (une release entre les deux appels, un cache en retard), dis-le et propose de réessayer plus tard plutôt que d'installer une version que la personne n'a pas acceptée. **STOP** sur tout échec, en transmettant le `message`.

## Étape 3 : installer

```bash
node "$PLUGIN_DIR/scripts/update/update-hyperbd.mjs" install --zip "<file de l'étape 2>"
```

Le script déballe l'archive dans un dossier temporaire et vérifie qu'elle contient un plugin complet **avant** de toucher à l'installation en place. Alors seulement il écarte le dossier actuel en sauvegarde et met le nouveau à sa place. Si quoi que ce soit échoue, la version précédente est remise d'elle-même.

- `ok: true` : le JSON donne `version`, `oldVersion` et `backup`. Passe à l'étape 4.
- `ok: false` : rien n'a été remplacé, ou la version précédente a été remise. Rapporte le `message` tel quel. **STOP.**

## Étape 4 : conclure

> **Mise à jour installée (version `<version>`).**
>
> Ferme et rouvre Claude Code pour qu'il charge la nouvelle version. L'ancienne est gardée de côté (`hyperbd-backup-<ancienne version>`) : quand tu auras vérifié que tout marche, tu peux me demander de la supprimer.

Si un dossier `hyperbd-backup-*` d'une mise à jour **antérieure** traîne encore et que le plugin en place fonctionne, propose de le supprimer aussi.
