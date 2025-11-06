<template>
    <ElTag
      :type="props.type ?? ''"
      :effect="props.effect ?? 'light'"
      :size="props.size ?? 'default'"
      :round="props.round"
      :closable="props.closable"
      @close="emit('close')"
    >
      <slot />
    </ElTag>
</template>  
<script setup lang="ts">
import { ElTag } from 'element-plus';

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | '';
type TagEffect = 'dark' | 'light' | 'plain';

const props = defineProps<{
  type?: TagType;
  effect?: TagEffect;
  size?: 'small' | 'default' | 'large';
  round?: boolean;
  closable?: boolean;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();
</script>

