
import React from 'react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onSave?: () => void;
  isSaving?: boolean;
  isSuccess?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onSave, isSaving, isSuccess }) => {
  const location = useLocation();
  const path = location.pathname;
  
  // Ocultar el botón de guardado GLOBAL en pantallas donde no aplica (Base de conocimientos, Base de datos)
  // El usuario se confunde pensando que es para guardar la entrada de conocimiento.
  const showSaveButton = onSave && !['/knowledge', '/database', '/component'].includes(path);
  
  const getTitle = () => {
    switch(path) {
      case '/': return 'Panel de Control';
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
          <button className="text-text-secondary hover:text-white transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-surface-dark"></span>
          </button>
          <div 
            className="h-8 w-8 bg-center bg-no-repeat bg-cover rounded-full border border-border-dark cursor-pointer" 
            style={{backgroundImage: 'url("https://picsum.photos/id/64/100/100")'}}
          ></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
