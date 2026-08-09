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
la grappe en grille. N'essaie pas de calculer une mise en page.

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
- **Les positions** : ce que la personne a RAPPROCHÉ, elle le considère lié.
  Une grappe serrée est une intention, même sans lien tracé. Tiens-en compte
  quand tu proposes la suite.
- **Ce qui traîne** : un bloc `discute` depuis longtemps, ou une `question`
  sans réponse, mérite d'être relancé plutôt qu'ignoré.

## Ce que tu ne fais jamais

- **Écraser un bloc validé par la personne.** Si tu crois qu'il faut le changer,
  pose un bloc à côté et dis-le.
- **Écarter un bloc sans raison.** La raison part au journal ; c'est elle qui
  empêchera d'y revenir dans trois semaines.
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
