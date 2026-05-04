import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This function should be called periodically (e.g., daily) to send notifications
        // For demo purposes, we'll process a limited number of users
        
        const { user_id } = await req.json();
        
        if (!user_id) {
            return Response.json({ error: 'user_id required' }, { status: 400 });
        }

        // Get user data
        const users = await base44.asServiceRole.entities.User.list();
        const user = users.find(u => u.id === user_id);
        
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        // Get new estate sales from last 24 hours
        const allSales = await base44.asServiceRole.entities.EstateSale.list('-created_date', 50);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newSales = allSales.filter(s => 
            new Date(s.created_date) > oneDayAgo && 
            (s.status === 'upcoming' || s.status === 'active')
        );

        if (newSales.length === 0) {
            return Response.json({ message: 'No new sales to notify about' });
        }

        // Get user's activity to understand preferences
        const userMessages = await base44.asServiceRole.entities.Message.filter({ 
            recipient_id: user_id 
        }, '-created_date', 10);
        
        const userOrders = await base44.asServiceRole.entities.Order.filter({ 
            buyer_id: user_id 
        }, '-created_date', 10);

        // Use AI to analyze which sales match user interests
        const analysisPrompt = `Analyze these new estate sales and determine which ones would be most relevant to this user based on their profile and activity.

User Profile:
- Name: ${user.full_name}
- Email: ${user.email}
- Interests: ${user.interests?.join(', ') || 'General'}
- Service Area: ${user.service_area || 'Not specified'}

User Activity Summary:
- Recent interactions: ${userMessages.length} messages
- Purchase history: ${userOrders.length} orders
- Order categories: ${userOrders.map(o => o.items?.map(i => i.item_title)).flat().join(', ')}

New Estate Sales (last 24 hours):
${newSales.map(s => `
- ID: ${s.id}
  Title: ${s.title}
  Location: ${s.property_address?.city}, ${s.property_address?.state}
  Categories: ${s.categories?.join(', ')}
  Description: ${s.description?.substring(0, 200)}
`).join('\n')}

Select up to 3 sales that best match the user's interests and provide:
1. Which sales to include
2. A personalized introduction paragraph explaining why these sales were selected
3. A compelling subject line for the email

Return in this JSON format:
{
  "should_send": true/false,
  "subject": "Subject line",
  "intro": "Personalized introduction paragraph",
  "selected_sale_ids": ["id1", "id2", "id3"]
}`;

        const aiAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    should_send: { type: "boolean" },
                    subject: { type: "string" },
                    intro: { type: "string" },
                    selected_sale_ids: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        if (!aiAnalysis.should_send || aiAnalysis.selected_sale_ids.length === 0) {
            return Response.json({ message: 'No relevant sales for this user' });
        }

        // Get full details of selected sales
        const selectedSales = newSales.filter(s => 
            aiAnalysis.selected_sale_ids.includes(s.id)
        );

        // Build email HTML
        const salesHTML = selectedSales.map(sale => `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: white;">
                <h3 style="color: #1e293b; margin: 0 0 8px 0;">${sale.title}</h3>
                <p style="color: #64748b; margin: 0 0 8px 0;">
                    📍 ${sale.property_address?.street}, ${sale.property_address?.city}, ${sale.property_address?.state}
                </p>
                ${sale.categories?.length > 0 ? `
                    <p style="color: #64748b; margin: 0 0 8px 0;">
                        Categories: ${sale.categories.join(', ')}
                    </p>
                ` : ''}
                ${sale.sale_dates?.[0] ? `
                    <p style="color: #64748b; margin: 0 0 12px 0;">
                        📅 ${new Date(sale.sale_dates[0].date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </p>
                ` : ''}
                <a href="https://app.legacylane.com/EstateSaleDetail?id=${sale.id}" 
                   style="display: inline-block; background: #f97316; color: white; padding: 8px 16px; 
                          text-decoration: none; border-radius: 6px; font-weight: 500;">
                    View Details
                </a>
            </div>
        `).join('');

        const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
             background: #f8fafc; padding: 20px; margin: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; 
                box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
                    padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-family: Georgia, serif;">
                Legacy Lane
            </h1>
            <p style="color: #fbbf24; margin: 8px 0 0 0; font-size: 14px;">
                Estate Sale Finder
            </p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 22px;">
                Hi ${user.full_name}! 👋
            </h2>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                ${aiAnalysis.intro}
            </p>

            <h3 style="color: #1e293b; margin: 0 0 16px 0; font-size: 18px;">
                🎯 Recommended for You
            </h3>

            ${salesHTML}

            <div style="text-align: center; margin-top: 32px; padding-top: 24px; 
                        border-top: 1px solid #e2e8f0;">
                <a href="https://app.legacylane.com/EstateSaleFinder" 
                   style="display: inline-block; background: #0891b2; color: white; 
                          padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                          font-weight: 600; font-size: 16px;">
                    Browse All Estate Sales
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 24px; text-align: center; 
                    border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
                You're receiving this email because you're a Legacy Lane member.<br>
                © 2025 Legacy Lane. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        `;

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            subject: aiAnalysis.subject,
            body: emailBody,
            from_name: 'Legacy Lane'
        });

        return Response.json({ 
            success: true, 
            message: `Sent ${selectedSales.length} personalized recommendations to ${user.email}`,
            sales_sent: selectedSales.length
        });

    } catch (error) {
        console.error('Notification error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});