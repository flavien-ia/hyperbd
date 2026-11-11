---
name: bd-decors
description: Les lieux de l'album, proposés dans l'univers puis dessinés selon la direction artistique. Deux passes, la même skill : avant le scénario, les lieux du monde que la bible nomme ; après, ceux que les scènes ont fait naître (un lieu qui revient sans décor), et les motifs qui doivent rester identiques. Ne propose et ne dessine que ce qui manque. Utiliser après la direction artistique, ou à la fin du scénario, quand la personne dit « les décors », « les lieux », « /bd-decors ».
argument-hint: "[projet] [--auto] [--budget <dollars>]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js et une clé d'images configurée dans l'atelier."
---

# Les lieux : là où l'histoire se passe, toujours au même endroit

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.
- **Annonce toujours un coût AVANT de le dépenser.**

Les modèles refabriquent volontiers une pièce voisine mais différente, et
c'est en continuité que cela se voit : la cuisine de la planche 4 n'est plus
celle de la planche 31. Un décor récurrent se fixe donc comme un personnage :
une fiche, des références, un texte de rappel.

Pourquoi deux passes : on ne peut pas savoir avant le scénario qu'un couloir
d'hôpital revient dans quatre scènes, et dessiner d'avance des décors qui ne
serviront pas coûte de l'argent. La première passe pose les lieux du MONDE,
que la bible nomme (la ville, le lieu central) ; la seconde, ceux que le
RÉCIT a fait naître.

## Étape 0 : reprendre le fil

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" docs <projet> --kind bible
node "$S" docs <projet> --kind bible-graphique
node "$S" universe <projet>       # les décors retenus, leurs images, les propositions
node "$S" nodes <projet>          # les scènes : meta.lieu, meta.decorIds
node "$S" costs <projet>
```

**Sans bible graphique, arrête-toi** et envoie vers `/bd-da`.

Puis dresse la liste de ce qui manque :

- **Première passe** (aucune scène encore) : les lieux que la bible nomme et
  où l'histoire passera forcément. Trois à six, pas plus.
- **Seconde passe** (le récit existe) : pour chaque lieu (`meta.lieu`,
  `meta.decorIds`) qui revient dans **deux scènes ou plus**, a-t-il son décor
  dans l'univers, avec des références ? Et les **motifs** (un objet, un signe,
  un véhicule) qui doivent rester identiques d'une case à l'autre.

Un lieu qui ne sert qu'une fois ne se fixe pas : la case le décrit.

## Étape 1 : proposer, dans l'univers

Une fiche courte par lieu (ce qu'il est dans l'histoire, ce qui s'y joue, ce
qu'il dit du monde), et une description visuelle de trois ou quatre traits
(matières, lumière, échelle) :

```bash
node "$S" new-entry <projet> --kind decor --name "<Lieu>" \
  --snippet-file decor-<lieu>.txt --fiche-file fiche-<lieu>.md --proposition
```

Un motif est un `objet` : `--kind objet`. La personne retient ou écarte dans
l'univers, onglet Décors (ou Objets) ; reporte ses décisions comme pour les
personnages (`set-entry` avec `{ "statut": "retenu" }` ou `"ecarte"`). Dans la
seconde passe, relie les scènes au décor retenu (`write-node <scène>` avec
`meta.decorIds`) : c'est ce qui le fera partir en référence.

## Étape 2 : dessiner les retenus

La qualité s'annonce et se demande à la première génération du projet (voir
`${CLAUDE_SKILL_DIR}/../../templates/qualite.md`). Présente la liste, le
nombre d'images et le coût estimé ; en guidé, fais-la valider.

- Un décor récurrent demande **au moins deux angles** (un plan large, un
  contrechamp), dans la lumière de la DA.
- Un motif : une seule image nette, **sur fond neutre** : elle servira de
  référence, pas d'illustration.

```bash
node "$S" essai <projet> --kind decor --label "<lieu> : plan large" --prompt-file decor-<lieu>-large.txt --size paysage --wait
node "$S" essai <projet> --kind decor --label "<lieu> : contrechamp" --prompt-file decor-<lieu>-contre.txt --size paysage --wait
node "$S" essai <projet> --kind motif --label "<motif>" --prompt-file motif-<motif>.txt --size carre --wait
```

Le prompt : **le cadre de la DA** d'abord, le lieu ensuite. Puis le regard
(`_vision-qa`), la sélection dans la **planche contact**
(`app.studio-entremondes.fr/projet/<projet>?m=essais&genre=decor`), la
promotion et l'étoile (trois au plus), et le texte de rappel :

```bash
node "$S" promote-image <imageId> --entry <entryId>
node "$S" star <projet> <imageId>
node "$S" set-entry <projet> <entryId> --file patch.json
```

## Étape 3 : livrer

Récapitule : les lieux retenus, ce qui a été dessiné, le coût réel (`costs`).
Annonce la suite :

- après la première passe, le récit (`/bd-scenario`), ou laisse `/bd-univers`
  conclure s'il t'a appelé ;
- après la seconde passe, la planche test (`/bd-planche-test`).

Termine par `🎉 LIEUX POSÉS`.

## Règles

- **Un lieu qui ne revient pas ne se fixe pas.**
- **On ne dessine pas une proposition** : seulement ce qui est retenu.
- **Trois images étoilées au plus par entrée.**
- **Le texte de rappel compte autant que l'image.**
- **Un refus du fournisseur se traite selon la doctrine commune**
  (`${CLAUDE_SKILL_DIR}/../../templates/refus.md`).
- **Rien dans la vue Scénario** : un lieu vit dans l'univers.
