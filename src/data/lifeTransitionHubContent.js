/**
 * Shared base content for life-transition guide state pages.
 * This content is the SAME across all states — it provides the comprehensive
 * educational backbone that gives every state page strong SEO depth.
 *
 * State-specific differentiators (small estate thresholds, court procedures,
 * homestead laws, etc.) are generated separately via the generateStateGuide
 * backend function and stored in the StateGuide entity.
 *
 * Each guide type returns:
 *   - overview: general intro paragraphs (array of strings)
 *   - sections: [{ heading, body (HTML), bullets? }]
 *   - generalFaqs: [{ q, a }]  (national-level, not state-specific)
 *   - keyTerms: [{ term, definition }]
 */

const PROBATE_SECTIONS = [
  {
    heading: 'What Is Probate?',
    body: `<p>Probate is the court-supervised process of validating a deceased person's will (if one exists), identifying and inventorying their assets, paying final debts and taxes, and distributing the remaining property to beneficiaries or heirs. When the estate includes real estate or significant personal property — furniture, collectibles, vehicles, household goods — the executor or personal representative must decide how to handle those assets as part of the settlement.</p>
    <p>Probate exists to ensure that debts are paid, transfers are legally valid, and the deceased's wishes (or state law, if there is no will) are followed. The process provides court oversight that protects beneficiaries, creditors, and the personal representative.</p>`,
  },
  {
    heading: 'When Is Probate Required?',
    body: `<p>Whether probate is required depends on how the deceased person's assets were titled and the total value of the probate estate. Assets that typically <strong>avoid probate</strong> include:</p>`,
    bullets: [
      'Assets held in a living trust',
      'Accounts with named beneficiaries (life insurance, retirement accounts, payable-on-death bank accounts)',
      'Property owned as joint tenants with rights of survivorship',
      'Assets held in a transfer-on-death (TOD) registration',
    ],
    bodyAfterBullets: `<p>Assets owned solely in the deceased's name — a house titled only to them, a bank account without a beneficiary, personal belongings — generally must go through probate. Most states offer a simplified "small estate" procedure for estates below a certain value threshold, which avoids formal probate. That threshold varies significantly by state.</p>`,
  },
  {
    heading: 'The Probate Process: Step by Step',
    body: `<p>While specific procedures vary by state, the general probate process follows these stages:</p>`,
    bullets: [
      '<strong>1. File the will and petition.</strong> The named executor (or an interested party if there is no will) files the will and a petition to open probate with the local probate court in the county where the deceased lived.',
      '<strong>2. Receive Letters Testamentary.</strong> The court issues official documents granting the executor authority to act on behalf of the estate.',
      '<strong>3. Notify creditors and beneficiaries.</strong> State law requires sending formal notice to known creditors and publishing a notice to unknown creditors. The notice period varies by state.',
      '<strong>4. Inventory and appraise assets.</strong> The executor identifies, secures, and values all probate assets, including real estate and personal property.',
      '<strong>5. Pay debts and taxes.</strong> Valid creditor claims are paid from estate funds. Final income taxes and any estate taxes are filed and paid.',
      '<strong>6. Manage and sell property.</strong> If the estate includes a home, the executor decides whether to sell it, transfer it to a beneficiary, or liquidate its contents through an estate sale.',
      '<strong>7. Distribute remaining assets.</strong> After debts and taxes are settled, the executor distributes the remaining assets to beneficiaries per the will or state intestacy law.',
      '<strong>8. Close the estate.</strong> The executor files a final accounting and petitions the court to close the estate.',
    ],
  },
  {
    heading: 'Formal vs. Informal Probate',
    body: `<p>Many states offer two probate tracks:</p>
    <p><strong>Informal probate</strong> is available when the will is uncontested, all heirs agree, and there are no complications. It requires less court supervision, fewer hearings, and is generally faster and less expensive. The personal representative can act with minimal court involvement after initial appointment.</p>
    <p><strong>Formal probate</strong> involves more court oversight — hearings, judicial approval of key decisions, and formal accountings. It is required when there are disputes among beneficiaries, questions about the will's validity, or other complications. Some estates begin as informal and convert to formal if issues arise.</p>
    <p>Whether your estate qualifies for informal probate depends on your state's statutes and the specific circumstances of the estate.</p>`,
  },
  {
    heading: 'Small Estate Procedures',
    body: `<p>Every state offers a simplified process for estates below a certain value. These are often called "small estate affidavits" or "summary administration." Instead of filing a full probate petition, the executor or heir submits a sworn affidavit to the court or to institutions holding the assets, and the property is released.</p>
    <p>The qualifying threshold, the waiting period before filing, and the types of assets that qualify all vary by state. In some states, small estate procedures can handle estates worth up to a specific dollar amount; in others, they apply only to personal property and exclude real estate.</p>
    <p>Check the state-specific section below for your state's small estate threshold and procedure.</p>`,
  },
  {
    heading: 'The Executor\'s Role and Responsibilities',
    body: `<p>The executor (also called a personal representative) is the person named in the will to administer the estate. If there is no will, the court appoints an administrator — typically the closest surviving relative.</p>
    <p>The executor's core duties include:</p>`,
    bullets: [
      'Locating and safeguarding all estate assets, including the home and its contents',
      'Obtaining a professional appraisal of significant assets if required',
      'Notifying creditors and paying valid debts',
      'Filing the deceased\'s final federal and state income tax returns',
      'Filing any required estate tax returns',
      'Maintaining insurance on real property until it is sold or transferred',
      'Making decisions about selling the home, holding an estate sale, or distributing personal property',
      'Preparing an accounting of all financial transactions for the court and beneficiaries',
      'Distributing assets to beneficiaries and obtaining receipts',
    ],
    bodyAfterBullets: `<p>Executors have a fiduciary duty to act in the best interests of the estate and its beneficiaries. This means acting prudently, transparently, and without self-dealing. An executor who fails in these duties can be held personally liable.</p>`,
  },
  {
    heading: 'Probate Timeline: How Long Does It Take?',
    body: `<p>Probate typically takes <strong>6 to 18 months</strong> for a straightforward estate. Complex estates with disputes, difficult-to-sell real estate, or significant creditor claims can take two years or longer.</p>
    <p>Factors that affect the timeline include:</p>`,
    bullets: [
      'The state-mandated creditor claim period (ranges from 3 to 12 months depending on the state)',
      'Whether the estate qualifies for informal or small estate procedures',
      'Whether real estate needs to be sold (marketing, offers, closing)',
      'Whether an estate sale is needed to liquidate personal property',
      'Disputes among beneficiaries or contested wills',
      'Tax filing deadlines (estate tax returns are due 9 months after death)',
    ],
  },
  {
    heading: 'Probate Costs and Fees',
    body: `<p>Probate costs typically include court filing fees, attorney fees, executor compensation, appraisal fees, and publication costs for creditor notices. These expenses are paid from the estate before distributions to beneficiaries.</p>
    <p>How professionals are compensated varies by state:</p>`,
    bullets: [
      '<strong>Statutory fees:</strong> Some states set executor and attorney fees as a percentage of the estate value, calculated by a statutory formula.',
      '<strong>Reasonable compensation:</strong> Other states require fees to be "reasonable" based on the work performed, subject to court approval.',
      '<strong>Hourly billing:</strong> Some attorneys bill hourly for probate work, which can be more cost-effective for simple estates.',
    ],
    bodyAfterBullets: `<p>Because fee structures differ significantly, executors should understand their state's approach before hiring an attorney or claiming compensation.</p>`,
  },
  {
    heading: 'What Happens to the House in Probate?',
    body: `<p>Real estate is often the most valuable asset in a probate estate. The executor has several options:</p>`,
    bullets: [
      '<strong>Sell the home:</strong> The executor can list and sell the property, with proceeds going to the estate. In some states, court approval is required before selling real estate; in others, the executor has independent authority.',
      '<strong>Transfer to a beneficiary:</strong> If the will directs the home to a specific beneficiary, or if all heirs agree, the property can be transferred without a sale.',
      '<strong>Estate sale of contents:</strong> Before selling or vacating the home, the executor may need to liquidate the personal property inside — furniture, collectibles, household goods. A professional estate sale company can handle this.',
      '<strong>Cleanout:</strong> After the estate sale, the home may need a full cleanout to prepare for sale or transfer.',
    ],
    bodyAfterBullets: `<p>Maintaining the property during probate is important — the executor must keep insurance current, address maintenance issues, and ensure the property is secure. Neglecting the property can reduce its value and create liability.</p>`,
  },
  {
    heading: 'Estate Sales During Probate',
    body: `<p>An estate sale is often the most practical way to liquidate the contents of a home during probate. A professional estate sale company will inventory, price, stage, and sell the items over a multi-day sale, typically taking a percentage of gross sales as commission.</p>
    <p>For executors, an estate sale serves multiple purposes: it converts personal property to cash for the estate, provides a documented valuation of items sold (useful for the estate inventory and tax filings), and clears the home for sale or transfer.</p>
    <p>Estate sale companies experienced with probate understand the documentation requirements, timelines, and coordination needed when working with executors, attorneys, and the court.</p>`,
  },
  {
    heading: 'Probate Without a Will (Intestacy)',
    body: `<p>When someone dies without a will, their estate is distributed according to state intestacy laws. These statutes define a priority order — typically surviving spouse, then children, then parents, then siblings, then more distant relatives.</p>
    <p>The court appoints an administrator (usually the closest qualifying relative) to handle the estate. The process is similar to probate with a will, but the distribution follows state law rather than the deceased's wishes.</p>
    <p>Intestacy laws vary by state, particularly in how they treat blended families, surviving spouses, and property from previous marriages.</p>`,
  },
];

const PROBATE_OVERVIEW = [
  'Probate is the legal process of settling a deceased person\'s estate — validating the will, inventorying assets, paying debts and taxes, and distributing property to beneficiaries. When the estate includes a home and personal belongings, the executor must also decide how to handle the real estate and its contents.',
  'This guide provides a comprehensive overview of the probate process, with state-specific information to help you understand how probate works where you live. While the general process is similar nationwide, important details — small estate thresholds, court procedures, fee structures, and timelines — vary by state.',
];

const PROBATE_GENERAL_FAQS = [
  { q: 'What\'s the difference between an executor and a personal representative?', a: 'An executor is named in the will to administer the estate. A personal representative is the broader term that includes both executors (named in a will) and administrators (appointed by the court when there is no will). Both serve the same core function.' },
  { q: 'Can I avoid probate entirely?', a: 'Many assets can be structured to avoid probate — living trusts, beneficiary designations, joint ownership, and transfer-on-death registrations. However, assets owned solely in the deceased\'s name typically require probate unless they fall under the state\'s small estate threshold.' },
  { q: 'Do I need an attorney for probate?', a: 'In some states, executors can handle simple estates without an attorney, especially small estates that qualify for simplified procedures. For formal probate, estates with real estate, or any estate with potential disputes, working with a probate attorney is strongly recommended.' },
  { q: 'What if the estate doesn\'t have enough money to pay debts?', a: 'Creditors are paid in a priority order set by state law. If the estate is insolvent, some creditors may not receive full payment. Beneficiaries generally are not personally responsible for the deceased\'s debts, though secured debts (like a mortgage) remain attached to the property.' },
  { q: 'Can the executor sell the house without all beneficiaries agreeing?', a: 'In many states, an executor has the authority to sell estate property without unanimous beneficiary consent, especially if the will grants broad powers or the sale is necessary to pay debts. However, some states require court approval for real estate sales. Confirm the requirements in your state.' },
  { q: 'How are estate sale proceeds handled in probate?', a: 'Proceeds from an estate sale become part of the probate estate. The estate sale company is paid its commission from gross sales, and the remaining funds are deposited into the estate account to pay debts and eventually be distributed to beneficiaries.' },
];

const PROBATE_KEY_TERMS = [
  { term: 'Executor', definition: 'The person named in a will to administer the estate.' },
  { term: 'Personal Representative', definition: 'The court-appointed person responsible for administering an estate, whether there is a will or not.' },
  { term: 'Letters Testamentary', definition: 'Court-issued documents granting the executor authority to act on behalf of the estate.' },
  { term: 'Intestacy', definition: 'Dying without a valid will; the estate is distributed according to state law.' },
  { term: 'Probate Estate', definition: 'All assets that must go through probate — excludes assets with beneficiary designations, trust assets, and jointly owned property.' },
  { term: 'Small Estate Affidavit', definition: 'A simplified procedure that allows heirs to collect assets without full probate, available when the estate value is below a state-set threshold.' },
  { term: 'Creditor Claim Period', definition: 'The time period during which creditors must file claims against the estate, set by state law.' },
  { term: 'Fiduciary Duty', definition: 'The legal obligation to act in the best interests of the estate and its beneficiaries, with prudence and transparency.' },
];

const INHERITED_PROPERTY_SECTIONS = [
  {
    heading: 'Inheriting a Property: First Steps',
    body: `<p>Inheriting a home or real estate brings both emotional and practical challenges. Whether you've inherited a house from a parent, grandparent, or other relative, understanding your options and obligations will help you make informed decisions during a difficult time.</p>
    <p>The first priority is securing the property — changing locks, maintaining insurance, and ensuring the home is safe. Then you'll need to determine how the property was titled, whether it needs to go through probate, and what your options are for keeping, selling, or renting it.</p>`,
  },
  {
    heading: 'How Title Affects What Happens Next',
    body: `<p>How the deceased held title to the property determines whether probate is needed and how the transfer occurs:</p>`,
    bullets: [
      '<strong>Sole ownership:</strong> The property typically goes through probate. The executor transfers it to the beneficiary named in the will (or per state intestacy law).',
      '<strong>Joint tenancy with rights of survivorship:</strong> The surviving owner automatically inherits the deceased\'s share. A death certificate and simple recording usually complete the transfer — no probate needed.',
      '<strong>Tenancy by the entirety:</strong> Available to married couples in some states. The surviving spouse automatically inherits.',
      '<strong>Living trust:</strong> If the property was transferred to a trust during the owner\'s lifetime, the successor trustee manages and transfers it according to the trust terms — no probate needed.',
      '<strong>Transfer-on-death (TOD) deed:</strong> Available in some states, this allows the owner to name a beneficiary who inherits the property directly upon death, bypassing probate.',
    ],
  },
  {
    heading: 'Your Options for an Inherited Property',
    body: `<p>Once you've determined that you\'re inheriting the property, you generally have four options:</p>`,
    bullets: [
      '<strong>Move in:</strong> You can take possession and make the home your primary residence. Consider property tax implications — some states reassess inherited property, significantly changing the tax basis.',
      '<strong>Sell the property:</strong> You can list and sell the home, splitting proceeds with co-heirs if applicable. This is the most common choice when multiple beneficiaries are involved or when no one wants to live in the home.',
      '<strong>Rent it out:</strong> You can become a landlord, generating rental income while retaining the property. This requires ongoing management and carries tenant-related responsibilities.',
      '<strong>Buy out co-heirs:</strong> If multiple people inherited the property, one heir can buy out the others\' shares to become the sole owner.',
    ],
  },
  {
    heading: 'Taxes on Inherited Property',
    body: `<p>Understanding the tax implications of inheriting a property is critical:</p>`,
    bullets: [
      '<strong>Stepped-up basis:</strong> When you inherit property, the tax basis is generally "stepped up" to the fair market value at the date of death. This means if you sell the property soon after inheriting, you may owe little or no capital gains tax.',
      '<strong>Estate tax:</strong> The federal estate tax exemption is high, so most estates owe no federal estate tax. Some states have their own estate or inheritance taxes with different thresholds.',
      '<strong>Property tax reassessment:</strong> Some states reassess property values on transfer, which can significantly increase property taxes. Other states offer exemptions or protections for inherited primary residences or transfers between family members.',
      '<strong>Capital gains tax:</strong> If you hold the property and it appreciates before you sell, you may owe capital gains tax on the appreciation since the date of death.',
    ],
    bodyAfterBullets: `<p>Tax rules vary significantly by state. Consult a tax professional or estate attorney to understand the specific implications for your situation.</p>`,
  },
  {
    heading: 'Dealing with the Contents of an Inherited Home',
    body: `<p>An inherited home often comes with decades of accumulated belongings — furniture, collectibles, paperwork, household goods, and sentimental items. Sorting through these contents is often the most time-consuming part of settling an estate.</p>
    <p>A practical approach:</p>`,
    bullets: [
      'Remove important documents, valuables, and sentimental items first',
      'Sort remaining items into categories: keep, sell, donate, discard',
      'Consider a professional estate sale for items with resale value',
      'Arrange for donations of unsold usable items',
      'Schedule a cleanout service for remaining items and debris',
    ],
    bodyAfterBullets: `<p>An estate sale company can handle the entire process — inventory, pricing, staging, sale execution, and cleanout — which is especially valuable when you live far from the inherited property or when the volume of contents is overwhelming.</p>`,
  },
  {
    heading: 'Inheriting Property with a Mortgage',
    body: `<p>If the inherited property has a mortgage, the loan does not automatically disappear. Under federal law (the Garn-St. Germain Act), heirs generally have the right to assume the mortgage and keep making payments, or to sell the property and pay off the loan from the proceeds.</p>
    <p>Key considerations:</p>`,
    bullets: [
      'Notify the lender of the owner\'s death as soon as possible',
      'Continue making mortgage payments to avoid default',
      'You can typically sell the property without paying off the mortgage first — the loan is paid from sale proceeds at closing',
      'If you want to keep the property and refinance, you\'ll need to qualify for a new loan in your name',
      'Reverse mortgages have different rules — the loan typically becomes due when the borrower dies',
    ],
  },
];

const INHERITED_PROPERTY_OVERVIEW = [
  'Inheriting a property — whether a family home, investment property, or land — comes with legal, financial, and emotional decisions. This guide walks you through the process of handling an inherited property, from securing it and understanding title issues to choosing whether to sell, keep, or rent it.',
  'While the federal framework for inherited property is consistent nationwide, important details — property tax reassessment rules, state estate and inheritance taxes, and probate requirements — vary by state. This guide covers the general process and highlights state-specific differences.',
];

const INHERITED_PROPERTY_FAQS = [
  { q: 'Do I pay taxes on an inherited house?', a: 'You generally do not pay income tax on the inheritance itself. However, you may face capital gains tax if you sell the property for more than its stepped-up basis (fair market value at date of death). Some states also have estate or inheritance taxes. Property taxes may be reassessed upon transfer.' },
  { q: 'Can I sell an inherited house without going through probate?', a: 'If the property was held in a trust, owned jointly, or had a transfer-on-death deed, you may be able to sell without probate. If the property was solely owned by the deceased, it typically must go through probate before it can be sold, unless your state\'s small estate procedure applies.' },
  { q: 'What is a "stepped-up basis" and why does it matter?', a: 'When you inherit property, your tax basis is generally reset to the property\'s fair market value at the date of death. This means if you sell shortly after inheriting, you likely owe little or no capital gains tax, even if the property appreciated significantly during the original owner\'s lifetime.' },
  { q: 'What if multiple siblings inherit a house?', a: 'Co-heirs must agree on what to do with the property. Options include selling and splitting proceeds, one sibling buying out the others, or renting it out jointly. If siblings disagree, any co-owner can file a "partition" lawsuit to force a sale, though this is a last resort.' },
  { q: 'Do I need to pay the mortgage on an inherited house?', a: 'Yes. The mortgage must continue to be paid to avoid default and foreclosure. Under federal law, you can typically assume the existing loan or sell the property and pay off the mortgage from the proceeds.' },
];

const DOWNSIZING_SECTIONS = [
  {
    heading: 'Understanding Senior Downsizing',
    body: `<p>Downsizing is the process of moving from a larger home to a smaller, more manageable living space. For seniors, this transition is often motivated by health changes, the desire for less maintenance, financial considerations, or the need for a single-story or accessible living environment.</p>
    <p>Downsizing is more than just moving — it involves sorting through decades of accumulated possessions, deciding what to keep, sell, donate, or discard, and coordinating the logistics of packing, moving, and settling into a new home. For families helping a parent downsize, the process can be emotionally and physically demanding.</p>`,
  },
  {
    heading: 'When Is the Right Time to Downsize?',
    body: `<p>Common signs that it may be time to downsize include:</p>`,
    bullets: [
      'The current home has become difficult or unsafe to maintain',
      'Stairs or layout are no longer manageable due to mobility changes',
      'The home feels too large now that children have moved out',
      'Property taxes, utilities, and maintenance costs are straining the budget',
      'Social isolation in a large home far from family or amenities',
      'A desire to be closer to healthcare, family, or a senior community',
      'The home needs significant repairs that are no longer feasible',
    ],
    bodyAfterBullets: `<p>Ideally, downsizing should be a proactive choice made before a crisis forces the decision. Planning ahead gives families time to sort belongings, find the right new home, and coordinate the transition without the pressure of a health emergency.</p>`,
  },
  {
    heading: 'Sorting Through a Lifetime of Possessions',
    body: `<p>The most challenging part of downsizing is often deciding what to do with decades of accumulated belongings. A room-by-room approach works best:</p>`,
    bullets: [
      'Start with the least emotionally charged rooms (storage areas, guest rooms) to build momentum',
      'Sort items into four categories: keep and take, give to family, sell, donate/discard',
      'Take photos of sentimental items before letting them go',
      'Ask family members what they would like to have — don\'t assume',
      'Consider an estate sale for items with resale value (furniture, collectibles, antiques)',
      'Schedule donation pickups for usable items that don\'t sell',
      'Arrange a cleanout service for remaining items and debris',
    ],
    bodyAfterBullets: `<p>Professional estate sale companies and senior move managers specialize in helping families through this process. They can handle pricing, staging, selling, and even packing and unpacking at the new home.</p>`,
  },
  {
    heading: 'Choosing the Right New Home',
    body: `<p>Downsizing options for seniors include:</p>`,
    bullets: [
      '<strong>Smaller single-family home:</strong> A one-story home with less maintenance, often closer to family or amenities.',
      '<strong>Condominium or townhouse:</strong> Exterior maintenance is handled by an association, reducing upkeep burden.',
      '<strong>55+ active adult community:</strong> Age-restricted communities with amenities and social activities.',
      '<strong>Independent living community:</strong> Apartments or cottages with meal options, activities, and minimal maintenance.',
      '<strong>Assisted living:</strong> For seniors who need some help with daily activities, with meals, medication management, and care services.',
      '<strong>Continuing care retirement community (CCRC):</strong> Offers independent living with the ability to transition to higher levels of care as needed.',
    ],
  },
  {
    heading: 'Financial Considerations of Downsizing',
    body: `<p>Downsizing can have significant financial implications:</p>`,
    bullets: [
      '<strong>Selling the current home:</strong> Proceeds from the sale can fund the new home, supplement retirement savings, or pay for care.',
      '<strong>Capital gains exclusion:</strong> If the home has been the primary residence for at least 2 of the last 5 years, sellers may exclude up to $250,000 ($500,000 for married couples) of capital gains — but state rules vary.',
      '<strong>Property tax differences:</strong> The new home may have different property tax rates. Some states offer property tax relief programs for seniors.',
      '<strong>Moving and transition costs:</strong> Factor in moving expenses, any renovations needed at the new home, and temporary housing if there\'s a gap between sale and purchase.',
      '<strong>Estate sale income:</strong> Proceeds from selling household contents can offset moving costs and supplement the transition budget.',
    ],
  },
  {
    heading: 'Coordinating the Move',
    body: `<p>A successful senior downsizing move requires careful coordination:</p>`,
    bullets: [
      'Create a floor plan of the new home to determine what furniture will fit',
      'Schedule the estate sale before the move (usually 2-4 weeks before)',
      'Arrange donations and cleanout after the estate sale',
      'Hire movers experienced with senior relocations',
      'Pack an "essentials box" with medications, documents, and daily necessities for the first few days',
      'Set up utilities, mail forwarding, and address changes before moving day',
      'Consider a senior move manager for end-to-end coordination',
    ],
  },
];

const DOWNSIZING_OVERVIEW = [
  'Senior downsizing is the process of moving from a larger home to a more manageable living space, often accompanied by sorting through and selling decades of accumulated possessions. This guide covers the full downsizing journey — from deciding when to move, to handling the estate sale, to settling into a new home.',
  'While the downsizing process is similar nationwide, state-specific factors — property tax rules for seniors, capital gains exclusions, and available senior housing options — can influence your decisions. This guide covers the general process with state-specific details where they matter.',
];

const DOWNSIZING_FAQS = [
  { q: 'How long does the downsizing process take?', a: 'A typical downsizing project takes 4-8 weeks from start to finish: 1-2 weeks to sort and declutter, 2-3 weeks for estate sale preparation and execution, and 1-2 weeks for packing and moving. Complex situations or larger homes may take longer.' },
  { q: 'Should I have an estate sale before downsizing?', a: 'Yes. An estate sale is the most efficient way to liquidate belongings that won\'t fit in the new home. It converts furniture and collectibles to cash, reduces what needs to be moved, and handles the cleanout of remaining items. Schedule it 2-4 weeks before the move.' },
  { q: 'What is a senior move manager?', a: 'A senior move manager is a professional who specializes in helping older adults with all aspects of downsizing and moving — sorting, packing, coordinating movers, estate sales, and setting up the new home. They are particularly valuable when family members live far away.' },
  { q: 'Will I owe capital gains tax when selling my home to downsize?', a: 'If the home has been your primary residence for at least 2 of the last 5 years, you can typically exclude up to $250,000 (single) or $500,000 (married) of capital gains. State rules may differ. Consult a tax professional about your specific situation.' },
  { q: 'What happens to items that don\'t sell in the estate sale?', a: 'Most estate sale companies will arrange for donations of unsold usable items and can coordinate a cleanout service for anything remaining. Some items may be consigned for later sale. Discuss the post-sale process with your estate sale company upfront.' },
];

const DIVORCE_SECTIONS = [
  {
    heading: 'Selling a Home During Divorce',
    body: `<p>The family home is often the largest shared asset in a divorce, and deciding what to do with it is one of the most consequential decisions in the settlement process. Whether you sell the home, one spouse buys out the other, or you continue co-owning temporarily, understanding your options is essential.</p>
    <p>This guide covers the key considerations for handling a jointly owned home during divorce, including the sale process, dividing proceeds, estate sale options for household contents, and state-specific property division laws.</p>`,
  },
  {
    heading: 'Options for the Marital Home',
    body: `<p>When divorcing, couples generally have three options for the family home:</p>`,
    bullets: [
      '<strong>Sell the home and split proceeds:</strong> The most common option. The home is listed, sold, and net proceeds are divided according to the divorce settlement. This provides a clean break and liquidates the asset.',
      '<strong>One spouse buys out the other:</strong> One spouse keeps the home by refinancing the mortgage in their name alone and paying the other spouse their share of the equity. This requires qualifying for the mortgage independently.',
      '<strong>Co-own temporarily:</strong> Some couples continue co-owning the home for a set period — often until children finish school or until market conditions improve for a sale. This requires a clear legal agreement about responsibilities and eventual sale.',
    ],
  },
  {
    heading: 'Property Division: Equitable Distribution vs. Community Property',
    body: `<p>How property is divided in divorce depends on your state\'s system:</p>`,
    bullets: [
      '<strong>Equitable distribution states (majority):</strong> Marital property is divided "fairly" but not necessarily equally. Courts consider factors like each spouse\'s contribution, earning capacity, length of marriage, and custody arrangements.',
      '<strong>Community property states:</strong> Marital property is generally divided 50/50. These states treat assets acquired during the marriage as equally owned by both spouses.',
    ],
    bodyAfterBullets: `<p>Whether your state follows equitable distribution or community property significantly affects how home proceeds are divided. Check the state-specific section below for your state\'s approach.</p>`,
  },
  {
    heading: 'Preparing the Home for Sale',
    body: `<p>If you decide to sell, preparing the home for market involves:</p>`,
    bullets: [
      'Agreeing on a listing price (typically based on a comparative market analysis or appraisal)',
      'Deciding whether to make repairs or sell "as-is"',
      'Determining who will handle showings, staging, and maintenance during the listing period',
      'Choosing a real estate agent (both spouses should agree)',
      'Addressing the household contents — what each spouse takes, what is sold, what is donated',
    ],
  },
  {
    heading: 'Estate Sales and Household Contents in Divorce',
    body: `<p>Dividing household contents is often one of the most emotionally charged parts of divorce. When neither spouse wants certain items, or when the home needs to be emptied for sale, an estate sale or liquidation sale can be an effective solution.</p>
    <p>An estate sale company can:</p>`,
    bullets: [
      'Inventory and value all household contents',
      'Facilitate the division of items between spouses based on the settlement',
      'Sell remaining items through a multi-day estate sale',
      'Donate unsold usable items',
      'Provide a cleanout to prepare the home for sale',
    ],
    bodyAfterBullets: `<p>The proceeds from the sale of household contents are typically added to the marital estate and divided according to the settlement agreement.</p>`,
  },
  {
    heading: 'Tax Considerations When Selling in Divorce',
    body: `<p>Selling a home during divorce has specific tax implications:</p>`,
    bullets: [
      '<strong>Capital gains exclusion:</strong> If the home has been the primary residence for at least 2 of the last 5 years, up to $250,000 (single) or $500,000 (married filing jointly) of gain may be excluded. The exclusion may be available to a departing spouse even after divorce under certain conditions.',
      '<strong>Timing of the sale:</strong> Selling before the divorce is final may allow both spouses to claim the $500,000 married exclusion. Selling after may limit each spouse to $250,000.',
      '<strong>Transfer incident to divorce:</strong> Transferring the home to one spouse as part of the divorce settlement is generally tax-free at the time of transfer.',
      '<strong>Mortgage payoff:</strong> The existing mortgage is paid off at closing from sale proceeds. If one spouse is keeping the home, they must refinance to remove the other spouse from the loan.',
    ],
  },
];

const DIVORCE_OVERVIEW = [
  'Selling a jointly owned home during divorce is one of the most significant financial and emotional decisions in the separation process. This guide covers your options for the marital home, the sale process, dividing household contents, and the tax implications of selling property during divorce.',
  'Property division laws vary significantly by state — some states follow community property rules (generally 50/50), while others use equitable distribution (fair but not necessarily equal). This guide covers the general process and highlights state-specific differences in property division.',
];

const DIVORCE_FAQS = [
  { q: 'Can I force the sale of the house during divorce?', a: 'Yes. If the home is marital property and the spouses cannot agree, either spouse can petition the court to order the sale. The court can order a "partition sale" or include the sale as part of the divorce decree.' },
  { q: 'Who gets to live in the house during the divorce?', a: 'This is typically determined by temporary orders. Courts may award exclusive possession to the primary caregiver of children, or require one spouse to vacate. The mortgage and maintenance must continue to be paid regardless of who lives there.' },
  { q: 'Do I have to sell the house, or can I keep it?', a: 'You can keep the home if you buy out your spouse\'s share of the equity and refinance the mortgage to remove their name. You\'ll need to qualify for the mortgage independently and have the financial means to maintain the home.' },
  { q: 'How are household contents divided in divorce?', a: 'Spouses typically negotiate who gets which items. Items neither spouse wants can be sold through an estate sale or liquidation sale, with proceeds added to the marital estate. Sentimental items are often the most contentious and may require mediation.' },
  { q: 'Should we sell the house before or after the divorce is final?', a: 'Selling before the divorce is final may allow you to claim the full $500,000 married capital gains exclusion. Selling after may limit each spouse to $250,000. However, the right timing depends on your specific financial and emotional situation — consult your attorney and tax professional.' },
];

const ESTATE_CLEANOUT_SECTIONS = [
  {
    heading: 'What Is an Estate Cleanout?',
    body: `<p>An estate cleanout is the process of removing all remaining contents from a property after an estate sale, a death, a move, or a foreclosure. It prepares the home for sale, transfer, or vacancy by clearing out furniture, household goods, trash, and debris.</p>
    <p>Estate cleanouts are typically the final step after an estate sale — items that didn\'t sell, along with broken or unusable items, are removed and disposed of or donated. In some cases, a cleanout is needed without an estate sale, such as when the family has already taken what they want and the remaining items have no resale value.</p>`,
  },
  {
    heading: 'When Do You Need an Estate Cleanout?',
    body: `<p>Common situations that require a cleanout include:</p>`,
    bullets: [
      'After an estate sale, to remove unsold items and prepare the home for listing',
      'After a death, when the family needs to empty the home for sale or transfer',
      'During a downsizing move, to clear items that won\'t be moved to the new home',
      'After a foreclosure, when the former occupants have left belongings behind',
      'When preparing a hoarding situation property for sale or habitation',
      'When clearing a rental property between tenants with abandoned items',
    ],
  },
  {
    heading: 'The Cleanout Process',
    body: `<p>A professional estate cleanout typically follows these steps:</p>`,
    bullets: [
      '<strong>1. Assessment and estimate:</strong> The cleanout company visits the property to assess the volume and type of items, identifying hazardous materials, valuables, and items suitable for donation.',
      '<strong>2. Sorting:</strong> Items are sorted into categories — donate, recycle, dispose, and sometimes items to keep or sell. Valuables discovered during sorting are set aside.',
      '<strong>3. Removal:</strong> All items are removed from the property, including furniture, appliances, boxes, and debris.',
      '<strong>4. Donation:</strong> Usable items are donated to local charities, often with a donation receipt for tax purposes.',
      '<strong>5. Disposal:</strong> Remaining items are hauled to appropriate disposal facilities. Hazardous materials (paint, chemicals, electronics) require special handling per local regulations.',
      '<strong>6. Final cleaning:</strong> Some cleanout services include a basic cleaning or broom-sweep of the emptied property.',
    ],
  },
  {
    heading: 'Estate Sale vs. Cleanout: What\'s the Difference?',
    body: `<p>An estate sale and a cleanout serve different purposes but often work together:</p>`,
    bullets: [
      '<strong>Estate sale:</strong> Sells items with resale value to the public over a multi-day sale. The company takes a commission on sales. Generates revenue for the estate.',
      '<strong>Cleanout:</strong> Removes everything that remains after the sale. Items are donated or disposed of. Typically charges a flat fee based on volume.',
    ],
    bodyAfterBullets: `<p>Many estate sale companies offer cleanout as an add-on service after the sale. If your estate sale company doesn\'t, you\'ll need to hire a separate junk removal or cleanout service. Doing the estate sale first maximizes the value recovered before items are donated or discarded.</p>`,
  },
  {
    heading: 'Costs and Pricing',
    body: `<p>Estate cleanout costs vary based on:</p>`,
    bullets: [
      'The volume of items to be removed (measured in truckloads or cubic yards)',
      'The type of items (furniture, appliances, electronics, construction debris)',
      'Whether hazardous materials need special disposal',
      'The accessibility of the property (stairs, elevators, distance from parking)',
      'Whether donation sorting is included',
      'Local disposal fees and landfill costs',
    ],
    bodyAfterBullets: `<p>If the estate sale generated significant revenue, the cleanout cost is often offset by sale proceeds. Some cleanout companies offer a reduced rate or even credit when they can sell or donate valuable items they find.</p>`,
  },
  {
    heading: 'Donations and Tax Deductions',
    body: `<p>Items donated to qualified charities during a cleanout may be tax-deductible. The cleanout company or donation center typically provides a receipt listing the donated items. For significant donations, consult a tax professional about valuation and deduction limits, which vary by state and individual tax situation.</p>`,
  },
];

const ESTATE_CLEANOUT_OVERVIEW = [
  'An estate cleanout is the process of removing all remaining contents from a property — after an estate sale, a death, a move, or a foreclosure — to prepare it for sale, transfer, or vacancy. This guide covers when you need a cleanout, how the process works, costs, and how it fits with estate sales.',
  'While the cleanout process is similar nationwide, local disposal regulations, donation options, and hazardous waste rules vary by state and municipality. This guide covers the general process and notes state-specific considerations.',
];

const ESTATE_CLEANOUT_FAQS = [
  { q: 'How much does an estate cleanout cost?', a: 'Costs typically range from $500 to $3,000 depending on the volume of items, property accessibility, and local disposal fees. A partial cleanout (a few items) may cost $200-$500, while a full house cleanout with significant debris can exceed $3,000.' },
  { q: 'Can I do the cleanout myself?', a: 'Yes, but it requires significant time, labor, and a way to haul items. You\'ll need to arrange donations, transport items to disposal facilities, and handle hazardous materials properly. For most families, especially those dealing with grief or living far away, hiring professionals is more practical.' },
  { q: 'What happens to items removed during a cleanout?', a: 'Usable items are typically donated to local charities. Recyclable materials go to recycling facilities. Remaining items go to the landfill. Hazardous materials (paint, chemicals, electronics) are disposed of according to local environmental regulations.' },
  { q: 'Should I have an estate sale before the cleanout?', a: 'Almost always yes. An estate sale recovers value from sellable items before they\'re donated or discarded. The sale proceeds often exceed the cleanout cost. Only skip the estate sale if the contents have no resale value.' },
  { q: 'How long does an estate cleanout take?', a: 'A typical single-family home cleanout takes 1-2 days with a crew of 3-4 workers. Larger homes or properties with significant accumulation may take 3-5 days. Partial cleanouts can be completed in a few hours.' },
];

// Main export — returns shared content for a given guide type
const HUB_CONTENT = {
  probate: {
    overview: PROBATE_OVERVIEW,
    sections: PROBATE_SECTIONS,
    generalFaqs: PROBATE_GENERAL_FAQS,
    keyTerms: PROBATE_KEY_TERMS,
  },
  'pre-probate': {
    overview: PROBATE_OVERVIEW,
    sections: PROBATE_SECTIONS,
    generalFaqs: PROBATE_GENERAL_FAQS,
    keyTerms: PROBATE_KEY_TERMS,
  },
  'executor-guide': {
    overview: PROBATE_OVERVIEW,
    sections: PROBATE_SECTIONS,
    generalFaqs: PROBATE_GENERAL_FAQS,
    keyTerms: PROBATE_KEY_TERMS,
  },
  'trustee-guide': {
    overview: PROBATE_OVERVIEW,
    sections: PROBATE_SECTIONS,
    generalFaqs: PROBATE_GENERAL_FAQS,
    keyTerms: PROBATE_KEY_TERMS,
  },
  'heir-guide': {
    overview: PROBATE_OVERVIEW,
    sections: PROBATE_SECTIONS,
    generalFaqs: PROBATE_GENERAL_FAQS,
    keyTerms: PROBATE_KEY_TERMS,
  },
  'inherited-property': {
    overview: INHERITED_PROPERTY_OVERVIEW,
    sections: INHERITED_PROPERTY_SECTIONS,
    generalFaqs: INHERITED_PROPERTY_FAQS,
    keyTerms: [],
  },
  'senior-downsizing': {
    overview: DOWNSIZING_OVERVIEW,
    sections: DOWNSIZING_SECTIONS,
    generalFaqs: DOWNSIZING_FAQS,
    keyTerms: [],
  },
  'assisted-living-transition': {
    overview: DOWNSIZING_OVERVIEW,
    sections: DOWNSIZING_SECTIONS,
    generalFaqs: DOWNSIZING_FAQS,
    keyTerms: [],
  },
  'divorce-property-sale': {
    overview: DIVORCE_OVERVIEW,
    sections: DIVORCE_SECTIONS,
    generalFaqs: DIVORCE_FAQS,
    keyTerms: [],
  },
  'estate-cleanout': {
    overview: ESTATE_CLEANOUT_OVERVIEW,
    sections: ESTATE_CLEANOUT_SECTIONS,
    generalFaqs: ESTATE_CLEANOUT_FAQS,
    keyTerms: [],
  },
  'foreclosure-cleanout': {
    overview: ESTATE_CLEANOUT_OVERVIEW,
    sections: ESTATE_CLEANOUT_SECTIONS,
    generalFaqs: ESTATE_CLEANOUT_FAQS,
    keyTerms: [],
  },
};

export function getHubContent(slug) {
  return HUB_CONTENT[slug] || null;
}