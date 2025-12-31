
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

interface LiveAssistantProps {
  onClose: () => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const nextStartTimeRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const startSession = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    outputNodeRef.current = audioContextRef.current.createGain();
    outputNodeRef.current.connect(audioContextRef.current.destination);

    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: "Eres un asistente de manos libres para un técnico de reparación. Responde de forma concisa y profesional.",
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          setIsActive(true);
          const source = inputCtx.createMediaStreamSource(stream);
          const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            const pcmBase64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
            sessionPromise.then(s => s.sendRealtimeInput({ media: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' } }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
        },
        onmessage: async (msg: LiveServerMessage) => {
          if (msg.serverContent?.outputTranscription) {
             setTranscription(prev => [...prev.slice(-4), "AI: " + msg.serverContent!.outputTranscription!.text]);
          }
          if (msg.serverContent?.inputTranscription) {
             setTranscription(prev => [...prev.slice(-4), "Tú: " + msg.serverContent!.inputTranscription!.text]);
          }

          const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio && audioContextRef.current && outputNodeRef.current) {
            const ctx = audioContextRef.current;
            const bytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
            const dataInt16 = new Int16Array(bytes.buffer);
            const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(outputNodeRef.current);
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }
        },
        onclose: () => setIsActive(false),
        onerror: () => setIsActive(false),
      }
    });

    sessionRef.current = await sessionPromise;
  };

  useEffect(() => {
    startSession();
    return () => {
      sessionRef.current?.close();
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface-dark border border-border-dark rounded-3xl p-8 w-full max-w-lg flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(19,91,236,0.2)]">
        <div className="relative">
          <div className={`size-32 rounded-full border-4 border-primary flex items-center justify-center ${isActive ? 'animate-pulse' : ''}`}>
            <span className="material-symbols-outlined text-6xl text-primary">mic</span>
          </div>
          {isActive && (
             <div className="absolute -inset-4 border border-primary/20 rounded-full animate-ping"></div>
          )}
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold">Asistente de Voz AI</h2>
          <p className="text-text-secondary mt-1">{isActive ? 'Escuchando...' : 'Conectando...'}</p>
        </div>

        <div className="w-full bg-background-dark/50 rounded-xl p-4 h-48 overflow-y-auto space-y-2 font-mono text-sm">
          {transcription.map((line, i) => (
            <div key={i} className={line.startsWith('AI') ? 'text-primary' : 'text-white'}>
              {line}
            </div>
          ))}
          {transcription.length === 0 && <p className="text-text-secondary italic text-center py-10">Diga algo como "¿Cómo identifico el pin 1 de un IC?"</p>}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition-colors border border-red-500/20"
        >
          Finalizar Sesión
        </button>
      </div>
    </div>
  );
};

export default LiveAssistant;
