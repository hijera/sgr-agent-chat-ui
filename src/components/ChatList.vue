<template>
  <aside class="chat-list">
    <div class="list-header">
      <div class="title">
        <el-icon class="title-icon"><ChatSquare /></el-icon>
        Conversations
      </div>
      <el-button
        type="primary"
        size="small"
        :icon="Plus"
        @click="$emit('create')"
        round
      >
        New Chat
      </el-button>
    </div>
    <el-scrollbar class="list-scroll">
      <div class="list-container">
        <transition-group name="chat-list" tag="div">
          <div
            v-for="chat in chats"
            :key="chat.id"
            class="chat-item"
            :class="{ active: chat.id === selectedId }"
            @click="$emit('select', chat.id)"
          >
            <div class="item-content">
              <div class="item-avatar">
                <el-avatar :size="36" class="chat-avatar">
                  <el-icon><Message /></el-icon>
                </el-avatar>
              </div>
              <div class="item-info">
                <div class="item-title">{{ chat.title }}</div>
                <div class="item-preview">Click to continue conversation...</div>
              </div>
              <div class="item-actions" @click.stop>
                <el-dropdown trigger="click" placement="bottom-end">
                  <el-button text :icon="MoreFilled" size="small" class="more-btn" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="$emit('rename', chat.id)">
                        <el-icon><Edit /></el-icon>
                        Rename
                      </el-dropdown-item>
                      <el-dropdown-item divided @click="$emit('delete', chat.id)">
                        <el-icon><Delete /></el-icon>
                        Delete
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </transition-group>
        <div v-if="chats.length === 0" class="empty-state">
          <el-icon class="empty-icon" :size="48"><ChatSquare /></el-icon>
          <p class="empty-text">No conversations yet</p>
          <p class="empty-subtext">Start a new conversation to begin</p>
        </div>
      </div>
    </el-scrollbar>
  </aside>
</template>

<script setup lang="ts">
import type { Chat } from '../types/chat';
import {
  ElButton, ElScrollbar, ElAvatar, ElIcon, ElDropdown,
  ElDropdownMenu, ElDropdownItem
} from 'element-plus';
import {
  Plus, ChatSquare, Message, MoreFilled, Edit,
  Delete
} from '@element-plus/icons-vue';

defineProps<{
  chats: Chat[];
  selectedId: string;
}>();

defineEmits<{
  (e: 'select', id: string): void;
  (e: 'create'): void;
  (e: 'rename', id: string): void;
  (e: 'delete', id: string): void;
}>();
</script>

<style scoped>
.chat-list {
  display: flex;
  flex-direction: column;
  width: 320px;
  min-width: 320px;
  border-right: 1px solid var(--el-border-color-lighter);
  height: 100%;
  min-height: 0;
  background: var(--el-bg-color);
}

.list-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.title-icon {
  color: var(--el-color-primary);
}

.list-scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.list-scroll :deep(.el-scrollbar__wrap) {
  max-height: 100%;
}

.list-container {
  padding: 8px;
}

.chat-item {
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--el-bg-color);
  border: 1px solid transparent;
}

.chat-item:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.chat-item.active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.12);
}

.item-content {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 12px;
}

.item-avatar {
  flex-shrink: 0;
}

.chat-avatar {
  background: linear-gradient(135deg, var(--el-color-primary-light-5), var(--el-color-primary));
  color: white;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.item-preview {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.chat-item:hover .item-actions {
  opacity: 1;
}

.more-btn {
  border-radius: 50%;
  width: 28px;
  height: 28px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--el-text-color-secondary);
}

.empty-icon {
  color: var(--el-text-color-placeholder);
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px 0;
  color: var(--el-text-color-regular);
}

.empty-subtext {
  font-size: 14px;
  margin: 0;
  color: var(--el-text-color-secondary);
}

/* Анимации для списка чатов */
.chat-list-enter-active,
.chat-list-leave-active {
  transition: all 0.3s ease;
}

.chat-list-enter-from,
.chat-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.chat-list-move {
  transition: transform 0.3s ease;
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .chat-list {
    width: 280px;
    min-width: 280px;
  }

  .list-header {
    padding: 16px 12px;
  }

  .list-container {
    padding: 4px;
  }

  .item-content {
    padding: 10px;
  }

  .item-title {
    font-size: 13px;
  }

  .item-preview {
    font-size: 11px;
  }
}
</style>


