
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { getSettings, saveSettings } from '../services/storage';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  
  // Estado para controlar si usamos el input manual o el select
  const [isManualModel, setIsManualModel] = useState(false);

  useEffect(() => {
    // Si el modelo guardado no está en la lista estándar, activar modo manual automáticamente
    const standardModels = [
        'gemini-3-flash-preview', 
        'gemini-3.1-pro-preview'
    ];
    if (settings.geminiModel && !standardModels.includes(settings.geminiModel)) {
        setIsManualModel(true);
    }
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    alert("Configuración guardada. La aplicación se recargará ahora.");
    window.location.reload(); 
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-background-dark">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
           <h1 className="text-4xl font-black text-white mb-2">Configuración</h1>
           <p className="text-text-secondary">Personaliza el motor de inteligencia artificial.</p>
        </div>

        {/* SOLO GEMINI CLOUD */}
        <div className="bg-[#1a2332] border border-border-dark rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 border-l-4 border-l-primary">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">cloud</span>
                Motor de Inteligencia (Google Gemini)
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-text-secondary uppercase">Gemini API Key</label>
                    <input 
                        type="password"
                        value={settings.geminiApiKey || ''}
                        onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                        placeholder="AIzaSy... (Deja vacío para usar .env)"
                        className="w-full mt-1 bg-black/40 border border-border-dark rounded-lg px-4 py-2 text-white font-mono"
                    />
                    <p className="text-[10px] text-text-secondary mt-1">Si dejas esto vacío, usará la clave del archivo .env</p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">Modelo Gemini</label>
                        <button 
                            onClick={() => {
                                setIsManualModel(!isManualModel);
                                if(isManualModel) setSettings({...settings, geminiModel: 'gemini-3-flash-preview'});
                                else setSettings({...settings, geminiModel: ''}); 
                            }}
                            className="text-[10px] text-primary hover:underline cursor-pointer font-bold"
                        >
                            {isManualModel ? "Volver a la Lista" : "¿Usar modelo futuro/personalizado?"}
                        </button>
                    </div>

                    {!isManualModel ? (
                        <select
                            value={settings.geminiModel || 'gemini-3-flash-preview'}
                            onChange={(e) => setSettings({...settings, geminiModel: e.target.value})}
                            className="w-full mt-1 bg-black/40 border border-border-dark rounded-lg px-4 py-2 text-white"
                        >
                            <optgroup label="Serie 3 (Experimental - Alta Inteligencia)">
                                <option value="gemini-3-flash-preview">Gemini 3.0 Flash Preview (Recomendado)</option>
                                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Pensamiento Profundo)</option>
                            </optgroup>
                        </select>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-left-2">
                            <input 
                                type="text"
                                value={settings.geminiModel}
                                onChange={(e) => setSettings({...settings, geminiModel: e.target.value})}
                                placeholder="ej: gemini-4.0-ultra-preview"
                                className="w-full mt-1 bg-purple-900/20 border border-purple-500/50 rounded-lg px-4 py-2 text-white font-mono"
                            />
                            <p className="text-[10px] text-purple-300 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">science</span>
                                Modo Futuro: Escribe aquí el ID de cualquier modelo nuevo que lance Google.
                            </p>
                        </div>
                    )}
                        
                        {!isManualModel && (
                            <p className="text-[10px] text-text-secondary mt-1">
                            <b>Nota:</b> Si recibes errores de cuota (429), usa <b>Gemini 3.0 Flash Preview</b>.
                            </p>
                        )}
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-border-dark flex justify-end">
            <button 
                onClick={handleSave}
                className="px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all"
            >
                Guardar Configuración
            </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
