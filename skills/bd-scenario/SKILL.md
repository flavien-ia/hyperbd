---
name: bd-scenario
description: Construit le récit : les chapitres, les scènes dans leur ordre, leur mise en scène, les rappels qui relient un setup à son écho, les documents du monde, et le budget de planches qui doit tomber sur le format visé. Se termine par un audit de cohérence mené par plusieurs relecteurs en parallèle, et par le pitch d'une page à valider. Utiliser après les personnages, quand la personne dit « écris le scénario », « /bd-scenario », « on structure l'histoire ».
argument-hint: "[projet] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Le scénario : le récit dans son ordre

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher, scène par scène quand tu écris.

Tu construis le récit. À la fin, la Toile porte les chapitres et les scènes dans
leur ordre (une colonne par scène, les chapitres en bandes), chacune avec son
synopsis, son budget et sa mise en scène, et le total tombe sur le format
annoncé au brief.

## Étape 0 : reprendre le fil

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind brief
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind bible
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" nodes <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" journal <projet> --limite 20
```

Le journal compte autant que la bible : il dit ce qui a été écarté et pourquoi.
Une skill qui ressort une idée abandonnée fait perdre confiance.

## Étape 1 : la charpente

Propose 2 ou 3 découpages en chapitres contrastés (pas trois variantes du
même), posés sur la Toile comme propositions (des notes, une par découpage).
Chacun tient en quelques lignes : ce que chaque chapitre fait, et sur quoi il
bascule.

Fais juger par `dramaturgie`. Fais trancher, ou tranche en `--auto`.

## Étape 2 : les scènes

Pose les chapitres (type `acte`) et les scènes dans l'ordre, chaque chapitre
juste avant ses scènes : un chapitre prend les scènes qui le suivent jusqu'au
suivant. Une fois les scènes créées, tu peux fixer ses bornes en écrivant le
bloc (`meta.premiere`, `meta.derniere` : les identifiants de sa première et
de sa dernière scène) ; c'est ce que la personne fait quand elle trace une
bande à la souris, et ce sont ces bornes qui font foi.

Pour chaque scène, dès sa création :

- un **titre** qui dit ce qui s'y passe, pas ce qu'elle signifie ;
- un **synopsis de deux lignes** : c'est ce qu'on lira dans la Structure ;
- le **lieu** et la **date** dans la fiction ;
- le **budget de planches**.

**Le budget se pose scène par scène et se somme.** Le total doit tomber sur le
format du brief. S'il déborde, ce n'est pas au maquettiste de rattraper : il
faut couper ou fusionner des scènes maintenant. Dis-le, chiffres à l'appui.

## Étape 3 : la mise en scène

Pour chaque scène, écris son corps (`body`, la mise en forme) : qui est là, ce
qui s'y passe, ce que ça déplace, l'atmosphère. C'est de la prose de travail,
lue par la direction artistique et par le découpage : elle doit être précise
sur les gestes et les lieux, sans décrire les cases (ce sera le temps suivant).
Une scène porte deux autres textes : `dialogue` pour les répliques d'esquisse
(en markdown, « **Nom** : réplique »), `notes` pour ce qu'on se dit à
soi-même (ce que la scène doit faire, ce qui reste à trancher). Le casting
(`meta.castingIds`) et les décors (`meta.decorIds`) se donnent dès la
création : ce sont eux qui dessinent les fils de présence sur la Toile.

Ajoute, quand c'est utile :
- des **notes de direction artistique** (ce qu'il faut voir, ce qu'il ne faut
  pas montrer) ;
- **pourquoi cette scène existe**. Une scène qui ne sait pas répondre se coupe
  ou se fusionne. C'est la question la plus rentable de tout le processus.

## Étape 4 : les rappels

Trace les liens `rappel` entre ce qui est installé et ce qui le paie plus tard.
Le label dit le fil (« la promesse tenue trop tard »).

Vérifie ensuite les deux défauts symétriques :
- un **setup sans écho** : une promesse non tenue ;
- un **écho sans setup** : quelque chose qui tombe du ciel.

Ajoute un lien `tension` quand une scène charge une relation, et `cause` quand
une scène en entraîne une autre.

## Étape 5 : les documents du monde

Si l'univers a des forces qui s'affrontent, écris leurs textes (manifeste,
article, rapport, chanson, débat). **La forme d'un document doit incarner la
thèse de son camp** : un texte prémédité et signé ne dit pas la même chose
qu'un chant anonyme, avant même qu'on en lise le contenu.

Chaque document va dans l'atelier (`kind: diegetique`) avec, en tête, ce qu'il
est : sa nature, sa date dans la fiction, et comment il apparaîtra dans l'album.

## Étape 6 : l'audit

Le contrôle final, mené par plusieurs relecteurs EN PARALLÈLE sur des lots
disjoints (un par chapitre). Chacun vérifie sur son lot : les dates et les âges, les
noms, les mécaniques du monde, les arcs, les rappels, et la fidélité au message
si le projet a une source.

Lance-les en un seul message (ils sont indépendants), consolide les écarts,
corrige, puis fais une passe de `coherence` sur l'ensemble.

## Étape 7 : le pitch, et la validation

Écris le **pitch d'une page** (`kind: pitch`) : la prémisse, la distance, les
personnages, la promesse faite au lecteur, et ce que l'album fera de son sujet.

C'est le document qu'on soumet. En guidé, demande la validation : c'est le
jalon qui engage la suite (la direction artistique coûte de l'argent, le
scénario non). En `--auto`, écris-le et signale qu'il attend une lecture.

Termine par `🎉 SCÉNARIO POSÉ`, avec le compte des scènes et le budget total
face au format visé.

## Règles

- **Le budget est un engagement, pas une estimation.** Trente scènes à trois
  planches font quatre-vingt-dix planches, quel que soit le format annoncé.
- **Une scène qui ne déplace rien** se coupe, se fusionne, ou s'assume comme
  respiration (et alors on le dit).
- **Deux scènes qui font le même travail** sont l'erreur la plus coûteuse :
  elle se voit à la lecture et jamais à l'écriture. Cherche-la activement.
- Ne rédige pas les dialogues finaux ici : ils naissent avec le découpage, case
  par case, au temps suivant. Des répliques d'esquisse dans la mise en scène,
  oui ; le dialogue canonique, non.
