
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
            text: `Analizza questa etichetta tecnica di produzione metalli KME. 
              Estrai TUTTI i dati con estrema precisione. 
              
              ISTRUZIONI CRITICHE:
              - SCHEDA: Numero dopo 'SCHEDA' o in alto a destra.
              - CLIENTE: Ragione sociale dell'azienda.
              - PESO TEORICO (ordine_kg_lavorato): Il numero solitamente sopra la quantità ordinata.
              - PESO ORDINATO (ordine_kg_richiesto): La quantità finale richiesta dal cliente.
              - MISURA: Larghezza nastro richiesta.
              - MCOIL: Codice della bobina madre (es. MC... o numero bobina).
              - LEGA/STATO: Es. RAME, R240, COTTO, CRUDO.

              Restituisci questo JSON preciso:
              {
                "scheda": intero,
                "cliente": "stringa",
                "misura": decimale,
                "ordine_kg_lavorato": intero (peso teorico),
                "ordine_kg_richiesto": intero (peso ordinato),
                "data_consegna": "YYYY-MM-DD",
                "mcoil": "stringa",
                "mcoil_kg": intero,
                "spessore": decimale,
                "mcoil_larghezza": intero,
                "mcoil_lega": "stringa",
                "mcoil_stato_fisico": "stringa",
                "conferma_voce": "stringa"
              }
              Se un dato non è leggibile, usa null. Non inventare.`
          }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scheda: { type: Type.INTEGER, nullable: true },
            cliente: { type: Type.STRING, nullable: true },
            misura: { type: Type.NUMBER, nullable: true },
            ordine_kg_lavorato: { type: Type.INTEGER, nullable: true },
            ordine_kg_richiesto: { type: Type.INTEGER, nullable: true },
            data_consegna: { type: Type.STRING, nullable: true },
            mcoil: { type: Type.STRING, nullable: true },
            mcoil_kg: { type: Type.INTEGER, nullable: true },
            spessore: { type: Type.NUMBER, nullable: true },
            mcoil_larghezza: { type: Type.INTEGER, nullable: true },
            mcoil_lega: { type: Type.STRING, nullable: true },
            mcoil_stato_fisico: { type: Type.STRING, nullable: true },
            conferma_voce: { type: Type.STRING, nullable: true }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Risposta vuota");
    
    res.status(200).json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Errore API Analisi:", error);
    res.status(500).json({ error: "Errore durante l'analisi." });
  }
}
