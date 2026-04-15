export default function handler(req: any, res: any) {
  console.log("Incoming request:", req.method, req.url);
  
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      stripe_price: !!process.env.VITE_STRIPE_PRO_PRICE_ID,
      stripe_webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      gemini: !!process.env.GEMINI_API_KEY,
      supabase_url: !!process.env.VITE_SUPABASE_URL,
      supabase_key: !!process.env.VITE_SUPABASE_ANON_KEY,
      app_url: !!process.env.APP_URL
    }
  });
}
