// The guided usage tour shown to operators (and launched any time from the dashboard).
// Each step points at a real page in the app and the work that matters there.

export const TOUR_STEPS = [
  {
    id: 'profile',
    title: '1. Complete your operator profile',
    summary:
      'Your company name, area and branding are what customers and real estate agents see — and creating a sale stays locked until your profile is complete.',
    checklist: [
      'Business tab: company name, phone, email and website',
      'Account tab: your service area (city + state is enough — no street address needed)',
      'Add a logo or business photo so customers recognize you',
    ],
    pageName: 'My Profile',
    href: '/MyProfile',
    askExample: 'What exactly do I need to fill in on my profile first?',
  },
  {
    id: 'first_sale',
    title: '2. Create your first estate sale',
    summary:
      'Start a sale as a draft from My Sales, then work through the Sale Editor at your own pace — nothing goes public until you publish.',
    checklist: [
      'My Sales → New Estate Sale',
      'Sale dates, property address and sale type',
      'Set your commission and estimated value so your money panels make sense',
    ],
    pageName: 'My Sales',
    href: '/MySales',
    askExample: 'How do I create my first sale?',
  },
  {
    id: 'photos',
    title: '3. Add photos and let AI write your listings',
    summary:
      'Upload your merchandise photos and AI names, describes and suggests a price for each item. You always make the final call on names and prices.',
    checklist: [
      'Open the sale → Photos tab and upload your images',
      'Run AI analysis, then review each item and correct anything it got wrong',
      'Mark anything you are keeping as excluded so it never shows publicly',
    ],
    pageName: 'My Sales',
    href: '/MySales',
    askExample: 'How does the AI photo description and pricing work?',
  },
  {
    id: 'publish',
    title: '4. Publish and market the sale',
    summary:
      'When your photos, dates and address are ready, publish from Sale Publication. The publish check tells you exactly what is still missing.',
    checklist: [
      'Sale Publication → resolve anything the checklist flags',
      'Marketing Kit: promo copy, signs and a shareable sale page',
      'Tell your followers and share the sale link',
    ],
    pageName: 'Marketing Kit',
    href: '/MarketingKit',
    askExample: 'What has to be done before I can publish a sale?',
  },
  {
    id: 'saleday',
    title: '5. Run sale day and close out',
    summary:
      'Sale day runs from My Sale Day, Live Sale and the Checkout Station. Afterwards, close out so your settlement statement and recap are accurate.',
    checklist: [
      'My Sale Day: assign tasks and see what needs you today',
      'Live Sale / Checkout Station: check items out and take payment',
      'Sale Closeout: settlement statement, expenses and the sale recap',
    ],
    pageName: 'My Sale Day',
    href: '/MySaleDay',
    askExample: 'Walk me through what to do on sale day.',
  },
];

export default TOUR_STEPS;