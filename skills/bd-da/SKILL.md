---
name: bd-da
description: Pose la direction artistique de l'album. Compose 3 à 5 pistes graphiques franchement contrastées, les fait générer en vrai sur une même scène étalon, les fait juger sur leur lisibilité en petit et leur robustesse sur soixante planches, puis verrouille le cadre, la palette, la police et la bible graphique. Utiliser après le scénario, quand la personne dit « la direction artistique », « à quoi ça ressemble », « /bd-da », « le style de l'album ».
argument-hint: "[projet] [--auto] [--budget 5]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et curl."
---

# La direction artistique : choisir un style qui tiendra soixante planches

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.
- **Annonce toujours un coût AVANT de le dépenser**, et demande confirmation en
  mode guidé. Ici on génère de vraies images : c'est le premier moment du
  harnais où l'on dépense de l'argent.

Le piège de cette étape est de choisir le style le plus beau. Le bon style
n'est pas le plus beau sur une image : c'est celui qui tient encore à la
planche 43, quand le modèle aura légèrement dérivé quarante-deux fois.

## Étape 0 : reprendre le fil

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" project <projet>
node "$S" docs <projet>          # brief, bible, et déjà une bible graphique ?
node "$S" scenario <projet>      # la structure, pour choisir la scène étalon
node "$S" me                     # les clés en place ?
```

Si aucun accès n'est enregistré, envoie vers `/bd-connect` et arrête-toi.
Si les clés d'image ne sont pas configurées, dis-le : rien ne pourra être
généré, et cette étape n'a pas de version « à blanc » utile.

Si une bible graphique existe déjà, ne la refais pas en silence : montre ce
qu'elle dit et demande s'il s'agit de la revoir ou de repartir de zéro.

## Étape 1 : la scène étalon

Toutes les pistes seront générées sur **la même scène**. C'est ce qui rend le
choix possible : comparer un portrait et une scène de foule ne compare rien.

Une bonne scène étalon :

- est déjà validée dans la structure (pas une scène qu'on invente ici) ;
- fait tenir ensemble **deux personnages principaux au moins** et **un lieu
  fort** ;
- comporte à la fois un plan large et un visage : le style doit prouver qu'il
  tient aux deux échelles.

En guidé : propose-en deux ou trois, laisse choisir. En `--auto` : prends la
plus dense en casting parmi les scènes validées, et dis laquelle.

## Étape 2 : composer les pistes

Lis `${CLAUDE_SKILL_DIR}/../../templates/profils-graphiques.md`.

Compose **3 à 5 pistes franchement contrastées**. Trois nuances de roman
graphique ne posent aucun choix : il faut que la personne puisse dire « celle-là
n'est pas du tout mon album » et que cela ait du sens.

Pour chaque piste :

1. **Un bloc de style** : les neuf dimensions en prose, tel qu'il partira dans
   chaque prompt de planche. C'est le futur cadre du projet.
2. **Une justification d'ingénierie** : pourquoi ce style survivra aux
   variations du modèle. Si tu ne sais pas répondre, la piste n'est pas prête.

Déforme les profils plutôt que de les recopier : prends-en un et change deux
dimensions. Un album qui ressemble exactement à un profil du catalogue est un
album qui n'a pas cherché.

## Étape 3 : générer, pour de vrai

Par piste, **deux images** de la scène étalon. Deux, parce qu'une seule ne dit
rien de la stabilité du style, et c'est justement ce qu'on veut mesurer.

```bash
node "$S" essai <projet> --kind da-piste \
  --prompt "<bloc de style>, <la scène étalon>" \
  --quality low --n 2 --wait
```

Qualité basse par défaut : on juge un style, pas un rendu final. On monte en
qualité seulement sur la piste retenue, s'il faut trancher entre deux
finalistes.

**Avant de lancer** : annonce le nombre d'images, le coût estimé, et le total.
En guidé, attends le feu vert. Si un budget est passé, ne le dépasse pas, même
d'une image.

## Étape 4 : montrer et faire juger

1. Pose les images sur la Toile, **en grappes par piste**, chaque grappe
   annoncée par un bloc qui porte le nom de la piste et son bloc de style :

```bash
node "$S" new-node <projet> --type note --title "Piste : <nom>" --x .. --y ..
node "$S" new-node <projet> --type image --title "<nom> 1" --ref <imageId> --x .. --y ..
```

2. Fais juger **chaque piste** par le juge des pistes DA : ses deux images plus
   son bloc de style. Passe par `_vision-qa` pour le téléchargement des images
   et le lancement du subagent, en lui indiquant la grille `da`.

Les pistes se jugent **en parallèle** : elles sont indépendantes.

3. Restitue en clair : pour chaque piste, ce que le juge a vu, à quoi ça
   ressemble, **où ça cassera**, et son verdict.

## Étape 5 : choisir

En guidé : montre les grappes, les verdicts, et laisse trancher. Rappelle,
sans insister, que le critère qui coûte le plus cher plus tard est la
robustesse, pas la beauté.

En `--auto`, suis le verdict du juge, pas une seconde règle de ton cru :

1. **Une seule piste `PORTEUSE`** : c'est elle. Applique ses trois ajustements
   de bloc avant de verrouiller : « porteuse » veut dire « porteuse une fois
   corrigée », jamais « bonne telle quelle ».
2. **Plusieurs `PORTEUSE`** : la meilleure `robustesse` l'emporte, puis la
   meilleure `lisibilite`.
3. **Aucune `PORTEUSE`** : ne choisis pas. Prends la meilleure `robustesse`,
   applique ses ajustements, **et refais un tour d'images** avec le bloc
   corrigé. Verrouiller une DA qu'aucun juge n'a trouvée porteuse, c'est
   installer pour soixante planches un problème que deux images auraient
   suffi à voir.

Consigne le choix et sa raison au journal.

Deux garde-fous appris en conditions réelles :

- **Une note faible sur une dimension ne disqualifie pas une piste porteuse.**
  Une lisibilité moyenne est un défaut du BLOC (contraste, hiérarchie des
  valeurs), pas du style : elle se corrige en une phrase. Une robustesse
  faible, elle, est une propriété du style, et rien ne la corrige.
- **Ne double jamais la règle du juge par un seuil à toi.** Si tu ajoutes un
  filtre que la grille ignore, tu peux écarter la seule piste que le juge a
  déclarée porteuse, et personne ne saura pourquoi.

Une piste peut être choisie **contre** l'avis du juge : c'est légitime, et cela
se consigne comme tel. Le juge écarte ce qui est faux, l'humain choisit ce qui
est bon.

## Étape 6 : verrouiller

C'est l'étape qui transforme un choix en règle. Ne la saute pas : une DA
choisie mais pas écrite se dissout en trois séances.

1. **Le cadre** dans le modèle de prompt du projet :

```bash
node "$S" set-template <projet> --file cadre.txt
```

2. **La bible graphique**, depuis
   `${CLAUDE_SKILL_DIR}/../../templates/bible-graphique-squelette.md` :
   le cadre, les codes couleur par fil, les motifs, les négatifs, la grammaire
   de mise en page, la police, et **ce qui a été écarté avec sa raison**.

```bash
node "$S" new-doc <projet> --kind bible-graphique --file bible-graphique.md
```

3. **Les images de la piste retenue** promues en entrées `style` de l'univers.

   **Avant de promouvoir, relis chaque image contre les négatifs que tu viens
   d'écrire.** Une planche de style est ce que le modèle imitera soixante fois :
   si elle contient précisément ce que la bible interdit, elle enseigne le
   contraire de la consigne, et aucun prompt ne rattrapera cela. Le cas s'est
   produit à CP2 : la planche retenue portait une grande masse blanche flottant
   au milieu du décor, que les négatifs du même document venaient d'interdire.

   Une image qui contredit un négatif se recadre, ou se remplace. Ne la promeus
   pas en te disant que le prompt corrigera : le prompt dit, l'image montre, et
   c'est l'image qui gagne.

```bash
node "$S" promote-image <imageId> --style "<nom de la piste>"
```

4. **La police du lettrage** : le catalogue de l'atelier en propose seize,
   libres de droits, avec un aperçu. Montre-les, ou laisse importer la sienne
   (l'atelier demandera d'attester des droits). Le choix se fait dans les
   paramètres de l'univers.

5. **Les pistes perdantes** écartées avec leur raison, sur la Toile (statut
   `ecarte` + raison, qui se lit dans la corbeille du rail) et au journal.

## Étape 7 : livrer

Récapitule : la piste retenue et pourquoi, ce qu'elle porte, où elle cassera
et ce qu'on surveillera, la police, et le coût réel dépensé
(`node "$S" costs <projet>`).

Annonce la suite (`/bd-design` : les personnages et les décors, puis la
planche test).

Termine par `🎉 DIRECTION ARTISTIQUE POSÉE`.

## Règles

- **Générer moins de deux images par piste ne prouve rien.** C'est l'écart
  entre les deux qui dit si le style absorbe les variations.
- **Ne jamais monter en qualité pour départager des pistes de principe.** La
  qualité change le rendu, pas la robustesse.
- **La lisibilité se juge en petit.** Si tu ne montres que des images en grand,
  tu fais choisir sur un critère qui ne sera jamais celui du lecteur.
- **Le cadre écrit dans le projet et celui de la bible graphique doivent être
  identiques.** Si l'un change, l'autre change dans la même séance.
- N'invente pas un style « inspiré de » un auteur vivant nommément. Décris des
  qualités graphiques, pas une signature à imiter.

## En mode tuto

Si `me` dit `parcours.actif`, suis le protocole de
`${CLAUDE_SKILL_DIR}/../../templates/tuto.md` : ouvre par le contexte
(« Étape n sur 11 : ... »), termine par l'instruction miroir (où aller dans
l'atelier, quoi regarder, puis quoi taper), marque un « vu » quand la
personne dit qu'elle a regardé, une étape à la fois. En `--auto`, dis que le
tuto ne s'applique pas, et déroule.
