
import React, { } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NavButton = ({ icon, label, to, active }: { icon: string; label: string; to: string; active: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${active ? 'bg-border-dark' : 'hover:bg-border-dark/50'}`}
  >
    <span className={`material-symbols-outlined ${active ? 'text-white' : 'text-text-secondary group-hover:text-white'}`} style={{fontSize: '24px'}}>{icon}</span>
    <p className={`${active ? 'text-white' : 'text-text-secondary group-hover:text-white'} text-sm font-medium leading-normal`}>{label}</p>
  </Link>
);

const Sidebar: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside className="w-64 h-full flex-shrink-0 flex flex-col bg-[#111722] border-r border-border-dark hidden md:flex">
      <div className="p-6 flex flex-col gap-4">
        <div className="flex flex-col">
          <h1 className="text-white text-xl font-bold leading-normal tracking-tight">Gusrepart AI</h1>
          <p className="text-text-secondary text-xs font-normal leading-normal">Expert System v1.0-STABLE</p>
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-2 px-4 overflow-y-auto">
        <NavButton icon="dashboard" label="Panel de Control" to="/" active={path === '/'} />
        <NavButton icon="build" label="PCB Analyzer" to="/pcb-id" active={path === '/pcb-id'} />
        <NavButton icon="map" label="Boardview" to="/boardview" active={path === '/boardview'} />
        <NavButton icon="straighten" label="Mediciones" to="/measure" active={path === '/measure'} />
        <NavButton icon="psychology" label="Diagnóstico AI" to="/diagnostics" active={path === '/diagnostics'} />
        
        <div className="h-px bg-border-dark my-2 mx-2 opacity-50"></div>
        <NavButton icon="school" label="Base Conocimientos" to="/knowledge" active={path === '/knowledge'} />
        <NavButton icon="storage" label="Base de Datos" to="/database" active={path === '/database'} />
        <NavButton icon="settings" label="Configuración" to="/settings" active={path === '/settings'} />
      </nav>
      {/* Footer del Sidebar limpio */}
      <div className="p-4 border-t border-border-dark text-center">
         <span className="text-[10px] text-text-secondary opacity-50">Powered by Google Gemini</span>
      </div>
    </aside>
  );
};

export default Sidebar;
