import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27' as any,
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error("Missing stripe-signature or STRIPE_WEBHOOK_SECRET");
      return res.status(400).send('Webhook Error: Missing signature or secret');
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    console.log("Stripe Webhook received:", event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      
      console.log("Subscription completed for session:", session.id, "User:", userId);
      
      if (userId) {
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan: 'pro',
            status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string
          }, { onConflict: 'user_id' });
        
        if (error) {
          console.error("Error updating subscription in Supabase:", error);
        } else {
          console.log("Subscription updated in Supabase for user:", userId);
        }
      }
    }

    return res.status(200).json({ received: true });

  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
