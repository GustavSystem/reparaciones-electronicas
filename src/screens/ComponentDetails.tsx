
import React, { useState, useEffect } from 'react';
import { searchComponentInfo } from '../services/gemini';

const ComponentDetails: React.FC = () => {
  const [query, setQuery] = useState("IRF540N MOSFET datasheet features");
  const [info, setInfo] = useState<{text: string, sources?: string} | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const res = await searchComponentInfo(query);
      setInfo(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black mb-2">MOSFET IRF540N</h1>
            <div className="flex gap-2">
               <span className="px-2 py-1 bg-red-900/30 text-red-500 rounded text-xs font-bold border border-red-500/30">Defectuoso Detectado</span>
               <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-bold border border-primary/20">TO-220 Package</span>
            </div>
          </div>
          <button onClick={fetchInfo} className="p-2 bg-primary rounded-lg text-white">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 shadow-xl min-h-[400px]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span> 
                Análisis de Datasheet (Grounding con Google Search)
              </h2>
              
              {loading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-border-dark rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-border-dark rounded animate-pulse w-full"></div>
                  <div className="h-4 bg-border-dark rounded animate-pulse w-5/6"></div>
                  <div className="h-4 bg-border-dark rounded animate-pulse w-2/3"></div>
                </div>
              ) : info ? (
                <div className="prose prose-invert max-w-none text-text-secondary">
                  <div className="whitespace-pre-wrap leading-relaxed">{info.text}</div>
                  {info.sources && (
                    <div className="mt-8 pt-4 border-t border-border-dark">
                      <p className="text-xs font-bold uppercase mb-2">Fuentes Verificadas:</p>
                      <div dangerouslySetInnerHTML={{ __html: info.sources }}></div>
                    </div>
                  )}
                </div>
              ) : (
                <p>No se encontró información.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#111722] border border-border-dark rounded-2xl p-6">
               <h3 className="font-bold mb-4">Parámetros Críticos</h3>
               <div className="space-y-4">
                  {[
                    { l: "Vds Max", v: "100V" },
                    { l: "Id Max", v: "33A" },
                    { l: "Rds(on)", v: "0.044 Ω" },
                    { l: "Vgs(th)", v: "2.0V - 4.0V" }
                  ].map((p, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border-dark last:border-0">
                      <span className="text-text-secondary text-sm">{p.l}</span>
                      <span className="text-white font-mono font-bold">{p.v}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
               <h3 className="font-bold mb-2 flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">lightbulb</span> AI Suggestion
               </h3>
               <p className="text-sm text-text-secondary italic leading-relaxed">
                 "Este componente es propenso a fallas por sobrecalentamiento. Verifique el driver de compuerta (Gate Driver) antes de reemplazar, ya que un pulso PWM deformado puede quemar el nuevo MOSFET instantáneamente."
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentDetails;
