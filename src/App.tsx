
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ConfirmDialog from './components/ConfirmDialog';
import Dashboard from './screens/Dashboard';
import PCBIdentification from './screens/PCBIdentification';
import BoardviewSchematics from './screens/BoardviewSchematics';
import GuidedMeasurement from './screens/GuidedMeasurement';
import DiagnosticDecisionTree from './screens/DiagnosticDecisionTree';
import DatabaseScreen from './screens/DatabaseScreen';
import ComponentDetails from './screens/ComponentDetails';
import KnowledgeBase from './screens/KnowledgeBase';
import Settings from './screens/Settings';
import ChatBot from './components/ChatBot';
import { PCBAnalysisResult, MeasurementPoint, DiagnosticTurn } from './types';
import { getSessionData, saveSessionData, clearSessionStorage, saveRepairToHistory, initializeDatabase } from './services/storage';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showNewRepairModal, setShowNewRepairModal] = useState(false);
  
  // Estados de sesión
  const [pcbImages, setPcbImages] = useState<string[]>([]);
  const [pcbResult, setPcbResult] = useState<PCBAnalysisResult | null>(null);
  const [schematicInfo, setSchematicInfo] = useState<{summary: string, sources: string} | null>(null);
  const [functionalAI, setFunctionalAI] = useState<string>("");
  const [measurements, setMeasurements] = useState<MeasurementPoint[]>([]);
  const [diagHistory, setDiagHistory] = useState<DiagnosticTurn[]>([]);
  const [currentRepairTimestamp, setCurrentRepairTimestamp] = useState<number | null>(null);

  const [tempModel, setTempModel] = useState({ manufacturer: '', model: '', boardNumber: '' });

  // Carga inicial y Sembrado de DB
  useEffect(() => {
    const initSystem = async () => {
      try {
        await initializeDatabase();
        const results = await Promise.allSettled([
          getSessionData('pcbImages'),
          getSessionData('pcbResult'),
          getSessionData('schematicInfo'),
          getSessionData('functionalAI'),
          getSessionData('measurements'),
          getSessionData('diagHistory'),
          getSessionData('currentRepairTimestamp')
        ]);

        const getVal = (idx: number) => results[idx].status === 'fulfilled' ? (results[idx] as PromiseFulfilledResult<any>).value : null;

        const imgs = getVal(0);
        const res = getVal(1);
        const schem = getVal(2);
        const func = getVal(3);
        const meas = getVal(4);
        const diag = getVal(5);
        const ts = getVal(6);

        if (imgs) setPcbImages(imgs);
        if (res) setPcbResult(res);
        if (schem) setSchematicInfo(schem);
        if (func) setFunctionalAI(func);
        if (meas) setMeasurements(meas);
        if (diag) setDiagHistory(diag);
        if (ts) setCurrentRepairTimestamp(ts);
        
      } catch (e) { 
          console.error("Critical Load Error", e); 
      } finally { 
          setIsLoaded(true); 
      }
    };
    initSystem();
  }, []); 

  // Auto-guardado
  useEffect(() => {
    if (isLoaded && !isClearing) {
      const timer = setTimeout(() => {
        if (pcbImages.length > 0 || pcbResult || diagHistory.length > 0) {
            saveSessionData('pcbImages', pcbImages);
            saveSessionData('pcbResult', pcbResult);
            saveSessionData('schematicInfo', schematicInfo);
            saveSessionData('functionalAI', functionalAI);
            saveSessionData('measurements', measurements);
            saveSessionData('diagHistory', diagHistory);
            saveSessionData('currentRepairTimestamp', currentRepairTimestamp);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pcbImages, pcbResult, schematicInfo, functionalAI, measurements, diagHistory, currentRepairTimestamp, isLoaded, isClearing]);

  const handleNewRepairConfirm = async () => {
    setIsClearing(true); 
    try {
        await clearSessionStorage();
    } catch(e) { console.error(e); }

    setPcbImages([]);
    setPcbResult(null);
    setSchematicInfo(null);
    setFunctionalAI("");
    setMeasurements([]);
    setDiagHistory([]);
    setCurrentRepairTimestamp(null);
    setTempModel({ manufacturer: '', model: '', boardNumber: '' });

    setShowNewRepairModal(false);
    navigate('/pcb-id');
    
    setTimeout(() => {
        setIsClearing(false);
    }, 500);
  };

  const executeSave = async (metadata?: any) => {
    setIsSaving(true);
    try {
      const ts = currentRepairTimestamp || Date.now();
      const finalRes = metadata ? { ...pcbResult, ...metadata } : pcbResult;
      
      const record = {
        timestamp: ts,
        pcbImages,
        pcbResult: finalRes,
        schematicInfo,
        functionalAI,
        measurements, 
        diagHistory
      };
      
      await saveRepairToHistory(record);
      
      setCurrentRepairTimestamp(ts);
      if (finalRes) setPcbResult(finalRes as PCBAnalysisResult);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setShowSaveModal(false);
    } catch (e) {
      alert("Error guardando. Intente de nuevo.");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGlobalSave = () => {
    if (currentRepairTimestamp && pcbResult?.model) {
      executeSave();
    } else {
      setTempModel({ 
        manufacturer: pcbResult?.manufacturer || '', 
        model: pcbResult?.model || '', 
        boardNumber: pcbResult?.boardNumber || '' 
      });
      setShowSaveModal(true);
    }
  };

  const handleMeasurementVerdict = (verdict: string) => {
    const verdictTurn: DiagnosticTurn = {
        role: 'assistant',
        content: `🔍 **RESULTADO DE MEDICIONES:**\n${verdict}\n\n¿Cómo procedemos ahora?`,
        timestamp: Date.now()
    };
    
    setDiagHistory(prev => [...prev, verdictTurn]);
    navigate('/diagnostics');
  };

  const loadRepair = (repair: any) => {
    setIsClearing(true);
    setPcbImages(repair.pcbImages || []);
    setPcbResult(repair.pcbResult || null);
    setSchematicInfo(repair.schematicInfo || null);
    setFunctionalAI(repair.functionalAI || "");
    setMeasurements(repair.measurements || []); 
    setDiagHistory(repair.diagHistory || []);   
    setCurrentRepairTimestamp(repair.timestamp || null);
    
    setTimeout(() => setIsClearing(false), 500);
  };

  if (!isLoaded) return <div className="h-screen w-full bg-background-dark flex items-center justify-center"><span className="material-symbols-outlined text-4xl animate-spin text-primary">settings</span></div>;

  return (
    <div className="flex h-screen w-full bg-background-dark text-white overflow-hidden font-display relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header onSave={handleGlobalSave} isSaving={isSaving} isSuccess={saveSuccess} />
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Dashboard onLoadRepair={(r) => { loadRepair(r); navigate('/pcb-id'); }} onNewRepair={() => setShowNewRepairModal(true)} />} />
            <Route path="/pcb-id" element={<PCBIdentification persistedImages={pcbImages} persistedResult={pcbResult} onUpdate={(imgs, res, schem, func) => { 
                if (!isClearing) {
                  setPcbImages([...imgs]);
                  if (res !== undefined) setPcbResult(res);
                  if (schem !== undefined) setSchematicInfo(schem);
                  if (func !== undefined) setFunctionalAI(func);
                }
            }} />} />
            <Route path="/boardview" element={<BoardviewSchematics pcbResult={pcbResult} schematicInfo={schematicInfo} functionalAI={functionalAI} />} />
            <Route 
                path="/measure" 
                element={
                    <GuidedMeasurement 
                        pcbImages={pcbImages} 
                        pcbResult={pcbResult} 
                        functionalAI={functionalAI} 
                        persistedPoints={measurements} 
                        onUpdate={(p) => !isClearing && setMeasurements(p)} 
                        onVerdictGenerated={handleMeasurementVerdict}
                    />
                } 
            />
            <Route path="/diagnostics" element={<DiagnosticDecisionTree persistedHistory={diagHistory} pcbResult={pcbResult} onUpdate={(h) => !isClearing && setDiagHistory(h)} />} />
            <Route path="/component" element={<ComponentDetails />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/database" element={<DatabaseScreen onLoadRepair={loadRepair} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <ChatBot />
      </div>

      <ConfirmDialog 
        isOpen={showNewRepairModal}
        title="Iniciar Nueva Reparación"
        message="Se limpiará la mesa de trabajo actual para comenzar un nuevo diagnóstico. Asegúrate de haber guardado cambios importantes."
        confirmText="Sí, Limpiar Todo"
        onConfirm={handleNewRepairConfirm}
        onCancel={() => setShowNewRepairModal(false)}
      />

      {showSaveModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-surface-dark w-full max-w-md rounded-2xl p-8 border border-border-dark shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">save</span>
              Guardar Reparación
            </h2>
            <div className="space-y-4">
              <div>
                  <label className="text-[10px] text-text-secondary uppercase font-bold">Marca</label>
                  <input className="w-full bg-black/40 border border-border-dark rounded-xl px-4 py-2" value={tempModel.manufacturer} onChange={e => setTempModel({...tempModel, manufacturer: e.target.value})} />
              </div>
              <div>
                  <label className="text-[10px] text-text-secondary uppercase font-bold">Modelo</label>
                  <input className="w-full bg-black/40 border border-border-dark rounded-xl px-4 py-2" value={tempModel.model} onChange={e => setTempModel({...tempModel, model: e.target.value})} />
              </div>
              <div>
                  <label className="text-[10px] text-text-secondary uppercase font-bold">Board ID / Serial</label>
                  <input className="w-full bg-black/40 border border-border-dark rounded-xl px-4 py-2 font-mono" value={tempModel.boardNumber} onChange={e => setTempModel({...tempModel, boardNumber: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 border border-border-dark rounded-xl hover:bg-white/5 font-bold transition-colors">Cancelar</button>
              <button onClick={() => executeSave(tempModel)} className="flex-1 py-3 bg-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;
