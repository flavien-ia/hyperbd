# Bible graphique : squelette

> Le document que `/bd-da` écrit à la fin, et que tout le reste de la
> production consulte. Il vit dans le projet sous le nom `bible-graphique`.
>
> Ce n'est pas un compte rendu de ce qui a été fait : c'est la règle à laquelle
> chaque planche à venir sera comparée. Écris-le pour quelqu'un qui arrive dans
> six mois et doit produire la planche 43 sans avoir vu les quarante-deux
> autres.
>
> Remplace tout ce qui est entre crochets. Une section vide vaut mieux qu'une
> section remplie de généralités : si tu ne sais pas encore, écris « à
> trancher » et la production saura qu'il y a là une décision en attente.

---

## Le cadre

> Le bloc de style exact, tel qu'il part dans chaque prompt de planche. C'est
> la copie de ce qui est enregistré dans le `prompt_template` du projet : les
> deux doivent rester identiques, et si l'un change, l'autre change.

```
[le bloc de style, en prose, couvrant les neuf dimensions :
trait, couleur, réalisme, lumière, rapport au blanc, mise en page,
cartouches, sens de lecture, unité de production]
```

**Pourquoi ce style tient sur la durée** : [la justification d'ingénierie. En
quoi ce style absorbe les variations du modèle plutôt que de les exposer. Si
la réponse est « il ne les absorbe pas, on surveillera », écris-le : c'est une
information de production.]

**Où il cassera en premier** : [le point de rupture prévisible, tel que le juge
DA l'a nommé. Le savoir, c'est pouvoir le surveiller.]

---

## Les codes visuels porteurs de sens

> La couleur ne décore pas : elle dit où l'on est et ce qui se joue. Un lecteur
> apprend ces codes sans qu'on les lui explique, à condition qu'ils ne varient
> jamais.

| Fil narratif / lieu / état | Dominante | Ce que ça dit |
|---|---|---|
| [fil ou lieu] | [la couleur, précisément : pas « bleu » mais « bleu de Prusse froid, désaturé »] | [ce que le lecteur doit ressentir sans se le formuler] |
| | | |
| | | |

**Marqueur transverse** (optionnel) : [un signe qui traverse tous les fils et
signale une même chose partout : une matière, un motif, une lumière. Chez HELO
c'était l'irisé. S'il n'y en a pas, écris « aucun » : c'est un choix légitime,
et le noter évite qu'on en invente un plus tard.]

---

## Les motifs récurrents

> Ce qui doit rester **identique** d'une planche à l'autre, et que le modèle
> refabriquera différemment si on ne le lui redonne pas à chaque fois.

- [motif, décrit assez précisément pour être re-décrit dans un prompt sans
  ambiguïté]
- [...]

---

## Les négatifs

> Ce qu'on ne veut **jamais** voir. Cette liste sert deux fois : elle part dans
> les prompts, et elle sert au juge du regard.

- [ce qui trahirait le style]
- [ce qui trahirait le sujet ou le ton]
- [les tics du modèle repérés pendant les essais : rendu lisse par défaut,
  éclairage de studio, symétrie de visage, texte parasite...]

> **Relis les planches de style retenues contre cette liste.** Une image de
> référence qui contient ce que les négatifs interdisent enseigne le contraire
> de la consigne, et le modèle suivra l’image, pas le texte. Si l’une d’elles
> contredit un négatif, recadre-la ou remplace-la avant de la promouvoir.

---

## Grammaire de mise en page

- **Cases par planche** : [fourchette, et la valeur courante]
- **Ce qui autorise une pleine page** : [le critère. Une pleine page qui ne
  répond à aucun critère est une pleine page gratuite.]
- **Seuils de variété** : [ce qui ne doit pas se répéter. Par exemple : pas
  plus de deux planches de suite au même découpage, pas trois gros plans
  consécutifs, une respiration tous les N.]
- **Place réservée au lettrage** : [où les bulles vont vivre, pour que la
  génération leur laisse de la place. Un visage couvert par une bulle est une
  planche à refaire.]

---

## Le lettrage

- **Police retenue** : [son nom dans le catalogue, ou celle qui a été importée]
- **Pourquoi elle** : [ce qu'elle fait à la voix des personnages]
- **Traitement des récitatifs** : [boîtes, couleur, position]
- **Traitement des cris et des onomatopées** : [une autre police ? intégrés au
  dessin ?]

---

## Ce qui a été écarté, et pourquoi

> La trace des pistes perdantes. Elle vaut autant que la piste retenue : elle
> évite qu'on refasse dans trois mois un essai déjà fait, et elle explique à
> qui reprend le projet pourquoi le style est celui-là.

| Piste | Ce qu'elle avait | Pourquoi écartée |
|---|---|---|
| [nom] | [sa force réelle, honnêtement] | [la raison, précise] |
| | | |
