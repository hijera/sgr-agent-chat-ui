<script setup lang="ts">
import { ElButton } from 'element-plus';
import type { Component } from 'vue';

type ButtonType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' | 'text';
type ButtonSize = 'small' | 'default' | 'large';

const props = defineProps<{
  type?: ButtonType;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  round?: boolean;
  circle?: boolean;
  icon?: Component | null;
}>();

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>();

function onClick(ev: MouseEvent) {
  if (!props.disabled) emit('click', ev);
}
</script>

<template>
  <ElButton
    :type="props.type ?? 'default'"
    :size="props.size ?? 'default'"
    :loading="props.loading"
    :disabled="props.disabled"
    :round="props.round"
    :circle="props.circle"
    @click="onClick"
  >
    <template v-if="props.icon" #icon>
      <component :is="props.icon" />
    </template>
    <slot />
  </ElButton>
</template>


