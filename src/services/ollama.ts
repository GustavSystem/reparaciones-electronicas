
import { getSettings } from "./storage";

// Helper para extraer JSON de respuestas "sucias" de modelos locales
// Helper para extraer JSON de respuestas "sucias" de modelos locales
const extractJSON = (text: string): any => {
    try {
        // 1. Intento directo
        return JSON.parse(text);
    } catch (e) {
        // 2. Buscar Arrays [...] (Prioridad para listas)
        const startArr = text.indexOf('[');
        const endArr = text.lastIndexOf(']');

        // 3. Buscar Objetos {...}
        const startObj = text.indexOf('{');
        const endObj = text.lastIndexOf('}');

        // Decidimos cuál intentar parsear
        try {
            if (startArr !== -1 && endArr !== -1 && (startObj === -1 || startArr < startObj)) {
                // Es un array
                return JSON.parse(text.substring(startArr, endArr + 1));
            } else if (startObj !== -1 && endObj !== -1) {
                // Es un objeto
                return JSON.parse(text.substring(startObj, endObj + 1));
            }
        } catch (e2) {
            console.error("JSON extraction failed", text);
        }

        // 4. Fallback: Devolver array vacío si se esperaba lista, o objeto vacío
        // Para evitar el error .map is not a function, si el texto menciona "[]" devolvemos eso.
        return [];
    }
};

export const ollamaGenerate = async (prompt: string, images?: string[], system?: string, formatJSON: boolean = false): Promise<string> => {
    const settings = getSettings();
    const model = images && images.length > 0 ? settings.ollamaVisionModel : settings.ollamaTextModel;
    const url = `${settings.ollamaUrl.replace(/\/$/, '')}/api/generate`;

    // Para modelos de vision (LLaVA), el sistema suele ir en el prompt o ignorarse
    const fullPrompt = system ? `${system}\n\nUser: ${prompt}` : prompt;

    const payload: any = {
        model: model,
        prompt: fullPrompt,
        stream: false,
        options: {
            temperature: 0.2, // Baja temperatura para análisis técnicos
            num_ctx: 4096     // Contexto más amplio
        }
    };

    if (images && images.length > 0) {
        // Ollama espera base64 crudo
        payload.images = images.map(img => img.includes(',') ? img.split(',')[1] : img);
    }

    if (formatJSON) {
        payload.format = "json";
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}. Asegúrate de ejecutar 'ollama serve' y configurar CORS.`);
        }

        const data = await response.json();

        // Si pedimos JSON, intentamos limpiarlo aquí mismo
        if (formatJSON) {
            const raw = data.response;
            try {
                // Intentamos parsear para validar
                const cleaned = extractJSON(raw);
                // Devolvemos el string limpio (stringify) para que gemini.ts pueda hacer su JSON.parse tranquilo
                // O mejor, devolvemos el objeto si cambiamos la firma, pero para mantener compatibilidad devolvemos string JSON válido
                return JSON.stringify(cleaned);
            } catch (e) {
                console.warn("Failed to extract JSON from Ollama response", raw);
                return raw; // Devolvemos raw y dejamos que falle después o se maneje
            }
        }

        return data.response;
    } catch (error) {
        console.error("Ollama connection failed:", error);
        throw new Error("No se pudo conectar con Ollama. Verifica que se esté ejecutando en tu PC.");
    }
};
