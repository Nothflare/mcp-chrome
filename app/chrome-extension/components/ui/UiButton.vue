<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface Props {
  variant?: 'default' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  disabled: false,
});

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

  const variants: Record<string, string> = {
    default: 'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-80 active:scale-[0.98]',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive:
      'bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground active:scale-[0.98]',
    outline:
      'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
  };

  const sizes: Record<string, string> = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-10 rounded-md px-6',
    icon: 'h-9 w-9',
  };

  return cn(base, variants[props.variant], sizes[props.size]);
});
</script>

<template>
  <button :class="classes" :disabled="disabled">
    <slot />
  </button>
</template>
