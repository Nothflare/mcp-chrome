# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome MCP Server - A Chrome extension-based Model Context Protocol (MCP) server that enables AI assistants to control Chrome browser automation. Unlike Playwright, this uses the user's actual browser instance with existing login states and configurations.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development (runs all packages in parallel)
pnpm dev

# Build
pnpm build                # Build all packages (except WASM)
pnpm build:extension      # Build Chrome extension only
pnpm build:native         # Build native server only
pnpm build:wasm           # Build Rust WASM SIMD package

# Testing (native server only)
pnpm test                 # Run Jest tests
pnpm test:watch           # Watch mode

# Code Quality
pnpm lint                 # Run ESLint
pnpm lint:fix             # Fix linting issues
pnpm format               # Format with Prettier
pnpm typecheck            # TypeScript type checking
```

## Architecture

```
AI Assistant (Claude) → Native Server (Fastify:12306) → Chrome Extension (WXT+Vue)
                        HTTP/SSE/STDIO                  Native Messaging Protocol
```

**Monorepo Structure:**
- `app/chrome-extension/` - Chrome extension (WXT + Vue 3)
- `app/native-server/` - Node.js MCP server (Fastify + TypeScript)
- `packages/shared/` - Shared types and tool schemas
- `packages/wasm-simd/` - Rust WebAssembly SIMD for vector operations

**Tool Implementation Flow:**
1. Schema definition: `packages/shared/src/tools.ts`
2. Registration: `app/native-server/src/mcp/register-tools.ts`
3. Handler: `app/chrome-extension/entrypoints/background/tools/index.ts`
4. Implementation: `app/chrome-extension/entrypoints/background/tools/browser/*.ts`

**Extension Entry Points:**
- `entrypoints/background/` - Main orchestrator, tool execution
- `entrypoints/popup.html/` - Vue popup UI for configuration
- `entrypoints/content/` - DOM interaction via content scripts
- `workers/` - Web workers for AI processing (embeddings, vector search)

## Key Technologies

- **Extension Framework**: WXT v0.20 with Vue 3
- **Server**: Fastify v5 with TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk v1.11
- **AI/ML**: Transformers.js for embeddings, hnswlib-wasm for vector DB
- **WASM SIMD**: Rust-based math optimization for 4-8x faster cosine similarity

## Shared Package Usage

The `@anthropic/mcp-chrome-shared` package exports tool schemas and constants. Import types from:
```typescript
import { TOOL_NAMES, ToolName, ToolInputMap } from '@anthropic/mcp-chrome-shared';
```

## Extension Messaging

Communication between extension components uses typed message passing:
- `app/chrome-extension/common/message-types.ts` - Message type definitions
- Background ↔ Content script: `chrome.tabs.sendMessage` / `chrome.runtime.sendMessage`
- Native server ↔ Extension: Native Messaging Protocol

## Testing

Tests are in `app/native-server/src/` with `.spec.ts` suffix. Coverage threshold is 80%.

```bash
cd app/native-server
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
```

## Loading the Extension

1. `pnpm dev` or `pnpm build:extension`
2. Open `chrome://extensions/`
3. Enable Developer mode
4. Load unpacked → Select `app/chrome-extension/dist`
