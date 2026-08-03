---
name: bd-connect
description: Relie Claude Code à l'atelier du Studio Entremondes (app.studio-entremondes.fr) pour qu'il puisse y travailler : enregistre un jeton d'API, vérifie l'accès, et fait le point sur les trois clés (OpenAI pour générer, Cloudflare R2 pour stocker, Topaz pour agrandir). Utiliser quand la personne dit « connecte-toi à l'atelier », « /bd-connect », « relie mon compte », ou quand une autre skill HyperBD constate qu'aucun accès n'est enregistré.
argument-hint: "[--url <adresse de l'atelier>]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Relier l'atelier

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français). Cela vaut pour tout : questions, avancement, confirmations, résumés, erreurs.
- Parle un langage simple et concret. N'expose jamais de nom de script (`*.mjs`), de chemin interne ou de jargon : décris ce que tu fais en clair.
- Montre l'avancement sous forme d'une courte liste à cocher.

Tu relies Claude Code à l'atelier où vivent les projets de bande dessinée. Sans ce lien, tu peux écrire un scénario mais rien produire.

## Étape 0 : y a-t-il déjà un accès ?

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" me
```

- **Ça répond avec un compte** : l'accès existe déjà. Affiche à qui il appartient et l'état des trois clés, puis propose : garder tel quel, ou relier un autre compte. Si la personne garde, tu as fini.
- **Ça répond une erreur** : continue à l'étape 1.

## Étape 1 : obtenir un jeton

Le jeton est ce qui te permet d'agir au nom de la personne. Il se crée dans son espace, page **Mon compte**, section **Jetons d'API**, et n'est affiché **qu'une fois**.

Dis-lui, dans ces termes (adapte l'adresse si `--url` est fourni) :

> Pour que je puisse travailler dans l'atelier, il me faut un jeton d'accès.
>
> 1. Ouvre **https://app.studio-entremondes.fr/compte**
> 2. Dans **Jetons d'API**, crée un jeton (nomme-le par exemple « Claude Code »)
> 3. Copie-le et colle-le ici : il ne sera plus affiché ensuite

Attends le jeton. Il commence par `sek_`.

## Étape 2 : enregistrer et vérifier

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" connect --url "<adresse>" --token "<jeton>"
```

L'adresse par défaut est `https://app.studio-entremondes.fr`. Le jeton est vérifié **avant** d'être enregistré : ce qui est gardé fonctionne forcément.

En cas de refus, dis-le simplement et propose de recommencer : le plus souvent, le jeton a été tronqué à la copie.

## Étape 3 : faire le point sur les clés

La réponse indique quelles clés sont en place. Chacune sert à autre chose, et l'atelier ne dépense jamais rien à la place de la personne :

| Clé | À quoi elle sert | Sans elle |
|---|---|---|
| OpenAI | dessiner les planches | rien ne peut être généré |
| Cloudflare R2 | ranger les images produites | rien ne peut être généré non plus |
| Topaz | agrandir les images avant impression | tout marche, sauf l'agrandissement final |

Présente l'état en clair (« Tout est en place » ou « Il manque la clé Topaz, ce n'est pas bloquant pour l'instant »). Les clés se renseignent dans **Mon compte**, chacune avec sa marche à suivre : n'essaie jamais de les saisir toi-même, et ne demande jamais leur valeur dans la conversation.

## Étape 4 : montrer ce qui est accessible

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" projects
```

Présente les projets sous forme de courte liste (titre, nombre de planches). S'il n'y en a aucun, dis qu'on peut en créer un au moment de démarrer une bande dessinée.

Termine par : `🎉 ATELIER RELIÉ`, suivi d'une phrase sur ce qui est possible maintenant.

## Règles

- Le jeton ne doit **jamais** être écrit dans un fichier du projet, ni dans un message récapitulatif, ni dans un commit. Il vit dans le dossier personnel de la personne, et lui seul.
- Ne demande jamais un mot de passe : le jeton suffit, et c'est justement son rôle.
- Un jeton perdu ne se retrouve pas : on en crée un nouveau et on révoque l'ancien.
- Si la personne veut couper l'accès, dis-lui de révoquer le jeton dans **Mon compte** : c'est immédiat.
