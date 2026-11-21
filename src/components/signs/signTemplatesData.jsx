// Master list of every sign template in the operator's sign library.
//
// Text rules for this library:
//  • No hyphens or dashes in any title or body text (they are also normalised at
//    render time, so a stray dash can never print).
//  • `signText` is what actually prints when it differs from the library label.
//  • `arrow` draws a real SVG arrow instead of the "→" character.
//  • `layout: 'fourup'` prints the full one page sign four times on one sheet
//    (2 × 2 with cut lines) so the operator can cut out four signs.
//  • `layout: 'price-pages'` prints a multi page category price guide.
import { CATEGORY_PRICE_GUIDES } from './categoryPriceGuides';

export const SIGN_CATEGORIES = [
  { id: 'general', name: 'General Signs', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'pricing', name: 'Pricing Signs', color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'payment', name: 'Payment Signs', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'directional', name: 'Directional Signs', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'room', name: 'Room / Area Signs', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'dot-pricing', name: 'DOT Pricing Signs', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'template', name: 'Templates', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'prep-sorting', name: 'Prep Sorting Signs', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export const SIGN_TEMPLATES = [
  // ── General Signs ──
  { id: 'garage-arrow', name: 'Garage with Arrow', category: 'general', signText: 'GARAGE', arrow: 'right', content: '' },
  { id: 'deck-furn-grill', name: 'Deck Furniture and Grill', category: 'general', content: '' },
  { id: 'do-not-enter-sm-4up', name: 'Do Not Enter Small 4 Up', category: 'general', layout: 'fourup', signText: 'DO NOT ENTER', content: '' },
  { id: 'do-not-enter', name: 'Do Not Enter', category: 'general', content: 'NOT PART OF THE SALE' },
  { id: 'upstairs', name: 'Upstairs', category: 'directional', content: '' },
  { id: 'downstairs', name: 'Downstairs', category: 'directional', content: '' },
  { id: 'basement', name: 'Basement', category: 'directional', content: '' },
  { id: 'facebook-instagram', name: 'Facebook and Instagram', category: 'general', content: '' },
  { id: 'facebook', name: 'Facebook', category: 'general', content: '' },
  { id: 'gate-opens-10am', name: 'Gate Opens at 10 am', category: 'general', content: 'GATE OPENS AT 10 AM' },
  { id: 'join-email-text', name: 'Join Email or Text', category: 'general', content: '' },
  { id: 'no-large-bags', name: 'No Large Bags', category: 'general', content: '' },
  { id: 'no-parking-here', name: 'No Parking Here', category: 'general', content: '' },
  { id: 'no-public-restroom', name: 'No Public Restroom', category: 'general', content: '' },
  { id: 'no-refunds', name: 'No Refunds', category: 'general', content: 'ALL SALES FINAL. NO REFUNDS OR RETURNS.' },
  { id: 'not-for-sale-sm-4up', name: 'Not for Sale Small 4 Up', category: 'general', layout: 'fourup', signText: 'NOT FOR SALE', content: '' },
  { id: 'not-for-sale', name: 'Not For Sale', category: 'general', content: 'PLEASE DO NOT ASK' },
  { id: 'open-cabinet', name: 'Open Cabinet', category: 'general', content: '' },
  { id: 'over-10-50-perc-off', name: '10 to 50% Off', category: 'general', content: '' },
  { id: 'remove-shoes', name: 'Remove Shoes', category: 'general', content: '' },
  { id: 'sale-in-barn', name: 'Sale in Barn', category: 'general', content: '' },
  { id: 'sale-starts-10am', name: 'Sale Starts 10 am', category: 'general', content: 'SALE STARTS AT 10 AM' },
  { id: 'sign-in-sheet', name: 'Sign in Sheet', category: 'general', content: '' },
  { id: 'single-brand-group', name: 'Single Brand Group Product', category: 'general', content: '' },
  { id: 'starting-time', name: 'Starting Time', category: 'general', content: 'SALE HOURS: CHECK ENTRANCE SIGN' },
  { id: 'vera', name: 'Vera', category: 'general', content: '' },
  { id: 'video-cameras', name: 'Video Cameras', category: 'general', content: '' },
  { id: 'view-bid-item', name: 'View or Bid on this Item', category: 'general', content: '' },
  { id: 'washer-dryer', name: 'Washer Dryer', category: 'general', content: '' },
  { id: 'were-here-walk-in', name: "We're Here Walk In", category: 'general', content: '' },
  { id: 'sold', name: 'SOLD', category: 'general', content: '' },
  { id: 'sold-awaiting-pickup', name: 'Sold Awaiting Pickup', category: 'general', content: 'DO NOT REMOVE' },
  { id: 'item-sold-do-not-remove', name: 'Item Sold Do Not Remove', category: 'general', content: '' },
  { id: 'pickup-instructions', name: 'Pickup Instructions', category: 'general', content: 'LARGE PURCHASES: SEE STAFF AT CHECKOUT TO ARRANGE PICKUP' },
  { id: 'pickup-area', name: 'Pickup Area', category: 'directional', content: '' },
  { id: 'checkout', name: 'Checkout', category: 'payment', content: 'PAY HERE' },
  { id: 'please-see-cashier', name: 'Please See Cashier', category: 'payment', content: '' },

  // ── Directional Signs ──
  { id: 'enter-here', name: 'Enter Here', category: 'directional', content: '' },
  { id: 'exit-here', name: 'Exit Here', category: 'directional', content: 'LARGE PURCHASES LEAVE THIS WAY' },
  { id: 'parking', name: 'Parking', category: 'directional', content: '' },

  // ── Room / Area Signs ──
  { id: 'master-bedroom', name: 'Master Bedroom', category: 'room', content: '' },
  { id: 'master-furniture', name: 'Master Furniture', category: 'room', content: '' },

  // ── Payment Signs ──
  { id: 'payment-cash-credit-zelle-venmo', name: 'Cash Credit Zelle Venmo', category: 'payment', content: 'WE ACCEPT: CASH · CREDIT CARD · ZELLE · VENMO' },
  { id: 'payment-cash-only', name: 'Cash Only', category: 'payment', content: 'CASH ONLY' },
  { id: 'payment-cash-zelle-venmo', name: 'Cash Zelle Venmo', category: 'payment', content: 'WE ACCEPT: CASH · ZELLE · VENMO' },
  { id: 'payment-venmo-qr', name: 'Venmo QR Code', category: 'payment', content: '' },
  { id: 'payment-zelle-qr', name: 'Zelle QR Code', category: 'payment', content: '' },

  // ── DOT Pricing Signs ──
  { id: 'dot-pricing-day1-alt', name: 'DOT Pricing Day 1 Alt', category: 'dot-pricing', content: '' },
  { id: 'dot-pricing-day1', name: 'DOT Pricing Day 1', category: 'dot-pricing', content: '' },
  { id: 'dot-pricing-day2', name: 'DOT Pricing Day 2', category: 'dot-pricing', content: '' },
  { id: 'pricing-dots', name: 'Pricing Dots', category: 'dot-pricing', content: '' },

  // ── Pricing Signs ──
  // 4 up sheets: the full sign, printed four times on one sheet to cut apart.
  { id: 'pricing-sm-4up', name: 'Pricing Small 4 Up 1', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },
  { id: 'pricing-sm-4up-2', name: 'Pricing Small 4 Up 2', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },
  { id: 'pricing-sm-4up-3', name: 'Pricing Small 4 Up 3', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },
  { id: 'pricing-sm-4up-4', name: 'Pricing Small 4 Up 4', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },
  { id: 'pricing-sm-4up-5', name: 'Pricing Small 4 Up 5', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },
  { id: 'pricing-sm-4up-6', name: 'Pricing Small 4 Up 6', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },
  { id: 'pricing-sm-4up-7', name: 'Pricing Small 4 Up 7', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },
  { id: 'pricing-sm-4up-8', name: 'Pricing Small 4 Up 8', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },
  { id: 'pricing-sm-4up-9', name: 'Pricing Small 4 Up 9', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },
  { id: 'pricing-4up', name: 'Pricing 4 Up', category: 'pricing', layout: 'fourup', signText: 'PRICE', priceLine: true, content: '' },

  // Category price guides — multi page, one letter page per category page.
  { id: 'clothing-cherry-tree', name: 'Clothing', category: 'pricing', layout: 'price-pages', ...CATEGORY_PRICE_GUIDES.clothing },
  { id: 'pricing-kitchen', name: 'Kitchen', category: 'pricing', layout: 'price-pages', ...CATEGORY_PRICE_GUIDES.kitchen },
  { id: 'pricing-tools', name: 'Tools', category: 'pricing', layout: 'price-pages', ...CATEGORY_PRICE_GUIDES.tools },
  { id: 'video-games-cherry-tree', name: 'Video Games', category: 'pricing', layout: 'price-pages', ...CATEGORY_PRICE_GUIDES.videoGames },
  { id: 'pricing-dvd-movie-cd', name: 'CDs and DVDs', category: 'pricing', layout: 'price-pages', ...CATEGORY_PRICE_GUIDES.cdsDvds },

  { id: 'pricing-angels', name: 'Angels', category: 'pricing', content: '' },
  { id: 'pricing-bedroom-set', name: 'Bedroom Set', category: 'pricing', content: '' },
  { id: 'pricing-books', name: 'Books', category: 'pricing', content: '' },
  { id: 'pricing-christmas-decor-2', name: 'Christmas Decor 2', category: 'pricing', content: '' },
  { id: 'pricing-christmas-decor', name: 'Christmas Decor', category: 'pricing', content: '' },
  { id: 'pricing-cleaners-detergents', name: 'Cleaners Detergents', category: 'pricing', content: '' },
  { id: 'pricing-clothing-womens-2', name: 'Clothing Womens 2', category: 'pricing', content: '' },
  { id: 'pricing-clothing-womens', name: 'Clothing Womens', category: 'pricing', content: '' },
  { id: 'pricing-dining-set', name: 'Dining Set', category: 'pricing', content: '' },
  { id: 'pricing-duvets-quilts', name: 'Duvets and Quilts', category: 'pricing', content: '' },
  { id: 'pricing-flowers-decor', name: 'Flowers Decor', category: 'pricing', content: '' },
  { id: 'pricing-funko-pop', name: 'Funko Pop', category: 'pricing', content: '' },
  { id: 'pricing-girl-scout-tins', name: 'Girl Scout Tins', category: 'pricing', content: '' },
  { id: 'pricing-glass-cookware', name: 'Glass Cookware', category: 'pricing', content: '' },
  { id: 'pricing-hand-tools', name: 'Hand Tools', category: 'pricing', content: '' },
  { id: 'pricing-linens-sheets-towels', name: 'Linens Sheets Towels', category: 'pricing', content: '' },
  { id: 'pricing-mea', name: 'Mea', category: 'pricing', content: '' },
  { id: 'pricing-metal-frying-pots', name: 'Metal Frying Pots and Other', category: 'pricing', content: '' },
  { id: 'pricing-mugs-tea-cups', name: 'Mugs Tea Cups Plates Glasses', category: 'pricing', content: '' },
  { id: 'pricing-nailing-tools', name: 'Nailing Tools', category: 'pricing', content: '' },
  { id: 'pricing-paints-stains', name: 'Paints and Stains', category: 'pricing', content: '' },
  { id: 'pricing-partylite', name: 'Partylite', category: 'pricing', content: '' },
  { id: 'pricing-perc-off', name: 'Perc Off', category: 'pricing', content: '' },
  { id: 'pricing-planters', name: 'Planters', category: 'pricing', content: '' },
  { id: 'pricing-plants', name: 'Plants', category: 'pricing', content: '' },
  { id: 'pricing-plates', name: 'Plates', category: 'pricing', content: '' },
  { id: 'pricing-posters', name: 'Posters', category: 'pricing', content: '' },
  { id: 'pricing-power-saws', name: 'Power Saws', category: 'pricing', content: '' },
  { id: 'pricing-q-fig', name: 'Q Fig', category: 'pricing', content: '' },
  { id: 'pricing-records-albums', name: 'Records Albums', category: 'pricing', content: '' },
  { id: 'pricing-small-power-tools-batteries', name: 'Small Power Tools Batteries', category: 'pricing', content: '' },
  { id: 'pricing-small-power-tools-corded', name: 'Small Power Tools Corded', category: 'pricing', content: '' },
  { id: 'pricing-small-tools', name: 'Small Tools', category: 'pricing', content: '' },
  { id: 'pricing-toys-games', name: 'Toys Games', category: 'pricing', content: '' },
  { id: 'pricing-tupperware-plastic', name: 'Tupperware Plastic Storage', category: 'pricing', content: '' },
  { id: 'pricing-vtg-designer-glass', name: 'Vtg Designer Glass Cookware', category: 'pricing', content: '' },
  { id: 'pricing-weights-fitness', name: 'Weights Fitness', category: 'pricing', content: '' },
  { id: 'pricing-wire', name: 'Wire', category: 'pricing', content: '' },

  // ── Templates ──
  { id: 'template-fb-ads', name: 'Sample FB Ads', category: 'template', content: '' },
  { id: 'template-fb-marketplace', name: 'Sample FB Marketplace', category: 'template', content: '' },
  { id: 'template-sample-letter', name: 'Sample Letter', category: 'template', content: '' },

  // ── Prep Sorting Signs (Chapter 14 P1-33) — physical wording matches the
  // canonical digital routing states exactly; no sign exists without a
  // digital destination. ──
  { id: 'sorting-sell', name: 'SELL — Ready for Sale', category: 'prep-sorting', content: 'Sorted for sale. Ready for inventory and pricing.' },
  { id: 'sorting-research', name: 'RESEARCH BEFORE PRICING', category: 'prep-sorting', content: 'Do not price or publish until research is resolved. Research needed is not low value.' },
  { id: 'sorting-client-decision', name: 'CLIENT DECISION', category: 'prep-sorting', content: 'Awaiting the client decision-maker. Do not sell, discard, or donate.' },
  { id: 'sorting-family-keep', name: 'FAMILY KEEP — NOT FOR SALE', category: 'prep-sorting', content: 'The client/family retains this. Not for sale. Do not remove.' },
  { id: 'sorting-specialist', name: 'SPECIALIST REVIEW', category: 'prep-sorting', content: 'Professional review required before any sale decision. Nothing is auto-sent.' },
  { id: 'sorting-sensitive', name: 'SENSITIVE MATERIAL — PRIVATE', category: 'prep-sorting', content: 'Private personal material. Never photographed for marketing, displayed, or sold.' },
  { id: 'sorting-donation', name: 'DONATION', category: 'prep-sorting', content: 'Routed for donation through the donation workflow.' },
  { id: 'sorting-restricted', name: 'RESTRICTED — HOLD — DO NOT PROCESS', category: 'prep-sorting', content: 'Ordinary sale processing STOPPED pending review. Never a legality or safety conclusion — the operator or an appropriate professional decides.' },
];