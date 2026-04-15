import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27' as any,
});

export default async function handler(req: any, res: any) {
  try {
    console.log("Incoming request:", req.method, req.url);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, email } = req.body || {};

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing userId or email' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("CRITICAL: Missing STRIPE_SECRET_KEY");
      return res.status(500).json({ error: 'Stripe is not configured on the server' });
    }

    if (!process.env.VITE_STRIPE_PRO_PRICE_ID) {
      console.error("CRITICAL: Missing VITE_STRIPE_PRO_PRICE_ID");
      return res.status(500).json({ error: 'Stripe Price ID is not configured' });
    }

    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.VITE_STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard`,
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        userId,
      },
    });

    console.log("Checkout session created successfully:", session.id);
    return res.status(200).json({ id: session.id, url: session.url });

  } catch (error: any) {
    console.error("API ERROR (create-checkout-session):", error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}
