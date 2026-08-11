---
name: bd-lettrage
description: Pose le texte sur les planches produites. Dérive les bulles depuis le script (jamais retapées à la main), les place, fait rendre la planche lettrée par l'atelier, la soumet à un juge qui la REGARDE (lisibilité à l'impression, ordre de lecture, rien sur les visages, queues, marges de rognage), applique ses deltas et valide. Utiliser après la production des images, quand la personne dit « lettre les planches », « pose les bulles », « /bd-lettrage ».
argument-hint: "[projet] [--planches id,id] [--scene <id>] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Le lettrage : poser le texte là où il se lit

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.

Tu poses les bulles sur des planches déjà dessinées. C'est la dernière étape
avant l'impression, et la seule où une erreur se voit par tout le monde : un
lecteur ne remarque pas un cadrage discutable, il remarque toujours une bulle
sur un visage.

## Étape 1 : l'état, lu du serveur

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" planches <projet>
```

Chaque planche tombe dans un état, et un seul :

| État | Comment il se reconnaît | Ce qu'on fait |
|---|---|---|
| pas d'image | `aUneImage: false` | rien ici : c'est `/bd-planches` qui produit |
| lettrage absent | pas de bulles | dériver (étape 2) |
| à re-dériver | le script a bougé depuis | re-dériver, en réappariant |
| à juger | des bulles posées, `lettrageValidated: false` | rendre et juger (étapes 3 et 4) |
| validé | `lettrageValidated: true` | ne pas y toucher |

**Rien ne se lit d'un fichier local.** Relancer cette skill, c'est relire l'état
du serveur : c'est ce qui rend la reprise possible après n'importe quelle
interruption.

## Étape 2 : dériver, jamais retaper

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" derive-lettrage <plancheId>
```

Les répliques viennent du script de la planche. Les retaper ici créerait une
seconde version du même dialogue, et les deux divergeraient au premier
ajustement.

**Si l'atelier répond 409**, c'est que le script ne porte aucune réplique alors
que le lettrage en a. Ce n'est pas un obstacle à contourner : c'est une
protection contre l'effacement silencieux d'un lettrage déjà posé.

La bonne réponse est presque toujours d'aller écrire les répliques dans les
cases du script (`/bd-dialogues`), puis de re-dériver. `--remplacer` existe
pour vider délibérément, et alors il faut dire pourquoi, dans le chat et au
journal.

**Le réappariement garde ce qui est posé** : une réplique retouchée conserve sa
bulle et sa position, une ligne nouvelle apparaît à placer, une ligne disparue
emporte la sienne.

## Étape 3 : placer, puis regarder

Les bulles fraîchement dérivées sont toutes au centre de l'image, empilées :
c'est normal, elles attendent d'être posées.

Place-les en écrivant leurs coordonnées (`set-lettrage --file`), en respectant
**la place que la bible graphique réserve au lettrage**. Puis fais rendre la
planche par l'atelier :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" rendu <plancheId> --out <fichier.png>
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

## Étape 4 : le juge du placement

C'est le seul juge qui REGARDE. Donne-lui trois choses, et rien de plus :

1. les images, **déjà découpées par toi** ;
2. le script de la planche (il en tire l'ordre voulu) ;
3. la liste NUMÉROTÉE des bulles avec leur géométrie.

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

Ajoute la **largeur d'impression** de l'album : sans elle, il ne peut pas juger
si le texte sera lisible sur le papier, et le nombre de pixels ne le dit pas.

Le protocole (dossier du juge, lancement en aveugle, boucle) est celui de
`_juge` ; la grille est `templates/juges/lettrage.md`, et son verdict a son
vocabulaire propre :

- **VALIDER** : passe à l'étape 5.
- **AJUSTER** : il rend des deltas par bulle numérotée (« bulle 2 : monter
  au-dessus de la ligne d'horizon, elle couvre la lettre »). Traduis chaque
  delta en nouvelles coordonnées, réécris, re-rends, re-juge avec un juge
  FRAIS.
- **REFAIRE** : le problème n'est pas le placement mais le texte (une réplique
  trop longue pour toute case disponible, un locuteur absent de sa case). Cela
  remonte au script : renvoie vers `/bd-dialogues` plutôt que de bricoler.

**Trois tours au maximum.** Au-delà, livre la meilleure version avec le verdict
honnête et ce qui bloque.

## Étape 5 : valider et consigner

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" set-lettrage <plancheId> --file <bulles.json> --valider
```

Puis une entrée de journal par planche : ce que le juge a fait bouger, et ce
qui reste discutable. Un placement validé sans trace de ce qu'on a corrigé se
rediscute entièrement au tirage suivant.

## Étape 6 : livrer

Récapitule : les planches lettrées et validées, celles qui restent, ce que les
juges ont fait bouger, ce qui reste fragile. Coût : zéro, rien ne se génère ici.

Termine par `🎉 LETTRAGE POSÉ (n planches)`.

## Règles

- **Tu ne touches jamais aux couleurs de bulles.** Elles viennent des fiches de
  personnages et valent pour tout l'album : les changer ici les désaccorderait
  d'une planche à l'autre. Si deux couleurs se confondent, dis-le et renvoie
  vers `/bd-personnages`.
- **Tu ne changes pas la police.** Elle est arrêtée par la bible graphique.
- **Un ordre de lecture cassé ne se rattrape par rien.** Ni par la beauté du
  placement, ni par la lisibilité : c'est le seul défaut qui empêche VALIDER à
  lui tout seul.
- **Une bulle hors de sa case n'est pas un détail de placement** : le lecteur
  attribue la réplique au mauvais personnage.
- Les codes QR ne se déplacent pas comme des bulles : ils visent une ancre
  imprimée pour toujours. S'ils gênent, c'est la composition de la case qu'il
  faut revoir.
