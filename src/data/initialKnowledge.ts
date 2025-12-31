
import { KnowledgeEntry } from "../types";

// AQUÍ PUEDES PEGAR TUS DATOS PARA QUE SEAN PERMANENTES (HARDCODED)
// Aunque se borre la base de datos del navegador, esto siempre se cargará al inicio.

export const INITIAL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "seed-iphone-audio",
    title: "iPhone 7/7 Plus - Falla de Audio (Loop Logo)",
    tags: ["iPhone 7", "Audio Codec", "C12", "Loop"],
    content: "Síntoma: El equipo tarda mucho en encender, se queda en la manzana o el dictado de voz no funciona. \n\nSolución: Falla clásica del IC de Audio (U3101). Se rompe la línea C12 (I2S_AP_TO_CODEC_MCLK) por flexión de la placa. \n\nReparación: Levantar IC, realizar jumper en pad C12 hacia la resistencia cercana o raspar pista, y hacer reballing.",
    source: "Experiencia de Taller / Curso Microsoldadura",
    timestamp: 1709251200000
  },
  {
    id: "seed-nintendo-switch-carga",
    title: "Nintendo Switch - No carga / Error 2101-0001",
    tags: ["Nintendo Switch", "M92T36", "Carga", "USB-C"],
    content: "Síntoma: Consola no carga, consume 0.4A y cae a 0A, o muestra código de error. \n\nDiagnóstico: Medir continuidad en capacitores alrededor del IC M92T36. Si hay corto, el IC suele estar dañado. Revisar también el puerto USB-C por pines doblados que causan el corto.",
    source: "InfoSquad / Youtube",
    timestamp: 1709337600000
  },
  {
    id: "seed-mosfet-check",
    title: "Cómo medir un MOSFET Canal N",
    tags: ["Componentes", "MOSFET", "Medición"],
    content: "1. Multímetro en Diodo. \n2. Punta negra en Drenador (D), Roja en Surtidor (S) -> Debe medir diodo (0.5V aprox). \n3. Invertir puntas -> OL (Abierto). \n4. Gatillar: Punta roja en Gate (G) un instante, luego volver a D y S -> Debe medir continuidad (cerca de 0V, activado). \n5. Descargar: Tocar G y S con el dedo o punta negra -> Vuelve a medir diodo.",
    source: "Fundamentos Electrónica",
    timestamp: 1709424000000
  }
];
