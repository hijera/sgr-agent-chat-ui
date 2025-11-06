<template>
    <ElCard :shadow="shadow ?? 'never'">
      <template #header>
        <slot name="header" />
      </template>
      <slot />
    </ElCard>
  </template>
<script setup lang="ts">
import { ElCard } from 'element-plus';

defineProps<{ shadow?: 'always' | 'hover' | 'never' }>();
</script>




