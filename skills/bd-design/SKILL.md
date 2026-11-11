---
name: bd-design
description: Ancien nom, gardé le temps d'une version. Le dessin se fait désormais avec /bd-perso (les personnages), /bd-decors (les lieux et les motifs) et /bd-planche-test (la planche test). Utiliser seulement si la personne tape « /bd-design » : fait le point et renvoie vers la bonne commande.
argument-hint: "[projet] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Le dessin : trois commandes

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).

Dis en une phrase que `/bd-design` est devenu trois commandes :
`/bd-perso` (les personnages, écrits puis dessinés), `/bd-decors` (les lieux
et les motifs) et `/bd-planche-test` (la planche test, après le scénario).

Puis regarde où en est le projet (`universe <projet>`, `nodes <projet>`) et
**charge la skill qui manque**, avec les mêmes arguments : `bd-perso` si des
personnages retenus n'ont pas de références, sinon `bd-decors` si des lieux
récurrents n'ont pas les leurs, sinon `bd-planche-test`.
