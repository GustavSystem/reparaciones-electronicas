
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { getSettings, saveSettings } from '../services/storage';
import { ollamaGenerate } from '../services/ollama';

const Settings: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean, msg: string } | null>(null);

    // Auto-check connection on mount if Ollama is selected
    useEffect(() => {
        if (settings.aiProvider === 'ollama') {
            testOllama();
        }
    }, []);

    const handleSave = () => {
        saveSettings(settings);
        alert("Configuración guardada.");
        window.location.reload(); // Recargar para aplicar cambios en servicios
    };

    const testOllama = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            // Prueba de Texto
            await ollamaGenerate("ping", []);

            // Prueba de Visión (si está configurada)
            /* 
               Nota: No enviamos imagen real para no hacer pesada la prueba inicial, 
               pero si el usuario quiere probar visión específicamente, usamos el botón dedicado.
            */
            setTestResult({ success: true, msg: `Conectado a Ollama (Texto OK).` });
        } catch (e: any) {
            setTestResult({ success: false, msg: e.message });
        } finally {
            setIsTesting(false);
        }
    };

    const testVision = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            // Imagen 1x1 pixel transparente en base64 para probar el endpoint de visión
            const dummyImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
            await ollamaGenerate("describe this image", [dummyImage]);
            setTestResult({ success: true, msg: `¡Éxito! El modelo de visión (${settings.ollamaVisionModel}) está respondiendo.` });
        } catch (e: any) {
            setTestResult({ success: false, msg: `Error en Visión: ${e.message}. ¿Tienes memoria suficiente?` });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-background-dark">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2">Configuración</h1>
                    <p className="text-text-secondary">Elige el cerebro de tu asistente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* OPCIÓN GEMINI */}
                    <div
                        onClick={() => setSettings({ ...settings, aiProvider: 'gemini' })}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${settings.aiProvider === 'gemini' ? 'border-primary bg-primary/10' : 'border-border-dark bg-surface-dark opacity-60 hover:opacity-100'}`}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <span className="material-symbols-outlined text-4xl text-blue-400">cloud</span>
                            <div>
                                <h3 className="text-xl font-bold text-white">Google Gemini (Nube)</h3>
                                <p className="text-xs text-text-secondary">Recomendado para visión</p>
                            </div>
                        </div>
                        <ul className="text-sm space-y-2 text-gray-400 list-disc pl-4">
                            <li>Mejor calidad de análisis de imágenes.</li>
                            <li>Requiere Internet y API Key.</li>
                            <li>Tiene límites de uso en la versión gratuita.</li>
                            <li>Soporta lectura de PDFs nativa.</li>
                        </ul>
                    </div>

                    {/* OPCIÓN OLLAMA */}
                    <div
                        onClick={() => setSettings({ ...settings, aiProvider: 'ollama' })}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${settings.aiProvider === 'ollama' ? 'border-purple-500 bg-purple-500/10' : 'border-border-dark bg-surface-dark opacity-60 hover:opacity-100'}`}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <span className="material-symbols-outlined text-4xl text-purple-400">computer</span>
                            <div>
                                <h3 className="text-xl font-bold text-white">Ollama (Local)</h3>
                                <p className="text-xs text-text-secondary">Ilimitado y Privado</p>
                            </div>
                        </div>
                        <ul className="text-sm space-y-2 text-gray-400 list-disc pl-4">
                            <li>Totalmente gratis e ilimitado.</li>
                            <li>Privacidad 100% (funciona offline).</li>
                            <li>Requiere PC potente (GPU recomendada).</li>
                            <li>Calidad de visión depende del modelo (LLaVA).</li>
                        </ul>
                    </div>
                </div>

                {settings.aiProvider === 'ollama' && (
                    <div className="bg-[#1a2332] border border-border-dark rounded-2xl p-6 animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Configuración de Ollama</h3>
                            <div className="flex items-center gap-2">
                                <div className={`size-3 rounded-full ${testResult?.success ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
                                <span className="text-xs font-bold text-text-secondary">{testResult?.success ? 'ONLINE' : 'OFFLINE'}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase">URL del Servidor</label>
                                <input
                                    value={settings.ollamaUrl}
                                    onChange={(e) => setSettings({ ...settings, ollamaUrl: e.target.value })}
                                    className="w-full mt-1 bg-black/40 border border-border-dark rounded-lg px-4 py-2 text-white font-mono"
                                />
                                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <p className="text-[10px] text-yellow-500 font-bold mb-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">warning</span>
                                        IMPORTANTE: MANTENER TERMINAL ABIERTA
                                    </p>
                                    <p className="text-[10px] text-text-secondary">
                                        1. Minimiza (NO cierres) la ventana de PowerShell.<br />
                                        2. Si la cierras, ejecuta de nuevo: <code>$env:OLLAMA_ORIGINS="*"; ollama serve</code>
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-text-secondary uppercase">Modelo de Texto</label>
                                    <input
                                        value={settings.ollamaTextModel}
                                        onChange={(e) => setSettings({ ...settings, ollamaTextModel: e.target.value })}
                                        placeholder="ej: llama3"
                                        className="w-full mt-1 bg-black/40 border border-border-dark rounded-lg px-4 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-secondary uppercase">Modelo de Visión</label>
                                    <input
                                        value={settings.ollamaVisionModel}
                                        onChange={(e) => setSettings({ ...settings, ollamaVisionModel: e.target.value })}
                                        placeholder="ej: llava"
                                        className="w-full mt-1 bg-black/40 border border-border-dark rounded-lg px-4 py-2 text-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <button
                                    onClick={testOllama}
                                    disabled={isTesting}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    {isTesting ? 'Verificando...' : 'Probar Texto'}
                                </button>
                                <button
                                    onClick={testVision}
                                    disabled={isTesting}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    {isTesting ? 'Cargando Modelo...' : 'Probar Visión (Lento)'}
                                </button>
                            </div>
                            {testResult && !testResult.success && (
                                <div className="p-3 bg-red-900/20 border border-red-500/20 rounded text-xs text-red-200 font-mono">
                                    Error: {testResult.msg}
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
