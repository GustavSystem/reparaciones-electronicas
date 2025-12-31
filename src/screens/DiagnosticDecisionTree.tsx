
import React, { useState, useEffect, useRef } from 'react';
import { getDiagnosticAdvice } from '../services/gemini';
import { DiagnosticTurn } from '../types';

interface DiagnosticProps {
  persistedHistory: DiagnosticTurn[];
  pcbResult: any;
  onUpdate: (history: DiagnosticTurn[]) => void;
}

const DiagnosticDecisionTree: React.FC<DiagnosticProps> = ({ persistedHistory, pcbResult, onUpdate }) => {
  const [history, setHistory] = useState<DiagnosticTurn[]>(persistedHistory || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Asegurar que el estado local se limpie cuando la prop cambie (importante para reset de sesión)
  useEffect(() => {
    setHistory(persistedHistory || []);
  }, [persistedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    // Solo notificar al padre si el historial local cambia y no es igual al persistido
    if (JSON.stringify(history) !== JSON.stringify(persistedHistory)) {
        onUpdate(history);
    }
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userTurn: DiagnosticTurn = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const newHistory = [...history, userTurn];
    setHistory(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      const advice = await getDiagnosticAdvice(
        newHistory.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })), 
        input, 
        pcbResult?.model
      );
      const assistantTurn: DiagnosticTurn = {
        role: 'assistant',
        content: advice || "No pude procesar la respuesta.",
        timestamp: Date.now()
      };
      setHistory(prev => [...prev, assistantTurn]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#111722]">
      <div className="p-6 border-b border-border-dark bg-[#111722] flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-white text-2xl font-bold">Diagnóstico AI</h1>
          <p className="text-[#92a4c9] text-sm font-medium">
            {pcbResult ? `Analizando: ${pcbResult.model}` : 'Gemini 3 Pro + Memoria de Taller'}
          </p>
        </div>
        <button 
          onClick={() => { if(confirm("¿Reiniciar chat? No se borrará del historial si has guardado la reparación.")) setHistory([]); }}
          className="px-4 py-2 bg-border-dark hover:bg-surface-dark text-white rounded-lg text-xs font-bold transition-all border border-white/5"
        >
          Nueva Consulta
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center text-white">
            <span className="material-symbols-outlined text-8xl mb-4 text-primary">psychology</span>
            <p className="max-w-md font-medium text-lg">Describe los síntomas para iniciar el análisis lógico.</p>
            <p className="text-sm mt-2">Ej: "No enciende, consumo de 0.01A en fuente".</p>
          </div>
        )}
        
        {history.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-lg ${turn.role === 'user' ? 'bg-primary text-white' : 'bg-[#1a2332] border border-border-dark text-white'}`}>
              <div className="text-[10px] font-bold uppercase mb-2 tracking-widest opacity-40">{turn.role === 'user' ? 'Técnico' : 'Gusrepart AI'}</div>
              <div className="prose prose-invert prose-sm whitespace-pre-wrap leading-relaxed">
                {turn.content}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#1a2332] border border-border-dark p-4 rounded-2xl flex items-center gap-4 animate-pulse">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">IA Razonando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-[#161b26] border-t border-border-dark shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-4 max-w-5xl mx-auto">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Introduce síntomas o valores medidos..."
            className="flex-1 bg-[#0d1017] border border-border-dark text-white p-4 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="px-8 py-4 bg-primary hover:bg-primary-hover rounded-xl text-white font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            Analizar
          </button>
        </form>
      </div>
    </div>
  );
};

export default DiagnosticDecisionTree;
