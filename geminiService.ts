
/**
 * SERVIZIO GEMINI (MODALITÀ SICURA)
 * Invia l'immagine alla nostra API server-side invece di chiamare direttamente Google.
 */
export const processLabelImage = async (base64Image: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout di 15 secondi

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
      const errorData = await response.json();
      throw new Error(errorData.error || `Errore server: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("Errore Chiamata Gemini:", error);
    if (error.name === 'AbortError') {
      throw new Error("Il server ha impiegato troppo tempo. Riprova.");
    }
    throw new Error(error.message || "Impossibile contattare il server di analisi");
  }
};
