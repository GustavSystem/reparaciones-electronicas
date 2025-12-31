
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SafetyChecklist: React.FC = () => {
  const navigate = useNavigate();
  const [checks, setChecks] = useState([false, false, false, false, false]);
  const allChecked = checks.every(Boolean);

  const toggleCheck = (index: number) => {
    const newChecks = [...checks];
    newChecks[index] = !newChecks[index];
    setChecks(newChecks);
  };

  const steps = [
    {icon: "electrical_services", title: "Puesta a Tierra Personal", desc: "Muñequera antiestática conectada y probada."},
    {icon: "grid_on", title: "Área de Trabajo Protegida (EPA)", desc: "Tapete ESD limpio y conectado a tierra."},
    {icon: "power_off", title: "Desconexión de Energía", desc: "Dispositivo totalmente desconectado. Capacitores descargados."},
    {icon: "handyman", title: "Herramientas Seguras", desc: "Uso de herramientas verificadas ESD."},
    {icon: "water_drop", title: "Control Ambiental", desc: "Humedad relativa controlada (40-60%)."}
  ];

  const progress = Math.round((checks.filter(Boolean).length / 5) * 100);

  const handleConfirm = () => {
    if (allChecked) {
      navigate('/pcb-id');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col items-center bg-background-dark">
      <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-3 mb-8">
          <div className="flex items-center gap-3 mb-2">
             <span className="material-symbols-outlined text-4xl text-primary">security</span>
             <h1 className="text-white text-4xl font-black">Protocolo de Seguridad</h1>
          </div>
          <p className="text-text-secondary text-lg">Reporte Sección 4.3: La seguridad es no negociable. Verifica el entorno ESD.</p>
          
          <div className="flex gap-6 justify-between mt-4 items-end">
            <p className="text-text-secondary font-mono">{checks.filter(Boolean).length}/5 Verificados</p>
            <p className="text-primary font-bold text-xl">{progress}%</p>
          </div>
          <div className="rounded-full bg-[#324467] h-3 w-full overflow-hidden shadow-inner">
            <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{width: `${progress}%`}}></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              onClick={() => toggleCheck(idx)} 
              className={`group flex items-center gap-6 bg-[#161b26] border-2 ${checks[idx] ? 'border-primary bg-primary/5' : 'border-[#232f48] hover:border-[#324467]'} rounded-2xl px-8 py-6 justify-between transition-all cursor-pointer shadow-lg`}
            >
              <div className="flex items-center gap-6">
                <div className={`flex items-center justify-center rounded-2xl shrink-0 size-16 transition-colors ${checks[idx] ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-[#232f48] text-text-secondary'}`}>
                  <span className="material-symbols-outlined text-[32px]">{step.icon}</span>
                </div>
                <div className="flex flex-col">
                  <p className={`text-xl font-bold leading-tight transition-colors ${checks[idx] ? 'text-white' : 'text-gray-400'}`}>{step.title}</p>
                  <p className="text-[#92a4c9] text-sm mt-1">{step.desc}</p>
                </div>
              </div>
              <div className="shrink-0">
                <div className={`size-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${checks[idx] ? 'bg-primary border-primary scale-110' : 'border-[#4b5563] bg-transparent'}`}>
                  {checks[idx] && <span className="material-symbols-outlined text-white text-xl font-bold">check</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-12 justify-end items-center border-t border-border-dark pt-8">
          <Link to="/" className="w-full md:w-auto px-8 py-4 rounded-xl text-text-secondary font-bold hover:text-white hover:bg-white/5 transition-colors text-center">
            Cancelar Operación
          </Link>
          <button 
            onClick={handleConfirm}
            disabled={!allChecked}
            className={`w-full md:w-auto px-12 py-4 rounded-xl text-white font-bold text-lg flex items-center gap-3 justify-center transition-all ${allChecked ? 'bg-primary hover:bg-primary-hover shadow-xl shadow-primary/30 transform hover:-translate-y-1' : 'bg-gray-800 text-gray-500 cursor-not-allowed grayscale'}`}
          >
            <span>Iniciar Diagnóstico</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyChecklist;
