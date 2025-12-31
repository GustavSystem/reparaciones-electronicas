
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllRepairs, deleteRepairFromHistory, exportDatabase, importDatabase } from '../services/storage';
import ConfirmDialog from '../components/ConfirmDialog';

interface DatabaseScreenProps {
  onLoadRepair: (repair: any) => void;
}

const DatabaseScreen: React.FC<DatabaseScreenProps> = ({ onLoadRepair }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'components' | 'schematics'>('history');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAllRepairs();
      setHistory(data.sort((a, b) => Number(b.timestamp) - Number(a.timestamp)));
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestDelete = (e: React.MouseEvent, timestamp: number) => {
    e.stopPropagation();
    setConfirmDeleteId(timestamp);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId === null) return;
    const ts = Number(confirmDeleteId);
    setConfirmDeleteId(null);
    setDeletingId(ts);
    
    try {
      const success = await deleteRepairFromHistory(ts);
      if (success) {
        setHistory(prev => prev.filter(item => Number(item.timestamp) !== ts));
      } else {
        alert("Error al eliminar.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    try {
        const json = await exportDatabase();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `gusrepart_backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Error al generar la copia de seguridad.");
    }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          setIsLoading(true);
          try {
              const success = await importDatabase(content);
              if (success) {
                  alert("Base de datos restaurada con éxito.");
                  await loadData();
              } else {
                  alert("Error: El archivo no es válido o está corrupto.");
              }
          } catch(err) {
              alert("Error crítico durante la importación.");
          } finally {
              setIsLoading(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
          }
      };
      reader.readAsText(file);
  };

  const allIdentifiedComponents = history.reduce((acc: string[], curr: any) => {
    const comps = curr.pcbResult?.identifiedComponents || [];
    comps.forEach((c: string) => {
       if (!acc.includes(c)) acc.push(c);
    });
    return acc;
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-background-dark">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
      
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-border-dark pb-6 gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black text-white">Base de Datos</h1>
            <p className="text-text-secondary font-medium">Registro Maestro (v1.0-STABLE)</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
             <div className="flex bg-border-dark p-1 rounded-xl w-full sm:w-auto">
                {(['history', 'components', 'schematics'] as const).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
                >
                    {tab === 'history' ? 'Historial' : tab === 'components' ? 'Comp.' : 'Esq.'}
                </button>
                ))}
            </div>
            
            <div className="h-8 w-px bg-border-dark hidden lg:block mx-2"></div>
            
            <button onClick={handleExport} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#161b26] border border-white/10 hover:bg-white/5 rounded-xl text-white text-xs font-bold transition-all">
                <span className="material-symbols-outlined text-emerald-400">cloud_download</span>
                <span>Backup</span>
            </button>
            <button onClick={handleImportClick} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#161b26] border border-white/10 hover:bg-white/5 rounded-xl text-white text-xs font-bold transition-all">
                <span className="material-symbols-outlined text-blue-400">cloud_upload</span>
                <span>Restaurar</span>
            </button>
          </div>
        </div>

        {activeTab === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full py-40 text-center">
                <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">progress_activity</span>
                <p className="text-text-secondary font-mono">Accediendo a la base de datos...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-border-dark rounded-3xl opacity-20">
                <span className="material-symbols-outlined text-8xl mb-4">folder_off</span>
                <p className="text-lg font-bold">Base de datos vacía</p>
                <p className="text-sm mt-2">Usa "Restaurar" si tienes una copia de seguridad.</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.timestamp} 
                  className={`bg-surface-dark border border-border-dark rounded-2xl overflow-hidden group hover:border-primary/40 transition-all flex flex-col shadow-xl ${deletingId === Number(item.timestamp) ? 'opacity-30 pointer-events-none scale-95' : ''}`}
                >
                  <div className="h-40 bg-black/50 relative cursor-pointer" onClick={() => { onLoadRepair(item); navigate('/pcb-id'); }}>
                    {item.pcbImages?.[0] ? (
                      <img src={item.pcbImages[0]} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-10">
                        <span className="material-symbols-outlined text-6xl">memory</span>
                      </div>
                    )}
                    <button 
                      onClick={(e) => handleRequestDelete(e, item.timestamp)}
                      disabled={deletingId !== null}
                      className="absolute top-3 right-3 p-2 bg-red-500/20 hover:bg-red-600 text-white rounded-xl transition-all border border-red-500/30 z-20 hover:scale-110 active:scale-90"
                      title="Eliminar Registro"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                    </button>
                    <div className="absolute bottom-3 left-3 bg-primary/80 px-2 py-1 rounded text-[9px] font-bold text-white shadow-lg">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-base font-bold text-white truncate">{item.pcbResult?.model || "Sin Nombre"}</h3>
                    <p className="text-[10px] text-text-secondary font-mono mt-1 mb-4 uppercase tracking-tighter">{item.pcbResult?.boardNumber || "Serial N/A"}</p>
                    <button 
                      onClick={() => { onLoadRepair(item); navigate('/pcb-id'); }}
                      className="mt-auto w-full py-3 bg-[#111722] hover:bg-primary border border-white/5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                      Recuperar Sesión
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'components' && (
           <div className="bg-surface-dark border border-border-dark rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">microchip</span>
                 Inventario Detectado
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                 {allIdentifiedComponents.map((c, i) => (
                   <div key={i} className="p-4 bg-background-dark border border-white/5 rounded-2xl text-center shadow-lg">
                      <p className="text-[10px] font-mono text-primary font-black uppercase">{c}</p>
                   </div>
                 ))}
                 {allIdentifiedComponents.length === 0 && <p className="col-span-full py-10 text-center opacity-30 text-sm italic">Sin datos registrados.</p>}
              </div>
           </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={confirmDeleteId !== null}
        title="Eliminar Registro"
        message="¿Estás seguro de que quieres eliminar esta reparación del historial permanentemente? Esta acción no se puede deshacer."
        confirmText="Sí, Eliminar"
        cancelText="No, Mantener"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default DatabaseScreen;
