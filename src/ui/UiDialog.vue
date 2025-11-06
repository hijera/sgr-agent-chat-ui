<template>
    <ElDialog
      :model-value="props.modelValue"
      :title="props.title"
      :width="props.width ?? '50%'"
      :top="props.top"
      :center="props.center"
      :close-on-click-modal="props.closeOnClickModal ?? true"
      @update:model-value="onUpdate"
    >
      <slot />
      <template #footer>
        <slot name="footer" />
      </template>
    </ElDialog>
  </template>
<script setup lang="ts">
import { ElDialog } from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
  title?: string;
  width?: string | number;
  top?: string;
  center?: boolean;
  closeOnClickModal?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

function onUpdate(val: boolean) {
  emit('update:modelValue', val);
}
</script>


