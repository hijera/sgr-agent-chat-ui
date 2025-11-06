<template>
    <ElIcon :size="props.size" :color="props.color">
      <component v-if="props.name" :is="props.name" />
      <slot v-else />
    </ElIcon>
</template>  
<script setup lang="ts">
import { ElIcon } from 'element-plus';
import type { Component } from 'vue';

const props = defineProps<{ name?: Component; size?: number | string; color?: string }>();
</script>



