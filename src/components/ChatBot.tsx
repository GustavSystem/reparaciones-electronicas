
import React, { useState, useRef } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { getSettings, getSessionData, addKnowledgeEntry, getAllKnowledge } from '../services/storage';
import { useLocation, useNavigate } from 'react-router-dom';
import { processTechnicalPDF } from '../services/gemini';

interface ChatBotProps {
  onSaveRepair?: () => void;
  onNewRepair?: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ onSaveRepair, onNewRepair }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{name: string, data: string, type: string} | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- HERRAMIENTAS DEL CHATBOT ---

  const saveKnowledgeTool: FunctionDeclaration = {
      name: "save_knowledge_entry",
      description: "Guarda información técnica importante (esquemas, notas, manuales) en la Base de Conocimientos para que la App la use en futuros análisis.",
      parameters: {
          type: Type.OBJECT,
          properties: {
              title: { type: Type.STRING, description: "Título breve." },
              content: { type: Type.STRING, description: "Contenido técnico detallado." },
              tags: { type: Type.STRING, description: "Tags separados por coma." },
              source: { type: Type.STRING, description: "Origen (ej: 'PDF Upload', 'Chat')." }
          },
          required: ["title", "content", "tags", "source"]
      }
  };

  const searchKnowledgeTool: FunctionDeclaration = {
      name: "search_knowledge_base",
      description: "Busca en la biblioteca de conocimientos del usuario. Útil para saber si ya existe un esquema o manual de una placa específica.",
      parameters: {
          type: Type.OBJECT,
          properties: {
              query: { type: Type.STRING, description: "Términos de búsqueda (ej: 'Esquema HP', 'Falla encendido')." }
          },
          required: ["query"]
      }
  };

  const getContextTool: FunctionDeclaration = {
      name: "get_current_repair_context",
      description: "Lee los datos de la reparación actual en pantalla (Modelo, Síntomas, etc).",
      parameters: { type: Type.OBJECT, properties: {} }
  };

  const navigateTool: FunctionDeclaration = {
      name: "navigate_to_screen",
      description: "Navega a una pantalla específica de la aplicación.",
      parameters: {
          type: Type.OBJECT,
          properties: {
              screen: { 
                  type: Type.STRING, 
                  description: "Ruta de la pantalla. Opciones: '/', '/pcb-id', '/boardview', '/guided-measurement', '/diagnostics', '/database', '/knowledge-base', '/settings'" 
              }
          },
          required: ["screen"]
      }
  };

  const saveRepairTool: FunctionDeclaration = {
      name: "save_current_repair",
      description: "Guarda la reparación actual en el historial. Úsalo cuando el usuario pida guardar su progreso.",
      parameters: { type: Type.OBJECT, properties: {} }
  };

  const startNewRepairTool: FunctionDeclaration = {
      name: "start_new_repair",
      description: "Inicia una nueva reparación, borrando los datos de la sesión actual. Úsalo cuando el usuario quiera empezar de cero.",
      parameters: { type: Type.OBJECT, properties: {} }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const base64 = (evt.target?.result as string).split(',')[1];
          setAttachedFile({
              name: file.name,
              data: base64,
              type: file.type
          });
      };
      reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || loading) return;
    
    // Crear mensaje de usuario
    const userMsg = input + (attachedFile ? ` [Archivo adjunto: ${attachedFile.name}]` : "");
    const newMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const settings = getSettings();
      const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      const modelToUse = settings.geminiModel || 'gemini-3-flash-preview';

      const currentScreen = location.pathname;
      
      // Construir contenido (Texto + Archivo opcional)
      let messageParts: any[] = [{ text: userMsg }];
      if (attachedFile) {
          // Si es PDF o Imagen, lo enviamos inline
          if (attachedFile.type === 'application/pdf' || attachedFile.type.startsWith('image/')) {
              messageParts = [
                  { inlineData: { mimeType: attachedFile.type, data: attachedFile.data } },
                  { text: input || "Analiza este archivo. Si es un esquema o manual, extrae los datos clave y guárdalos en la base de conocimientos." }
              ];
          }
      }

      // Limpiamos archivo adjunto del estado
      const fileProcessing = attachedFile; 
      setAttachedFile(null); 

      const chat = ai.chats.create({ 
        model: modelToUse,
        config: { 
            systemInstruction: `Eres el Cerebro Central de Gusrepart.
            Ubicación actual del usuario: ${currentScreen}.
            
            TIENES ACCESO TOTAL A LA APP:
            1. 'save_knowledge_entry': CRÍTICO. Si el usuario sube un PDF o esquema, DEBES leerlo y usar esta tool para GUARDARLO. Así la sección de Mediciones podrá leer los componentes.
            2. 'search_knowledge_base': Úsalo antes de responder dudas técnicas para ver si ya tenemos info.
            3. 'get_current_repair_context': Para ver qué placa se está reparando ahora.
            4. 'navigate_to_screen': Para mover al usuario a otra sección de la app cuando lo pida.
            5. 'save_current_repair': Para guardar el progreso de la reparación actual.
            6. 'start_new_repair': Para iniciar una nueva reparación desde cero.
            
            Si te suben un archivo, analízalo a fondo y ofrece guardarlo.
            Actúa como un agente proactivo que ayuda al usuario en cada paso de la reparación.`,
            tools: [{ functionDeclarations: [saveKnowledgeTool, searchKnowledgeTool, getContextTool, navigateTool, saveRepairTool, startNewRepairTool] }]
        }
      });

      // Enviar mensaje
      const result = await chat.sendMessage({ 
          message: messageParts
      });
      
      let responseText = result.text || "";
      
      // --- MANEJO DE FUNCTION CALLS ---
      const functionCalls = result.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
          for (const call of functionCalls) {
              let toolResult = "";
              const args: any = call.args || {};

              if (call.name === 'save_knowledge_entry') {
                  await addKnowledgeEntry({
                      id: crypto.randomUUID(),
                      title: args.title,
                      content: args.content,
                      tags: args.tags ? String(args.tags).split(',') : ['Auto-Guardado'],
                      source: args.source || "ChatBot",
                      timestamp: Date.now()
                  });
                  toolResult = "Información guardada en Biblioteca correctamente.";
              }
              else if (call.name === 'search_knowledge_base') {
                  const query = (args.query || "") as string;
                  const data = await getAllKnowledge();
                  const found = data.filter(d => JSON.stringify(d).toLowerCase().includes(query.toLowerCase())).slice(0, 3);
                  toolResult = found.length > 0 ? JSON.stringify(found) : "No encontré nada en la biblioteca.";
              }
              else if (call.name === 'get_current_repair_context') {
                  const pcbResult = await getSessionData('pcbResult');
                  const receptionData = await getSessionData('receptionData');
                  toolResult = JSON.stringify({ detected: pcbResult, manual: receptionData });
              }
              else if (call.name === 'navigate_to_screen') {
                  const screen = args.screen as string;
                  if (screen) {
                      navigate(screen);
                      toolResult = `Navegando a la pantalla: ${screen}`;
                  } else {
                      toolResult = "Error: no se especificó la pantalla.";
                  }
              }
              else if (call.name === 'save_current_repair') {
                  if (onSaveRepair) {
                      onSaveRepair();
                      toolResult = "Se ha abierto el diálogo para guardar la reparación.";
                  } else {
                      toolResult = "Error: no se pudo guardar la reparación.";
                  }
              }
              else if (call.name === 'start_new_repair') {
                  if (onNewRepair) {
                      onNewRepair();
                      toolResult = "Se ha abierto el diálogo para iniciar una nueva reparación.";
                  } else {
                      toolResult = "Error: no se pudo iniciar una nueva reparación.";
                  }
              }

              // Enviar respuesta de la tool al chat para que genere la respuesta final
              const toolResponse = await chat.sendMessage({
                  message: [{
                      functionResponse: {
                          name: call.name,
                          response: { result: toolResult }
                      }
                  }]
              });
              responseText += `\n${toolResponse.text}`;
          }
      }

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="p-4 bg-primary text-white rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
        >
          <span className="material-symbols-outlined">smart_toy</span>
        </button>
      )}

      {isOpen && (
        <div className="w-80 md:w-96 h-[500px] bg-[#1a2332] border border-border-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0">
            <h3 className="font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">smart_toy</span> Agente Gusrepart
            </h3>
            <button onClick={() => setIsOpen(false)}><span className="material-symbols-outlined">close</span></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background-dark">
            {messages.length === 0 && (
              <div className="text-center text-text-secondary text-sm mt-10">
                  <p>Hola. Soy el cerebro de la app.</p>
                  <p className="mt-2">Puedo leer PDFs, guardar esquemas y ver tu reparación actual.</p>
                  <p className="mt-2 text-xs italic">Prueba a subir un archivo con el clip.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg text-sm max-w-[85%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-white' : 'bg-border-dark text-white'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-text-secondary animate-pulse ml-2">Pensando / Analizando archivo...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de Input y Archivo */}
          <div className="p-3 border-t border-border-dark flex flex-col gap-2 bg-[#161b26]">
            {attachedFile && (
                <div className="flex items-center justify-between bg-primary/20 px-3 py-1 rounded-lg text-xs text-primary truncate">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">attach_file</span> {attachedFile.name}</span>
                    <button onClick={() => setAttachedFile(null)} className="text-red-400 hover:text-red-300">✕</button>
                </div>
            )}
            
            <div className="flex gap-2 items-center">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Adjuntar PDF o Imagen"
                >
                    <span className="material-symbols-outlined">attach_file</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,image/*"
                    onChange={handleFileUpload} 
                />
                
                <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={attachedFile ? "Añade un comentario..." : "¿En qué te ayudo?"}
                className="flex-1 bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white"
                />
                <button onClick={handleSend} className="p-2 text-primary hover:bg-white/5 rounded"><span className="material-symbols-outlined">send</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
