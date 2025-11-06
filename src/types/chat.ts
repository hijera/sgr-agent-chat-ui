// Shared chat types used across components. Comments in English.

export type ChatRole = 'user' | 'assistant' | 'system' | 'thinking';

export interface Chat {
  id: string;
  title: string;
  agentId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  meta?: Record<string, unknown>;
}


