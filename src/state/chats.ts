// Minimal in-memory chat state. Will be replaced/extended with IndexedDB later.
import { reactive, computed } from 'vue';
import type { Chat, ChatMessage } from '../types/chat';
import { getAllChats, getAllMessages, putChat, deleteChatDb, deleteMessagesByChat, putMessage } from '../db/indexedDb';
import { toRaw } from 'vue';
function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const state = reactive({
  chats: [] as Chat[],
  messages: [] as ChatMessage[],
  selectedChatId: '' as string,
});

export const useChats = () => {
  const chats = computed(() => state.chats);
  const selectedChatId = computed(() => state.selectedChatId);
  const selectedChat = computed(() => state.chats.find(c => c.id === state.selectedChatId));
  const chatMessages = computed(() => state.messages.filter(m => m.chatId === state.selectedChatId));

  function createChat(title = 'New Chat'): Chat {
    const now = Date.now();
    const chat: Chat = { id: uid(), title, createdAt: now, updatedAt: now };
    state.chats.unshift(chat);
    state.selectedChatId = chat.id;
    void putChat(toRaw(chat));
    return chat;
  }

  function renameChat(id: string, title: string) {
    const chat = state.chats.find(c => c.id === id);
    if (chat) {
      chat.title = title.trim() || chat.title;
      chat.updatedAt = Date.now();
      void putChat(toRaw(chat));
    }
  }

  function deleteChat(id: string) {
    const idx = state.chats.findIndex(c => c.id === id);
    if (idx !== -1) state.chats.splice(idx, 1);
    state.messages = state.messages.filter(m => m.chatId !== id);
    if (state.selectedChatId === id) state.selectedChatId = state.chats[0]?.id ?? '';
    void deleteChatDb(id);
    void deleteMessagesByChat(id);
  }

  function selectChat(id: string) {
    state.selectedChatId = id;
  }

  function addMessage(partial: Omit<ChatMessage, 'id' | 'createdAt'> & { id?: string }): ChatMessage {
    const msg: ChatMessage = { ...partial, id: partial.id ??  uid(), createdAt: Date.now() } as ChatMessage; // was uid()
    state.messages.push(msg);
    const chat = state.chats.find(c => c.id === partial.chatId);
    if (chat) {
      chat.updatedAt = Date.now();
      void putChat(toRaw(chat));
    }
    void putMessage(toRaw(msg));
    return msg;
  }



  function appendMessageContent(id: string, delta: string) {
    const m = state.messages.find(x => x.id === id);
    if (m) {
      m.content += delta;
      // Convert Proxy object to plain object before saving
      void putMessage(toRaw(m));
    }
  }

  function deleteMessage(id: string) {
    const idx = state.messages.findIndex(m => m.id === id);
    if (idx !== -1) {
      state.messages.splice(idx, 1);
      // Also remove from IndexedDB
      const { deleteMessage: deleteMessageDb } = require('../db/indexedDb');
      void deleteMessageDb(id);
    }
  }

  function setChatAgentId(chatId: string, agentId: string) {
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
      chat.agentId = agentId;
      void putChat(toRaw(chat));
    }
  }

  async function reloadFromDb() {
    try {
      const [chatsDb, messagesDb] = await Promise.all([getAllChats(), getAllMessages()]);
      if (chatsDb.length === 0) {
        const now = Date.now();
        const chat: Chat = { id: uid(), title: 'New Chat', createdAt: now, updatedAt: now };
        state.chats = [chat];
        state.selectedChatId = chat.id;
        state.messages = [];
        void putChat(toRaw(chat));
      } else {
        state.chats = [...chatsDb].sort((a, b) => b.updatedAt - a.updatedAt);
        state.selectedChatId = state.chats[0].id;
        state.messages = [...messagesDb].sort((a, b) => a.createdAt - b.createdAt);
      }
    } catch (e) {
      if (state.chats.length === 0) createChat('New Chat');
    }
  }

  // initial load from IndexedDB
  void reloadFromDb();

  return {
    chats,
    selectedChatId,
    selectedChat,
    chatMessages,
    createChat,
    renameChat,
    deleteChat,
    selectChat,
    addMessage,
    appendMessageContent,
    deleteMessage,
    setChatAgentId,
    reloadFromDb,
  };
};


