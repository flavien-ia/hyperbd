# Le mode tuto : le protocole

> Lu par `/new-bd`, `/start-hyperbd` et `/tuto-hyperbd`. Quatre règles, pour
> que l'atelier et Claude disent la même chose au même moment.

Le tuto accompagne une personne qui découvre l'atelier, en quatre étapes,
des deux côtés à la fois (l'atelier les montre dans son Guide) :

1. **Installer son harnais** (HyperBD pour l'instant) ;
2. **Ses clés et la connexion à Claude** (`/start-hyperbd`) ;
3. **Son premier univers** (le sien, ou un univers ouvert) ;
4. **Son premier projet** (`/new-bd`, ou « Nouveau projet » dans l'atelier).

Il s'arrête là : la suite (brief, univers, personnages, scénario, planches)
se fait dans le projet, avec les commandes du métier et la documentation.

**Les deux côtés lisent le même état** : l'avancement est dérivé des données
de l'atelier (un jeton qui a servi, les clés OpenAI et R2, un univers, un
projet), jamais compté par l'un ou l'autre. Il n'y a qu'une étape courante,
celle que les données disent.

## 1. Savoir si l'on est en tuto

La réponse de `me` porte un résumé `parcours` : `{ actif, etape, partie,
faites, total }`. **`actif: false` : ce protocole ne s'applique pas**, la
skill se déroule comme d'habitude, sans un mot du tuto.

Pour le détail (chaque étape, son texte atelier et son texte Claude, ce qui
est fait, ce qui manque encore) :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" parcours
```

## 2. Situer, puis une étape à la fois

En tuto, la skill commence par une ligne qui situe : « Étape 4 sur 4 : votre
premier projet. » (numéro = `faites + 1`, titre = celui de l'étape courante).
Elle ne déroule jamais deux étapes d'un coup : c'est la personne qui fait le
geste suivant, et c'est à cela qu'elle apprend.

## 3. Rien ne se marque à la main, sauf l'installation

Les étapes se cochent d'elles-mêmes quand l'atelier constate qu'elles sont
faites. La seule exception est l'installation du harnais, que l'atelier ne
voit qu'une fois Claude connecté : si la personne dit l'avoir installé,

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" parcours --vu g1-harnais
```

## 4. Le tuto est un mode guidé

Une skill lancée avec `--auto` sur un compte en tuto le dit en une phrase et
n'applique pas ce protocole.

## Arrêter, reprendre, finir

`parcours --arreter` suspend le tuto (le Guide de l'atelier reste dans son
en-tête) ; `parcours --activer` le reprend là où les données en sont. Il se
termine de lui-même au premier projet : ensuite, `/bd-brief`, et la
documentation du processus prend le relais.
