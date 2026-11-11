---
name: _recit
description: Helper interne. Les conventions de travail dans la vue Scénario de l'atelier, le fil du récit (en bas) et l'établi (au-dessus) : ce que Claude pose où, comment il fait passer une carte de l'établi au récit, comment il reporte les arbitrages pris dans la conversation, ce qu'il ne touche jamais. Appelé par les skills du récit et de l'univers. Ne pas invoquer directement.
user-invocable: false
allowed-tools: Bash, Read, Write
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Travailler dans la vue Scénario sans marcher sur les pieds de personne

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle de ce que tu poses en termes de récit (« j'ai mis trois prémisses sur l'établi »), jamais en termes de cartes, de blocs ou d'identifiants.

La vue Scénario est un espace partagé. La personne y travaille avec sa souris
pendant que tu y travailles par l'atelier. Elle a deux zones :

- **en bas, le fil du récit** : les scènes dans l'ordre, groupées par
  chapitres. C'est ce qui est **retenu**, ou proposé pour l'être.
- **au-dessus, l'établi** : le brouillon du récit, en mots. Des idées (de
  scène, de rebondissement, de thème) et des bouts de dialogue (répliques).
  C'est ce qu'on **essaie**. Pas d'images ici : elles vivent dans l'univers et
  dans la planche contact.

Le but de la vue : un fil construit, et plus rien qui traîne sur l'établi.
Ces conventions existent pour qu'aucun des deux ne défasse le travail de
l'autre, et pour que l'établi se vide au lieu de s'encombrer.

## Ce qui va où

| Ce que tu as | Où ça va | La commande |
|---|---|---|
| des scènes, des chapitres, des rappels | le fil | `scenario <projet> --file lot.json` |
| des pistes, des alternatives, des prémisses | l'établi, en groupe nommé | `etabli-add <projet> --file cartes.json` |
| un bout de dialogue à placer plus tard | l'établi, genre `replique` | `etabli-add … --genre replique` |
| une question pour la personne | **la conversation**, jamais l'établi | tu la poses, et sa réponse va où elle sert |
| un personnage, un lieu | **l'univers**, jamais la vue Scénario | `new-entry … --proposition` (voir `/bd-perso`, `/bd-decors`) |

**Tu ne donnes jamais de positions.** L'atelier place tout : une scène prend
son rang dans le fil, une carte d'établi se pose sous les cartes existantes,
en grille, et dans un cadre nommé si tu donnes un `groupe`. Ne passe ni `x`,
ni `y`, ni `ancre`.

### Le fil : des scènes, des chapitres, des rappels

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" scenario <projet> --file <lot.json>
```

```json
{
  "nodes": [
    { "type": "acte", "title": "Chapitre 1 : L'appel" },
    { "type": "scene", "title": "La lettre", "meta": { "synopsis": "...", "lieu": "...", "budgetPlanches": 2 } },
    { "type": "scene", "title": "Le départ", "meta": { "synopsis": "..." } }
  ],
  "edges": [{ "from": 1, "to": 2, "type": "rappel", "label": "la lettre" }]
}
```

Un chapitre (`acte`) prend les scènes qui le suivent dans le lot. Les liens
désignent les blocs par leur RANG dans le tableau et ne relient que des
scènes ou des chapitres du lot ; pour relier deux scènes déjà posées, c'est
`new-edge --from <id> --to <id> --type rappel --label "<ce qui revient>"`.
Un lot porte au plus soixante blocs. La même commande, sans `--file`, LIT le
récit (comme `nodes`) ; le corps d'une scène se lit par `node <id>`.

Une scène que tu poses arrive en **proposition** (`idee`, avec ta marque) :
l'atelier la montre en pointillé dans le fil, avec Retenir et Écarter sur la
carte. Une scène posée par la personne, elle, naît retenue (`valide`).

### L'établi : des cartes, en groupes nommés

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" etabli-add <projet> --file <cartes.json>
```

```json
{
  "cartes": [
    { "texte": "Piste A : la ville engloutie\nLa mer monte, et ...", "groupe": "Trois prémisses" },
    { "texte": "Piste B : ...", "groupe": "Trois prémisses" },
    { "texte": "MIRA : Je ne suis pas venue pour qu'on en parle.", "genre": "replique" }
  ]
}
```

- **Un groupe vaut une annonce** : son nom dit ce que c'est (« Trois
  prémisses, angles imposés »). Pas de carte « d'annonce » à part.
- La **première ligne** d'une idée est son titre : c'est ce qui deviendra le
  titre de la scène si elle passe dans le fil. Le reste est son synopsis
  (400 caractères gardés), puis ses notes.
- Une carte que tu poses est une **proposition** (pointillé, Retenir, Écarter).
  Une carte écartée disparaît de la vue (« Écartées » la montre).
- Un personnage ou un décor de l'univers peut s'attacher à une idée (la
  personne l'y glisse depuis la palette) : il entrera au casting de la scène
  que l'idée deviendra.
- Une dizaine de cartes au plus d'un coup : au-delà, la personne ne peut plus
  arbitrer, elle subit. Découpe en étapes.

Lire l'établi : `etabli <projet>` (les cartes vivantes ; `--ranges` montre
aussi celles déjà rangées dans une scène, `--ecartees` celles qu'on a
écartées).

### De l'établi au fil

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" etabli-ranger <projet> --ids <carte,carte> --fin
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" etabli-ranger <projet> --ids <groupe> --apres <sceneId> --titre "..."
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" etabli-ranger <projet> --ids <carte> --scene <sceneId>
```

- `--fin`, `--debut`, `--apres <scène>` : une **scène neuve** naît là (dans
  le chapitre de la scène voisine), retenue. Une idée donne son titre et son
  synopsis, une réplique va au dialogue, une image est jointe.
- `--scene <id>` : les cartes **complètent** cette scène (une idée va à ses
  notes, une réplique à son dialogue, ou à ses notes si la scène a déjà ses
  planches).
- **Un groupe fait UNE scène** : son nom en devient le titre.
- Les personnages et les décors attachés aux cartes entrent dans la scène.

Les cartes rangées quittent l'établi. C'est ainsi qu'il se vide.

## Comment le récit est fait

**L'ordre du récit** est celui du fil, de gauche à droite. **Les chapitres**
(type `acte` dans l'atelier, « chapitre » à l'écran) sont des bandeaux au-dessus
de scènes consécutives ; leurs bornes (`meta.premiere`, `meta.derniere`) font
foi dès que la personne a tiré une scène ou un chapitre. L'ordre et les bornes
sont des décisions d'auteur.

**La fiche d'une scène** porte : `meta.synopsis`, `meta.lieu`,
`meta.dateDiegetique`, `meta.dateSort`, `meta.budgetPlanches` (le format visé
de l'album est `planchesVisees`, réglé par `set-project`, et le fil compare les
deux), `meta.castingIds` et `meta.decorIds` (les personnages et les décors de
l'univers qui y jouent), `meta.intrigues` (les fils du récit) ; et trois
textes : `dialogue`, `notes`, `body` (la mise en forme).

**Le dialogue d'une scène est celui de ses planches.** Tant qu'une scène n'a
pas de planche, son champ `dialogue` porte les répliques d'esquisse et
s'écrit comme les autres champs. Dès qu'elle est découpée, l'atelier n'a plus
qu'un texte : celui qui est lettré sur ses planches, ce qu'on imprime.
`node <scène>` le rend assemblé, avec `dialogueDesPlanches: true` et une
ligne d'intertitre par planche, exactement sous cette forme :

```
## Planche : <titre de la planche>
Mira : Je ne suis pas venue pour qu'on en parle.
Tobias : Alors pose-la.

## Planche : <titre de la planche suivante>
...
```

L'écrire (`write-node <scène> --file` avec `{ "dialogue": "..." }`)
réécrit le lettrage de chaque planche, par la même réconciliation que
l'éditeur de lettrage : une réplique corrigée garde sa bulle et sa place, une
réplique ajoutée sous un intertitre fait naître sa bulle au bord droit de
cette planche, une réplique retirée emporte la sienne. Une planche qui gagne
une bulle perd sa validation.

Trois règles en découlent :

- **Garde les intertitres intacts**, un par planche, dans l'ordre : l'atelier
  refuse un dialogue qui n'a pas autant de lignes « ## Planche : » que la
  scène a de planches. Tout autre `##` appartient au texte d'une planche.
- **Une planche verrouillée ne se réécrit pas.** Si ton dialogue change le
  texte d'une planche verrouillée, l'atelier refuse l'écriture entière.
  Demande à la personne d'ouvrir le cadenas. Ne cherche pas à contourner.
- **C'est ICI qu'une réplique se corrige une fois la scène découpée**, et
  plus dans le script des cases (voir `/bd-lettrage`).

Dans la vue, un clic sur un personnage ou un décor de la palette met ses
scènes en lumière dans le fil : c'est ainsi que la personne vérifie qui
apparaît où.

## Le récit suit la conversation

En pratique, la personne arbitre en te répondant, pas en cliquant. **C'est
donc toi qui reportes chaque décision, au moment où elle est prise**, sans
attendre la fin de la skill :

```bash
# une scène du fil
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" set-status <scène> --status valide
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" set-status <scène> --status ecarte --raison "<pourquoi, dans ses mots>"
# une carte de l'établi
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" etabli-set <carte> --statut retenue
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" etabli-set <carte> --statut ecartee
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" drop-etabli <carte>
```

- ce qu'elle retient d'une prémisse ou d'une alternative passe dans le texte
  qui l'accueille (la bible, une scène) ; la carte quitte alors l'établi
  (rangée dans une scène par `etabli-ranger`, ou mise à la corbeille par
  `drop-etabli` quand elle est entrée dans un document) ;
- ce qu'elle écarte passe en `ecartee` (une scène : `ecarte`, avec la raison) ;
- une scène qu'elle a validée passe en `valide`.

Un récit où tout reste en proposition ment : il montre comme des hypothèses
ce qui est décidé depuis longtemps, et les skills suivantes, qui ne
construisent que sur du validé, ne savent plus sur quoi s'appuyer.

Deux garde-fous. **Tu ne valides jamais à la place de la personne** : tu
reportes ce qu'elle a dit, et tant qu'elle n'a rien dit, la carte reste une
proposition. En `--auto` seulement, c'est toi qui tranches, et tu le
consignes au journal. **L'établi se range avant de rendre la main** : à la fin
de la skill, relis `etabli` et `nodes` ; il ne doit rester que ce qui attend
vraiment une réponse. Dis à la personne ce qui reste.

## Ce que tu lis avant d'écrire

**Toujours, en début de skill** : l'état du récit, de l'établi, et ce qui a
bougé.

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" nodes <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" etabli <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" changes <projet> --since <ton dernier curseur>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" journal <projet> --limite 20
```

Le curseur est le numéro que `version <projet>` a rendu la dernière fois que
tu as lu le projet dans cette conversation. Dans une conversation neuve, tu
n'en as pas : saute `changes`.

Ce que tu en tires :

- **Les statuts** : ce qui est `valide` est acquis, tu construis dessus. Ce qui
  est écarté est mort, tu ne le ressors pas (et le journal dit pourquoi).
- **La provenance** : ce qui vient de `humain` est le travail de la personne.
  Tu ne le modifies pas sans le dire, jamais silencieusement.
- **L'ordre et les chapitres** sont des décisions d'auteur.
- **Ce que la personne a groupé** sur l'établi, elle le considère lié.
- **Ce qui traîne** : une proposition jamais arbitrée mérite d'être relancée
  plutôt qu'ignorée.

## Ce que tu ne fais jamais

- **Écraser une scène validée par la personne.** Si tu crois qu'il faut la
  changer, pose une alternative sur l'établi et dis-le.
- **Écarter sans raison.** La raison part au journal ; c'est elle qui
  empêchera d'y revenir dans trois semaines.
- **Réordonner le récit sans le dire.**
- **Poser un personnage ou un décor dans la vue Scénario** : ils vivent dans
  l'univers. Un lot qui en contient les voit ignorés.

## Consigner

Une décision structurante va au journal, avec ce qu'on a écarté et pourquoi :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" journal-add <projet> --file <entree.json>
```

Le corps liste, quand c'est utile, ce que la décision a touché (une ligne
« Propagé : ... »). Les textes du projet se lisent dans le **Dossier** de
l'atelier (`app.studio-entremondes.fr/projet/<projet>?m=dossier&doc=<genre>`),
les essais d'images dans la **planche contact** (`?m=essais`).
