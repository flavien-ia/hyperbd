# Changelog

Chaque version publiée a son entrée ici, écrite pour les gens qui utilisent le
plugin, pas pour ceux qui le développent. Les versions antérieures à la 0.5.0
n'avaient pas de journal : l'historique git en tient lieu.

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

