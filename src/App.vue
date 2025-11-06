<template>
  <div class="app-root">
    <header class="app-header">
      <div class="brand-section">
        <div class="brand-icon">🧠</div>
        <div class="brand-text">
          <h1 class="brand-title">SGR Deep Research</h1>
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
        @send="onSend"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElButton, ElSwitch, ElTooltip } from 'element-plus';
import { Download, Upload, Hide as MoonIcon, View as SunIcon } from '@element-plus/icons-vue';
import ChatList from './components/ChatList.vue';
import ChatView from './components/ChatView.vue';
import { useChats } from './state/chats';
import { exportAll, importAll, type ExportPayload } from './db/indexedDb';
import { streamChatCompletions } from './api/openaiClient';
import { DEFAULT_MODEL } from './config';
import { message } from './ui';
import { useTheme } from './state/theme';

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
  deleteMessage,
  setChatAgentId,
  reloadFromDb,
} = useChats();

const { isDark, setDark } = useTheme();
const dark = computed({
  get: () => isDark.value,
  set: (v: boolean) => setDark(v),
});

function onCreateChat() { createChat('New Chat'); }
function onSelectChat(id: string) { selectChat(id); }
function onRenameChat(id: string) {
  const title = window.prompt('Rename chat');
  if (title !== null) renameChat(id, title);
}
function onDeleteChat(id: string) { if (confirm('Delete chat?')) deleteChat(id); }
function onSend(text: string) {
  if (!selectedChat.value) return;
  const chatId = selectedChat.value.id;
  addMessage({ chatId, role: 'user', content: text });

  // think parsing state
  let inThink = false;
  let thinkMsg: ReturnType<typeof addMessage> | null = null;
  let thinkAccumulator = '';

  // Track current assistant message per messageId
  let currentAssistantMsg: ReturnType<typeof addMessage> | null = null;
  let currentMessageId: string | null = null;
  let accumulatedContent = '';

  // Track finalanswertool to add it at the end
  let pendingFinalAnswerTool: { id: string; toolCall: any } | null = null;

  const convo = [{ role: 'user' as const, content: text }];
  const model = selectedChat.value.agentId ?? DEFAULT_MODEL;

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
        // Mark that we have a new message ID
        // Don't create assistant message yet - wait for actual content
        if (currentMessageId === messageId) return;

        currentMessageId = messageId;
        // Reset assistant message - will be created when first content arrives
        currentAssistantMsg = null;
        accumulatedContent = '';

        // Reset think message and accumulator for new message
        // This ensures each new message gets its own thinking block
        thinkMsg = null;
        thinkAccumulator = '';
      },
      onDelta: (delta,id) => {
        // If no current message yet, create one (fallback for first message)
        if (!currentAssistantMsg) {
          currentAssistantMsg = addMessage({ chatId, role: 'assistant', content: '' });
        }

        accumulatedContent += delta;

        let s = delta;
        while (s.length) {
          if (!inThink) {
            const openIdx = s.indexOf('<think>');
            if (openIdx === -1) {
              appendMessageContent(currentAssistantMsg!.id, s);
              s = '';
            } else {
              const before = s.slice(0, openIdx);
              if (before) appendMessageContent(currentAssistantMsg!.id, before);
              inThink = true;
              if (!thinkMsg) thinkMsg = addMessage({ chatId,role: 'thinking', content: '' });
              s = s.slice(openIdx + '<think>'.length);
            }
          } else {
            const closeIdx = s.indexOf('</think>');
            if (closeIdx === -1) {
              thinkAccumulator += s;
              // Normalize thinking text: remove extra line breaks, keep paragraph breaks
              const normalized = normalizeThinkingText(thinkAccumulator);
              const currentContent = thinkMsg!.content;
              if (normalized.length > currentContent.length) {
                const addition = normalized.slice(currentContent.length);
                if (addition.trim().length) appendMessageContent(thinkMsg!.id, addition);
              }
              s = '';
            } else {
              const inside = s.slice(0, closeIdx);
              if (inside) {
                thinkAccumulator += inside;
                const normalized = normalizeThinkingText(thinkAccumulator);
                const currentContent = thinkMsg!.content;
                if (normalized.length > currentContent.length) {
                  const addition = normalized.slice(currentContent.length);
                  if (addition.trim().length) appendMessageContent(thinkMsg!.id, addition);
                }
              }
              inThink = false;
              s = s.slice(closeIdx + '</think>'.length);
            }
          }
        }
      },
      onToolCall: (toolCall) => {
        // Handle tool calls - parse and display them nicely
        try {
          const toolName = toolCall.name?.toLowerCase() || '';

          // Special handling for finalanswertool - defer it until onDone
          if (toolName === 'finalanswertool') {
            pendingFinalAnswerTool = { id: toolCall.id || `finalanswer-${Date.now()}`, toolCall };
            return;
          }

          // Special handling for reasoningtool
          if (toolName === 'reasoningtool') {
            try {
              const args = JSON.parse(toolCall.arguments);
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

              addMessage({
                chatId,
                id: toolCall.id,
                role: 'system',
                content: content.trim(),
                meta: { toolCall: true, toolType: 'reasoning' },
              });
              return;
            } catch (e) {
              console.error('Error parsing reasoningtool arguments:', e);
            }
          }

          // For other tool calls, display them in debug mode
          let argsDisplay = toolCall.arguments;
          try {
            const parsed = JSON.parse(toolCall.arguments);
            argsDisplay = JSON.stringify(parsed, null, 2);
          } catch {
            // If not JSON, display as-is
          }

          const toolCallContent = `🔧 **Tool Call** [${toolCall.index}]\n` +
            `**Function:** ${toolCall.name || 'unknown'}\n` +
            `**ID:** ${toolCall.id || 'N/A'}\n` +
            `**Arguments:**\n\`\`\`json\n${argsDisplay}\n\`\`\``;

          addMessage({
            chatId,
            id: toolCall.id,
            role: 'system',
            content: toolCallContent,
            meta: { toolCall: true, toolCallInfo: toolCall },
          });
        } catch (e) {
          console.error('Error displaying tool call:', e);
        }
      },
      onDone: async () => {
        // Clean up empty assistant messages (messages that only had tool calls but no content)
        if (currentAssistantMsg && !currentAssistantMsg.content.trim()) {
          deleteMessage(currentAssistantMsg.id);
        } else if (currentAssistantMsg && accumulatedContent.trim()) {
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

        // Add finalanswertool at the end, after all thinking blocks
        if (pendingFinalAnswerTool) {
          try {
            const toolCall = pendingFinalAnswerTool.toolCall;
            const args = JSON.parse(toolCall.arguments);
            
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
              content += `**Answer:**\n${args.answer}\n`;
            } else if (args.status) {
              content += `**Status:** ${args.status}\n`;
            }

            // Add any other fields
            const otherFields = Object.keys(args).filter(k =>
              !['reasoning', 'completed_steps', 'answer', 'status'].includes(k)
            );
            if (otherFields.length > 0) {
              content += `\n**Other fields:**\n\`\`\`json\n${JSON.stringify(
                Object.fromEntries(otherFields.map(k => [k, args[k]])),
                null,
                2
              )}\n\`\`\`\n`;
            }

            addMessage({
              chatId,
              id: pendingFinalAnswerTool.id,
              role: 'assistant',
              content: content.trim(),
              meta: { toolCall: true, toolType: 'finalanswer' },
            });
          } catch (e) {
            console.error('Error parsing finalanswertool arguments:', e);
            // Fallback to showing raw tool call
            let argsDisplay = pendingFinalAnswerTool.toolCall.arguments;
            try {
              const parsed = JSON.parse(argsDisplay);
              argsDisplay = JSON.stringify(parsed, null, 2);
            } catch {
              // If not JSON, display as-is
            }

            const toolCallContent = `🔧 **Tool Call** [${pendingFinalAnswerTool.toolCall.index}]\n` +
              `**Function:** ${pendingFinalAnswerTool.toolCall.name || 'unknown'}\n` +
              `**ID:** ${pendingFinalAnswerTool.id || 'N/A'}\n` +
              `**Arguments:**\n\`\`\`json\n${argsDisplay}\n\`\`\``;

            addMessage({
              chatId,
              id: pendingFinalAnswerTool.id,
              role: 'system',
              content: toolCallContent,
              meta: { toolCall: true, toolCallInfo: pendingFinalAnswerTool.toolCall },
            });
          }
        }
      },
      onError: (err) => {
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


