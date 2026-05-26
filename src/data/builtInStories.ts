/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Story } from "../types";

export const builtInStories: Story[] = [
  {
    id: "builtin-routine",
    title: "Ma routine quotidienne",
    level: "beginner",
    isBuiltIn: true,
    createdAt: 1716710400000,
    sentences: [
      { french: "Je me lève à sept heures tous les matins.", english: "I get up at seven o'clock every morning." },
      { french: "Je prends une bonne douche chaude.", english: "I take a good hot shower." },
      { french: "Ensuite, je mange un croissant de la boulangerie.", english: "Then, I eat a croissant from the bakery." },
      { french: "Je bois aussi une tasse de café noir.", english: "I also drink a cup of black coffee." },
      { french: "Après le petit-déjeuner, je vais au travail à pied.", english: "After breakfast, I walk to work." },
      { french: "La journée commence toujours avec le sourire.", english: "The day always starts with a smile." }
    ]
  },
  {
    id: "builtin-cafe",
    title: "Au café de Flore",
    level: "beginner",
    isBuiltIn: true,
    createdAt: 1716710405000,
    sentences: [
      { french: "Bonjour, je cherche une table en terrasse.", english: "Hello, I am looking for a table on the terrace." },
      { french: "Le serveur apporte la carte des boissons rapidement.", english: "The waiter brings the drinks menu quickly." },
      { french: "Je voudrais un café au lait, s'il vous plaît.", english: "I would like a coffee with milk, please." },
      { french: "Est-ce que vous vendez du jus d'orange frais ?", english: "Do you sell fresh orange juice?" },
      { french: "Oui, nous avons des fruits pressés ce matin.", english: "Yes, we have freshly squeezed fruit this morning." },
      { french: "Parfait, je vais prendre une brioche en plus.", english: "Perfect, I will take a brioche as well." }
    ]
  },
  {
    id: "builtin-promenade",
    title: "Une promenade à Paris",
    level: "easy",
    isBuiltIn: true,
    createdAt: 1716710410000,
    sentences: [
      { french: "Hier, nous avons marché le long de la Seine.", english: "Yesterday, we walked along the Seine." },
      { french: "Le soleil brillait doucement à travers les arbres.", english: "The sun was shining gently through the trees." },
      { french: "Nous sommes passés devant la cathédrale Notre-Dame.", english: "We passed in front of Notre-Dame Cathedral." },
      { french: "Des peintres vendaient leurs toiles au coin de la rue.", english: "Painters were selling their canvases on the street corner." },
      { french: "J'ai pris beaucoup de jolies photos du fleuve.", english: "I took a lot of pretty pictures of the river." },
      { french: "À midi, nous avons acheté des sandwichs au jambon.", english: "At noon, we bought ham sandwiches." },
      { french: "Nous nous sommes assis sur un banc dans un petit parc.", english: "We sat on a bench in a small park." },
      { french: "C'était une journée calme et pleine de belles surprises.", english: "It was a calm day full of beautiful surprises." }
    ]
  },
  {
    id: "builtin-rencontre",
    title: "Rencontre amicale",
    level: "easy",
    isBuiltIn: true,
    createdAt: 1716710415000,
    sentences: [
      { french: "Ce matin, j'ai rencontré un ancien camarade de classe.", english: "This morning, I ran into an old classmate." },
      { french: "Nous ne nous étions pas vus depuis cinq ans.", english: "We hadn't seen each other for five years." },
      { french: "Il portait un grand chapeau et de grosses lunettes.", english: "He was wearing a big hat and thick glasses." },
      { french: "Nous avons décidé de déjeuner ensemble dans une brasserie.", english: "We decided to have lunch together in a brasserie." },
      { french: "Il m'a raconté son dernier voyage fantastique en Afrique.", english: "He told me about his fantastic last trip to Africa." },
      { french: "Il a vu des lions, des éléphants et des girafes sauvages.", english: "He saw wild lions, elephants, and wild giraffes." },
      { french: "Je lui ai parlé de mon nouveau travail de traducteur.", english: "I told him about my new job as a translator." },
      { french: "Nous avons promis de nous revoir très bientôt pour dîner.", english: "We promised to meet again very soon for dinner." }
    ]
  },
  {
    id: "builtin-folktale",
    title: "La légende du pain perdu",
    level: "intermediate",
    isBuiltIn: true,
    createdAt: 1716710420000,
    sentences: [
      { french: "Il était une fois, dans un petit village alsacien, une boulangère pauvre.", english: "Once upon a time, in a small Alsatian village, there was a poor baker." },
      { french: "Elle détestait jeter le pain rassis qui restait à la fin de la semaine.", english: "She hated throwing away the stale bread that remained at the end of the week." },
      { french: "Un jour de tempête, un voyageur fatigué frappa doucement à sa porte en bois.", english: "On a stormy day, a tired traveller knocked gently on her wooden door." },
      { french: "Il n'avait pas mangé depuis trois jours et grelottait de froid sous la pluie.", english: "He hadn't eaten for three days and was shivering with cold in the rain." },
      { french: "Pour l'aider, elle mélangea des œufs, un peu de lait tiède et du sucre.", english: "To help him, she mixed eggs, a little warm milk, and sugar." },
      { french: "Elle y trempa les tranches de vieux pain dur avant de les faire frire.", english: "She soaked the slices of old hard bread in it before frying them." },
      { french: "Une odeur merveilleuse et sucrée de cannelle envahit rapidement toute la maison.", english: "A wonderful, sweet smell of cinnamon quickly filled the entire house." },
      { french: "Le voyageur déclara que c'était le meilleur repas de toute son existence active.", english: "The traveller declared that it was the best meal of his entire active life." },
      { french: "Depuis cette époque, cette recette simple réchauffe les cœurs des gourmands tristes.", english: "Since that time, this simple recipe warms the hearts of sad food lovers." },
      { french: "Le pain perdu est devenu un symbole d'hospitalité et de générosité locale.", english: "French toast became a symbol of hospitality and local generosity." },
      { french: "On le déguste encore aujourd'hui en famille le dimanche matin au réveil.", english: "It is still enjoyed today with family on Sunday mornings upon waking up." },
      { french: "C'est ainsi qu'une idée astucieuse a sauvé de la faim de nombreux passants.", english: "This is how a clever idea saved many passersby from hunger." }
    ]
  },
  {
    id: "builtin-voyage",
    title: "Un voyage en TGV",
    level: "intermediate",
    isBuiltIn: true,
    createdAt: 1716710425000,
    sentences: [
      { french: "Le train à grande vitesse s'élance à toute allure à travers la campagne française.", english: "The high-speed train dashes at full speed through the French countryside." },
      { french: "Par la fenêtre, les champs de tournesols dessinent un paysage d'or magnifique.", english: "Through the window, the fields of sunflowers paint a magnificent golden landscape." },
      { french: "Les passagers lisent tranquillement des romans ou travaillent sur leurs ordinateurs portables.", english: "The passengers are quietly reading novels or working on their laptops." },
      { french: "Le contrôleur passe dans les wagons pour vérifier les billets électroniques de chacun.", english: "The conductor passes through the carriages to check everyone's electronic tickets." },
      { french: "Je me rends au wagon-bar pour acheter une bouteille d'eau gazeuse fraîche.", english: "I go to the bar carriage to buy a bottle of cold sparkling water." },
      { french: "Là-bas, je discute quelques minutes avec une étudiante qui voyage vers Marseille.", english: "There, I chat for a few minutes with a student travelling towards Marseille." },
      { french: "Elle étudie l'histoire de l'art médiéval et rêve de restaurer de vieilles églises.", english: "She studies medieval art history and dreams of restoring old churches." },
      { french: "Le voyage est si confortable et rapide que l'on ne sent pas le temps passer.", english: "The journey is so comfortable and fast that you don't feel the time passing." },
      { french: "En arrivant en gare Saint-Charles, une agréable odeur de lavande nous accueille chaleureusement.", english: "Upon arriving at Saint-Charles station, a pleasant smell of lavender welcomes us warmly." },
      { french: "Les cris des mouettes indiquent que la mer Méditerranée est désormais toute proche.", english: "The cries of the seagulls indicate that the Mediterranean Sea is now very close." },
      { french: "Je récupère ma lourde valise rouge et descends joyeusement sur le quai ensoleillé.", english: "I retrieve my heavy red suitcase and joyfully step down onto the sunny platform." },
      { french: "Mes vacances sous le soleil du Midi commencent enfin, sous les meilleurs auspices.", english: "My holidays under the southern sun finally begin, under the best auspices." }
    ]
  }
];
