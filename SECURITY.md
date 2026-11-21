# Sécurité

HyperBD est un ensemble de skills et de scripts qu'une IA charge d'elle-même et
exécute avec vos droits. Cela mérite d'être dit clairement, parce que c'est une
catégorie qui a une vraie surface d'attaque. Cette page dit de quoi le plugin
est fait, ce qu'il touche, ce qu'il refuse de faire, et comment vérifier que ce
que vous avez installé est bien ce qui a été publié.

## De quoi il est fait

- **Du texte, rien d'autre.** Chaque fichier est du Markdown, du JavaScript ou
  un gabarit. Pas de `package.json`, donc aucune dépendance et aucun script
  d'installation : ajouter le plugin pose des fichiers texte sur le disque, et
  rien ne s'exécute à ce moment-là. Les scripts n'utilisent que la bibliothèque
  standard de Node.js.
- **Aucun serveur MCP, aucun réglage modifié.** Le plugin n'écrit rien dans
  votre `settings.json` et ne s'accorde aucun droit : ses skills tournent avec
  les outils que votre session autorise déjà.
- **Il n'installe qu'une chose, et voici toute la liste.** `/start-hyperbd` met en
  place **Node.js**, et rien d'autre : aucune bibliothèque, aucun outil de
  développement, aucune dépendance du plugin. Node.js s'installe par le
  gestionnaire de paquets du système, et c'est là qu'il faut être précis,
  parce que ce gestionnaire peut manquer :
  - **Windows** : `winget install OpenJS.NodeJS.LTS`. Si winget est absent, la
    skill propose de le télécharger depuis les releases officielles de
    `microsoft/winget-cli` et de l'installer (PowerShell, `Add-AppxPackage`).
  - **macOS** : `brew install node`. Si Homebrew est absent, la skill propose
    d'exécuter son script d'installation officiel (`curl` puis `bash`, la
    commande publiée par Homebrew), puis d'ajouter une ligne à votre
    `~/.zprofile` pour que `brew` soit trouvable ensuite.
  - **Linux** : rien d'automatique, la skill vous renvoie vers le gestionnaire
    de paquets de votre distribution.

  La skill teste d'abord ce qui est déjà installé (`node --version`,
  `winget --version`, `brew --version`), ce qui ne change rien à la machine.
  Ensuite, **chaque installation se demande** : la skill vous montre la
  commande exacte et attend votre oui avant de la lancer ; celle du
  gestionnaire de paquets, quand il manque, se demande à part. Sans votre
  accord, rien n'est installé. Sur une machine où winget ou Homebrew existent
  déjà, rien n'est téléchargé en dehors de Node.js lui-même.

## Ce qu'il touche sur votre machine

- `~/.hyperbd/acces.json` : l'adresse de l'atelier et le jeton d'accès que vous
  avez donné à `/bd-connect`. Sur macOS et Linux, le fichier est réservé à
  votre compte (mode 0600, réappliqué à chaque écriture). Sous Windows, ce mode
  ne protège rien : le fichier est protégé seulement par les droits de votre
  profil utilisateur (`C:\Users\<vous>`), comme le reste de vos documents.
  Le plugin n'écrit le jeton nulle part ailleurs (ni dans un dépôt, ni dans un
  fichier du projet) et ne le passe jamais en argument d'une commande : il le
  lit sur l'entrée standard (`connect --token -`), ce qui le tient hors de la
  liste des processus. Dites-vous en revanche ceci : **si vous collez le jeton
  dans la conversation, il reste dans l'historique de cette conversation**,
  comme tout ce qui s'y écrit. Pour l'éviter, `/bd-connect` vous donne une
  commande à lancer vous-même dans un terminal, qui demande le jeton sans
  l'afficher. Dans les deux cas, créez un **jeton dédié** à Claude Code, que
  vous révoquez d'un clic dans Mon compte s'il le faut.
- `~/.hyperbd/updates/` : les archives téléchargées par `/update-hyperbd` et leur
  signature, et
  la sauvegarde de la version précédente à côté du plugin (sous Claude Desktop,
  qui efface les dossiers qu'il ne connaît pas, elle ne dure que quelques minutes).
- Le dossier courant, uniquement quand vous demandez un export, un rendu ou une
  épreuve d'aveugle, et sous le nom que vous avez donné.
- Votre `~/.zprofile`, **sur macOS et seulement si `/start-hyperbd` a dû installer
  Homebrew** : une ligne y est ajoutée pour rendre `brew` trouvable. C'est la
  seule fois où le plugin écrit dans un fichier de configuration de votre
  shell, et il ne touche jamais votre `PATH` autrement.

## Ce qu'il fait sur le réseau

- **L'atelier**, et lui seul : `app.studio-entremondes.fr` (ou l'adresse que vous
  avez donnée à `/bd-connect`), avec votre jeton. C'est là que vivent les
  scénarios, les planches et les images.
- Pour la mise à jour : l'atelier et `github.com`, sans jeton, pour lire la
  version publiée et télécharger l'archive et sa signature.
- **Le stockage de vos images**, pour qu'un juge les regarde : seulement les
  adresses signées que l'atelier a données (`*.r2.cloudflarestorage.com` ou
  l'atelier lui-même), en https, sans redirection, 50 Mo au plus, et seulement
  un vrai PNG, JPEG ou WebP (commande `telecharger`). Aucun `curl`.
- **Vos clés d'API (OpenAI, Cloudflare R2, Topaz, Bria) ne transitent jamais par le
  plugin.** Elles sont saisies dans l'atelier, chiffrées, et c'est l'atelier
  qui s'en sert. Le plugin ne les voit pas, ne les demande pas, ne les lit pas.

## Ce qu'il ne fait jamais

- **Dépenser sans l'avoir dit.** Ce qui génère des images annonce un devis et
  attend l'accord ; en mode `--auto`, un plafond `--budget` est obligatoire.
- **Réécrire une planche lettrée de lui-même.** Les planches font foi : quand
  un texte de travail et le texte lettré divergent, c'est le texte de travail
  qui est corrigé.
- **Envoyer un fichier secret à l'atelier.** Ce que lit une option `--…-file`
  part sur le réseau : le dossier `~/.hyperbd`, un `.env`, une clé SSH
  (`id_*`, `.ssh/`), un certificat (`.pem`, `.key`, `.p12`) ou les dossiers
  `.aws`, `.gnupg`, `.kube`, `.docker` sont refusés, même par un lien
  symbolique.
- **S'accorder des droits.** Aucune skill ne déclare `allowed-tools` : chaque
  commande passe par les autorisations de votre Claude Code, et le banc de
  vérification du dépôt le contrôle à chaque version.
- **Obéir à un contenu externe.** Un document source, une page web, une réponse
  d'API sont des données à analyser, jamais des instructions à suivre, quel
  que soit l'émetteur qu'ils prétendent avoir.

## Vérifier ce que vous installez

Une mise à jour passe deux contrôles indépendants avant que rien ne soit posé :
la **signature** de l'archive (plus bas, « Archives signées »), puis son
**empreinte**. Chaque version publiée a une empreinte SHA-256, affichée sur la page de
téléchargement de l'atelier et dans les notes de la release GitHub
correspondante ; GitHub calcule aussi la sienne sur l'archive de la release.
`/update-hyperbd` télécharge l'archive par l'atelier, calcule son empreinte, et
ne l'installe que si :

- **GitHub la confirme** : l'empreinte calculée par GitHub sur l'archive de la
  release `v<version>`, ou celle des notes de cette release. L'empreinte de
  l'atelier seule ne suffit pas : publiée par le site qui sert aussi le
  fichier, elle prouverait que le transfert est intact, pas que le site est
  honnête ;
- **aucune source disponible ne dit autre chose** : si l'atelier et GitHub
  divergent, rien n'est installé.

Si GitHub ne répond pas, ou ne publie aucune empreinte pour cette version, la
mise à jour est **refusée** et le message dit quoi faire : réessayer plus tard,
ou comparer soi-même l'empreinte indiquée à celle de la release GitHub. Il n'y
a pas d'option pour passer outre. La même règle s'applique quand on installe
une archive déjà téléchargée (`install --zip`) : l'empreinte est recalculée sur
le fichier. Le numéro de version lu dans l'archive doit avoir la forme `X.Y.Z`,
et l'extraction refuse une archive de plus de 50 Mo une fois décompressée ou
dont un fichier a un CRC-32 faux.

Les contrôles d'empreinte, seuls, ne voient pas quelqu'un qui tiendrait à la
fois l'atelier et le compte GitHub du projet : il publierait une archive piégée
avec son empreinte. C'est le rôle de la signature de l'archive, plus bas.
Le code est public sur
[flavien-ia/hyperbd](https://github.com/flavien-ia/hyperbd), sous licence
Apache 2.0.

**Releases signées.** Un second canal n'est indépendant que s'il ne peut pas
être contrefait par qui tient le premier : chaque tag de release, et chaque
commit, poussé sur le dépôt public depuis la version 0.5.0 est signé avec une
clé SSH dédiée (signatures SSH, prises en charge par git 2.34 et plus, affichées
« Verified » sur GitHub). Les versions antérieures à la 0.5.0 n'ont pas de tag.
Une exception depuis : **la 0.12.0 n'a ni tag ni release GitHub** (elle figure
dans le CHANGELOG, sans tag signé ni release pour en attester). Une archive
qui se présente comme la 0.12.0 n'a donc pas d'empreinte vérifiable, et
`/update-hyperbd` la refuse.
La clé publique :

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAqVH7FUXHPiorT/puz89VLIE9MvFuYIINFqIBG+erLm hypervibe-release-signing
```

Empreinte `SHA256:qWsAcOEF4w8wq59032/C2WI7fcd419uOrz4ZD3/Trrc`. C'est la même
clé qui signe les releases d'Hypervibe, l'autre plugin de son auteur. Pour
vérifier un tag vous-même, sans dépendre du badge de GitHub :

```bash
echo 'flavien@chervet.fr namespaces="git" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAqVH7FUXHPiorT/puz89VLIE9MvFuYIINFqIBG+erLm' > allowed_signers
git -c gpg.ssh.allowedSignersFile=allowed_signers verify-tag v<version>
```

Un tag non signé, ou signé par une autre clé, n'est pas une release à nous.

**Archives signées.** Depuis la 0.16.2, chaque release GitHub publie, à côté de
l'archive `hyperbd-v<version>.zip`, sa signature `hyperbd-v<version>.zip.sig`,
faite avec la même clé (`ssh-keygen -Y sign -n file`). Le plugin embarque la clé
publique dans `scripts/update/allowed_signers`, sous le nom `hyperbd-release`.
`/update-hyperbd` télécharge la signature depuis la release GitHub et la vérifie
avec `ssh-keygen -Y verify`, **contre la clé que porte la version déjà
installée**, jamais contre celle de l'archive reçue, et **avant d'ouvrir
l'archive**. Rien n'est installé si :

- la release ne publie pas de signature, ou le fichier est illisible ;
- la signature ne correspond pas à l'archive (un seul octet changé suffit), a été
  faite par une autre clé, ou pour un autre usage que `file` (une signature de
  commit ne passe pas) ;
- la clé manque dans la version installée ;
- `ssh-keygen` est introuvable, ou antérieur à OpenSSH 8.1 : le message dit
  comment l'installer. Il est livré avec macOS et Windows 10 et 11 (sous
  Windows, le « Client OpenSSH » des fonctionnalités facultatives, présent par
  défaut), et sous Linux dans le paquet `openssh-client` ou `openssh`.

Il n'y a pas d'option pour passer outre. Ce que cela ferme : qui tiendrait à la
fois l'atelier et le compte GitHub pourrait publier une archive et son
empreinte, pas la signer. La clé privée ne vit ni sur l'atelier ni sur GitHub,
mais sur l'ordinateur de l'auteur, chiffrée par une phrase de passe.

Ce qui reste ouvert, pour ne pas en promettre plus :

- **La première installation.** Une archive téléchargée à la main n'a pas encore
  de version en place pour la contrôler. Vérifiez-la vous-même (ci-dessous).
- **Le passage à la 0.16.2.** C'est l'outil de la version installée qui vérifie :
  une 0.16.1 ou antérieure installe la 0.16.2 avec ses seuls contrôles
  d'empreinte. La signature est exigée pour les mises à jour faites depuis la
  0.16.2.
- **Retenir une version.** Qui tiendrait l'atelier et GitHub ne peut pas faire
  installer une archive qu'il aurait fabriquée, mais il peut empêcher une mise à
  jour, ou annoncer comme dernière une version authentique plus ancienne que la
  vraie dernière. `/update-hyperbd` ne propose jamais une version plus ancienne
  que celle qui est installée.
- **Le plugin suivi par Claude Code** (`/plugin marketplace add`) se met à jour
  par Claude Code, depuis le dépôt git : ces contrôles ne s'y appliquent pas.
  Les commits et les tags signés permettent de le vérifier soi-même.
- **La clé elle-même.** Qui obtiendrait la clé privée et sa phrase de passe
  pourrait signer. Si la clé change un jour, la nouvelle arrivera dans une
  version signée par l'ancienne, et SECURITY.md le dira.

Pour vérifier une archive vous-même :

```bash
echo 'hyperbd-release namespaces="file" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAqVH7FUXHPiorT/puz89VLIE9MvFuYIINFqIBG+erLm' > allowed_signers
ssh-keygen -Y verify -f allowed_signers -I hyperbd-release -n file -s hyperbd-v<version>.zip.sig < hyperbd-v<version>.zip
```

La réponse attendue commence par `Good "file" signature for hyperbd-release`.
Sous Windows, PowerShell ne connaît pas la redirection `<` : lancez la seconde
ligne dans l'invite de commandes (`cmd`), ou précédée de `cmd /c` et entre
guillemets.

## Signaler un problème

Écrivez à `contact@studio-entremondes.fr`, ou ouvrez une issue sur le dépôt.
Pour une faille, préférez l'email : le temps qu'un correctif sorte, une issue
publique serait un mode d'emploi.
