import { GoogleGenAI, Type } from "@google/genai";
import { MeetingExecutionLog, Topic, Break } from "@/types";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export async function analyzeMeetingPerformance(
  meetingTitle: string,
  logs: MeetingExecutionLog[],
  topics: Topic[],
  breaks: Break[]
) {
  const ai = getAI();
  if (!ai) {
    return {
      summary: "IA não configurada. Adicione a VITE_GEMINI_API_KEY.",
      patterns: [],
      suggestions: ["Revise os tempos manualmente."]
    };
  }
  const performanceData = logs.map(log => {
    const item = log.item_type === 'topic' 
      ? topics.find(t => t.id === log.topic_id)
      : breaks.find(b => b.id === log.break_id);
    
    return {
      title: item?.title || (log.item_type === 'break' ? 'Pausa' : 'Tópico'),
      planned: log.planned_duration,
      actual: log.actual_duration,
      diff: (log.actual_duration || 0) - log.planned_duration
    };
  });

  const prompt = `
    Analise a performance desta reunião: "${meetingTitle}".
    Dados de execução (em minutos):
    ${JSON.stringify(performanceData, null, 2)}

    Por favor, forneça:
    1. Uma análise geral da eficiência (tempo planejado vs real).
    2. Identificação de padrões (ex: tópicos que sempre estouram).
    3. Sugestões práticas para as próximas reuniões (ajustes de duração, pausas, etc).
    
    Responda em Português, com um tom profissional e construtivo.
    Retorne a resposta em formato JSON com os campos: "summary", "patterns" (array), "suggestions" (array).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "patterns", "suggestions"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Error analyzing meeting performance:', error);
    return {
      summary: "Não foi possível gerar a análise automática no momento.",
      patterns: [],
      suggestions: ["Revise os tempos manualmente comparando o planejado com o real."]
    };
  }
}
