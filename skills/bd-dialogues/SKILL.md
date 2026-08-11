---
name: bd-dialogues
description: Découpe une scène en planches et en cases, puis y écrit les dialogues, case par case. Répartit la scène sur son budget de planches avec valeur de plan et angle, crée les planches et les rattache à leur scène, écrit les répliques DANS les cases (le lettrage s'en dérive ensuite), puis fait juger la voix (épreuve d'aveugle mesurée) et la grammaire visuelle avant qu'une seule image soit payée. Utiliser après la bible de voix, quand la personne dit « écris les dialogues », « découpe la scène », « /bd-dialogues ».
argument-hint: "[projet] [--scene <nom ou id>] [--auto]"
compatibility: "Agent Skills standard (Claude Code ou Codex). Nécessite Node.js."
---

# Les dialogues : découper, puis faire parler

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français).
- Parle un langage simple et concret. N'expose jamais de nom de script ni de jargon technique.
- Montre l'avancement sous forme d'une courte liste à cocher.

Tu transformes une scène en planches écrites. Rien n'est dessiné ici, et rien
ne coûte : c'est le dernier moment où corriger est gratuit.

**Une scène à la fois.** Une scène est l'unité de travail, l'unité de journal
et l'unité de reprise : si la session s'interrompt, on reprend à la scène
suivante sans rien reconstituer.

## Étape 0 : reprendre le fil

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" nodes <projet>
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind voix
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" docs <projet> --kind bible-graphique
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" planches <projet>
```

Trois arrêts nets :

- **Pas de structure validée** : renvoie vers `/bd-scenario`.
- **Pas de bible de voix** : renvoie vers `/bd-voix`. Écrire des dialogues sans
  elle, c'est écrire tous les personnages avec la même bouche, et le découvrir
  trois scènes plus tard.
- **Pas de bible graphique** : renvoie vers `/bd-da`. Le gabarit et la place du
  lettrage contraignent le découpage : les ignorer, c'est cadrer des plans qui
  ne pourront pas recevoir leurs bulles.

Puis identifie la scène à traiter (l'argument `--scene`, ou la première scène
validée sans planches) et relis son synopsis, son budget de planches, et les
tensions qu'elle doit déplacer.

## Étape 1 : le découpage

Répartis la scène sur son budget de planches. Propose une grille **case par
case**, et fais-la valider AVANT d'écrire la moindre réplique.

Pour chaque case :

1. **La valeur de plan** (plan large, plan moyen, gros plan, très gros plan) et
   **l'angle** (de face, plongée, contre-plongée, de dos). Dis-les explicitement :
   sans eux, le générateur choisit, et il choisit toujours le plan moyen de face.
2. **Ce qui s'y passe** : une action, un geste, un regard. Concret et visible.
3. **Ce qui s'y dit**, s'il s'y dit quelque chose.

Trois choses à tenir en composant :

- **Le rythme.** Une planche a besoin de respirations (des cases à zéro ou deux
  mots) et d'un accent (un endroit où elle s'ouvre). Une planche sans accent est
  plate même si chaque case est juste.
- **La dernière case.** C'est elle qui donne envie de tourner la page. Elle doit
  finir sur quelque chose, pas s'arrêter parce que la place est finie.
- **La place du lettrage.** La bible graphique dit où les bulles se posent :
  laisse-leur l'air correspondant dans les cadrages.

## Étape 2 : écrire dans les cases

Crée les planches et rattache-les à leur scène :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" create-planche <projet> --title "<titre>"
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" write <plancheId> --file <planche.json>
```

Le fichier porte le script modulaire : un en-tête, une case par entrée, une
ligne d'ambiance. Le script d'une case contient sa description ET ses répliques,
au format `Nom : texte`, une par ligne.

**Les répliques vont DANS les cases, jamais ailleurs.** Le lettrage se dérive
du script : une réplique tapée directement dans le lettrage crée une seconde
version du même dialogue, et les deux divergent au premier ajustement. L'atelier
refuse d'ailleurs d'écraser un lettrage existant par un script muet : c'est une
protection, pas un obstacle.

Rattache la planche à sa scène (`sceneId`) : c'est ce lien qui permettra de
juger la scène entière, de la reprendre, et de la retrouver.

## Étape 3 : la relecture, avant de payer quoi que ce soit

**1. Le contrôle mécanique.**

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/bd-lint.mjs" --projet <projet>
```

Il ne dit pas si c'est bien écrit : il dit qu'une bulle déborde de sa case,
qu'une planche ne raconte rien, qu'un cadrage n'a pas été choisi, qu'un tiret
interdit s'est glissé dans une réplique. Corrige, relance jusqu'à ce qu'il se
taise sur cette scène.

**2. L'épreuve d'aveugle sur les répliques de la scène.**

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" repliques <projet> --scene <sceneId>
node "${CLAUDE_SKILL_DIR}/../../scripts/attribution.mjs" prepare \
  --in <repliques.json> --anon <anonyme.md> --cle <cle.json> \
  --bible <bible-de-voix.md>
```

**`--bible` n'est pas optionnel en pratique.** Il recoupe les répliques de la
scène avec les échantillons canoniques. Écrire une scène en reprenant ces
échantillons fait monter l'attribution à 100 % sans rien prouver : on mesure
alors si un lecteur reconnaît des phrases déjà lues. Si le rapport annonce des
répliques recyclées, la mesure est contaminée : réécris ces répliques avant de
la lire.

La sortie de la première commande se passe telle quelle à la seconde. Lance un
attributeur (subagent, type general-purpose) qui reçoit **l'énoncé anonyme et la
bible de voix**, et rend un JSON `{"1": "Nom", ...}` et rien d'autre. Ici, il
PEUT lire les échantillons de la bible : le texte à attribuer est différent, la
mesure reste honnête. Il ne voit jamais la clé.

Dis-lui explicitement de se fonder sur **la voix seule** et non sur le sujet
abordé. Sans cette consigne, il reconnaît le thème : dans une scène où chacun
tient son domaine, le taux monte sans qu'aucune voix soit distincte. Un taux
élevé sur une scène aux rôles très séparés se lit donc avec prudence, et c'est
au juge `voix` de le dire.

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/attribution.mjs" score \
  --cle <cle.json> --reponses <reponses.json>
```

**3. Les juges.** En parallèle (un seul message, plusieurs appels) :

- **`voix`** : donne-lui le rapport d'attribution mesuré, les répliques AVEC les
  noms, et la bible de voix. Il reporte la note mesurée telle quelle et juge le
  registre, l'oralité et la fonction.
- **`grammaire`** : donne-lui le découpage (les blocs, pas d'images), la bible
  graphique et les planches voisines. Il juge la variété, le rythme, les
  raccords et la signature.
- **`fidelite`**, seulement si le projet a des sources.

Le protocole (dossier du juge, lancement en aveugle, format de verdict, boucle)
est celui de `_juge`.

**Trois itérations au maximum, un juge frais à chaque passe.** Au-delà, livre la
meilleure version avec le verdict honnête et ce qui bloque.

## Étape 4 : les répliques sourcées

Si le projet a des sources, repère les répliques qui portent une affirmation
vérifiable et marque-les `[i]`. Rapproche chacune d'une source existante :
elles deviendront les QR de la planche au temps du lettrage.

Ne crée pas une source par réplique : une source sert plusieurs passages.

## Étape 5 : le journal

Une entrée par scène. Ce qui a été tranché dans le découpage, les écarts
assumés (et pourquoi), le taux d'attribution obtenu, ce que les juges ont fait
bouger.

Un écart consigné est un choix ; le même écart non consigné sera relu comme une
négligence, par un juge ou par toi-même dans trois semaines.

## Étape 6 : livrer

Récapitule : la scène découpée sur N planches, ce qui s'y joue, le taux
d'attribution, les verdicts. Dis combien de scènes restent. Coût images : zéro,
tout est texte.

Termine par `🎉 DIALOGUES POSÉS (scène X/Y)`.

## Règles

- **Aucune image ne se génère ici.** Si la personne veut voir, renvoie vers
  `/bd-planches`. Découper est gratuit, produire ne l'est pas.
- **Une réplique qui ne déplace, ne révèle ni ne retient est du remplissage**,
  même bien écrite.
- **Ne fais jamais commenter à un personnage ce que l'image montre déjà** : en
  bande dessinée, c'est la faute la plus chère, elle paie deux fois la même chose.
- **Au-delà de 25 mots, une bulle mange sa case.** Ce n'est pas un interdit,
  c'est un prix : une tirade doit valoir sa place.
- **Un budget de planches se discute, il ne se dépasse pas en silence.** Si la
  scène n'y tient pas, dis-le et propose : couper, ou rouvrir le budget.
- Une scène purement contemplative qui fonctionne est une réussite. Une scène
  contemplative qui traîne est un problème, même si elle respecte tout.
