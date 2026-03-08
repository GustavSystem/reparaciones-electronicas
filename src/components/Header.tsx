
import React from 'react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onSave?: () => void;
  isSaving?: boolean;
  isSuccess?: boolean;
  onToggleLive?: () => void;
  isLiveActive?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onSave, isSaving, isSuccess, onToggleLive, isLiveActive }) => {
  const location = useLocation();
  const path = location.pathname;
  
  const showSaveButton = onSave && !['/knowledge', '/database', '/component', '/safety'].includes(path);
  
  const getTitle = () => {
    switch(path) {
      case '/': return 'Panel de Control';
      case '/safety': return 'Protocolo de Seguridad';
      case '/pcb-id': return 'Fase 1: Identificación Visual';
      case '/boardview': return 'Fase 2: Mapeo Lógico';
      case '/measure': return 'Fase 3: Medición Guiada';
      case '/diagnostics': return 'Fase 4: Razonamiento AI';
      case '/component': return 'Fase 5: Datos del Componente';
      case '/database': return 'Registros de Taller';
      case '/knowledge': return 'Base de Conocimiento';
      default: return 'Gusrepart Expert';
    }
  };

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-dark px-6 py-3 bg-[#111722] flex-shrink-0 z-10">
      <div className="flex items-center gap-4 text-white">
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">{getTitle()}</h2>
        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">v1.0-STABLE</span>
      </div>
      
      <div className="flex items-center gap-6">
        
        {/* Live Assistant Toggle */}
        <button 
            onClick={onToggleLive}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isLiveActive ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' : 'bg-surface-dark border-border-dark text-text-secondary hover:text-white'}`}
            title="Asistente de Voz (Gemini Live)"
        >
            <span className="material-symbols-outlined text-[20px]">{isLiveActive ? 'mic' : 'mic_off'}</span>
            <span className="text-xs font-bold hidden md:inline">{isLiveActive ? 'Escuchando...' : 'Voz'}</span>
        </button>

        {showSaveButton && (
          <button 
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-1.5 border rounded-lg text-xs font-bold transition-all duration-300 ${
              isSuccess 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                : 'bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary'
            } disabled:opacity-50`}
          >
            <span className="material-symbols-outlined text-[18px] transition-transform duration-500" style={{ transform: isSuccess ? 'rotate(360deg)' : 'none' }}>
              {isSaving ? 'sync' : isSuccess ? 'check_circle' : 'save'}
            </span>
            <span>{isSaving ? 'Guardando...' : isSuccess ? '¡Guardado!' : 'Guardar Reparación'}</span>
          </button>
        )}
        
        <div className="flex items-center gap-4">
          <div 
            className="h-8 w-8 bg-center bg-no-repeat bg-cover rounded-full border border-border-dark cursor-pointer bg-gray-700" 
          >
             <span className="material-symbols-outlined text-white w-full h-full flex items-center justify-center text-sm">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
