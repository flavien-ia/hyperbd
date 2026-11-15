---
name: update-hyperbd
description: Met le plugin HyperBD à jour vers la dernière version publiée. Lit d'abord comment il a été installé : suivi par Claude Code (marketplace), la mise à jour lui appartient et on indique la commande ; téléversé à la main dans Claude Desktop, on télécharge, on vérifie l'empreinte, on remplace. Utiliser quand la personne dit « /update-hyperbd », « mets à jour HyperBD », « y a-t-il une nouvelle version ? », ou demande si son plugin est à jour.
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

**Le téléchargement se vérifie tout seul.** Le script calcule l'empreinte de ce qu'il a reçu et la fait confirmer par la release GitHub de cette version (l'empreinte que GitHub calcule sur l'archive, et celle des notes de la release), en plus de celle que l'atelier publie. Il ne te tend une archive que si GitHub confirme et qu'aucune source ne dit autre chose ; alors `sha256Verified` vaut `true`. Sinon, il rend `ok: false` avec l'une de ces deux raisons :

- `reason: "sha256-mismatch"` : le téléchargement ne correspond pas à ce qui a été publié, ou les sources publiées ne s'accordent pas. **Arrête-toi** : dis-le, dis que rien n'a été installé, et que la personne peut comparer elle-même l'empreinte sur la release GitHub. Pas de nouvel essai à l'aveugle, pas d'installation quand même.
- `reason: "sha256-unverifiable"` : GitHub n'a pas pu confirmer (injoignable, ou aucune empreinte publiée pour cette version). **Arrête-toi aussi** : dis à la personne que l'archive n'a pas pu être vérifiée, que rien n'a été installé, et transmets le `message` (réessayer plus tard, ou comparer à la main l'empreinte indiquée à celle de la release sur GitHub). N'installe jamais une archive non vérifiée, même si on te le demande au passage : ce n'est pas une option du script.

⚠️ **Compare `version` avec la `publishedVersion` de l'étape 1.** Si elles diffèrent (une release entre les deux appels, un cache en retard), dis-le et propose de réessayer plus tard plutôt que d'installer une version que la personne n'a pas acceptée. **STOP** sur tout échec, en transmettant le `message`.

## Étape 3 : installer

```bash
node "$PLUGIN_DIR/scripts/update/update-hyperbd.mjs" install --zip "<file de l'étape 2>"
```

Le script refait la vérification d'empreinte sur le fichier lui-même (même règle qu'à l'étape 2 : sur un refus, mêmes consignes, rien n'est installé), déballe l'archive dans un dossier temporaire sous un plafond de taille, contrôle chaque fichier (CRC-32) et vérifie qu'elle contient un plugin complet **avant** de toucher à l'installation en place. Alors seulement il écarte le dossier actuel le temps de l'échange et met le nouveau à sa place. Si quoi que ce soit échoue, la version précédente est remise d'elle-même.

- `ok: true` : le JSON donne `version`, `oldVersion`, `backup`, `backupKept` et `desktop`. Garde `backupKept` et `desktop` pour l'étape 4, et passe à l'étape 4.
- `ok: false` : rien n'a été remplacé, ou la version précédente a été remise. Rapporte le `message` tel quel. **STOP.**

## Étape 4 : conclure

> **Mise à jour installée (version `<version>`).**
>
> Ferme et rouvre Claude Code pour qu'il charge la nouvelle version.

Ensuite, selon le JSON de l'étape 3 :

- `backupKept: true` : ajoute « L'ancienne version est gardée de côté (`hyperbd-backup-<ancienne version>`) : quand tu auras vérifié que tout marche, tu peux me demander de la supprimer. » Si un dossier `hyperbd-backup-*` d'une mise à jour **antérieure** traîne encore et que le plugin en place fonctionne, propose de le supprimer aussi.
- `backupKept: false` : **ne promets jamais de sauvegarde.** Le plugin ne vit pas dans un dossier de marketplace (sous Claude Desktop, le registre des plugins téléversés efface en quelques minutes tout dossier qu'il ne connaît pas, la sauvegarde comprise). Elle n'a servi qu'à revenir en arrière si l'échange avait échoué. N'en parle pas, sauf si on te le demande : alors dis exactement cela.
- `desktop: true` : ajoute une phrase : « Claude Desktop continuera d'afficher l'ancien numéro dans son écran Plugins, c'est normal : la version qui tourne est la `<version>`. » (Desktop montre la version du téléversement, jamais celle du disque.)
