---
name: new-bd
description: Commence une nouvelle bande dessinée : crée le projet dans l'atelier (un titre de travail, un univers neuf ou réutilisé), puis enchaîne sur le brief (/bd-brief) sans que la personne ait à retaper quoi que ce soit. C'est la commande à taper quand on a une idée ou un document et qu'on veut en faire un album. Utiliser quand la personne dit « /new-bd », « nouvelle BD », « on commence une BD », « je veux faire une BD sur… », « nouveau projet ».
argument-hint: "[titre de travail] [--source <chemin d'un document>] [--univers <id>]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et un accès à l'atelier (/bd-start)."
---

# Une nouvelle bande dessinée

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher, et dis où l'on va : le projet, puis le brief, puis les quatre temps.

Une phrase suffit pour commencer. À la fin de cette skill, le projet existe dans l'atelier, ouvert dans le navigateur si la personne le veut, et le brief a commencé.

## Étape 0 : l'atelier répond ?

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" me
```

En cas d'erreur : « Il faut d'abord relier l'atelier : tape `/bd-start`, il prépare tout. » Et arrête-toi là.

Si la réponse dit qu'OpenAI ou R2 manquent, continue quand même (le scénario s'écrit sans image), mais dis-le en une phrase : rien ne pourra être dessiné tant que ces deux clés ne sont pas dans Mon compte.

## Étape 1 : le titre de travail

- S'il est donné en argument, prends-le.
- Sinon, pose UNE question : « Quel titre de travail ? Il se changera dans l'atelier à tout moment. » Si la personne n'a qu'une idée ou un document, propose-lui un titre tiré de ce qu'elle dit, et attends son accord.

## Étape 2 : l'univers

Un univers, c'est la bibliothèque du projet : personnages, décors, images de référence, planches de style, police. Il se réutilise d'un projet à l'autre (un tome 2 partage l'univers du tome 1).

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" projects
```

- **Aucun projet** : un univers neuf sera créé avec le projet, rien à demander.
- **Des projets existent** : liste les univers distincts qu'ils portent (`universeName`, avec le titre du projet qui l'utilise) et demande, en une question : « Un univers neuf, ou réutiliser celui de <projet> ? » Réutiliser n'a de sens que pour une suite ou un spin-off ; en cas de doute, recommande l'univers neuf.

`--univers <id>` en argument saute la question.

## Étape 3 : créer le projet

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" new-project --title "<titre de travail>"
```

Avec `--universe <id>` si un univers existant a été choisi. La réponse donne `project.slug` et `project.id`.

Dis que le projet existe, et donne son adresse : `https://app.studio-entremondes.fr/projet/<slug>?vue=scenario` (la Toile, vide pour l'instant : le brief va la peupler).

## Étape 4 : enchaîner sur le brief

Sans attendre, **charge la skill `bd-brief` et suis-la** pour ce projet (donne-lui le slug, et le chemin du document source s'il y en a un, `--source` ou cité dans la conversation). Le projet existant déjà, `bd-brief` n'en recrée pas ; il pose le brief, la distance de transposition, le devis, et annonce la suite (`/bd-univers`).

## Règles

- **Une seule question à la fois**, et le moins possible : le titre, l'univers s'il y a un choix, c'est tout. Les vraies questions (à qui on parle, quel format, quel ton) sont celles du brief, pas celles-ci.
- **Ne crée jamais deux projets pour une même demande.** Si la création répond une erreur, dis-la et arrête-toi ; ne réessaie pas en boucle.
- **Le titre de travail n'engage à rien** : ne fais pas attendre la personne pour le trouver bon.
