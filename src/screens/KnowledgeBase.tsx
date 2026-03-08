
import React, { useState, useEffect, useRef } from 'react';
import { distillKnowledge, processTechnicalPDF } from '../services/gemini';
import { addKnowledgeEntry, getAllKnowledge, deleteKnowledgeEntry } from '../services/storage';
import { KnowledgeEntry } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';

// Variable global para rastrear tareas activas
let activeTasksCount = 0;

const KnowledgeBase: React.FC = () => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState(""); // Nuevo estado para feedback texto
  
  // Estado para eliminación
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Estado para edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{title: string, content: string, tags: string}>({ title: '', content: '', tags: '' });
  
  const isMounted = useRef(true);

  // Form states
  const [inputContent, setInputContent] = useState("");
  const [inputType, setInputType] = useState<'url' | 'text' | 'pdf'>('url');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isMounted.current = true;
    loadKnowledge();
    
    const interval = setInterval(() => {
        if (activeTasksCount > 0 || !document.hidden) {
            if (!editingId) {
                loadKnowledge(true);
            }
        }
    }, 3000);

    if (activeTasksCount > 0) setProcessing(true);

    return () => { isMounted.current = false; clearInterval(interval); };
  }, [editingId]);

  const loadKnowledge = async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await getAllKnowledge();
    const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
    
    if (isMounted.current) {
        setEntries(prev => {
            if (prev.length !== sorted.length || (prev[0]?.id !== sorted[0]?.id)) {
                return sorted;
            }
            return prev;
        });
        if (!silent) setLoading(false);
        if (activeTasksCount === 0) {
            setProcessing(false);
            setProcessStatus("");
        }
    }
  };

  const handleLearn = async () => {
    if (inputType !== 'pdf' && !inputContent.trim()) return;
    
    setProcessing(true);
    if(inputType === 'url') setProcessStatus("Navegando y analizando URL con Google Search...");
    else setProcessStatus("Analizando y destilando nota...");
    
    activeTasksCount++;
    
    const contentToProcess = inputContent;
    const typeToProcess = inputType;
    
    setInputContent("");

    (async () => {
        try {
            const distilled = await distillKnowledge(
                contentToProcess, 
                typeToProcess === 'url' ? contentToProcess : 'Nota del Técnico'
            );
            
            const newEntry: KnowledgeEntry = {
                id: crypto.randomUUID(),
                title: distilled.title || (typeToProcess === 'url' ? "Resumen Web" : "Nota Rápida"),
                tags: distilled.tags || [],
                content: distilled.content || "Sin contenido generado.",
                source: typeToProcess === 'url' ? contentToProcess : 'Nota Manual',
                timestamp: Date.now()
            };

            await addKnowledgeEntry(newEntry);
        } catch (e) {
            console.error("Error en background task:", e);
            alert("Hubo un error analizando el contenido. Verifica la URL o intenta de nuevo.");
        } finally {
            activeTasksCount--;
            if (isMounted.current) {
                if (activeTasksCount === 0) {
                    setProcessing(false);
                    setProcessStatus("");
                }
                loadKnowledge(true);
            }
        }
    })();
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
          alert("Solo se permiten archivos PDF.");
          return;
      }

      setProcessing(true);
      setProcessStatus("Leyendo PDF y extrayendo datos técnicos...");
      activeTasksCount++;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const base64 = (event.target?.result as string).split(',')[1];
              const result = await processTechnicalPDF(base64);

              const newEntry: KnowledgeEntry = {
                  id: crypto.randomUUID(),
                  title: result.title || `Documento: ${file.name}`,
                  tags: [...(result.tags || []), 'PDF', 'Esquema/Datasheet'],
                  content: result.content || "Análisis de documento PDF completado.",
                  source: `Archivo: ${file.name}`,
                  timestamp: Date.now()
              };

              await addKnowledgeEntry(newEntry);
          } catch(err) {
              console.error(err);
              alert("Error al procesar el PDF.");
          } finally {
              activeTasksCount--;
              if (isMounted.current) {
                  if (activeTasksCount === 0) {
                      setProcessing(false);
                      setProcessStatus("");
                  }
                  loadKnowledge(true);
              }
              if (fileInputRef.current) fileInputRef.current.value = "";
          }
      };
      reader.readAsDataURL(file);
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const idToDel = deleteId;
    setDeleteId(null); 
    setEntries(prev => prev.filter(entry => entry.id !== idToDel));

    try {
        await deleteKnowledgeEntry(idToDel);
        loadKnowledge(true);
    } catch (error) {
        alert("Error al eliminar");
        loadKnowledge(); 
    }
  };

  const startEditing = (entry: KnowledgeEntry) => {
      setEditingId(entry.id);
      setEditForm({
          title: entry.title,
          content: entry.content,
          tags: entry.tags.join(', ')
      });
  };

  const saveEditing = async (originalEntry: KnowledgeEntry) => {
      const updatedEntry: KnowledgeEntry = {
          ...originalEntry,
          title: editForm.title,
          content: editForm.content,
          tags: editForm.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      };
      await addKnowledgeEntry(updatedEntry);
      setEditingId(null);
      await loadKnowledge(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-background-dark relative">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        <div className="flex flex-col gap-2 border-b border-border-dark pb-6">
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
             <span className="material-symbols-outlined text-purple-400 text-4xl">school</span>
             Entrenamiento de IA
          </h1>
          <p className="text-text-secondary text-lg">Alimenta la base de datos con manuales, enlaces de video (YouTube) y tus propias notas.</p>
        </div>

        {/* INPUT AREA */}
        <div className="bg-[#1a2332] border border-border-dark rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
           {processing && (
               <div className="absolute top-0 left-0 w-full h-1 bg-purple-900/50">
                   <div className="h-full bg-purple-500 animate-shimmer w-1/2"></div>
               </div>
           )}
           
           <div className="flex gap-4 mb-4">
              <button 
                onClick={() => setInputType('url')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${inputType === 'url' ? 'bg-purple-600 text-white' : 'bg-background-dark text-text-secondary hover:text-white'}`}
              >
                <span className="material-symbols-outlined">link</span> Web / Video
              </button>
              <button 
                onClick={() => setInputType('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${inputType === 'text' ? 'bg-purple-600 text-white' : 'bg-background-dark text-text-secondary hover:text-white'}`}
              >
                <span className="material-symbols-outlined">edit_note</span> Nota Rápida
              </button>
              <button 
                onClick={() => setInputType('pdf')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${inputType === 'pdf' ? 'bg-purple-600 text-white' : 'bg-background-dark text-text-secondary hover:text-white'}`}
              >
                <span className="material-symbols-outlined">picture_as_pdf</span> PDF / Esquema
              </button>
           </div>

           {inputType === 'pdf' ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border-dark hover:border-purple-500 bg-black/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
                    <span className="material-symbols-outlined text-4xl text-text-secondary group-hover:text-purple-400 mb-2">upload_file</span>
                    <p className="text-white font-bold">Haz clic para subir un PDF</p>
                    <p className="text-text-secondary text-sm">Datasheets, Esquemas o Guías de Servicio (Máx 10MB)</p>
                </div>
           ) : (
               <div className="flex flex-col md:flex-row gap-4">
                  <input 
                    value={inputContent}
                    onChange={e => setInputContent(e.target.value)}
                    placeholder={inputType === 'url' ? "Pega aquí el enlace (YouTube, Foro, Web)..." : "Escribe tu consejo técnico o solución..."}
                    className="flex-1 bg-black/40 border border-border-dark rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                    onKeyDown={e => e.key === 'Enter' && handleLearn()}
                  />
                  <button 
                    onClick={handleLearn}
                    disabled={processing || inputContent === ""} 
                    className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {processing ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">auto_awesome</span>}
                    <span>{processing ? 'Procesando' : 'Analizar'}</span>
                  </button>
               </div>
           )}
           
           <div className="flex justify-between items-center mt-3 h-6">
                {!processing && (
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        La IA navegará los enlaces o leerá los PDFs para crear fichas automáticamente.
                    </p>
                )}
                {processing && (
                    <p className="text-xs text-purple-400 font-bold animate-pulse flex items-center gap-2">
                         <span className="material-symbols-outlined text-sm animate-spin">cyclone</span>
                         {processStatus || "Trabajando..."}
                    </p>
                )}
           </div>
        </div>

        {/* LISTA DE CONOCIMIENTOS */}
        <div>
           <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="material-symbols-outlined text-purple-400">library_books</span>
                 Biblioteca Digital ({entries.length})
               </h2>
               <button onClick={() => loadKnowledge()} className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-colors" title="Refrescar lista">
                   <span className="material-symbols-outlined">refresh</span>
               </button>
           </div>
           
           {loading && entries.length === 0 ? (
             <div className="py-20 text-center text-text-secondary animate-pulse">Cargando datos...</div>
           ) : entries.length === 0 ? (
             <div className="py-20 text-center border-2 border-dashed border-border-dark rounded-3xl opacity-30">
               <span className="material-symbols-outlined text-6xl mb-4">psychology_alt</span>
               <p className="text-lg font-bold">Base de datos vacía.</p>
               <p className="text-sm">Sube esquemas o notas para entrenar a tu asistente.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {entries.map(entry => (
                 <div key={entry.id} className={`bg-surface-dark border ${editingId === entry.id ? 'border-primary ring-1 ring-primary' : 'border-border-dark'} rounded-xl p-5 hover:border-purple-500/50 transition-all groupWZ relative animate-in fade-in slide-in-from-bottom-2`}>
                    
                    {editingId === entry.id ? (
                        <div className="flex flex-col gap-3">
                            <input 
                                value={editForm.title}
                                onChange={e => setEditForm({...editForm, title: e.target.value})}
                                className="bg-black/40 border border-border-dark rounded px-2 py-1 text-white font-bold"
                                placeholder="Título"
                            />
                            <textarea 
                                value={editForm.content}
                                onChange={e => setEditForm({...editForm, content: e.target.value})}
                                className="bg-black/40 border border-border-dark rounded px-2 py-1 text-white text-sm min-h-[100px]"
                                placeholder="Contenido técnico..."
                            />
                            <input 
                                value={editForm.tags}
                                onChange={e => setEditForm({...editForm, tags: e.target.value})}
                                className="bg-black/40 border border-border-dark rounded px-2 py-1 text-text-secondary text-xs"
                                placeholder="Tags separados por coma"
                            />
                            <div className="flex gap-2 justify-end mt-2">
                                <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-700 rounded text-xs">Cancelar</button>
                                <button onClick={() => saveEditing(entry)} className="px-3 py-1 bg-primary text-white rounded text-xs font-bold">Guardar Cambios</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="absolute top-3 right-3 flex gap-1 z-20">
                                <button 
                                onClick={() => startEditing(entry)}
                                className="p-1.5 text-text-secondary bg-[#1a2332] hover:text-white hover:bg-white/10 rounded-lg transition-colors shadow-sm border border-transparent hover:border-white/10"
                                title="Corregir o Editar"
                                >
                                <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button 
                                onClick={(e) => requestDelete(e, entry.id)}
                                className="p-1.5 text-text-secondary bg-[#1a2332] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shadow-sm border border-transparent hover:border-red-500/20"
                                title="Eliminar Definitivamente"
                                >
                                <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3 pr-16">
                            {entry.tags.map((tag, i) => (
                                <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${tag.includes('Revisión') || tag.includes('Error') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-purple-500/10 text-purple-300 border-purple-500/20'}`}>
                                {tag}
                                </span>
                            ))}
                            </div>
                            
                            <h3 className="text-white font-bold text-lg mb-2 leading-tight pr-8">{entry.title}</h3>
                            <p className="text-text-secondary text-sm leading-relaxed line-clamp-4 mb-4 whitespace-pre-wrap">
                            {entry.content}
                            </p>
                            
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase border-t border-white/5 pt-3">
                            <span className="material-symbols-outlined text-sm">
                                {entry.source.startsWith('Archivo:') ? 'picture_as_pdf' : entry.source.startsWith('http') ? 'public' : 'edit_note'}
                            </span>
                            <span className="truncate max-w-[200px]">{entry.source}</span>
                            </div>
                        </>
                    )}
                 </div>
               ))}
             </div>
           )}
        </div>

      </div>

      <ConfirmDialog 
        isOpen={deleteId !== null}
        title="Eliminar Conocimiento"
        message="Esta información se perderá permanentemente y no podrá ser usada para futuros diagnósticos. ¿Estás seguro?"
        confirmText="Sí, Eliminar"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default KnowledgeBase;
