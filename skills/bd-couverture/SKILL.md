---
name: bd-couverture
description: Fait la couverture et la quatrième de couverture de l'album. Compose trois concepts d'affiche contrastés, les fait générer en petit dans le laboratoire, les fait juger à taille de vignette (accroche, promesse, place du titre), produit le concept retenu en page simple portrait, la fait regarder contre les fiches, pose le titre et les mentions dans le lettrage (jamais dans l'image), puis fait de même pour la quatrième. Utiliser quand l'album a sa direction artistique et ses personnages dessinés, quand la personne dit « la couverture », « /bd-couverture », « la quatrième », « l'affiche de l'album ».
argument-hint: "[projet] [--quatrieme-seule] [--budget 3] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et une clé d'images configurée dans l'atelier."
---

# La couverture : une image qui promet l'album

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher, et **le coût cumulé à chaque image**.
- **Annonce toujours un coût AVANT de le dépenser**, et demande confirmation en mode guidé.

Une couverture n'est pas une planche. Elle ne raconte pas, elle promet : en
une seconde, à la taille d'une vignette, elle doit dire le genre, le ton, et
donner envie d'ouvrir. Elle se juge donc en petit, et son titre ne se dessine
jamais dans l'image : il se pose ensuite, dans la police de l'album, là où
l'image lui a laissé la place.

Dans l'atelier, la couverture et la quatrième sont deux pages à part : une
seule de chaque, la première toujours en tête, la seconde toujours en fin,
en portrait, sans cases ni gabarit. Tout le reste (références, génération,
juge, lettrage, export) est celui d'une planche.

## Étape 0 : le pré-vol

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" me
node "$S" project <projet>
node "$S" docs <projet> --kind bible-graphique
node "$S" universe <projet>
node "$S" planches <projet>
node "$S" costs <projet>
```

Si aucun accès n'est enregistré, envoie vers `/start-hyperbd` et arrête-toi.

Trois conditions, sinon **arrête-toi et dis laquelle manque** :

1. **La bible graphique existe et le cadre est verrouillé.** Sinon : `/bd-da`.
   Une couverture dans un autre style que l'album ment sur ce qu'il contient.
2. **Le héros (ou les figures que la couverture montrera) a ses variantes
   dessinées et ses images de référence étoilées.** Sinon : `/bd-design`.
   La couverture montre un visage en très grand : c'est là qu'une dérive se
   voit le plus.
3. **Le budget.** En guidé, annonce le coût estimé et attends l'accord. **En
   `--auto`, `--budget` est OBLIGATOIRE.**

Regarde ensuite si l'album a déjà une couverture ou une quatrième (`kind`
`couverture` ou `quatrieme` dans la liste des planches). Si oui, ne la refais
pas en silence : dis ce qu'elle est, et demande s'il s'agit de la reprendre
(on regénère sur la même page) ou de repartir de zéro (on la met à la
corbeille, puis on en crée une neuve : l'atelier n'en accepte qu'une).

Avec `--quatrieme-seule`, passe directement à l'étape 7.

## Étape 1 : ce que la couverture promet

Lis le brief, la bible et le pitch de l'album :

```bash
node "$S" docs <projet> --kind brief
node "$S" docs <projet> --kind bible
node "$S" docs <projet>            # un pitch, un résumé, s'ils existent
```

Écris, en cinq lignes, **la promesse** : à qui s'adresse l'album, ce qu'il
est (genre, ton), ce que la couverture doit faire sentir. Puis arrête trois
choix, avec la personne en guidé :

- **le titre** tel qu'il s'imprimera (le titre de travail du projet, sauf
  décision contraire) ;
- **la ligne d'auteur** (nom, ou noms) ;
- **la figure** : le héros, une variante précise (son costume, son état au
  moment que la couverture montre), ou une figure de monde si l'album n'a pas
  de héros unique.

La promesse est le mètre-étalon des concepts : un concept qui ne la sert pas
est écarté, même s'il est beau.

## Étape 2 : trois concepts d'affiche, franchement contrastés

Trois, pas cinq : une couverture se choisit entre des intentions, pas entre
des nuances. Varie **le principe** :

- une **figure** (le héros en gros plan, un regard, une posture) ;
- une **situation** (le héros dans son monde, une tension lisible) ;
- un **signe** (un objet, un motif, une forme qui condense l'album).

Pour chaque concept, écris un fichier de prompt : le cadre de la bible
graphique tel quel, puis la description de l'image (sujet, cadrage,
lumière, ambiance), puis ces trois consignes, toujours :

> Composition d'affiche en portrait, une seule image sans cases ni bordures.
> Zone calme et unie dans le tiers supérieur, réservée au titre : rien
> d'essentiel n'y figure. Aucun texte, aucune lettre, aucun logo.

Génère chaque concept dans le laboratoire, en petit, avec les références de
la figure et la planche de style :

```bash
node "$S" essai <projet> --kind couverture --label "<nom du concept>" \
  --prompt-file concept-1.txt --size 1024x1536 --quality low --n 1 \
  --refs <imageIds étoilées de la variante>,<imageId de la planche de style> --wait
```

Qualité basse : on juge une intention, pas un rendu. **Avant de lancer** :
annonce le nombre d'images, le coût estimé, le total. Un budget passé ne se
dépasse pas, même d'une image.

## Étape 3 : faire juger, à taille de vignette

Fais regarder **chaque concept** par le juge des couvertures, selon le
protocole de `_vision-qa` (images téléchargées, subagent en aveugle, un juge
frais à chaque passe), avec la grille
`${CLAUDE_SKILL_DIR}/../../templates/juges/couverture.md` à la place de la
grille du regard, et `TYPE : concept`. Donne-lui la promesse de l'étape 1
comme brief, les fiches de la figure et la planche de style comme références.

Les concepts se jugent **en parallèle**.

Restitue en clair, pour chacun : ce que le juge a vu en vignette, ce qu'il
promet, où le titre se posera, son verdict.

## Étape 4 : choisir

En guidé : montre les trois images et les verdicts, rappelle que le critère
qui compte est la vignette, et laisse trancher. Un concept peut être choisi
contre l'avis du juge : c'est légitime, et cela se consigne comme tel.

En `--auto` : le meilleur `RETENIR` au score global ; à égalité, la meilleure
`accroche`. Aucun `RETENIR` : prends le meilleur `ITERER`, applique son delta,
**et refais une image** avant de choisir. On ne produit pas en grand un
concept que personne n'a trouvé porteur.

Consigne le choix et sa raison au journal ; les concepts écartés y vont avec
la leur.

## Étape 5 : la page de couverture

1. **Créer la page** (une seule : si elle existe déjà, réutilise-la) :

```bash
node "$S" create-planche <projet> --kind couverture --title "Couverture"
```

2. **L'écrire** : la description du concept retenu (telle qu'elle a servi au
   laboratoire, corrigée du delta s'il y en a eu) dans `script`, et le
   casting dans `draft` (la variante de la figure, la planche de style, un
   décor si le concept en montre un) :

```bash
node "$S" write <plancheId> --file couverture.json
```

```json
{
  "script": "<la description de l'image>",
  "draft": {
    "characterIds": ["<id de la variante>"],
    "decorIds": [],
    "plateIds": ["<id de la planche de style>"]
  }
}
```

L'en-tête d'affiche (portrait, zone calme, aucun texte) est ajouté par
l'atelier lui-même pour ce genre de page : ne le recopie pas.

3. **Générer**, en qualité finale, en mode planche (le seul que l'atelier
   accepte pour une couverture ; il la met en portrait de lui-même) :

```bash
node "$S" generate <plancheId> --quality high --mode planche --wait
```

4. **Regarder** : le juge des couvertures, `TYPE : page`, contre les fiches
   de la figure et la planche de style. `RETENIR` : valide la variante.
   `ITERER` : repasse le delta en `--extra`, trois tours au maximum, le coût
   affiché à chaque tour. `ECARTER` : reprends depuis le prompt, jamais
   depuis un « presque ».

```bash
node "$S" validate <varianteId>
```

## Étape 6 : le titre et les mentions, dans le lettrage

Le titre est un **texte libre** du lettrage : il se pose sur l'image, dans la
police de l'album, et se change sans rien regénérer. Lis d'abord ce que la
bible graphique dit de la police et de la place réservée au texte.

Écris le lettrage de la page, puis valide-le :

```bash
node "$S" set-lettrage <plancheId> --file lettrage-couverture.json --valider
```

```json
{
  "bulles": [
    {
      "id": "titre",
      "kind": "texte",
      "text": "<LE TITRE>",
      "color": "#111111",
      "colorAuto": false,
      "placed": true,
      "x": 0.5,
      "y": 0.16,
      "w": 0.8,
      "fontSize": 0.075,
      "bold": true,
      "shadow": true,
      "tail": null,
      "z": 2
    },
    {
      "id": "auteur",
      "kind": "texte",
      "text": "<Prénom Nom>",
      "color": "#111111",
      "colorAuto": false,
      "placed": true,
      "x": 0.5,
      "y": 0.93,
      "w": 0.6,
      "fontSize": 0.028,
      "bold": false,
      "tail": null,
      "z": 1
    }
  ]
}
```

Les coordonnées sont des fractions de l'image (centre `x`, `y` ; largeur
`w` ; taille de police `fontSize` en fraction de la largeur). Le titre va
dans la zone calme que l'image a réservée ; la ligne d'auteur en bas. `font`
prend l'identifiant d'une police du catalogue (`bangers`, `bungee`,
`titan`, `alfa-slab`, `shrikhand`...) quand la bible en désigne une pour le
titre ; sans `font`, c'est la police du lettrage de l'album. `shadow` décolle
le titre d'un fond chargé ; `rot` et `curve` existent pour un titre qui
penche ou qui s'arque.

Puis rends la page lettrée et **regarde-la toi-même** :

```bash
node "$S" rendu <plancheId> --out couverture.png
```

Le titre est-il lisible réduit au quart ? Couvre-t-il un visage ? Si oui,
corrige les coordonnées et re-rends. En cas de doute, un dernier passage du
juge des couvertures, `TYPE : lettree`, tranche.

## Étape 7 : la quatrième de couverture

Même chemin, plus court : un seul concept, sans laboratoire, en guidé comme
en auto. La quatrième est **une image calme** : le monde de l'album, un
motif, une figure de dos, un détail ; jamais une seconde couverture. Sa
moitié inférieure reste unie : c'est là que le texte se posera.

1. Écris **le texte de quatrième** : le pitch de l'album s'il existe (le
   scénario en produit un), sinon trois à cinq lignes qui donnent envie sans
   raconter la fin. Fais-le relire par le juge `dramaturgie` (protocole de
   `_juge`, type « document ») si la personne le demande ou en `--auto`.

2. Crée la page, écris-la, génère, fais regarder (`TYPE : page`), valide :

```bash
node "$S" create-planche <projet> --kind quatrieme --title "Quatrième de couverture"
node "$S" write <plancheId> --file quatrieme.json
node "$S" generate <plancheId> --quality high --mode planche --wait
node "$S" validate <varianteId>
```

3. Pose le texte en **encart** (une boîte, lisible sur n'importe quel fond)
   et les mentions en texte libre (éditeur, collection, prix ou code-barres
   si la personne les donne ; sinon rien : on n'invente pas une mention
   légale), puis valide le lettrage :

```json
{
  "bulles": [
    {
      "id": "pitch",
      "kind": "encart",
      "text": "<le texte de quatrième>",
      "color": "#111111",
      "colorAuto": false,
      "placed": true,
      "x": 0.5,
      "y": 0.72,
      "w": 0.78,
      "fontSize": 0.026,
      "bold": false,
      "tail": null,
      "z": 2
    }
  ]
}
```

Rends, regarde, corrige s'il le faut.

## Étape 8 : livrer

```bash
node "$S" costs <projet>
```

Récapitule : le concept retenu et pourquoi, ce que la couverture promet, le
titre et sa place, la quatrième et son texte, ce qui reste fragile (un
visage à surveiller à l'agrandissement, un fond chargé sous le titre), et le
coût réel dépensé.

Une entrée de journal, puis annonce la suite : l'agrandissement et l'export
de l'album, où la couverture ouvre et la quatrième ferme, d'elles-mêmes.

Termine par `🎉 COUVERTURE POSÉE` (ou `🎉 QUATRIÈME POSÉE` avec
`--quatrieme-seule`). Si le budget a arrêté la boucle, ne termine pas ainsi :
rends le bilan honnête, avec ce qui bloque.

## Règles

- **Le titre ne se dessine jamais dans l'image.** Ni le titre, ni l'auteur,
  ni un logo, ni un faux code-barres : le modèle écrit dans une police de son
  invention, cuite dans les pixels, et rien ne la recouvre proprement. Tout
  texte est du lettrage.
- **Une couverture se juge en vignette.** Si tu ne montres que des images en
  grand, tu fais choisir sur un critère qui ne sera jamais celui du lecteur.
- **Une seule couverture, une seule quatrième.** L'atelier refuse la
  seconde : pour repartir de zéro, on met l'ancienne à la corbeille
  (`drop-planche`), on le dit, et on l'écrit au journal.
- **Le budget est un plafond, pas une estimation.** L'atteindre arrête la
  boucle et rend le bilan de ce qui a été fait.
- **On ne repart jamais d'un « presque ».** Trois tours au maximum par page ;
  au-delà, c'est le concept qui est en cause, pas le modèle.
- **Aucune ressemblance avec une personne réelle**, et aucun style « à la
  manière de » un auteur vivant nommément : des qualités graphiques, pas une
  signature.
- **Le cadre de la bible graphique s'applique à la couverture comme à toute
  planche.** Une couverture qui en sort trompe sur l'album.
- **Un refus du fournisseur se traite selon la doctrine commune**
  (`${CLAUDE_SKILL_DIR}/../../templates/refus.md`) : on reformule, on ne
  relance jamais à l'identique, on s'arrête proprement pour un crédit ou une
  clé.
