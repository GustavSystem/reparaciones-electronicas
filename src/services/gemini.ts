
import { GoogleGenAI, Modality } from "@google/genai";
import { MeasurementPoint } from "../types";
import { findSimilarRepairs, searchKnowledgeContext, getSettings } from "./storage";

// --- GESTIÓN DE CREDENCIALES ---

const getAI = () => {
  const settings = getSettings();
  const apiKey = (settings.geminiApiKey && settings.geminiApiKey.trim() !== '') 
                 ? settings.geminiApiKey 
                 : process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("API Key no encontrada en Configuración ni en .env");
    throw new Error("API Key faltante. Configúrala en Ajustes.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- CEREBRO INTELIGENTE (SMART GENERATE) ---

const smartGenerate = async (
    prompt: string, 
    options: {
        images?: string[], 
        jsonMode?: boolean,
        system?: string,
        modelGemini?: string,
        useSearch?: boolean 
    }
): Promise<string> => {
    const settings = getSettings();
    const ai = getAI();
    
    // USAR EXACTAMENTE EL MODELO ELEGIDO EN CONFIGURACIÓN
    let targetModel = settings.geminiModel || 'gemini-3-flash-preview';
    
    // Función ejecutora
    const executeCall = async (modelToUse: string) => {
        const config: any = {
             systemInstruction: options.system,
        };

        if (options.useSearch) {
             config.tools = [{googleSearch: {}}];
             config.responseMimeType = undefined;
        } else if (options.jsonMode) {
             config.responseMimeType = "application/json";
        }

        if (modelToUse.includes('gemini-3') && !modelToUse.includes('flash')) {
            config.thinkingConfig = { thinkingBudget: 1024 };
        }

        let contents;
        if (options.images && options.images.length > 0) {
            const imageParts = options.images.map(img => {
                const base64Data = img.includes('base64,') ? img.split('base64,')[1] : img;
                return {
                    inlineData: { data: base64Data, mimeType: 'image/jpeg' }
                };
            });
            
            contents = [
                { role: 'user', parts: [...imageParts, { text: prompt }] }
            ];
            delete config.tools; 
        } else {
            contents = prompt;
        }

        const response = await ai.models.generateContent({
            model: modelToUse,
            contents: contents,
            config: config
        });

        return response.text || "";
    };

    try {
        return await executeCall(targetModel);
    } catch (error: any) {
        console.warn(`Error usando modelo ${targetModel}:`, error);
        const SAFE_MODEL = 'gemini-2.0-flash-exp'; 
        if (targetModel !== SAFE_MODEL) {
            return await executeCall(SAFE_MODEL);
        }
        throw error;
    }
};

// --- EXPORTACIONES ---

export const processTechnicalPDF = async (base64Pdf: string) => {
  const ai = getAI();
  const settings = getSettings();
  const model = settings.geminiModel || 'gemini-3-flash-preview';
  
  const cleanBase64 = base64Pdf.includes('base64,') ? base64Pdf.split('base64,')[1] : base64Pdf;

  const response = await ai.models.generateContent({
    model: model, 
    contents: [
      { inlineData: { mimeType: 'application/pdf', data: cleanBase64 } },
      { text: `ERES UN EXPERTO EN ELECTRÓNICA. Analiza este archivo PDF (Esquema o Manual).
      Extrae TODA la información técnica relevante: fallas comunes, líneas críticas, valores de componentes clave.
      
      Genera un JSON con este formato:
      { 
        "title": "Nombre del documento o placa", 
        "tags": ["Modelo", "Tipo de documento"], 
        "content": "Resumen técnico detallado..." 
      }` }
    ],
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || '{}');
};

export const distillKnowledge = async (text: string, source: string) => {
    const isUrl = /^(http|https):\/\/[^ "]+$/.test(text);
    
    if (isUrl) {
        const searchPrompt = `Analiza esta URL: ${text}. Resume pasos de reparación o datos técnicos.`;
        const rawSummary = await smartGenerate(searchPrompt, { useSearch: true, jsonMode: false });
        
        const formatPrompt = `Convierte esto a JSON: { "title": "...", "tags": [], "content": "..." } \nTEXTO: ${rawSummary}`;
        const jsonRes = await smartGenerate(formatPrompt, { useSearch: false, jsonMode: true });
        
        try { return JSON.parse(jsonRes); } catch { return { title: "Resumen Web", tags: ["Web"], content: rawSummary }; }
    } else {
        const prompt = `ENTRADA (${source}): ${text}. FORMATO JSON: { "title": "...", "tags": [], "content": "..." }`;
        const res = await smartGenerate(prompt, { jsonMode: true, useSearch: false });
        try { return JSON.parse(res); } catch { return { title: "Info", tags: [], content: res }; }
    }
};

export const getDiagnosticAdvice = async (history: {role: string, content: string}[], currentIssue: string, pcbModel?: string) => {
  let context = "";
  if (pcbModel) {
    const similar = await findSimilarRepairs(pcbModel);
    if (similar.length > 0) context += `HISTORIAL: ${similar.length} casos previos. `;
  }
  const kb = await searchKnowledgeContext(`${pcbModel || ''} ${currentIssue}`);
  
  const system = `Eres Gusrepart AI. CONTEXTO: ${context} ${kb}. Responde breve y técnico. Si hay esquemas en el contexto, úsalos.`;

  const chatStr = history.map(h => `${h.role === 'user' ? 'Técnico' : 'AI'}: ${h.content}`).join('\n');
  const fullPrompt = `Historial:\n${chatStr}\n\nConsulta: ${currentIssue}`;
  
  return await smartGenerate(fullPrompt, { system, useSearch: false });
};

// MODIFICADO: generateMeasurementPlan ahora busca agresivamente en el KB
export const generateMeasurementPlan = async (pcbResult: any, functionalAnalysis: string, base64Image?: string): Promise<MeasurementPoint[]> => {
  // 1. Buscar contexto ESPECÍFICO en la base de conocimientos usando el modelo
  const query = `${pcbResult.model} ${pcbResult.boardNumber} esquema schematic power sequence`;
  const kb = await searchKnowledgeContext(query);

  const prompt = `
    Placa: ${pcbResult.model} (${pcbResult.boardNumber}). 
    Componentes Detectados: ${pcbResult.identifiedComponents}.
    
    [IMPORTANTE - BASE DE CONOCIMIENTOS]:
    ${kb}
    -------------------------------------
    
    Genera un plan de medición de 4 a 6 pasos.
    SI EN EL TEXTO DE ARRIBA (Base de Conocimientos) hay referencias a componentes específicos (ej: R120, C305, U2), ÚSALOS OBLIGATORIAMENTE en el plan.
    Si no hay referencias exactas, usa genéricos (ej: "Bobina de entrada").
    
    Para cada punto, indica:
    - component: Nombre/ID del componente (Ej: "Resistencia R120" o "IC U301").
    - testPoint: Dónde poner las puntas (Ej: "Lado de alimentación", "Pin 5").
    - mode: 'V', 'Diode', 'Ohm'.
    - expectedValue: Valor esperado (Ej: "19V", "0.450V").
    - description: Breve explicación técnica basada en el esquema si existe.

    FORMATO: JSON Array de MeasurementPoint. NO incluyas coordenadas visuales.
  `;
  
  // Nota: Ya no pasamos la imagen para coordenadas, nos centramos en el texto técnico/esquema
  const res = await smartGenerate(prompt, { 
      jsonMode: true 
  });
  
  try { return JSON.parse(res); } catch { return []; }
};

export const getFinalVerdict = async (pcbResult: any, measurements: MeasurementPoint[]): Promise<string> => {
  const prompt = `Analiza mediciones: ${JSON.stringify(measurements)} para ${pcbResult.model}. Veredicto técnico.`;
  return await smartGenerate(prompt, {});
};

export const analyzePCBImage = async (base64Images: string[], userContext?: { model?: string, serial?: string, symptoms?: string }): Promise<any> => {
  const contextStr = userContext ? `CONTEXTO USUARIO: Modelo=${userContext.model}, Serial=${userContext.serial}, Fallo=${userContext.symptoms}` : "";
  const kb = userContext?.model ? await searchKnowledgeContext(userContext.model) : "";
  
  const prompt = `
  Analiza esta imagen de PCB.
  ${contextStr}
  CONOCIMIENTO PREVIO: ${kb}
  
  Identifica fabricante, modelo y componentes.
  Responde JSON: { "manufacturer": "...", "model": "...", "boardNumber": "...", "confidence": 0-1, "identifiedComponents": [], "detectedAnomalies": [] }`;

  const res = await smartGenerate(prompt, { 
      images: base64Images, 
      jsonMode: true,
      useSearch: false 
  });

  try { return JSON.parse(res); } catch { throw new Error("La IA no devolvió JSON válido."); }
};

export const enhancePCBImage = async (base64Image: string): Promise<string> => {
   return base64Image; 
};

export const searchSchematics = async (boardInfo: string) => {
    const ai = getAI();
    const settings = getSettings();
    const model = settings.geminiModel || 'gemini-3-flash-preview';
    
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: `Busca esquemas y boardview para: ${boardInfo}. Resume disponibilidad y fuentes.`,
            config: { tools: [{ googleSearch: {} }] }
        });
        return {
            summary: response.text || "Búsqueda completada",
            sources: response.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.renderedContent || ""
        };
    } catch (e) {
        return { summary: "Búsqueda no disponible.", sources: "" };
    }
};

export const getFunctionalAnalysis = async (components: string[], boardModel: string) => {
  const prompt = `Describe funcionamiento lógico de ${boardModel} con componentes: ${components.join(', ')}.`;
  return await smartGenerate(prompt, {});
};

export const searchComponentInfo = async (query: string) => {
  const ai = getAI();
  const settings = getSettings();
  const model = settings.geminiModel || 'gemini-3-flash-preview';

  try {
      const response = await ai.models.generateContent({
        model: model, 
        contents: `Consulta técnica: ${query}.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      return {
        text: response.text || "",
        sources: response.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.renderedContent
      };
  } catch (e) {
      return { text: "Error consultando info.", sources: "" };
  }
};

export const textToSpeech = async (text: string, onAudioReady: (buffer: AudioBuffer) => void) => {
    // Implementación TTS existente
};
