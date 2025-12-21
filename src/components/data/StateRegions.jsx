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
  },
  PA: {
    name: "Pennsylvania",
    code: "PA",
    largerCities: [
      "Altoona", "Bloomsburg / Berwick", "Chambersburg", "East Stroudsburg",
      "Erie", "Gettysburg", "Harrisburg", "Johnstown", "Lancaster", "Lebanon",
      "Lehigh Valley", "Philadelphia", "Pittsburgh", "Reading",
      "Scranton / Wilkes-Barre", "State College", "Williamsport", "York",
      "Youngstown / Warren / Sharon"
    ],
    smallerCities: [
      "Bradford", "Dubois", "Huntingdon", "Indiana", "Lewisburg", "Lewistown",
      "Lock Haven", "Meadville", "New Castle", "Oil City", "Pottsville", "Sayre",
      "Selinsgrove", "Somerset", "St. Marys", "Sunbury", "Warren"
    ]
  },
  OH: {
    name: "Ohio",
    code: "OH",
    largerCities: [
      "Akron", "Canton / Massillon", "Cincinnati / Middletown", "Cleveland",
      "Columbus", "Dayton", "Lima", "Mansfield", "Springfield", "Steubenville",
      "Toledo", "Youngstown / Warren / Sharon"
    ],
    smallerCities: [
      "Ashland", "Ashtabula", "Athens", "Bellefontaine", "Bucyrus", "Cambridge",
      "Celina", "Chillicothe", "Coshocton", "Defiance", "East Liverpool / Salem",
      "Findlay", "Fremont", "Greenville", "Marion", "Mount Vernon",
      "New Philadelphia / Dover", "Norwalk", "Sandusky", "Sidney",
      "Tiffin / Fostoria", "Urbana", "Van Wert", "Wapakoneta", "Washington",
      "Wilmington", "Wooster", "Zanesville"
    ]
  },
  GA: {
    name: "Georgia",
    code: "GA",
    largerCities: [
      "Albany", "Athens", "Atlanta", "Augusta", "Brunswick", "Columbus",
      "Dalton", "Gainesville", "Hinesville / Fort Stewart", "Macon", "Rome",
      "Savannah", "Valdosta", "Warner Robins"
    ],
    smallerCities: [
      "Americus", "Calhoun", "Cedartown", "Cornelia", "Douglas", "Dublin",
      "Ellijay", "Fitzgerald", "Fort Valley", "Jesup", "Lagrange",
      "Milledgeville", "Moultrie", "St. Marys", "Statesboro", "Summerville",
      "Thomaston", "Thomasville", "Tifton", "Toccoa", "Waycross"
    ]
  },
  NC: {
    name: "North Carolina",
    code: "NC",
    largerCities: [
      "Asheville", "Burlington", "Chapel Hill / Durham", "Charlotte",
      "Fayetteville", "Goldsboro", "Greensboro / High Point", "Greenville",
      "Hickory / Morganton", "Jacksonville", "New Bern", "Raleigh", "Rocky Mount",
      "Wilmington", "Winston - Salem"
    ],
    smallerCities: [
      "Albemarle", "Boone", "Brevard", "Concord", "Dunn", "Elizabeth City",
      "Forest City", "Gastonia", "Henderson", "Kill Devil Hills", "Kinston",
      "Laurinburg", "Lexington / Thomasville", "Lincolnton", "Lumberton",
      "Morehead City", "Mount Airy", "North Wilkesboro", "Roanoke Rapids",
      "Rockingham", "Salisbury", "Sanford", "Shelby", "Southern Pines",
      "Statesville / Mooresville", "Washington", "Wilson"
    ]
  },
  MI: {
    name: "Michigan",
    code: "MI",
    largerCities: [
      "Ann Arbor", "Battle Creek", "Bay City", "Detroit", "Flint",
      "Grand Rapids", "Holland / Grand Haven", "Jackson", "Kalamazoo / Portage",
      "Lansing", "Midland", "Monroe", "Muskegon / Norton Shores",
      "Niles / Benton Harbor", "Saginaw"
    ],
    smallerCities: [
      "Adrian", "Allegan", "Alma", "Alpena", "Big Rapids", "Cadillac",
      "Coldwater", "Escanaba", "Houghton", "Marquette", "Mount Pleasant",
      "Owosso", "Port Huron", "Sault Ste. Marie", "Sturgis", "Traverse City"
    ]
  },
  NJ: {
    name: "New Jersey",
    code: "NJ",
    largerCities: [
      "Atlantic City", "New York, NY", "Northern New Jersey",
      "Ocean City / Cape May", "Trenton / Ewing (Central NJ)",
      "Vineland / Millville / Bridgeton"
    ],
    smallerCities: []
  },
  VA: {
    name: "Virginia",
    code: "VA",
    largerCities: [
      "Blacksburg / Christiansburg / Radford", "Charlottesville", "Harrisonburg",
      "Kingsport / Bristol", "Lynchburg", "Norfolk / Virginia Beach / Newport News",
      "Richmond", "Roanoke", "Staunton / Waynesboro", "Washington DC", "Winchester"
    ],
    smallerCities: [
      "Bluefield", "Danville", "Fairfax / Arlington / Alexandria", "Martinsville"
    ]
  },
  WA: {
    name: "Washington",
    code: "WA",
    largerCities: [
      "Bellingham", "Bremerton", "Longview", "Mount Vernon / Anacortes",
      "Olympia", "Portland / Vancouver", "Richland / Kennewick / Pasco",
      "Seattle / Tacoma / Bellevue", "Spokane", "Wenatchee", "Yakima"
    ],
    smallerCities: [
      "Aberdeen", "Centralia", "Ellensburg", "Moses Lake", "Oak Harbor",
      "Port Angeles", "Pullman", "Shelton"
    ]
  },
  AZ: {
    name: "Arizona",
    code: "AZ",
    largerCities: [
      "Flagstaff", "Lake Havasu City / Kingman", "Phoenix", "Prescott",
      "Sierra Vista / Douglas", "Tucson", "Yuma"
    ],
    smallerCities: [
      "Nogales", "Payson", "Safford", "Show Low"
    ]
  },
  MA: {
    name: "Massachusetts",
    code: "MA",
    largerCities: [
      "Barnstable Town", "Boston", "New Bedford", "Pittsfield", "Springfield",
      "Worcester"
    ],
    smallerCities: [
      "Beverly / Gloucester", "Brockton", "Lowell", "Plymouth"
    ]
  },
  TN: {
    name: "Tennessee",
    code: "TN",
    largerCities: [
      "Chattanooga", "Cleveland", "Hopkinsville / Clarksville", "Jackson",
      "Johnson City", "Kingsport / Bristol", "Knoxville", "Memphis",
      "Morristown", "Nashville"
    ],
    smallerCities: [
      "Athens", "Columbia", "Cookeville", "Crossville", "Dyersburg",
      "Greeneville", "Harriman", "La Follette", "Lawrenceburg", "McMinnville",
      "Newport", "Paris", "Sevierville", "Shelbyville", "Tullahoma"
    ]
  },
  IN: {
    name: "Indiana",
    code: "IN",
    largerCities: [
      "Anderson", "Bloomington", "Chicago, IL", "Columbus", "Crown Point",
      "Elkhart", "Evansville", "Fort Wayne", "Indianapolis", "Kokomo",
      "Lafayette", "Michigan City / La Porte", "Muncie", "South Bend",
      "Terre Haute"
    ],
    smallerCities: [
      "Angola", "Auburn", "Bedford", "Connersville", "Crawfordsville", "Decatur",
      "Frankfort", "Greensburg", "Huntington", "Jasper", "Kendallville",
      "Logansport", "Madison", "Marion", "New Castle", "North Vernon", "Peru",
      "Plymouth", "Richmond", "Scottsburg", "Seymour", "Vincennes", "Wabash",
      "Warsaw", "Washington"
    ]
  },
  MO: {
    name: "Missouri",
    code: "MO",
    largerCities: [
      "Cape Girardeau", "Columbia", "Jefferson City", "Joplin", "Kansas City",
      "Springfield", "St. Joseph", "St. Louis"
    ],
    smallerCities: [
      "Branson", "Farmington", "Fort Leonard Wood", "Hannibal", "Kennett",
      "Kirksville", "Lebanon", "Moberly", "Poplar Bluff", "Rolla", "Sedalia",
      "Sikeston", "Warrensburg", "West Plains"
    ]
  },
  MD: {
    name: "Maryland",
    code: "MD",
    largerCities: [
      "Annapolis", "Baltimore", "Eastern Shore", "Frederick",
      "Potomac / Bethesda / Silver Spring", "Southern Maryland", "Washington DC",
      "Western Maryland"
    ],
    smallerCities: []
  },
  WI: {
    name: "Wisconsin",
    code: "WI",
    largerCities: [
      "Appleton", "Eau Claire", "Fond Du Lac", "Green Bay", "Janesville / Beloit",
      "Kenosha", "La Crosse", "Madison", "Milwaukee", "Oshkosh / Neenah",
      "Racine", "Sheboygan", "Wausau"
    ],
    smallerCities: [
      "Baraboo", "Beaver Dam", "Manitowoc", "Marinette", "Menomonie", "Merrill",
      "Monroe", "Platteville", "Stevens Point", "Watertown / Fort Atkinson",
      "Whitewater", "Wisconsin Rapids / Marshfield"
    ]
  },
  CO: {
    name: "Colorado",
    code: "CO",
    largerCities: [
      "Boulder", "Colorado Springs", "Denver", "Fort Collins", "Grand Junction",
      "Greeley", "Pueblo"
    ],
    smallerCities: [
      "Canon City", "Durango", "Edwards", "Fort Morgan", "Montrose"
    ]
  },
  MN: {
    name: "Minnesota",
    code: "MN",
    largerCities: [
      "Duluth", "Mankato", "Minneapolis / St. Paul", "Rochester", "St. Cloud"
    ],
    smallerCities: [
      "Albert Lea", "Alexandria", "Austin", "Bemidji", "Brainerd",
      "Faribault / Northfield", "Fergus Falls", "Hutchinson", "Marshall",
      "New Ulm", "Owatonna", "Red Wing", "Willmar", "Winona"
    ]
  },
  SC: {
    name: "South Carolina",
    code: "SC",
    largerCities: [
      "Anderson", "Charleston", "Columbia", "Florence", "Greenville",
      "Hilton Head Island / Beaufort", "Myrtle Beach", "Spartanburg", "Sumter"
    ],
    smallerCities: [
      "Bennettsville", "Chester", "Dillon", "Gaffney", "Georgetown", "Greenwood",
      "Lancaster", "Newberry", "Orangeburg", "Rock Hill", "Seneca", "Union",
      "Walterboro"
    ]
  },
  AL: {
    name: "Alabama",
    code: "AL",
    largerCities: [
      "Anniston", "Auburn", "Birmingham", "Columbus, GA", "Daphne / Fairhope",
      "Decatur", "Dothan", "Florence", "Gadsden", "Huntsville", "Mobile",
      "Montgomery", "Tuscaloosa"
    ],
    smallerCities: [
      "Albertville", "Cullman", "Enterprise / Ozark", "Scottsboro", "Selma",
      "Talladega / Sylacauga", "Troy", "Valley"
    ]
  },
  LA: {
    name: "Louisiana",
    code: "LA",
    largerCities: [
      "Alexandria", "Baton Rouge", "Hammond", "Houma", "Lafayette",
      "Lake Charles", "Monroe", "New Orleans", "Shreveport"
    ],
    smallerCities: [
      "Abbeville", "Bastrop", "Bogalusa", "Crowley", "DeRidder", "Fort Polk",
      "Jennings", "Minden", "Morgan City", "Natchitoches", "New Iberia",
      "Opelousas / Eunice", "Ruston"
    ]
  },
  KY: {
    name: "Kentucky",
    code: "KY",
    largerCities: [
      "Bowling Green", "Cincinnati / Middletown, OH", "Elizabethtown",
      "Hopkinsville / Clarksville", "Huntington / Ashland", "Lexington",
      "Louisville", "Owensboro"
    ],
    smallerCities: [
      "Central City", "Corbin", "Danville", "Frankfort", "Glasgow", "London",
      "Madisonville", "Mayfield", "Maysville", "Middlesborough", "Mount Sterling",
      "Murray", "Paducah", "Richmond", "Somerset"
    ]
  },
  OR: {
    name: "Oregon",
    code: "OR",
    largerCities: [
      "Albany / Lebanon", "Bend", "Corvallis", "Eugene", "Grants Pass",
      "Medford / Ashland", "Portland / Vancouver", "Salem"
    ],
    smallerCities: [
      "Astoria", "Coos Bay", "Klamath Falls", "Pendleton / Hermiston", "Roseburg"
    ]
  },
  OK: {
    name: "Oklahoma",
    code: "OK",
    largerCities: [
      "Enid", "Fort Smith, AR", "Lawton", "Oklahoma City", "Tulsa"
    ],
    smallerCities: [
      "Ada", "Altus", "Ardmore", "Bartlesville", "Duncan", "Durant", "McAlester",
      "Miami", "Muskogee", "Ponca City", "Shawnee", "Stillwater", "Tahlequah"
    ]
  },
  CT: {
    name: "Connecticut",
    code: "CT",
    largerCities: [
      "Bridgeport / Stamford / Norwalk", "Danbury", "Hartford",
      "New Haven / Milford", "New London", "Torrington", "Waterbury", "Willimantic"
    ],
    smallerCities: []
  },
  IA: {
    name: "Iowa",
    code: "IA",
    largerCities: [
      "Ames", "Cedar Rapids", "Davenport", "Des Moines", "Dubuque", "Iowa City",
      "Omaha / Council Bluffs", "Sioux City", "Waterloo"
    ],
    smallerCities: [
      "Clinton", "Corning", "Fort Dodge", "Marshalltown", "Mason City",
      "Muscatine", "Newton", "Ottumwa"
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