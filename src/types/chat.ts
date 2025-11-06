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

// ===== Tool Arguments Types (based on SGR API documentation) =====

export interface ReasoningToolArgs {
  reasoning_steps: string[];
  current_situation: string;
  plan_status: string;
  enough_data: boolean;
  remaining_steps: string[];
  task_completed: boolean;
}

export interface WebSearchToolArgs {
  reasoning: string;
  query: string;
  max_results: number;
}

export interface ExtractPageContentToolArgs {
  reasoning: string;
  urls: string[];
}

export interface GeneratePlanToolArgs {
  reasoning: string;
  research_goal: string;
  planned_steps: string[];
  search_strategies: string[];
}

export interface AdaptPlanToolArgs {
  reasoning: string;
  original_goal: string;
  new_goal: string;
  plan_changes: string[];
  next_steps: string[];
}

export interface ClarificationToolArgs {
  reasoning: string;
  unclear_terms: string[];
  assumptions: string[];
  questions: string[];
}

export interface CreateReportToolArgs {
  reasoning: string;
  title: string;
  user_request_language_reference: string;
  content: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface FinalAnswerToolArgs {
  reasoning: string;
  completed_steps: string[];
  answer: string;
  status: 'completed' | 'failed';
}

// Generic base tool arguments - can be extended for custom tools
export interface BaseToolArgs {
  [key: string]: any;
}


