// Minimal IndexedDB helper for chats and messages persistence.
import type { Chat, ChatMessage } from '../types/chat';

const DB_NAME = 'sgr_chat_db';
const DB_VERSION = 1;
const STORE_CHATS = 'chats';
const STORE_MESSAGES = 'messages';

function promisify<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        const s = db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const s = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
        s.createIndex('chatId', 'chatId');
        s.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAllChats(): Promise<Chat[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_CHATS, 'readonly');
  const store = tx.objectStore(STORE_CHATS);
  const res = await promisify<Chat[]>(store.getAll());
  db.close();
  return res;
}

export async function putChat(chat: Chat): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_CHATS, 'readwrite');
  // Convert Proxy objects to plain objects using JSON serialization
  const plainChat = JSON.parse(JSON.stringify(chat)) as Chat;
  tx.objectStore(STORE_CHATS).put(plainChat);
  await txDone(tx);
  db.close();
}

export async function deleteChatDb(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_CHATS, 'readwrite');
  tx.objectStore(STORE_CHATS).delete(id);
  await txDone(tx);
  db.close();
}

export async function getAllMessages(): Promise<ChatMessage[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_MESSAGES, 'readonly');
  const store = tx.objectStore(STORE_MESSAGES);
  const res = await promisify<ChatMessage[]>(store.getAll());
  db.close();
  return res;
}

export async function getMessagesByChat(chatId: string): Promise<ChatMessage[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_MESSAGES, 'readonly');
  const idx = tx.objectStore(STORE_MESSAGES).index('chatId');
  const res = await promisify<ChatMessage[]>(idx.getAll(IDBKeyRange.only(chatId)));
  db.close();
  return res;
}

export async function putMessage(msg: ChatMessage): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_MESSAGES, 'readwrite');
  // Convert Proxy objects to plain objects using JSON serialization
  const plainMsg = JSON.parse(JSON.stringify(msg)) as ChatMessage;
  tx.objectStore(STORE_MESSAGES).put(plainMsg);
  await txDone(tx);
  db.close();
}

export async function deleteMessage(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_MESSAGES, 'readwrite');
  tx.objectStore(STORE_MESSAGES).delete(id);
  await txDone(tx);
  db.close();
}

export async function deleteMessagesByChat(chatId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_MESSAGES, 'readwrite');
  const store = tx.objectStore(STORE_MESSAGES);
  const idx = store.index('chatId');
  const keys: string[] = await new Promise((resolve, reject) => {
    const req = idx.openKeyCursor(IDBKeyRange.only(chatId));
    const out: string[] = [];
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        out.push(cur.primaryKey as string);
        cur.continue();
      } else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
  for (const key of keys) store.delete(key);
  await txDone(tx);
  db.close();
}

export async function clearAll(): Promise<void> {
  const db = await openDb();
  const tx1 = db.transaction(STORE_CHATS, 'readwrite');
  tx1.objectStore(STORE_CHATS).clear();
  await txDone(tx1);
  const tx2 = db.transaction(STORE_MESSAGES, 'readwrite');
  tx2.objectStore(STORE_MESSAGES).clear();
  await txDone(tx2);
  db.close();
}

export interface ExportPayload {
  version: 1;
  exportedAt: number;
  chats: Chat[];
  messages: ChatMessage[];
}

export async function exportAll(): Promise<ExportPayload> {
  const [chats, messages] = await Promise.all([getAllChats(), getAllMessages()]);
  return { version: 1, exportedAt: Date.now(), chats, messages } as const;
}

export async function importAll(payload: ExportPayload): Promise<void> {
  if (!payload || !Array.isArray(payload.chats) || !Array.isArray(payload.messages)) {
    throw new Error('Invalid export payload');
  }
  await clearAll();
  const db = await openDb();
  // bulk put chats
  {
    const tx = db.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);
    for (const c of payload.chats) {
      // Convert Proxy objects to plain objects using JSON serialization
      const plainChat = JSON.parse(JSON.stringify(c)) as Chat;
      store.put(plainChat);
    }
    await txDone(tx);
  }
  // bulk put messages
  {
    const tx = db.transaction(STORE_MESSAGES, 'readwrite');
    const store = tx.objectStore(STORE_MESSAGES);
    for (const m of payload.messages) {
      // Convert Proxy objects to plain objects using JSON serialization
      const plainMsg = JSON.parse(JSON.stringify(m)) as ChatMessage;
      store.put(plainMsg);
    }
    await txDone(tx);
  }
  db.close();
}


