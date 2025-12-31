
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface BoardviewProps {
  pcbResult: any;
  schematicInfo: {summary: string, sources: string} | null;
  functionalAI: string;
}

const BoardviewSchematics: React.FC<BoardviewProps> = ({ pcbResult, schematicInfo: initialSchematicInfo, functionalAI }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'schematics' | 'functional'>('schematics');
  
  // Estado local para combinar la info automática (si se expandiera en el futuro)
  const [currentSchematicInfo, setCurrentSchematicInfo] = useState(initialSchematicInfo);

  // Actualizar si llega nueva prop
  React.useEffect(() => {
      if (initialSchematicInfo) setCurrentSchematicInfo(initialSchematicInfo);
  }, [initialSchematicInfo]);

  return (
    <div className="relative flex h-full w-full flex-col bg-background-dark overflow-hidden text-white">
      <header className="flex flex-none items-center justify-between whitespace-nowrap border-b border-solid border-border-dark bg-[#111722] px-6 py-3 z-20">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <h1 className="text-white text-sm font-bold">{pcbResult?.model || "Sin Identificar"}</h1>
            <p className="text-primary text-[10px] font-mono">{pcbResult?.boardNumber || "S/N"}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-border-dark rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('schematics')}
              className={`px-6 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'schematics' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
            >
              Datos Técnicos
            </button>
            <button 
              onClick={() => setActiveTab('functional')}
              className={`px-6 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'functional' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
            >
              Análisis Funcional
            </button>
          </div>
          <Link to="/measure" className="flex items-center justify-center rounded-lg h-9 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all">
            Pasar a Mediciones
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex flex-col w-72 border-r border-border-dark bg-[#111722] flex-none z-10">
          <div className="p-4 border-b border-border-dark bg-primary/5">
            <h3 className="text-white text-xs font-bold mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[16px]">list</span>
              Componentes Identificados
            </h3>
            <div className="flex flex-col gap-1">
               {pcbResult?.identifiedComponents?.map((c: string, i: number) => (
                 <div key={i} className="px-3 py-2 bg-border-dark/30 rounded border border-white/5 text-[10px] font-mono text-white/70 flex justify-between group cursor-help">
                    {c}
                    <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">info</span>
                 </div>
               )) || <p className="text-[10px] text-text-secondary italic">Sin datos</p>}
            </div>
          </div>
          
          <div className="p-4 overflow-y-auto">
             <h3 className="text-white text-xs font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400 text-[16px]">bug_report</span>
              Anomalías Visuales
            </h3>
            <div className="space-y-3">
               {pcbResult?.detectedAnomalies?.map((a: string, i: number) => (
                 <div key={i} className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                    <p className="text-[11px] text-red-200/70 leading-relaxed font-medium">{a}</p>
                 </div>
               )) || <p className="text-[10px] text-text-secondary italic">No se detectaron fallos visuales.</p>}
            </div>
          </div>
        </aside>

        <main className="flex flex-col flex-1 min-w-0 bg-[#0d1017] p-6 overflow-y-auto">
          {activeTab === 'schematics' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-surface-dark border border-border-dark p-8 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">description</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Resumen de Documentación Técnica</h2>
                        <p className="text-xs text-text-secondary">Información destilada por IA.</p>
                    </div>
                </div>
                
                {currentSchematicInfo ? (
                  <div className="space-y-6">
                    <div className="prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed whitespace-pre-wrap">
                       {currentSchematicInfo.summary}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center opacity-30">
                    <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
                    <p>No se encontró información automática.</p>
                  </div>
                )}
                
                <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center gap-4 bg-black/20 p-6 rounded-xl">
                    <p className="text-sm text-center text-text-secondary">
                        ¿Tienes el esquema PDF o Boardview de esta placa? <br/>
                        Súbelo a la base de conocimientos para que la IA lo use en el diagnóstico.
                    </p>
                    <button 
                        onClick={() => navigate('/knowledge')}
                        className="flex items-center gap-2 px-6 py-3 bg-[#1a2332] hover:bg-white/5 border border-white/10 rounded-xl transition-all font-bold text-sm"
                    >
                        <span className="material-symbols-outlined text-purple-400">upload_file</span>
                        Subir Esquema a Biblioteca
                    </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'functional' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-[#111722] border border-primary/20 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-9xl">hub</span>
                </div>

                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5 relative z-10">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">psychology</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Análisis Funcional de Bloques</h2>
                        <p className="text-xs text-text-secondary">Lógica de funcionamiento inferida por IA para esta placa específica.</p>
                    </div>
                </div>

                {functionalAI ? (
                  <div className="prose prose-invert prose-sm max-w-none text-text-secondary whitespace-pre-wrap leading-relaxed relative z-10">
                    {functionalAI}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center opacity-30">
                    <span className="material-symbols-outlined text-6xl mb-4">account_tree</span>
                    <p>Esperando datos del analizador para generar el mapa funcional.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BoardviewSchematics;
