---
name: _toile
description: Helper interne. Les conventions de travail sur la Toile partagée : comment Claude pose des propositions, comment il lit les arbitrages de la personne, ce qu'il ne touche jamais. Appelé par les skills du temps 0-1. Ne pas invoquer directement.
user-invocable: false
allowed-tools: Bash, Read, Write
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Travailler sur la Toile sans marcher sur les pieds de personne

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle de ce que tu poses en termes de récit (« j'ai posé trois pistes de prémisse »), jamais en termes de blocs et d'identifiants.

La Toile est un espace partagé. La personne y travaille avec sa souris pendant
que tu y travailles par l'atelier. Ces conventions existent pour qu'aucun des
deux ne défasse le travail de l'autre.

## Ce que tu poses

**Toujours en lot, jamais un par un.** Cinq propositions qui apparaissent
ensemble se comparent d'un regard ; cinq apparitions successives donnent le
tournis.

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" scenario <projet> --file <lot.json>
```

Le lot contient les blocs et leurs liens (les liens désignent les blocs par
leur rang dans le tableau). Les positions sont facultatives : l'atelier range
les blocs libres en grille, et une scène n'en a pas besoin (voir plus bas).
N'essaie pas de calculer une mise en page.

## Comment la Toile est faite

La Toile est une partition. **Le récit court en largeur** : une colonne par
scène, dans l'ordre du récit. **La hauteur est une lentille** que la personne
choisit : le temps (une scène datée descend à sa date), les personnages ou les
lieux en rangées, le statut, ou rien. Une scène n'a donc pas de position à
elle : son rang dans le récit et sa date suffisent. Les positions ne comptent
que pour les blocs libres (notes, images, décors, personnages, documents,
questions).

**Les chapitres** (type `acte` dans l'atelier, « chapitre » à l'écran) sont
des bandes qui couvrent des scènes consécutives. Un chapitre que tu poses
prend les scènes qui le suivent dans l'ordre, jusqu'au chapitre suivant.
Quand la personne trace ou étire une bande à la souris, le chapitre reçoit
des bornes (`meta.premiere` et `meta.derniere`, la première et la dernière
scène) : ce sont elles qui font foi. Tu peux les poser toi-même en écrivant
le bloc, une fois ses scènes créées.

**Le dialogue d'une scène est celui de ses planches.** Tant qu'une scène n'a
pas de planche, son champ `dialogue` porte les répliques d'esquisse et
s'écrit comme les autres champs. Dès qu'elle est découpée, l'atelier n'a plus
qu'un texte : celui qui est lettré sur ses planches, ce qu'on imprime.
`GET /nodes/<id>` le rend assemblé, un intertitre `## <titre de planche>` par
planche, avec `dialogueDesPlanches: true` ; l'écrire par `PATCH` réécrit le
lettrage de chaque planche, par la même réconciliation que l'éditeur de
lettrage : une réplique corrigée garde sa bulle et sa place, une réplique
ajoutée sous un intertitre fait naître sa bulle au bord droit de cette
planche, une réplique retirée emporte la sienne. Une planche qui gagne une
bulle perd sa validation : la bulle est au bord, pas encore à sa place, et
quelqu'un devra la poser dans la vue Lettrage. Garde donc les intertitres
intacts, et n'ajoute une réplique que si tu sais dans quelle planche elle
tombe ; le découpage case par case, lui, reste `/bd-dialogues`.

**Les images** sont un module : un bloc `image` peut désigner une image du
laboratoire (`refId`) ou recevoir un fichier :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" node-image <bloc> --file <image.png>
```

**Un personnage ou un décor posé sur la Toile** est un repère du récit, à
côté des fils de présence et des rangées que le casting des scènes dessine
(`meta.castingIds`, `meta.decorIds`). C'est le casting qui fait les fils,
pas les blocs.

**Une grappe s'annonce.** Quand tu poses un ensemble de propositions qui vont
ensemble, ouvre-la par un bloc `note` qui dit ce que c'est (« Trois pistes de
prémisse, angles imposés »). Sans cela, la personne trouve six blocs orphelins
et doit deviner.

**Ce que tu poses arrive en `idee`.** C'est le défaut, ne le change pas : une
proposition est une proposition. L'atelier l'affiche en trait interrompu, avec
ta marque. La personne l'adopte en la passant à `discute` ou `valide`, ou
l'écarte.

## Ce que tu lis avant d'écrire

**Toujours, en début de skill** : l'état de la Toile et ce qui a bougé.

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" nodes <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" changes <projet> --since <ton dernier curseur>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" journal <projet> --limite 20
```

Ce que tu en tires :

- **Les statuts** : ce qui est `valide` est acquis, tu construis dessus. Ce qui
  est `ecarte` est mort, tu ne le ressors pas (et le journal dit pourquoi).
- **La provenance** : ce qui vient de `humain` est le travail de la personne.
  Tu ne le modifies pas sans le dire, jamais silencieusement.
- **L'ordre et les chapitres** : l'ordre du récit et les bornes des chapitres
  sont des décisions d'auteur. Une scène déplacée, un chapitre étiré, c'est la
  personne qui a tranché.
- **Les positions des blocs libres** : ce que la personne a RAPPROCHÉ (une
  note contre une autre, un décor près d'une image), elle le considère lié.
  Une grappe serrée est une intention, même sans lien tracé.
- **Ce qui traîne** : un bloc `discute` depuis longtemps, ou une `question`
  sans réponse, mérite d'être relancé plutôt qu'ignoré.

## Ce que tu ne fais jamais

- **Écraser un bloc validé par la personne.** Si tu crois qu'il faut le changer,
  pose un bloc à côté et dis-le.
- **Écarter un bloc sans raison.** La raison part au journal et se lit dans la
  corbeille du rail ; c'est elle qui empêchera d'y revenir dans trois semaines.
  Un bloc JETÉ (retiré de la Toile) attend trente jours dans la même corbeille
  avant de disparaître pour de bon, avec le fichier d'une image envoyée.
- **Réordonner la structure sans le dire.** L'ordre du récit est une décision
  d'auteur.
- **Poser cinquante blocs d'un coup.** Au-delà d'une dizaine, la personne ne
  peut plus arbitrer : elle subit. Découpe en étapes.

## Consigner

Une décision structurante va au journal, avec ce qu'on a écarté et pourquoi :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" journal-add <projet> --file <entree.json>
```

Le corps liste, quand c'est utile, ce que la décision a touché (une ligne
« Propagé : ... »). C'est ce qui permet de refaire le chemin dans six mois.
