import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id } = await req.json();

    if (!deal_id) {
      return Response.json({ error: 'deal_id required' }, { status: 400 });
    }

    // 1. Get the deal agreement
    const deals = await base44.asServiceRole.entities.ReferralDealAgreement.filter({
      deal_id,
    });

    if (deals.length === 0) {
      return Response.json({ error: 'Deal agreement not found' }, { status: 404 });
    }

    const deal = deals[0];

    // 2. Get the lead
    const leads = await base44.asServiceRole.entities.ReferralLead.filter({
      id: deal.lead_id,
    });

    const lead = leads.length > 0 ? leads[0] : {};

    // 3. Get agent and operator info
    let agentName = 'Unknown Agent';
    let operatorName = 'Unknown Operator';

    if (deal.agent_id) {
      const agents = await base44.asServiceRole.entities.User.filter({ id: deal.agent_id });
      if (agents.length > 0) agentName = agents[0].full_name;
    }

    if (deal.operator_id) {
      const operators = await base44.asServiceRole.entities.User.filter({ id: deal.operator_id });
      if (operators.length > 0) operatorName = operators[0].full_name;
    }

    // 4. Format timestamp
    const acceptedDate = deal.acceptance_timestamp
      ? new Date(deal.acceptance_timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Date not available';

    // 5. Generate HTML document
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property-Specific Referral Agreement</title>
  <style>
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 40px;
      color: #333;
      line-height: 1.8;
    }
    h1 {
      text-align: center;
      font-size: 24px;
      margin-bottom: 10px;
      border-bottom: 3px solid #f97316;
      padding-bottom: 15px;
    }
    .header-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin: 30px 0;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .header-info-item {
      border-right: 1px solid #ddd;
    }
    .header-info-item:nth-child(2n) {
      border-right: none;
    }
    .label {
      font-weight: bold;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }
    .value {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 15px;
      color: #1e293b;
    }
    .terms {
      margin-left: 20px;
    }
    .term {
      margin: 15px 0;
      padding-left: 0;
    }
    .term-number {
      font-weight: bold;
      color: #f97316;
    }
    .referral-agent {
      background: #fef3c7;
      border-left: 4px solid #f97316;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .referral-agent-label {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 10px;
    }
    .referral-agent-name {
      font-size: 18px;
      font-weight: bold;
      color: #1e293b;
    }
    .referral-agent-brokerage {
      font-size: 14px;
      color: #555;
      margin-top: 5px;
    }
    .signature-section {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #ddd;
    }
    .signature-item {
      display: inline-block;
      width: 45%;
      margin-right: 5%;
      margin-bottom: 30px;
    }
    .signature-item:nth-child(2n) {
      margin-right: 0;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      height: 40px;
      margin-bottom: 5px;
    }
    .signature-label {
      font-size: 12px;
      font-weight: bold;
      color: #666;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    .deal-id {
      text-align: center;
      font-size: 11px;
      color: #aaa;
      margin-top: 20px;
      font-family: 'Courier New', monospace;
    }
    @media print {
      body { margin: 0; padding: 20px; }
      h1 { page-break-after: avoid; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Property-Specific Referral Agreement</h1>

  <div class="header-info">
    <div class="header-info-item">
      <div class="label">Property Address</div>
      <div class="value">${deal.property_address || 'Address not available'}</div>
      <div class="label">Client Name</div>
      <div class="value">${lead.client_name || 'Name not available'}</div>
    </div>
    <div class="header-info-item">
      <div class="label">Assigned Agent</div>
      <div class="value">${agentName}</div>
      <div class="label">Assigned Operator</div>
      <div class="value">${operatorName}</div>
    </div>
  </div>

  <div class="referral-agent">
    <div class="referral-agent-label">Designated Referral Agent</div>
    <div class="referral-agent-name">${deal.referral_agent_name}</div>
    <div class="referral-agent-brokerage">${deal.referral_agent_brokerage}</div>
  </div>

  <div class="section">
    <div class="section-title">Agreement Terms</div>
    <div class="terms">
      <div class="term">
        <span class="term-number">1.</span> This lead originated through the Houszu / Legacy Lane platform and is protected by platform referral and non-circumvention rules.
      </div>
      <div class="term">
        <span class="term-number">2.</span> All parties agree that any resulting real estate transaction must include the designated referral agent listed above.
      </div>
      <div class="term">
        <span class="term-number">3.</span> Any referral compensation or transaction fees must be handled through licensed real estate channels and in accordance with all applicable state and federal regulations.
      </div>
      <div class="term">
        <span class="term-number">4.</span> All participants agree not to bypass, circumvent, or engage with this lead outside of the platform structure.
      </div>
      <div class="term">
        <span class="term-number">5.</span> This agreement becomes effective and binding upon acceptance of the lead through the platform.
      </div>
      <div class="term">
        <span class="term-number">6.</span> Non-circumvention obligations under this agreement survive for 12 months from the date of acceptance.
      </div>
    </div>
  </div>

  <div class="signature-section">
    <div class="section-title">Acceptance Details</div>
    <div style="margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 4px;">
      <div class="label">Accepted On</div>
      <div class="value">${acceptedDate}</div>
    </div>

    <div style="margin-top: 40px;">
      <div class="signature-item">
        <div class="label">Agent Signature</div>
        <div class="value">${agentName}</div>
      </div>
      <div class="signature-item">
        <div class="label">Operator Signature</div>
        <div class="value">${operatorName}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This agreement is digitally recorded and stored within the Legacy Lane platform.</p>
    <p>For questions or disputes, contact the platform support team.</p>
  </div>

  <div class="deal-id">Agreement ID: ${deal.deal_id}</div>
</body>
</html>
    `;

    // 6. Return HTML document
    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${deal.deal_id}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating agreement:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});