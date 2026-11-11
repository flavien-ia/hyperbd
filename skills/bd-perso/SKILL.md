---
name: bd-perso
description: Les personnages de l'album, de bout en bout : d'abord le casting comme un graphe de forces (qui incarne quoi, ce qui les lie et les charge), proposé dans l'univers où l'auteur retient ou écarte chaque personnage, avec sa fiche, ses variantes, sa couleur de bulle et une vérification anti-ressemblance ; puis le dessin des seuls retenus (planche de références et portrait par variante, jugés dans la planche contact, versés dans l'univers). Vient après la direction artistique. Se rappelle autant qu'on veut : ne propose et ne dessine que ce qui manque. Utiliser quand la personne dit « les personnages », « /bd-perso », « qui raconte cette histoire », « dessine les personnages ».
argument-hint: "[projet] [--auto] [--budget <dollars>] [--sans-dessin]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et une clé d'images configurée dans l'atelier."
---

# Les personnages : des forces incarnées, puis des visages

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.
- **Annonce toujours un coût AVANT de le dépenser.** Le dessin est l'étape la plus dépensière du harnais.

Une galerie de fiches bien remplies ne fait pas un récit : ce qui fait un
récit, ce sont les tensions entre les gens. Et ce qui fait tenir un
personnage d'une planche à l'autre, ce n'est pas le talent du modèle, c'est
la **redondance de description** : ses traits re-décrits à chaque fois, mot
pour mot, en plus de ses images de référence. Cette skill fait les deux, dans
cet ordre : écrire, faire retenir, puis dessiner ce qui a été retenu. On ne
paie pas d'images pour un personnage écarté.

Tout se passe dans **l'univers**, onglet Personnages : c'est là que la
personne voit tes propositions (en pointillé, « Proposé par Claude »), lit
leur fiche, les retient ou les écarte. L'univers s'ouvre aussi depuis le
projet, sans le quitter (bouton « Personnages » de la barre des
bibliothèques).

## Étape 0 : reprendre le fil

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" docs <projet> --kind brief
node "$S" docs <projet> --kind bible
node "$S" docs <projet> --kind bible-graphique
node "$S" universe <projet>       # personnages retenus (aFiche, variantes, images) et propositions
node "$S" nodes <projet>          # s'il y a déjà des scènes : leur casting (meta.castingIds)
node "$S" costs <projet>
```

- **S'il n'y a pas de bible**, envoie vers `/bd-bible` : un casting sans monde
  n'a pas de forces à incarner.
- **S'il n'y a pas de bible graphique**, tu peux écrire le casting, mais pas le
  dessiner : dis-le, fais les étapes 1 à 5, et renvoie le dessin après
  `/bd-da` (ou passe `--sans-dessin`).
- **Si l'univers a déjà des personnages** (une suite, un univers copié), ils
  existent : ne les recrée pas. Lis leur fiche (`entry <projet> <id>`) et pars
  d'eux. Ne propose que ceux qui manquent.
- **Si des propositions attendent** (`propositions` dans `universe`), commence
  par les faire arbitrer.

## Étape 1 : les forces d'abord, les gens ensuite

Ne commence pas par « il me faut un héros ». Commence par : **quelles forces
doivent s'affronter pour que cette histoire dise ce qu'elle a à dire ?** La
bible les a nommées. Pour chaque force, cherche qui l'incarne. Un personnage
né d'une force a des raisons, une histoire et des angles morts ; un
personnage né d'un rôle n'a que des répliques.

Vise peu de personnages. Un récit choral tient à cinq ou six figures qu'on
reconnaît, pas à quinze qu'on confond.

## Étape 2 : les fiches

Une fiche par personnage principal, en Markdown, dans un fichier. C'est elle
que le scénario lira ; elle vit dans l'univers, sur la page du personnage
(section « Fiche »).

1. **Statut** dans le récit (protagoniste, force adverse, témoin).
2. **Nom** complet, et le prénom d'usage qui servira dans les bulles.
3. **Origine** et **âge**.
4. **Apparence** : trois ou quatre traits qu'on peut redessiner de mémoire.
5. **Ce qu'il fait** dans le monde.
6. **Ce qu'il veut** (le désir affiché) et **ce dont il a besoin**. Quand les
   deux divergent, il y a un personnage.
7. **Ce qu'il paie** au cours du récit.
8. **Liens et tensions** : une ligne par personne, avec la charge (dette,
   secret, rivalité, loyauté contradictoire). C'est ici que vit le graphe des
   tensions : il montre les isolés (personne ne les relie : ils ne servent à
   rien), et il donnera au scénario le test « cette scène déplace-t-elle une
   tension ? ».
9. **Son parler** : une manière à lui, et un exemple de réplique.
10. **Ce qu'il devient** ensuite, s'il y a une suite.

## Étape 3 : la vérification anti-ressemblance

Pour chaque personnage principal, cherche activement à qui il ressemble dans
la bande dessinée, l'animation et la culture populaire (recherche web si elle
est disponible). Un personnage qui rappelle immédiatement un autre vole
l'attention du lecteur. Si une ressemblance forte apparaît, ce n'est presque
jamais le concept qu'il faut changer, c'est un ou deux traits : corrige la
fiche avant de proposer.

## Étape 4 : proposer, dans l'univers

Pour chaque personnage, le **conteneur** porte l'identité, la fiche et la
couleur de bulle ; il naît en proposition :

```bash
node "$S" new-entry <projet> --kind character --name "<Nom complet>" \
  --color "<#hex>" --snippet-file apparence-<nom>.txt \
  --fiche-file fiche-<nom>.md --proposition
```

- Le **nom** est celui des bulles : un locuteur se reconnaît à ce que chacun
  de ses mots commence un mot du nom en bibliothèque (« Mira » trouve « Mira
  Vasseur »), et c'est ainsi que la bulle prend sa couleur.
- La **description** (`--snippet-file`) tient en trois ou quatre traits : elle
  part dans CHAQUE génération où le personnage est casté. Pas la fiche.
- Les **couleurs de bulles** se distinguent entre elles, y compris pour un
  lecteur qui distingue mal les couleurs : vérifie les contrastes.

Puis dis à la personne où regarder : l'univers, onglet Personnages
(`app.studio-entremondes.fr/univers/<univers>?onglet=character`), où ses
propositions l'attendent, et demande-lui de trancher : en te répondant, ou
d'un clic (Retenir, Écarter). Une proposition ne sert nulle part tant qu'elle
n'est pas retenue (ni dans les castings, ni à la génération).

**Reporte ses décisions** (voir `_recit`, « Le récit suit la conversation ») :

```bash
node "$S" set-entry <projet> <entryId> --file retenir.json   # { "statut": "retenu" }
node "$S" set-entry <projet> <entryId> --file ecarter.json   # { "statut": "ecarte" }
```

Ce qu'elle corrige dans une fiche se réécrit là (`set-entry` avec `fiche`).

**Les variantes** (un costume, un âge, une blessure : c'est ce qu'on caste sur
une planche, pas le personnage en général) se déclarent une fois le
personnage retenu, sous son conteneur. Avant le scénario, ne déclare que la
variante principale de chacun ; les autres naîtront quand une scène en aura
besoin.

```bash
node "$S" new-entry <projet> --kind character --name "<Nom> (<la variante>)" \
  --parent <id du conteneur> --snippet-file variante-<nom>-<variante>.txt
```

## Étape 5 : la relecture

Fais juger par `incarnation` (des gens ou des porte-voix ?) et `coherence`
(les fiches se contredisent-elles, contredisent-elles la bible ?). Les juges
lisent les fiches par `entry`. Boucle jusqu'à PASS, trois passes au maximum.

## Étape 6 : dessiner ce qui a été retenu

**Seulement avec une bible graphique**, et seulement pour les personnages
retenus. Dessine ce qui sert : avant le scénario, la variante principale des
personnages principaux ; après, les variantes que les scènes castent
(`nodes`, `meta.castingIds`) et qui n'ont pas encore de références.

Présente la liste avant de commencer, avec le nombre d'images et le coût
estimé (voir `${CLAUDE_SKILL_DIR}/../../templates/qualite.md` : la qualité
s'annonce et se demande à la première génération du projet). En guidé, fais-la
valider : c'est là qu'on coupe, pas après.

Par variante, **deux images** :

- **la planche de références** (multi-vues, format paysage) : face, profil,
  trois-quarts, de dos, plus un détail si le personnage en a un ;
- **le portrait** (format portrait) : le visage, en gros, dans la lumière de
  la DA.

Le prompt : **le cadre de la DA** + l'apparence (la description et la fiche)
+ ce qui distingue cette variante. Toujours dans cet ordre : le style
d'abord, le sujet ensuite. **Ne fais jamais porter à la planche de style
l'identité d'un personnage** : elle dit à quoi ressemble l'ALBUM. Si tu en
détoures une figure, donne-la comme référence SÉPARÉE de costume et de visage.
**Décris le costume en matière et en coupe, pas en nom** (« long manteau de
toile de travail usée, col montant à patte boutonnée, tissu froissé et mat »,
pas « veste de toile »).

```bash
node "$S" essai <projet> --kind personnage --label "<variante> : références" \
  --prompt-file ref-<variante>.txt --size paysage --wait
node "$S" essai <projet> --kind personnage --label "<variante> : portrait" \
  --prompt-file portrait-<variante>.txt --size portrait --wait
```

Puis :

1. **Le regard** : passe par `_vision-qa` (silhouette lisible en petit ? traits
   re-descriptibles avec des mots ? vues cohérentes entre elles ? DA tenue ?).
2. **La sélection** : la personne choisit dans la **planche contact** de
   l'atelier (`app.studio-entremondes.fr/projet/<projet>?m=essais&genre=personnage`),
   où elle peut aussi verser elle-même une image dans la variante. Le juge
   choisit en `--auto`.
3. **La promotion** vers la variante, images étoilées (trois au plus) :

```bash
node "$S" promote-image <imageId> --entry <entryId>
node "$S" star <projet> <imageId>
```

4. **Le texte de rappel** de la variante : sa description, cinq à dix mots
   précis (la coiffure, un vêtement, une couleur, une particularité). C'est
   la pièce qui fait tenir la cohérence, et elle est en texte.

```bash
node "$S" set-entry <projet> <entryId> --file patch.json
```

## Étape 7 : livrer

Récapitule : les forces et qui les incarne, les trois ou quatre tensions
principales, ce qui a été retravaillé après la vérification de ressemblance,
qui a été retenu ou écarté, ce qui a été dessiné et ce que cela a coûté
(`costs`, le coût réel). Consigne au journal ce qui a demandé plusieurs tours.

Annonce la suite : les lieux (`/bd-decors`), ou laisse `/bd-univers`
enchaîner s'il t'a appelé. Appelée après le scénario, la suite est
`/bd-planche-test`.

Termine par `🎉 PERSONNAGES POSÉS`.

## Règles

- **Un personnage qu'aucune tension ne relie aux autres est à couper ou à
  fusionner.** Dis-le franchement.
- **L'adversaire doit être défendable.**
- **On ne dessine pas une proposition** : seulement ce qui est retenu.
- **Une variante qu'aucune scène ne caste ne se dessine pas** (sauf la
  principale, avant le scénario).
- **Trois images étoilées au plus par entrée.**
- **Le texte de rappel compte autant que l'image.**
- **Ne jamais accepter un « presque » sur un personnage principal.** Il
  reviendra sur soixante planches.
- **Un refus du fournisseur se traite selon la doctrine commune**
  (`${CLAUDE_SKILL_DIR}/../../templates/refus.md`). Une fiche qui déclenche le
  filtre (une arme, une blessure, un corps) se décrit autrement : elle part en
  référence dans chaque planche, et le refus suivrait.
- N'invente pas de personne réelle. Si le projet parle de gens qui existent,
  c'est une décision éditoriale à poser avec la personne.
- **Rien dans la vue Scénario** : un personnage vit dans l'univers.
