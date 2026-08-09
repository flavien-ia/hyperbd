---
name: bd-design
description: Dessine le casting et les décors selon la direction artistique arrêtée : planche de références et portrait par variante de personnage, décors récurrents, motifs, chacun passé au regard d'un juge puis versé dans la bibliothèque. Finit par une planche test complète, qui prouve que tout le pipeline tient. Utiliser après /bd-da, quand la personne dit « dessine les personnages », « /bd-design », « on passe au visuel ».
argument-hint: "[projet] [--auto] [--budget 10]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et curl."
---

# Le design : donner un visage à ce qui n'était que des noms

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.
- **Annonce toujours un coût AVANT de le dépenser.** Cette étape est la plus
  dépensière du harnais : chaque variante de chaque personnage compte.

Ce qui rend un album cohérent n'est pas le talent du modèle, c'est la
**redondance de description**. Un personnage tient d'une planche à l'autre
parce que ses traits sont re-décrits à chaque fois, mot pour mot, en plus de
ses images de référence. C'est ce que cette étape fabrique.

## Étape 0 : reprendre le fil

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" docs <projet> --kind bible-graphique
node "$S" universe <projet>
node "$S" scenario <projet>
node "$S" costs <projet>
```

**S'il n'y a pas de bible graphique, arrête-toi** et envoie vers `/bd-da`.
Dessiner sans DA verrouillée produit un casting qu'il faudra refaire, et cela
se paie deux fois.

## Étape 1 : l'ordre de production

Ne dessine pas tout le monde. Dessine **ce qui sert**.

Lis la structure : les castings des scènes disent quelles variantes existent
vraiment dans le récit. Une variante que personne ne porte dans aucune scène
n'a pas à être produite.

L'ordre :

1. Les personnages **principaux**, chacune de leurs variantes castées ;
2. les **secondaires** qui reviennent (trois apparitions ou plus) ;
3. les décors **récurrents** ;
4. les **motifs** qui doivent rester identiques (un objet, un signe, un
   véhicule).

Présente cette liste avant de commencer, avec le nombre d'images et le coût
estimé. En guidé, fais-la valider : c'est là qu'on coupe, pas après.

## Étape 2 : les personnages

Par variante, **deux images** :

- **la planche de références** (multi-vues, format paysage) : face, profil,
  trois-quarts, de dos, plus un détail si le personnage en a un. C'est elle qui
  servira de référence à toutes les planches.
- **le portrait** (format portrait) : le visage, en gros, dans la lumière de la
  DA. C'est lui qui sert à juger la ressemblance.

Le prompt : **le cadre de la DA** + la fiche d'apparence + ce qui distingue
cette variante. Toujours dans cet ordre : le style d'abord, le sujet ensuite.

**Ne fais jamais porter à la planche de style l'identité d'un personnage.**
Elle dit à quoi ressemble l'ALBUM, pas à quoi ressemble quelqu'un. Si tu la
passes seule en référence pour dessiner Mira, le modèle y prend aussi le
costume, le front, la valeur du pull — et le juge, faute de mieux, jugera la
ressemblance à cette aune. Le remède est un détourage : recadre la figure du
personnage dans la planche de style et donne-le comme référence SÉPARÉE de
costume et de visage. Deux références qui disent chacune une chose valent
mieux qu'une qui en dit deux.

**Décris le costume en matière et en coupe, pas en nom.** « Veste de toile »
donne un blouson de cuir court une fois sur deux ; « long manteau de toile de
travail usée descendant à mi-cuisse, col montant à patte boutonnée, tissu
froissé et mat » ne laisse pas le choix. Les deux planches de références de la
recette ont dérivé exactement là, et rien d'autre.

```bash
node "$S" essai <projet> --kind personnage \
  --prompt "<cadre>, <apparence>, <variante>" --size paysage --wait
```

Puis :

1. **Le regard** : passe par `_vision-qa`. Les questions propres à un
   personnage : la silhouette est-elle lisible en petit ? les traits sont-ils
   re-descriptibles avec des mots (c'est ce qui les rendra reproductibles) ?
   les vues sont-elles cohérentes entre elles ? la DA est-elle tenue ?
2. **La sélection** : l'humain choisit en guidé, le juge en `--auto`.
3. **La promotion** vers la variante, images étoilées (trois au plus : ce sont
   celles qui partiront en référence dans chaque génération) :

```bash
node "$S" promote-image <imageId> --entry <entryId>
node "$S" star <projet> <imageId>
```

4. **Le texte de rappel** de la variante : mets à jour sa description avec les
   traits à re-décrire à chaque planche. Cinq à dix mots précis, pas un
   paragraphe : la coiffure, un vêtement, une couleur, une particularité.
   C'est la pièce qui fait tenir la cohérence, et elle est en texte, pas en
   image.

```bash
node "$S" set-entry <projet> <entryId> --file patch.json
```

## Étape 3 : les décors et les motifs

Même mécanique, en essais `decor` et `motif`, versés en entrées `decor` de
l'univers.

Un décor récurrent demande **au moins deux angles** : les modèles refabriquent
volontiers une pièce voisine mais différente, et c'est en continuité que cela
se voit.

Pour un motif, une seule image nette suffit, mais elle doit être sur fond neutre :
elle servira de référence, pas d'illustration.

## Étape 4 : la planche test

C'est la preuve que **tout** le pipeline tient : la DA, les personnages, les
décors, la génération de planche, le lettrage.

1. Crée une planche réelle dans le projet.
2. Écris un **court script de 3 ou 4 cases** sur la scène étalon. Un script
   d'essai, pas le dialogue canonique : on teste la fabrication, pas l'écriture.
3. Caste les variantes qui viennent d'être produites.
4. Génère par le pipeline de planche, et attends :

```bash
node "$S" create-planche <projet> --title "Planche test"
node "$S" write <plancheId> --file script.json
node "$S" generate <plancheId> --wait
```

5. Passe au regard (`_vision-qa`), en donnant cette fois **le script demandé**
   comme référence : c'est la dimension `script` qui se joue ici.
6. Dérive le lettrage, pour voir les bulles se poser :

```bash
node "$S" derive-lettrage <plancheId>
```

7. Présente le résultat.

Si la planche test échoue, ce n'est pas un échec de l'étape : c'est
exactement ce à quoi elle sert. Dis ce qui a cassé, et où : la DA, une
variante, le script, ou le pipeline.

## Étape 5 : le bilan

```bash
node "$S" costs <projet>
```

Le coût **réel**, par l'atelier, pas une estimation. Ventilé : combien pour les
personnages, combien pour les décors, combien pour la planche test. C'est ce
chiffre qui permet d'estimer l'album entier.

Consigne au journal : ce qui a été produit, ce qui a demandé plusieurs tours,
et ce qui reste fragile.

## Étape 6 : livrer

Récapitule : les personnages et variantes dessinés, les décors, la planche test
et ce qu'elle prouve, le coût réel, et l'estimation pour l'album complet.

Termine par `🎉 DESIGN POSÉ, PLANCHE TEST FAITE`.

## Règles

- **Une variante non castée ne se dessine pas.** C'est de l'argent dépensé pour
  une image que personne ne verra.
- **Trois images étoilées au plus par entrée.** Au-delà, les références se
  contredisent et le modèle choisit à ta place.
- **Le texte de rappel compte autant que l'image.** Une variante avec de belles
  références mais sans description reproductible dérivera dès la planche 10.
- **Ne jamais accepter un « presque » sur un personnage principal.** Il
  reviendra sur soixante planches.
- **La planche test se fait sur un vrai script**, pas sur une image d'ambiance.
  Une jolie illustration ne prouve rien du pipeline.
