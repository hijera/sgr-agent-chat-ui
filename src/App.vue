<template>
  <div class="app-root">
    <header class="app-header">
      <div class="brand-section">
        <div class="brand-icon">🧠</div>
        <div class="brand-text">
          <h1 class="brand-title">SGR Chat UI</h1>
          <p class="brand-subtitle">AI-Powered Research Assistant</p>
        </div>
      </div>
      <div class="header-actions">
        <div class="theme-toggle">
          <el-tooltip content="Toggle theme" placement="bottom">
            <el-switch
              v-model="dark"
              size="small"
              :active-icon="MoonIcon"
              :inactive-icon="SunIcon"
              inline-prompt
            />
          </el-tooltip>
        </div>
        <el-tooltip content="Export conversations" placement="bottom">
          <el-button size="small" :icon="Download" @click="onExport">Export</el-button>
        </el-tooltip>
        <el-tooltip content="Import conversations" placement="bottom">
          <el-button size="small" type="primary" :icon="Upload" @click="triggerImport">Import</el-button>
        </el-tooltip>
        <input ref="fileRef" type="file" accept="application/json" class="hidden-file" @change="onImportFile" />
      </div>
    </header>
    <div class="app-body">
      <ChatList
        :chats="chats"
        :selected-id="selectedChatId"
        @create="onCreateChat"
        @select="onSelectChat"
        @rename="onRenameChat"
        @delete="onDeleteChat"
      />
      <ChatView
        :chat="selectedChat"
        :messages="chatMessages"
        :is-streaming="isStreaming"
        @send="onSend"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElButton, ElSwitch, ElTooltip } from 'element-plus';
import { Download, Upload, Moon as MoonIcon, Sunny as SunIcon } from '@element-plus/icons-vue';
import ChatList from './components/ChatList.vue';
import ChatView from './components/ChatView.vue';
import { useChats } from './state/chats';
import { exportAll, importAll, type ExportPayload } from './db/indexedDb';
import { streamChatCompletions } from './api/openaiClient';
import { DEFAULT_MODEL } from './config';
import { message } from './ui';
import { useTheme } from './state/theme';
import type {
  ReasoningToolArgs,
  WebSearchToolArgs,
  ExtractPageContentToolArgs,
  GeneratePlanToolArgs,
  AdaptPlanToolArgs,
  ClarificationToolArgs,
  CreateReportToolArgs,
  FinalAnswerToolArgs,
  BaseToolArgs,
} from './types/chat';

const {
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
  updateMessage,
  deleteMessage,
  setChatAgentId,
  reloadFromDb,
} = useChats();

const { isDark, setDark } = useTheme();
const dark = computed({
  get: () => isDark.value,
  set: (v: boolean) => setDark(v),
});

const isStreaming = ref(false);

function onCreateChat() { createChat('New Chat'); }
function onSelectChat(id: string) { selectChat(id); }
function onRenameChat(id: string) {
  const title = window.prompt('Rename chat');
  if (title !== null) renameChat(id, title);
}
function onDeleteChat(id: string) { if (confirm('Delete chat?')) deleteChat(id); }

// ===== Tool Call Formatters =====
// These functions format tool call arguments into displayable content

function formatReasoningTool(args: ReasoningToolArgs): string {
  let content = '🧠 **Reasoning Process**\n\n';

  if (args.reasoning_steps && Array.isArray(args.reasoning_steps)) {
    content += '**Steps:**\n';
    args.reasoning_steps.forEach((step: string, idx: number) => {
      content += `${idx + 1}. ${step}\n`;
    });
    content += '\n';
  }

  if (args.current_situation) {
    content += `**Current Situation:** ${args.current_situation}\n\n`;
  }

  if (args.plan_status) {
    content += `**Plan Status:** ${args.plan_status}\n\n`;
  }

  if (args.remaining_steps && Array.isArray(args.remaining_steps) && args.remaining_steps.length > 0) {
    content += '**Remaining Steps:**\n';
    args.remaining_steps.forEach((step: string, idx: number) => {
      content += `${idx + 1}. ${step}\n`;
    });
  }

  return content.trim();
}

function formatWebSearchTool(args: WebSearchToolArgs): string {
  let content = '🔍 **Web Search**\n\n';

  if (args.reasoning) {
    content += `**Reasoning:** ${args.reasoning}\n\n`;
  }

  content += `**Query:** ${args.query}\n`;
  content += `**Max Results:** ${args.max_results}\n`;

  return content.trim();
}

function formatExtractPageContentTool(args: ExtractPageContentToolArgs): string {
  let content = '📄 **Extract Page Content**\n\n';

  if (args.reasoning) {
    content += `**Reasoning:** ${args.reasoning}\n\n`;
  }

  if (args.urls && Array.isArray(args.urls)) {
    content += '**URLs to extract:**\n';
    args.urls.forEach((url: string, idx: number) => {
      content += `${idx + 1}. ${url}\n`;
    });
  }

  return content.trim();
}

function formatGeneratePlanTool(args: GeneratePlanToolArgs): string {
  let content = '📋 **Generate Research Plan**\n\n';

  if (args.reasoning) {
    content += `**Reasoning:** ${args.reasoning}\n\n`;
  }

  if (args.research_goal) {
    content += `**Research Goal:** ${args.research_goal}\n\n`;
  }

  if (args.planned_steps && Array.isArray(args.planned_steps)) {
    content += '**Planned Steps:**\n';
    args.planned_steps.forEach((step: string, idx: number) => {
      content += `${idx + 1}. ${step}\n`;
    });
    content += '\n';
  }

  if (args.search_strategies && Array.isArray(args.search_strategies)) {
    content += '**Search Strategies:**\n';
    args.search_strategies.forEach((strategy: string, idx: number) => {
      content += `${idx + 1}. ${strategy}\n`;
    });
  }

  return content.trim();
}

function formatAdaptPlanTool(args: AdaptPlanToolArgs): string {
  let content = '🔄 **Adapt Research Plan**\n\n';

  if (args.reasoning) {
    content += `**Reasoning:** ${args.reasoning}\n\n`;
  }

  if (args.original_goal) {
    content += `**Original Goal:** ${args.original_goal}\n\n`;
  }

  if (args.new_goal) {
    content += `**New Goal:** ${args.new_goal}\n\n`;
  }

  if (args.plan_changes && Array.isArray(args.plan_changes)) {
    content += '**Plan Changes:**\n';
    args.plan_changes.forEach((change: string, idx: number) => {
      content += `${idx + 1}. ${change}\n`;
    });
    content += '\n';
  }

  if (args.next_steps && Array.isArray(args.next_steps)) {
    content += '**Next Steps:**\n';
    args.next_steps.forEach((step: string, idx: number) => {
      content += `${idx + 1}. ${step}\n`;
    });
  }

  return content.trim();
}

function formatClarificationTool(args: ClarificationToolArgs): string {
  let content = '❓ **Clarification Request**\n\n';

  if (args.reasoning) {
    content += `**Reasoning:** ${args.reasoning}\n\n`;
  }

  if (args.unclear_terms && Array.isArray(args.unclear_terms) && args.unclear_terms.length > 0) {
    content += '**Unclear Terms:**\n';
    args.unclear_terms.forEach((term: string, idx: number) => {
      content += `${idx + 1}. ${term}\n`;
    });
    content += '\n';
  }

  if (args.assumptions && Array.isArray(args.assumptions) && args.assumptions.length > 0) {
    content += '**Assumptions:**\n';
    args.assumptions.forEach((assumption: string, idx: number) => {
      content += `${idx + 1}. ${assumption}\n`;
    });
    content += '\n';
  }

  if (args.questions && Array.isArray(args.questions)) {
    content += '**Questions:**\n';
    args.questions.forEach((question: string, idx: number) => {
      content += `${idx + 1}. ${question}\n`;
    });
  }

  return content.trim();
}

function formatCreateReportTool(args: CreateReportToolArgs): string {
  let content = '📝 **Create Report**\n\n';

  if (args.reasoning) {
    content += `**Reasoning:** ${args.reasoning}\n\n`;
  }

  if (args.title) {
    content += `**Title:** ${args.title}\n\n`;
  }

  if (args.confidence) {
    const confidenceEmoji = args.confidence === 'high' ? '🟢' : args.confidence === 'medium' ? '🟡' : '🔴';
    content += `**Confidence:** ${confidenceEmoji} ${args.confidence}\n\n`;
  }

  if (args.content) {
    content += `**Report Content:**\n${args.content}\n`;
  }

  return content.trim();
}

function formatFinalAnswerTool(args: FinalAnswerToolArgs): string {
  let content = '✅ **Final Answer**\n\n';

  if (args.reasoning) {
    content += `**Reasoning:** ${args.reasoning}\n\n`;
  }

  if (args.completed_steps && Array.isArray(args.completed_steps)) {
    content += `**Completed Steps:**\n`;
    args.completed_steps.forEach((step: string, idx: number) => {
      content += `${idx + 1}. ${step}\n`;
    });
    content += '\n';
  }

  if (args.answer) {
    content += `**Answer:**\n${args.answer}\n\n`;
  }

  if (args.status) {
    const statusEmoji = args.status === 'completed' ? '✅' : '❌';
    content += `**Status:** ${statusEmoji} ${args.status}\n`;
  }

  return content.trim();
}

function formatBaseTool(toolName: string, args: BaseToolArgs): string {
  let content = `🔧 **Tool: ${toolName}**\n\n`;

  // Try to format known fields nicely
  if (args.reasoning) {
    content += `**Reasoning:** ${args.reasoning}\n\n`;
  }

  // Format other fields
  const otherFields = Object.keys(args).filter(k => k !== 'reasoning');

  if (otherFields.length > 0) {
    for (const key of otherFields) {
      const value = args[key];

      // Format arrays nicely
      if (Array.isArray(value)) {
        content += `**${formatFieldName(key)}:**\n`;
        value.forEach((item: any, idx: number) => {
          content += `${idx + 1}. ${String(item)}\n`;
        });
        content += '\n';
      }
      // Format objects as JSON
      else if (typeof value === 'object' && value !== null) {
        content += `**${formatFieldName(key)}:**\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n`;
      }
      // Format primitives
      else {
        content += `**${formatFieldName(key)}:** ${String(value)}\n\n`;
      }
    }
  }

  return content.trim();
}

// Helper function to format field names (snake_case to Title Case)
function formatFieldName(fieldName: string): string {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
function onSend(text: string) {
  if (!selectedChat.value) return;
  const chatId = selectedChat.value.id;
  addMessage({ chatId, role: 'user', content: text });

  // Set streaming state to true
  isStreaming.value = true;

  // think parsing state
  let inThink = false;
  let thinkAccumulator = '';
  let hasThinkingContent = false; // Track if message has any thinking content

  // Track current assistant message per messageId
  let currentAssistantMsg: ReturnType<typeof addMessage> | null = null;
  let currentMessageId: string | null = null;
  let accumulatedContent = '';
  let hasRegularContent = false; // Track if message has regular (non-thinking) content

  // Track finalanswertool to add it at the end
  let pendingFinalAnswerTool: { id: string; toolCall: any } | null = null;

  // Track last tool call to associate results with it
  let lastToolCall: { name: string; id: string } | null = null;

  const convo = [{ role: 'user' as const, content: text }];
  const model = selectedChat.value.agentId ?? DEFAULT_MODEL;

  // Helper function to detect if content is a tool result
  function detectToolResult(content: string): { isResult: boolean; type?: string; formatted?: string } {
    const trimmed = content.trim();

    // Search Query results
    if (trimmed.startsWith('Search Query:')) {
      return {
        isResult: true,
        type: 'search_result',
        formatted: `🔍 **Web Search Results**\n\n${content}`
      };
    }

    // Extracted Page Content results
    if (trimmed.startsWith('Extracted Page Content:')) {
      return {
        isResult: true,
        type: 'extract_result',
        formatted: `📄 **Extracted Content**\n\n${content}`
      };
    }

    // Generic tool result patterns (could be extended)
    const toolResultPatterns = [
      /^Tool Result:/i,
      /^Result:/i,
      /^\[Tool Output\]/i,
    ];

    for (const pattern of toolResultPatterns) {
      if (pattern.test(trimmed)) {
        return {
          isResult: true,
          type: 'generic_result',
          formatted: `🔧 **Tool Result**\n\n${content}`
        };
      }
    }

    return { isResult: false };
  }

  // Helper function to parse and format JSON response
  function parseJsonResponse(content: string): string | null {
    try {
      // Try to find JSON object in the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      // Format the response nicely
      let formatted = '';

      if (parsed.reasoning) {
        formatted += `**Reasoning:**\n${parsed.reasoning}\n\n`;
      }

      if (parsed.completed_steps && Array.isArray(parsed.completed_steps)) {
        formatted += `**Completed Steps:**\n`;
        parsed.completed_steps.forEach((step: string, idx: number) => {
          formatted += `${idx + 1}. ${step}\n`;
        });
        formatted += '\n';
      }

      if (parsed.answer) {
        formatted += `**Answer:**\n${parsed.answer}\n`;
      } else if (parsed.status) {
        formatted += `**Status:** ${parsed.status}\n`;
      }

      // If we have other fields, show them
      const otherFields = Object.keys(parsed).filter(k =>
        !['reasoning', 'completed_steps', 'answer', 'status'].includes(k)
      );
      if (otherFields.length > 0) {
        formatted += `\n**Other fields:**\n\`\`\`json\n${JSON.stringify(
          Object.fromEntries(otherFields.map(k => [k, parsed[k]])),
          null,
          2
        )}\n\`\`\`\n`;
      }

      return formatted.trim() || null;
    } catch {
      return null;
    }
  }

  streamChatCompletions(
    { model, messages: convo },
    {
      onHeaders: (headers) => {
        const agentId = headers.get('X-Agent-ID');
        if (agentId) setChatAgentId(chatId, agentId);
      },
      onNewMessage: (messageId: string) => {
        // When we receive a new message ID from API, immediately create the assistant message
        // This ensures the message exists in the chat and can be updated as content streams in
        if (currentMessageId === messageId) return;

        currentMessageId = messageId;

        // Create assistant message immediately with ID from API
        // This message may later be converted to 'thinking' if <think> tags are found
        currentAssistantMsg = addMessage({
          chatId,
          id: messageId,  // Use ID from API
          role: 'assistant',
          content: ''
        });

        accumulatedContent = '';
        hasRegularContent = false;
        hasThinkingContent = false;

        // Reset think accumulator for new message
        thinkAccumulator = '';
      },
      onDelta: (delta,id) => {
        // Message should already be created by onNewMessage
        // If not (edge case), skip this delta
        if (!currentAssistantMsg) {
          console.warn('onDelta called before onNewMessage - skipping delta');
          return;
        }

        accumulatedContent += delta;

        // Check if accumulated content is a tool result
        // Only check when we have enough content (at least 20 chars)
        if (accumulatedContent.length >= 20) {
          const toolResult = detectToolResult(accumulatedContent);

          if (toolResult.isResult && currentAssistantMsg.content.length === 0) {
            // This is a tool result and message is empty - convert it to system message for tool result
            updateMessage(currentAssistantMsg.id, {
              role: 'system',
              meta: {
                toolResult: true,
                toolResultType: toolResult.type,
                associatedTool: lastToolCall?.name
              }
            });
            // Don't add icon prefix here, let the content flow naturally
            // We'll format it in onDone if needed
          }
        }

        let s = delta;
        while (s.length) {
          if (!inThink) {
            const openIdx = s.indexOf('<think>');
            if (openIdx === -1) {
              // Regular content - add to current message
              appendMessageContent(currentAssistantMsg!.id, s);
              hasRegularContent = true;
              s = '';
            } else {
              const before = s.slice(0, openIdx);
              if (before) {
                appendMessageContent(currentAssistantMsg!.id, before);
                hasRegularContent = true;
              }
              inThink = true;
              // Convert current message to 'thinking' role if it doesn't have regular content yet
              if (!hasRegularContent && !hasThinkingContent) {
                updateMessage(currentAssistantMsg!.id, { role: 'thinking' });
              }
              hasThinkingContent = true;
              s = s.slice(openIdx + '<think>'.length);
            }
          } else {
            const closeIdx = s.indexOf('</think>');
            if (closeIdx === -1) {
              thinkAccumulator += s;
              // Normalize thinking text: remove extra line breaks, keep paragraph breaks
              const normalized = normalizeThinkingText(thinkAccumulator);
              const currentContent = currentAssistantMsg!.content;
              if (normalized.length > currentContent.length) {
                const addition = normalized.slice(currentContent.length);
                if (addition.trim().length) appendMessageContent(currentAssistantMsg!.id, addition);
              }
              s = '';
            } else {
              const inside = s.slice(0, closeIdx);
              if (inside) {
                thinkAccumulator += inside;
                const normalized = normalizeThinkingText(thinkAccumulator);
                const currentContent = currentAssistantMsg!.content;
                if (normalized.length > currentContent.length) {
                  const addition = normalized.slice(currentContent.length);
                  if (addition.trim().length) appendMessageContent(currentAssistantMsg!.id, addition);
                }
              }
              inThink = false;
              thinkAccumulator = '';
              s = s.slice(closeIdx + '</think>'.length);
              // If there's content after </think>, create a new assistant message for it
              if (s.trim().length > 0) {
                // Create new assistant message for content after thinking
                currentAssistantMsg = addMessage({
                  chatId,
                  id: `${currentMessageId}-answer`,  // Use derived ID
                  role: 'assistant',
                  content: ''
                });
                hasRegularContent = false;
                accumulatedContent = ''; // Reset for new message
              }
            }
          }
        }
      },
      onToolCall: (toolCall) => {
        // Handle tool calls - parse and display them nicely using formatters
        try {
          const toolName = toolCall.name?.toLowerCase() || '';

          // Track this tool call for associating with results
          lastToolCall = {
            name: toolName,
            id: toolCall.id || `tool-${Date.now()}`
          };

          // Special handling for finalanswertool - defer it until onDone
          if (toolName === 'finalanswertool') {
            pendingFinalAnswerTool = { id: toolCall.id || `finalanswer-${Date.now()}`, toolCall };
            return;
          }

          // Parse arguments
          let args: any;
          try {
            args = JSON.parse(toolCall.arguments);
          } catch (e) {
            console.error('Error parsing tool arguments:', e);
            // Fallback to raw display
            addMessage({
              chatId,
              id: toolCall.id || `tool-${Date.now()}`,
              role: 'system',
              content: `🔧 **Tool Call Error**\n\nFailed to parse arguments for **${toolCall.name}**\n\n\`\`\`\n${toolCall.arguments}\n\`\`\``,
              meta: { toolCall: true, toolCallInfo: toolCall },
            });
            return;
          }

          // Use formatters based on tool name
          let content: string;
          let toolType: string;

          switch (toolName) {
            case 'reasoningtool':
              content = formatReasoningTool(args as ReasoningToolArgs);
              toolType = 'reasoning';
              break;

            case 'websearchtool':
              content = formatWebSearchTool(args as WebSearchToolArgs);
              toolType = 'websearch';
              break;

            case 'extractpagecontenttool':
              content = formatExtractPageContentTool(args as ExtractPageContentToolArgs);
              toolType = 'extract';
              break;

            case 'generateplantool':
              content = formatGeneratePlanTool(args as GeneratePlanToolArgs);
              toolType = 'plan';
              break;

            case 'adaptplantool':
              content = formatAdaptPlanTool(args as AdaptPlanToolArgs);
              toolType = 'adaptplan';
              break;

            case 'clarificationtool':
              content = formatClarificationTool(args as ClarificationToolArgs);
              toolType = 'clarification';
              break;

            case 'createreporttool':
              content = formatCreateReportTool(args as CreateReportToolArgs);
              toolType = 'report';
              break;

            case 'basetool':
              // Special handling for basetool - show debug info for extensibility
              content = formatBaseTool(toolCall.name || 'BaseTool', args as BaseToolArgs);
              toolType = 'base';
              break;

            default:
              // Unknown tools - show full debug info for developers
              let argsDisplay = toolCall.arguments;
              try {
                const parsed = JSON.parse(toolCall.arguments);
                argsDisplay = JSON.stringify(parsed, null, 2);
              } catch {
                // If not JSON, display as-is
              }

              content = `🔧 **Unknown Tool Call** [${toolCall.index}]\n\n` +
                `**Function:** \`${toolCall.name || 'unknown'}\`\n` +
                `**ID:** \`${toolCall.id || 'N/A'}\`\n\n` +
                `**Arguments:**\n\`\`\`json\n${argsDisplay}\n\`\`\`\n\n` +
                `*This tool is not yet supported. Add a formatter in App.vue to display it properly.*`;
              toolType = 'unknown';
              break;
          }

          addMessage({
            chatId,
            id: toolCall.id || `tool-${toolName}-${Date.now()}`,
            role: 'system',
            content,
            meta: { toolCall: true, toolType, toolName },
          });
        } catch (e) {
          console.error('Error displaying tool call:', e);
        }
      },
      onDone: async () => {
        // Stop streaming indicator
        isStreaming.value = false;

        // Check if current message is a tool result and format it
        if (currentAssistantMsg && accumulatedContent.trim()) {
          const toolResult = detectToolResult(accumulatedContent);

          if (toolResult.isResult) {
            // This is a tool result - add icon and formatting
            const msg = chatMessages.value.find(m => m.id === currentAssistantMsg!.id);
            if (msg) {
              // Add icon based on result type
              let icon = '🔧';
              if (toolResult.type === 'search_result') icon = '🔍';
              else if (toolResult.type === 'extract_result') icon = '📄';

              // Format the content
              msg.content = `${icon} **Tool Result**\n\n${msg.content}`;
              msg.role = 'system';
              msg.meta = {
                ...msg.meta,
                toolResult: true,
                toolResultType: toolResult.type,
                associatedTool: lastToolCall?.name
              };

              // Save to DB
              const { putMessage } = await import('./db/indexedDb');
              void putMessage(msg);
            }
          } else {
            // Try to parse final JSON response if we have accumulated content
            const parsed = parseJsonResponse(accumulatedContent);
            if (parsed) {
              // Replace the content with formatted version
              const msg = chatMessages.value.find(m => m.id === currentAssistantMsg!.id);
              if (msg) {
                msg.content = parsed;
                // Save to DB
                const { putMessage } = await import('./db/indexedDb');
                void putMessage(msg);
              }
            }
          }
        }

        // Add finalanswertool at the end, after all thinking blocks
        if (pendingFinalAnswerTool) {
          try {
            const toolCall = pendingFinalAnswerTool.toolCall;
            const args = JSON.parse(toolCall.arguments) as FinalAnswerToolArgs;

            // Use the formatter
            const content = formatFinalAnswerTool(args);

            addMessage({
              chatId,
              id: pendingFinalAnswerTool.id,
              role: 'assistant',
              content,
              meta: { toolCall: true, toolType: 'finalanswer' },
            });
          } catch (e) {
            console.error('Error parsing finalanswertool arguments:', e);
            // Fallback to showing raw tool call
            addMessage({
              chatId,
              id: pendingFinalAnswerTool.id,
              role: 'system',
              content: `🔧 **Tool Call Error**\n\nFailed to parse arguments for **FinalAnswerTool**\n\n\`\`\`\n${pendingFinalAnswerTool.toolCall.arguments}\n\`\`\``,
              meta: { toolCall: true, toolCallInfo: pendingFinalAnswerTool.toolCall },
            });
          }
        }
      },
      onError: (err) => {
        // Stop streaming indicator
        isStreaming.value = false;

        if (currentAssistantMsg) {
          appendMessageContent(currentAssistantMsg.id, '\n[Error] Unable to stream response.');
        }
        message.error(`API error${err.status ? ` (${err.status})` : ''}`);
      },
    },
  );
}

function normalizeThinkingText(text: string): string {
  // Remove excessive line breaks and normalize spacing
  // Keep paragraph breaks (double line breaks) but remove single line breaks within sentences
  let normalized = text
    // Replace multiple spaces with single space
    .replace(/ +/g, ' ')
    // Replace multiple line breaks (3+) with double line break (paragraph break)
    .replace(/\n{3,}/g, '\n\n')
    // Remove single line breaks that are not at the end of sentences
    // Keep line breaks after punctuation (. ! ? :) or at end of text
    .replace(/([^.!?:])\n([A-Z])/g, '$1 $2')
    // Keep line breaks after punctuation
    .replace(/([.!?:])\n/g, '$1\n')
    // Normalize paragraph breaks
    .replace(/\n\n+/g, '\n\n')
    // Trim each line but keep paragraph structure
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove trailing line breaks
    .trim();

  return normalized;
}

function numberNonEmptyLines(text: string): string {
  const lines = text.split(/\r?\n/);
  let count = 0;
  const out: string[] = [];
  for (const line of lines) {
    if (line.trim().length > 0) {
      count += 1;
      out.push(`${count}. ${line}`);
    } else {
      out.push('');
    }
  }
  return out.join('\n');
}

const fileRef = ref<HTMLInputElement | null>(null);
function triggerImport() {
  fileRef.value?.click();
}
async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text) as ExportPayload;
    if (!confirm('Import will replace local data. Continue?')) return;
    await importAll(payload);
    await reloadFromDb();
    message.success('Import completed');
  } catch (err: any) {
    message.error('Import failed');
  } finally {
    if (input) input.value = '';
  }
}
async function onExport() {
  try {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgr_chat_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    message.error('Export failed');
  }
}
</script>

<style scoped>
.app-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
  overflow: hidden;
}

.app-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: var(--el-bg-color);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  font-size: 32px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.brand-text {
  line-height: 1.2;
}

.brand-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--el-color-primary);
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-success));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-toggle {
  margin-right: 8px;
}

.app-body {
  display: flex;
  flex: 1;
  background: var(--el-bg-color-page);
  overflow: hidden;
  min-height: 0;
}

.hidden-file {
  display: none;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .app-header {
    padding: 12px 16px;
  }

  .brand-title {
    font-size: 18px;
  }

  .brand-subtitle {
    font-size: 11px;
  }

  .header-actions {
    gap: 8px;
  }
}
</style>


