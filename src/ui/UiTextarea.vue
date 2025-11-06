<template>
    <ElInput
      type="textarea"
      :model-value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :rows="props.rows"
      :autosize="props.autosize"
      @update:model-value="onUpdate"
      @keydown="onKeydown"
    />
</template>  
<script setup lang="ts">
import { ElInput } from 'element-plus';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  autosize?: boolean | { minRows?: number; maxRows?: number };
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void; (e: 'enter'): void }>();

function onUpdate(val: string) {
  emit('update:modelValue', val);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) emit('enter');
}
</script>


