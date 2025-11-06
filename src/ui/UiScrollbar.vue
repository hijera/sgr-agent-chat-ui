<template>
    <ElScrollbar :height="height" :always="always">
      <slot />
    </ElScrollbar>
</template>  
<script setup lang="ts">
import { ElScrollbar } from 'element-plus';

defineProps<{ height?: string | number; always?: boolean }>();
</script>

