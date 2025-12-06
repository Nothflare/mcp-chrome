<script setup lang="ts">
import { cn } from '@/lib/utils';

interface Props {
  size?: 'sm' | 'default' | 'lg';
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
});

const sizeClasses = {
  sm: 'h-3 w-3 border-[1.5px]',
  default: 'h-4 w-4 border-2',
  lg: 'h-5 w-5 border-2',
};
</script>

<template>
  <div
    :class="
      cn(
        'animate-spin rounded-full border-muted-foreground/25 border-t-foreground',
        sizeClasses[props.size],
        props.class
      )
    "
  />
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 0.8s linear infinite;
}
</style>
