export const ONBOARDING_QUESTIONS = [
  {
    id: 'business_years',
    question: 'How long have you been running estate sales?',
    type: 'single',
    options: ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years']
  },
  {
    id: 'sales_per_year',
    question: 'How many estate sales do you run per year?',
    type: 'single',
    options: ['1–5 sales', '6–12 sales', '13–24 sales', '25–50 sales', '50+ sales']
  },
  {
    id: 'team_size',
    question: 'How large is your team?',
    type: 'single',
    options: ['Just me', '2–3 people', '4–10 people', '11–25 people', '25+ people']
  },
  {
    id: 'avg_sale_value',
    question: 'What is your typical average estate sale gross revenue?',
    type: 'single',
    options: ['Under $5,000', '$5,000–$15,000', '$15,000–$30,000', '$30,000–$75,000', '$75,000+']
  },
  {
    id: 'biggest_challenge',
    question: 'What is your biggest business challenge right now?',
    type: 'single',
    options: [
      'Finding new clients / leads',
      'Marketing my sales to buyers',
      'Managing inventory and pricing',
      'Tracking income and expenses',
      'Managing my team',
      'Growing revenue per sale',
      'Day-of-sale operations'
    ]
  },
  {
    id: 'lead_sources',
    question: 'How do clients currently find you? (Select all that apply)',
    type: 'multi',
    options: [
      'Word of mouth / referrals',
      'Google search',
      'Facebook / social media',
      'EstateSales.net or similar',
      'Real estate agents',
      'Attorney / probate referrals',
      'Repeat clients',
      'Cold outreach',
      'I struggle to get leads'
    ]
  },
  {
    id: 'marketing_channels',
    question: 'How do you currently market your estate sales? (Select all that apply)',
    type: 'multi',
    options: [
      'Facebook posts',
      'Facebook ads (paid)',
      'Instagram',
      'Email newsletter',
      'Yard signs / physical signage',
      'EstateSales.net listing',
      'Nextdoor',
      'Craigslist',
      'Press releases / local news',
      'I do very little marketing'
    ]
  },
  {
    id: 'marketing_time',
    question: 'How much time do you spend on marketing per sale?',
    type: 'single',
    options: [
      'Less than 1 hour',
      '1–3 hours',
      '3–8 hours',
      '8–20 hours',
      'More than 20 hours'
    ]
  },
  {
    id: 'buyer_list',
    question: 'Do you have a buyer email list or following?',
    type: 'single',
    options: [
      'No, I\'m starting from scratch',
      'Yes, under 500 contacts',
      'Yes, 500–2,000 contacts',
      'Yes, 2,000–5,000 contacts',
      'Yes, over 5,000 contacts'
    ]
  },
  {
    id: 'pricing_method',
    question: 'How do you currently price items at sales?',
    type: 'multi',
    options: [
      'Experience / gut feel',
      'eBay / sold comps research',
      'Hire an appraiser',
      'Google search',
      'AI tools',
      'Clients set their own prices',
      'I struggle with pricing'
    ]
  },
  {
    id: 'inventory_tracking',
    question: 'How do you track items at your sales?',
    type: 'single',
    options: [
      'Paper tags / handwritten lists',
      'Spreadsheets (Excel/Google Sheets)',
      'Basic POS system',
      'Estate sale software',
      'I don\'t really track items'
    ]
  },
  {
    id: 'checkout_process',
    question: 'How do you handle checkout on sale days?',
    type: 'single',
    options: [
      'Cash box only',
      'Cash + Venmo/PayPal',
      'Square or Stripe card reader',
      'Full POS terminal',
      'It\'s chaotic / I need help here'
    ]
  },
  {
    id: 'income_tracking',
    question: 'How do you track your business income?',
    type: 'single',
    options: [
      'I don\'t track it formally',
      'Personal bank account / rough memory',
      'Spreadsheet',
      'QuickBooks or accounting software',
      'My accountant handles it'
    ]
  },
  {
    id: 'expense_tracking',
    question: 'How do you track business expenses?',
    type: 'single',
    options: [
      'I don\'t track expenses',
      'Keep receipts in a box',
      'Spreadsheet',
      'QuickBooks or expense software',
      'My accountant handles it'
    ]
  },
  {
    id: 'client_payout',
    question: 'How do you handle client settlements / payouts after a sale?',
    type: 'single',
    options: [
      'Handshake / informal',
      'Simple handwritten summary',
      'Email with a breakdown',
      'Formal printed statement',
      'I need a better system for this'
    ]
  },
  {
    id: 'growth_goals',
    question: 'What are your top growth goals for the next 12 months? (Select up to 3)',
    type: 'multi',
    max_select: 3,
    options: [
      'Run more sales (volume growth)',
      'Increase revenue per sale',
      'Build a larger buyer audience',
      'Get more client referrals',
      'Hire and grow my team',
      'Reduce time spent on admin',
      'Get better at marketing',
      'Improve profitability / reduce costs',
      'Add new revenue streams'
    ]
  },
  {
    id: 'vendor_needs',
    question: 'Do you regularly need to refer or hire vendors for your clients? (e.g., movers, cleanout crews, attorneys)',
    type: 'single',
    options: [
      'No, I handle everything in-house',
      'Occasionally, I have a few go-to contacts',
      'Yes, regularly — I need a reliable network',
      'Yes, and I want to earn referral commissions'
    ]
  },
  {
    id: 'tech_comfort',
    question: 'How comfortable are you with using software to run your business?',
    type: 'single',
    options: [
      'Not very — I prefer simple and minimal',
      'Somewhat — I use basic tools',
      'Comfortable — I pick up new software easily',
      'Very comfortable — I love technology'
    ]
  }
];