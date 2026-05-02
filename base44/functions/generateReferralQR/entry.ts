import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import QRCode from 'npm:qrcode@1.5.3';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Generate a personal referral QR code
    // Format: referral:<userId> or full URL with ref parameter
    const referralCode = user.id.slice(-8).toUpperCase();
    const baseUrl = new URL(req.url).origin;
    const referralLink = `${baseUrl}/?ref=${referralCode}`;
    
    const qrDataUrl = await QRCode.toDataURL(referralLink, { 
      width: 300, 
      margin: 2,
      errorCorrectionLevel: 'H'
    });

    return Response.json({
      qr_data_url: qrDataUrl,
      referral_code: referralCode,
      referral_link: referralLink,
      user_id: user.id,
      user_name: user.full_name,
      message: 'Share this QR code with operators to join your referral program'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});