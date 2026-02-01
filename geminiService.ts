
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processLabelImage = async (base64Image: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Sei un sistema di data entry per KME ITALY SPA. Analizza l'immagine della scheda tecnica e restituisci un JSON.
            
            MAPPA QUESTI CAMPI DALL'IMMAGINE:
            - "Scheda n°" -> scheda (Numero Intero)
            - "Master Coil :" -> mcoil (Stringa, es. EM018539)
            - "Kg MC :" -> mcoil_kg (Numero Intero, rimuovi i punti se presenti es. 4.328 diventa 4328)
            - "Spessore MC :" -> spessore (Numero con decimali, es. 0.5)
            - "Larghezza MC :" -> mcoil_larghezza (Numero Intero)
            - "Lega :" -> mcoil_lega (Stringa, es. CUETP)
            - "Stato Fisico :" -> mcoil_stato_fisico (Stringa, es. Ricotto generico)
            - "Conferma-Voce :" -> conferma_voce (Stringa, es. 837820-1)
            - "METALLI ITALIA SRL" (o simili sotto Conferma-Voce) -> cliente (Nome della ditta)
            - "Qtà Taglio :" -> ordine_kg_lavorato (Numero Intero, es. 1012. Rappresenta il peso teorico dell'ordine)
            - "Qtà Ordinata Kg :" -> ordine_kg_richiesto (Numero Intero, es. 1000)
            - "Largh. :" (nella sezione dettagli in basso) -> misura (Numero con decimali, es. 10.0)
            - "D.Cli." -> data_consegna (Formato GG-MM, convertilo in YYYY-MM-DD dell'anno corrente 2025)

            REGOLE:
            - Se un valore non è leggibile, usa null.
            - Restituisci esclusivamente il JSON.`
          }
        ]
      }
    ],
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
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Nessun dato estratto");
  return JSON.parse(text);
};
