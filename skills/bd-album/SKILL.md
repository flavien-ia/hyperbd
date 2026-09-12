---
name: bd-album
description: Le pilote de l'album : enchaîne, scène après scène et dans l'ordre du récit, le découpage et les dialogues, la production des planches, le lettrage, puis la couverture et la quatrième, la relecture de l'album entier et le point final, sous un budget global. Trois signatures humaines par défaut (le plan de production, la première scène produite, l'album relu), reprise possible à tout moment depuis l'état de l'atelier. Utiliser après la planche test, quand la personne dit « produis l'album », « /bd-album », « enchaîne tout », « fais toute la BD ».
argument-hint: "[projet] --budget <dollars> [--auto] [--full-auto] [--depuis <scène>] [--sans-couverture]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et une clé d'images configurée dans l'atelier."
---

# L'album : de la première scène à la quatrième de couverture

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Tiens une liste à cocher **par scène**, avec pour chacune : dialogues, planches, lettrage, et le coût cumulé de l'album à chaque ligne.
- **Le budget est global** et s'affiche à chaque scène : dépensé, restant, estimé pour la suite.

Toutes les skills du métier travaillent une scène à la fois ; celle-ci les
enchaîne sur tout l'album. Elle n'invente rien : elle appelle, dans l'ordre
du récit, ce que chacune sait faire, elle tient le budget, elle s'arrête aux
trois endroits où une personne doit signer, et elle sait reprendre.

Ce qu'elle suppose acquis : les temps 0 à 2 (brief, univers, personnages,
scénario, direction artistique, personnages et décors dessinés, **planche
test validée**) et la bible de voix. Si l'un manque, elle renvoie vers la
skill concernée et s'arrête : produire un album sans planche test, c'est
découvrir un défaut de pipeline soixante fois.

## Les trois modes

| Mode | Ce qui s'arrête | Ce qui est exigé |
|---|---|---|
| guidé (défaut) | à chaque scène : la personne regarde dans l'atelier et dit « suite » | rien |
| `--auto` | aux trois signatures seulement (plan, première scène, album relu) | `--budget` |
| `--full-auto` | jamais : on donne un scénario, on revient avec un album | `--budget` |

Les trois signatures produisent leur artefact **même sautées** (`--full-auto`)
: le plan de production, la première scène, le rapport de relecture vont au
journal, pour l'audit a posteriori.

## Étape 0 : l'état, lu du serveur

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" me
node "$S" project <projet>
node "$S" nodes <projet>                       # les chapitres et les scènes, dans l'ordre
node "$S" docs <projet> --kind bible-graphique
node "$S" docs <projet> --kind voix
node "$S" universe <projet>
node "$S" planches <projet>
node "$S" costs <projet>
node "$S" journal <projet> --limite 30
```

**Rien ne se lit d'un fichier local.** L'état de l'album, c'est : pour chaque
scène validée (`type` scène, `status` valide, dans l'ordre du récit), ses
planches (celles dont `sceneId` est la scène), et pour chaque planche son
image (`aUneImage`), sa validation, son lettrage (`lettrageValidated`), et
sa dernière génération (`derniereGeneration`, qui porte un refus s'il y en a
eu). C'est ce qui rend la reprise possible : relancer cette skill après une
coupure, c'est la voir recommencer exactement à la première scène qui n'est
pas finie.

Le pré-vol, sinon arrêt net avec la raison :

1. **Une planche test validée** existe (une planche avec image validée et
   lettrage validé, hors scènes ou dans la scène étalon). Sinon :
   `/bd-design`.
2. **La bible de voix** et **la bible graphique** existent. Sinon `/bd-voix`,
   `/bd-da`.
3. **Le budget**, en dollars. `--auto` et `--full-auto` l'exigent ; en guidé,
   demande-le : un album sans plafond est un défaut, pas une liberté.
4. **Les clés** : `me` dit si OpenAI et R2 sont là. Sans elles, rien ne se
   dessine.

## Étape 1 : le plan de production (première signature)

Compose, sans rien dépenser :

- la liste des scènes validées dans l'ordre du récit, chacune avec son
  budget de planches (`meta.budgetPlanches`) et son état (découpée ou non,
  planches produites ou non, lettrage fait ou non) ;
- le total de planches à produire, le coût estimé (le coût moyen d'une
  planche du projet jusqu'ici, `costs`, ou à défaut le tarif du modèle en
  qualité choisie, multiplié par le nombre de planches et par 1,5 pour les
  reprises) ;
- **l'ordre** : le récit, toujours. Produire dans l'ordre est ce qui permet
  de juger la continuité contre la planche précédente validée.
- avec `--depuis <scène>` : le plan commence à cette scène, les précédentes
  sont considérées acquises (dis-le).

Si l'estimation dépasse le budget, dis-le maintenant et propose : réduire
le scope (des scènes), baisser la qualité, ou relever le budget. **On ne
commence pas un album dont on sait qu'il ne tiendra pas dans son budget.**

Écris le plan au journal, puis :

- guidé et `--auto` : montre-le et **attends la signature**.
- `--full-auto` : continue.

## Étape 2 : scène après scène

Pour chaque scène du plan, dans l'ordre, trois temps. **Chaque temps relit
l'état du serveur avant d'agir** : un temps déjà fait se saute, un temps à
moitié fait se reprend là où il en était.

### 1. Les dialogues (gratuit)

Si la scène n'a pas encore ses planches (aucune planche avec ce `sceneId`) :
charge la skill `bd-dialogues` et suis-la pour cette scène, en `--auto`
quand on est en auto. Son pré-contrôle des refus (voir
`${CLAUDE_SKILL_DIR}/../../templates/refus.md`) s'applique : c'est ici que
l'on choisit ce que l'image montrera et ce qu'elle laissera deviner.

### 2. Les planches (payant)

Charge la skill `bd-planches` pour cette scène (`--scene`), avec **le budget
restant de l'album** comme plafond de la scène, en `--auto` quand on est en
auto. Elle produit, fait regarder, itère, valide, dérive le lettrage.

Quand elle rend la main, relis `planches` : chaque planche de la scène a-t-
elle une image validée ? Sinon, pourquoi (`derniereGeneration`) :

- `refus_securite` : la doctrine de `templates/refus.md` a été appliquée par
  `bd-planches` (reformuler, trois tours, puis autrement). Si la planche est
  restée sans image, **note-la comme « à faire autrement »** et continue :
  une planche ne bloque pas l'album, mais elle bloque son export, et le
  bilan le dira.
- `credit_epuise`, `plafond_facturation`, `cle_refusee` : **arrête l'album**
  ici, proprement : bilan, journal, ce qu'il faut faire pour reprendre, et
  la commande à retaper (`/bd-album` reprend seul à la bonne scène).
- `limite_debit`, `autre` : `bd-planches` a réessayé ; si ça bloque encore,
  passe à la scène suivante et note-le.

### 3. Le lettrage (gratuit)

Charge la skill `bd-lettrage` pour cette scène (`--scene`), en `--auto`
quand on est en auto : placer, rendre, faire juger, valider.

### La fin de scène

Une ligne cochée, le coût de la scène et le cumul de l'album, une entrée de
journal (ce que les juges ont fait bouger, ce qui reste fragile). Puis :

- **première scène produite = deuxième signature** (guidé et `--auto`) :
  c'est la validation du pipeline complet avant de dérouler le reste. Montre
  la scène dans l'atelier, ses coûts réels, ce que le premier passage a
  appris (le coût moyen par planche réajuste l'estimation), et attends.
- les suivantes : en guidé, attends « suite » ; en auto, continue.

**Le budget est un plafond.** L'atteindre arrête la boucle au milieu d'une
scène s'il le faut : bilan honnête, journal, et l'album reprendra là quand
le budget sera rouvert.

## Étape 3 : la relecture de l'album (troisième signature)

Toutes les scènes faites, avant la couverture :

1. **L'audit** : charge `bd-audit` en `--auto`. Il passe l'album au crible par
   lots (dates, noms, mécaniques, arcs, rappels, sources).
2. **La relecture d'ensemble** : fais rendre les pages lettrées de l'album,
   dans l'ordre, allégées (`rendu <plancheId> --out ... --largeur 900`), et
   fais-les regarder par le juge `vision` avec, en références, la planche de
   style et les fiches des personnages principaux, `TYPE : album`, en lui
   demandant UNE chose : **la dérive**. Un personnage a-t-il changé de visage
   entre le chapitre 1 et le chapitre 4 ? La palette a-t-elle glissé ? Un
   album se produit planche par planche, et c'est le seul moment où quelqu'un
   le voit d'un bloc.
3. **Le rapport** : les corrections de l'audit (propagées par l'atelier), les
   planches que le regard d'ensemble désigne à reprendre, les planches restées
   sans image (« à faire autrement »), le coût réel.

Guidé et `--auto` : montre le rapport et **attends la signature** ; la
personne peut demander la reprise de telle planche (`/bd-planches
--planches id`) avant d'aller plus loin. `--full-auto` : reprends les
planches que le regard d'ensemble juge dérivées, dans la limite du budget,
et continue.

## Étape 4 : la couverture et la quatrième

Sauf `--sans-couverture` : charge `bd-couverture`, en `--auto` avec le budget
restant quand on est en auto. Elle fait le concept, la page, le titre et la
quatrième. L'album a désormais une première et une dernière page ; les
exports les prennent d'eux-mêmes.

## Étape 5 : le point final

```bash
node "$S" planches <projet>
node "$S" costs <projet>
```

Le bilan, sans arrondir en ta faveur :

- planches produites, validées, lettrées ; celles restées sans image, et
  pourquoi ;
- scènes reprises, et combien de tours elles ont demandé ;
- le coût RÉEL (les factures du modèle, pas l'estimation), contre le budget ;
- ce que la relecture a fait bouger ;
- ce qui reste fragile pour l'impression (un visage, une palette).

Une dernière entrée de journal, puis annonce la suite : figer une version
(dans l'atelier), l'envoyer en relecture, agrandir les images, exporter.

Termine par `🎉 ALBUM PRODUIT (n planches, x $)`. Si l'album n'est pas
complet (budget atteint, arrêt pour crédit, planches à faire autrement), ne
termine pas ainsi : `⚠️ ALBUM INTERROMPU à <scène>`, avec ce qui bloque et
la commande qui reprend.

## Reprise

`/bd-album` sur un projet en cours **ne demande rien qu'il puisse lire** :
le plan se recompose depuis les scènes, les planches et le journal ; les
scènes finies se sautent ; la première scène incomplète reprend au temps
qui lui manque. Les signatures déjà données sont dans le journal, on ne les
redemande pas, sauf si le plan a changé (une scène ajoutée, un budget
rouvert) : alors on le dit et on re-signe le plan.

## Règles

- **Dans l'ordre du récit, toujours.** La continuité se juge contre la
  planche précédente validée ; produire dans le désordre casse ce garde-fou.
- **Le budget est global, et c'est un plafond.** Chaque skill appelée reçoit
  le restant, jamais plus. On ne « finit la scène » au-delà.
- **Une scène à la fois, les trois temps dans l'ordre.** Découper toutes les
  scènes d'abord puis tout produire semble plus rapide ; c'est ainsi qu'on
  découvre à la planche 40 que le découpage de la scène 3 ne tenait pas.
- **Un arrêt pour crédit, plafond ou clé n'est pas un échec.** L'état est
  sur le serveur ; on reprend quand la cause est levée.
- **Aucune planche ne se force.** Trois tours, la doctrine des refus, puis
  « à faire autrement » : un album avec une planche importée à la main vaut
  mieux qu'un album en retard de dix tours payés.
- **Tout va au journal** : le plan, chaque scène, chaque arrêt, chaque
  signature, le rapport de relecture. Un album produit sans trace est un
  album qu'on ne saura pas refaire.
