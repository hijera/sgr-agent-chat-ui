// Thin wrapper over Element Plus message for easy future replacement
import { ElMessage, type MessageHandler } from 'element-plus';

export type MessageType = 'success' | 'warning' | 'info' | 'error';

export interface MessageOptions {
  message: string;
  duration?: number; // ms
  showClose?: boolean;
}

export function notify(type: MessageType, opts: MessageOptions): MessageHandler {
  return ElMessage({
    message: opts.message,
    type,
    duration: opts.duration ?? 2500,
    showClose: opts.showClose ?? false,
  });
}

export const message = {
  success: (msg: string, duration?: number) => notify('success', { message: msg, duration }),
  info: (msg: string, duration?: number) => notify('info', { message: msg, duration }),
  warning: (msg: string, duration?: number) => notify('warning', { message: msg, duration }),
  error: (msg: string, duration?: number) => notify('error', { message: msg, duration }),
};


