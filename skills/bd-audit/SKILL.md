---
name: bd-audit
description: Passe l'album entier au crible, par lots traités en parallèle : dates et âges, noms et orthographes, mécaniques du monde, arcs des personnages, rappels sans écho ou sans mise en place, et fidélité aux sources s'il y en a. Consolide, corrige par l'atelier, et consigne ce qui a été propagé. Utiliser à tout moment, et recommandé avant la planche test et avant toute production. Quand la personne dit « vérifie tout », « /bd-audit », « est-ce que ça tient ».
argument-hint: "[projet] [--auto] [--lot acte-2]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# L'audit : ce qui ne tient plus, et depuis quand

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.

Un récit long se contredit sans que personne ne s'en aperçoive : l'auteur se
souvient de ce qu'il voulait écrire, pas de ce qu'il a écrit. Un lecteur, lui,
n'a que le texte, et il compte les années.

Cet audit se fait **en lots parallèles**, chacun confié à un agent qui ne voit
que son lot. C'est ce découpage qui permet de couvrir un album entier sans
qu'un seul contexte ait à tout tenir.

## Étape 1 : rassembler la matière

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" scenario <projet>          # la structure et les scènes
node "$S" docs <projet>              # brief, bible, bible graphique
node "$S" universe <projet>          # personnages, variantes, décors
node "$S" journal <projet>           # les décisions déjà prises
node "$S" sources <projet>           # s'il y a des sources
```

Le **journal** est la pièce la plus importante : il porte des arbitrages. Une
« incohérence » qu'une décision de journal explique n'en est pas une, et un
agent qui ne l'a pas lu la signalera à tort.

## Étape 2 : découper en lots disjoints

Un lot = un acte, plus un lot pour les annexes (bibles, univers, sources).

Les lots doivent être **disjoints** : deux agents qui voient la même scène
rendront deux fois la même remarque, et la consolidation devient un travail de
tri au lieu d'un travail de synthèse.

Chaque lot reçoit : sa matière, **plus** les bibles et le journal en entier
(c'est le référentiel, il ne se découpe pas).

## Étape 3 : lancer les agents

Un subagent par lot, **tous dans un seul message** pour qu'ils travaillent en
parallèle. Chacun cherche les six mêmes choses :

### `dates et âges`
Les durées annoncées s'additionnent-elles ? Un personnage a-t-il l'âge qu'il
devrait avoir compte tenu des ellipses ? Un événement daté est-il compatible
avec ce qu'on en dit ailleurs ?

### `noms et orthographes`
Un même lieu, une même personne, une même organisation s'écrivent-ils
identiquement partout ? (Le cas le plus fréquent, et le plus visible en
lecture.)

### `mécaniques et coûts`
Si le monde a des règles (une technologie, un pouvoir, une économie, une
contrainte), sont-elles appliquées de la même façon partout ? Une règle qui
coûte quelque chose la première fois et rien la deuxième détruit la tension
rétroactivement.

### `arcs`
Chaque personnage principal finit-il ailleurs qu'il n'a commencé ? Le
changement est-il **montré** quelque part, ou seulement affirmé à la fin ?

### `rappels`
Deux défauts symétriques :
- un rappel **sans écho** : quelque chose est mis en place et ne resservira
  jamais ;
- un rappel **sans mise en place** : quelque chose est convoqué comme si on le
  connaissait, sans que rien ne l'ait préparé.

### `fidélité` (seulement si le projet a des sources)
Ce que l'album affirme est-il soutenu par ce que les sources disent ?
Signale les affirmations sans source, et les sources dont l'album force le
propos.

Chaque agent rend une liste : **le point exact** (scène, document, entrée), le
type, la gravité (`bloquant` / `à corriger` / `à surveiller`), et ce qu'il
propose. Pas de généralités.

## Étape 4 : consolider

1. **Dédoublonne** : deux agents peuvent signaler la même chose depuis deux
   lots (c'est le propre d'une incohérence : elle est à deux endroits).
2. **Écarte ce que le journal explique.** Un écart consigné est une décision.
3. **Classe par gravité**, puis par coût de correction.
4. Présente : ce qui bloque, ce qui se corrige, ce qui se surveille.

## Étape 5 : corriger

En guidé : propose les corrections une par une, groupées par nature. En
`--auto` : applique ce qui est factuel et sans ambiguïté (orthographes, dates
qui découlent d'un calcul), et **laisse tout le reste** en liste.

```bash
node "$S" write-node <id> --file patch.json
node "$S" set-entry <projet> <entryId> --file patch.json
node "$S" write-doc <id> --file patch.json
```

**Ne corrige jamais un fait sans source.** La bible tranche. Si la bible est
muette, c'est une décision d'auteur : signale-la, ne la prends pas.

Quand une correction touche un fait qui vit à plusieurs endroits (un nom, une
date, une règle), corrige **partout**, et note la liste.

## Étape 6 : consigner

```bash
node "$S" journal-add <projet> --file entree.json
```

L'entrée porte : ce qui a été audité, ce qui a été trouvé, ce qui a été
corrigé, et surtout une ligne **« Propagé : »** énumérant tous les endroits
touchés par une même correction. C'est elle qui évite qu'un audit suivant
redécouvre la moitié du travail.

## Étape 7 : livrer

Récapitule : combien de lots, ce qui bloquait, ce qui a été corrigé, ce qui
reste ouvert et pourquoi.

Termine par `🎉 AUDIT PASSÉ` si rien ne bloque, ou par la liste de ce qui
bloque, sans emballage.

## Règles

- **Un audit qui ne trouve rien est suspect.** Dis-le : soit l'album est
  vraiment propre, soit le découpage était trop grossier.
- **La gravité n'est pas la fréquence.** Une seule date fausse peut casser un
  acte ; vingt variations d'orthographe agacent sans rien casser.
- **Ne réécris pas en auditant.** Un audit signale et corrige des faits ; il ne
  refait pas le style. Si une scène est mal écrite, c'est un autre travail.
- **Les propositions d'un agent qui contredisent le journal perdent.** Le
  journal porte des arbitrages qu'il n'a pas connus.
