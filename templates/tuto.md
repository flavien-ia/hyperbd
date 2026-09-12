# Le mode tuto : le protocole

> Lu par les skills du premier album (`new-bd`, `bd-brief`, `bd-univers`,
> `bd-personnages`, `bd-scenario`, `bd-da`, `bd-design`) et par
> `/tuto-hyperbd`. Cinq règles, pour que l'atelier et Claude disent la même
> chose au même moment.

Le tuto accompagne une personne de son premier login à sa première planche,
des deux côtés à la fois : l'atelier (le Guide) lui dit quand aller dans
Claude Code et quoi y taper ; le harnais lui dit quand aller dans l'atelier
et quoi y regarder. **Les deux lisent le même état** : l'avancement est
dérivé des données de l'atelier (clés, jeton, brief, bible, personnages,
scène validée, pistes, planche), jamais compté par l'un ou l'autre. Il n'y a
qu'une étape courante, celle que les données disent.

## 1. Savoir si l'on est en tuto

La réponse de `me` porte un résumé `parcours` : `{ actif, etape, partie,
faites, total }`. **`actif: false` : ce protocole ne s'applique pas**, la
skill se déroule comme d'habitude, sans un mot du tuto.

Pour le détail (les onze étapes, chacune avec son texte atelier et son texte
Claude, ce qui est fait, ce qui est à regarder) :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" parcours
```

## 2. Ouvrir par le contexte

En tuto, la skill commence par une ligne qui situe : « Étape 6 sur 11 : le
scénario. » (numéro = `faites + 1`, titre = celui de l'étape courante). Si
l'étape courante n'est PAS celle que la skill sert (la personne a tapé
`/bd-da` alors que le parcours en est aux personnages), dis-le en une phrase
et propose l'ordre : « Le Guide en est aux personnages ; on peut faire la
direction artistique d'abord, mais elle a besoin d'eux. Je continue ? » Ne
refuse jamais : le tuto conseille, il ne verrouille pas.

## 3. Fermer par le miroir

À la fin de la skill, l'instruction miroir, en trois temps, et RIEN d'autre
après elle :

1. **où aller** dans l'atelier (le lien de l'étape, `parcours` le donne :
   la Toile, les Coulisses, la bibliothèque Personnages, le Laboratoire,
   Planches) ;
2. **quoi regarder** (le texte `claude` de l'étape, dit avec tes mots) ;
3. **puis quoi taper** (la commande de l'étape suivante).

Une étape « à regarder » (`regard: true`) se marque vue quand la personne dit
qu'elle a regardé :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" parcours --vu <etape>
```

Une étape qui a une détection (un brief, une scène validée) ne se marque
pas : les données ont le dernier mot, et `parcours` la montrera faite quand
elle le sera. Pour l'étape du scénario, où la personne doit ELLE valider une
scène sur la Toile, on attend qu'elle le dise, puis on vérifie par `nodes`.

## 4. Une étape à la fois

Le tuto ne déroule jamais deux étapes d'un coup, même quand la suivante est
évidente : c'est la personne qui tape la commande suivante, et c'est à cela
qu'elle apprend. La seule exception est celle que `/new-bd` fait déjà :
enchaîner sur le brief, parce que le projet vide ne dit rien.

## 5. Le tuto est un mode guidé

Une skill lancée avec `--auto` sur un compte en tuto le dit en une phrase
(« Le mode tuto ne s'applique pas en automatique : je déroule, et le Guide
de l'atelier continue de suivre ») et n'applique pas ce protocole. L'objet du
tuto est que la personne tranche ; l'automatique tranche à sa place.

## Le coût, avant

Les étapes qui paient (la direction artistique, la planche test) portent une
fourchette (`cout`) : dis-la avant la première image, et vérifie les clés
(`me`). Sans clés, le Guide de l'atelier ramène à l'étape des clés ; fais de
même, sans bloquer le reste (le scénario s'écrit sans image).

## Arrêter, reprendre

`parcours --arreter` suspend le tuto (le Guide de l'atelier reste dans son
menu) ; `parcours --activer` le reprend là où les données en sont. Le tuto se
termine de lui-même à la planche test : ensuite, `/bd-voix`, et la
documentation prend le relais.
