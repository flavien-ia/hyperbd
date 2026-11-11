---
name: bd-scenario
description: Construit le récit dans la vue Scénario de l'atelier : les chapitres et les scènes dans le fil (leurs personnages, leurs lieux, leur budget de planches, qui doit tomber sur le format visé), les alternatives sur l'établi, la mise en scène, les rappels qui relient un setup à son écho, les documents du monde ; puis un audit de cohérence mené par plusieurs relecteurs en parallèle, le pitch d'une page à valider, et le relevé des personnages et des lieux que le récit a fait naître. Vient après l'univers (/bd-univers). Utiliser quand la personne dit « écris le scénario », « /bd-scenario », « on structure l'histoire ».
argument-hint: "[projet] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Le scénario : le récit dans son ordre

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher, scène par scène quand tu écris.

Tu construis le récit, dans la vue Scénario de l'atelier (les conventions
sont dans `_recit`). À la fin, le **fil du récit** porte les chapitres et les
scènes dans leur ordre, chacune avec son synopsis, ses personnages, ses
lieux, son budget et sa mise en scène ; le total tombe sur le format visé ;
et l'**établi** est vide.

Le récit s'écrit APRÈS l'univers : les personnages ont leur fiche et souvent
leur visage, la direction artistique est posée. Écris pour eux.

## Étape 0 : reprendre le fil

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind brief
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind bible
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" nodes <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" etabli <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" universe <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" project <projet>      # planchesVisees : le format visé
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" journal <projet> --limite 20
```

Sans casting retenu dans l'univers, arrête-toi et envoie vers `/bd-univers` (ou
`/bd-perso`) : un récit s'écrit pour des gens. Les fiches des personnages se
lisent par `entry <projet> <id>`.

Le journal compte autant que la bible : il dit ce qui a été écarté et pourquoi.
Une skill qui ressort une idée abandonnée fait perdre confiance.

## Étape 1 : la charpente

Propose 2 ou 3 découpages en chapitres contrastés (pas trois variantes du
même), posés sur l'établi en un groupe nommé « Découpages » (une carte par
découpage, `etabli-add`, voir `_recit`). Chacun tient en quelques lignes : ce
que chaque chapitre fait, et sur quoi il bascule.

Fais juger par `dramaturgie`. Fais trancher, ou tranche en `--auto`. Dès que
c'est tranché, reporte-le (voir `_recit`) : les découpages écartés passent en
`ecartee`, leur raison au journal ; le retenu devient les chapitres du fil
(étape 2), et sa carte quitte l'établi (`drop-etabli`).

## Étape 2 : les scènes

Pose les chapitres (type `acte`) et les scènes dans le fil, dans l'ordre,
chaque chapitre juste avant ses scènes, en un ou plusieurs lots
(`scenario <projet> --file lot.json`) : un chapitre prend les scènes qui le
suivent jusqu'au suivant. Elles arrivent en propositions (pointillé, avec
Retenir et Écarter sur la carte). Ce que la personne réordonne ou déplace d'un
chapitre à l'autre, à la souris, fait foi : relis `nodes` avant d'écrire.

Les idées de scène qui ne sont pas encore mûres, les alternatives, les bouts
de dialogue trouvés en route vont sur l'établi (`etabli-add`), pas dans le
fil. Ce qui en est retenu passe dans le fil par `etabli-ranger`.

Pour chaque scène, dès sa création :

- un **titre** qui dit ce qui s'y passe, pas ce qu'elle signifie ;
- un **synopsis de deux lignes** : c'est ce qu'on lira sur la carte de la
  scène, dans le fil ;
- le **lieu** et la **date** dans la fiction ;
- le **budget de planches** ;
- le **casting** : qui joue dans la scène.

Ces champs ont un nom, et c'est sous ce nom que l'atelier, le contrôle
(`bd-lint`) et le pilote d'album les lisent :

```json
{
  "nodes": [
    { "type": "acte", "title": "Chapitre 1 : <ce qu'il fait>" },
    {
      "type": "scene",
      "title": "<ce qui s'y passe>",
      "meta": {
        "synopsis": "<deux lignes, 400 signes au plus>",
        "lieu": "<où>",
        "dateDiegetique": "Novembre 2028",
        "dateSort": "2028-11",
        "budgetPlanches": 2,
        "castingIds": ["<id du personnage>"],
        "intrigues": ["<nom du fil du récit>"]
      }
    }
  ]
}
```

- `dateDiegetique` est la date telle qu'on la lit sur la carte ; `dateSort`
  est sa clé de tri (`AAAA`, `AAAA-MM` ou `AAAA-MM-JJ`), celle qui place la
  scène sur l'axe du temps. Donne les deux, et une clé différente par scène
  quand deux scènes partagent un mois (ajoute le jour) : à clé égale, l'ordre
  dans le temps est tiré au sort.
- `castingIds` prend l'identifiant du PERSONNAGE retenu dans l'univers (le
  conteneur que rend `universe`, pas l'une de ses variantes de costume). Ce
  sont eux que la carte de la scène montre dans le fil.
- `decorIds` fonctionne de même, avec les décors retenus dans l'univers. Un
  lieu qui n'y est pas encore s'écrit dans `lieu` ; la fin du scénario
  relèvera ceux qui reviennent (étape 8).
- `intrigues` nomme les fils du récit qui traversent la scène (l'intrigue
  principale, l'arc d'un personnage) : c'est facultatif, et cela donne à la
  personne une lecture du récit par fil.
- `budgetPlanches` compte des PLANCHES de l'atelier. Si l'album est en doubles
  pages, une planche vaut deux pages imprimées : dis-le quand tu annonces le
  total, pour que « 24 planches » ne soit pas lu comme 24 pages.

**Le budget se pose scène par scène et se somme.** Le total doit tomber sur le
format visé (`planchesVisees` du projet, réglé au brief) : l'en-tête du fil
affiche les deux nombres, en rouge quand le total déborde. S'il déborde, ce
n'est pas au maquettiste de rattraper : il faut couper ou fusionner des scènes
maintenant. Dis-le, chiffres à l'appui. Sans format visé, règle-le avec la
personne (`set-project <projet> --planches-visees N`).

## Étape 3 : la mise en scène

Pour chaque scène, écris son corps (`body`, la mise en forme) : qui est là, ce
qui s'y passe, ce que ça déplace, l'atmosphère. C'est de la prose de travail,
lue par la direction artistique et par le découpage : elle doit être précise
sur les gestes et les lieux, sans décrire les cases (ce sera le temps suivant).
Une scène porte deux autres textes : `notes` pour ce qu'on se dit à soi-même
(ce que la scène doit faire, ce qui reste à trancher), et `dialogue` pour les
répliques d'esquisse (une ligne par réplique, « Nom : texte »). Ce
`dialogue`-là ne vit que TANT QUE la scène n'a pas de planche : dès qu'elle
est découpée, l'atelier n'affiche plus que le texte lettré sur ses planches,
et c'est lui qu'on corrige (voir `_recit`). Le casting
(`meta.castingIds`) se donne dès la création : c'est lui que la carte montre,
et lui qui fait ressortir les scènes d'un personnage quand la personne le met
en lumière depuis la palette. Ces textes
s'écrivent par
`write-node <scène> --file` avec `{ "body": "...", "notes": "...",
"dialogue": "..." }` ; un champ de `meta` s'y corrige de la même façon
(`{ "meta": { "budgetPlanches": 3 } }`, les autres champs de `meta` sont
gardés).

Ajoute, quand c'est utile :
- des **notes de direction artistique** (ce qu'il faut voir, ce qu'il ne faut
  pas montrer) ;
- **pourquoi cette scène existe**. Une scène qui ne sait pas répondre se coupe
  ou se fusionne. C'est la question la plus rentable de tout le processus.

## Étape 4 : les rappels

Trace les liens `rappel` entre ce qui est installé et ce qui le paie plus tard.
Le label dit le fil (« la promesse tenue trop tard »). Dans le fil, un rappel
se dessine en arc au-dessus des deux cartes. Les scènes existent déjà : un
lien se trace entre leurs identifiants, un par un.

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" new-edge --from <scène qui installe> --to <scène qui paie> --type rappel --label "<le fil>"
```

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

**La validation s'inscrit dans le fil.** Dès que la personne valide le pitch
(ou, en `--auto`, dès que l'audit est passé), passe chaque chapitre et chaque
scène encore proposée en `valide` (la personne a pu en retenir d'un clic : ce
qui est déjà `valide` le reste) :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" set-status <id du chapitre ou de la scène> --status valide
```

Ce n'est pas une formalité : `/bd-dialogues` ne découpe que des scènes
validées, et le pilote d'album ne produit que celles-là. Un récit resté en
proposition arrête tout ce qui suit. Une scène que la personne veut encore
discuter reste en `discute`, et tu le dis. Consigne la validation au journal
(le pitch se lit dans le **Dossier**, `?m=dossier&doc=pitch`), puis **range
l'établi** comme le demande `_recit` : ce qui a été retenu est passé dans le
fil, le reste est écarté ou répondu. Dis ce qui y reste, s'il y reste
quelque chose.

## Étape 8 : le relevé de ce que le récit a fait naître

Un récit invente en route : un personnage secondaire qui revient, un lieu où
trois scènes se passent. Avant de rendre la main, fais le relevé :

- chaque personnage casté dans une scène (`meta.castingIds`) est-il **retenu**
  dans l'univers, avec sa fiche (`aFiche`) et des références (des images sur
  la variante qui servira) ? Et chaque personnage NOMMÉ dans un synopsis ou
  un dialogue d'esquisse, sans être casté ?
- chaque lieu qui revient dans **deux scènes ou plus** (`meta.lieu`,
  `meta.decorIds`) a-t-il son décor dans l'univers, avec des références ?

Liste ce qui manque, en clair, et propose de le compléter tout de suite :
`/bd-perso` pour les personnages, `/bd-decors` pour les lieux (chacune ne fait
que ce qui manque). En guidé, la personne décide ; en `--auto`, enchaîne.

Termine par `🎉 SCÉNARIO POSÉ`, avec le compte des scènes et le budget total
face au format visé, le relevé, puis dis la suite : compléter ce qui manque
(`/bd-perso`, `/bd-decors`), puis la planche test (`/bd-planche-test`).

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
