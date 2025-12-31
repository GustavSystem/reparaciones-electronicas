
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const newMessages = [...messages, { role: 'user' as const, text: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const chat = ai.chats.create({ 
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: "Eres un asistente experto en electrónica de Gusrepart. Ayuda a los técnicos con dudas rápidas sobre soldadura, componentes y esquemas." }
      });
      
      const response = await chat.sendMessage({ message: input });
      setMessages([...newMessages, { role: 'model', text: response.text || '' }]);
    } catch (err) {
      console.error(err);
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
        <div className="w-80 md:w-96 h-[500px] bg-surface-dark border border-border-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 bg-primary text-white flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">smart_toy</span> Asistente Técnico
            </h3>
            <button onClick={() => setIsOpen(false)}><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background-dark">
            {messages.length === 0 && (
              <p className="text-center text-text-secondary text-sm mt-10">¿En qué puedo ayudarte hoy?</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg text-sm max-w-[85%] ${m.role === 'user' ? 'bg-primary' : 'bg-border-dark'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-text-secondary animate-pulse">Escribiendo...</div>}
          </div>
          <div className="p-3 border-t border-border-dark flex gap-2">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Pregunta algo..."
              className="flex-1 bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={handleSend} className="p-2 text-primary"><span className="material-symbols-outlined">send</span></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
