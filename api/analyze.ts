
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Accetta solo richieste POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Immagine mancante nella richiesta' });
  }

  // La chiave viene letta direttamente dall'ambiente di Vercel (lato server)
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Configurazione server errata: API_KEY mancante' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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
            text: `Sei un sistema di data entry per KME ITALY SPA. Analizza l'immagine della scheda tecnica e restituisci un JSON.
              
              MAPPA QUESTI CAMPI DALL'IMMAGINE:
              - "Scheda n°" -> scheda (Numero Intero)
              - "Master Coil :" -> mcoil (Stringa, es. EM018539)
              - "Kg MC :" -> mcoil_kg (Numero Intero)
              - "Spessore MC :" -> spessore (Numero con decimali)
              - "Larghezza MC :" -> mcoil_larghezza (Numero Intero)
              - "Lega :" -> mcoil_lega (Stringa)
              - "Stato Fisico :" -> mcoil_stato_fisico (Stringa)
              - "Conferma-Voce :" -> conferma_voce (Stringa)
              - "METALLI ITALIA SRL" -> cliente (Nome della ditta)
              - "Qtà Taglio :" -> ordine_kg_lavorato (Numero Intero)
              - "Qtà Ordinata Kg :" -> ordine_kg_richiesto (Numero Intero)
              - "Largh. :" -> misura (Numero con decimali)
              - "D.Cli." -> data_consegna (Formato GG-MM, convertilo in YYYY-MM-DD del 2025)

              Restituisci esclusivamente il JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scheda: { type: Type.INTEGER },
            mcoil: { type: Type.STRING },
            mcoil_kg: { type: Type.INTEGER },
            spessore: { type: Type.NUMBER },
            mcoil_larghezza: { type: Type.INTEGER },
            mcoil_lega: { type: Type.STRING },
            mcoil_stato_fisico: { type: Type.STRING },
            conferma_voce: { type: Type.STRING },
            cliente: { type: Type.STRING },
            ordine_kg_lavorato: { type: Type.INTEGER },
            ordine_kg_richiesto: { type: Type.INTEGER },
            misura: { type: Type.NUMBER },
            data_consegna: { type: Type.STRING }
          },
          required: ["scheda", "cliente", "misura"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Risposta vuota dall'IA");
    
    res.status(200).json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Errore Server API:", error);
    res.status(500).json({ error: error.message || "Errore durante l'analisi" });
  }
}
