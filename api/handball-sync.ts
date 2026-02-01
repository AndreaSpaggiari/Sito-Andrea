
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { image } = req.body;
  const apiKey = process.env.API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'Configurazione server errata' });

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Prompt più sintetico per risposte IA più rapide
    const contents = {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: image } },
        { text: `Estrai le partite di pallamano da questo screenshot.
          REGOLE:
          - giornata: Numero intero.
          - data_partita: YYYY-MM-DD (estrai da colonne data/orario).
          - squadra_casa: "Squadra A".
          - squadra_ospite: "Squadra B".
          - punti_casa: primo numero colonna "RIS" o null.
          - punti_ospite: secondo numero colonna "RIS" o null.
          Solo JSON.` }
      ]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              giornata: { type: Type.INTEGER },
              data_partita: { type: Type.STRING },
              squadra_casa: { type: Type.STRING },
              squadra_ospite: { type: Type.STRING },
              punti_casa: { type: Type.INTEGER, nullable: true },
              punti_ospite: { type: Type.INTEGER, nullable: true }
            },
            required: ["squadra_casa", "squadra_ospite", "data_partita"]
          }
        }
      }
    });

    res.status(200).json(JSON.parse(response.text.trim()));
  } catch (error: any) {
    console.error("Errore API Sync:", error);
    res.status(500).json({ error: "L'analisi ha fallito. Riprova con un'immagine più nitida." });
  }
}
