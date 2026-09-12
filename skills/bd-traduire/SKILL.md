---
name: bd-traduire
description: Traduit l'album dans une autre langue, sans rien redessiner. Ouvre la langue sur l'atelier (même géométrie de bulles, textes à remplacer), traduit planche par planche avec la bible de voix sous les yeux, fait juger la fidélité, la voix, le naturel et la mesure, fait rendre les planches lettrées dans la langue pour voir ce qui déborde, ajuste, valide, et ouvre un lien de lecture dans cette langue. Utiliser quand la personne dit « traduis la BD », « /bd-traduire », « une version anglaise », « en espagnol ».
argument-hint: "[projet] --vers <code de langue> [--planches id,id] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Traduire l'album : les mêmes images, une autre langue

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher, planche par planche.

Une bande dessinée multilingue coûte une passe de **texte**, pas une
reproduction : les images ne bougent pas d'une langue à l'autre. L'atelier
garde, pour chaque planche, le lettrage de la langue du script (la source,
qui fait foi) et une ligne par langue traduite, avec la **même géométrie de
bulles** et d'autres textes. Traduire, c'est remplacer des textes dans des
bulles déjà posées, puis vérifier qu'ils y tiennent.

Rien ne se génère ici : coût d'images, zéro.

## Étape 0 : l'état

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" me
node "$S" project <projet>
node "$S" docs <projet> --kind voix
node "$S" docs <projet> --kind brief
node "$S" locales <projet>
node "$S" planches <projet>
```

- **Pas de bible de voix** : arrête-toi et renvoie vers `/bd-voix`. Traduire
  sans elle, c'est donner la même bouche à tous les personnages dans la
  langue cible.
- **La langue** (`--vers`) est un code court : `en`, `de`, `es`, `pt-br`.
  Sans argument, demande-la.
- **Les planches** : celles dont le lettrage source est **validé**
  (`lettrageValidated`). Une planche dont les textes ne sont pas calés ne se
  traduit pas encore : sa source va bouger, et la traduction serait en retard
  avant d'exister. Dis combien de planches sont prêtes, combien ne le sont pas.
- **La langue existe déjà** (`locales` la liste) : dis où elle en est
  (planches traduites, validées, à jour) et ne retraduis que ce qui n'est pas
  à jour, sauf demande contraire. `aJour: false` sur une planche veut dire
  que la source a changé depuis : cette planche-là se reprend.

## Étape 1 : ouvrir la langue

```bash
node "$S" add-locale <projet> --locale <code>
```

Pour chaque planche qui a un lettrage source, l'atelier crée une copie dans
la langue (même géométrie, mêmes textes, non validée) ; celles qui avaient
déjà une ligne ne bougent pas. À partir de là, la langue apparaît dans
l'atelier (mode Lettrage, barre des langues), et une personne peut y
retoucher chaque bulle à la main.

## Étape 2 : traduire, planche par planche

Pour chaque planche du scope, dans l'ordre de l'album :

1. **Lis la source et la copie** :

```bash
node "$S" lettrage <plancheId>                  # la source, qui fait foi
node "$S" lettrage <plancheId> --locale <code>  # la copie à traduire
```

2. **Traduis les textes des bulles**, et RIEN d'autre : les identifiants,
   les positions, les tailles, les couleurs, les queues restent ceux de la
   source. Un texte libre (titre, onomatopée), un encart, un cartouche se
   traduisent aussi ; un QR code, jamais (son texte est un lien).

   Trois règles de métier :

   - **La voix avant le mot.** Relis la fiche du locuteur dans la bible de
     voix avant chaque réplique : son registre, son rythme, ses tics, se
     transposent dans la langue cible. Une traduction correcte mais uniforme
     est un REVISE.
   - **La bulle avant la phrase.** La bulle a la taille de la source : vise
     une longueur proche, jamais plus de 130 %. Quand la langue cible est
     plus longue, coupe ce qui se comprend par l'image plutôt que de
     comprimer la phrase.
   - **Les onomatopées se transposent**, elles ne se traduisent pas : un
     « BAM » français devient ce que la langue cible écrit pour ce bruit.
     Les noms propres ne changent pas sans décision d'auteur consignée au
     journal.

   Marque le gras et l'italique comme la source (`*gras*`, `_italique_`),
   et respecte la typographie de la langue cible (guillemets, espaces,
   capitales).

3. **Écris la traduction** : la liste COMPLÈTE des bulles (les mêmes ids,
   les nouveaux textes) et le texte recomposé, dans la langue :

```bash
node "$S" set-lettrage <plancheId> --file <bulles-<code>.json> --locale <code>
```

```json
{
  "text": "Nom : réplique traduite…\nNom : …",
  "bulles": [ { "id": "…", "kind": "bulle", "text": "…", … } ]
}
```

## Étape 3 : faire juger, par lots

Fais juger les répliques par le juge `traduction` (grille
`${CLAUDE_SKILL_DIR}/../../templates/juges/traduction.md`, protocole de
`_juge`) par lots de trois à six planches : donne-lui les répliques source et
cible NUMÉROTÉES, la bible de voix, le brief, et pour chaque planche le rendu
lettré dans la langue :

```bash
node "$S" rendu <plancheId> --out <fichier.png> --locale <code> --largeur 1200
```

**Regarde toi-même les rendus avant de les soumettre** : une bulle qui
déborde se voit sans juge. Une réplique trop longue se recoupe ; on ne réduit
jamais la taille du texte d'une langue en dessous de celle de la source, elle
deviendrait illisible à l'impression.

`PASS` : valide (étape 4). `REVISE` : applique ses propositions par numéro,
réécris, re-rends, re-juge avec un juge frais, trois tours au maximum.
`FAIL` : la fidélité est en cause, on reprend la planche depuis la source.

## Étape 4 : valider et ouvrir

Chaque planche jugée bonne :

```bash
node "$S" set-lettrage <plancheId> --file <bulles-<code>.json> --locale <code> --valider
```

La validation est celle de la langue : elle ne touche pas à la source. Une
version figée de l'album emporte les traductions validées.

Puis un lien de lecture dans cette langue, si la personne le veut :

```bash
node "$S" shares <projet>
node "$S" share-locale <lienId> --locale <code>
```

Une entrée de journal : la langue, le nombre de planches, ce que le juge a
fait bouger, les choix de traduction (un nom, un jeu de mots, une coupe).

## Étape 5 : livrer

```bash
node "$S" locales <projet>
```

Récapitule : la langue, les planches traduites et validées, celles restées
en retard et pourquoi, les choix consignés, le lien de lecture. Coût
d'images : zéro.

Termine par `🎉 ALBUM TRADUIT (<code>, n planches)`.

## Reprise

Relancer la skill relit `locales` et le lettrage de chaque planche : ce qui
est validé et à jour se saute, ce qui est en retard se reprend, ce qui manque
se traduit. Jamais un fichier local.

## Règles

- **La géométrie vient de la source, toujours.** Si une bulle doit bouger
  pour que la traduction tienne, c'est la source qui se corrige
  (`/bd-lettrage`), et toutes les langues en profitent.
- **Pas de traduction d'une source non calée.**
- **Une traduction en retard n'est pas une erreur, c'est une information** :
  l'atelier la mesure, tu la reprends.
- **Rien ne se génère.** Si une image doit changer d'une langue à l'autre
  (un texte dessiné dans l'image, un panneau), c'est que le texte s'est cuit
  dans les pixels : signale-le, la solution est une retouche de la case, pas
  une traduction.
