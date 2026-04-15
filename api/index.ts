import app from "../server";

export default async (req: any, res: any) => {
  console.log(`[Vercel API] ${req.method} ${req.url}`);
  try {
    return app(req, res);
  } catch (error) {
    console.error("[Vercel API Error]:", error);
    res.status(500).json({ error: "Internal Server Error", details: String(error) });
  }
};
