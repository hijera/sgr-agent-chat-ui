<template>
    <ElInput
      :model-value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :clearable="props.clearable"
      :maxlength="props.maxlength"
      :show-word-limit="props.showWordLimit"
      @update:model-value="onUpdate"
      @keyup="onKeyup"
    />
  </template>  
<script setup lang="ts">
import { ElInput } from 'element-plus';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  maxlength?: number;
  showWordLimit?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'enter'): void;
}>();

function onUpdate(val: string) {
  emit('update:modelValue', val);
}

function onKeyup(e: KeyboardEvent) {
  if (e.key === 'Enter') emit('enter');
}
</script>



