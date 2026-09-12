---
name: bd-status
description: Fait le point sur une bande dessinée en cours dans l'atelier : où en est l'album planche par planche (rien, en cours, image validée, textes calés), ce qu'il a coûté jusqu'ici, et ce qu'il reste à faire. Utiliser quand la personne dit « où on en est », « /bd-status », « fais le point sur l'album », « combien ça a coûté », ou avant de reprendre le travail après une pause.
argument-hint: "[projet] (nom d'adresse ou titre ; par défaut le seul projet, ou on demande)"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Où en est l'album

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français). Cela vaut pour tout : questions, avancement, confirmations, résumés, erreurs.
- Parle un langage simple et concret. N'expose jamais de nom de script (`*.mjs`), de chemin interne ou de jargon : décris ce que tu fais en clair.
- Un point d'étape se lit d'un coup d'œil : des chiffres, une phrase, pas un tableau de bord.

## Étape 0 : l'atelier est-il relié ?

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" me
```

En cas d'erreur, dis simplement que l'atelier n'est pas encore relié et invoque `bd-connect`. Ne poursuis pas sans lien.

## Étape 1 : de quel projet parle-t-on ?

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" projects
```

- Un seul projet : c'est celui-là, ne demande rien.
- Plusieurs, et un argument est fourni : prends celui dont le nom d'adresse ou le titre correspond.
- Plusieurs, sans argument : demande lequel, en les listant par titre.

## Étape 2 : lire l'album et les coûts

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" planches <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" costs <projet>
```

Une planche passe par quatre états, et c'est **le plus bas qui compte** : une planche dont l'image est validée mais dont les textes ne sont pas calés reste « en cours de lettrage ».

| Ce que disent les données | Ce que ça veut dire |
|---|---|
| aucune image | rien n'a encore été dessiné |
| des générations, rien de validé | on cherche encore la bonne image |
| image validée, lettrage non validé | l'image est trouvée, les textes restent à caler |
| lettrage validé | la planche est finie |

Les blocs `separator` sont les chapitres, pas des planches : compte-les à part.
La `couverture` et la `quatrieme`, quand l'album en a, sont des pages à part
elles aussi : dis si elles existent et où elles en sont (mêmes états qu'une
planche), sans les compter dans les planches.

**Les refus.** Chaque planche porte sa dernière génération
(`derniereGeneration`) : quand son `status` est `error`, la raison
(`errorReason`) dit ce qui s'est passé, et la conduite est celle de
`${CLAUDE_SKILL_DIR}/../../templates/refus.md`. Relève-les :

| `errorReason` | Ce que tu dis |
|---|---|
| `refus_securite` | « refusée par le filtre de sécurité : à reformuler » (et vers `/bd-planches`) |
| `credit_epuise` | « le compte OpenAI n'a plus de crédit : rien ne se génèrera avant un rechargement » |
| `plafond_facturation` | « plafond de dépense OpenAI atteint : à relever, ou attendre le mois suivant » |
| `cle_refusee` | « la clé OpenAI est refusée : à remplacer dans Mon compte » |
| `limite_debit`, `autre` | « un échec passager : à relancer » |

Un crédit épuisé, un plafond ou une clé refusée valent pour TOUT l'album, pas
pour une planche : dis-le une fois, en tête, plutôt que planche par planche.

## Étape 3 : présenter

Donne, dans cet ordre :

1. **Une phrase d'état** : « 62 planches, 41 finies, 12 en cours de lettrage, 9 à dessiner. »
2. **Ce qui a coûté** : le total, et la part encore en cours s'il y en a une (une génération en cours n'est qu'une estimation, dis-le).
3. **Les prochaines planches à traiter** : les 3 à 5 premières dans l'ordre de l'album qui ne sont pas finies, avec ce qui leur manque.
4. **S'il y a des retours de relecteurs non traités**, signale-le : c'est du travail en attente que les chiffres ne montrent pas.
5. **Les planches refusées ou arrêtées**, avec leur raison en clair et ce qu'il faut faire (voir « Les refus » plus haut). Une planche refusée par le filtre ne se compte pas « à dessiner » comme les autres : elle demande une reformulation, et le dire évite de la relancer telle quelle.

Reste factuel et court. Si l'album est terminé, dis-le franchement et propose la suite (agrandir les images, exporter).

## Règles

- Ne recalcule jamais un coût toi-même : celui de l'atelier fait foi, il vient des factures réelles du modèle.
- Ne présente pas une estimation comme un montant facturé.
- Si une génération traîne en « en cours » depuis très longtemps, signale-la : elle a peut-être échoué sans être marquée.
