---
name: bd-planche-test
description: La planche test, sur une vraie scène du récit : la preuve que tout le pipeline tient (la direction artistique, les personnages, les décors, la génération des cases puis de la planche, le lettrage). Son pré-vol vérifie que chaque personnage et chaque décor que la scène montre a ses références. Vient après le scénario signé ; c'est elle que le pilote d'album attend, validée, avant de commencer. Utiliser quand la personne dit « la planche test », « /bd-planche-test », « on essaie une planche ».
argument-hint: "[projet] [--scene <id>] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et une clé d'images configurée dans l'atelier."
---

# La planche test : une vraie page, pour tout éprouver

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.
- **Annonce toujours un coût AVANT de le dépenser.**

C'est la preuve que **tout** le pipeline tient. Une jolie illustration ne
prouve rien : la planche test se fait sur un vrai script, dans une vraie
scène, et peut devenir la vraie planche de cette scène. Rien n'est perdu.

## Étape 0 : le pré-vol

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" docs <projet> --kind bible-graphique
node "$S" universe <projet>
node "$S" nodes <projet>
node "$S" costs <projet>
```

- **Sans bible graphique**, envoie vers `/bd-da`.
- **Sans scène validée**, envoie vers `/bd-scenario` : il faut une vraie scène.
- **La scène** : celle que `--scene` désigne, sinon la scène étalon de la DA
  (le journal la nomme), sinon propose une scène courte et représentative
  (deux personnages principaux, un décor récurrent, de l'action et du
  dialogue).
- **Les références** : pour chaque personnage casté dans la scène
  (`meta.castingIds`) et chaque décor (`meta.decorIds`), la variante a-t-elle
  ses images étoilées et son texte de rappel ? **Ne pars pas s'il en manque** :
  dis ce qui manque et renvoie vers `/bd-perso` ou `/bd-decors`.

## Étape 1 : la planche

1. Crée une planche réelle dans le projet, rattachée à la scène.
2. Écris son **gabarit de double page** (voir `/bd-dialogues` : la place et
   la taille de chaque case, ses personnages, son décor) et un **court
   script de 4 à 6 cases**. On teste la fabrication, pas l'écriture.
3. Caste les variantes, case par case.
4. Génère comme en production, **des cases à la planche** : chaque case
   seule, retiens-les, puis la planche entière, qui part de ses cases.

```bash
node "$S" create-planche <projet> --title "<titre de la scène>"
node "$S" write <plancheId> --file script.json      # puis vérifie qu'il a pris
node "$S" generate <plancheId> --mode case --case <caseId> --quality medium --wait   # chaque case
node "$S" validate <varianteId> --case <caseId>
node "$S" generate <plancheId> --mode planche --quality high --wait
```

La qualité est celle que la personne a retenue : elle s'annonce et se demande
à la première génération du projet, puis se consigne au journal (voir
`${CLAUDE_SKILL_DIR}/../../templates/qualite.md`). Par défaut : les cases en
moyenne, la planche entière en haute définition. Ne donne aucune taille :
l'atelier connaît la double page, et chaque case sort au ratio de son
emplacement.

5. Passe au regard (`_vision-qa`), en donnant **le script demandé** comme
   référence : c'est la dimension `script` qui se joue ici.
6. Dérive le lettrage, pour voir les bulles se poser :

```bash
node "$S" derive-lettrage <plancheId>
```

7. Présente le résultat. **Si la personne l'accepte, valide la planche et son
   lettrage** : c'est ce que le pilote d'album (`/bd-album`) vérifie avant de
   commencer.

```bash
node "$S" validate <varianteId>                # l'image de la planche entière
node "$S" set-lettrage <plancheId> --valider   # son lettrage, une fois les bulles à leur place
```

Les bulles se posent d'abord comme le dit `/bd-lettrage` (rendu avec
repères, contrôle, juge). En `--auto`, valide si le regard a rendu VALIDER,
et dis-le.

Si la planche test échoue, ce n'est pas un échec de l'étape : c'est
exactement ce à quoi elle sert. Dis ce qui a cassé, et où : la DA, une
variante, le script, ou le pipeline.

## Étape 2 : le bilan

```bash
node "$S" costs <projet>
```

Le coût **réel**, ventilé (cases, planche), et l'estimation pour l'album
entier. Consigne au journal ce qui a été prouvé et ce qui reste fragile.

## Étape 3 : livrer

Récapitule : la planche, ce qu'elle prouve, le coût réel et l'estimation de
l'album. Annonce la suite : les voix (`/bd-voix`), puis le pilote d'album
(`/bd-album`).

Termine par `🎉 PLANCHE TEST FAITE`.

## Règles

- **Un refus du fournisseur se traite selon la doctrine commune**
  (`${CLAUDE_SKILL_DIR}/../../templates/refus.md`).
- **Pas de planche test sans références** pour ce qu'elle montre.
- **La planche test se fait sur un vrai script**, jamais sur une image d'ambiance.
