export default function handler(req: any, res: any) {
  try {
    return res.status(200).json({ 
      status: "ok", 
      time: new Date().toISOString(),
      service: "Agenda Inteligente API"
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
