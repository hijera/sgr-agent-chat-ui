// OpenAI official library client with SSE support
// Handles headers X-Agent-ID and X-Agent-Model, emits content deltas.

import OpenAI from 'openai';
import { API_BASE } from '../config';

export interface ToolCallInfo {
  id?: string;
  index: number;
  name?: string;
  arguments: string;
}

export interface StreamCallbacks {
  onHeaders?: (headers: Headers) => void;
  onNewMessage?: (messageId: string) => void;
  onDelta?: (text: string, id? : string| null) => void;
  onToolCall?: (toolCall: ToolCallInfo) => void;
  onDone?: () => void;
  onError?: (error: Error & { status?: number; detail?: string }) => void;
}

export interface ChatMessageReq {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface StreamOptions {
  model?: string | null;
  messages: ChatMessageReq[];
  max_tokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export async function streamChatCompletions(opts: StreamOptions, cbs: StreamCallbacks) {
  const controller = new AbortController();
  const signal = opts.signal ?? controller.signal;

  try {
    const baseURL = API_BASE || window.location.origin;

    // Convert messages to OpenAI format
    const messages = opts.messages.map(msg => {
      if (msg.role === 'tool') {
        // Tool messages require tool_call_id, but we don't have it in our interface
        // For now, we'll skip tool messages or handle them differently
        return {
          role: 'user' as const,
          content: msg.content,
        };
      }
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      };
    });

    // Use custom fetch to intercept headers before streaming starts
    let capturedHeaders: Headers | null = null;
    const customFetch: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      // Capture headers immediately when response is received
      capturedHeaders = response.headers;
      return response;
    };

    const client = new OpenAI({
      baseURL: `${baseURL}/v1`,
      apiKey: 'dummy',
      dangerouslyAllowBrowser: true,
      fetch: customFetch,
    });

    // Create streaming completion request
    const completionRequest = client.chat.completions.create({
      model: opts.model ?? 'sgr_auto_tool_calling_agent',
      messages: messages,
      stream: true,
      max_tokens: opts.max_tokens ?? 1500,
      temperature: opts.temperature ?? 0,
    }, {
      signal,
    });

    // Get the stream
    const stream = await completionRequest;

    // Process the stream
    let headersCalled = false;
    let currentId: string | null = null;
    let accumulatedContent = '';
    let accumulatedToolCalls: Record<number, ToolCallInfo> = {};
    let lastEmitTime = Date.now();
    let emitTimer: ReturnType<typeof setInterval> | null = null;
    const BATCH_DELAY_MS = 50; // Emit accumulated content every 50ms
    const BATCH_MIN_SIZE = 20; // Or when accumulated content reaches 20 chars

    const emitAccumulated = () => {
      if (accumulatedContent) {
        cbs.onDelta?.(accumulatedContent,currentId);
        accumulatedContent = '';
        lastEmitTime = Date.now();
      }
    };

    const scheduleEmit = () => {
      if (!emitTimer) {
        emitTimer = setInterval(() => {
          const now = Date.now();
          if (now - lastEmitTime >= BATCH_DELAY_MS && accumulatedContent) {
            emitAccumulated();
          }
        }, BATCH_DELAY_MS);
      }
    };

    try {
      for await (const chunk of stream) {
        // Call onHeaders on first chunk if headers were captured
        if (!headersCalled && capturedHeaders && cbs.onHeaders) {
          cbs.onHeaders(capturedHeaders);
          headersCalled = true;
        }

        const chunkId = chunk.id;
        const choice = chunk.choices?.[0];
        if (!choice) continue;

        // Check if this is a new message (new id)
        // Also handle first message (when currentId is null and chunkId exists)
        if (chunkId && chunkId !== currentId) {
          // Emit accumulated content from previous message
          if (currentId !== null) {
            emitAccumulated();
            // Emit completed tool calls from previous message
            for (const toolCall of Object.values(accumulatedToolCalls)) {
              if (toolCall.arguments.trim()) {
                cbs.onToolCall?.(toolCall);
              }
            }
            accumulatedToolCalls = {};
          }
          currentId = chunkId;
          lastEmitTime = Date.now();
          // Notify about new message (including first one)
          cbs.onNewMessage?.(chunkId);
        } else if (!currentId && chunkId) {
          // Handle case when first chunk doesn't have id immediately
          currentId = chunkId;
          lastEmitTime = Date.now();
          cbs.onNewMessage?.(chunkId);
        }

        // Process content delta - only process actual text content, ignore tool_calls
        // Tool calls are internal API calls that shouldn't be displayed to user
        const contentDelta = choice.delta?.content;
        if (typeof contentDelta === 'string' && contentDelta.length) {
          accumulatedContent += contentDelta;

          // Schedule periodic emits
          scheduleEmit();

          // Emit immediately if accumulated content is large enough
          if (accumulatedContent.length >= BATCH_MIN_SIZE) {
            emitAccumulated();
          }
        }

        // Process tool_calls delta for debugging
        const toolCalls = choice.delta?.tool_calls;
        if (toolCalls && Array.isArray(toolCalls)) {
          for (const toolCall of toolCalls) {
            const index = toolCall.index;
            if (typeof index === 'number') {
              if (!accumulatedToolCalls[index]) {
                accumulatedToolCalls[index] = {
                  id: toolCall.id,
                  index,
                  name: toolCall.function?.name,
                  arguments: '',
                };
              }

              // Collect function name if available
              if (toolCall.function?.name) {
                accumulatedToolCalls[index].name = toolCall.function.name;
              }

              // Collect function id if available
              if (toolCall.id) {
                accumulatedToolCalls[index].id = toolCall.id;
              }

              // Collect function arguments
              if (toolCall.function?.arguments) {
                accumulatedToolCalls[index].arguments += toolCall.function.arguments;
              }
            }
          }
        }

        // Check if tool call is complete (finish_reason is tool_calls)
        if (choice.finish_reason === 'tool_calls') {
          // Emit all accumulated tool calls
          for (const toolCall of Object.values(accumulatedToolCalls)) {
            if (toolCall.arguments.trim()) {
              cbs.onToolCall?.(toolCall);
            }
          }
          accumulatedToolCalls = {};
        }
      }

      // Clear interval and emit any remaining content
      if (emitTimer) {
        clearInterval(emitTimer);
        emitTimer = null;
      }
      emitAccumulated();

      // Emit any remaining tool calls
      for (const toolCall of Object.values(accumulatedToolCalls)) {
        if (toolCall.arguments.trim()) {
          cbs.onToolCall?.(toolCall);
        }
      }
      accumulatedToolCalls = {};

      cbs.onDone?.();
    } catch (streamError: any) {
      if (emitTimer) {
        clearInterval(emitTimer);
        emitTimer = null;
      }
      if (streamError?.name === 'AbortError') {
        return { abort: () => controller.abort() };
      }
      throw streamError;
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { abort: () => controller.abort() };
    }

    // Handle OpenAI API errors
    const err = new Error(e?.message || 'Network error') as Error & { status?: number; detail?: string };

    // Try to extract status from error
    if (e?.status) {
      err.status = e.status;
    } else if (e?.response?.status) {
      err.status = e.response.status;
    } else if (e?.statusCode) {
      err.status = e.statusCode;
    }

    // Try to extract detail from error
    if (e?.error?.message) {
      err.detail = e.error.message;
    } else if (e?.message) {
      err.detail = e.message;
    }

    cbs.onError?.(err);
  }

  return { abort: () => controller.abort() };
}

