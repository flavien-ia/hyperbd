---
name: bd-voix
description: Pose la bible de voix de l'album, personnage par personnage : niveau de langue, rythme, tics, ce qu'il ne dirait jamais, et trois à cinq répliques canoniques. Fait passer aux échantillons une épreuve d'aveugle mesurée (on retire les noms, un juge attribue, le taux est compté) pour prouver que les voix se distinguent vraiment. Arrête aussi les conventions d'écriture du projet. Utiliser après le casting et la direction artistique, quand la personne dit « la bible de voix », « comment ils parlent », « /bd-voix », avant d'écrire le moindre dialogue.
argument-hint: "[projet] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# La bible de voix : que chacun parle comme lui-même

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.

Tu poses la manière de parler de chacun, avant qu'une seule scène soit
dialoguée. C'est un travail qu'on croit pouvoir sauter : on écrit les scènes,
on ajustera. En pratique on n'ajuste jamais, et l'album entier se retrouve
écrit par une seule voix, celle de l'auteur, distribuée entre plusieurs noms.

## Étape 0 : reprendre le fil

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind bible
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind bible-graphique
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" universe <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" nodes <projet>
```

**Sans casting, arrête-toi** : renvoie vers `/bd-personnages`. Une voix se pose
sur quelqu'un, pas sur un rôle.

Si une bible de voix existe déjà, dis ce qu'elle couvre et propose de la
compléter plutôt que de la refaire.

## Étape 1 : les registres

Un registre par personnage qui parle plus de deux fois dans l'album. Les
autres n'ont pas besoin d'une fiche : ils ont besoin de ne pas parler comme les
protagonistes.

Pour chacun, propose (et fais valider) :

- **Le niveau de langue, et d'où il vient.** La provenance compte plus que
  l'étiquette : « soutenu » ne s'écrit pas, « il parle comme le manuel qu'il a
  appris par cœur à quinze ans » s'écrit.
- **Le rythme** : longueur de phrase, coupe-t-il, laisse-t-il traîner. Une voix
  se reconnaît au débit avant de se reconnaître au vocabulaire.
- **Deux ou trois tics**, pas dix. Au-delà, ce n'est plus une voix, c'est un
  numéro.
- **Ce qu'il ne dirait JAMAIS.** La ligne la plus utile : c'est elle qui
  empêche de lui faire dire ce dont on a besoin le jour où on est pressé.
- **Sous pression** : dans quel sens la voix se déforme quand ça chauffe.

Tire-les de la fiche du personnage et du graphe des tensions, pas de rien : un
personnage qui doit une chose à un autre lui parle autrement qu'aux autres.

**Fais-les diverger volontairement.** Deux personnages proches d'origine et de
milieu se ressembleront à l'écrit si on ne décide pas où ils diffèrent. Choisis
l'axe : le débit, le rapport à la question, le degré de politesse, ce qu'ils
font des silences.

## Étape 2 : les échantillons, et leur épreuve

Écris 3 à 5 répliques canoniques par personnage principal. Pas des maximes :
des phrases qu'il dit dans une situation ordinaire.

Puis **mets-les à l'épreuve**. C'est le cœur de cette skill, et ce n'est pas
une formalité : c'est ce qui distingue une bible de voix vérifiée d'une bible
de voix espérée.

**1. Prépare l'épreuve.** Écris les échantillons dans un JSON
(`[{"name": "...", "text": "..."}]`), puis :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/attribution.mjs" prepare \
  --in <echantillons.json> --anon <anonyme.md> --cle <cle.json>
```

**2. Lance l'attributeur.** Un subagent (Agent, type general-purpose) qui
attribue chaque réplique. Sa mission :

> Voici des répliques dont les noms ont été retirés : `<anonyme.md>`. Voici les
> registres des personnages : `<registres.md>`. Attribue chaque réplique à un
> locuteur. Fonde-toi sur la VOIX seule : longueur de phrase, niveau de langue,
> tournures, tics. Ne te fonde PAS sur le sujet abordé : le thème d'une
> réplique ne dit rien de qui la prononce. Réponds UNIQUEMENT par un JSON
> `{"1": "Nom", "2": "Nom", ...}`, une entrée par numéro, sans commentaire. Si
> tu hésites, tranche quand même.

La consigne sur le sujet n'est pas une formalité : sans elle, l'attributeur
reconnaît le thème et non la voix (voir plus bas).

> ⚠️ **L'attributeur ne doit JAMAIS voir les échantillons associés à leur
> nom.** Ne lui donne que les registres (niveau de langue, rythme, tics,
> interdits), amputés de la section des échantillons. S'il lit les échantillons
> étiquetés, il ne juge plus une voix : il recopie un tableau, le taux monte à
> 100 %, et la mesure ne vaut rien.

Il ne voit pas non plus la clé : elle est dans un fichier qu'on ne lui donne pas.

**3. Compte.**

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/attribution.mjs" score \
  --cle <cle.json> --reponses <reponses.json>
```

Le rapport donne le taux brut, le taux du réflexe majoritaire (répondre
toujours le personnage qui parle le plus), l'écart entre les deux, une note sur
10 et les confusions nommées.

**4. Lis le verdict.**

- `DIFFÉRENCIÉ` : les échantillons tiennent, continue.
- `INTERCHANGEABLE` : deux voix se confondent, et le rapport te dit lesquelles.
  **Ne réécris pas tout** : va lire les répliques confondues, trouve ce qu'elles
  ont en commun, et fais diverger UN axe (le débit, la longueur, un tic, le
  rapport à la question). Puis refais l'épreuve, avec un attributeur frais.

Trois passes au maximum. Au-delà, garde la meilleure version, dis le taux
obtenu franchement, et signale quelles voix restent proches : c'est une
information utile pour la suite, pas un échec à cacher.

**5. Le piège d'un bon taux.** Un taux élevé peut ne rien devoir aux voix : si
chaque personnage possède ses propres sujets, on l'attribue au thème sans avoir
entendu une syllabe.

C'est mesuré, pas supposé. Un même jeu de répliques écrites dans une seule voix
donne 94 % quand les sujets sont séparés, et 50 % quand ils sont appariés.

Donc, avant de te réjouir d'un bon score, regarde tes échantillons : **est-ce
que chacun parle de choses que l'autre pourrait aborder ?** Si non, l'épreuve
n'a pas mesuré ce que tu crois. Réécris les échantillons sur des situations
communes et refais-la.

## Étape 3 : les conventions d'écriture

Propose des valeurs par défaut, ajuste-les au projet, fais valider :

- **oralité et contractions** : « je ne sais pas » ou « j'sais pas », et dans
  quelles bouches. Décider une fois : l'hésitation se voit à la lecture ;
- **les silences** : `Personnage : ...` occupe une case et vaut un temps. Rare,
  sinon le temps ne vaut plus rien ;
- **les cris** : ce qui se fait, et à partir de quelle intensité ;
- **le récitatif** : le projet se l'autorise, ou pas. Beaucoup d'albums s'en
  passent très bien, et il sert souvent à sauver une scène mal découpée ;
- **les documents lus à l'image** : leur langue est écrite, pas parlée ;
- **typographie** : apostrophes typographiques, guillemets français, et **jamais
  de tiret cadratin ni demi-cadratin**, nulle part ;
- **les noms en apostrophe** : par défaut on ne s'appelle pas par son prénom en
  conversation. Le lettrage dit déjà qui parle.

Puis les **quatre réflexes de découpage** à surveiller, hérités de la bible
graphique : la scène qui finit sur une case muette, l'émotion en gros plan de
visage, la double page coupée en deux moitiés symétriques, la silhouette de dos
en clôture. Chacun est bon une fois et devient un tic à la troisième
récurrence : chaque emploi devra être un choix.

## Étape 4 : écrire

Compose le document depuis
`${CLAUDE_SKILL_DIR}/../../templates/bible-voix-squelette.md` et écris-le dans
le projet en nature `voix`. Ajoute au journal ce qui a été tranché : les axes de
divergence retenus, le taux d'attribution obtenu, les voix restées proches.

Le taux mesuré va AU JOURNAL. C'est la preuve que la bible a été vérifiée, et
elle se reperd si personne ne l'écrit.

## Étape 5 : livrer

Récapitule : les voix posées et ce qui les sépare, le taux d'attribution
obtenu, les conventions arrêtées, ce qui reste fragile. Annonce la suite
(`/bd-dialogues`).

Termine par `🎉 BIBLE DE VOIX POSÉE`.

## Règles

- **Une voix décrite n'est pas une voix écrite.** Un tic posé en fiche et jamais
  employé ne sert à rien ; un tic employé à chaque réplique devient un gimmick
  au troisième emploi.
- **L'épreuve d'aveugle ne se déclare pas, elle se mesure.** Un taux annoncé
  sans avoir été compté n'a aucune valeur, et l'annoncer quand même est le
  défaut qu'on cherche précisément à éviter.
- **Sous 12 répliques, le taux est bruité.** Le rapport le signale. Le lire
  comme une indication, pas comme un verdict.
- **Ne pose pas de voix pour les figurants.** Ils ont besoin de ne pas parler
  comme les protagonistes, c'est tout.
- Un personnage qui se met à parler comme un autre PARCE QU'il se met à lui
  ressembler est une réussite. Consigne-le au journal, sinon un juge le prendra
  pour une faute.
