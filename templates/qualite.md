# La qualité des images : l'annoncer, la demander, la retenir

> Lu par toutes les skills qui génèrent : `/bd-da`, `/bd-perso`, `/bd-decors`,
> `/bd-planche-test`,
> `/bd-planches`, `/bd-couverture`, `/bd-album`. Une seule règle : la
> personne sait ce qu'elle paie et dans quelle définition, avant la première
> image, et elle peut en changer quand elle veut.

## Les réglages par défaut

| Ce qu'on génère | Qualité | Pourquoi |
|---|---|---|
| Les pistes de direction artistique, les concepts de couverture | basse | on compare des intentions, pas des finitions |
| Les personnages, les décors, les motifs | moyenne | des références : elles guident le dessin, on ne les imprime pas |
| Les cases d'une planche | moyenne | elles servent de matière à la planche, qui les redessine en les intégrant |
| **La planche entière** (celle qu'on lit et qu'on imprime) | **haute** | c'est l'image finale : 3408 x 2416 pour une double page, 2416 x 3408 pour une page simple |
| La couverture, la quatrième | haute | même raison |

En moyenne, une double page ne fait que 1536 x 1088 : assez pour lire à
l'écran, trop peu pour imprimer sans que l'agrandissement invente plus du
triple de la largeur. C'est la raison du défaut « haute » sur la planche.

Ordre de grandeur des prix, à dire tel quel (l'atelier donne le coût estimé
de chaque génération avant qu'elle parte, et `costs` le coût réel) : une
case en moyenne, quelques centimes ; une planche entière en haute, autour de
0,50 $ ; la même en moyenne, autour de 0,05 $.

## Avant la première génération d'un projet

Lis le journal (`journal <projet> --limite 30`) : cherche une entrée qui
commence par « Qualité des images ».

**Elle n'existe pas** : c'est la première fois. Avant de générer quoi que ce
soit, dis à la personne, en quelques lignes et sans jargon :

1. les réglages ci-dessus, pour ce qu'on va générer maintenant et pour la
   suite (« les cases en moyenne, la planche finale en haute définition ») ;
2. ce que ça coûte, en ordre de grandeur, pour le lot qui arrive ;
3. qu'elle peut **en changer à tout moment** : en te le disant (« passe les
   planches en moyenne », « tout en haute »), ou dans l'atelier quand elle
   génère elle-même (vue Planche, colonne de droite, le champ « Qualité » :
   Basse, Moyenne, Haute) ;

puis demande-lui si ça lui convient, et attends sa réponse. Consigne-la au
journal, pour ne plus avoir à la redemander :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" journal-add <projet> --file qualite.json
```

```json
{
  "kind": "decision",
  "body": "Qualité des images. Cases : moyenne. Planche entière : haute. Couverture : haute. Références : moyenne. Explorations : basse. Choisi par l'auteur le <date>."
}
```

Une entrée de journal n'a pas de titre : c'est sa première phrase qui la
nomme, d'où « Qualité des images. » en tête.

**Elle existe** : applique-la sans reposer la question, et rappelle-la d'une
ligne quand tu annonces le coût d'un lot (« planches en haute définition,
comme convenu »).

## Quand la personne change d'avis

Écris une nouvelle entrée « Qualité des images » (la plus récente fait foi),
et applique-la aux générations qui suivent. Ce qui est déjà produit ne se
refait pas tout seul : si elle veut reprendre des planches dans la nouvelle
qualité, chiffre-le d'abord.

## En `--auto`

Pas de question : applique l'entrée du journal s'il y en a une, sinon les
réglages par défaut, et dis-le dans le plan (« planches finales en haute
définition, environ 0,50 $ pièce »). Le plafond `--budget` tient compte de
ce choix.

## Dans les commandes

La qualité se passe à chaque génération (`--quality low|medium|high`). **Ne
donne jamais de taille** : l'atelier la calcule depuis la qualité et le
format de l'album.
