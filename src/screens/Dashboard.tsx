
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllRepairs, getAllKnowledge } from '../services/storage';

interface DashboardProps {
  onLoadRepair?: (repair: any) => void;
  onNewRepair?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLoadRepair, onNewRepair }) => {
  const navigate = useNavigate();
  const [recentRepairs, setRecentRepairs] = useState<any[]>([]);
  const [stats, setStats] = useState({ repairs: 0, knowledge: 0 });
  const [dailyTip, setDailyTip] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const repairs = await getAllRepairs();
      const knowledge = await getAllKnowledge();
      
      const sortedRepairs = repairs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
      
      setRecentRepairs(sortedRepairs);
      setStats({ repairs: repairs.length, knowledge: knowledge.length });
      
      if (knowledge.length > 0) {
        const random = knowledge[Math.floor(Math.random() * knowledge.length)];
        setDailyTip(random);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#101622]">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-border-dark">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">
              Hola, Técnico
            </h1>
            <p className="text-text-secondary text-lg">
              El laboratorio está listo. ¿Qué desafío tenemos hoy?
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
               <p className="text-2xl font-bold text-white">{stats.repairs}</p>
               <p className="text-xs text-text-secondary uppercase tracking-wider">Reparaciones</p>
            </div>
            <div className="w-px bg-border-dark mx-2"></div>
            <div className="text-right">
               <p className="text-2xl font-bold text-white">{stats.knowledge}</p>
               <p className="text-xs text-text-secondary uppercase tracking-wider">Fichas IA</p>
            </div>
          </div>
        </header>

        {/* ALERTA DE SEGURIDAD - NUEVA */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 shadow-lg shadow-yellow-900/10">
            <div className="p-2 bg-yellow-500/20 rounded-full text-yellow-500 shrink-0">
                <span className="material-symbols-outlined">warning</span>
            </div>
            <div>
                <h4 className="text-yellow-500 font-bold text-sm uppercase tracking-wide">Recordatorio de Seguridad ESD</h4>
                <p className="text-text-secondary text-sm mt-1">
                    Antes de comenzar cualquier manipulación, asegúrate de tener tu <b>muñequera antiestática</b> conectada y la zona de trabajo (EPA) despejada. Desconecta toda fuente de energía del equipo antes de medir componentes.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* ACCIONES RÁPIDAS */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={onNewRepair}
                className="bg-primary hover:bg-primary-hover p-5 rounded-2xl text-left transition-all shadow-lg shadow-primary/20 group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
              >
                <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                   <span className="material-symbols-outlined text-8xl">restart_alt</span>
                </div>
                <span className="material-symbols-outlined text-3xl mb-4 bg-white/20 p-2 rounded-lg w-fit">restart_alt</span>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-1">Nueva Reparación</h3>
                  <p className="text-blue-100 text-xs opacity-90">Limpiar mesa y empezar de cero.</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/pcb-id')}
                className="bg-[#1a2332] hover:bg-[#232f48] border border-border-dark p-5 rounded-2xl text-left transition-all group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
              >
                <div className="absolute right-0 top-0 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                   <span className="material-symbols-outlined text-8xl">add_a_photo</span>
                </div>
                <span className="material-symbols-outlined text-3xl mb-4 bg-white/5 p-2 rounded-lg w-fit text-primary">build</span>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-1">Diagnóstico Visual</h3>
                  <p className="text-text-secondary text-xs">Analizar placa actual.</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/knowledge')}
                className="bg-[#1a2332] hover:bg-[#232f48] border border-border-dark p-5 rounded-2xl text-left transition-all group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
              >
                <div className="absolute right-0 top-0 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                   <span className="material-symbols-outlined text-8xl text-purple-500">upload_file</span>
                </div>
                <span className="material-symbols-outlined text-3xl mb-4 text-purple-400 bg-purple-500/10 p-2 rounded-lg w-fit">upload_file</span>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-1">Subir Manual</h3>
                  <p className="text-text-secondary text-xs">Entrena a la IA con PDFs.</p>
                </div>
              </button>
            </section>

            {/* REPARACIONES RECIENTES */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <span className="material-symbols-outlined text-text-secondary">history</span>
                   Trabajos Recientes
                </h2>
                <button onClick={() => navigate('/database')} className="text-sm text-primary hover:text-white transition-colors">Ver todos</button>
              </div>
              
              <div className="flex flex-col gap-3">
                {recentRepairs.length === 0 ? (
                  <div className="p-8 border border-dashed border-border-dark rounded-xl text-center text-text-secondary">
                    No hay reparaciones recientes. ¡Comienza una nueva!
                  </div>
                ) : (
                  recentRepairs.map((repair) => (
                    <div 
                      key={repair.timestamp}
                      onClick={() => onLoadRepair && onLoadRepair(repair)}
                      className="bg-[#1a2332] hover:bg-[#232f48] border border-border-dark p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all group"
                    >
                      <div className="size-12 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                        {repair.pcbImages?.[0] ? (
                          <img src={repair.pcbImages[0]} className="w-full h-full object-cover rounded-lg opacity-80" />
                        ) : (
                          <span className="material-symbols-outlined text-text-secondary">memory</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-bold group-hover:text-primary transition-colors">{repair.pcbResult?.model || "Placa sin nombre"}</h4>
                        <p className="text-xs text-text-secondary">{repair.pcbResult?.boardNumber || "Sin Serial"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-text-secondary">
                          {new Date(repair.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-text-secondary group-hover:translate-x-1 transition-transform">chevron_right</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="flex flex-col gap-6">
            
            <div className="bg-gradient-to-br from-[#1a2332] to-[#111722] border border-border-dark rounded-2xl p-6 relative overflow-hidden shadow-xl">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                   <span className="material-symbols-outlined text-8xl">lightbulb</span>
               </div>
               
               <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="material-symbols-outlined text-lg">tips_and_updates</span> Tip de Conocimiento
               </h3>
               
               {dailyTip ? (
                 <div className="relative z-10">
                   <h4 className="text-white font-bold text-lg mb-2">{dailyTip.title}</h4>
                   <p className="text-text-secondary text-sm leading-relaxed line-clamp-6 mb-4">
                     {dailyTip.content}
                   </p>
                   <button onClick={() => navigate('/knowledge')} className="text-xs font-bold text-white hover:underline">Ir a Base de Conocimiento &rarr;</button>
                 </div>
               ) : (
                 <div className="text-text-secondary text-sm italic">
                   Agrega manuales o notas en la sección "Base Conocimientos" para recibir consejos diarios aquí.
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => navigate('/database')} className="p-4 bg-[#1a2332] border border-border-dark hover:border-white/20 rounded-xl flex flex-col items-center gap-2 transition-all">
                  <span className="material-symbols-outlined text-emerald-400 text-2xl">storage</span>
                  <span className="text-xs font-bold text-text-secondary">Base Datos</span>
               </button>
               <button onClick={() => navigate('/component')} className="p-4 bg-[#1a2332] border border-border-dark hover:border-white/20 rounded-xl flex flex-col items-center gap-2 transition-all">
                  <span className="material-symbols-outlined text-blue-400 text-2xl">search</span>
                  <span className="text-xs font-bold text-text-secondary">Datasheets</span>
               </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
