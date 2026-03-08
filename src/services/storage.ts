
import { INITIAL_KNOWLEDGE } from "../data/initialKnowledge";
import { AppSettings } from "../types";

const DB_NAME = 'Gusrepart_Master_DB'; 
const DB_VERSION = 2; 
const SESSION_STORE = 'session';
const HISTORY_STORE = 'history';
const KNOWLEDGE_STORE = 'knowledge';
const LS_PREFIX = 'GUSREPART_SESSION_';
const SETTINGS_KEY = 'GUSREPART_SETTINGS';

// IndexedDB Helper
const performOperation = (
  storeName: string, 
  mode: IDBTransactionMode, 
  callback: (store: IDBObjectStore) => IDBRequest | void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
        console.error("DB Error", request.error);
        reject(request.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) db.createObjectStore(SESSION_STORE);
      if (!db.objectStoreNames.contains(HISTORY_STORE)) db.createObjectStore(HISTORY_STORE, { keyPath: 'timestamp' });
      if (!db.objectStoreNames.contains(KNOWLEDGE_STORE)) db.createObjectStore(KNOWLEDGE_STORE, { keyPath: 'id' });
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      try {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        
        let req: IDBRequest | void;
        try { req = callback(store); } catch(err) { db.close(); reject(err); return; }

        transaction.oncomplete = () => {
          db.close(); 
          if (req && 'result' in req) resolve(req.result);
          else resolve(undefined);
        };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      } catch (e) { db.close(); reject(e); }
    };
  });
};

// --- SETTINGS SYSTEM ---
export const getSettings = (): AppSettings => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
      const parsed = JSON.parse(saved);
      return {
          geminiApiKey: parsed.geminiApiKey || '',
          geminiModel: parsed.geminiModel || 'gemini-3-flash-preview',
          ollamaUrl: parsed.ollamaUrl || 'http://localhost:11434',
          ollamaTextModel: parsed.ollamaTextModel || 'llama3',
          ollamaVisionModel: parsed.ollamaVisionModel || 'llava'
      };
  }
  return {
    geminiApiKey: '', 
    geminiModel: 'gemini-3-flash-preview',
    ollamaUrl: 'http://localhost:11434',
    ollamaTextModel: 'llama3',
    ollamaVisionModel: 'llava'
  };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- INITIALIZATION & SEEDING ---

export const initializeDatabase = async () => {
    try {
        const existing = await getAllKnowledge();
        if (existing.length === 0) {
            console.log("Base de datos vacía. Sembrando datos iniciales...");
            for (const entry of INITIAL_KNOWLEDGE) {
                await addKnowledgeEntry(entry);
            }
            return true;
        }
        return false;
    } catch (e) {
        console.error("Error inicializando DB:", e);
        return false;
    }
};

// --- SESSION & HISTORY ---

export const saveSessionData = async (key: string, data: any) => {
  if (key === 'pcbImages') {
    return performOperation(SESSION_STORE, 'readwrite', (store) => store.put(data, key));
  } else {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(data));
      return Promise.resolve();
    } catch (e) {
      console.warn("LocalStorage full or error", e);
      return Promise.resolve();
    }
  }
};

export const QK = async (key: string): Promise<any> => {
  if (key === 'pcbImages') {
    try {
      return await performOperation(SESSION_STORE, 'readonly', (store) => store.get(key));
    } catch { return null; }
  } else {
    const item = localStorage.getItem(LS_PREFIX + key);
    return item ? JSON.parse(item) : null;
  }
};

// Fix export name mismatch
export const getSessionData = async (key: string): Promise<any> => {
    return QK(key);
}

export const clearSessionStorage = async () => {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith(LS_PREFIX)) localStorage.removeItem(k);
  });
  try {
    await performOperation(SESSION_STORE, 'readwrite', (store) => store.clear());
  } catch (e) { console.error("Error clearing DB images", e); }
};

export const saveRepairToHistory = async (repair: any): Promise<number> => {
  const timestamp = Number(repair.timestamp || Date.now());
  const record = { ...repair, timestamp, lastModified: Date.now() };
  await performOperation(HISTORY_STORE, 'readwrite', (store) => store.put(record));
  return timestamp;
};

export const QH = async (): Promise<any[]> => {
  try {
    const result = await performOperation(HISTORY_STORE, 'readonly', (store) => store.getAll());
    return result || [];
  } catch (e) { return []; }
};
export const getAllRepairs = async (): Promise<any[]> => QH();

export const deleteRepairFromHistory = async (timestamp: number): Promise<boolean> => {
  try {
    await performOperation(HISTORY_STORE, 'readwrite', (store) => store.delete(Number(timestamp)));
    return true;
  } catch (e) { return false; }
};

export const findSimilarRepairs = async (model: string) => {
  try {
    const repairs = await getAllRepairs();
    if (!model) return [];
    const search = model.toLowerCase();
    return repairs.filter((h: any) => 
      h.pcbResult?.model?.toLowerCase().includes(search) ||
      h.pcbResult?.boardNumber?.toLowerCase().includes(search)
    );
  } catch (e) { return []; }
};

// --- KNOWLEDGE BASE SYSTEM ---

export const addKnowledgeEntry = async (entry: any) => {
    return performOperation(KNOWLEDGE_STORE, 'readwrite', (store) => store.put(entry));
};

export const getAllKnowledge = async (): Promise<any[]> => {
    try {
        const result = await performOperation(KNOWLEDGE_STORE, 'readonly', (store) => store.getAll());
        return result || [];
    } catch (e) { return []; }
};

export const searchKnowledgeContext = async (query: string): Promise<string> => {
    if (!query) return "";
    try {
        const all = await getAllKnowledge();
        const searchTerms = query.toLowerCase().split(' ');
        
        const relevant = all.filter(entry => {
            const text = (entry.title + " " + entry.tags.join(" ") + " " + entry.content).toLowerCase();
            return searchTerms.some(term => term.length > 2 && text.includes(term));
        });

        if (relevant.length === 0) return "";

        return `\n[BASE DE CONOCIMIENTOS EXPERTOS (APRENDIDO DEL USUARIO)]:\n${relevant.map(r => `- Título: ${r.title}\n  Nota: ${r.content}\n  Fuente: ${r.source}`).join('\n')}\n(Usa esta información PRIORITARIAMENTE para el diagnóstico).`;
    } catch (e) {
        return "";
    }
};

export const deleteKnowledgeEntry = async (id: string) => {
    return performOperation(KNOWLEDGE_STORE, 'readwrite', (store) => store.delete(id));
};

// --- BACKUP SYSTEM ---

export const exportDatabase = async (): Promise<string> => {
  const history = await getAllRepairs();
  const knowledge = await getAllKnowledge();
  return JSON.stringify({ history, knowledge }, null, 2);
};

export const importDatabase = async (jsonContent: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonContent);
    const historyData = Array.isArray(data) ? data : data.history || [];
    const knowledgeData = data.knowledge || [];
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction([HISTORY_STORE, KNOWLEDGE_STORE], 'readwrite');
            
            const historyStore = transaction.objectStore(HISTORY_STORE);
            historyData.forEach((item: any) => { if (item.timestamp) historyStore.put(item); });

            const knowledgeStore = transaction.objectStore(KNOWLEDGE_STORE);
            knowledgeData.forEach((item: any) => { if (item.id) knowledgeStore.put(item); });

            transaction.oncomplete = () => { db.close(); resolve(true); };
            transaction.onerror = () => { db.close(); reject(false); };
        };
        request.onerror = () => reject(false);
    });
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};