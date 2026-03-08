
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyzePCBImage, searchSchematics, getFunctionalAnalysis } from '../services/gemini';
import { findSimilarRepairs } from '../services/storage';
import { PCBAnalysisResult } from '../types';

interface PCBIdentificationProps {
  persistedImages: string[];
  persistedResult: PCBAnalysisResult | null;
  persistedReceptionData?: { model: string, serial: string, symptoms: string };
  onUpdate: (images: string[], result?: PCBAnalysisResult | null, schematics?: any, functional?: string, receptionData?: any) => void;
}

const PCBIdentification: React.FC<PCBIdentificationProps> = ({ persistedImages, persistedResult, persistedReceptionData, onUpdate }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Datos de recepción manuales (Input del técnico)
  const [receptionData, setReceptionData] = useState({
      model: persistedReceptionData?.model || '',
      serial: persistedReceptionData?.serial || '',
      symptoms: persistedReceptionData?.symptoms || ''
  });
  
  // ESTADO INICIAL
  const [images, setImages] = useState<string[]>(
    (persistedImages && persistedImages.length > 0) ? persistedImages : ["", ""]
  );
  
  const [result, setResult] = useState<PCBAnalysisResult | null>(persistedResult);
  const [status, setStatus] = useState<string>("");
  const [similarCases, setSimilarCases] = useState<any[]>([]);
  
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  useEffect(() => {
    const targetImages = (persistedImages && persistedImages.length > 0) ? persistedImages : ["", ""];
    if (JSON.stringify(targetImages) !== JSON.stringify(images)) {
      setImages(targetImages);
    }
    if (persistedResult && JSON.stringify(persistedResult) !== JSON.stringify(result)) {
      setResult(persistedResult);
    }
    if (persistedReceptionData) {
        if(persistedReceptionData.model !== receptionData.model || 
           persistedReceptionData.serial !== receptionData.serial || 
           persistedReceptionData.symptoms !== receptionData.symptoms) {
             setReceptionData(persistedReceptionData);
        }
    }
  }, [persistedImages, persistedResult, persistedReceptionData]);

  useEffect(() => {
    if (result?.model) {
      findSimilarRepairs(result.model).then(setSimilarCases);
    } else {
      setSimilarCases([]);
    }
  }, [result?.model]);

  const handleInputChange = (field: string, value: string) => {
      const newData = { ...receptionData, [field]: value };
      setReceptionData(newData);
      onUpdate(images, result, undefined, undefined, newData);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeSlot === null) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const newImages = [...images];
      newImages[activeSlot] = base64;
      setImages(newImages);
      
      onUpdate(newImages, result || undefined, undefined, undefined, receptionData);
      setActiveSlot(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const processImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = 'contrast(1.4) brightness(1.1) saturate(1.2) sharpen(1px)';
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const handleEnhance = async (e: React.MouseEvent, slot: number) => {
    e.stopPropagation();
    if (!images[slot]) return;
    
    setIsEnhancing(slot);
    try {
        const enhancedBase64 = await processImage(images[slot]);
        const newImages = [...images];
        newImages[slot] = enhancedBase64; 
        setImages(newImages);
        onUpdate(newImages, result || undefined, undefined, undefined, receptionData);
    } catch (err) {
        console.error("Error enhancing image", err);
    } finally {
        setIsEnhancing(null);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent, slot: number) => {
    e.stopPropagation();
    const newImages = [...images];
    newImages[slot] = "";
    setImages(newImages);
    onUpdate(newImages, result || undefined, undefined, undefined, receptionData);
  };

  const runVisualAnalysis = async () => {
    const activeImages = images.filter(img => img && img.length > 0);
    if (activeImages.length === 0) {
        alert("Por favor, sube al menos una imagen de la placa para confirmar visualmente el diagnóstico.");
        return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setStatus("Analizando placa visualmente...");
    
    try {
      const pureBase64s = activeImages.map(img => img); // analyzePCBImage se encarga de limpiar el base64 si es necesario
      
      const contextModel = receptionData.model || result?.model || "";
      const contextSerial = receptionData.serial || result?.boardNumber || "";
      const contextSymptoms = receptionData.symptoms || "";

      // 1. ANÁLISIS VISUAL
      const analysis = await analyzePCBImage(pureBase64s, {
          model: contextModel,
          serial: contextSerial,
          symptoms: contextSymptoms
      });
      
      setResult(analysis);

      // 2. DATOS COMPLEMENTARIOS
      if (analysis.model || analysis.boardNumber) {
          setStatus("Buscando esquemas y datos...");
          const query = `${analysis.manufacturer || ''} ${analysis.model || ''} ${analysis.boardNumber || ''}`;

          const [schematics, functional] = await Promise.all([
            searchSchematics(query),
            getFunctionalAnalysis(analysis.identifiedComponents || [], analysis.boardNumber || analysis.model || '')
          ]);
          
          onUpdate(images, analysis, schematics, functional, receptionData);
      } else {
          onUpdate(images, analysis, undefined, undefined, receptionData);
      }

    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Error de IA: ${error.message}. Verifica API Key y modelo.`);
      setStatus("Falló el análisis.");
    } finally {
      setIsAnalyzing(false);
      setStatus("");
    }
  };

  const updateResultField = (field: keyof PCBAnalysisResult, value: any) => {
    const newResult = result ? { ...result, [field]: value } : { 
      manufacturer: field === 'manufacturer' ? value : '', 
      model: field === 'model' ? value : '', 
      boardNumber: field === 'boardNumber' ? value : '', 
      confidence: 1, identifiedComponents: [], detectedAnomalies: [] 
    };
    setResult(newResult);
    onUpdate(images, newResult, undefined, undefined, receptionData);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(Math.max(1, prev + (e.deltaY > 0 ? -0.2 : 0.2)), 5));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden relative">
      {zoomImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="absolute top-6 right-6 z-10">
            <button onClick={() => setZoomImage(null)} className="p-3 bg-red-500 rounded-full text-white shadow-xl">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}>
            <img src={zoomImage} className="max-w-none h-[85vh] object-contain select-none" draggable={false} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 bg-[#1a2332] overflow-y-auto lg:border-r border-border-dark">
        <div className="p-6 md:p-10 flex flex-col h-full max-w-5xl mx-auto w-full">
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-3xl md:text-4xl font-black text-white">Recepción y Análisis</h1>
            <p className="text-text-secondary">Paso 1: Introduce los datos del equipo y sube imágenes. La IA realizará el diagnóstico completo.</p>
          </div>
          
          {/* PANEL DE DATOS DE RECEPCIÓN */}
          <div className="bg-[#111722] border border-border-dark rounded-2xl p-6 mb-8 shadow-lg">
              <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">assignment</span>
                  Datos de Entrada
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs text-text-secondary uppercase font-bold mb-1 block">Modelo del Equipo</label>
                      <input 
                        value={receptionData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                        placeholder="Ej: HP Pavilion 15-cw" 
                        className="w-full bg-black/30 border border-border-dark rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                      />
                  </div>
                  <div>
                      <label className="text-xs text-text-secondary uppercase font-bold mb-1 block">Número de Serie / ID</label>
                      <input 
                        value={receptionData.serial}
                        onChange={(e) => handleInputChange('serial', e.target.value)}
                        placeholder="Ej: 5CD84..." 
                        className="w-full bg-black/30 border border-border-dark rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-mono"
                      />
                  </div>
                  <div className="md:col-span-2">
                      <label className="text-xs text-text-secondary uppercase font-bold mb-1 block">Síntomas de Avería / Notas del Cliente</label>
                      <textarea 
                        value={receptionData.symptoms}
                        onChange={(e) => handleInputChange('symptoms', e.target.value)}
                        placeholder="Ej: No enciende, LED de carga parpadea, se mojó hace una semana..." 
                        className="w-full bg-black/30 border border-border-dark rounded-xl px-4 py-3 text-white focus:border-primary outline-none h-20 resize-none"
                      />
                  </div>
              </div>
          </div>

          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[300px]">
            {[0, 1].map((slot) => (
              <div key={slot} className={`relative flex items-center justify-center rounded-2xl border-2 border-dashed ${images[slot] ? 'border-primary' : 'border-border-dark'} bg-[#111722] hover:bg-[#161e2c] transition-all group overflow-hidden shadow-lg`}>
                {images[slot] ? (
                  <>
                    <img 
                        src={images[slot]} 
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-500" 
                    />
                    
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => setZoomImage(images[slot])} className="p-4 bg-primary text-white rounded-full shadow-2xl hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">zoom_in</span>
                      </button>
                      <button 
                        onClick={(e) => handleEnhance(e, slot)} 
                        className={`p-3 bg-surface-dark rounded-xl text-white border border-white/10 ${isEnhancing === slot ? 'animate-spin' : ''}`}
                        title="Mejorar nitidez e iluminación para la IA"
                      >
                        <span className="material-symbols-outlined">auto_fix</span>
                      </button>
                      <button onClick={(e) => handleRemoveImage(e, slot)} className="p-3 bg-red-500/20 text-red-500 rounded-xl border border-red-500/30">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => { setActiveSlot(slot); fileInputRef.current?.click(); }} className="flex flex-col items-center gap-4 p-8 w-full h-full justify-center group">
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform border border-primary/20">
                      <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                    </div>
                    <p className="text-sm font-bold text-text-secondary">{slot === 0 ? 'Subir Frente' : 'Subir Reverso'}</p>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-4">
             {status && <p className="text-primary text-sm font-mono animate-pulse w-full text-center">{status}</p>}
             {errorMsg && <p className="text-red-400 text-sm font-bold w-full text-center">{errorMsg}</p>}
             
             <button 
               onClick={runVisualAnalysis} 
               disabled={images.filter(img => img && img.length > 0).length === 0 || isAnalyzing} 
               className="w-full md:w-auto px-8 py-4 rounded-xl font-bold text-lg bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all text-white disabled:opacity-30 flex items-center justify-center gap-3"
             >
               <span className="material-symbols-outlined">{isAnalyzing ? 'sync' : 'rocket_launch'}</span>
               <span>{isAnalyzing ? status || 'Procesando...' : 'Analizar Diagnóstico'}</span>
             </button>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[420px] bg-background-dark flex flex-col border-t lg:border-t-0 overflow-y-auto p-6 shadow-2xl z-10">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span>
            Resultados IA
            </h2>
            {result && (
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
                    title={isEditing ? "Ver visualización" : "Editar datos"}
                >
                    <span className="material-symbols-outlined text-sm">{isEditing ? 'visibility' : 'edit'}</span>
                </button>
            )}
        </div>
        
        {result || images.some(i => i) ? (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl border transition-all relative overflow-hidden ${isEditing ? 'bg-[#111722] border-primary/50 ring-1 ring-primary/20' : 'bg-surface-dark border-white/5'}`}>
              
              {!isEditing && (
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                       <span className="material-symbols-outlined text-6xl">qr_code_2</span>
                  </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-1">Fabricante</label>
                  {isEditing ? (
                      <input 
                      type="text" 
                      value={result?.manufacturer || ''} 
                      onChange={(e) => updateResultField('manufacturer', e.target.value)}
                      placeholder="Ej: Dell, HP, Apple"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-white focus:ring-1 focus:ring-primary outline-none"
                      />
                  ) : (
                      <p className="text-lg font-bold text-white">{result?.manufacturer || <span className="text-white/20 italic">---</span>}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-1">Modelo de Equipo</label>
                   {isEditing ? (
                      <input 
                      type="text" 
                      value={result?.model || ''} 
                      onChange={(e) => updateResultField('model', e.target.value)}
                      placeholder="Ej: MacBook Pro A1708"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-white focus:ring-1 focus:ring-primary outline-none"
                      />
                  ) : (
                      <p className="text-lg font-bold text-white">{result?.model || <span className="text-white/20 italic">---</span>}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-1">Board Number / Referencia PCB</label>
                   {isEditing ? (
                      <input 
                      type="text" 
                      value={result?.boardNumber || ''} 
                      onChange={(e) => updateResultField('boardNumber', e.target.value)}
                      placeholder="Ej: 820-00840-A"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-primary outline-none"
                      />
                  ) : (
                      <p className="text-sm font-mono text-primary tracking-wide">{result?.boardNumber || <span className="text-white/20 italic">---</span>}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
              
              {result && (
                 <div className="pt-2 border-t border-white/5">
                    <Link to="/boardview" className="w-full flex items-center justify-center gap-3 rounded-xl bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 h-14 text-white font-bold text-lg transition-all group">
                        <span>Ver Resultados Completos</span>
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                    <p className="text-center text-[10px] text-text-secondary mt-3">Esquemas y Análisis Funcional generados automáticamente.</p>
                 </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20 text-center">
            <span className="material-symbols-outlined text-8xl mb-4">memory</span>
            <p className="text-sm">Panel de Datos Vacío</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PCBIdentification;
