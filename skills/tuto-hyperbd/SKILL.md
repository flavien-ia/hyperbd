---
name: tuto-hyperbd
description: Le mode tuto, en miroir de l'atelier. Dit où l'on en est du premier album (la liste cochée, l'étape courante, le geste à faire des deux côtés), active ou reprend l'accompagnement pas à pas, ou l'arrête. L'avancement est celui que l'atelier affiche dans son Guide, dérivé des mêmes données. Utiliser quand la personne dit « /tuto-hyperbd », « où j'en suis », « guide-moi », « reprends le tuto », « arrête le tuto ».
argument-hint: "[--activer | --stop]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et un accès à l'atelier (/start-hyperbd)."
---

# Le mode tuto : où j'en suis

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Une liste cochée, une étape mise en avant, un geste : pas un tableau de bord.

Le tuto accompagne une personne de son premier login à sa première planche.
Il ne vit pas ici : la liste des étapes et leurs textes viennent de l'atelier,
qui les affiche aussi dans son Guide. Les deux disent donc la même chose, au
même moment, parce qu'ils lisent le même état. Le protocole complet est dans
`${CLAUDE_SKILL_DIR}/../../templates/tuto.md`.

## Étape 0 : l'atelier répond ?

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" me
```

En cas d'erreur : « Il faut d'abord relier l'atelier : tape `/start-hyperbd`. » Et arrête-toi.

## Étape 1 : lire le parcours

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" parcours
```

La réponse dit, pour chacune des onze étapes : si elle est faite (dérivé des
données), si elle est « à regarder » et vue, laquelle est courante, et pour
chacune le texte de l'atelier et celui de Claude. Elle dit aussi si le tuto est
actif, écarté, ou terminé.

## Étape 2 : selon l'argument

- **`--stop`** : `parcours --arreter`. Dis que le Guide de l'atelier reste
  dans son menu, et que `/tuto-hyperbd --activer` reprend.
- **`--activer`** (ou le tuto n'est pas actif et la personne veut être
  guidée) : `parcours --activer`. Puis présente comme ci-dessous.
- **Sans argument** : présente.

## Étape 3 : présenter

1. **La liste cochée**, en deux parties (s'installer, le premier album), un
   titre par ligne, cochée ou non, et « à regarder » quand une étape faite
   attend encore un regard.
2. **L'étape courante**, mise en avant : son titre, **le lieu** (« dans
   l'atelier », « dans Claude Code », « des deux côtés »), le geste à faire,
   avec le texte `claude` de l'étape dit avec tes mots, et la commande à
   taper s'il y en a une. Si l'étape a un coût, dis-le. Si elle est bloquée
   (les clés), dis quoi faire d'abord.
3. **Une phrase sur l'atelier** : ce que le Guide y montre en ce moment
   (c'est la même étape), et où cliquer.

Si le tuto est **terminé** (la planche test existe) : dis-le, félicite en une
phrase, et donne la suite : `/bd-voix`, puis les dialogues, les planches, le
lettrage ; la documentation du processus pour le reste.

Si le tuto est **écarté** (la personne a dit « je me débrouille » dans
l'atelier) : présente quand même l'état, sans réactiver ; propose `--activer`
seulement si elle le demande.

## Règles

- **Une étape à la fois.** Ne déroule pas la suivante : c'est la personne qui
  tape la commande, et c'est à cela qu'elle apprend.
- **Rien ne se marque fait ici**, sauf un regard (`parcours --vu <etape>`)
  quand la personne dit qu'elle a regardé. Le reste, ce sont les données.
- **Pas de `--auto`** : le tuto est un mode guidé.
- Le jeton et les clés ne s'écrivent jamais dans la conversation.
