---
name: start-hyperbd
description: Prépare tout, une seule fois, pour travailler avec HyperBD : installe Node.js s'il manque (winget sur Windows, Homebrew sur macOS), relie Claude Code à l'atelier avec un jeton d'accès, puis fait le tour des clés d'API (OpenAI et Cloudflare R2, indispensables ; Topaz et Bria, pour l'impression) en expliquant pour chacune à quoi elle sert, ce qu'elle coûte et comment l'obtenir. Utiliser quand la personne dit « /start-hyperbd », « installe HyperBD », « prépare tout », « on commence », ou juste après avoir installé le plugin.
compatibility: "Agent Skills standard (Claude Code ou Codex). Installe Node.js si nécessaire, rien d'autre."
---

# Démarrer : la machine, l'atelier, les clés

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français). Cela vaut pour tout : questions, avancement, confirmations, résumés, erreurs.
- Parle un langage simple et concret. N'expose jamais de nom de script (`*.mjs`), de chemin interne ni de jargon : décris ce que tu fais en clair.
- Montre l'avancement sous forme d'une courte liste à cocher : la machine, l'atelier, les clés, le premier album.
- **Un seul secret se colle dans la conversation : le jeton d'accès de l'étape 2.** Les clés d'API (OpenAI, Cloudflare, Topaz, Bria) se collent dans **Mon compte**, sur l'atelier, et nulle part ailleurs. Ne demande jamais la valeur d'une clé, n'écris jamais « colle-la ici » à propos d'une clé, et n'essaie jamais d'en saisir une.

La personne vient d'installer le plugin. À la fin de cette skill, sa machine sait parler à l'atelier, son compte a ce qu'il faut pour dessiner, et elle sait quoi taper pour commencer un album.

## Étape 1 : Node.js

Les commandes du harnais parlent à l'atelier par des scripts Node. Vérifie :

```bash
node --version 2>/dev/null
```

Une version 18 ou plus : c'est bon, passe à l'étape 2. Sinon, **installe-le directement, sans demander, avec les commandes ci-dessous** (pas de script à créer pour ça).

**Windows.** Il faut winget :

```bash
winget --version 2>/dev/null
```

S'il manque, installe-le par PowerShell :

```bash
powershell.exe -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://github.com/microsoft/winget-cli/releases/latest/download/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle' -OutFile \"$env:TEMP\\winget.msixbundle\"; Add-AppxPackage -Path \"$env:TEMP\\winget.msixbundle\""
```

Revérifie. S'il manque toujours, dis-le : « L'installation automatique de winget a échoué. Installe-le à la main depuis https://aka.ms/getwinget (App Installer, dans le Microsoft Store), puis relance `/start-hyperbd`. » Et arrête-toi là.

Puis Node.js :

```bash
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements 2>&1
export PATH="/c/Program Files/nodejs:$PATH"
node --version
```

**macOS.** Il faut Homebrew :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

⚠️ Juste après l'installation, `brew` n'est pas encore dans le PATH (Apple Silicon : `/opt/homebrew`, Intel : `/usr/local`). Dans le même bloc :

```bash
BREW=$([ -x /opt/homebrew/bin/brew ] && echo /opt/homebrew/bin/brew || echo /usr/local/bin/brew)
grep -q "brew shellenv" ~/.zprofile 2>/dev/null || echo 'eval "$('"$BREW"' shellenv)"' >> ~/.zprofile
eval "$("$BREW" shellenv)" && brew install node && node --version
```

**Linux.** Installe Node.js LTS par le gestionnaire de paquets de la distribution (ou depuis https://nodejs.org), puis revérifie.

Si `node --version` ne répond toujours pas, explique ce qui a été tenté et demande à la personne de **fermer et rouvrir Claude Code** (le PATH d'une installation neuve n'est pas toujours visible par la session en cours), puis de relancer `/start-hyperbd`.

## Étape 2 : l'atelier

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" me
```

- **Ça répond avec un compte** : l'accès existe. Dis à qui il appartient et passe à l'étape 3.
- **Ça répond une erreur** : il faut un jeton. Dis-le dans ces termes :

> Pour que je puisse travailler dans ton atelier, il me faut un jeton d'accès.
>
> 1. Ouvre **https://app.studio-entremondes.fr/compte**
> 2. Dans **Jetons d'API**, crée un jeton (nomme-le par exemple « Claude Code »)
> 3. Copie-le et colle-le ici : il ne sera plus affiché ensuite

C'est le seul moment où quelque chose se colle ici : dis-le, pour que la
personne ne croie pas que les clés suivront le même chemin.

Attends le jeton (il commence par `sek_`), puis :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" connect --url "https://app.studio-entremondes.fr" --token "<jeton>"
```

Le jeton est vérifié avant d'être enregistré, dans le dossier personnel de la personne et nulle part ailleurs. En cas de refus, le plus souvent le jeton a été tronqué à la copie : propose de recommencer.

## Étape 3 : les clés, une par une, dans Mon compte

La réponse de l'atelier dit quelles clés sont en place. L'atelier ne dépense jamais rien à la place de la personne : chaque clé est la sienne, sur son propre compte, et c'est elle qui paie ce qu'elle génère.

**Les clés ne passent jamais par la conversation.** Mon compte les vérifie auprès de leur service, les chiffre, et ne les réaffiche jamais ; ici, elles resteraient en clair dans l'historique. Pour **chaque clé absente**, explique en clair les trois choses ci-dessous, puis termine toujours par la même consigne :

> Colle-la dans **Mon compte** (https://app.studio-entremondes.fr/compte),
> carte <nom du service>, puis « Vérifier et enregistrer ». Pas ici : l'atelier
> la vérifie et la chiffre. Dis-moi quand c'est fait.

Le mode d'emploi détaillé est aussi écrit sous chaque carte, dans Mon compte.

**Si la personne colle quand même une clé dans la conversation** : ne la répète pas, ne l'utilise pas, ne l'écris nulle part. Dis-lui que sa place est Mon compte, et qu'elle peut la régénérer chez le fournisseur si elle préfère qu'elle ne reste pas dans l'historique de la conversation.

### OpenAI (indispensable pour dessiner)

- **À quoi ça sert** : générer les images des planches, des personnages, des décors (GPT Image).
- **Ce que ça coûte** : facturé à l'image, sur son compte OpenAI. Quelques centimes par image en qualité de travail, quelques dizaines de centimes en haute qualité. Une planche aboutie demande une trentaine de générations ; un strip revient à quelques euros, un album de soixante planches à une à trois centaines d'euros. Le harnais annonce un devis avant toute dépense.
- **Comment l'obtenir** : un compte sur platform.openai.com avec un moyen de paiement (sans crédit, l'API refuse) ; page **API keys**, « Create new secret key », un nom parlant ; copier la clé tout de suite (elle commence par `sk-` et ne sera plus affichée).

### Cloudflare R2 (indispensable pour ranger les images)

- **À quoi ça sert** : stocker ses images, dans SON espace, pas dans celui de quelqu'un d'autre. Sans lui, rien ne peut être généré non plus.
- **Ce que ça coûte** : gratuit jusqu'à 10 Go stockés ; au-delà, environ 0,015 $ par Go et par mois. Aucun frais de téléchargement. Une carte bancaire est demandée même pour l'offre gratuite.
- **Comment l'obtenir** : un compte Cloudflare, puis R2 dans le menu ; « Manage R2 API Tokens », « Create API token », avec la permission « Admin Read & Write ». Cloudflare affiche alors trois lignes : l'Access Key ID, la Secret Access Key (elle ne sera plus affichée) et l'adresse européenne du point d'accès (celle qui contient « .eu »). Les trois se collent dans Mon compte, carte Cloudflare R2 : l'atelier crée lui-même son bucket, en Europe, et le règle pour que les images partent du navigateur. Rien d'autre à chercher, ni identifiant de compte, ni nom de bucket.
- **Si la personne préfère un jeton limité à un seul bucket** (« Object Read & Write ») : elle crée d'abord le bucket (emplacement « European Union »), et donne aussi son nom dans Mon compte. L'atelier lui dira alors s'il faut ajouter une règle d'envoi au bucket, et la lui donnera à coller dans Cloudflare.

### Topaz Labs (facultatif : l'impression)

- **À quoi ça sert** : agrandir une planche validée en haute définition, pour l'impression. Tout le reste fonctionne sans.
- **Ce que ça coûte** : à l'usage, sans abonnement, environ un crédit par image agrandie. La clé ne fonctionne pas à zéro crédit.
- **Comment l'obtenir** : un compte sur topazlabs.com, l'espace développeur (Topaz Labs API), un premier lot de crédits, puis une clé dans « API Keys ».

### Bria (facultatif : le fond perdu de l'impression)

- **À quoi ça sert** : prolonger chaque planche au-delà de son bord, pour le fond perdu du master d'impression, en générant la matière qui manque. Sans elle, le fond perdu se fait en miroir, gratuitement.
- **Ce que ça coûte** : à l'usage, environ 0,02 $ par page prolongée, une seule fois par page (le résultat est gardé).
- **Comment l'obtenir** : un compte sur platform.bria.ai, un moyen de paiement (offre à l'usage), puis une clé sur la page des clés d'API.

Dis clairement ce qui est bloquant (OpenAI et R2 : sans eux, rien ne se dessine) et ce qui peut attendre (Topaz et Bria : le jour où l'on imprime). Puis demande à la personne de te dire quand elle a renseigné ses clés, et revérifie :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" me
```

Répète jusqu'à ce qu'OpenAI et R2 soient en place, ou jusqu'à ce que la personne préfère continuer sans (elle pourra écrire le scénario, mais rien produire : dis-le).

## Étape 4 : le tour du propriétaire

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" projects
```

Présente les projets sous forme de courte liste (titre, nombre de planches), ou dis qu'il n'y en a pas encore.

Termine par `🎉 PRÊT`.

## Étape 5 : l'accompagnement

Si la personne n'a encore aucun projet, propose le mode tuto, en une question :

> Veux-tu que je t'accompagne pour ton premier album ? Je te dirai quoi faire
> ici, et quoi aller voir dans l'atelier, étape par étape, jusqu'à ta première
> planche. Le Guide de l'atelier suivra les mêmes étapes.

Oui :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" parcours --activer
```

puis : « C'est parti. Tape `/new-bd`. » Non : « Pour commencer une bande
dessinée, tape `/new-bd` ; `/tuto-hyperbd` si tu changes d'avis. » Le
protocole du tuto est dans `${CLAUDE_SKILL_DIR}/../../templates/tuto.md`.

## Règles

- Le jeton ne s'écrit jamais dans un fichier du projet, ni dans un récapitulatif, ni dans un commit : il vit dans le dossier personnel de la personne, et lui seul.
- Jamais de mot de passe, jamais de valeur de clé dans la conversation : le jeton d'accès est le seul secret qui s'y colle.
- Un jeton perdu ne se retrouve pas : on en crée un nouveau et on révoque l'ancien, dans Mon compte, où l'accès se coupe aussi d'un clic.
- Cette skill n'a pas de mode `--auto` : elle est faite de gestes que seule la personne peut faire.
