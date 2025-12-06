<template>
  <div class="flex flex-col h-full min-h-[520px] max-h-[600px]">
    <!-- Header -->
    <header class="shrink-0 px-5 pt-5 pb-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold tracking-tight">Chrome MCP</h1>
          <p class="text-[11px] text-muted-foreground mt-0.5">Model Context Protocol Server</p>
        </div>
        <button
          @click="refreshServerStatus"
          class="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
          :title="getMessage('refreshStatusButton')"
        >
          <RefreshCw class="h-3.5 w-3.5 text-muted-foreground" :class="{ 'animate-spin': isRefreshing }" />
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
      <!-- Connection Status -->
      <section class="animate-fade-up">
        <div class="section-label">{{ getMessage('nativeServerConfigLabel') }}</div>
        <Card class="p-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <span :class="['status-dot', getStatusDotClass()]" />
              <span class="text-sm font-medium">{{ getStatusText() }}</span>
            </div>
            <span v-if="serverStatus.lastUpdated" class="text-[10px] text-muted-foreground tabular-nums">
              {{ formatTime(serverStatus.lastUpdated) }}
            </span>
          </div>

          <!-- MCP Config (when connected) -->
          <div v-if="showMcpConfig" class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] text-muted-foreground">{{ getMessage('mcpServerConfigLabel') }}</span>
              <button
                @click="copyMcpConfig"
                class="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <component :is="copyIcon" class="h-3 w-3" />
                {{ copyButtonText }}
              </button>
            </div>
            <pre class="mono bg-secondary/50 rounded-md p-3 text-[11px] overflow-x-auto">{{ mcpConfigJson }}</pre>
          </div>

          <!-- Port Input -->
          <div class="space-y-2 mb-4">
            <label class="text-[11px] text-muted-foreground">{{ getMessage('connectionPortLabel') }}</label>
            <Input
              type="number"
              :model-value="nativeServerPort"
              @update:model-value="updatePort"
              class="mono"
            />
          </div>

          <!-- Connect Button -->
          <Button
            :disabled="isConnecting"
            @click="testNativeConnection"
            class="w-full"
            :variant="nativeConnectionStatus === 'connected' ? 'secondary' : 'default'"
          >
            <Spinner v-if="isConnecting" size="sm" />
            <Zap v-else class="h-3.5 w-3.5" />
            <span>{{
              isConnecting
                ? getMessage('connectingStatus')
                : nativeConnectionStatus === 'connected'
                  ? getMessage('disconnectButton')
                  : getMessage('connectButton')
            }}</span>
          </Button>
        </Card>
      </section>

      <!-- Semantic Engine -->
      <section class="animate-fade-up stagger-1">
        <div class="section-label">{{ getMessage('semanticEngineLabel') }}</div>
        <Card class="p-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <span :class="['status-dot', getSemanticEngineStatusDotClass()]" />
              <span class="text-sm font-medium">{{ getSemanticEngineStatusText() }}</span>
            </div>
            <span v-if="semanticEngineLastUpdated" class="text-[10px] text-muted-foreground tabular-nums">
              {{ formatTime(semanticEngineLastUpdated) }}
            </span>
          </div>

          <!-- Progress -->
          <div v-if="isSemanticEngineInitializing" class="mb-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" />
              <span>{{ semanticEngineInitProgress }}</span>
            </div>
          </div>

          <Button
            :disabled="isSemanticEngineInitializing"
            @click="initializeSemanticEngine"
            class="w-full"
            variant="secondary"
          >
            <Cpu class="h-3.5 w-3.5" />
            <span>{{ getSemanticEngineButtonText() }}</span>
          </Button>
        </Card>
      </section>

      <!-- Model Selection -->
      <section class="animate-fade-up stagger-2">
        <div class="section-label">{{ getMessage('embeddingModelLabel') }}</div>

        <!-- Progress / Error -->
        <div v-if="isModelSwitching || isModelDownloading" class="mb-3">
          <Card class="p-3">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" />
              <span>{{ getProgressText() }}</span>
            </div>
          </Card>
        </div>

        <div v-if="modelInitializationStatus === 'error'" class="mb-3">
          <Card class="p-3 border-destructive/50">
            <div class="flex items-start gap-3">
              <AlertTriangle class="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-destructive">{{ getMessage('semanticEngineInitFailedStatus') }}</p>
                <p class="text-[11px] text-muted-foreground mt-0.5">{{ getErrorTypeText() }}</p>
              </div>
              <Button size="sm" variant="ghost" @click="retryModelInitialization" :disabled="isModelSwitching">
                <RotateCcw class="h-3 w-3" />
              </Button>
            </div>
          </Card>
        </div>

        <!-- Model List -->
        <div class="space-y-2">
          <Card
            v-for="model in availableModels"
            :key="model.preset"
            :class="[
              'p-3 cursor-pointer transition-all duration-200 hover:border-foreground/20',
              currentModel === model.preset ? 'border-foreground/40 bg-accent/50' : '',
              (isModelSwitching || isModelDownloading) ? 'opacity-50 pointer-events-none' : ''
            ]"
            @click="!isModelSwitching && !isModelDownloading && switchModel(model.preset as ModelPreset)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">{{ model.preset }}</span>
                  <div v-if="currentModel === model.preset" class="h-4 w-4 rounded-full bg-foreground flex items-center justify-center">
                    <Check class="h-2.5 w-2.5 text-background" />
                  </div>
                </div>
                <p class="text-[11px] text-muted-foreground mt-0.5">{{ getModelDescription(model) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5 mt-2.5">
              <Badge variant="success">{{ getPerformanceText(model.performance) }}</Badge>
              <Badge variant="secondary">{{ model.size }}</Badge>
              <Badge variant="outline">{{ model.dimension }}D</Badge>
            </div>
          </Card>
        </div>
      </section>

      <!-- Index Statistics -->
      <section class="animate-fade-up stagger-3">
        <div class="section-label">{{ getMessage('indexDataManagementLabel') }}</div>
        <div class="grid grid-cols-2 gap-2">
          <Card class="p-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] text-muted-foreground uppercase tracking-wider">{{ getMessage('indexedPagesLabel') }}</span>
              <FileText class="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span class="stat-value">{{ storageStats?.indexedPages || 0 }}</span>
          </Card>

          <Card class="p-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] text-muted-foreground uppercase tracking-wider">{{ getMessage('indexSizeLabel') }}</span>
              <Database class="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span class="stat-value">{{ formatIndexSize() }}</span>
          </Card>

          <Card class="p-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] text-muted-foreground uppercase tracking-wider">{{ getMessage('activeTabsLabel') }}</span>
              <Layers class="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span class="stat-value">{{ getActiveTabsCount() }}</span>
          </Card>

          <Card class="p-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] text-muted-foreground uppercase tracking-wider">{{ getMessage('vectorDocumentsLabel') }}</span>
              <Box class="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span class="stat-value">{{ storageStats?.totalDocuments || 0 }}</span>
          </Card>
        </div>

        <!-- Clear Data Progress -->
        <div v-if="isClearingData && clearDataProgress" class="mt-3">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            <span>{{ clearDataProgress }}</span>
          </div>
        </div>

        <Button
          variant="destructive"
          class="w-full mt-3"
          :disabled="isClearingData"
          @click="showClearConfirmation = true"
        >
          <Trash2 class="h-3.5 w-3.5" />
          <span>{{ isClearingData ? getMessage('clearingStatus') : getMessage('clearAllDataButton') }}</span>
        </Button>
      </section>

      <!-- Cache Management -->
      <section class="animate-fade-up stagger-4">
        <div class="section-label">{{ getMessage('modelCacheManagementLabel') }}</div>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <Card class="p-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] text-muted-foreground uppercase tracking-wider">{{ getMessage('cacheSizeLabel') }}</span>
              <HardDrive class="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span class="stat-value">{{ cacheStats?.totalSizeMB || 0 }}<span class="text-sm font-normal text-muted-foreground ml-0.5">MB</span></span>
          </Card>

          <Card class="p-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] text-muted-foreground uppercase tracking-wider">{{ getMessage('cacheEntriesLabel') }}</span>
              <Package class="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span class="stat-value">{{ cacheStats?.entryCount || 0 }}</span>
          </Card>
        </div>

        <!-- Cache Entries -->
        <div v-if="cacheStats && cacheStats.entries.length > 0" class="space-y-1.5 mb-3">
          <Card v-for="entry in cacheStats.entries" :key="entry.url" class="p-2.5">
            <div class="flex items-center justify-between">
              <span class="mono text-[11px] truncate flex-1">{{ getModelNameFromUrl(entry.url) }}</span>
              <div class="flex items-center gap-2 ml-2 shrink-0">
                <Badge variant="secondary">{{ entry.sizeMB }}MB</Badge>
                <span class="text-[10px] text-muted-foreground">{{ entry.age }}</span>
                <Badge v-if="entry.expired" variant="warning">{{ getMessage('expiredLabel') }}</Badge>
              </div>
            </div>
          </Card>
        </div>

        <div v-else-if="cacheStats && cacheStats.entries.length === 0" class="mb-3">
          <Card class="p-4 text-center">
            <p class="text-sm text-muted-foreground">{{ getMessage('noCacheDataMessage') }}</p>
          </Card>
        </div>

        <!-- Cache Progress -->
        <div v-if="isManagingCache" class="mb-3">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            <span>{{ getMessage('processingCacheStatus') }}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <Button
            variant="secondary"
            class="flex-1"
            :disabled="isManagingCache"
            @click="cleanupCache"
          >
            <Eraser class="h-3.5 w-3.5" />
            <span>{{ getMessage('cleanExpiredCacheButton') }}</span>
          </Button>
          <Button
            variant="destructive"
            class="flex-1"
            :disabled="isManagingCache"
            @click="clearAllCache"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>{{ getMessage('clearAllCacheButton') }}</span>
          </Button>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="shrink-0 px-5 py-3 border-t border-border">
      <p class="text-[10px] text-muted-foreground text-center tracking-wide">
        Chrome MCP Server v{{ version }}
      </p>
    </footer>

    <!-- Clear Data Confirmation Dialog -->
    <Dialog :open="showClearConfirmation" :title="getMessage('confirmClearDataTitle')" @close="hideClearDataConfirmation">
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">{{ getMessage('clearDataWarningMessage') }}</p>

        <ul class="space-y-1.5 text-sm text-muted-foreground pl-4">
          <li class="flex items-center gap-2">
            <span class="h-1 w-1 rounded-full bg-muted-foreground" />
            {{ getMessage('clearDataList1') }}
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1 w-1 rounded-full bg-muted-foreground" />
            {{ getMessage('clearDataList2') }}
          </li>
          <li class="flex items-center gap-2">
            <span class="h-1 w-1 rounded-full bg-muted-foreground" />
            {{ getMessage('clearDataList3') }}
          </li>
        </ul>

        <Card class="p-3 border-destructive/30 bg-destructive/5">
          <p class="text-[11px] text-destructive font-medium">{{ getMessage('clearDataIrreversibleWarning') }}</p>
        </Card>

        <div class="flex gap-2 pt-2">
          <Button variant="secondary" class="flex-1" @click="hideClearDataConfirmation">
            {{ getMessage('cancelButton') }}
          </Button>
          <Button
            variant="destructive"
            class="flex-1"
            :disabled="isClearingData"
            @click="confirmClearAllData"
          >
            <Spinner v-if="isClearingData" size="sm" />
            {{ isClearingData ? getMessage('clearingStatus') : getMessage('confirmClearButton') }}
          </Button>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed, shallowRef, type Component } from 'vue';
import {
  RefreshCw,
  Zap,
  Cpu,
  Check,
  AlertTriangle,
  RotateCcw,
  FileText,
  Database,
  Layers,
  Box,
  Trash2,
  HardDrive,
  Package,
  Eraser,
  Copy,
  CheckCheck,
} from 'lucide-vue-next';

import { Button, Card, Input, Badge, Dialog, Spinner } from '@/components/ui';
import {
  PREDEFINED_MODELS,
  type ModelPreset,
  getModelInfo,
  getCacheStats,
  clearModelCache,
  cleanupModelCache,
} from '@/utils/semantic-similarity-engine';
import { BACKGROUND_MESSAGE_TYPES } from '@/common/message-types';
import { getMessage } from '@/utils/i18n';

const version = '0.0.6';

const nativeConnectionStatus = ref<'unknown' | 'connected' | 'disconnected'>('unknown');
const isConnecting = ref(false);
const isRefreshing = ref(false);
const nativeServerPort = ref<number>(12306);

const serverStatus = ref<{
  isRunning: boolean;
  port?: number;
  lastUpdated: number;
}>({
  isRunning: false,
  lastUpdated: Date.now(),
});

const showMcpConfig = computed(() => {
  return nativeConnectionStatus.value === 'connected' && serverStatus.value.isRunning;
});

const copyButtonText = ref(getMessage('copyConfigButton'));
const copyIcon = shallowRef<Component>(Copy);

const mcpConfigJson = computed(() => {
  const port = serverStatus.value.port || nativeServerPort.value;
  const config = {
    mcpServers: {
      'streamable-mcp-server': {
        type: 'streamable-http',
        url: `http://127.0.0.1:${port}/mcp`,
      },
    },
  };
  return JSON.stringify(config, null, 2);
});

const currentModel = ref<ModelPreset | null>(null);
const isModelSwitching = ref(false);
const modelSwitchProgress = ref('');

const modelDownloadProgress = ref<number>(0);
const isModelDownloading = ref(false);
const modelInitializationStatus = ref<'idle' | 'downloading' | 'initializing' | 'ready' | 'error'>(
  'idle'
);
const modelErrorMessage = ref<string>('');
const modelErrorType = ref<'network' | 'file' | 'unknown' | ''>('');

const selectedVersion = ref<'quantized'>('quantized');

const storageStats = ref<{
  indexedPages: number;
  totalDocuments: number;
  totalTabs: number;
  indexSize: number;
  isInitialized: boolean;
} | null>(null);
const isRefreshingStats = ref(false);
const isClearingData = ref(false);
const showClearConfirmation = ref(false);
const clearDataProgress = ref('');

const semanticEngineStatus = ref<'idle' | 'initializing' | 'ready' | 'error'>('idle');
const isSemanticEngineInitializing = ref(false);
const semanticEngineInitProgress = ref('');
const semanticEngineLastUpdated = ref<number | null>(null);

const isManagingCache = ref(false);
const cacheStats = ref<{
  totalSize: number;
  totalSizeMB: number;
  entryCount: number;
  entries: Array<{
    url: string;
    size: number;
    sizeMB: number;
    timestamp: number;
    age: string;
    expired: boolean;
  }>;
} | null>(null);

const availableModels = computed(() => {
  return Object.entries(PREDEFINED_MODELS).map(([key, value]) => ({
    preset: key as ModelPreset,
    ...value,
  }));
});

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getStatusDotClass = () => {
  if (nativeConnectionStatus.value === 'connected') {
    return serverStatus.value.isRunning ? 'status-dot--success' : 'status-dot--warning';
  } else if (nativeConnectionStatus.value === 'disconnected') {
    return 'status-dot--error';
  }
  return 'status-dot--neutral';
};

const getStatusText = () => {
  if (nativeConnectionStatus.value === 'connected') {
    if (serverStatus.value.isRunning) {
      return getMessage('serviceRunningStatus', [(serverStatus.value.port || 'Unknown').toString()]);
    } else {
      return getMessage('connectedServiceNotStartedStatus');
    }
  } else if (nativeConnectionStatus.value === 'disconnected') {
    return getMessage('serviceNotConnectedStatus');
  }
  return getMessage('detectingStatus');
};

const formatIndexSize = () => {
  if (!storageStats.value?.indexSize) return '0';
  const sizeInMB = Math.round(storageStats.value.indexSize / (1024 * 1024));
  return `${sizeInMB}`;
};

const getModelDescription = (model: { preset: string }) => {
  switch (model.preset) {
    case 'multilingual-e5-small':
      return getMessage('lightweightModelDescription');
    case 'multilingual-e5-base':
      return getMessage('betterThanSmallDescription');
    default:
      return getMessage('multilingualModelDescription');
  }
};

const getPerformanceText = (performance: string) => {
  switch (performance) {
    case 'fast':
      return getMessage('fastPerformance');
    case 'balanced':
      return getMessage('balancedPerformance');
    case 'accurate':
      return getMessage('accuratePerformance');
    default:
      return performance;
  }
};

const getSemanticEngineStatusText = () => {
  switch (semanticEngineStatus.value) {
    case 'ready':
      return getMessage('semanticEngineReadyStatus');
    case 'initializing':
      return getMessage('semanticEngineInitializingStatus');
    case 'error':
      return getMessage('semanticEngineInitFailedStatus');
    case 'idle':
    default:
      return getMessage('semanticEngineNotInitStatus');
  }
};

const getSemanticEngineStatusDotClass = () => {
  switch (semanticEngineStatus.value) {
    case 'ready':
      return 'status-dot--success';
    case 'initializing':
      return 'status-dot--warning';
    case 'error':
      return 'status-dot--error';
    case 'idle':
    default:
      return 'status-dot--neutral';
  }
};

const getActiveTabsCount = () => {
  return storageStats.value?.totalTabs || 0;
};

const getProgressText = () => {
  if (isModelDownloading.value) {
    return getMessage('downloadingModelStatus', [modelDownloadProgress.value.toString()]);
  } else if (isModelSwitching.value) {
    return modelSwitchProgress.value || getMessage('switchingModelStatus');
  }
  return '';
};

const getErrorTypeText = () => {
  switch (modelErrorType.value) {
    case 'network':
      return getMessage('networkErrorMessage');
    case 'file':
      return getMessage('modelCorruptedErrorMessage');
    case 'unknown':
    default:
      return getMessage('unknownErrorMessage');
  }
};

const getSemanticEngineButtonText = () => {
  switch (semanticEngineStatus.value) {
    case 'ready':
      return getMessage('reinitializeButton');
    case 'initializing':
      return getMessage('initializingStatus');
    case 'error':
      return getMessage('reinitializeButton');
    case 'idle':
    default:
      return getMessage('initSemanticEngineButton');
  }
};

const getModelNameFromUrl = (url: string) => {
  const match = url.match(/huggingface\.co\/([^/]+\/[^/]+)/);
  if (match) {
    return match[1];
  }
  return url.split('/').pop() || url;
};

const loadCacheStats = async () => {
  try {
    cacheStats.value = await getCacheStats();
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    cacheStats.value = null;
  }
};

const cleanupCache = async () => {
  if (isManagingCache.value) return;

  isManagingCache.value = true;
  try {
    await cleanupModelCache();
    await loadCacheStats();
  } catch (error) {
    console.error('Failed to cleanup cache:', error);
  } finally {
    isManagingCache.value = false;
  }
};

const clearAllCache = async () => {
  if (isManagingCache.value) return;

  isManagingCache.value = true;
  try {
    await clearModelCache();
    await loadCacheStats();
  } catch (error) {
    console.error('Failed to clear cache:', error);
  } finally {
    isManagingCache.value = false;
  }
};

const saveSemanticEngineState = async () => {
  try {
    const semanticEngineState = {
      status: semanticEngineStatus.value,
      lastUpdated: semanticEngineLastUpdated.value,
    };
    // eslint-disable-next-line no-undef
    await chrome.storage.local.set({ semanticEngineState });
  } catch (error) {
    console.error('Failed to save semantic engine state:', error);
  }
};

const initializeSemanticEngine = async () => {
  if (isSemanticEngineInitializing.value) return;

  const isReinitialization = semanticEngineStatus.value === 'ready';

  isSemanticEngineInitializing.value = true;
  semanticEngineStatus.value = 'initializing';
  semanticEngineInitProgress.value = getMessage('semanticEngineInitializingStatus');
  semanticEngineLastUpdated.value = Date.now();

  await saveSemanticEngineState();

  try {
    // eslint-disable-next-line no-undef
    chrome.runtime
      .sendMessage({
        type: BACKGROUND_MESSAGE_TYPES.INITIALIZE_SEMANTIC_ENGINE,
      })
      .catch((error) => {
        console.error('Error sending semantic engine initialization request:', error);
      });

    startSemanticEngineStatusPolling();
    semanticEngineInitProgress.value = getMessage('processingStatus');
  } catch (error: unknown) {
    console.error('Failed to send initialization request:', error);
    semanticEngineStatus.value = 'error';
    semanticEngineInitProgress.value = `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

    await saveSemanticEngineState();

    setTimeout(() => {
      semanticEngineInitProgress.value = '';
    }, 5000);

    isSemanticEngineInitializing.value = false;
    semanticEngineLastUpdated.value = Date.now();
    await saveSemanticEngineState();
  }
};

const checkSemanticEngineStatus = async () => {
  try {
    // eslint-disable-next-line no-undef
    const response = await chrome.runtime.sendMessage({
      type: BACKGROUND_MESSAGE_TYPES.GET_MODEL_STATUS,
    });

    if (response && response.success && response.status) {
      const status = response.status;

      if (status.initializationStatus === 'ready') {
        semanticEngineStatus.value = 'ready';
        semanticEngineLastUpdated.value = Date.now();
        isSemanticEngineInitializing.value = false;
        semanticEngineInitProgress.value = getMessage('semanticEngineReadyStatus');
        await saveSemanticEngineState();
        stopSemanticEngineStatusPolling();
        setTimeout(() => {
          semanticEngineInitProgress.value = '';
        }, 2000);
      } else if (
        status.initializationStatus === 'downloading' ||
        status.initializationStatus === 'initializing'
      ) {
        semanticEngineStatus.value = 'initializing';
        isSemanticEngineInitializing.value = true;
        semanticEngineInitProgress.value = getMessage('semanticEngineInitializingStatus');
        semanticEngineLastUpdated.value = Date.now();
        await saveSemanticEngineState();
      } else if (status.initializationStatus === 'error') {
        semanticEngineStatus.value = 'error';
        semanticEngineLastUpdated.value = Date.now();
        isSemanticEngineInitializing.value = false;
        semanticEngineInitProgress.value = getMessage('semanticEngineInitFailedStatus');
        await saveSemanticEngineState();
        stopSemanticEngineStatusPolling();
        setTimeout(() => {
          semanticEngineInitProgress.value = '';
        }, 5000);
      } else {
        semanticEngineStatus.value = 'idle';
        isSemanticEngineInitializing.value = false;
        await saveSemanticEngineState();
      }
    } else {
      semanticEngineStatus.value = 'idle';
      isSemanticEngineInitializing.value = false;
      await saveSemanticEngineState();
    }
  } catch (error) {
    console.error('Popup: Failed to check semantic engine status:', error);
    semanticEngineStatus.value = 'idle';
    isSemanticEngineInitializing.value = false;
    await saveSemanticEngineState();
  }
};

const retryModelInitialization = async () => {
  if (!currentModel.value) return;

  modelErrorMessage.value = '';
  modelErrorType.value = '';
  modelInitializationStatus.value = 'downloading';
  modelDownloadProgress.value = 0;
  isModelDownloading.value = true;
  await switchModel(currentModel.value);
};

const updatePort = async (value: string | number) => {
  const newPort = Number(value);
  nativeServerPort.value = newPort;
  await savePortPreference(newPort);
};

const checkNativeConnection = async () => {
  try {
    // eslint-disable-next-line no-undef
    const response = await chrome.runtime.sendMessage({ type: 'ping_native' });
    nativeConnectionStatus.value = response?.connected ? 'connected' : 'disconnected';
  } catch (error) {
    console.error('Failed to check native connection:', error);
    nativeConnectionStatus.value = 'disconnected';
  }
};

const checkServerStatus = async () => {
  try {
    // eslint-disable-next-line no-undef
    const response = await chrome.runtime.sendMessage({
      type: BACKGROUND_MESSAGE_TYPES.GET_SERVER_STATUS,
    });
    if (response?.success && response.serverStatus) {
      serverStatus.value = response.serverStatus;
    }

    if (response?.connected !== undefined) {
      nativeConnectionStatus.value = response.connected ? 'connected' : 'disconnected';
    }
  } catch (error) {
    console.error('Failed to check server status:', error);
  }
};

const refreshServerStatus = async () => {
  isRefreshing.value = true;
  try {
    // eslint-disable-next-line no-undef
    const response = await chrome.runtime.sendMessage({
      type: BACKGROUND_MESSAGE_TYPES.REFRESH_SERVER_STATUS,
    });
    if (response?.success && response.serverStatus) {
      serverStatus.value = response.serverStatus;
    }

    if (response?.connected !== undefined) {
      nativeConnectionStatus.value = response.connected ? 'connected' : 'disconnected';
    }
  } catch (error) {
    console.error('Failed to refresh server status:', error);
  } finally {
    setTimeout(() => {
      isRefreshing.value = false;
    }, 500);
  }
};

const copyMcpConfig = async () => {
  try {
    await navigator.clipboard.writeText(mcpConfigJson.value);
    copyButtonText.value = getMessage('configCopiedNotification');
    copyIcon.value = CheckCheck;

    setTimeout(() => {
      copyButtonText.value = getMessage('copyConfigButton');
      copyIcon.value = Copy;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy config:', error);
  }
};

const testNativeConnection = async () => {
  if (isConnecting.value) return;
  isConnecting.value = true;
  try {
    if (nativeConnectionStatus.value === 'connected') {
      // eslint-disable-next-line no-undef
      await chrome.runtime.sendMessage({ type: 'disconnect_native' });
      nativeConnectionStatus.value = 'disconnected';
    } else {
      // eslint-disable-next-line no-undef
      const response = await chrome.runtime.sendMessage({
        type: 'connectNative',
        port: nativeServerPort.value,
      });
      if (response && response.success) {
        nativeConnectionStatus.value = 'connected';
        await savePortPreference(nativeServerPort.value);
      } else {
        nativeConnectionStatus.value = 'disconnected';
      }
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    nativeConnectionStatus.value = 'disconnected';
  } finally {
    isConnecting.value = false;
  }
};

const loadModelPreference = async () => {
  try {
    // eslint-disable-next-line no-undef
    const result = await chrome.storage.local.get([
      'selectedModel',
      'selectedVersion',
      'modelState',
      'semanticEngineState',
    ]);

    if (result.selectedModel) {
      const storedModel = result.selectedModel as string;
      if (PREDEFINED_MODELS[storedModel as ModelPreset]) {
        currentModel.value = storedModel as ModelPreset;
      } else {
        currentModel.value = 'multilingual-e5-small';
        await saveModelPreference(currentModel.value);
      }
    } else {
      currentModel.value = 'multilingual-e5-small';
      await saveModelPreference(currentModel.value);
    }

    selectedVersion.value = 'quantized';
    await saveVersionPreference('quantized');

    if (result.modelState) {
      const modelState = result.modelState;
      if (modelState.status === 'ready') {
        modelInitializationStatus.value = 'ready';
        modelDownloadProgress.value = modelState.downloadProgress || 100;
        isModelDownloading.value = false;
      } else {
        modelInitializationStatus.value = 'idle';
        modelDownloadProgress.value = 0;
        isModelDownloading.value = false;
        await saveModelState();
      }
    } else {
      modelInitializationStatus.value = 'idle';
      modelDownloadProgress.value = 0;
      isModelDownloading.value = false;
    }

    if (result.semanticEngineState) {
      const semanticState = result.semanticEngineState;
      if (semanticState.status === 'ready') {
        semanticEngineStatus.value = 'ready';
        semanticEngineLastUpdated.value = semanticState.lastUpdated || Date.now();
      } else if (semanticState.status === 'error') {
        semanticEngineStatus.value = 'error';
        semanticEngineLastUpdated.value = semanticState.lastUpdated || Date.now();
      } else {
        semanticEngineStatus.value = 'idle';
      }
    } else {
      semanticEngineStatus.value = 'idle';
    }
  } catch (error) {
    console.error('Failed to load model preference:', error);
  }
};

const saveModelPreference = async (model: ModelPreset) => {
  try {
    // eslint-disable-next-line no-undef
    await chrome.storage.local.set({ selectedModel: model });
  } catch (error) {
    console.error('Failed to save model preference:', error);
  }
};

const saveVersionPreference = async (version: 'full' | 'quantized' | 'compressed') => {
  try {
    // eslint-disable-next-line no-undef
    await chrome.storage.local.set({ selectedVersion: version });
  } catch (error) {
    console.error('Failed to save version preference:', error);
  }
};

const savePortPreference = async (port: number) => {
  try {
    // eslint-disable-next-line no-undef
    await chrome.storage.local.set({ nativeServerPort: port });
  } catch (error) {
    console.error('Failed to save port preference:', error);
  }
};

const loadPortPreference = async () => {
  try {
    // eslint-disable-next-line no-undef
    const result = await chrome.storage.local.get(['nativeServerPort']);
    if (result.nativeServerPort) {
      nativeServerPort.value = result.nativeServerPort;
    }
  } catch (error) {
    console.error('Failed to load port preference:', error);
  }
};

const saveModelState = async () => {
  try {
    const modelState = {
      status: modelInitializationStatus.value,
      downloadProgress: modelDownloadProgress.value,
      isDownloading: isModelDownloading.value,
      lastUpdated: Date.now(),
    };
    // eslint-disable-next-line no-undef
    await chrome.storage.local.set({ modelState });
  } catch (error) {
    console.error('Failed to save model state:', error);
  }
};

let statusMonitoringInterval: ReturnType<typeof setInterval> | null = null;
let semanticEngineStatusPollingInterval: ReturnType<typeof setInterval> | null = null;

const startModelStatusMonitoring = () => {
  if (statusMonitoringInterval) {
    clearInterval(statusMonitoringInterval);
  }

  statusMonitoringInterval = setInterval(async () => {
    try {
      // eslint-disable-next-line no-undef
      const response = await chrome.runtime.sendMessage({
        type: 'get_model_status',
      });

      if (response && response.success) {
        const status = response.status;
        modelInitializationStatus.value = status.initializationStatus || 'idle';
        modelDownloadProgress.value = status.downloadProgress || 0;
        isModelDownloading.value = status.isDownloading || false;

        if (status.initializationStatus === 'error') {
          modelErrorMessage.value = status.errorMessage || getMessage('modelFailedStatus');
          modelErrorType.value = status.errorType || 'unknown';
        } else {
          modelErrorMessage.value = '';
          modelErrorType.value = '';
        }

        await saveModelState();

        if (status.initializationStatus === 'ready' || status.initializationStatus === 'error') {
          stopModelStatusMonitoring();
        }
      }
    } catch (error) {
      console.error('Failed to get model status:', error);
    }
  }, 1000);
};

const stopModelStatusMonitoring = () => {
  if (statusMonitoringInterval) {
    clearInterval(statusMonitoringInterval);
    statusMonitoringInterval = null;
  }
};

const startSemanticEngineStatusPolling = () => {
  if (semanticEngineStatusPollingInterval) {
    clearInterval(semanticEngineStatusPollingInterval);
  }

  semanticEngineStatusPollingInterval = setInterval(async () => {
    try {
      await checkSemanticEngineStatus();
    } catch (error) {
      console.error('Semantic engine status polling failed:', error);
    }
  }, 2000);
};

const stopSemanticEngineStatusPolling = () => {
  if (semanticEngineStatusPollingInterval) {
    clearInterval(semanticEngineStatusPollingInterval);
    semanticEngineStatusPollingInterval = null;
  }
};

const refreshStorageStats = async () => {
  if (isRefreshingStats.value) return;

  isRefreshingStats.value = true;
  try {
    // eslint-disable-next-line no-undef
    const response = await chrome.runtime.sendMessage({
      type: 'get_storage_stats',
    });

    if (response && response.success) {
      storageStats.value = {
        indexedPages: response.stats.indexedPages || 0,
        totalDocuments: response.stats.totalDocuments || 0,
        totalTabs: response.stats.totalTabs || 0,
        indexSize: response.stats.indexSize || 0,
        isInitialized: response.stats.isInitialized || false,
      };
    } else {
      storageStats.value = {
        indexedPages: 0,
        totalDocuments: 0,
        totalTabs: 0,
        indexSize: 0,
        isInitialized: false,
      };
    }
  } catch (error) {
    console.error('Error refreshing storage stats:', error);
    storageStats.value = {
      indexedPages: 0,
      totalDocuments: 0,
      totalTabs: 0,
      indexSize: 0,
      isInitialized: false,
    };
  } finally {
    isRefreshingStats.value = false;
  }
};

const hideClearDataConfirmation = () => {
  showClearConfirmation.value = false;
};

const confirmClearAllData = async () => {
  if (isClearingData.value) return;

  isClearingData.value = true;
  clearDataProgress.value = getMessage('clearingStatus');

  try {
    // eslint-disable-next-line no-undef
    const response = await chrome.runtime.sendMessage({
      type: 'clear_all_data',
    });

    if (response && response.success) {
      clearDataProgress.value = getMessage('dataClearedNotification');
      await refreshStorageStats();

      setTimeout(() => {
        clearDataProgress.value = '';
        hideClearDataConfirmation();
      }, 2000);
    } else {
      throw new Error(response?.error || 'Failed to clear data');
    }
  } catch (error: unknown) {
    console.error('Failed to clear all data:', error);
    clearDataProgress.value = `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

    setTimeout(() => {
      clearDataProgress.value = '';
    }, 5000);
  } finally {
    isClearingData.value = false;
  }
};

const switchModel = async (newModel: ModelPreset) => {
  if (isModelSwitching.value) return;

  const isSameModel = newModel === currentModel.value;
  const currentModelInfo = currentModel.value
    ? getModelInfo(currentModel.value)
    : getModelInfo('multilingual-e5-small');
  const newModelInfo = getModelInfo(newModel);
  const isDifferentDimension = currentModelInfo.dimension !== newModelInfo.dimension;

  if (isSameModel && !isDifferentDimension) return;

  isModelSwitching.value = true;
  modelSwitchProgress.value = getMessage('switchingModelStatus');

  modelInitializationStatus.value = 'downloading';
  modelDownloadProgress.value = 0;
  isModelDownloading.value = true;

  try {
    await saveModelPreference(newModel);
    await saveVersionPreference('quantized');
    await saveModelState();

    modelSwitchProgress.value = getMessage('semanticEngineInitializingStatus');

    startModelStatusMonitoring();

    // eslint-disable-next-line no-undef
    const response = await chrome.runtime.sendMessage({
      type: 'switch_semantic_model',
      modelPreset: newModel,
      modelVersion: 'quantized',
      modelDimension: newModelInfo.dimension,
      previousDimension: currentModelInfo.dimension,
    });

    if (response && response.success) {
      currentModel.value = newModel;
      modelSwitchProgress.value = getMessage('successNotification');

      modelInitializationStatus.value = 'ready';
      isModelDownloading.value = false;
      await saveModelState();

      setTimeout(() => {
        modelSwitchProgress.value = '';
      }, 2000);
    } else {
      throw new Error(response?.error || 'Model switch failed');
    }
  } catch (error: unknown) {
    console.error('Model switch failed:', error);
    modelSwitchProgress.value = `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

    modelInitializationStatus.value = 'error';
    isModelDownloading.value = false;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout')
    ) {
      modelErrorType.value = 'network';
      modelErrorMessage.value = getMessage('networkErrorMessage');
    } else if (
      errorMessage.includes('corrupt') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('format')
    ) {
      modelErrorType.value = 'file';
      modelErrorMessage.value = getMessage('modelCorruptedErrorMessage');
    } else {
      modelErrorType.value = 'unknown';
      modelErrorMessage.value = errorMessage;
    }

    await saveModelState();

    setTimeout(() => {
      modelSwitchProgress.value = '';
    }, 8000);
  } finally {
    isModelSwitching.value = false;
  }
};

const setupServerStatusListener = () => {
  // eslint-disable-next-line no-undef
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === BACKGROUND_MESSAGE_TYPES.SERVER_STATUS_CHANGED && message.payload) {
      serverStatus.value = message.payload;
    }
  });
};

onMounted(async () => {
  await loadPortPreference();
  await loadModelPreference();
  await checkNativeConnection();
  await checkServerStatus();
  await refreshStorageStats();
  await loadCacheStats();

  await checkSemanticEngineStatus();
  setupServerStatusListener();
});

onUnmounted(() => {
  stopModelStatusMonitoring();
  stopSemanticEngineStatusPolling();
});
</script>
