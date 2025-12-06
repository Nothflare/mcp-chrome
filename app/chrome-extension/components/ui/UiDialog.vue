<script setup lang="ts">
import { cn } from '@/lib/utils';
import { X } from 'lucide-vue-next';

interface Props {
  open: boolean;
  title?: string;
}

defineProps<Props>();
const emit = defineEmits<{
  (e: 'close'): void;
}>();

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('close');
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click="handleBackdropClick"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-background/80 backdrop-blur-sm" />

        <!-- Dialog -->
        <div
          :class="
            cn(
              'relative z-50 w-full max-w-[340px] mx-4',
              'bg-card border border-border rounded-lg shadow-lg',
              'animate-scale-in'
            )
          "
        >
          <!-- Header -->
          <div v-if="title" class="flex items-center justify-between px-5 pt-5 pb-0">
            <h2 class="text-base font-semibold tracking-tight">{{ title }}</h2>
            <button
              @click="emit('close')"
              class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X class="h-4 w-4" />
              <span class="sr-only">Close</span>
            </button>
          </div>

          <!-- Content -->
          <div class="p-5">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-active .animate-scale-in,
.dialog-leave-active .animate-scale-in {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.dialog-enter-from .animate-scale-in {
  opacity: 0;
  transform: scale(0.96);
}

.dialog-leave-to .animate-scale-in {
  opacity: 0;
  transform: scale(0.96);
}
</style>
