export default function handler(req: any, res: any) {
  try {
    console.log("Incoming Test request:", req.method, req.url);
    
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
        supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        app_url: !!process.env.APP_URL
      }
    });
  } catch (error: any) {
    console.error("API ERROR (test):", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
