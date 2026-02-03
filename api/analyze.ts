
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Immagine mancante' });

  const apiKey = process.env.API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Configurazione server errata: API_KEY mancante' });

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Schema rigoroso basato sulla foto dell'utente
    const RESPONSE_SCHEMA = {
      type: Type.OBJECT,
      properties: {
        scheda: { type: Type.STRING, description: "Numero dopo 'Scheda n°' (es: 5431)" },
        mcoil: { type: Type.STRING, description: "Codice dopo 'Master Coil :' (es: EM018539)" },
        mcoil_kg: { type: Type.STRING, description: "Valore dopo 'Kg MC :' (es: 4.328)" },
        spessore: { type: Type.STRING, description: "Valore dopo 'Spessore MC :' (es: 0.5)" },
        mcoil_larghezza: { type: Type.STRING, description: "Valore dopo 'Larghezza MC :' (es: 1055)" },
        id_cliente: { type: Type.STRING, description: "Codice numerico che precede il nome cliente (es: 03038553)" },
        conferma_voce: { type: Type.STRING, description: "Codice dopo 'Conferma-Voce :' (es: 837820-1)" },
        cliente: { type: Type.STRING, description: "Ragione sociale del cliente (es: METALLI ITALIA SRL)" },
        mcoil_lega: { type: Type.STRING, description: "Valore dopo 'Lega :' (es: CUETP)" },
        mcoil_stato_fisico: { type: Type.STRING, description: "Valore dopo 'Stato Fisico :' (es: Ricotto generico)" },
        data_consegna: { type: Type.STRING, description: "Data sotto 'D.Cli.' (es: 03-12)" },
        ordine_kg_lavorati: { type: Type.STRING, description: "Valore dopo 'Qtà Taglio :' (es: 1.012)" },
        ordine_kg_richiesto: { type: Type.STRING, description: "Valore dopo 'Qtà Ordinata Kg :' (es: 1.000)" },
        misura: { type: Type.STRING, description: "Valore dopo 'Largh. :' incluse tolleranze (es: 10 (+0,200 / -0,200))" },
      },
      required: [
        "scheda", "mcoil", "mcoil_kg", "spessore", "mcoil_larghezza", 
        "id_cliente", "conferma_voce", "cliente", "mcoil_lega", 
        "mcoil_stato_fisico", "data_consegna", "ordine_kg_lavorati", 
        "ordine_kg_richiesto", "misura"
      ],
    };

    const prompt = `
      Analizza questa scheda tecnica KME ITALY SPA. Estrai i dati con estrema precisione.
      Punti di riferimento visivi:
      - IN ALTO: 'Scheda n°' (4 cifre).
      - RIGA 1 NOTA: 'Master Coil' (codice), 'Kg MC', 'Spessore MC', 'Larghezza MC'.
      - RIGA 2 NOTA: 'Lega', 'Stato Fisico'.
      - BLOCCO CENTRALE SINISTRA: 'Conferma-Voce', 'Id Cliente' (codice numerico prima del nome), 'Cliente' (testo).
      - BLOCCO CENTRALE DESTRA: Data sotto 'D.Cli.'.
      - DETTAGLI PRODUZIONE: 'Qtà Taglio' (lavorato), 'Qtà Ordinata Kg' (richiesto).
      - DISEGNO/MISURE: Cerca 'Largh. :' per la misura con tolleranze.
      
      Ignora scritte a mano. Restituisci esclusivamente il JSON richiesto.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { 
            inlineData: { 
              mimeType: 'image/jpeg', 
              data: image.includes(',') ? image.split(',')[1] : image 
            } 
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text || "";
    // Pulizia di emergenza se l'IA include blocchi di codice markdown
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    res.status(200).json(JSON.parse(cleanJson));
  } catch (error: any) {
    console.error("Errore Gemini API:", error);
    res.status(500).json({ error: "Analisi fallita: " + error.message });
  }
}
