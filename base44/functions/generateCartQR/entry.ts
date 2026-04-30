import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import QRCode from 'npm:qrcode@1.5.3';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Generate cart QR code pointing to checkout station
    // Format: cart:<userId> or full URL with userId param
    const cartCode = `cart:${user.id}`;
    const qrDataUrl = await QRCode.toDataURL(cartCode, { width: 300, margin: 2 });

    return Response.json({
      qr_data_url: qrDataUrl,
      cart_code: cartCode,
      user_id: user.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});