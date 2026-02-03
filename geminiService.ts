
/**
 * SERVIZIO GEMINI (MODALITÀ SICURA)
 * Invia l'immagine alla nostra API server-side invece di chiamare direttamente Google.
 * Questo impedisce l'esposizione della API_KEY nel browser.
 */
export const processLabelImage = async (base64Image: string) => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Errore server: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Errore Chiamata Sicura Gemini:", error);
    throw new Error(error.message || "Impossibile contattare il server di analisi");
  }
};
