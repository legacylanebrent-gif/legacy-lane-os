import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BASE_URL = 'https://www.estatesalen.com';

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emailShell(title, content) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">EstateSalen</h1>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;">Estate Settlement Guidance</p>
  </div>
  <div style="background:#fff;border-radius:12px;padding:24px 28px;border:1px solid #e2e8f0;">
    ${content}
  </div>
  <div style="text-align:center;padding:16px;margin-top:12px;">
    <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
      This email is for educational purposes only. EstateSalen does not provide legal, tax, or financial advice.<br>
      For legal questions, please consult a licensed attorney in your state.<br>
      © ${new Date().getFullYear()} EstateSalen.com
    </p>
  </div>
</div></body></html>`;
}

function buildEmails(lead) {
  const name = lead.first_name || 'there';
  const state = lead.state || 'your state';
  const escName = escapeHtml(name);
  const escState = escapeHtml(state);
  const hasRealEstate = lead.has_real_estate;
  const needsEstateSale = lead.needs_estate_sale;
  const needsCleanout = lead.needs_cleanout;
  const needsRealtor = lead.needs_realtor;
  const wantsCash = lead.wants_cash_offer;

  const primaryCTA = needsEstateSale
    ? `Find an estate sale company in ${state}: ${BASE_URL}/estate-sale-companies`
    : hasRealEstate && (needsRealtor || wantsCash)
      ? `Find a probate-friendly realtor in ${state}: ${BASE_URL}/probate-realtors`
      : `Use our free estate settlement planner: ${BASE_URL}/estate-settlement-planner`;

  // ── Email 1: Checklist ──
  const e1Body = `Hi ${name},\n\nThank you for reaching out. Settling an estate can feel overwhelming. We're here to make it practical, step by step.\n\nHere are your next practical steps:\n\n1. SECURE THE PROPERTY — Lock the home, collect keys, cancel or forward mail.\n\n2. LOCATE IMPORTANT DOCUMENTS — Will, trust, deed, financial accounts, insurance policies, government IDs.\n\n3. NOTIFY THE RIGHT PEOPLE — Bank, Social Security, pension providers, insurance companies, post office.\n\n4. UNDERSTAND WHAT YOU HAVE — Walk through and photograph all rooms. Note valuables, furniture, collections, jewelry, vehicles.\n\n5. DECIDE WHO WILL HELP — Executor, attorney, estate sale company, realtor, cleanout crew.\n\nYour free checklist: ${BASE_URL}/estate-checklist\nYour planner: ${BASE_URL}/estate-settlement-planner\n\n${primaryCTA}\n\nWe'll send more practical guides over the coming days.\n\n— The EstateSalen Team`;
  const e1Html = emailShell('Your Estate Settlement Checklist', `
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">Your Estate Settlement Checklist</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Hi ${escName},</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Thank you for reaching out. Settling an estate — whether it's yours, a loved one's, or one you've inherited — can feel overwhelming. We're here to make it practical, step by step.</p>
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;font-weight:700;">Here are your next practical steps:</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0 0 10px;color:#1e293b;font-size:14px;"><strong>1. SECURE THE PROPERTY</strong><br><span style="color:#64748b;">Lock the home, collect keys from family members, and cancel or forward mail.</span></p>
      <p style="margin:0 0 10px;color:#1e293b;font-size:14px;"><strong>2. LOCATE IMPORTANT DOCUMENTS</strong><br><span style="color:#64748b;">Will, trust documents, deed to property, financial accounts, insurance policies, and government IDs.</span></p>
      <p style="margin:0 0 10px;color:#1e293b;font-size:14px;"><strong>3. NOTIFY THE RIGHT PEOPLE</strong><br><span style="color:#64748b;">Bank, Social Security, pension providers, insurance companies, and the post office.</span></p>
      <p style="margin:0 0 10px;color:#1e293b;font-size:14px;"><strong>4. UNDERSTAND WHAT YOU HAVE</strong><br><span style="color:#64748b;">Walk through the property and take photos of all rooms. Note valuables, furniture, collections, jewelry, and vehicles.</span></p>
      <p style="margin:0;color:#1e293b;font-size:14px;"><strong>5. DECIDE WHO WILL HELP</strong><br><span style="color:#64748b;">Executor, attorney, estate sale company, realtor, and cleanout crew — not everyone needs all of these.</span></p>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="${BASE_URL}/estate-checklist" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:0 8px 8px;">Free Checklist</a>
      <a href="${BASE_URL}/estate-settlement-planner" style="display:inline-block;background:#0891b2;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:0 8px 8px;">Settlement Planner</a>
    </div>
    <p style="margin:0;color:#64748b;font-size:14px;">We'll send you a few more practical guides over the coming days.</p>
  `);

  // ── Email 2: Documents and Sorting ──
  const e2Body = `Hi ${name},\n\nBefore you hold an estate sale or start cleaning out the home, a little preparation goes a long way.\n\nDOCUMENTS TO FIND FIRST\n- The will (or trust document) — determines who has authority\n- Property deed — needed if there's a house involved\n- Vehicle titles — cars require title transfer\n- Insurance policies — some items may be covered\n- Account statements — these help identify assets\n\nTAKE PHOTOS BEFORE ANYTHING MOVES\nWalk every room with your phone. Photograph: every room, jewelry, silver, antiques, art, collectibles, branded items.\n\nFAMILY COMMUNICATION\nDecide early: will family members be allowed to take personal items before the sale? Document everything in writing.\n\nITEM SORTING CATEGORIES\n- Keep (sentimental)\n- Sell (estate sale or online)\n- Donate (furniture, clothing)\n- Discard (damaged, hazardous)\n- Appraise (potentially high-value)\n\nIdentify valuables: ${BASE_URL}/items\nFree guides: ${BASE_URL}/learn\n\n${primaryCTA}\n\n— The EstateSalen Team`;
  const e2Html = emailShell('First Things to Organize', `
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">The First Things to Organize Before Selling Estate Contents</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Hi ${escName},</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Before you hold an estate sale or start cleaning out the home, a little preparation goes a long way.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:0 0 16px;">
      <h3 style="margin:0 0 8px;font-size:14px;color:#1e293b;">Documents to Find First</h3>
      <ul style="margin:0;padding-left:18px;color:#64748b;font-size:14px;line-height:1.8;">
        <li>The will (or trust document) — determines who has authority</li>
        <li>Property deed — needed if there's a house involved</li>
        <li>Vehicle titles — cars require title transfer</li>
        <li>Insurance policies — some items may be covered</li>
        <li>Account statements — these help identify assets</li>
      </ul>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 16px;">
      <h3 style="margin:0 0 8px;font-size:14px;color:#166534;">Take Photos Before Anything Moves</h3>
      <p style="margin:0;color:#14532d;font-size:14px;line-height:1.7;">Walk every room with your phone. Photograph every room, jewelry, silver, antiques, art, collectibles, and any items with brand names or maker's marks. This protects you legally and helps professionals price items accurately.</p>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:0 0 16px;">
      <h3 style="margin:0 0 8px;font-size:14px;color:#92400e;">Item Sorting Categories</h3>
      <p style="margin:0;color:#78350f;font-size:14px;line-height:1.7;"><strong>Keep</strong> (sentimental) · <strong>Sell</strong> (estate sale or online) · <strong>Donate</strong> (furniture, clothing) · <strong>Discard</strong> (damaged, hazardous) · <strong>Appraise</strong> (potentially high-value)</p>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="${BASE_URL}/items" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Identify Valuables</a>
    </div>
  `);

  // ── Email 3: Keep, Sell, Donate ──
  const e3Body = `Hi ${name},\n\nOne of the most common questions families ask: "What do we do with everything?"\n\nKEEP — Sentimental items, family heirlooms. Make a list — first come, first served creates conflict.\n\nSELL — Estate Sale: Best for homes with significant furniture, collectibles, antiques. Estate sale companies handle pricing, setup, advertising. ${needsEstateSale ? `Connect with companies in ${state}: ${BASE_URL}/estate-sale-companies` : `Find companies: ${BASE_URL}/estate-sale-companies`}\n\nSELL — Online: Valuable items may sell for more on eBay, Facebook Marketplace, or auction houses.\n\nDONATE — Furniture, clothing, household goods to Habitat for Humanity, Goodwill, local charities.\n\nCLEANOUT — After a sale, remaining items go to junk removal. ${needsCleanout ? `Match with cleanout vendors in ${state}: ${BASE_URL}/estate-sale-companies` : ''}\n\nWHAT NOT TO DO — Don't throw away what might be valuable. Don't give everything away before a professional walk-through. Don't rush.\n\n— The EstateSalen Team`;
  const e3Html = emailShell('Keep, Sell, or Donate?', `
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">Should You Keep, Sell, Donate, or Clean Out the Home?</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Hi ${escName},</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">One of the most common questions families ask: "What do we do with everything?" Here's a practical framework:</p>
    <div style="margin:0 0 16px;">
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;margin:0 0 10px;border-radius:0 6px 6px 0;">
        <h4 style="margin:0 0 4px;font-size:14px;color:#166534;">KEEP</h4>
        <p style="margin:0;color:#14532d;font-size:13px;">Sentimental items, family heirlooms. Make a list — first come, first served creates conflict. Consider a family meeting.</p>
      </div>
      <div style="background:#fff7ed;border-left:4px solid #f97316;padding:12px 16px;margin:0 0 10px;border-radius:0 6px 6px 0;">
        <h4 style="margin:0 0 4px;font-size:14px;color:#c2410c;">SELL — Estate Sale</h4>
        <p style="margin:0;color:#9a3412;font-size:13px;">Best for homes with significant furniture, collectibles, and antiques. An estate sale company handles everything. ${needsEstateSale ? `We can connect you with companies in ${escState}.` : ''}</p>
      </div>
      <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;margin:0 0 10px;border-radius:0 6px 6px 0;">
        <h4 style="margin:0 0 4px;font-size:14px;color:#1e40af;">SELL — Online</h4>
        <p style="margin:0;color:#1e3a5f;font-size:13px;">Valuable items may sell for more on eBay, Facebook Marketplace, or specialty auction houses.</p>
      </div>
      <div style="background:#fdf2f8;border-left:4px solid #ec4899;padding:12px 16px;margin:0 0 10px;border-radius:0 6px 6px 0;">
        <h4 style="margin:0 0 4px;font-size:14px;color:#9d174d;">DONATE</h4>
        <p style="margin:0;color:#831843;font-size:13px;">Furniture, clothing, household goods to Habitat for Humanity, Goodwill, or local charities. Some pick up for free.</p>
      </div>
      <div style="background:#f1f5f9;border-left:4px solid #64748b;padding:12px 16px;border-radius:0 6px 6px 0;">
        <h4 style="margin:0 0 4px;font-size:14px;color:#334155;">CLEANOUT</h4>
        <p style="margin:0;color:#475569;font-size:13px;">After a sale or donation, what remains goes to junk removal or estate cleanout. ${needsCleanout ? `We can match you with vendors in ${escState}.` : ''}</p>
      </div>
    </div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin:16px 0;">
      <p style="margin:0;color:#991b1b;font-size:14px;"><strong>What NOT to do:</strong> Don't throw away what might be valuable. Don't give everything away before a professional walk-through. Don't rush — mistakes are costly.</p>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="${BASE_URL}/estate-sale-companies" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Find Help Near You</a>
    </div>
  `);

  // ── Email 4: Real Estate Planning ──
  const e4Body = `Hi ${name},\n\n${hasRealEstate ? 'You mentioned there\'s a property involved. Here\'s what you need to know.' : 'Many estate situations involve a property. Here\'s what to think about.'}\n\nBEFORE YOU LIST: Complete probate, clear contents, address repairs, get a property valuation.\n\nOPTIONS:\nA) Traditional Listing with a Realtor — Best for good condition properties with time. ${needsRealtor ? `Find a probate realtor: ${BASE_URL}/probate-realtors` : `Browse realtors: ${BASE_URL}/probate-realtors`}\n\nB) Cash Offer from Investor — Best when property needs repairs or you want speed. ${wantsCash ? `Request a cash offer: ${BASE_URL}/estate-settlement-planner` : `Learn about offers: ${BASE_URL}/inherited-property`}\n\nC) Sell As-Is — Simpler process, possibly lower price.\n\nTiming matters — carrying costs add up fast.\n\n— The EstateSalen Team`;
  const e4Html = emailShell('Real Estate Planning', `
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">If There Is a House Involved, Start Planning Early</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Hi ${escName},</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">${hasRealEstate ? 'You mentioned there\'s a property involved. Here\'s what you need to know.' : 'Many estate situations involve a property. Even if you\'re not sure yet, here\'s what to think about.'}</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:0 0 16px;">
      <h3 style="margin:0 0 8px;font-size:14px;color:#1e293b;">Before You List the House</h3>
      <ol style="margin:0;padding-left:18px;color:#64748b;font-size:14px;line-height:1.8;">
        <li>Complete probate or confirm authority to sell</li>
        <li>Clear the contents (estate sale or cleanout first)</li>
        <li>Address obvious repairs or deferred maintenance</li>
        <li>Get a property valuation — not just a Zillow estimate</li>
      </ol>
    </div>
    <div style="margin:0 0 16px;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin:0 0 10px;">
        <h4 style="margin:0 0 4px;font-size:14px;color:#166534;">Option A: Traditional Listing with a Realtor</h4>
        <p style="margin:0;color:#14532d;font-size:13px;">Best when the property is in good condition. A probate-friendly realtor understands the paperwork, timelines, and court requirements.</p>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:0 0 10px;">
        <h4 style="margin:0 0 4px;font-size:14px;color:#92400e;">Option B: Cash Offer from an Investor</h4>
        <p style="margin:0;color:#78350f;font-size:13px;">Best when the property needs repairs or you want to close quickly. No showings, no contingencies.</p>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;">
        <h4 style="margin:0 0 4px;font-size:14px;color:#1e40af;">Option C: Sell As-Is</h4>
        <p style="margin:0;color:#1e3a5f;font-size:13px;">Some realtors specialize in as-is estate sales. Simpler process, possibly lower price.</p>
      </div>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="${BASE_URL}/estate-settlement-planner" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Start Your Plan</a>
    </div>
  `);

  // ── Email 5: Provider Match ──
  const e5Body = `Hi ${name},\n\nBy now, you may have a clearer picture of what you need. Here's how we can connect you with professionals in ${state}.\n\nESTATE SALE COMPANIES — Vetted operators who specialize in probate, inherited homes, and downsizing. ${BASE_URL}/estate-sale-companies\n\nPROBATE-FRIENDLY REALTORS — Agents who understand probate timelines and paperwork. ${BASE_URL}/probate-realtors\n\nCLEANOUT & JUNK REMOVAL — Remove everything quickly after the sale. ${BASE_URL}/estate-cleanout\n\nINVESTOR CASH OFFERS — Close in days without inspections or repairs. ${BASE_URL}/estate-settlement-planner\n\nGet matched with providers in your area (3 minutes): ${BASE_URL}/estate-settlement-planner\n\n— The EstateSalen Team`;
  const e5Html = emailShell('Connect with Professionals', `
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">Need Help Finding an Estate Sale Company or Probate-Friendly Agent?</h2>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">Hi ${escName},</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Here's how we connect you with the right professionals in ${escState}:</p>
    <div style="margin:0 0 20px;">
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid #e2e8f0;">
        <div style="background:#fff7ed;border-radius:8px;padding:8px;font-size:20px;flex-shrink:0;">🏷️</div>
        <div><h4 style="margin:0 0 2px;font-size:14px;color:#1e293b;">Estate Sale Companies</h4><p style="margin:0;color:#64748b;font-size:13px;">Vetted operators who handle setup, pricing, advertising, the sale, and cleanup.</p></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid #e2e8f0;">
        <div style="background:#eff6ff;border-radius:8px;padding:8px;font-size:20px;flex-shrink:0;">🏡</div>
        <div><h4 style="margin:0 0 2px;font-size:14px;color:#1e293b;">Probate-Friendly Realtors</h4><p style="margin:0;color:#64748b;font-size:13px;">Agents who understand probate timelines, court approvals, and inherited property paperwork.</p></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid #e2e8f0;">
        <div style="background:#f1f5f9;border-radius:8px;padding:8px;font-size:20px;flex-shrink:0;">🚛</div>
        <div><h4 style="margin:0 0 2px;font-size:14px;color:#1e293b;">Cleanout & Junk Removal</h4><p style="margin:0;color:#64748b;font-size:13px;">Remove everything quickly and responsibly after the sale.</p></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 0;">
        <div style="background:#f0fdf4;border-radius:8px;padding:8px;font-size:20px;flex-shrink:0;">💰</div>
        <div><h4 style="margin:0 0 2px;font-size:14px;color:#1e293b;">Investor Cash Offers</h4><p style="margin:0;color:#64748b;font-size:13px;">Close in days without inspections, repairs, or showings.</p></div>
      </div>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="${BASE_URL}/estate-settlement-planner" style="display:inline-block;background:#f97316;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Get Matched — 3 Minutes</a>
    </div>
  `);

  // ── Email 6: Realtor vs Investor ──
  const e6Body = `Hi ${name},\n\nIf there's a property involved, you'll face this question: list with a realtor or accept a cash offer?\n\nREALTOR LISTING: ✓ Highest sale price ✓ MLS access ✓ Good for decent condition ✗ Requires showings, staging ✗ Subject to financing ✗ May need repairs\n\nINVESTOR / CASH: ✓ Close in 7-21 days ✓ No repairs, no showings ✓ Ideal for fixer-uppers ✗ 10-20% below market ✗ Fewer protections\n\nHYBRID: Estate sale first (clear contents, generate cash), then list the empty property.\n\nRECOMMENDATION: If you have time and property is decent — list with a probate realtor. If speed matters or repairs are needed — get a cash offer. Not sure? Get both quotes.\n\nStart with our planner: ${BASE_URL}/estate-settlement-planner\n\n— The EstateSalen Team`;
  const e6Html = emailShell('Realtor vs. Investor', `
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">Would a Realtor Sale or Investor Offer Make More Sense?</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Hi ${escName},</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">If there's a property involved in this estate, you'll eventually face this question: should you list it with a realtor, or accept a cash offer from an investor?</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:8px;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;">
            <h4 style="margin:0 0 8px;font-size:14px;color:#1e40af;">Realtor Listing</h4>
            <p style="margin:0;color:#1e3a5f;font-size:13px;line-height:1.8;">✓ Highest sale price<br>✓ MLS & broad buyer pool<br>✓ Good for decent condition<br>✓ Works with 60-90+ days<br><span style="color:#991b1b;">✗ Showings & staging<br>✗ Financing can fall through<br>✗ May require repairs</span></p>
          </div>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:8px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;">
            <h4 style="margin:0 0 8px;font-size:14px;color:#166534;">Investor / Cash</h4>
            <p style="margin:0;color:#14532d;font-size:13px;line-height:1.8;">✓ Close in 7-21 days<br>✓ No repairs or showings<br>✓ Ideal for fixer-uppers<br>✓ Great for out-of-state heirs<br><span style="color:#991b1b;">✗ 10-20% below market<br>✗ Fewer protections</span></p>
          </div>
        </td>
      </tr>
    </table>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:0 0 16px;">
      <h4 style="margin:0 0 8px;font-size:14px;color:#1e293b;">The Hybrid Approach</h4>
      <p style="margin:0;color:#64748b;font-size:14px;">Some families do an estate sale first (clear the contents, generate cash), then list the empty property. The empty home often shows better and sells faster.</p>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="${BASE_URL}/estate-settlement-planner" style="display:inline-block;background:#f97316;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Get Both Quotes</a>
    </div>
  `);

  return [
    { delay_days: 0, subject: 'Your Estate Settlement Checklist', body: e1Body, html: e1Html },
    { delay_days: 2, subject: 'The first things to organize before selling estate contents', body: e2Body, html: e2Html },
    { delay_days: 4, subject: 'Should you keep, sell, donate, or clean out the home?', body: e3Body, html: e3Html },
    { delay_days: 7, subject: 'If there is a house involved, start planning early', body: e4Body, html: e4Html },
    { delay_days: 10, subject: 'Need help finding an estate sale company or probate-friendly agent?', body: e5Body, html: e5Html },
    { delay_days: 14, subject: 'Would a realtor sale or investor offer make more sense?', body: e6Body, html: e6Html },
  ];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { lead_id, send_immediately = false } = body;

    if (!lead_id) {
      return Response.json({ error: 'lead_id is required' }, { status: 400 });
    }

    const leads = await base44.asServiceRole.entities.EstateTransitionLead.filter({ id: lead_id });
    const lead = leads[0];
    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!lead.email) {
      return Response.json({ error: 'Lead has no email address', lead_id }, { status: 400 });
    }

    const emails = buildEmails(lead);
    const results = [];

    if (send_immediately) {
      const firstEmail = emails[0];
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: lead.email,
        subject: firstEmail.subject,
        body: firstEmail.body,
        html: firstEmail.html,
      });
      results.push({ email_number: 1, subject: firstEmail.subject, status: 'sent' });

      for (let i = 1; i < emails.length; i++) {
        const e = emails[i];
        await base44.asServiceRole.entities.LeadActivityLog.create({
          lead_id,
          activity_type: 'follow_up',
          activity_notes: `EMAIL_QUEUED|delay_days:${e.delay_days}|subject:${e.subject}`,
        });
        results.push({ email_number: i + 1, subject: e.subject, status: 'queued', delay_days: e.delay_days });
      }
    } else {
      for (let i = 0; i < emails.length; i++) {
        const e = emails[i];
        await base44.asServiceRole.entities.LeadActivityLog.create({
          lead_id,
          activity_type: 'follow_up',
          activity_notes: `EMAIL_QUEUED|delay_days:${e.delay_days}|subject:${e.subject}`,
        });
        results.push({ email_number: i + 1, subject: e.subject, status: 'queued', delay_days: e.delay_days });
      }
    }

    await base44.asServiceRole.entities.LeadActivityLog.create({
      lead_id,
      activity_type: 'email_sent',
      activity_notes: `Email sequence started. ${emails.length} emails queued. send_immediately=${send_immediately}`,
    });

    return Response.json({
      lead_id,
      email: lead.email,
      emails_queued: emails.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});