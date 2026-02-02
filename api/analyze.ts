
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
    return res.status(500).json({ error: 'Configurazione server errata: API_KEY mancante' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Usiamo Gemini 3 Pro per la massima precisione richiesta dall'utente
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: image
            }
          },
          {
            text: `Agisci come un esperto di data entry industriale KME. Analizza questa scheda tecnica di produzione.
            ESTRAI I SEGUENTI DATI:

            1. SCHEDA: Il numero che segue "Scheda n°" nella parte superiore (es: 5926).
            2. CLIENTE: Il nome della ditta che si trova sotto "Conferma-Voce". Solitamente preceduto da un codice numerico (es: da "03041690 - SIRIO ELETTRONICA SR" estrai "SIRIO ELETTRONICA SR").
            3. MASTER COIL: Il codice sotto "Master Coil :" (es: EM020458).
            4. PESO MC (Kg): Il valore sotto "Kg MC :" (es: 3.166).
            5. SPESSORE MC: Il valore sotto "Spessore MC :" (es: 0.3).
            6. LARGHEZZA MC: Il valore sotto "Larghezza MC :" (es: 1050).
            7. LEGA: Il valore sotto "Lega :" (es: CUETP).
            8. QTA ORDINATA KG (ordine_kg_richiesto): Il valore numerico dopo "Qtà Ordinata Kg :" (es: 400).
            9. PESO TEORICO (ordine_kg_lavorato): Il valore posizionato sopra il peso finale.
            10. MISURA (LARGHEZZA TAGLIO): Il valore numerico dopo "Largh. :" nella sezione dei dettagli di taglio (es: 40).
            11. DATA CONSEGNA (D.Cli.): Estrai il valore sotto "D.Cli." (es: 06-02). 
                CONVERSIONE DATA: Convertilo in YYYY-MM-DD usando l'anno 2026 se non diversamente specificato. Quindi 06-02 diventa 2026-02-06.

            Restituisci ESCLUSIVAMENTE un JSON puro secondo questo schema:
            {
              "scheda": numero,
              "cliente": "stringa",
              "mcoil": "stringa",
              "mcoil_kg": numero,
              "spessore": numero,
              "mcoil_larghezza": numero,
              "mcoil_lega": "stringa",
              "ordine_kg_richiesto": numero,
              "ordine_kg_lavorato": numero,
              "misura": numero,
              "data_consegna": "YYYY-MM-DD"
            }`
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
            mcoil: { type: Type.STRING, nullable: true },
            mcoil_kg: { type: Type.NUMBER, nullable: true },
            spessore: { type: Type.NUMBER, nullable: true },
            mcoil_larghezza: { type: Type.INTEGER, nullable: true },
            mcoil_lega: { type: Type.STRING, nullable: true },
            ordine_kg_richiesto: { type: Type.INTEGER, nullable: true },
            ordine_kg_lavorato: { type: Type.INTEGER, nullable: true },
            misura: { type: Type.NUMBER, nullable: true },
            data_consegna: { type: Type.STRING, nullable: true }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Risposta vuota dall'IA");
    
    res.status(200).json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Errore API Analisi KME:", error);
    res.status(500).json({ error: "Analisi fallita: " + error.message });
  }
}
