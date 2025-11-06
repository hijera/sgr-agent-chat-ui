<template>
  <div class="message-wrapper" :class="role">
    <div class="message-content">
      <div v-if="role !== 'user'" class="message-avatar">
        <el-avatar :size="32" class="avatar">
          <el-icon v-if="role === 'assistant'"><Avatar /></el-icon>
          <el-icon v-else-if="role === 'thinking'"><Loading /></el-icon>
          <el-icon v-else><InfoFilled /></el-icon>
        </el-avatar>
      </div>

      <div class="message-bubble" :class="`${role}-bubble`">
        <div v-if="role !== 'user'" class="message-header">
          <span class="sender-name">
            {{ role === 'assistant' ? 'AI Assistant' :
                role === 'thinking' ? 'Thinking...' : 'System' }}
          </span>
          <div class="header-right">
            <span v-if="showIds" class="message-id">ID: {{ messageId ?? "0" }}</span>
            <span class="message-time">{{ formattedTime }}</span>
          </div>
        </div>

        <!-- User message header with ID -->
        <div v-if="role === 'user' && showIds" class="user-message-header">
          <span class="message-id">ID: {{ messageId }}</span>
        </div>

        <div class="message-text">
          <div v-if="role === 'thinking'" class="thinking-text">{{ content }}</div>
          <div v-else class="content-text" v-html="formattedContent"></div>
        </div>

        <div v-if="role === 'assistant'" class="message-actions">
          <el-button text size="small" :icon="CopyDocument" />
          <el-button text size="small" :icon="RefreshRight" />
        </div>
      </div>

      <div v-if="role === 'user'" class="message-avatar user-avatar">
        <el-avatar :size="32" class="avatar user">
          <el-icon><User /></el-icon>
        </el-avatar>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import type { ChatRole } from '../types/chat';
import { ElAvatar, ElIcon, ElButton } from 'element-plus';
import { Avatar, User, InfoFilled, Loading, CopyDocument, RefreshRight } from '@element-plus/icons-vue';
import { SHOW_MESSAGE_IDS } from '../config';

const props = defineProps<{ messageId: string; role: ChatRole; content: string }>();
const showIds = SHOW_MESSAGE_IDS;

// Настройка marked для безопасного рендеринга
marked.setOptions({
  breaks: true, // Преобразование переносов строк в <br>
  gfm: true, // GitHub Flavored Markdown (таблицы, зачеркнутый текст и т.д.)
});

const formattedTime = computed(() => {
  return new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

const formattedContent = computed(() => {
  // Используем marked для полноценного парсинга markdown
  if (!props.content) return '';

  try {
    return marked.parse(props.content) as string;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    // В случае ошибки возвращаем исходный текст с экранированием HTML
    return props.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
});
</script>

<style scoped>
.message-wrapper {
  margin-bottom: 24px;
  opacity: 0;
  animation: fadeInUp 0.4s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 100%;
}

.user .message-content {
  justify-content: flex-end;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar {
  background: linear-gradient(135deg, var(--el-color-primary-light-5), var(--el-color-primary));
  color: white;
}

.avatar.user {
  background: linear-gradient(135deg, var(--el-color-success-light-5), var(--el-color-success));
}

.message-bubble {
  max-width: 75%;
  border-radius: 16px;
  padding: 16px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.2s ease;
}

.message-bubble:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.assistant-bubble, .system-bubble, .thinking-bubble {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.system-bubble {
  background: var(--el-color-info-light-9);
  border-color: var(--el-color-info-light-7);
  border-left: 3px solid var(--el-color-info);
}

.user-bubble {
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-3));
  color: white;
  border: none;
}

.thinking-bubble {
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-7);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.user-message-header {
  margin-bottom: 8px;
  padding-bottom: 6px;
  text-align: right;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.sender-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-color-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.message-id {
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: var(--el-text-color-placeholder);
  opacity: 0.7;
}

.user-bubble .message-id {
  color: rgba(255, 255, 255, 0.7);
  opacity: 0.9;
}

.message-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.message-text {
  line-height: 1.6;
  font-size: 14px;
}

.content-text {
  color: var(--el-text-color-primary);
}

.user-bubble .content-text {
  color: white;
}

.thinking-text {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-8);
  padding: 12px;
  border-radius: 8px;
  white-space: pre-wrap;
  border-left: 3px solid var(--el-color-warning);
  line-height: 1.6;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.content-text :deep(strong) {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.user-bubble .content-text :deep(strong) {
  color: white;
}

.content-text :deep(em) {
  font-style: italic;
  color: var(--el-text-color-regular);
}

.content-text :deep(.inline-code) {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary-dark-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

/* Markdown элементы: заголовки */
.content-text :deep(h1),
.content-text :deep(h2),
.content-text :deep(h3),
.content-text :deep(h4),
.content-text :deep(h5),
.content-text :deep(h6) {
  margin: 16px 0 8px 0;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.content-text :deep(h1) {
  font-size: 24px;
  border-bottom: 2px solid var(--el-border-color);
  padding-bottom: 8px;
}

.content-text :deep(h2) {
  font-size: 20px;
  border-bottom: 1px solid var(--el-border-color);
  padding-bottom: 6px;
}

.content-text :deep(h3) {
  font-size: 18px;
}

.content-text :deep(h4) {
  font-size: 16px;
}

.content-text :deep(h5) {
  font-size: 14px;
}

.content-text :deep(h6) {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.user-bubble .content-text :deep(h1),
.user-bubble .content-text :deep(h2),
.user-bubble .content-text :deep(h3),
.user-bubble .content-text :deep(h4),
.user-bubble .content-text :deep(h5),
.user-bubble .content-text :deep(h6) {
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

/* Markdown элементы: параграфы */
.content-text :deep(p) {
  margin: 8px 0;
  line-height: 1.6;
}

.content-text :deep(p:first-child) {
  margin-top: 0;
}

.content-text :deep(p:last-child) {
  margin-bottom: 0;
}

/* Markdown элементы: списки */
.content-text :deep(ul),
.content-text :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.content-text :deep(li) {
  margin: 4px 0;
  line-height: 1.6;
}

.content-text :deep(ul) {
  list-style-type: disc;
}

.content-text :deep(ol) {
  list-style-type: decimal;
}

.content-text :deep(ul ul),
.content-text :deep(ol ol),
.content-text :deep(ul ol),
.content-text :deep(ol ul) {
  margin-top: 4px;
  margin-bottom: 4px;
}

.content-text :deep(li > p) {
  margin: 0;
}

.content-text :deep(li > p + p) {
  margin-top: 8px;
}

/* Markdown элементы: таблицы */
.content-text :deep(table) {
  border-collapse: collapse;
  margin: 12px 0;
  width: 100%;
  overflow-x: auto;
  display: block;
}

.content-text :deep(table thead),
.content-text :deep(table tbody),
.content-text :deep(table tr) {
  display: table;
  width: 100%;
  table-layout: fixed;
}

.content-text :deep(th),
.content-text :deep(td) {
  border: 1px solid var(--el-border-color);
  padding: 8px 12px;
  text-align: left;
}

.content-text :deep(th) {
  background: var(--el-fill-color-light);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.user-bubble .content-text :deep(th) {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.user-bubble .content-text :deep(td),
.user-bubble .content-text :deep(th) {
  border-color: rgba(255, 255, 255, 0.3);
}

/* Markdown элементы: цитаты */
.content-text :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 4px solid var(--el-color-primary);
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-regular);
  font-style: italic;
  border-radius: 4px;
}

.user-bubble .content-text :deep(blockquote) {
  background: rgba(255, 255, 255, 0.15);
  border-left-color: rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.9);
}

.content-text :deep(blockquote p) {
  margin: 0;
}

.content-text :deep(blockquote p:not(:last-child)) {
  margin-bottom: 8px;
}

/* Markdown элементы: ссылки */
.content-text :deep(a) {
  color: var(--el-color-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.2s ease;
}

.content-text :deep(a:hover) {
  color: var(--el-color-primary-dark-2);
  border-bottom-color: var(--el-color-primary);
}

.user-bubble .content-text :deep(a) {
  color: rgba(255, 255, 255, 0.95);
  border-bottom-color: rgba(255, 255, 255, 0.5);
}

.user-bubble .content-text :deep(a:hover) {
  color: white;
  border-bottom-color: white;
}

/* Markdown элементы: горизонтальные разделители */
.content-text :deep(hr) {
  margin: 16px 0;
  border: none;
  border-top: 2px solid var(--el-border-color);
  background: none;
}

.user-bubble .content-text :deep(hr) {
  border-top-color: rgba(255, 255, 255, 0.3);
}

/* Markdown элементы: изображения */
.content-text :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Markdown элементы: зачеркнутый текст */
.content-text :deep(del),
.content-text :deep(s) {
  text-decoration: line-through;
  opacity: 0.7;
}

/* Markdown элементы: код */
.content-text :deep(code) {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary-dark-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.content-text :deep(pre) {
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.content-text :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--el-text-color-primary);
  font-family: inherit;
  font-size: inherit;
  white-space: pre;
  border-radius: 0;
}

.user-bubble .content-text :deep(code) {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.user-bubble .content-text :deep(pre) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.user-bubble .content-text :deep(pre code) {
  color: rgba(255, 255, 255, 0.95);
}

/* Устаревшие классы для обратной совместимости */
.content-text :deep(.code-block) {
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.content-text :deep(.code-block code) {
  background: transparent;
  padding: 0;
  color: var(--el-text-color-primary);
  font-family: inherit;
  font-size: inherit;
  white-space: pre;
}

.content-text :deep(.inline-code) {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary-dark-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.message-actions {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-bubble:hover .message-actions {
  opacity: 1;
}

/* Адаптивность */
@media (max-width: 768px) {
  .message-bubble {
    max-width: 90%;
    padding: 12px;
  }

  .message-content {
    gap: 8px;
  }

  .avatar {
    width: 28px !important;
    height: 28px !important;
    font-size: 14px;
  }
}
</style>


