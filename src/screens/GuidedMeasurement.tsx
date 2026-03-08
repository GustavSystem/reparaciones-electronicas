
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateMeasurementPlan, getFinalVerdict } from '../services/gemini';
import { MeasurementPoint } from '../types';

interface GuidedMeasurementProps {
  pcbImages: string[];
  pcbResult: any;
  functionalAI: string;
  persistedPoints: MeasurementPoint[];
  onUpdate: (points: MeasurementPoint[]) => void;
  onVerdictGenerated: (verdict: string) => void;
}

const GuidedMeasurement: React.FC<GuidedMeasurementProps> = ({ pcbImages, pcbResult, functionalAI, persistedPoints, onUpdate, onVerdictGenerated }) => {
  const [points, setPoints] = useState<MeasurementPoint[]>(persistedPoints || []);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerdictLoading, setIsVerdictLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar con props
  useEffect(() => {
    setPoints(persistedPoints || []);
  }, [persistedPoints]);

  const initPlan = async () => {
    if (pcbResult && points.length === 0) {
      setIsLoading(true);
      setError(null);
      try {
        // Generar plan basado en el modelo y contexto (Esquemas)
        const plan = await generateMeasurementPlan(pcbResult, functionalAI);
        const formatted: MeasurementPoint[] = plan.map(p => ({ ...p, status: 'pending' }));
        setPoints(formatted);
        onUpdate(formatted);
      } catch (e) {
        console.error("Failed to generate plan", e);
        const msg = e instanceof Error ? e.message : "Error desconocido";
        setError(`Error de IA: ${msg}. Verifica tu API Key.`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    initPlan();
  }, [pcbResult]);

  const handleValueChange = (val: string) => {
    const newPoints = [...points];
    newPoints[activeIdx].measuredValue = val;

    // Validación simple de valor esperado
    const measured = parseFloat(val);
    // Lógica básica: si hay valor, marcar ok provisionalmente (el veredicto final lo da la IA)
    if (!isNaN(measured)) {
       newPoints[activeIdx].status = 'ok';
    } else {
       newPoints[activeIdx].status = 'pending';
    }

    setPoints(newPoints);
    onUpdate(newPoints);
  };

  const generateVerdict = async () => {
    setIsVerdictLoading(true);
    onUpdate(points);

    try {
      const res = await getFinalVerdict(pcbResult, points);
      onVerdictGenerated(res);
    } catch (e) {
      alert("Error al generar veredicto");
    } finally {
      setIsVerdictLoading(false);
    }
  };

  if (!pcbResult) return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-30">
      <span className="material-symbols-outlined text-8xl mb-4">analytics</span>
      <h2 className="text-2xl font-bold">Primero Analice una Placa</h2>
      <Link to="/pcb-id" className="mt-6 px-6 py-3 bg-primary rounded-xl text-white font-bold">Ir al Analizador</Link>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-[#0f1219]">
      <div className="flex-1 relative overflow-hidden flex flex-col bg-black">
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
          {pcbImages.length > 0 ? (
            <div className="relative w-full h-full">
              {/* Imagen limpia sin recuadros superpuestos */}
              <img src={pcbImages[0]} alt="PCB View" className="w-full h-full object-contain" />
              <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>
            </div>
          ) : (
            <div className="text-text-secondary italic">Imagen de referencia no disponible</div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[450px] bg-[#111722] border-l border-[#232f48] flex flex-col h-full z-20 shadow-2xl overflow-y-auto">
        <div className="p-6 border-b border-[#232f48] bg-surface-dark/50">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">Diagnóstico Sistemático</span>
          <h2 className="text-xl font-bold text-white mt-1">Guía de Medición</h2>
          <p className="text-xs text-text-secondary mt-1">Sigue los pasos basados en el esquema/lógica.</p>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="p-4 bg-border-dark/30 rounded-xl text-center text-sm text-primary font-bold">
                <span className="material-symbols-outlined animate-spin text-2xl block mb-2">menu_book</span>
                Consultando esquemas y generando puntos...
              </div>
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-border-dark rounded-xl"></div>)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-4">
              <span className="material-symbols-outlined text-4xl text-red-500">error_outline</span>
              <h3 className="text-white font-bold">Error generando plan</h3>
              <p className="text-text-secondary text-sm">{error}</p>
              <button
                onClick={initPlan}
                className="px-6 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-bold transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {points.map((p, idx) => (
                <div
                  key={p.id || idx}
                  onClick={() => setActiveIdx(idx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${activeIdx === idx ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(19,91,236,0.1)]' : 'bg-surface-dark border-border-dark hover:border-white/10'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className={`size-8 rounded flex items-center justify-center font-bold text-xs ${p.status === 'ok' ? 'bg-green-500/20 text-green-500' : p.status === 'fail' ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white/40'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase">{p.component}</h4>
                        <p className="text-[10px] text-text-secondary mt-0.5">{p.testPoint} | Modo {p.mode}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-primary font-bold">{p.expectedValue}</span>
                  </div>

                  {activeIdx === idx && (
                    <div className="mt-4 space-y-3">
                      <p className="text-[11px] text-text-secondary leading-relaxed italic border-l-2 border-primary/40 pl-3">{p.description}</p>
                      <div className="relative">
                        <input
                          value={p.measuredValue || ''}
                          onChange={(e) => handleValueChange(e.target.value)}
                          placeholder="Valor medido..."
                          autoFocus
                          className={`w-full bg-black/40 border ${p.status === 'fail' ? 'border-red-500/50' : 'border-border-dark'} rounded-lg p-3 text-xl font-mono font-bold text-white focus:ring-1 focus:ring-primary outline-none`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#232f48] bg-surface-dark/80 backdrop-blur-md sticky bottom-0">
          {points.length > 0 && points.every(p => p.measuredValue) ? (
            <button
              onClick={generateVerdict}
              disabled={isVerdictLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 group text-lg disabled:opacity-50"
            >
              <span className="material-symbols-outlined">{isVerdictLoading ? 'sync' : 'psychology'}</span>
              <span>{isVerdictLoading ? 'Procesando...' : 'Diagnosticar con IA'}</span>
            </button>
          ) : (
            <div className="text-center py-2">
              {points.length > 0 && (
                <>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-2">Faltan Mediciones</p>
                  <div className="flex gap-1.5 justify-center">
                    {points.map((p, i) => (
                      <div key={i} className={`size-1.5 rounded-full transition-colors ${p.measuredValue ? 'bg-primary' : 'bg-border-dark'}`}></div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuidedMeasurement;
