---
name: bd-brief
description: Le point de départ d'une bande dessinée. Part d'une idée ou d'un document de référence (rapport, programme, thèse), en extrait l'architecture du message, pose les questions qui comptent (à qui on parle, sur quel canal, quel format, quel ton), fait choisir la distance de transposition (du didactique incarné au mythopoétique), chiffre ce que ça coûtera, et crée le projet dans l'atelier. Le plus souvent on y arrive par /new-bd, qui a déjà créé le projet. Utiliser quand la personne dit « je veux faire une BD sur... », « /bd-brief », « on part de ce rapport », ou au tout début d'un projet.
argument-hint: "[projet] [chemin d'un document source, ou rien]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Le brief : ce qu'on raconte, à qui, et de combien loin

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français). Cela vaut pour tout : questions, avancement, confirmations, résumés, erreurs.
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher, et dis toujours où on en est des quatre temps.

Tu ouvres un projet de bande dessinée. À la fin de cette étape, on saura ce
qu'on raconte, à qui, sous quelle forme, et ce que ça coûtera. Rien n'est encore
écrit : c'est justement le moment de trancher ce qui pilotera tout le reste.

## Étape 0 : l'atelier est-il relié ?

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" me
```

En cas d'erreur, invoque `bd-connect` et reviens ici. Sans atelier, on peut
réfléchir mais rien produire.

## Étape 1 : d'où l'on part

Deux cas, et ils ne se travaillent pas pareil.

**Un document de référence** (rapport, programme, thèse, étude) : lis-le EN
ENTIER avant de poser la moindre question. Un document long se lit par parties,
mais il se lit. Puis produis l'**architecture du message** :

- **Les thèses**, chacune avec sa sévérité : `intouchable` (le récit ment sans
  elle), `importante` (elle doit être là, sa forme est libre), `contextuelle`
  (elle enrichit).
- **Les données** qui comptent : chiffres, dates, mécanismes, ordres de grandeur.
  Avec leur degré de certitude, tel que la source le donne.
- **Les tensions internes** : les vrais débats de la source, ceux que les
  auteurs n'ont pas tranchés. C'est le meilleur carburant dramatique qui soit,
  et presque personne ne pense à le chercher.
- **Les publics** que la source vise, et celui qu'on veut atteindre en plus.

**Une idée libre** : fais-la préciser en une conversation courte. Ce qu'on veut
faire comprendre, à qui, et ce qui rendrait la personne heureuse en tenant
l'album fini.

## Étape 2 : les questions qui comptent

En mode guidé, une question à la fois, dans cet ordre. En `--auto`, réponds-y
toi-même et justifie chaque réponse au journal.

1. **À qui on parle.** Âge, familiarité avec le sujet, ce qu'ils en pensent
   déjà. Un lecteur convaincu et un lecteur hostile ne se racontent pas pareil.
2. **Où ça se lit.** Album imprimé, PDF diffusé, planches sur les réseaux,
   support d'exposition. Le canal décide du format autant que le budget.
3. **Le format**, avec son coût :

   | Format | Planches | Pour quoi | Ordre de grandeur |
   |---|---|---|---|
   | Strip | 1 à 4 | réseaux, campagne | quelques euros |
   | Livret | 8 à 16 | PDF, print léger | quelques dizaines d'euros |
   | Album | 48 à 64 | édition, librairie | une à trois centaines d'euros |
   | Série | plusieurs tomes | univers au long cours | par tome |

   Ces montants sont ceux des images seules, sur la clé OpenAI de la personne.
   Ils viennent d'un album réel : environ 0,06 $ la génération, et une planche
   aboutie en demande une trentaine (on cherche, on écarte, on recommence).
   Annonce une fourchette, jamais un chiffre unique, et rappelle que le
   stockage et l'agrandissement final sont aussi à sa charge.
4. **Le ton** : gravité, humour, lyrisme, sécheresse documentaire. Et ce qu'on
   ne veut surtout pas.

## Étape 3 : la distance de transposition

**C'est le choix qui pilote tout l'aval.** Propose les quatre, avec un
mini-pitch écrit POUR CE SUJET (pas une définition générale), pose-les sur la
Toile comme propositions, et laisse arbitrer.

| Distance | Ce que c'est | Sa force | Son risque |
|---|---|---|---|
| Didactique incarné | des personnages réels ou réalistes dans le monde du sujet | crédibilité immédiate | l'ennui |
| Fiction réaliste | une histoire inventée qui dramatise les conclusions | l'identification | le sujet peut s'effacer |
| Allégorie de genre | un monde inventé isomorphe au message | mémorabilité, liberté | la lecture peut manquer la cible |
| Mythopoétique | fable, conte, mythe : la structure devient archétype | portée et durée | la perte du propos |

Recommande, argumente en une phrase, mais ne tranche pas à la place de la
personne en mode guidé. En `--auto`, tranche et consigne pourquoi.

## Étape 4 : créer le projet

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" projects
```

Si tu viens de `/new-bd`, le projet existe déjà : c'est lui. Sinon, crée-le
maintenant (un titre de travail suffit, il se change ensuite dans l'atelier) :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" new-project --title "<titre de travail>"
```

Puis écris deux documents dans l'atelier :

- le **brief** (`kind: brief`) : ce qui a été décidé aux étapes 1 à 3, en clair,
  y compris la distance retenue et le devis annoncé ;
- l'**architecture du message** (`kind: architecture-message`), si le projet a
  une source.

Pose ensuite sur la Toile les premières **questions ouvertes** : ce qui reste à
trancher et qu'on ne veut pas oublier. Consigne la décision de distance au
journal, avec les trois écartées et pourquoi.

## Étape 5 : livrer

Récapitule en clair : ce qu'on raconte, à qui, le format, la distance retenue,
le coût attendu. Puis annonce la suite (`/bd-univers`) et ce qu'elle fera.

Termine par `🎉 BRIEF POSÉ`.

## Règles

- **Ne commence jamais à inventer l'histoire ici.** Le brief cadre, il ne
  raconte pas. Une idée d'univers qui te vient : pose-la comme note sur la
  Toile, elle servira à l'étape suivante.
- **Un document source ne se résume pas de mémoire.** Si tu ne l'as pas lu en
  entier, dis-le et lis-le.
- **Ne promets pas un coût exact.** Le nombre de tentatives par planche dépend
  de l'exigence, et c'est la personne qui la fixe.
- Si le sujet touche à des personnes réelles, à des données sensibles ou à un
  sujet où l'erreur porte à conséquence, dis-le maintenant : cela changera la
  façon de travailler, et il vaut mieux le savoir avant d'écrire.
