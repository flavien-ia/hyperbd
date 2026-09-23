---
name: bd-lettrage
description: Pose le texte sur les planches produites. Fait naître les bulles du script une seule fois (jamais retapées à la main), les place, pose les QR codes vers les sources, fait rendre la planche lettrée par l'atelier, la soumet à un juge qui la REGARDE (lisibilité à l'impression, ordre de lecture, rien sur les visages, queues, marges de rognage), applique ses deltas et valide. Respecte le cadenas des pages finies. Utiliser après la production des images, quand la personne dit « lettre les planches », « pose les bulles », « /bd-lettrage ».
argument-hint: "[projet] [--planches id,id] [--scene <id>] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Le lettrage : poser le texte là où il se lit

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.
- Désigne les planches par le numéro que l'atelier affiche (`numero` : « 01 »,
  « 12 », « Couv. »), jamais par leur rang dans une liste.

Tu poses les bulles sur des planches déjà dessinées. C'est la dernière étape
avant l'impression, et la seule où une erreur se voit par tout le monde : un
lecteur ne remarque pas un cadrage discutable, il remarque toujours une bulle
sur un visage.

## Étape 1 : l'état, lu du serveur

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" planches <projet>
```

Chaque planche tombe dans un état, et un seul :

| État | Comment il se reconnaît | Ce qu'on fait |
|---|---|---|
| pas d'image | `aUneImage: false` | rien ici : c'est `/bd-planches` qui produit |
| verrouillée | `lettrageVerrouille: true` | rien : la personne l'a fermée (le cadenas) |
| lettrage absent | `lettrage <planche>` rend `null`, ou un texte vide | le faire naître (étape 2) |
| à poser et juger | des bulles, `lettrageValidated: false` | placer, rendre, juger (étapes 3 à 5) |
| validé | `lettrageValidated: true` | ne pas y toucher |

La couverture et la quatrième se lettrent avec `/bd-couverture` : titre,
mentions et dos ne sont pas des répliques.

**Rien ne se lit d'un fichier local.** Relancer cette skill, c'est relire l'état
du serveur : c'est ce qui rend la reprise possible après n'importe quelle
interruption.

**Le cadenas est un geste de la personne.** Une page verrouillée refuse toute
écriture, la tienne comprise : ne cherche pas de détour, et ne demande pas à
la déverrouiller pour un simple ajustement. Si une correction s'y impose
vraiment, dis laquelle et laisse la personne ouvrir le cadenas.

## Étape 2 : faire naître, une fois

```bash
node "$S" derive-lettrage <plancheId>
```

Les répliques viennent du script de la planche : c'est leur naissance, et elle
n'a lieu **qu'une fois**. Ensuite, le lettrage est le dialogue qui fait foi :
c'est lui qu'on imprime, lui que la Toile montre dans la fiche de la scène,
lui qu'on traduit. Le script des cases n'est plus que le brouillon du
découpage, et il n'est pas tenu à jour.

L'atelier protège ce principe. Trois refus possibles, trois bonnes réponses :

- **La page est verrouillée** : on n'y touche pas (voir plus haut).
- **Le lettrage a été retouché depuis sa dérivation** (par la personne dans
  la vue Lettrage, dans la fiche de la scène, ou par toi) : re-dériver
  ramènerait l'ancien texte du script et effacerait ces corrections. Ne force
  pas. `--rederiver` n'existe que pour la personne qui demande expressément
  de tout réaligner sur le script, en sachant qu'elle perd ses corrections.
- **Le script ne porte aucune réplique alors que le lettrage en a** : c'est
  une protection contre l'effacement silencieux. `--remplacer` vide
  délibérément ; il faut alors dire pourquoi, dans le chat et au journal.

## Étape 3 : corriger une réplique, s'il le faut

Une réplique lettrée ne se réécrit **qu'avec l'accord de la personne**,
même en `--auto` (où elle reste dans la liste de fin) : c'est une règle de
l'atelier. Une fois acceptée, une réplique à reprendre (une coquille, un mot,
une ligne de trop) se corrige **dans le lettrage**, jamais dans le script
suivi d'une nouvelle dérivation :

- pour une planche : écris son texte complet dans un fichier, puis
  `set-lettrage <planche> --text-file <texte.txt>` ;
- pour une scène entière : réécris le `dialogue` de la scène sur la Toile, en
  gardant chaque ligne « ## Planche : <titre> » intacte (voir `_toile`).

Les bulles suivent le texte, comme dans l'éditeur : une réplique corrigée
garde sa bulle et sa place, une réplique retirée emporte la sienne, une
réplique ajoutée fait naître sa bulle au bord droit de la planche. Dans ce
dernier cas, la page repasse à valider : la nouvelle bulle attend d'être
posée (étape 4).

Une correction du texte source met ses traductions en retard : dis-le,
`/bd-traduire` les rattrape.

## Étape 4 : placer, puis regarder

Les bulles fraîchement dérivées sont toutes au centre de l'image, empilées :
c'est normal, elles attendent d'être posées.

Lis le lettrage (`lettrage <planche>` : le texte et la liste complète des
éléments), place les bulles en écrivant leurs coordonnées, et réécris la
liste COMPLÈTE (`set-lettrage <planche> --file bulles.json`, avec `bulles` :
elle remplace l'existante, un élément oublié disparaît). Respecte **la place
que la bible graphique réserve au lettrage**. Puis fais rendre la planche par
l'atelier :

```bash
node "$S" rendu <plancheId> --out <fichier.png>
```

**Regarde l'image toi-même avant de la soumettre.** Une bulle manifestement sur
un visage n'a pas besoin d'un juge, et lui envoyer un placement grossier gâche
un tour.

Trois repères pour placer :

- **En haut, dans l'ordre de lecture.** Une bulle se pose vers le haut de sa
  case, et les bulles d'une même bande se lisent de gauche à droite.
- **Sur du décor.** Un ciel, un mur, un meuble sont de la place disponible. Un
  visage, une main qui agit, l'objet que la scène regarde ne le sont pas.
- **La queue désigne.** Elle pointe la bouche de son locuteur, ou l'endroit
  d'où il parle s'il est hors champ, et ne traverse jamais quelqu'un d'autre.

**Les numéros de page ne se posent pas ici.** Ce sont les folios, un réglage
d'album que `/bd-album` règle à la fin (`folios`) : l'atelier les calcule à
chaque rendu. N'écris jamais un numéro de page dans le lettrage. Quand
l'album en a, ils apparaissent dans le rendu : laisse leur coin libre (en
bas, côté extérieur, par défaut).

## Étape 5 : les QR codes vers les sources

Un album documentaire renvoie ses affirmations à leurs sources : une réplique
qui cite un chiffre, une étude, un fait, porte un QR code qui mène à la fiche
de sa source, sur la page publique du projet. Les sources vivent dans
l'atelier (`sources <projet>`).

```bash
node "$S" qr <plancheId> --source <sourceId> --x 0.85 --y 0.9 --info
```

L'atelier fait le reste, comme le bouton de la vue Lettrage : l'adresse
absolue de la fiche (un QR imprimé est scanné par un téléphone qui n'a aucun
contexte), le côté que l'album a retenu (180 px de référence par défaut,
environ 3,7 cm sur une page A4), rapporté au format de la planche. `x` et `y`
sont le centre du QR, en fractions de l'image.

- **Un QR se pose dans une zone calme** : un mur, un ciel, une marge de case.
  Jamais sur un visage, jamais à cheval sur un bord de case ou sur la
  reliure, jamais dans les 3 % du bord.
- **L'icône « i »** (`--info`) dit à quelle réplique le code se rapporte. Elle
  naît à côté du QR ; approche-la ensuite de la bulle qu'il source (lis le
  lettrage, change `x`/`y` de l'élément `info`, réécris la liste).
- **Tous les QR d'un album ont la même taille.** Ne change `--px` que sur
  demande, et jamais sous 120 px de référence (environ 2,5 cm) : en dessous,
  un téléphone accroche mal.
- **La page publique des sources doit être ouverte avant le tirage**
  (`sources-public <projet> --etat`). Un QR imprimé qui mène à une page
  fermée ne se rattrape pas. L'ouvrir est une décision d'édition : demande-la.
- Un QR ne se déplace pas comme une bulle : il vise une ancre imprimée pour
  toujours. S'il gêne, c'est la composition de la case qu'il faut revoir.

## Étape 6 : le juge du placement

C'est le seul juge qui REGARDE. Donne-lui trois choses, et rien de plus :

1. les images, **déjà découpées par toi** ;
2. le texte du lettrage (il en tire l'ordre voulu des répliques) ;
3. la liste NUMÉROTÉE des éléments (bulles, encarts, QR, icône « i ») avec
   leur géométrie.

**Découpe la planche avant de la lui donner**, et dis-lui explicitement de ne
fabriquer aucun recadrage. Un juge à qui on tend une planche entière en pleine
résolution se met à la découper lui-même pour inspecter les détails, empile les
fichiers intermédiaires, et s'enlise sans avoir rien jugé. Manipuler des images
n'est pas son travail.

Le jeu qui marche : **la planche entière allégée** (environ 900 pixels de large,
pour l'ensemble et l'ordre de lecture), plus **une vue par bande à résolution
native** (pour lire le texte et voir ce qu'une bulle recouvre). Fais chevaucher
légèrement les bandes, sinon une bulle posée près d'une gouttière sera déclarée
coupée alors que c'est ton découpage qui l'a coupée.

Ajoute la **largeur d'impression** de l'album (une page A4 : 21 cm, une double
page : 42 cm) : sans elle, il ne peut pas juger si le texte sera lisible sur le
papier, et le nombre de pixels ne le dit pas.

Le protocole (dossier du juge, lancement en aveugle, boucle) est celui de
`_juge` ; la grille est `templates/juges/lettrage.md`, et son verdict a son
vocabulaire propre :

- **VALIDER** : passe à l'étape 7.
- **AJUSTER** : il rend des deltas par élément numéroté (« bulle 2 : monter
  au-dessus de la ligne d'horizon, elle couvre la lettre »). Traduis chaque
  delta en nouvelles coordonnées, réécris, re-rends, re-juge avec un juge
  FRAIS.
- **REFAIRE** : le problème n'est pas le placement mais le texte (une réplique
  trop longue pour toute case disponible, un locuteur absent de sa case). Une
  réplique trop longue se raccourcit dans le lettrage (étape 3), avec
  l'accord de la personne ; un locuteur absent de sa case remonte à l'image
  ou au découpage (`/bd-planches`, `/bd-dialogues`).

**Trois tours au maximum.** Au-delà, livre la meilleure version avec le verdict
honnête et ce qui bloque.

## Étape 7 : valider et consigner

```bash
node "$S" set-lettrage <plancheId> --valider
```

« Textes validés » : c'est ce drapeau qui fait apparaître la planche dans
l'aperçu, la lecture et les liens partagés. Puis une entrée de journal par
planche : ce que le juge a fait bouger, et ce qui reste discutable. Un
placement validé sans trace de ce qu'on a corrigé se rediscute entièrement au
tirage suivant.

## Étape 8 : livrer

Récapitule : les planches lettrées et validées, celles qui restent, les pages
verrouillées laissées telles quelles, les QR posés (et si la page des sources
est ouverte), ce que les juges ont fait bouger, ce qui reste fragile. Coût :
zéro, rien ne se génère ici.

Termine par `🎉 LETTRAGE POSÉ (n planches)`.

## Règles

- **Tu ne touches jamais aux couleurs de bulles.** Elles viennent des
  personnages de la bibliothèque et valent pour tout l'album : les changer ici
  les désaccorderait d'une planche à l'autre. Si deux couleurs se confondent,
  dis-le et renvoie vers `/bd-personnages`.
- **Tu ne changes pas la police.** Elle est arrêtée par la bible graphique.
- **Un ordre de lecture cassé ne se rattrape par rien.** Ni par la beauté du
  placement, ni par la lisibilité : c'est le seul défaut qui empêche VALIDER à
  lui tout seul.
- **Une bulle hors de sa case n'est pas un détail de placement** : le lecteur
  attribue la réplique au mauvais personnage.
- **On ne re-dérive pas un lettrage vivant.** Le script a pu bouger depuis :
  c'est le lettrage qui fait foi, et c'est lui qu'on corrige.
