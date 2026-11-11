---
name: bd-univers
description: Le pilote de la phase univers : fait le point sur ce que l'univers du projet contient déjà (prompt, bible, style, personnages, lieux), puis enchaîne dans l'ordre la bible du monde (/bd-bible), la direction artistique (/bd-da), les personnages (/bd-perso) et les lieux (/bd-decors), en s'arrêtant à chaque décision de l'auteur. Reprend à la première étape qui manque. Utiliser après le brief, quand la personne dit « construis l'univers », « /bd-univers », « on invente le monde », « on fait tout l'univers ».
argument-hint: "[projet] [--auto] [--budget <dollars>]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# L'univers : le monde, son allure, ses gens, ses lieux

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher, les quatre étapes de l'univers.

Tu mènes la phase univers d'un album, avant son récit. Tu n'as **aucune
logique à toi** : tu fais le point, tu ordonnes, et tu passes la main à la
skill de chaque étape, qui fait le travail. On peut toujours appeler ces
quatre skills une par une ; toi, tu évites qu'on en oublie une ou qu'on les
prenne dans le désordre.

Pourquoi l'univers avant le récit : la direction artistique donne envie de
continuer, et les personnages doivent être vus tôt. Un scénario écrit pour
des personnages qu'on a déjà sous les yeux s'écrit mieux.

## Étape 0 : l'état des lieux

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" project <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" universe-prompt <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" universe <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" journal <projet> --limite 20
```

Sans brief, invoque d'abord `bd-brief`.

Ce que tu en tires, étape par étape :

| Étape | Faite quand | Sinon |
|---|---|---|
| 1. La bible | un document `bible` existe, et le prompt d'univers n'est pas vide | `/bd-bible` |
| 2. La direction artistique | un style est coché par défaut dans l'univers (`styles`, `styleDefault: true`) et le document `bible-graphique` existe | `/bd-da` |
| 3. Les personnages | les personnages que la bible fait agir sont retenus dans l'univers, avec une fiche (`aFiche`) et des références (`nbImages` > 0 sur leurs variantes), et aucune proposition n'attend (`propositions`) | `/bd-perso` |
| 4. Les lieux | les lieux que la bible nomme ont leur décor, avec des références | `/bd-decors` |

**Sur un univers déjà fourni** (HELO, la copie d'un univers ouvert), une
grande partie est faite : dis-le, et ne relance que ce qui manque pour CET
album. Un univers copié se reconnaît à son crédit « d'après … » ; sa copie
d'images peut être en cours (`copie <univers>`) : attends qu'elle soit finie
avant de juger ce qui manque (`copie <univers> --attendre`).

Montre la liste à cocher à la personne, et dis par où tu reprends.

## Étapes 1 à 4 : passer la main, s'arrêter aux décisions

Pour chaque étape qui manque, dans l'ordre : **charge la skill de l'étape et
suis-la** pour ce projet. Chacune s'arrête aux décisions qui reviennent à
l'auteur :

1. `/bd-bible` : le choix de la prémisse parmi les pistes posées sur l'établi.
2. `/bd-da` : le choix d'une piste graphique, jugée dans la planche contact.
3. `/bd-perso` : le casting (retenir ou écarter chaque proposition), puis les
   références de chaque personnage retenu.
4. `/bd-decors` : les lieux à dessiner, puis leurs références.

Entre deux étapes, coche la liste et dis en une phrase ce qui vient d'être
posé et ce qui vient. En `--auto`, tu enchaînes sans attendre, le panel de
juges tranche à la place de l'auteur, et tout va au journal. Le `--budget`
se partage entre les étapes qui génèrent des images (la DA, les personnages,
les lieux) : annonce le partage avant la première génération.

## Livrer

Quand les quatre étapes sont faites, récapitule : le monde en trois phrases,
la piste graphique retenue, le casting, les lieux. Dis où tout se voit dans
l'atelier : l'univers (onglets Personnages, Décors, Style ; chaque fiche est
l'atelier de création de l'élément, avec ses images à juger), le Dossier pour
la bible et la bible graphique, la planche contact pour les pistes de la
direction artistique.

Annonce la suite : le récit, avec `/bd-scenario`.

Termine par `🎉 UNIVERS POSÉ`.

## Règles

- **Rien à toi** : pas de génération, pas d'écriture de bible, pas de
  personnage créé ici. Tout passe par la skill de l'étape.
- **Une décision de l'auteur ne se prend pas à sa place**, sauf en `--auto`.
- **On reprend, on ne recommence pas** : une étape faite reste faite.
