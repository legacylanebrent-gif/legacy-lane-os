// Suggested price ranges for the multi page category signs.
// DOCTRINE: a printed range is a starting guide, never a price. Final pricing is
// always set by the operator on the item record; printing changes nothing.

const rows = (list) => list.map(([label, price]) => ({ label, price }));

export const CATEGORY_PRICE_GUIDES = {
  clothing: {
    pages: [
      {
        heading: 'Everyday Clothing',
        rows: rows([
          ['Tops and Blouses', '$2 – $6'],
          ['T Shirts and Casual', '$1 – $4'],
          ['Sweaters and Knits', '$3 – $10'],
          ['Jeans and Denim', '$4 – $12'],
          ['Pants and Shorts', '$3 – $8'],
          ['Dresses', '$4 – $15'],
          ['Skirts', '$3 – $8'],
          ['Activewear', '$2 – $6'],
          ['Sleepwear and Robes', '$2 – $5'],
          ['Swimwear', '$2 – $5'],
        ]),
      },
      {
        heading: 'Outerwear and Suits',
        rows: rows([
          ['Coats and Jackets', '$5 – $20'],
          ['Leather and Suede', '$15 – $60'],
          ['Winter Coats', '$10 – $35'],
          ['Suits and Blazers', '$8 – $25'],
          ['Formal Gowns', '$10 – $40'],
          ['Wedding Dresses', '$25 – $100'],
          ['Furs', '$25 – $150'],
          ['Vests', '$4 – $12'],
          ['Rainwear', '$4 – $12'],
          ['Uniforms and Workwear', '$3 – $10'],
        ]),
      },
      {
        heading: 'Shoes and Accessories',
        rows: rows([
          ['Shoes and Sneakers', '$3 – $15'],
          ['Boots', '$5 – $20'],
          ['Designer Handbags', '$10 – $60'],
          ['Purses and Totes', '$3 – $12'],
          ['Belts', '$2 – $8'],
          ['Scarves and Gloves', '$2 – $6'],
          ['Hats and Caps', '$2 – $6'],
          ['Costume Jewelry', '$1 – $5'],
          ['Fine Jewelry', 'Price separately'],
          ['Sunglasses', '$2 – $8'],
          ['Ties', '$1 – $4'],
        ]),
      },
    ],
  },

  kitchen: {
    pages: [
      {
        heading: 'Cookware and Bakeware',
        rows: rows([
          ['Pots and Pans', '$3 – $12'],
          ['Cast Iron', '$8 – $30'],
          ['Stainless Cookware', '$5 – $20'],
          ['Baking Pans', '$2 – $6'],
          ['Cake and Muffin Pans', '$2 – $5'],
          ['Mixing Bowls', '$2 – $6'],
          ['Dutch Ovens', '$6 – $25'],
          ['Griddles and Skillets', '$4 – $15'],
          ['Pressure Cookers', '$8 – $25'],
          ['Woks', '$5 – $15'],
        ]),
      },
      {
        heading: 'Tableware and Glassware',
        rows: rows([
          ['Dinner Plates', '$1 – $3 each'],
          ['Bowls', '$1 – $3 each'],
          ['Mugs and Cups', '$0.50 – $2'],
          ['Drinking Glasses', '$0.50 – $2'],
          ['Stemware', '$1 – $4'],
          ['Serving Platters', '$2 – $8'],
          ['Silverware Sets', '$5 – $25'],
          ['Loose Flatware', '$0.25 – $1 each'],
          ['China Sets', '$15 – $80'],
          ['Crystal', '$2 – $10'],
        ]),
      },
      {
        heading: 'Small Appliances and Utensils',
        rows: rows([
          ['Small Appliances', '$3 – $15'],
          ['Stand Mixers', '$20 – $75'],
          ['Coffee Makers', '$5 – $20'],
          ['Blenders', '$4 – $15'],
          ['Toasters', '$3 – $10'],
          ['Utensils', '$0.50 – $2'],
          ['Knives', '$2 – $10'],
          ['Cutting Boards', '$2 – $8'],
          ['Storage Containers', '$0.50 – $3'],
          ['Cookbooks', '$1 – $4'],
        ]),
      },
    ],
  },

  tools: {
    pages: [
      {
        heading: 'Hand Tools',
        rows: rows([
          ['Screwdrivers', '$1 – $4'],
          ['Pliers and Wrenches', '$2 – $8'],
          ['Hammers', '$3 – $10'],
          ['Hand Saws', '$3 – $12'],
          ['Measuring Tools', '$2 – $6'],
          ['Chisels', '$2 – $8'],
          ['Files and Rasps', '$1 – $5'],
          ['Clamps', '$3 – $10'],
          ['Toolboxes', '$5 – $25'],
          ['Tool Sets', '$8 – $35'],
        ]),
      },
      {
        heading: 'Power Tools',
        rows: rows([
          ['Drills', '$10 – $40'],
          ['Circular Saws', '$15 – $50'],
          ['Sanders', '$10 – $30'],
          ['Grinders', '$10 – $35'],
          ['Nail Guns', '$15 – $60'],
          ['Batteries and Chargers', '$5 – $20'],
          ['Bench Tools', '$15 – $60'],
          ['Shop Vacs', '$10 – $30'],
          ['Ladders', '$10 – $40'],
          ['Generators', '$50 – $200'],
        ]),
      },
      {
        heading: 'Yard, Garden and Hardware',
        rows: rows([
          ['Lawn Mowers', '$20 – $80'],
          ['Trimmers and Edgers', '$10 – $40'],
          ['Shovels and Rakes', '$2 – $8'],
          ['Garden Hoses', '$3 – $10'],
          ['Planters and Pots', '$1 – $6'],
          ['Wheelbarrows', '$10 – $30'],
          ['Fasteners by the Box', '$1 – $5'],
          ['Lumber and Scrap Wood', '$1 – $5'],
          ['Paints and Stains', '$2 – $8'],
          ['Extension Cords', '$2 – $8'],
        ]),
      },
    ],
  },

  videoGames: {
    pages: [
      {
        heading: 'Games and Consoles',
        rows: rows([
          ['Game Consoles', '$20 – $120'],
          ['Controllers', '$5 – $25'],
          ['Current Gen Games', '$5 – $20'],
          ['Older Gen Games', '$2 – $10'],
          ['Retro Games', '$3 – $25'],
          ['Game Bundles', '$10 – $40'],
          ['Handheld Consoles', '$15 – $75'],
          ['Accessories', '$2 – $10'],
          ['Strategy Guides', '$1 – $4'],
          ['Empty Cases and Manuals', '$0.50 – $2'],
        ]),
      },
      {
        heading: 'PC, Gear and Memorabilia',
        rows: rows([
          ['PC Games', '$1 – $5'],
          ['Gaming Headsets', '$5 – $20'],
          ['Keyboards and Mice', '$3 – $15'],
          ['Gaming Chairs', '$15 – $50'],
          ['Figures and Statues', '$5 – $30'],
          ['Posters and Prints', '$1 – $5'],
          ['Untested Consoles', '$5 – $30'],
          ['Cords and Cables', '$1 – $4'],
          ['Carrying Cases', '$1 – $5'],
          ['Trading Cards', '$1 – $10'],
        ]),
      },
    ],
  },

  cdsDvds: {
    pages: [
      {
        heading: 'Music CDs',
        rows: rows([
          ['Single CDs', '$0.50 – $2'],
          ['CD Box Sets', '$3 – $12'],
          ['Sealed CDs', '$2 – $8'],
          ['Classic Rock', '$1 – $4'],
          ['Country', '$1 – $4'],
          ['Jazz and Blues', '$1 – $5'],
          ['Classical', '$1 – $4'],
          ['Rap and Hip Hop', '$1 – $5'],
          ['Pop', '$1 – $3'],
          ['Audiobooks on CD', '$1 – $4'],
        ]),
      },
      {
        heading: 'Movies and Media',
        rows: rows([
          ['DVDs', '$0.50 – $2'],
          ['Blu Rays', '$1 – $3'],
          ['DVD Box Sets', '$3 – $12'],
          ['Sealed DVDs and Blu Rays', '$2 – $8'],
          ['Kids and Family', '$0.50 – $2'],
          ['TV Series Sets', '$3 – $12'],
          ['VHS Tapes', '$0.25 – $1'],
          ['Records and LPs', '$1 – $5'],
          ['Cassette Tapes', '$0.25 – $1'],
          ['Disc Games', '$2 – $10'],
        ]),
      },
    ],
  },
};