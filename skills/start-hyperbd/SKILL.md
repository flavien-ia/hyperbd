---
name: start-hyperbd
description: Prépare tout, une seule fois, pour travailler avec HyperBD : installe Node.js s'il manque (winget sur Windows, Homebrew sur macOS), relie Claude Code à l'atelier avec un jeton d'accès, puis fait le tour des trois clés d'API (OpenAI, Cloudflare R2, Topaz) en expliquant pour chacune à quoi elle sert, ce qu'elle coûte et comment l'obtenir. Utiliser quand la personne dit « /start-hyperbd », « installe HyperBD », « prépare tout », « on commence », ou juste après avoir installé le plugin.
compatibility: "Agent Skills standard (Claude Code ou Codex). Installe Node.js si nécessaire, rien d'autre."
---

# Démarrer : la machine, l'atelier, les clés

## Communication

- Détecte la langue de la personne et réponds TOUJOURS dans cette langue (par défaut : français). Cela vaut pour tout : questions, avancement, confirmations, résumés, erreurs.
- Parle un langage simple et concret. N'expose jamais de nom de script (`*.mjs`), de chemin interne ni de jargon : décris ce que tu fais en clair.
- Montre l'avancement sous forme d'une courte liste à cocher : la machine, l'atelier, les clés, le premier album.
- Ne demande JAMAIS la valeur d'une clé d'API dans la conversation, et n'essaie jamais d'en saisir une. Les clés se renseignent dans **Mon compte**, sur l'atelier, et nulle part ailleurs. Le jeton d'accès, lui, se colle ici : c'est son rôle.

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

Attends le jeton (il commence par `sek_`), puis :

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/studio.mjs" connect --url "https://app.studio-entremondes.fr" --token "<jeton>"
```

Le jeton est vérifié avant d'être enregistré, dans le dossier personnel de la personne et nulle part ailleurs. En cas de refus, le plus souvent le jeton a été tronqué à la copie : propose de recommencer.

## Étape 3 : les clés, une par une

La réponse de l'atelier dit quelles clés sont en place. L'atelier ne dépense jamais rien à la place de la personne : chaque clé est la sienne, sur son propre compte, et c'est elle qui paie ce qu'elle génère. Pour **chaque clé absente**, explique en clair les trois choses ci-dessous, puis invite à la renseigner dans **Mon compte** (https://app.studio-entremondes.fr/compte), où le mode d'emploi détaillé est écrit sous chaque clé.

### OpenAI (indispensable pour dessiner)

- **À quoi ça sert** : générer les images des planches, des personnages, des décors (GPT Image).
- **Ce que ça coûte** : facturé à l'image, sur son compte OpenAI. Quelques centimes par image en qualité de travail, quelques dizaines de centimes en haute qualité. Une planche aboutie demande une trentaine de générations ; un strip revient à quelques euros, un album de soixante planches à une à trois centaines d'euros. Le harnais annonce un devis avant toute dépense.
- **Comment l'obtenir** : un compte sur platform.openai.com avec un moyen de paiement (sans crédit, l'API refuse) ; page **API keys**, « Create new secret key », un nom parlant ; copier la clé immédiatement (elle commence par `sk-` et ne sera plus affichée) ; la coller dans Mon compte.

### Cloudflare R2 (indispensable pour ranger les images)

- **À quoi ça sert** : stocker ses images, dans SON espace, pas dans celui de quelqu'un d'autre. Sans lui, rien ne peut être généré non plus.
- **Ce que ça coûte** : gratuit jusqu'à 10 Go stockés ; au-delà, environ 0,015 $ par Go et par mois. Aucun frais de téléchargement. Une carte bancaire est demandée même pour l'offre gratuite.
- **Comment l'obtenir** : un compte Cloudflare, puis R2 dans le menu ; « Create bucket » avec un nom et l'emplacement « European Union » ; noter le nom du bucket et l'identifiant de compte (Account ID) ; « Manage R2 API Tokens », « Create API token » avec la permission « Object Read & Write » ; copier l'Access Key ID et la Secret Access Key (la seconde ne sera plus affichée) ; l'adresse du point d'accès est indiquée sous le jeton, de la forme `https://<compte>.eu.r2.cloudflarestorage.com`.

### Topaz Labs (facultatif : l'impression)

- **À quoi ça sert** : agrandir une planche validée en haute définition, pour l'impression. Tout le reste fonctionne sans.
- **Ce que ça coûte** : à l'usage, sans abonnement, environ un crédit par image agrandie. La clé ne fonctionne pas à zéro crédit.
- **Comment l'obtenir** : un compte sur topazlabs.com, l'espace développeur (Topaz Labs API), un premier lot de crédits, puis une clé dans « API Keys ».

Dis clairement ce qui est bloquant (OpenAI et R2 : sans eux, rien ne se dessine) et ce qui peut attendre (Topaz : le jour où l'on imprime). Puis demande à la personne de te dire quand elle a renseigné ses clés, et revérifie :

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
- Jamais de mot de passe, jamais de valeur de clé dans la conversation.
- Un jeton perdu ne se retrouve pas : on en crée un nouveau et on révoque l'ancien, dans Mon compte, où l'accès se coupe aussi d'un clic.
- Cette skill n'a pas de mode `--auto` : elle est faite de gestes que seule la personne peut faire.
