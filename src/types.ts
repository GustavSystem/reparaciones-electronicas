
export enum RepairStep {
  Safety = 'safety',
  Identification = 'identification',
  Boardview = 'boardview',
  Measurement = 'measurement',
  Diagnostics = 'diagnostics',
  Component = 'component'
}

export type AIProvider = 'gemini' | 'ollama';

export interface AppSettings {
  aiProvider: AIProvider;
  ollamaUrl: string;
  ollamaTextModel: string;
  ollamaVisionModel: string;
}

export interface PCBAnalysisResult {
  manufacturer: string;
  model: string;
  boardNumber: string;
  confidence: number;
  identifiedComponents: string[];
  detectedAnomalies: string[];
}

export interface MeasurementPoint {
  id: string;
  component: string;
  testPoint: string;
  mode: 'V' | 'Diode' | 'Ohm';
  expectedValue: string;
  description: string;
  measuredValue?: string;
  status?: 'pending' | 'ok' | 'fail';
  coordinates?: number[]; // [ymin, xmin, ymax, xmax] en escala 0-100
}

export interface DiagnosticTurn {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: number;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  tags: string[]; // Ej: ["iPhone X", "No Enciende", "IC Carga"]
  content: string; // El conocimiento destilado
  source: string; // URL de Youtube o "Experiencia Propia"
  timestamp: number;
}