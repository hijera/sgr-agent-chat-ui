// If VITE_API_BASE is empty/undefined, we use relative paths and Vite proxy will forward to backend.
export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || '';
export const DEFAULT_MODEL = 'sgr_auto_tool_calling_agent';
export const SHOW_MESSAGE_IDS: boolean = (import.meta as any).env?.VITE_SHOW_ID === 'true';
export const HIDE_TOOLS: boolean = (import.meta as any).env?.VITE_HIDE_TOOLS === 'true';
export const HIDE_SYSTEM: boolean = (import.meta as any).env?.VITE_HIDE_SYSTEM === 'true';
export const HIDE_THIKNING: boolean = (import.meta as any).env?.VITE_HIDE_THINKING === 'true';
export const HIDE_MESSAGE_IDS: boolean = (import.meta as any).env?.VITE_HIDE_IDS === 'true';
