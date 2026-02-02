
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
            text: `Analizza questa etichetta tecnica KME. 
              Estrai i dati seguendo RIGOROSAMENTE queste istruzioni:
              
              1. SCHEDA: Il numero dopo 'SCHEDA' o 'ORDER N.'.
              2. CLIENTE: Ragione sociale completa.
              3. PESO TEORICO (ordine_kg_lavorato): È il numero situato FISICAMENTE SOPRA il peso ordinato nel blocco quantità.
              4. PESO ORDINATO (ordine_kg_richiesto): È il numero situato SOTTO il peso teorico.
              5. MISURA: La larghezza nominale.
              6. SPESSORE: Es. 0.30, 0.45.
              7. MCOIL: Il codice della bobina di partenza (es. MC...).

              Restituisci questo JSON preciso:
              {
                "scheda": intero,
                "cliente": "stringa",
                "misura": decimale,
                "ordine_kg_lavorato": intero,
                "ordine_kg_richiesto": intero,
                "data_consegna": "YYYY-MM-DD",
                "mcoil": "stringa",
                "mcoil_kg": intero,
                "spessore": decimale,
                "mcoil_larghezza": intero,
                "mcoil_lega": "stringa",
                "mcoil_stato_fisico": "stringa",
                "conferma_voce": "stringa"
              }
              IMPORTANTE: Se un valore non è leggibile, usa null. Non aggiungere testo extra.`
          }
        ]
      },
      config: {
        temperature: 0,
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

    res.status(200).json(JSON.parse(response.text.trim()));
  } catch (error: any) {
    console.error("Errore API:", error);
    res.status(500).json({ error: "Errore analisi IA." });
  }
}
