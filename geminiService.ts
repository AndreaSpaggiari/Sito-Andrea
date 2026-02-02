
/**
 * SERVIZIO GEMINI (MODALITÀ SICURA)
 * Invia l'immagine alla nostra API server-side invece di chiamare direttamente Google.
 */
export const processLabelImage = async (base64Image: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // Aumentato a 30 secondi per il modello Pro

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = `Errore server: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        // Se non è JSON, leggi come testo per il log
        const text = await response.text();
        console.error("Risposta non JSON dal server:", text);
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("DEBUG Errore Chiamata AI:", error);
    if (error.name === 'AbortError') {
      throw new Error("Il server ha impiegato troppo tempo (Timeout 30s). Riprova.");
    }
    throw new Error(error.message || "Impossibile contattare il server di analisi");
  }
};
