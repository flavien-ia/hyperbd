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

**Version 0.3.0, en construction.** Ce qui fonctionne aujourd'hui :

| Skill | Ce qu'elle fait |
|---|---|
| `/bd-connect` | relie Claude Code à l'atelier (jeton d'accès, état des clés) |
| `/bd-status` | fait le point sur un album : avancement, coûts, prochaines planches |
| `/bd-brief` | le point de départ : source, message, format, distance de transposition, devis |
| `/bd-univers` | la prémisse (par pistes contrastées) et la bible du monde |
| `/bd-personnages` | le casting comme graphe de forces, fiches et variantes |
| `/bd-scenario` | actes, scènes, mise en scène, rappels, budget, audit et pitch |
| `/bd-da` | la direction artistique : pistes contrastées générées, jugées, verrouillées |
| `/bd-design` | personnages, décors et motifs dessinés, puis la planche test |
| `/bd-audit` | l'album passé au crible par lots parallèles, à tout moment |

Les temps 3 et 4 (dialogues, production complète des planches) arrivent
ensuite. Le plan complet vit dans `Plan du harnais HyperBD.md`.

## Comment il travaille

**Rien ne s'invente en vase clos.** À chaque bifurcation, plusieurs pistes sont
produites sous des angles imposés, puis jugées par des relecteurs en aveugle
(originalité, dramaturgie, cohérence, fidélité au message, incarnation) qui ne
savent ni qui a écrit ni ce qu'on espérait. Le gagnant est greffé de ce que les
autres avaient de meilleur ; les écartés vont au journal avec leur raison.

**Les recettes sont transcendables.** Le harnais porte des méthodes éprouvées,
pas des lois : un écart motivé et consigné n'est pas une faute. Les juges
évaluent l'effet obtenu, jamais l'obéissance.

**Le travail est partagé.** Le scénario vit sur une Toile : un canvas de blocs
typés que la personne et Claude manipulent ensemble, l'une à la souris, l'autre
par l'API. Ce que Claude propose arrive en trait interrompu, à adopter ou à
écarter d'un geste.

## Installation

```
/plugin marketplace add flavien-ia/hyperbd
/plugin install hyperbd
```

Puis, dans Claude Code :

```
/bd-connect
```

## Ce qu'il faut avoir

- Un compte sur l'atelier (accès sur invitation pour l'instant).
- **Trois clés**, renseignées dans « Mon compte », qui restent celles de la
  personne : OpenAI pour dessiner, Cloudflare R2 pour ranger les images, Topaz
  pour les agrandir avant impression. L'atelier ne dépense jamais rien à la
  place de quiconque, et les images produites vivent dans l'espace de stockage
  de leur auteur.

## Auteur

Flavien Chervet, [Studio Entremondes](https://studio-entremondes.fr).

## Licence

Apache-2.0.
