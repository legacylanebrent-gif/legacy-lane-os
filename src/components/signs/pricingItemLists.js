// Typical item lists for every pricing sign topic, generated for the library so
// each pricing sign offers a real starting price guide instead of a blank sign.
//
// DOCTRINE: a printed range is a starting guide, never a price. Final pricing is
// always set by the operator on the item record; printing changes nothing. An
// operator trims the list and re prices it for a specific sale in the sign editor,
// and that edited copy lives on the sale — never on this shared list.

const rows = (list) => list.map(([label, min, max]) => ({ label, min, max }));

// Signs that print wording in the price column instead of a range (percent off).
const textRows = (list) => list.map(([label, text]) => ({ label, mode: 'text', text }));

export const PRICING_ITEM_LISTS = {
  'pricing-angels': {
    heading: 'Angels',
    rows: rows([
      ['Angel Figurines', 2, 12],
      ['Angel Statues', 5, 25],
      ['Porcelain Angels', 3, 15],
      ['Resin Angels', 2, 10],
      ['Angel Ornaments', 1, 6],
      ['Angel Wall Plaques', 2, 8],
      ['Angel Candle Holders', 2, 8],
      ['Angel Figurine Sets', 8, 30],
    ]),
  },

  'pricing-bedroom-set': {
    heading: 'Bedroom Set',
    rows: rows([
      ['Dresser', 40, 150],
      ['Chest of Drawers', 30, 120],
      ['Nightstand', 15, 60],
      ['Bed Frame', 30, 150],
      ['Headboard', 20, 80],
      ['Vanity', 25, 100],
      ['Vanity Stool', 8, 25],
      ['Dresser Mirror', 10, 45],
      ['Complete Bedroom Set', 150, 600],
    ]),
  },

  'pricing-books': {
    heading: 'Books',
    rows: rows([
      ['Hardcover Books', 1, 3],
      ['Paperback Books', 0.5, 2],
      ['Cookbooks', 1, 4],
      ['Children Books', 0.5, 2],
      ['Vintage Books', 2, 10],
      ['Coffee Table Books', 2, 8],
      ['Boxed Book Sets', 5, 20],
      ['Textbooks', 1, 5],
      ['Book Bundles', 3, 10],
    ]),
  },

  'pricing-christmas-decor': {
    heading: 'Christmas Decor',
    rows: rows([
      ['Ornaments', 0.5, 3],
      ['Wreaths', 3, 15],
      ['Christmas Trees', 10, 60],
      ['Tree Skirts', 2, 8],
      ['Stockings', 1, 5],
      ['Nativity Sets', 5, 30],
      ['Light Strings', 1, 5],
      ['Holiday Linens', 1, 4],
      ['Santa Figures', 2, 15],
    ]),
  },

  'pricing-christmas-decor-2': {
    heading: 'Christmas Collectibles',
    rows: rows([
      ['Village Houses', 3, 15],
      ['Snow Globes', 2, 12],
      ['Holiday Trains', 8, 40],
      ['Christmas Plates', 2, 10],
      ['Glass Ornaments', 1, 6],
      ['Candle Holders', 1, 8],
      ['Tabletop Trees', 3, 15],
      ['Gift Wrap and Bags', 0.5, 3],
    ]),
  },

  'pricing-cleaners-detergents': {
    heading: 'Cleaners and Detergents',
    rows: rows([
      ['Laundry Detergent', 1, 4],
      ['Cleaning Sprays', 0.5, 3],
      ['Bleach and Cleaners', 0.5, 2],
      ['Mops and Brooms', 2, 6],
      ['Buckets', 1, 4],
      ['Sponges and Brushes', 0.25, 2],
      ['Floor Cleaners', 1, 3],
      ['Vacuum Supplies', 1, 4],
      ['New in Box Cleaning Sets', 3, 10],
    ]),
  },

  'pricing-clothing-womens': {
    heading: 'Womens Clothing',
    rows: rows([
      ['Blouses and Tops', 2, 6],
      ['Sweaters', 3, 8],
      ['Dresses', 4, 12],
      ['Skirts', 3, 8],
      ['Pants and Jeans', 4, 10],
      ['Jackets and Coats', 5, 18],
      ['Purses and Handbags', 3, 20],
      ['Shoes', 3, 12],
      ['Scarves', 1, 5],
      ['Costume Jewelry', 1, 5],
    ]),
  },

  'pricing-clothing-womens-2': {
    heading: 'Womens Clothing and Formal Wear',
    rows: rows([
      ['Formal Gowns', 10, 40],
      ['Suits and Blazers', 8, 25],
      ['Lingerie and Sleepwear', 1, 6],
      ['Swimwear', 2, 6],
      ['Plus Size Clothing', 2, 8],
      ['Petite Clothing', 2, 8],
      ['Designer Labels', 8, 35],
      ['Winter Coats', 10, 35],
      ['Belts and Accessories', 1, 5],
      ['Shoes and Boots', 3, 15],
    ]),
  },

  'pricing-dining-set': {
    heading: 'Dining Set',
    rows: rows([
      ['Dining Table', 40, 200],
      ['Dining Chairs', 10, 45],
      ['China Cabinet', 60, 250],
      ['Buffet and Sideboard', 50, 200],
      ['Table Leaves', 5, 20],
      ['Table Pads', 5, 15],
      ['Placemats and Linens', 1, 5],
      ['Complete Dining Set', 150, 700],
    ]),
  },

  'pricing-duvets-quilts': {
    heading: 'Duvets and Quilts',
    rows: rows([
      ['Quilts', 8, 40],
      ['Comforters', 5, 25],
      ['Duvet Covers', 4, 18],
      ['Bedspreads', 5, 20],
      ['Quilt Sets', 15, 50],
      ['Throw Blankets', 2, 10],
      ['Pillow Shams', 1, 5],
      ['Down Comforters', 10, 40],
      ['Vintage Quilts', 15, 75],
    ]),
  },

  'pricing-flowers-decor': {
    heading: 'Floral Decor',
    rows: rows([
      ['Silk Floral Arrangements', 2, 12],
      ['Vases', 1, 10],
      ['Floral Wreaths', 2, 10],
      ['Artificial Plants', 2, 10],
      ['Flower Pots', 1, 5],
      ['Candle Rings', 1, 4],
      ['Floral Centerpieces', 3, 12],
      ['Dried Florals', 1, 5],
    ]),
  },

  'pricing-funko-pop': {
    heading: 'Funko Pop',
    rows: rows([
      ['Common Funko Pops', 3, 8],
      ['Vaulted Funko Pops', 8, 25],
      ['Chase Funko Pops', 15, 60],
      ['Funko Pop Bundles', 10, 30],
      ['Pop Rides', 10, 35],
      ['Pop Keychains', 2, 6],
      ['Empty Pop Boxes', 0.5, 2],
      ['Pop Protectors', 1, 3],
    ]),
  },

  'pricing-girl-scout-tins': {
    heading: 'Girl Scout Tins',
    rows: rows([
      ['Cookie Tins', 2, 8],
      ['Vintage Girl Scout Tins', 5, 20],
      ['Tin Collections', 10, 35],
      ['Cookie Tins with Contents', 1, 5],
      ['Girl Scout Memorabilia', 3, 15],
      ['Tin Banks', 3, 10],
      ['Tin Lunch Boxes', 3, 12],
    ]),
  },

  'pricing-glass-cookware': {
    heading: 'Glass Cookware',
    rows: rows([
      ['Glass Baking Dishes', 2, 8],
      ['Pyrex Bowls', 3, 15],
      ['Glass Casserole Dishes', 3, 10],
      ['Measuring Cups', 1, 4],
      ['Glass Storage Containers', 1, 5],
      ['Vintage Pyrex', 8, 40],
      ['Glass Mixing Bowls', 2, 10],
      ['Glass Lids', 1, 3],
    ]),
  },

  'pricing-hand-tools': {
    heading: 'Hand Tools',
    rows: rows([
      ['Screwdrivers', 1, 4],
      ['Pliers', 2, 6],
      ['Wrenches', 2, 8],
      ['Hammers', 3, 8],
      ['Hand Saws', 3, 10],
      ['Chisels', 2, 8],
      ['Tape Measures', 1, 4],
      ['Clamps', 3, 10],
      ['Toolboxes', 5, 20],
      ['Tool Sets', 8, 30],
    ]),
  },

  'pricing-linens-sheets-towels': {
    heading: 'Linens Sheets and Towels',
    rows: rows([
      ['Sheet Sets', 3, 15],
      ['Pillowcases', 1, 3],
      ['Bath Towels', 1, 5],
      ['Hand Towels', 0.5, 3],
      ['Washcloths', 0.25, 1],
      ['Tablecloths', 2, 8],
      ['Napkins', 0.25, 2],
      ['Bed Pillows', 2, 8],
      ['Towel Sets', 5, 18],
      ['Vintage Linens', 2, 10],
    ]),
  },

  'pricing-mea': {
    heading: 'Household Miscellaneous',
    rows: rows([
      ['Kitchen Smallwares', 1, 5],
      ['Home Decor', 1, 8],
      ['Small Appliances', 3, 12],
      ['Glassware', 1, 4],
      ['Linens', 1, 5],
      ['Toys', 1, 5],
      ['Books', 0.5, 2],
      ['Craft Supplies', 1, 5],
    ]),
  },

  'pricing-metal-frying-pots': {
    heading: 'Metal Frying Pots and Pans',
    rows: rows([
      ['Frying Pans', 2, 8],
      ['Metal Pots', 3, 10],
      ['Skillets', 3, 10],
      ['Stock Pots', 5, 18],
      ['Dutch Ovens', 6, 22],
      ['Baking Sheets', 1, 5],
      ['Roasting Pans', 3, 10],
      ['Pot Lids', 1, 3],
      ['Woks', 5, 15],
    ]),
  },

  'pricing-mugs-tea-cups': {
    heading: 'Mugs Tea Cups Plates and Glasses',
    rows: rows([
      ['Coffee Mugs', 0.5, 2],
      ['Tea Cups and Saucers', 1, 4],
      ['Dinner Plates', 1, 3],
      ['Salad Plates', 0.75, 2.5],
      ['Bowls', 1, 3],
      ['Drinking Glasses', 0.5, 2],
      ['Stemware', 1, 4],
      ['Serving Pieces', 2, 8],
      ['Cup and Saucer Sets', 3, 12],
      ['China Sets', 15, 70],
    ]),
  },

  'pricing-nailing-tools': {
    heading: 'Nailing Tools',
    rows: rows([
      ['Nail Guns', 20, 70],
      ['Framing Nailers', 25, 80],
      ['Finish Nailers', 15, 50],
      ['Staplers', 8, 30],
      ['Nails by the Box', 1, 5],
      ['Brad Nails', 1, 4],
      ['Air Compressors', 30, 120],
      ['Air Hoses', 5, 15],
      ['Fastener Assortments', 2, 8],
    ]),
  },

  'pricing-paints-stains': {
    heading: 'Paints and Stains',
    rows: rows([
      ['Paint Cans', 2, 8],
      ['Stain Cans', 3, 10],
      ['Spray Paint', 1, 3],
      ['Paint Brushes', 0.5, 4],
      ['Rollers and Trays', 1, 3],
      ['Drop Cloths', 1, 4],
      ['Sandpaper', 0.5, 2],
      ['Paint Sprayers', 10, 40],
      ['Caulk and Sealant', 1, 3],
    ]),
  },

  'pricing-partylite': {
    heading: 'Partylite',
    rows: rows([
      ['Partylite Candle Holders', 2, 10],
      ['Partylite Candles', 1, 5],
      ['Partylite Tart Warmers', 3, 12],
      ['Partylite Votive Sets', 2, 8],
      ['Partylite Centerpieces', 4, 15],
      ['Partylite Lanterns', 5, 18],
      ['Partylite Candle Rings', 2, 6],
    ]),
  },

  'pricing-perc-off': {
    heading: 'Percent Off',
    rows: textRows([
      ['Furniture', '30% OFF'],
      ['Clothing', '50% OFF'],
      ['Holiday Decor', '50% OFF'],
      ['Glassware', '30% OFF'],
      ['Books and Media', '50% OFF'],
      ['Tools', '20% OFF'],
      ['Everything Else', '25% OFF'],
    ]),
  },

  'pricing-planters': {
    heading: 'Planters',
    rows: rows([
      ['Ceramic Planters', 2, 10],
      ['Terracotta Pots', 1, 5],
      ['Large Planters', 8, 30],
      ['Hanging Baskets', 2, 8],
      ['Urns', 5, 20],
      ['Window Boxes', 3, 12],
      ['Pot Saucers', 0.5, 2],
      ['Planter Stands', 3, 12],
    ]),
  },

  'pricing-plants': {
    heading: 'Plants',
    rows: rows([
      ['House Plants', 3, 15],
      ['Succulents', 1, 5],
      ['Ferns', 3, 10],
      ['Orchids', 5, 20],
      ['Small Potted Plants', 2, 8],
      ['Artificial Plants', 2, 8],
      ['Plant Cuttings', 1, 3],
      ['Large Floor Plants', 10, 35],
    ]),
  },

  'pricing-plates': {
    heading: 'Plates',
    rows: rows([
      ['Dinner Plates', 1, 3],
      ['Salad Plates', 0.75, 2.5],
      ['Dessert Plates', 0.5, 2],
      ['Dinnerware Sets', 10, 45],
      ['China Sets', 15, 70],
      ['Collector Plates', 2, 10],
      ['Charger Plates', 1, 4],
      ['Serving Platters', 2, 8],
    ]),
  },

  'pricing-posters': {
    heading: 'Posters',
    rows: rows([
      ['Framed Posters', 3, 15],
      ['Unframed Posters', 1, 6],
      ['Movie Posters', 3, 25],
      ['Concert Posters', 5, 30],
      ['Vintage Posters', 10, 60],
      ['Art Prints', 2, 15],
      ['Advertising Signs', 5, 30],
    ]),
  },

  'pricing-power-saws': {
    heading: 'Power Saws',
    rows: rows([
      ['Circular Saws', 15, 50],
      ['Table Saws', 60, 250],
      ['Miter Saws', 40, 180],
      ['Reciprocating Saws', 15, 60],
      ['Jigsaws', 10, 35],
      ['Chainsaws', 25, 120],
      ['Tile Saws', 30, 120],
      ['Saw Blades', 2, 10],
    ]),
  },

  'pricing-q-fig': {
    heading: 'Q Fig Figures',
    rows: rows([
      ['Q Fig Figures', 5, 20],
      ['Q Fig Sets', 15, 40],
      ['Q Fig in Box', 8, 25],
      ['Q Fig Dioramas', 10, 35],
      ['Loose Q Fig Figures', 3, 12],
      ['Q Fig Display Bases', 2, 8],
    ]),
  },

  'pricing-records-albums': {
    heading: 'Records and Albums',
    rows: rows([
      ['Single LPs', 1, 5],
      ['Album Box Sets', 5, 25],
      ['Classic Rock Records', 2, 8],
      ['Jazz Records', 2, 10],
      ['Country Records', 1, 6],
      ['45s', 0.5, 3],
      ['Sealed Records', 3, 15],
      ['Record Crates', 5, 20],
    ]),
  },

  'pricing-small-power-tools-batteries': {
    heading: 'Small Power Tools and Batteries',
    rows: rows([
      ['Cordless Drills', 15, 60],
      ['Batteries', 5, 20],
      ['Chargers', 5, 15],
      ['Combo Kits', 30, 120],
      ['Impact Drivers', 20, 70],
      ['Oscillating Tools', 10, 35],
      ['Flashlights', 2, 10],
      ['New Battery Packs', 10, 30],
    ]),
  },

  'pricing-small-power-tools-corded': {
    heading: 'Small Power Tools Corded',
    rows: rows([
      ['Corded Drills', 8, 30],
      ['Sanders', 8, 25],
      ['Grinders', 10, 35],
      ['Rotary Tools', 8, 25],
      ['Heat Guns', 8, 25],
      ['Corded Screwdrivers', 5, 15],
      ['Extension Cords', 2, 8],
      ['Corded Combo Deals', 15, 45],
    ]),
  },

  'pricing-small-tools': {
    heading: 'Small Tools',
    rows: rows([
      ['Screwdriver Sets', 2, 8],
      ['Pliers and Cutters', 2, 6],
      ['Wrenches and Sockets', 3, 12],
      ['Utility Knives', 1, 3],
      ['Levels', 2, 8],
      ['Tape Measures', 1, 4],
      ['Allen Wrench Sets', 1, 3],
      ['Small Hand Tool Lots', 3, 10],
    ]),
  },

  'pricing-toys-games': {
    heading: 'Toys and Games',
    rows: rows([
      ['Board Games', 1, 5],
      ['Puzzles', 1, 4],
      ['Action Figures', 1, 6],
      ['Dolls', 2, 10],
      ['Building Sets', 3, 20],
      ['Toy Cars', 0.5, 3],
      ['Stuffed Animals', 0.5, 3],
      ['Electronic Toys', 2, 10],
      ['Toy Lots', 3, 12],
    ]),
  },

  'pricing-tupperware-plastic': {
    heading: 'Tupperware and Plastic Storage',
    rows: rows([
      ['Tupperware Containers', 0.5, 3],
      ['Tupperware Sets', 3, 12],
      ['Storage Containers', 0.5, 2],
      ['Mixing Bowls', 1, 4],
      ['Vintage Tupperware', 2, 10],
      ['Lids and Inserts', 0.25, 1],
      ['Serving Pieces', 1, 5],
      ['Lunch Kits', 2, 6],
    ]),
  },

  'pricing-vtg-designer-glass': {
    heading: 'Vintage and Designer Glass',
    rows: rows([
      ['Vintage Glassware', 2, 12],
      ['Designer Glass Pieces', 5, 25],
      ['Crystal Stemware', 2, 10],
      ['Pressed Glass', 2, 10],
      ['Mid Century Glass', 5, 20],
      ['Art Glass', 8, 40],
      ['Glass Vases', 2, 12],
      ['Signed Glass Pieces', 10, 50],
    ]),
  },

  'pricing-weights-fitness': {
    heading: 'Weights and Fitness',
    rows: rows([
      ['Dumbbells per lb', 1, 3],
      ['Weight Plates per lb', 1, 2],
      ['Barbells', 20, 60],
      ['Kettlebells per lb', 1, 3],
      ['Weight Benches', 15, 50],
      ['Resistance Bands', 2, 8],
      ['Yoga Mats', 2, 8],
      ['Exercise Bikes', 20, 80],
      ['Treadmills', 30, 120],
    ]),
  },

  'pricing-wire': {
    heading: 'Wire',
    rows: rows([
      ['Wire Baskets', 1, 5],
      ['Wire Shelving', 5, 20],
      ['Wire Racks', 3, 12],
      ['Craft Wire', 1, 4],
      ['Wire Hangers', 0.25, 1],
      ['Garden Wire', 1, 3],
      ['Wire Bins', 2, 6],
    ]),
  },
};