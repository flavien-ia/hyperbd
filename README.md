# HyperBD

> Transformer un message en bande dessinée aboutie, avec Claude Code.

HyperBD est un harnais pour Claude Code. Il guide (ou mène seul) les quatre temps de la création d'une bande dessinée : le scénario, la direction artistique, les dialogues et le découpage, puis la production des planches. Il travaille avec l'atelier du Studio Entremondes, où vivent les univers, les planches et les images.

La méthode ne sort pas de nulle part : elle généralise celle d'un album réellement publié, [HELO, le prompt source](https://helo.hyperbd.fr) (108 pages, prix Cyberdéfense du Forum InCyber 2026), et de son tome 2 en cours.

## État

**Version 0.1.0, en construction.** Ce qui fonctionne aujourd'hui :

| Skill | Ce qu'elle fait |
|---|---|
| `/bd-connect` | relie Claude Code à l'atelier (jeton d'accès, état des clés) |
| `/bd-status` | fait le point sur un album : avancement, coûts, prochaines planches |

Les skills de craft (scénario, direction artistique, dialogues, production) arrivent ensuite. Le plan complet vit dans `Plan du harnais HyperBD.md`.

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
- **Trois clés**, renseignées dans « Mon compte », qui restent celles de la personne : OpenAI pour dessiner, Cloudflare R2 pour ranger les images, Topaz pour les agrandir avant impression. L'atelier ne dépense jamais rien à la place de quiconque, et les images produites vivent dans l'espace de stockage de leur auteur.

## Auteur

Flavien Chervet, [Studio Entremondes](https://studio-entremondes.fr).

## Licence

Apache-2.0.
