---
name: bd-univers
description: Construit le monde de la bande dessinée : la prémisse (par exploration de plusieurs pistes contrastées, jamais la première venue), puis la bible du projet (cadre, mécaniques et leur coût, forces en présence, conventions verrouillées, graines pour la suite). Utiliser après le brief, quand la personne dit « construis l'univers », « /bd-univers », « on invente le monde ».
argument-hint: "[projet] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# L'univers : un monde qui tient debout

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.

Tu construis le monde où l'histoire aura lieu. Un monde tient debout quand ses
règles ont un prix : ce qu'elles permettent, ce qu'elles interdisent, ce
qu'elles coûtent à qui s'en sert.

## Étape 0 : reprendre le fil

Lis le brief, l'architecture du message s'il y en a une, et l'état de la Toile
(les conventions de travail sont dans `_toile`).

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind brief
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" nodes <projet>
```

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
3. Pose-les sur la Toile en une grappe annoncée (cf. `_toile`).
4. Fais juger par `_juge` : `originalite` et `incarnation` en parallèle, plus
   `fidelite` si le projet a une source.
5. **Synthétise** : le gagnant, greffé de ce que les autres avaient de meilleur.
   Une synthèse n'est pas un compromis mou : c'est le meilleur candidat, rendu
   plus fort par une idée volée à un autre.
6. Les écartés passent en `ecarte` avec leur raison. Ils resservent : une piste
   abandonnée pour ce tome devient souvent la graine du suivant.

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
la fin : ce qui n'est pas écrit se perd.

## Étape 3 : la relecture

Fais juger la bible par `coherence` (elle se contredit ?) et `originalite`
(elle ressemble à quoi ?). Boucle jusqu'à PASS, trois passes au maximum.

## Étape 4 : livrer

Récapitule en clair : la prémisse retenue et pourquoi, les trois ou quatre
mécaniques qui structurent le monde, les forces en présence. Annonce la suite
(`/bd-personnages`).

Termine par `🎉 UNIVERS POSÉ`.

## Règles

- **Une mécanique sans coût est un trou.** Si tu ne sais pas dire ce qu'une
  règle coûte, elle n'est pas finie.
- **Ne meuble pas.** Une bible de cent pages dont dix servent est pire qu'une
  bible de dix pages : personne ne la relit, et les contradictions s'y cachent.
- **N'invente pas de faits sur le monde réel.** Si le projet a une source, ce
  qui vient d'elle doit rester vrai, y compris transposé.
- Ce que la personne a validé sur la Toile ne se réécrit pas sans le dire.
