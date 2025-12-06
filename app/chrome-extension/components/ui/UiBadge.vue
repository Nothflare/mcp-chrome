<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface Props {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
});

const classes = computed(() => {
  const base =
    'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium transition-colors';

  const variants: Record<string, string> = {
    default: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary text-muted-foreground',
    success: 'bg-status-success/15 text-status-success',
    warning: 'bg-status-warning/15 text-status-warning',
    destructive: 'bg-destructive/15 text-destructive',
    outline: 'border border-border text-muted-foreground',
  };

  return cn(base, variants[props.variant], props.class);
});
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
