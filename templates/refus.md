# Quand le fournisseur refuse : la doctrine

> Lu par `/bd-dialogues` (avant d'écrire), `/bd-design`, `/bd-couverture` et
> `/bd-planches` (au moment de payer), `/bd-album` (qui enchaîne tout) et
> `/bd-status` (qui rend compte). Une seule règle par cas, pour que deux
> skills ne répondent jamais différemment au même refus.

Un modèle d'image ne refuse pas comme un éditeur : il ne dit pas ce qui
gêne, il rend une phrase générique et il facture parfois quand même le tour.
L'atelier classe donc chaque échec en une **raison**, à côté du message brut,
et la renvoie avec la génération (`errorReason`). C'est cette raison qui dit
quoi faire, pas le message.

## Les six raisons, et la conduite pour chacune

| `errorReason` | Ce qui s'est passé | Ce qu'on fait |
|---|---|---|
| `refus_securite` | le filtre de sécurité du fournisseur a refusé le prompt ou une image de référence | **reformuler**, jamais relancer à l'identique (voir ci-dessous) |
| `credit_epuise` | le compte OpenAI de la personne n'a plus de crédit prépayé | **s'arrêter** : rien ne passera avant un rechargement sur platform.openai.com (Billing). Le dire, avec le nombre de planches qui restent |
| `plafond_facturation` | la limite de dépense mensuelle du compte OpenAI est atteinte | **s'arrêter** : la relever dans platform.openai.com (Billing, Limits), ou attendre le mois suivant. Le dire |
| `limite_debit` | trop de demandes en trop peu de temps | **attendre** une minute, puis reprendre la même demande, une seule fois de suite ; si ça recommence, espacer les lancements |
| `cle_refusee` | la clé enregistrée dans Mon compte est révoquée, mal copiée, ou sans droit sur ce modèle | **s'arrêter** et renvoyer vers Mon compte (ou `/start-hyperbd`) pour la remplacer. Ne pas réessayer : chaque essai échouera |
| `autre` | réseau, incident chez le fournisseur, bug | **réessayer une fois**, puis s'arrêter et montrer le message brut |

Deux règles qui priment :

- **On ne relance jamais à l'identique un `refus_securite`.** Le filtre est
  déterministe sur un même prompt : le second tour coûte et échoue pareil.
- **Un arrêt pour crédit, plafond ou clé n'est pas un échec de la planche.**
  On ne la marque pas ratée, on ne change pas son script : on reprend là où
  on en était quand la cause est levée, et c'est l'état du serveur qui le
  dit.

## Reformuler après un refus de sécurité

Le filtre refuse **ce qu'il croit voir**, pas ce que la scène veut dire. Il
n'est pas nécessaire de changer la scène ; il faut changer la façon dont
l'image la montre. Dans l'ordre, jusqu'à ce que ça passe (trois tours au
maximum, puis on fait cette image autrement) :

1. **Suggérer plutôt que montrer.** Le coup est hors champ, l'arme est posée,
   la blessure est un pansement, le sang est une ombre. La violence se lit
   dans les visages et les postures, et c'est presque toujours plus fort.
2. **Retirer les mots qui déclenchent**, même justes : décrire la peur d'un
   personnage plutôt que l'acte qui la cause, une « lame » plutôt qu'un
   « couteau ensanglanté », un « corps allongé » plutôt qu'un « cadavre ».
3. **Aucune ressemblance avec une personne réelle**, nommée ou décrite par
   ses traits reconnaissables : un dirigeant, une célébrité, une personne du
   document source. Un personnage inspiré d'une personne réelle se dessine
   avec des traits propres et un autre nom.
4. **Aucun mineur dans une situation ambiguë**, aucune nudité, aucune
   sexualisation, même implicite, même « pour le récit ».
5. **Aucune marque, aucun logo, aucun symbole de haine**, aucun drapeau ou
   uniforme réel détourné.
6. **Vérifier les références.** Une image de référence (fiche, décor,
   planche de style) peut déclencher le refus à elle seule : retirer celles
   qui montrent une arme, du sang, un corps dénudé, et relancer.

Après trois tours, on **fait l'image autrement** : une case au lieu d'une
planche entière (le refus porte souvent sur une seule case), un autre
cadrage, ou l'import d'une image faite à la main. Et on l'écrit au journal :
quelle case, quel refus, ce qui a été changé.

## Avant d'écrire : le pré-contrôle des dialogues

Le meilleur refus est celui qui n'arrive pas. Au moment de découper une scène
(`/bd-dialogues`), relire chaque case contre la liste ci-dessus : une case
qui décrit un acte violent explicite, un corps, une personne réelle, une
marque, se réécrit **avant** d'être payée. Il ne s'agit pas d'édulcorer le
récit : il s'agit de choisir, dès le découpage, ce que l'image montre et ce
qu'elle laisse deviner. C'est un choix de mise en scène, et il se consigne.

## Ce qu'on dit à la personne

En clair, sans jargon : la raison (« le filtre de sécurité d'OpenAI a refusé
cette image »), ce qu'on a changé ou ce qu'il faut faire (« recharger le
compte », « remplacer la clé »), et ce que ça a coûté. Jamais le message brut
seul : il ne dit rien à qui ne connaît pas le fournisseur. Le message brut
reste disponible dans l'atelier pour qui veut le lire.
