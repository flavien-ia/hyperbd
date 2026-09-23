---
name: bd-personnages
description: Crée le casting comme un graphe de forces plutôt qu'une galerie de fiches : qui incarne quoi, ce qui les lie et les charge, leurs variantes visuelles, leur couleur de bulle. Inscrit chaque personnage et ses variantes dans la bibliothèque de l'univers, et pose sur la Toile leurs fiches et le graphe des tensions. Passe aussi une vérification anti-ressemblance avec les figures connues. Utiliser après l'univers, quand la personne dit « crée les personnages », « /bd-personnages », « qui raconte cette histoire ».
argument-hint: "[projet] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Les personnages : des forces incarnées, pas une galerie

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.

Tu construis le casting. Une galerie de fiches bien remplies ne fait pas un
récit : ce qui fait un récit, ce sont les tensions entre les gens.

## Étape 0 : reprendre le fil

Lis le brief, la bible, la Toile et la bibliothèque.

```bash
S="${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs"
node "$S" docs <projet> --kind brief
node "$S" docs <projet> --kind bible
node "$S" nodes <projet>
node "$S" universe <projet>
```

Si la bibliothèque a déjà des personnages (une suite, un univers partagé),
ils existent : ne les recrée pas. Leurs fiches sont sur la Toile du projet
qui les a vus naître (des blocs `personnage`, fiche dans leur corps) :
repars d'elles.

## Étape 1 : les forces d'abord, les gens ensuite

Ne commence pas par « il me faut un héros ». Commence par : **quelles forces
doivent s'affronter pour que cette histoire dise ce qu'elle a à dire ?**

Puis, pour chaque force, cherche qui l'incarne. C'est ce chemin qui évite le
porte-parole : un personnage né d'une force a des raisons, une histoire et des
angles morts ; un personnage né d'un rôle n'a que des répliques.

Vise peu de personnages. Un récit choral tient à cinq ou six figures qu'on
reconnaît, pas à quinze qu'on confond.

## Étape 2 : les fiches

Une fiche par personnage principal. Écris-la d'abord dans un fichier : elle
ira sur la Toile à l'étape 4.

Ce qu'elle contient :

1. **Statut** dans le récit (protagoniste, force adverse, témoin).
2. **Nom** complet, et le prénom d'usage qui servira dans les bulles.
3. **Origine** et **âge**.
4. **Apparence** : trois ou quatre traits qu'on peut redessiner de mémoire. Ce
   sont eux qu'on redonnera au générateur d'images à chaque planche.
5. **Ce qu'il fait** dans le monde.
6. **Ce qu'il veut** (le désir affiché) et **ce dont il a besoin** (ce qui lui
   manque vraiment). Quand les deux divergent, il y a un personnage. Cette
   recette est la plus sûre, elle n'est pas obligatoire : un personnage-mystère
   ou une force de la nature peuvent vivre, si c'est un choix.
7. **Ce qu'il paie** au cours du récit.
8. **Ses relations**, une ligne par personne, avec la charge (dette, secret,
   rivalité, loyauté contradictoire).
9. **Son parler** : une manière à lui, et un exemple de réplique.
10. **Sa couleur de bulle** (elle sera constante sur tout l'album).
11. **Ce qu'il devient** ensuite, s'il y a une suite.

## Étape 3 : la bibliothèque, et les variantes

La bibliothèque de l'univers porte ce qui part dans les générations et dans
le lettrage : le nom, la couleur de bulle, et une **description courte**. Pas
la fiche : la description est redonnée au modèle d'images à CHAQUE planche où
le personnage est casté, et une biographie y noierait les traits qui comptent.

Pour chaque personnage principal, le **conteneur** porte l'identité :

```bash
node "$S" new-entry <projet> --kind character --name "<Nom complet>" \
  --color "<#hex>" --snippet-file apparence-<nom>.txt
```

Le nom est celui des bulles : un locuteur de bulle se reconnaît à ce que
chacun de ses mots commence un mot du nom en bibliothèque (« Mira » trouve
« Mira Vasseur »), et c'est ainsi que la bulle prend sa couleur. Un nom de
bulle qui ne trouve personne reste noir. La description (`apparence-<nom>.txt`)
tient en trois ou quatre traits : ceux de la fiche, point 4.

Une **variante** est un état visuel distinct : un costume, un âge, une
blessure, une tenue de cérémonie. **C'est ce qu'on caste sur une planche, pas
le personnage en général.** Déclare-les maintenant, sous leur conteneur ;
chacune deviendra un jeu d'images de référence au temps de la direction
artistique :

```bash
node "$S" new-entry <projet> --kind character --name "<Nom> (<la variante>)" \
  --parent <id du conteneur> --snippet-file variante-<nom>-<variante>.txt
```

La description d'une variante dit ce qui la distingue (la tenue, l'âge,
l'état), en matière et en coupe plutôt qu'en nom.

## Étape 4 : les fiches et le graphe des tensions, sur la Toile

Pose chaque personnage principal sur la Toile, **sa fiche dans le corps de
son bloc**, et TRACE les tensions entre eux, le tout dans un seul lot (voir
`_toile`) :

```bash
node "$S" scenario <projet> --file casting.json
```

```json
{
  "nodes": [
    { "type": "note", "title": "Le casting : les forces et leurs tensions" },
    { "type": "personnage", "title": "Mira Vasseur", "refId": "<id du conteneur>", "body": "<la fiche>" },
    { "type": "personnage", "title": "Tobias Renn", "refId": "<id du conteneur>", "body": "<la fiche>" }
  ],
  "edges": [
    { "from": 1, "to": 2, "type": "tension", "label": "elle sait, il ignore qu'elle sait" }
  ]
}
```

C'est là que la personne lira les fiches, et qu'elle les corrigera : un clic
sur le bloc ouvre son panneau, la fiche est dans « Contenu ». Chaque lien de
tension porte un label qui dit la charge (« la dette de 2019 », « elle sait,
il ignore qu'elle sait »).

Ce graphe sert deux fois : il montre les personnages isolés (personne ne les
relie : ils ne servent à rien), et il donnera au temps du scénario le test
« cette scène déplace-t-elle une arête ? ».

## Étape 5 : la vérification anti-ressemblance

Pour chaque personnage principal, cherche activement à qui il ressemble dans la
bande dessinée, l'animation et la culture populaire. Utilise la recherche web
si elle est disponible.

Ce n'est pas de la paranoïa : c'est ce qui a fait retravailler trois fois le
physique d'un personnage sur un album publié. Un personnage qui rappelle
immédiatement un autre vole l'attention du lecteur.

Si une ressemblance forte apparaît, propose ce qui la lève : ce n'est presque
jamais le concept qu'il faut changer, c'est un ou deux traits. Un trait qui
change se corrige à deux endroits : dans la fiche (le bloc sur la Toile,
`write-node`) et dans la description de la bibliothèque (`set-entry`).

## Étape 6 : la relecture

Fais juger par `incarnation` (des gens ou des porte-voix ?) et `coherence`
(les fiches se contredisent-elles, contredisent-elles la bible ?). Les juges
lisent les fiches sur la Toile (`node <bloc>`). Boucle jusqu'à PASS, trois
passes au maximum.

## Étape 7 : livrer

Récapitule : les forces et qui les incarne, les trois ou quatre tensions
principales, ce qui a été retravaillé après la vérification de ressemblance.
Annonce la suite (`/bd-scenario`).

Termine par `🎉 CASTING POSÉ`.

## Règles

- **Un personnage qu'aucune tension ne relie aux autres est à couper ou à
  fusionner.** Dis-le franchement.
- **L'adversaire doit être défendable.** Un antagoniste qui a tort sur toute la
  ligne ne convainc que ceux qui étaient déjà d'accord.
- **Les couleurs de bulles doivent se distinguer entre elles**, y compris pour
  un lecteur qui distingue mal les couleurs : vérifie les contrastes, pas
  seulement les teintes.
- **La description de la bibliothèque reste courte.** Trois ou quatre traits,
  pas une fiche : elle part dans chaque génération.
- N'invente pas de personne réelle. Si le projet parle de gens qui existent,
  c'est une décision éditoriale à poser avec la personne, pas un choix d'écriture.

## En mode tuto

Si `me` dit `parcours.actif`, suis le protocole de
`${CLAUDE_SKILL_DIR}/../../templates/tuto.md` : ouvre par le contexte
(« Étape n sur 11 : ... »), termine par l'instruction miroir (où aller dans
l'atelier, quoi regarder, puis quoi taper), marque un « vu » quand la
personne dit qu'elle a regardé, une étape à la fois. En `--auto`, dis que le
tuto ne s'applique pas, et déroule.
