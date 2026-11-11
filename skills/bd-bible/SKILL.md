---
name: bd-bible
description: Écrit la bible du monde de la bande dessinée, par écrit et sans aucune image : la prémisse (plusieurs pistes contrastées posées sur l'établi, jamais la première venue), puis la bible (cadre, mécaniques et leur coût, forces en présence, conventions verrouillées, graines pour la suite) et le prompt d'univers. Première étape de la phase univers (que /bd-univers enchaîne). Utiliser après le brief, quand la personne dit « la bible », « /bd-bible », « on invente le monde », « la prémisse ».
argument-hint: "[projet] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# La bible : un monde qui tient debout

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.

Tu construis le monde où l'histoire aura lieu. Un monde tient debout quand ses
règles ont un prix : ce qu'elles permettent, ce qu'elles interdisent, ce
qu'elles coûtent à qui s'en sert.

## Étape 0 : reprendre le fil

Lis le brief, l'architecture du message s'il y en a une, une bible déjà
commencée, le prompt d'univers, et l'établi (les conventions de travail sont
dans `_recit`).

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind brief
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind bible
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" universe-prompt <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" etabli <projet>
```

**Sur un univers déjà fourni** (HELO, ou la copie d'un univers ouvert), le
monde existe : le prompt d'univers et ses entrées `text` le disent. Ne refais
pas la prémisse : écris seulement la bible de CE tome (ce qui s'y joue, ce
qu'il ajoute au monde), et passe à la suite.

Sans brief, invoque `bd-brief` : construire un monde sans savoir à qui l'on
parle, c'est décorer avant de savoir où sont les murs.

## Étape 1 : la prémisse, en plusieurs pistes

**Jamais la première idée.** La première qui vient est la plus disponible, donc
la plus commune : celle que tout le monde a déjà eue.

1. Choisis 3 à 5 angles dans `templates/angles-divergence.md`, adaptés au sujet
   et à la distance de transposition retenue.
2. Écris un candidat par angle, **sans les comparer entre eux pendant que tu les
   écris** (un candidat qui regarde les autres se met à leur ressembler).
   Chacun tient en un paragraphe : la prémisse, ce qu'elle permet de raconter,
   ce qu'elle coûte.
3. Pose-les sur l'établi, en un groupe nommé (« Prémisses, angles imposés »),
   une carte par piste, sa première ligne pour titre (cf. `_recit`). La
   personne les voit côte à côte dans la vue Scénario.
4. Fais juger par `_juge` : `originalite` et `incarnation` en parallèle, plus
   `fidelite` si le projet a une source.
5. **Synthétise** : le gagnant, greffé de ce que les autres avaient de meilleur.
   Une synthèse n'est pas un compromis mou : c'est le meilleur candidat, rendu
   plus fort par une idée volée à un autre.
6. Les écartées passent en `ecartee` (`etabli-set --statut ecartee`) et leur
   raison va au journal. Elles resservent : une piste abandonnée pour ce tome
   devient souvent la graine du suivant. La retenue entre dans la bible ;
   sa carte quitte alors l'établi (`drop-etabli`).

En guidé, la personne tranche. En `--auto`, le panel tranche et tu consignes.

## Étape 2 : la bible

Section par section. Ce qui appartient au MONDE va dans la bibliothèque de
l'univers (il resservira pour une suite ou un autre medium) ; ce qui appartient
à CE tome va dans un document de projet.

1. **Le cadre** : quand, où, dans quelle société. Assez pour situer, pas plus :
   une bible n'est pas un atlas.
2. **Les mécaniques, avec leur prix.** Pour chaque règle du monde (une
   technologie, un pouvoir, une institution, une contrainte), écris :
   - ce qu'elle permet,
   - ce qu'elle interdit,
   - **ce qu'elle coûte** à qui s'en sert,
   - comment on peut la contourner, et ce que ça coûte encore.

   C'est la section qui sépare un monde d'un décor. Un pouvoir sans prix rend
   tous les enjeux nuls.
3. **Les forces en présence.** Si le projet porte un message, c'est ici qu'il se
   distribue : chaque position importante devient une force, avec ses raisons
   et ses aveuglements. Aucune ne doit avoir tort sur toute la ligne.
4. **Les conventions verrouillées** : comment on nomme les choses, la
   typographie du projet, ce qu'on n'écrit jamais. Verrouille-les MAINTENANT :
   une convention décidée à la planche trente oblige à reprendre les vingt-neuf
   premières.
5. **Les graines** : ce qu'on installe sans l'exploiter, pour plus tard. Une
   section à part, marquée comme telle.

Écris la bible au fil de l'eau dans l'atelier (`kind: bible`), pas d'un bloc à
la fin : ce qui n'est pas écrit se perd. Elle s'écrit en Markdown, dans un
fichier : créée une fois, puis réécrite à chaque avancée.

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" new-doc <projet> --kind bible --title "Bible" --body-file bible.md
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" write-doc <id> --body-file bible.md
```

## Étape 3 : la relecture

Fais juger la bible par `coherence` (elle se contredit ?) et `originalite`
(elle ressemble à quoi ?). Boucle jusqu'à PASS, trois passes au maximum.

## Étape 4 : livrer

Écris aussi le **prompt d'univers** (ce qui part avec chaque génération :
l'époque, le ton, ce qu'on ne montre jamais), en quelques lignes :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" universe-prompt <projet> --file prompt.md
```

Récapitule en clair : la prémisse retenue et pourquoi, les trois ou quatre
mécaniques qui structurent le monde, les forces en présence. Dis que la bible
se lit dans le **Dossier** de l'atelier
(`app.studio-entremondes.fr/projet/<projet>?m=dossier&doc=bible`). Annonce la
suite : la direction artistique (`/bd-da`), ou laisse `/bd-univers`
enchaîner s'il t'a appelé.

Termine par `🎉 BIBLE ÉCRITE`.

## Règles

- **Une mécanique sans coût est un trou.** Si tu ne sais pas dire ce qu'une
  règle coûte, elle n'est pas finie.
- **Ne meuble pas.** Une bible de cent pages dont dix servent est pire qu'une
  bible de dix pages : personne ne la relit, et les contradictions s'y cachent.
- **N'invente pas de faits sur le monde réel.** Si le projet a une source, ce
  qui vient d'elle doit rester vrai, y compris transposé.
- Ce que la personne a validé ne se réécrit pas sans le dire.
- **Aucune image ici** : le monde s'écrit d'abord ; il se dessine à `/bd-da`.
