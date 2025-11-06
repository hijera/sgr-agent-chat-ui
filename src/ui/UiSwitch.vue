<template>
    <ElSwitch
      :model-value="props.modelValue"
      :active-text="props.activeText"
      :inactive-text="props.inactiveText"
      :disabled="props.disabled"
      @update:model-value="onUpdate"
    />
</template>
<script setup lang="ts">
import { ElSwitch } from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
  activeText?: string;
  inactiveText?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

function onUpdate(val: boolean) {
  emit('update:modelValue', val);
}
</script>


