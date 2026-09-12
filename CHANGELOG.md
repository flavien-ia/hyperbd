# Changelog

Chaque version publiée a son entrée ici, écrite pour les gens qui utilisent le
plugin, pas pour ceux qui le développent. Les versions antérieures à la 0.5.0
n'avaient pas de journal : l'historique git en tient lieu.

## v0.8.0 (12 septembre 2026)

### Nouveautés
- **`/bd-album`, le pilote** : toutes les scènes dans l'ordre du récit (dialogues, planches, lettrage), puis la relecture de l'album entier, la couverture et le point final, sous un budget global. Trois signatures humaines par défaut (le plan de production, la première scène produite, l'album relu), et la reprise à tout moment depuis l'état de l'atelier.
- **`/bd-couverture`** : la couverture et la quatrième. Trois concepts d'affiche jugés à taille de vignette, la page produite en portrait, le titre et les mentions posés dans le lettrage, jamais dans l'image.
- **`/bd-traduire`** : l'album dans une autre langue, sans rien redessiner. Mêmes bulles, textes traduits avec la bible de voix sous les yeux, jugés, rendus pour voir ce qui déborde, validés langue par langue.
- **La doctrine des refus** : quand le fournisseur d'images refuse (filtre de sécurité, crédit épuisé, plafond de dépense, clé), chaque skill sait quoi faire, et `/bd-status` le dit en clair. `/bd-dialogues` relit chaque case avant qu'une image soit payée.
- **Retoucher une case** : la commande `retouch` repeint une seule case d'une variante, le reste est gardé tel quel. `/bd-planches` la préfère à une régénération dès que le juge nomme une case.
- **Le master d'impression** : `preflight` contrôle l'album avant tirage (format, résolution au format, ce qui manque), et `export --kind master` sort un PDF en CMYK avec fonds perdus, traits de coupe et boîtes de rognage.

### Améliorations
- La couverture et la quatrième existent dans l'atelier (`create-planche --kind couverture` ou `quatrieme`), uniques et à place fixe ; les exports, le lecteur et les versions les prennent d'eux-mêmes.
- `add-locale` ouvre une langue sur tout l'album en une commande.
- Chaque planche de l'album dit sa dernière génération, avec la raison typée d'un échec.
- Le brief ne vend plus de découpes pour les réseaux sociaux.

### Coulisses
- Deux grilles de juges de plus (couverture, traduction), et le juge du regard sait relire un album entier pour y chercher la dérive.

## v0.7.0 (9 septembre 2026)

### Améliorations
- **`/bd-start` devient `/start-hyperbd`.** Deux commandes se ressemblaient trop : celle qui prépare la machine et celle qui commence un album (`/new-bd`). Le nouveau nom fait paire avec `/update-hyperbd` : ces deux-là s'occupent du plugin, toutes les autres du métier.
- **Connexion par compte Google** dans l'atelier, en plus de l'adresse et du mot de passe. C'est Google qui atteste l'adresse ; se connecter ainsi avec l'adresse d'un compte existant ouvre ce compte, projets compris.

### Coulisses
- La licence porte le nom de l'auteur.

## v0.6.1 (9 septembre 2026)

### Améliorations
- **La page de sécurité dit tout ce que l'installation fait.** Elle annonçait « aucun outil tiers, aucun script téléchargé » alors que `/bd-start`, sur une machine où winget ou Homebrew manquent, installe d'abord ce gestionnaire de paquets depuis sa source officielle, et ajoute sur macOS une ligne à `~/.zprofile`. La liste est maintenant complète, système par système : une page de sécurité incomplète vaut moins que pas de page, parce qu'on agit dessus.
- **L'adresse du plugin** pointe vers sa documentation, qui existe, au lieu d'un domaine qui ne répond pas encore.

## v0.6.0 (9 septembre 2026)

### Nouveautés
- **`/bd-start`** : prépare tout, une seule fois. Installe Node.js s'il manque (winget sur Windows, Homebrew sur macOS), relie l'atelier avec un jeton d'accès, puis fait le tour des trois clés d'API en expliquant pour chacune à quoi elle sert, ce qu'elle coûte et comment l'obtenir.
- **`/new-bd`** : la commande pour commencer une bande dessinée. Un titre de travail, un univers neuf ou réutilisé, le projet créé dans l'atelier, et le brief qui s'enchaîne aussitôt.

### Améliorations
- **`/bd-brief`** sait qu'un projet peut déjà exister (quand on vient de `/new-bd`) et, sinon, le crée lui-même.
- **Publication vérifiée par l'atelier** : chaque version est désormais annoncée à l'atelier, qui télécharge l'archive, recalcule son empreinte et ne la sert que si elle correspond. La page de téléchargement et `/update-hyperbd` lisent cette version vérifiée.

### Coulisses
- Le client de l'atelier gagne `new-project`.

## v0.5.0 (9 septembre 2026)

### Nouveautés
- **Téléchargement depuis l'atelier** : la page de documentation d'HyperBD (app.studio-entremondes.fr/documentation/hyperbd) donne l'archive de la version publiée, son empreinte SHA-256 et les cinq clics pour la téléverser dans Claude Desktop. La ligne de commande reste possible.
- **`/update-hyperbd`** : met le plugin à jour quand il a été téléversé dans Claude Desktop. Il vérifie s'il existe une version plus récente, la télécharge, contrôle son empreinte, et la met en place en gardant l'ancienne de côté. Un plugin suivi par Claude Code est renvoyé vers la commande native.
- **Dépôt public et releases signées** : le code est ouvert sous licence Apache 2.0 ; chaque version est un tag signé et une release GitHub qui porte l'empreinte de son archive.

### Améliorations
- **Le README dit comment s'installer et se mettre à jour**, et renvoie à SECURITY.md, qui décrit ce que le plugin touche, ce qu'il ne fait jamais, et comment vérifier une archive.
- **Inscription libre** : l'atelier n'est plus « sur invitation », un compte se crée sur app.studio-entremondes.fr/inscription.

### Coulisses
- Un empaqueteur sans dépendance construit l'archive à partir des fichiers suivis par git ; le banc de vérification contrôle la version aux trois endroits lisibles, la présence des fichiers de licence et de sécurité, et refuse un chevron dans une description (Claude Desktop rejette alors le zip).

