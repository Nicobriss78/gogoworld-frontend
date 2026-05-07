export const EVENT_CATEGORIES = {
  musica: [
    "Concerto",
    "DJ Set",
    "Festival",
    "Live",
    "Jam Session",
    "Altro",
  ],

  nightlife: [
    "Club",
    "Disco",
    "Party",
    "After",
    "Cocktail",
    "Altro",
  ],

  cultura: [
    "Mostra",
    "Museo",
    "Teatro",
    "Cinema",
    "Conferenza",
    "Altro",
  ],

  sport: [
    "Calcio",
    "Palestra",
    "Running",
    "Torneo",
    "Outdoor",
    "Altro",
  ],

  food: [
    "Cena",
    "Degustazione",
    "Street Food",
    "Aperitivo",
    "Brunch",
    "Altro",
  ],

  business: [
    "Networking",
    "Workshop",
    "Startup",
    "Meeting",
    "Coworking",
    "Altro",
  ],

  viaggio: [
    "Tour",
    "Escursione",
    "Weekend",
    "Road Trip",
    "Esperienza",
    "Altro",
  ],

  benessere: [
    "Yoga",
    "Meditazione",
    "Spa",
    "Mindfulness",
    "Relax",
    "Altro",
  ],

  gaming: [
    "LAN Party",
    "eSports",
    "Board Games",
    "Retro Gaming",
    "Altro",
  ],

  altro: [
    "Generico",
  ],
};

export function getCategoryOptions() {
  return Object.keys(EVENT_CATEGORIES);
}

export function getSubcategoryOptions(category) {
  return EVENT_CATEGORIES[category] || [];
}
