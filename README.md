# HyperBD

> Transformer un message en bande dessinée aboutie, avec Claude Code.

HyperBD est un harnais pour Claude Code. Il guide (ou mène seul) les quatre
temps de la création d'une bande dessinée : le scénario, la direction
artistique, les dialogues et le découpage, puis la production des planches. Il
travaille avec l'atelier du Studio Entremondes, où vivent les univers, les
scénarios, les planches et les images.

La méthode ne sort pas de nulle part : elle généralise celle d'un album
réellement publié, [HELO, le prompt source](https://helo.hyperbd.fr) (108 pages,
prix Cyberdéfense du Forum InCyber 2026), et de son tome 2 en cours.

## État

**Version 0.14.0.** Les quatre temps du métier sont là, du message de départ à
l'album exporté. Ce qui fonctionne aujourd'hui :

| Skill | Ce qu'elle fait |
|---|---|
| `/start-hyperbd` | prépare tout, une fois : Node.js s'il manque, le jeton, le tour des clés en expliquant chacune |
| `/new-bd` | commence une bande dessinée : crée le projet dans l'atelier et enchaîne sur le brief |
| `/bd-connect` | relie Claude Code à l'atelier (jeton d'accès, état des clés) |
| `/bd-status` | fait le point sur un album : l'univers, le récit, l'avancement (jusqu'aux pages verrouillées), langues, versions, coûts, prochaines planches |
| `/bd-brief` | le point de départ : source, message, format, distance de transposition, devis |
| `/bd-univers` | le pilote de la phase univers : fait le point, puis enchaîne la bible, la direction artistique, les personnages et les lieux, en s'arrêtant à chaque décision |
| `/bd-bible` | la prémisse (par pistes contrastées, posées sur l'établi), la bible du monde et le prompt d'univers ; aucune image |
| `/bd-da` | la direction artistique : pistes contrastées générées sur une scène étalon ou une image clé, jugées dans la planche contact, verrouillées |
| `/bd-perso` | les personnages de bout en bout : le casting comme graphe de forces, proposé dans l'univers (l'auteur retient ou écarte), puis le dessin des seuls retenus |
| `/bd-decors` | les lieux : ceux du monde avant le récit, ceux que les scènes ont fait naître après ; proposés dans l'univers, puis dessinés |
| `/bd-scenario` | le récit dans la vue Scénario : chapitres et scènes dans le fil, alternatives sur l'établi, rappels, budget face au format visé, audit, pitch, et le relevé des personnages et des lieux qui manquent |
| `/bd-planche-test` | la planche test, sur une vraie scène : la preuve que tout le pipeline tient |
| `/bd-voix` | la bible de voix, éprouvée en aveugle : on retire les noms, on attribue, on compte |
| `/bd-dialogues` | une scène découpée en planches et en cases, dialogues écrits dans les cases |
| `/bd-planches` | le gros œuvre : chaque planche fabriquée de ses cases (les cases d'abord, puis la planche qui les intègre), regardée, validée |
| `/bd-lettrage` | le texte posé sur les planches (né du script une fois, puis corrigé dans le lettrage), les QR codes vers les sources, jugé sur ce qui se voit, validé ; les pages verrouillées ne bougent pas |
| `/bd-couverture` | la couverture et la quatrième, en pages séparées ou à plat pour un album cartonné : concepts d'affiche jugés en vignette, page produite sur son gabarit, titre et dos posés dans le lettrage |
| `/bd-traduire` | l'album dans une autre langue : mêmes bulles, textes traduits avec la bible de voix, jugés, rendus, validés ; rien n'est redessiné |
| `/bd-album` | le pilote : toutes les scènes dans l'ordre (dialogues, planches, lettrage), puis la relecture, la couverture et le point final, sous un budget global, avec trois signatures et la reprise ; enfin, sur accord, les numéros de page, une version figée et le master d'impression |
| `/bd-audit` | l'album passé au crible par lots parallèles, à tout moment |
| `/tuto-hyperbd` | le mode tuto, en miroir du Guide de l'atelier : les quatre étapes d'accueil (le harnais, les clés, le premier univers, le premier projet), l'étape courante, le geste des deux côtés |
| `/update-hyperbd` | met le plugin à jour quand il a été téléversé dans Claude Desktop : vérifie, télécharge, contrôle l'empreinte, remplace |

Le plan complet vit dans `Plan du harnais HyperBD.md`.

## Comment il travaille

**Rien ne s'invente en vase clos.** À chaque bifurcation, plusieurs pistes sont
produites sous des angles imposés, puis jugées par des relecteurs en aveugle
(originalité, dramaturgie, cohérence, fidélité au message, incarnation, voix,
grammaire visuelle) qui ne savent ni qui a écrit ni ce qu'on espérait. Le
gagnant est greffé de ce que les autres avaient de meilleur ; les écartés sont
écartés sur l'établi et au journal, avec leur raison.

**Ce qui peut se mesurer n'est pas confié à un juge.** Un modèle qui s'auto-note
se trouve toujours bon. La différenciation des voix, par exemple, ne se déclare
pas : on retire les noms des répliques, un juge les attribue à l'aveugle, et le
taux est compté par du code, corrigé du réflexe qui consiste à toujours répondre
le personnage qui parle le plus. Le juge reporte ce chiffre sans le réviser, et
consacre son travail à ce qu'aucun compteur ne fait : dire POURQUOI deux voix se
confondent.

**Les recettes sont transcendables.** Le harnais porte des méthodes éprouvées,
pas des lois : un écart motivé et consigné n'est pas une faute. Les juges
évaluent l'effet obtenu, jamais l'obéissance.

**Le travail est partagé.** Le scénario vit sur une Toile : un canvas de blocs
typés que la personne et Claude manipulent ensemble, l'une à la souris, l'autre
par l'API. Ce que Claude propose arrive en trait interrompu, à adopter ou à
écarter d'un geste. Et ce que l'atelier protège, Claude le respecte : un
lettrage retouché ne se ré-écrase pas depuis le script, une page verrouillée
ne bouge plus.

## Installation

Le plus simple : depuis l'atelier. La page
[app.studio-entremondes.fr/documentation/hyperbd](https://app.studio-entremondes.fr/documentation/hyperbd)
donne l'archive de la version publiée, avec son empreinte SHA-256, et les cinq
clics pour la téléverser dans Claude Desktop : onglet **Code**,
**Personnaliser**, **Plugins**, **Ajouter**, **Téléverser un plugin**.

Ou en ligne de commande, dans Claude Code :

```
/plugin marketplace add flavien-ia/hyperbd
/plugin install hyperbd
```

Puis, dans les deux cas, `/start-hyperbd` prépare tout (Node.js s'il manque, le
jeton d'accès, le tour des clés), et `/new-bd` commence un album.

## Mise à jour

- Plugin téléversé dans Claude Desktop : `/update-hyperbd` vérifie s'il existe
  une version plus récente, la télécharge, contrôle son empreinte et la met en
  place.
- Plugin installé par la ligne de commande : `/plugin marketplace update hyperbd`.

## Ce qu'il faut avoir

- Un compte sur l'atelier, ouvert sur
  [app.studio-entremondes.fr/inscription](https://app.studio-entremondes.fr/inscription).
- Claude Desktop (ou Claude Code) avec un abonnement Claude Pro au minimum.
  Node.js est installé par `/start-hyperbd` s'il manque.
- **Des clés**, renseignées dans « Mon compte », qui restent celles de la
  personne : OpenAI pour dessiner et Cloudflare R2 pour ranger les images
  (indispensables) ; Topaz pour les agrandir et Bria pour leur fond perdu,
  le jour de l'impression. L'atelier ne dépense jamais rien à la
  place de quiconque, et les images produites vivent dans l'espace de stockage
  de leur auteur.

## Sécurité

Ce que le plugin touche, ce qu'il ne fait jamais, et comment vérifier qu'une
archive est bien celle qui a été publiée : [SECURITY.md](SECURITY.md). Les
versions sont dans [CHANGELOG.md](CHANGELOG.md).

## Auteur

Flavien Chervet, [Studio Entremondes](https://studio-entremondes.fr).

## Licence

Apache-2.0 ([LICENSE](LICENSE)).
