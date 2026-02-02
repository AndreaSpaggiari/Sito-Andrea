
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Immagine mancante' });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Configurazione server errata' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Usiamo gemini-3-flash-preview per la massima velocità
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: image
            }
          },
          {
            text: `Analizza questa scheda tecnica KME. Estrai i dati in JSON:
              - scheda (intero)
              - cliente (stringa)
              - misura (decimale)
              - ordine_kg_richiesto (intero)
              - data_consegna (YYYY-MM-DD)
              Restituisci solo il JSON.`
          }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scheda: { type: Type.INTEGER },
            cliente: { type: Type.STRING },
            misura: { type: Type.NUMBER },
            ordine_kg_richiesto: { type: Type.INTEGER },
            data_consegna: { type: Type.STRING }
          },
          required: ["scheda", "cliente", "misura"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Risposta vuota");
    
    res.status(200).json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Errore API Analisi:", error);
    res.status(500).json({ error: "Errore durante l'analisi dell'immagine." });
  }
}
