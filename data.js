// Initial user-provided list (November 2026). Keep unchanged on app updates.
const DEFAULT_CATEGORIES = [
  {
    "id": "best-picture",
    "label": "Best Picture",
    "people": false
  },
  {
    "id": "best-director",
    "label": "Best Director",
    "people": true
  },
  {
    "id": "best-actor",
    "label": "Best Actor",
    "people": true
  },
  {
    "id": "best-actress",
    "label": "Best Actress",
    "people": true
  },
  {
    "id": "best-supporting-actor",
    "label": "Best Supporting Actor",
    "people": true
  },
  {
    "id": "best-supporting-actress",
    "label": "Best Supporting Actress",
    "people": true
  },
  {
    "id": "best-documentary",
    "label": "Best Documentary",
    "people": false
  },
  {
    "id": "best-international-feature",
    "label": "Best International Feature",
    "people": false
  },
  {
    "id": "other-interesting",
    "label": "Other Interesting",
    "people": false
  }
];

const SEED_MOVIES = [
  {
    "id": "seed-the-odyssey",
    "title": "The Odyssey",
    "year": null,
    "rating": 8.4,
    "available": false,
    "availabilityDetails": "Download Nov 17th",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": [],
      "best-director": [
        "Christopher Nolan"
      ],
      "best-actor": [
        "Matt Damon"
      ],
      "best-supporting-actor": [
        "John Leguizamo"
      ],
      "best-supporting-actress": [
        "Anne Hathaway",
        "Samantha Morton"
      ]
    }
  },
  {
    "id": "seed-you-can-see-everything",
    "title": "You Can See Everything",
    "year": null,
    "rating": 9.1,
    "available": false,
    "availabilityDetails": "Theaters still",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": [],
      "best-director": [
        "Nathan Fielder"
      ],
      "best-documentary": []
    }
  },
  {
    "id": "seed-the-invite",
    "title": "The Invite",
    "year": null,
    "rating": 7.4,
    "available": true,
    "availabilityDetails": "HBO Max",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": [],
      "best-director": [
        "Olvia Wilde"
      ],
      "best-actress": [
        "Olivia Wilde"
      ],
      "best-supporting-actor": [
        "Edward Norton"
      ],
      "best-supporting-actress": [
        "Penelope Cruz"
      ]
    }
  },
  {
    "id": "seed-i-play-rocky",
    "title": "I Play Rocky",
    "year": null,
    "rating": 7.7,
    "available": false,
    "availabilityDetails": "Theaters now",
    "watched": false,
    "synopsis": "",
    "nominations": {}
  },
  {
    "id": "seed-artificial",
    "title": "Artificial",
    "year": null,
    "rating": 7.6,
    "available": false,
    "availabilityDetails": "Theaters Christmas",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": [],
      "best-supporting-actor": [
        "Andrew Garfield"
      ]
    }
  },
  {
    "id": "seed-the-only-living-pickpocket",
    "title": "The Only Living Pickpocket",
    "year": null,
    "rating": 7.2,
    "available": false,
    "availabilityDetails": "Theaters still",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-actor": [
        "John Tuturo"
      ]
    }
  },
  {
    "id": "seed-primetime",
    "title": "Primetime",
    "year": null,
    "rating": 6.9,
    "available": true,
    "availabilityDetails": "Downloaded",
    "watched": false,
    "synopsis": "",
    "nominations": {}
  },
  {
    "id": "seed-i-swear",
    "title": "I Swear",
    "year": null,
    "rating": 8.3,
    "available": true,
    "availabilityDetails": "Netlix",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "other-interesting": []
    }
  },
  {
    "id": "seed-the-debut",
    "title": "The Debut",
    "year": null,
    "rating": 7.9,
    "available": false,
    "availabilityDetails": "Theaters Dec 11th",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": [],
      "best-actress": [
        "Julianne Moore"
      ],
      "best-supporting-actor": [
        "Paul Giamatti"
      ]
    }
  },
  {
    "id": "seed-project-hail-mary",
    "title": "Project Hail Mary",
    "year": null,
    "rating": 8.2,
    "available": true,
    "availabilityDetails": "Amazon Prime",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": []
    }
  },
  {
    "id": "seed-american-doctor",
    "title": "American Doctor",
    "year": null,
    "rating": 8.5,
    "available": true,
    "availabilityDetails": "Downloaded",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-documentary": []
    }
  },
  {
    "id": "seed-naza",
    "title": "NAZA",
    "year": null,
    "rating": 8.4,
    "available": true,
    "availabilityDetails": "Guardian website late Nov",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-documentary": []
    }
  },
  {
    "id": "seed-wild-horse-nine",
    "title": "Wild Horse Nine",
    "year": null,
    "rating": 8.1,
    "available": false,
    "availabilityDetails": "Theaters still",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": [],
      "best-director": [
        "Martin McDonagh"
      ],
      "best-actor": [
        "John Malkovich"
      ],
      "best-supporting-actor": [
        "Sam Rockwell"
      ]
    }
  },
  {
    "id": "seed-one-in-a-million",
    "title": "One in a Million",
    "year": null,
    "rating": 7.8,
    "available": false,
    "availabilityDetails": "soon on PBS Frontline",
    "watched": false,
    "synopsis": "",
    "nominations": {}
  },
  {
    "id": "seed-the-social-reckoning",
    "title": "The Social Reckoning",
    "year": null,
    "rating": 6.7,
    "available": false,
    "availabilityDetails": "Theaters now",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "other-interesting": []
    }
  },
  {
    "id": "seed-digger",
    "title": "Digger",
    "year": null,
    "rating": 7.5,
    "available": false,
    "availabilityDetails": "Theaters still",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-actor": [
        "Tom Cruise"
      ]
    }
  },
  {
    "id": "seed-once-upon-a-time-in-harlem",
    "title": "Once Upon a Time in Harlem",
    "year": null,
    "rating": 7.7,
    "available": false,
    "availabilityDetails": "Theaters still",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-documentary": []
    }
  },
  {
    "id": "seed-rehearsals-for-a-revolution",
    "title": "Rehearsals for a Revolution",
    "year": null,
    "rating": 7.7,
    "available": false,
    "availabilityDetails": "Theaters Jan",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-documentary": []
    }
  },
  {
    "id": "seed-behemoth",
    "title": "Behemoth",
    "year": null,
    "rating": 7.3,
    "available": false,
    "availabilityDetails": "Theaters Dec 4th",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "other-interesting": []
    }
  },
  {
    "id": "seed-la-bola-negra",
    "title": "La Bola Negra",
    "year": null,
    "rating": 8.1,
    "available": false,
    "availabilityDetails": "Netflix Dec 2nd",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": [],
      "best-director": [
        "Javier Ambrossi"
      ],
      "best-supporting-actress": [
        "Penelope Cruz"
      ],
      "best-international-feature": []
    }
  },
  {
    "id": "seed-all-of-a-sudden",
    "title": "All of a Sudden",
    "year": null,
    "rating": 8.0,
    "available": false,
    "availabilityDetails": "Theaters Dec",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": [],
      "best-actress": [
        "Virginie Efira"
      ],
      "best-supporting-actress": [
        "Tao Okamoto"
      ],
      "best-international-feature": []
    }
  },
  {
    "id": "seed-obsession",
    "title": "Obsession",
    "year": null,
    "rating": 7.8,
    "available": true,
    "availabilityDetails": "Peacock",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-actress": [
        "Inde Navarette"
      ]
    }
  },
  {
    "id": "seed-fjord",
    "title": "Fjord",
    "year": null,
    "rating": 7.6,
    "available": false,
    "availabilityDetails": "Theaters now",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-international-feature": []
    }
  },
  {
    "id": "seed-possible-love",
    "title": "Possible Love",
    "year": null,
    "rating": 7.8,
    "available": true,
    "availabilityDetails": "Netflix",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-international-feature": []
    }
  },
  {
    "id": "seed-dune-part-three",
    "title": "Dune: Part Three",
    "year": null,
    "rating": null,
    "available": false,
    "availabilityDetails": "Theaetrs Dec 18th",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-picture": []
    }
  },
  {
    "id": "seed-elsinore",
    "title": "Elsinore",
    "year": null,
    "rating": 7.7,
    "available": false,
    "availabilityDetails": "Theaters Nov 20th",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-actor": [
        "Andrew Scott"
      ]
    }
  },
  {
    "id": "seed-rose",
    "title": "Rose",
    "year": null,
    "rating": 7.5,
    "available": false,
    "availabilityDetails": "Theaters Dec 11th",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-actress": [
        "Sandra Huller"
      ]
    }
  },
  {
    "id": "seed-minotaur",
    "title": "Minotaur",
    "year": null,
    "rating": 7.6,
    "available": false,
    "availabilityDetails": "MUBI Nov 20th?",
    "watched": false,
    "synopsis": "",
    "nominations": {
      "best-international-feature": []
    }
  }
];
