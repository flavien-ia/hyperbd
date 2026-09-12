---
name: bd-planches
description: Le gros œuvre : produit les planches d'une scène en images, une par une. Vérifie que tout est prêt avant de dépenser (bible graphique, variantes castées, scripts, budget), génère, fait regarder chaque planche par un juge multimodal avec les références sous les yeux, itère ou régénère selon son verdict, valide et dérive le lettrage. Affiche le coût à chaque pas. Utiliser après les dialogues, quand la personne dit « produis les planches », « dessine la scène », « /bd-planches ».
argument-hint: "[projet] [--scene <id>] [--planches id,id] [--budget 5] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et une clé d'images configurée dans l'atelier."
---

# Produire les planches

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher, et **le coût cumulé à chaque planche**.

C'est la seule skill qui dépense vraiment. Tout ce qui précède est du texte et
ne coûte rien ; ici, chaque tour se paie. La discipline n'est donc pas une
précaution, c'est le cœur du métier : une planche mal préparée coûte le même
prix qu'une bonne, et se découvre après.

## Étape 0 : le pré-vol

Quatre vérifications avant la moindre dépense. Si l'une manque, **arrête-toi et
dis laquelle** : produire quand même, c'est fabriquer des images à refaire.

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind bible-graphique
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" universe <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" planches <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" costs <projet>
```

1. **La bible graphique existe et le style est verrouillé.** Sinon : `/bd-da`.
   Dessiner avant d'avoir arrêté le style, c'est produire des images à jeter.
2. **Les variantes sont castées et ont leurs images de référence étoilées.**
   Une planche se caste avec des VARIANTES (un costume, un âge, un état), pas
   avec des personnages en général. Sinon : `/bd-design`.
3. **Les scripts modulaires sont posés**, cases et répliques. Sinon :
   `/bd-dialogues`.
4. **Le budget.** En guidé, annonce le coût estimé du scope et attends l'accord.
   **En `--auto`, `--budget` est OBLIGATOIRE** : une boucle qui dépense sans
   plafond est un défaut, pas une commodité.

Annonce ensuite, en clair : le nombre de planches du scope, le coût estimé, le
coût déjà dépensé sur le projet.

## Étape 1 : planche par planche, dans l'ordre du récit

Pour chaque planche du scope, dans l'ordre où on la lira :

### 1. Générer

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" generate <plancheId> --quality medium --mode planche --wait
```

Le mode `planche` produit la double page d'un coup. `page-left`, `page-right`
et `case` servent aux reprises ciblées : quand une seule case cloche, on ne
repaie pas toute la planche.

**Le texte ne se dessine jamais dans l'image.** La commande demande d'office
des planches sans lettrage : le modèle réserve les espaces, et rien d'autre.
C'est ce qui rend possible tout ce qui suit : dériver les répliques du script,
les composer dans la police de l'album, les traduire, sortir un export sans
texte pour l'imprimeur. Un dialogue peint dans les pixels est définitif, et il
arrive dans une police que personne n'a choisie. Ne passe `--dialogue-mode
model` que si quelqu'un veut délibérément une planche où le modèle écrit, en
sachant qu'elle sort alors de la chaîne de lettrage.

### 2. Regarder

Fais examiner l'image par `_vision-qa`, avec les références SOUS LES YEUX du
juge :

- **les fiches des variantes CASTÉES sur cette planche** (pas le personnage en
  général) ;
- **le décor** de la scène ;
- **la planche de style** ;
- **la planche précédente VALIDÉE de la même scène**, pour la continuité.

Deux pièges appris à la production, qui coûtent cher si on les ignore :

- **La planche de style ne porte pas l'identité d'un personnage.** Si elle
  montre quelqu'un, détoure-le ou dis explicitement au juge de ne pas s'y fier
  pour un visage : sinon il compare un personnage à un autre.
- **Une image de référence peut contredire la bible qu'elle est censée
  incarner.** Quand les deux divergent, c'est la bible qui fait foi, et l'écart
  se consigne.

### 3. Trancher, selon le verdict

- **VALIDER** : retiens la variante.
  ```bash
  node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" validate <varianteId>
  ```
- **ITÉRER** : un défaut localisé. Repasse le delta du juge en `--extra`, sans
  toucher au reste du prompt. **Trois tours par planche au maximum**, et le
  coût cumulé s'affiche à chaque tour.
- **RETOUCHER** : quand le delta du juge ne concerne qu'une case (un visage,
  une main, un objet, un détail de décor), ne régénère pas la planche :
  repeins la case sur l'image elle-même, le reste est gardé tel quel.
  ```bash
  node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" retouch <varianteId> --case <caseId> --consigne "<le delta, tel quel>" --wait
  ```
  Une image en retour, une variante de plus dans la mosaïque, l'originale
  intacte. C'est le tour le moins cher et le plus sûr : à préférer à ITÉRER
  dès que le juge nomme une case. Une image de case se retouche avec
  `--rect x,y,w,h` (fractions de l'image) ; une couverture aussi.
- **REGÉNÉRER** : le rendu est à côté. Reprends depuis le prompt, jamais depuis
  un « presque » : partir d'une image ratée pour la rattraper coûte plus cher
  que recommencer, et donne moins bien.

### 4. Dériver le lettrage

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" derive-lettrage <plancheId>
```

Le lettrage suit la production : les bulles naissent avec la planche. Les
PLACER et les valider, c'est le travail de `/bd-lettrage` : ne le fais pas ici.

## Quand le fournisseur refuse

Une génération peut revenir en erreur avec une **raison** (`errorReason`) :
`refus_securite`, `credit_epuise`, `plafond_facturation`, `limite_debit`,
`cle_refusee`, `autre`. La conduite pour chacune est fixée dans
`${CLAUDE_SKILL_DIR}/../../templates/refus.md` : lis-la au premier refus, et
applique-la sans la réinterpréter. En deux lignes :

- **`refus_securite`** : ne relance jamais à l'identique. Reformule ce que
  l'image montre (suggérer, hors champ, retirer les mots qui déclenchent,
  aucune personne réelle, vérifier les références), trois tours au maximum,
  puis fais la planche autrement (une case, un autre cadrage, un import) et
  écris-le au journal.
- **`credit_epuise`, `plafond_facturation`, `cle_refusee`** : arrête la
  scène proprement, dis ce qu'il faut faire, ne marque rien comme raté.
  `limite_debit` : attends une minute, une fois. `autre` : un essai, puis
  montre le message brut.

Dis toujours la raison en clair à la personne, et ce que ça a coûté.

## Étape 2 : le rythme du travail

- **En guidé, arrête-toi à CHAQUE planche.** L'humain regarde dans l'atelier
  web, où le canvas est commun, et tranche. C'est lui qui décide, pas toi.
- **En `--auto`, le juge tranche** et tout va au journal : chaque planche, son
  verdict, ses tours, son coût. Une planche produite sans trace est une planche
  qu'on ne saura pas refaire.

## Étape 3 : le bilan du scope

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" costs <projet>
```

Dis, sans arrondir en ta faveur : le coût RÉEL (pas l'estimation), les planches
validées, celles en attente, celles qui ont demandé plusieurs tours et
pourquoi, ce qui reste fragile pour la suite.

Puis une entrée de journal.

Termine par `🎉 SCÈNE PRODUITE (n planches, x $)`. Si le scope n'a pas été
tenu, ne le termine pas ainsi : rends le bilan honnête, avec ce qui bloque.

## Reprise

Relancer cette skill relit l'état du serveur : quelles planches ont une image,
laquelle est validée, ce qui a coûté quoi. **Jamais un fichier local.** Une
session interrompue au milieu d'une scène reprend à la planche suivante sans
rien reconstituer.

## Règles

- **Le budget est un plafond, pas une estimation.** L'atteindre arrête la
  boucle et rend le bilan de ce qui a été fait.
- **Le coût s'affiche à chaque pas**, cumulé. Une dépense qu'on découvre à la
  fin est une dépense qu'on n'a pas décidée.
- **On ne repart jamais d'un « presque ».** C'est la fausse économie la plus
  chère de tout le harnais.
- **Une planche validée ne se regénère pas** sans le dire et sans l'écrire au
  journal : quelqu'un a peut-être déjà lettré dessus.
- **La continuité se juge contre la planche précédente VALIDÉE**, jamais contre
  la dernière version produite : sinon la dérive s'installe planche après
  planche sans que rien ne la signale.
- Si une planche demande trois tours, c'est presque toujours le script qui est
  en cause, pas le modèle. Dis-le au lieu de payer un quatrième tour.
