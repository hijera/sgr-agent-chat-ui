<template>
  <section class="chat-view">
    <header class="chat-header">
      <div class="chat-info">
        <div class="chat-title">{{ chatTitle || 'Select a conversation' }}</div>
        <div class="chat-status">
          <el-icon class="status-icon"><CircleCheckFilled /></el-icon>
          Ready to assist
        </div>
      </div>
      <div class="header-actions">
        <el-tooltip content="Clear conversation" placement="bottom">
          <el-button text :icon="Delete" size="small" />
        </el-tooltip>
      </div>
    </header>

    <el-scrollbar class="messages" ref="scrollRef">
      <div class="messages-inner">
        <div v-if="messages.length === 0 && chatTitle" class="welcome-message">
          <el-icon class="welcome-icon" :size="64"><ChatSquare /></el-icon>
          <h3 class="welcome-title">Ready to research!</h3>
          <p class="welcome-text">Ask me anything and I'll help you with deep research and analysis.</p>
        </div>

        <transition-group name="message-list" tag="div">
          <template        :key="m.id"      v-for="m in messages">
          <ChatMessageItem v-if="checkRoleVisibility(m.role)"
            :message-id="m.id"
            :role="m.role"
            :content="m.content"
          />
          </template>
        </transition-group>
      </div>
    </el-scrollbar>

    <footer class="composer">
      <div class="composer-inner">
        <div class="input-container">
          <el-input
            v-model="draft"
            type="textarea"
            placeholder="Ask me anything about research, analysis, or any topic..."
            :autosize="{ minRows: 1, maxRows: 6 }"
            resize="none"
            @keydown="handleKeydown"
            class="message-input"
          />
          <el-button
            type="primary"
            :icon="Right"
            @click="send"
            :disabled="!draft.trim()"
            circle
            class="send-button"
            size="large"
          />
        </div>
        <div class="composer-hint">
          Press Ctrl+Enter to send • Shift+Enter for new line
        </div>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import type {Chat, ChatMessage, ChatRole} from '../types/chat';
import ChatMessageItem from './ChatMessageItem.vue';
import { ElInput, ElButton, ElScrollbar, ElIcon, ElTooltip } from 'element-plus';
import { Delete, Right, CircleCheckFilled, ChatSquare } from '@element-plus/icons-vue';
import {HIDE_SYSTEM, HIDE_THIKNING} from "../config";

const props = defineProps<{ chat: Chat | undefined; messages: ChatMessage[] }>();
const emit = defineEmits<{ (e: 'send', text: string): void }>();

const draft = ref('');
const scrollRef = ref<InstanceType<typeof ElScrollbar> | null>(null);
const chatTitle = computed(() => props.chat?.title ?? '');

function send() {
  const text = draft.value.trim();
  if (!text) return;
  emit('send', text);
  draft.value = '';
}

function handleKeydown(e: Event | KeyboardEvent) {
  if (!(e instanceof KeyboardEvent)) return;
  if (e.key === 'Enter') {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      send();
    }
    // Shift+Enter allows new line (default behavior)
  }
}

function checkRoleVisibility(role: ChatRole) : boolean {
  console.log((role=='thinking' && HIDE_THIKNING));
  if (!role) return true;
  if (role=='thinking' && HIDE_THIKNING) return false;
  if (role=='system' && HIDE_SYSTEM) return false;
    return true;
}

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    // try to keep scrolled to bottom after new message
    const el = (scrollRef.value as any)?.$el?.querySelector('.el-scrollbar__wrap');
    if (el) el.scrollTop = el.scrollHeight;
  },
);
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--el-bg-color-page);
}

.chat-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.chat-info {
  flex: 1;
}

.chat-title {
  font-weight: 600;
  font-size: 18px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.chat-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.status-icon {
  color: var(--el-color-success);
}

.messages {
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color-page);
  overflow: hidden; /* Ограничиваем переполнение */
}

.messages :deep(.el-scrollbar__wrap) {
  max-height: 100%;
}

.messages-inner {
  padding: 24px;
}

.welcome-message {
  text-align: center;
  padding: 60px 20px;
  max-width: 600px;
  margin: 0 auto;
}

.welcome-icon {
  color: var(--el-color-primary);
  margin-bottom: 20px;
}

.welcome-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 12px 0;
}

.welcome-text {
  font-size: 16px;
  color: var(--el-text-color-secondary);
  margin: 0;
  line-height: 1.5;
}

.composer {
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  flex-shrink: 0; /* Предотвращаем сжатие */
}

.composer-inner {
  padding: 20px 24px;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 8px;
}

.message-input {
  flex: 1;
}

.message-input :deep(.el-textarea__inner) {
  border-radius: 12px;
  border: 2px solid var(--el-border-color-light);
  box-shadow: none;
  transition: all 0.2s ease;
  font-size: 14px;
  line-height: 1.5;
  padding: 12px 16px;
}

.message-input :deep(.el-textarea__inner:focus) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.send-button {
  width: 44px;
  height: 44px;
  margin-bottom: 1px;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.send-button:not(.is-disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.composer-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

/* Анимации для сообщений */
.message-list-enter-active,
.message-list-leave-active {
  transition: all 0.3s ease;
}

.message-list-enter-from,
.message-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.message-list-move {
  transition: transform 0.3s ease;
}
</style>


