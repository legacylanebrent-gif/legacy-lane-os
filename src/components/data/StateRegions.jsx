// This file will be populated with scraped city/region data
// Run the scrapeStateCities function to populate this data

export const STATE_REGIONS = {
  CA: {
    name: "California",
    code: "CA",
    largerCities: [
      "Bakersfield", "Chico", "El Centro", "Fresno", "Hanford / Corcoran",
      "Los Angeles / Orange County", "Madera", "Merced", "Modesto",
      "Monterey / Salinas", "Napa", "Oakland / Hayward / Fremont",
      "Palm Springs", "Redding", "Riverside / San Bernardino / Ontario",
      "Sacramento", "San Diego", "San Francisco", "San Jose",
      "San Luis Obispo", "Santa Barbara", "Santa Cruz", "Santa Rosa",
      "Stockton", "Vallejo / Fairfield", "Ventura", "Visalia / Tulare / Porterville",
      "Yuba City"
    ],
    smallerCities: [
      "Clearlake", "Crescent City North", "Eureka / Arcata / Fortuna",
      "Red Bluff", "Sonora / Phoenix Lake - Cedar Ridge", "Temecula / Murrieta",
      "Truckee / Grass Valley", "Ukiah"
    ]
  },
  TX: {
    name: "Texas",
    code: "TX",
    largerCities: [
      "Abilene", "Amarillo", "Austin", "Beaumont / Port Arthur",
      "Brownsville / Harlingen", "College Station / Bryan", "Corpus Christi",
      "Dallas / Fort Worth / Arlington", "El Paso", "Houston",
      "Killeen / Temple / Fort Hood", "Laredo", "Longview", "Lubbock",
      "McAllen / Edinburg / Mission", "Midland", "Odessa", "San Angelo",
      "San Antonio", "Sherman / Denison", "Texarkana", "Tyler", "Victoria",
      "Waco", "Wichita Falls"
    ],
    smallerCities: [
      "Alice", "Athens", "Bay City", "Beeville", "Big Spring", "Brenham",
      "Brownwood", "Canton", "Corsicana", "Del Rio", "Eagle Pass", "El Campo",
      "Fredericksburg", "Gainesville", "Granbury", "Huntsville", "Jacksonville",
      "Jasper", "Kerrville", "Kingsville", "Lufkin", "Marshall", "Mineral Wells",
      "Mount Pleasant", "Nacogdoches", "Palestine", "Paris", "Plainview",
      "Rio Grande City", "Stephenville", "Sulphur Springs", "Uvalde"
    ]
  },
  NY: {
    name: "New York",
    code: "NY",
    largerCities: [
      "Albany", "Binghamton", "Buffalo", "Elmira", "Glens Falls", "Ithaca",
      "Kingston", "New York", "Poughkeepsie / Newburgh / Middletown",
      "Rochester", "Syracuse", "Utica / Rome", "Watertown / Fort Drum"
    ],
    smallerCities: [
      "Amsterdam", "Auburn", "Batavia", "Corning", "Cortland", "Gloversville",
      "Hudson", "Jamestown", "Malone", "Ogdensburg / Massena", "Olean",
      "Oneonta", "Plattsburgh", "Seneca Falls"
    ]
  },
  FL: {
    name: "Florida",
    code: "FL",
    largerCities: [
      "Daytona Beach", "Fort Myers / Cape Coral", "Fort Walton Beach",
      "Gainesville", "Homosassa Springs / Inverness / Crystal River",
      "Jacksonville", "Lakeland / Winter Haven", "Melbourne",
      "Miami / Fort Lauderdale / West Palm Beach", "Naples", "Ocala",
      "Orlando", "Palm Coast", "Panama City", "Pensacola",
      "Port St. Lucie / Fort Pierce", "Punta Gorda", "Sarasota / Bradenton",
      "Sebastian / Vero Beach", "Sebring", "Tallahassee",
      "Tampa / St. Petersburg", "The Villages"
    ],
    smallerCities: [
      "Arcadia", "Clewiston", "Key West / Marathon", "Lake City",
      "Okeechobee", "Palatka", "Wauchula"
    ]
  },
  IL: {
    name: "Illinois",
    code: "IL",
    largerCities: [
      "Bloomington / Normal", "Carbondale", "Champaign / Urbana", "Chicago",
      "Danville", "Decatur", "Kankakee / Bradley", "Marion / Herrin",
      "Peoria", "Rockford", "Springfield", "St. Louis, MO"
    ],
    smallerCities: [
      "Canton", "Centralia", "Charleston / Mattoon", "Dixon", "Effingham",
      "Freeport", "Galesburg", "Harrisburg", "Jacksonville", "Lincoln",
      "Macomb", "Mount Vernon", "Ottawa / Streator", "Pontiac", "Quincy",
      "Rochelle", "Sterling", "Taylorville"
    ]
  }
  // Additional states will be added via the scraping function
};

// Helper function to get all cities for a state
export function getCitiesForState(stateCode) {
  const state = STATE_REGIONS[stateCode];
  if (!state) return [];
  
  return [
    ...(state.largerCities || []).map(city => ({ name: city, type: 'larger' })),
    ...(state.smallerCities || []).map(city => ({ name: city, type: 'smaller' }))
  ];
}

// Helper function to get all states with regions
export function getStatesWithRegions() {
  return Object.values(STATE_REGIONS);
}