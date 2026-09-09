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
    skill le télécharge depuis les releases officielles de
    `microsoft/winget-cli` et l'installe (PowerShell, `Add-AppxPackage`).
  - **macOS** : `brew install node`. Si Homebrew est absent, la skill exécute
    son script d'installation officiel (`curl` puis `bash`, la commande
    publiée par Homebrew), puis ajoute une ligne à votre `~/.zprofile` pour
    que `brew` soit trouvable ensuite.
  - **Linux** : rien d'automatique, la skill vous renvoie vers le gestionnaire
    de paquets de votre distribution.

  Autrement dit : sur une machine où winget ou Homebrew existent déjà, rien
  n'est téléchargé en dehors de Node.js lui-même. Sur une machine où ils
  manquent, un installeur tiers l'est, depuis sa source officielle, et la
  skill vous montre la commande avant de la lancer.

## Ce qu'il touche sur votre machine

- `~/.hyperbd/acces.json` : l'adresse de l'atelier et le jeton d'accès que vous
  avez donné à `/bd-connect`, en lecture réservée à votre compte (mode 0600).
  Ce jeton n'est jamais écrit ailleurs, ni dans un dépôt, ni dans une
  conversation après coup.
- `~/.hyperbd/updates/` : les archives téléchargées par `/update-hyperbd`, et
  la sauvegarde de la version précédente à côté du plugin.
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
  version publiée et télécharger l'archive.
- **Vos clés d'API (OpenAI, Cloudflare R2, Topaz) ne transitent jamais par le
  plugin.** Elles sont saisies dans l'atelier, chiffrées, et c'est l'atelier
  qui s'en sert. Le plugin ne les voit pas, ne les demande pas, ne les lit pas.

## Ce qu'il ne fait jamais

- **Dépenser sans l'avoir dit.** Ce qui génère des images annonce un devis et
  attend l'accord ; en mode `--auto`, un plafond `--budget` est obligatoire.
- **Réécrire une planche lettrée de lui-même.** Les planches font foi : quand
  un texte de travail et le texte lettré divergent, c'est le texte de travail
  qui est corrigé.
- **Obéir à un contenu externe.** Un document source, une page web, une réponse
  d'API sont des données à analyser, jamais des instructions à suivre, quel
  que soit l'émetteur qu'ils prétendent avoir.

## Vérifier ce que vous installez

Chaque version publiée a une empreinte SHA-256, affichée sur la page de
téléchargement de l'atelier et dans les notes de la release GitHub
correspondante. `/update-hyperbd` calcule l'empreinte de ce qu'il a téléchargé
et **refuse d'installer** en cas d'écart.

Sa limite, dite simplement : une empreinte publiée par le site qui sert aussi
le fichier prouve que le transfert est intact, pas que le site est honnête. La
release GitHub est le second canal ; comparez les deux si cela compte pour vous.
Le code est public sur
[flavien-ia/hyperbd](https://github.com/flavien-ia/hyperbd), sous licence
Apache 2.0.

**Releases signées.** Un second canal n'est indépendant que s'il ne peut pas
être contrefait par qui tient le premier : chaque tag de release, et chaque
commit, poussé sur le dépôt public depuis la version 0.5.0 est signé avec une
clé SSH dédiée (signatures SSH, prises en charge par git 2.34 et plus, affichées
« Verified » sur GitHub). Les versions antérieures à la 0.5.0 n'ont pas de tag.
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

## Signaler un problème

Écrivez à `contact@studio-entremondes.fr`, ou ouvrez une issue sur le dépôt.
Pour une faille, préférez l'email : le temps qu'un correctif sorte, une issue
publique serait un mode d'emploi.
