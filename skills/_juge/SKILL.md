---
name: _juge
description: Helper interne. Fait juger un artefact narratif par un subagent EN AVEUGLE, selon une grille du plugin (originalité, dramaturgie, cohérence, fidélité, incarnation), et rend un verdict parsable. Appelé par les skills du temps 0-1. Ne pas invoquer directement.
user-invocable: false
allowed-tools: Bash, Read, Write, Agent
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Faire juger un artefact

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- N'expose jamais de chemin interne ni de nom de fichier technique : parle des juges par ce qu'ils gardent.

Tu fais relire un texte par un juge qui ne sait rien de la conversation. C'est
tout l'intérêt : un relecteur qui a suivi la fabrication trouve toujours que
c'est bien, parce qu'il se souvient de ce qu'on voulait faire au lieu de lire
ce qui est écrit.

## Les juges disponibles

| Juge | Ce qu'il garde | Quand |
|---|---|---|
| `originalite` | fraîcheur, spécificité, tropes conscients, détournement | prémisse, univers, direction artistique |
| `dramaturgie` | désir et obstacle, causalité, mouvement, progression | structure, scènes |
| `coherence` | faits, mécaniques, personnages, canon | dès qu'une bible existe |
| `fidelite` | thèses portées, exactitude, nuance, traçabilité | projets à source SEULEMENT |
| `incarnation` | montré plutôt que dit, forces incarnées, émotion, sous-texte | univers, personnages, scènes |
| `voix` | différenciation MESURÉE, registre, oralité, fonction | bible de voix, dialogues |
| `grammaire` | variété, rythme, raccords, signature | découpage d'une planche, AVANT génération |
| `lettrage` | lisibilité, ordre de lecture, visages, queues, marges | placement des bulles sur une planche rendue |

Le juge `voix` ne fonctionne pas seul : sa dimension `differenciation` lui est
fournie **mesurée** par `scripts/attribution.mjs`, et il la reporte sans la
réviser. Le protocole de cette épreuve d'aveugle est décrit dans `/bd-voix` et
`/bd-dialogues` ; ne le lance pas depuis ici.

Le juge `lettrage` est le seul qui REGARDE : on lui donne une image rendue par
l'atelier, pas des coordonnées. Son verdict a son vocabulaire propre
(`VALIDER | AJUSTER | REFAIRE`), défini dans sa grille, qui remplace sur ce
point la grille commune. Il se lance depuis `/bd-lettrage`.

## Étape 1 : préparer le dossier du juge

Écris dans le dossier temporaire de la session :

1. **Le candidat** : le texte à juger, seul, sans commentaire ni justification.
   Un juge qui lit « voici pourquoi j'ai fait ça » ne juge plus.
2. **Les références** : ce que la grille demande de lire (bible, fiches,
   structure, architecture du message). Récupère-les par l'atelier plutôt que
   de les recopier de mémoire :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind bible
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" nodes <projet>
```

## Étape 2 : lancer le juge

Un subagent (Agent, type general-purpose), avec cette mission et RIEN d'autre :

> Tu es le juge « <nom> » de HyperBD. Lis d'abord ta grille commune :
> `${CLAUDE_SKILL_DIR}/../../templates/juges/_commun.md`, puis ta grille propre :
> `${CLAUDE_SKILL_DIR}/../../templates/juges/<nom>.md`. Lis ensuite tes
> références : <chemins>. Puis lis le candidat : <chemin>. Type d'artefact :
> <prémisse | structure | scène | document | direction artistique>. Rends ton
> évaluation EXACTEMENT au format défini dans la grille commune.

Ne recopie JAMAIS la grille dans le prompt : le juge la lit lui-même, avec un
contexte vierge. C'est ce qui garantit qu'il ne sait pas qui a écrit le texte
ni ce qu'on espérait.

Plusieurs juges se lancent EN PARALLÈLE (un seul message, plusieurs appels) :
ils sont indépendants, et rien ne justifie de les faire attendre l'un l'autre.

## Étape 3 : lire le verdict

Le format est strict et parsable : `SCORES:`, `VERDICT:`, puis les sections.
Si un juge rend autre chose, relance-le une fois ; s'il recommence, prends son
texte tel quel et signale que le format n'a pas été respecté.

## Étape 4 : la boucle

Convergence atteinte quand tous les juges convoqués rendent PASS.

Sinon :
1. Applique les corrections : d'abord ce qui est factuel (cohérence, fidélité),
   ensuite ce qui est de métier (dramaturgie, incarnation, originalité).
2. **Un juge FRAIS à chaque passe** : un juge qui relit sa propre correction la
   trouve bonne.
3. **Trois itérations au maximum.** Au-delà, livre la meilleure version avec le
   verdict honnête et ce qui bloque. Tourner en rond ne produit pas mieux, cela
   produit du tiède.

## Règles

- **Ne corrige jamais un fait sans source.** Si un juge signale une
  incohérence, va vérifier dans la bible ; si la bible est muette, c'est une
  décision d'auteur, pas une correction.
- **Une proposition de juge qui contredit une décision du journal perd** : le
  journal porte des arbitrages, le juge ne les connaît pas.
- Consigne au journal du projet ce qu'une passe de juges a changé de
  substantiel. Pas les virgules : ce qui a bougé dans le récit.
