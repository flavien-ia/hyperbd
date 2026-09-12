---
name: _vision-qa
description: Helper interne. Fait REGARDER une image produite (essai ou planche) par un subagent en aveugle, comparée à ses références, et boucle sur la génération avec un delta correctif tant que le verdict le demande. Appelé par /bd-da, /bd-design et la production des planches. Ne pas invoquer directement.
user-invocable: false
allowed-tools: Bash, Read, Write, Agent
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et curl."
---

# Faire regarder une image

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- N'expose jamais de chemin interne ni de nom de fichier technique : parle de ce que le juge a vu.

Un modèle d'image ne sait pas qu'il a dérivé. Il produit à chaque tour quelque
chose de plausible, et la ressemblance s'effrite sans qu'aucun tour ne paraisse
fautif. C'est pour cela qu'on fait regarder par quelqu'un qui n'a pas vu les
tours précédents.

## La règle qui commande tout le reste

**Ne JAMAIS faire juger une itération par rapport à l'itération précédente.**

À chaque tour, le juge reçoit les **références d'origine** (les fiches de
personnages, le décor, la planche de style) et le candidat. Jamais l'image du
tour d'avant. Sans cela, on valide une dérive en trois pas dont personne
n'aurait accepté le premier et le dernier côte à côte.

## Étape 1 : rassembler les images

Récupère les URL par l'atelier, jamais en devinant un chemin :

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" essai-detail <essaiId>        # les images d'un essai
node "$S" planche <plancheId>           # la planche et ses variantes
node "$S" universe <projet>             # les entrées et leurs images
```

Puis télécharge **le candidat ET les références** dans le dossier temporaire de
la session. Le juge lit des fichiers locaux : une URL signée expire, et un juge
qui échoue à charger une image invente ce qu'elle contenait.

```bash
curl -s -o "$TMP/candidat.png" "<url>"
curl -s -o "$TMP/ref-<nom>.png" "<url>"
```

Vérifie que chaque fichier fait plus de quelques kilo-octets. Un fichier de
200 octets est une page d'erreur, pas une image.

## Étape 2 : lancer le juge

Un subagent (Agent, type general-purpose), avec cette mission et rien d'autre :

> Tu es le juge « vision » de HyperBD. Lis d'abord ta grille commune :
> `${CLAUDE_SKILL_DIR}/../../templates/juges/_commun.md`, puis ta grille
> propre : `${CLAUDE_SKILL_DIR}/../../templates/juges/vision.md`
> (pour une couverture ou une quatrième : `${CLAUDE_SKILL_DIR}/../../templates/juges/couverture.md`).
> Ouvre ensuite les images, réellement, une par une.
> CANDIDAT : <chemin>.
> RÉFÉRENCES : <chemins, avec pour chacun ce qu'il est : « fiche du personnage
> X, variante Y », « décor Z », « planche de style »>.
> PLANCHE PRÉCÉDENTE (continuité) : <chemin, ou « aucune »>.
> SCRIPT DEMANDÉ : <le script de la planche, ou la description de l'essai>.
> TYPE : <planche | personnage | décor | motif | piste DA>.
> Rends ton évaluation EXACTEMENT au format défini dans ta grille.

Ne recopie jamais la grille dans le prompt : le juge la lit lui-même, avec un
contexte vierge.

## Étape 3 : agir selon le verdict

| Verdict | Ce qu'on fait |
|---|---|
| `VALIDER` | On s'arrête. On retient l'image. |
| `ITERER` | On relance la génération avec le delta en `extraPrompt`, et les références ajustées si le juge en propose. |
| `REGENERER` | On ne rafistole pas : on repart du prompt, éventuellement retravaillé. Ce verdict coûte moins cher que trois itérations sur une mauvaise base. |

Pour itérer :

```bash
node "$S" generate <planche> --extra "<le delta, tel quel>" --wait
node "$S" essai <projet> --kind <k> --prompt "<prompt + delta>" --refs <ids> --wait
```

## Étape 4 : la boucle, et sa limite

- **Trois itérations au maximum par image.** Au-delà, on livre la meilleure
  obtenue avec le verdict honnête et ce qui bloque. Une quatrième itération ne
  produit pas mieux : elle produit une image tiède et une facture.
- **Affiche le coût cumulé à chaque tour**, en euros ou en dollars réels
  (`node "$S" costs <projet>`). Personne ne doit découvrir la dépense à la fin.
- Si un budget est passé (`--budget`), **arrête net** en l'atteignant, même au
  milieu d'une boucle, et dis-le. Un plafond qu'on dépasse « juste un peu »
  n'est pas un plafond.
- **Un juge frais à chaque passe.** Un juge qui relit sa propre correction la
  trouve bonne.

## Ce qu'on ne fait pas

- On ne fait pas juger une image qu'on n'a pas pu télécharger.
- On ne passe pas au juge l'historique des tentatives : il ne doit pas savoir
  qu'il en est au troisième tour, sinon il devient indulgent.
- On n'ignore pas un `REGENERER` parce qu'on est « presque ». C'est exactement
  le moment où l'on brûle trois générations pour rien.
- On ne valide pas une image en se disant qu'on la corrigera plus tard : plus
  tard, elle sera dans un album.

## Ce que le regard ne remplace pas

Le juge voit ce qui s'écarte des références. Il ne sait pas si la planche est
belle, ni si elle raconte. En mode guidé, l'humain tranche toujours après lui :
le juge écarte ce qui est faux, l'humain choisit ce qui est bon.
