/**
 * ReMEM — Framework adapters
 * Lightweight, dependency-free adapters for common agent runtimes.
 */

import type { ReMEM } from './index.js';
import { storeMemoryInputSchema, type QueryOptions, type QueryResponse, type StoreMemoryInput } from './types.js';

export interface ReMEMAdapterOptions {
  /** Default topic attached to memories stored through the adapter. */
  defaultTopic?: string;
  /** Default query limit when the caller does not provide one. */
  defaultLimit?: number;
}

function withDefaultTopic(input: StoreMemoryInput, defaultTopic?: string): StoreMemoryInput {
  const normalized = storeMemoryInputSchema.parse(input);
  if (!defaultTopic) return normalized;
  const topics = Array.from(new Set([...normalized.topics, defaultTopic]));
  return { ...normalized, topics };
}

function contentFromMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return String(messages ?? '');

  return messages
    .map((message) => {
      if (typeof message === 'string') return message;
      if (!message || typeof message !== 'object') return String(message ?? '');
      const record = message as Record<string, unknown>;
      const role = typeof record.role === 'string' ? `${record.role}: ` : '';
      const content = record.content;
      if (typeof content === 'string') return `${role}${content}`;
      if (Array.isArray(content)) {
        const text = content
          .map((part) => {
            if (typeof part === 'string') return part;
            if (part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string') {
              return (part as Record<string, string>).text;
            }
            return '';
          })
          .filter(Boolean)
          .join('\n');
        return `${role}${text}`;
      }
      return `${role}${JSON.stringify(content ?? '')}`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Vercel AI SDK-style helper.
 *
 * The AI SDK does not mandate one memory interface, so this adapter exposes
 * tiny primitives that fit neatly into middleware/tools: save messages,
 * remember arbitrary text, and recall relevant context.
 */
export function createVercelAIAdapter(memory: ReMEM, options: ReMEMAdapterOptions = {}) {
  return {
    name: 'vercel-ai',

    async remember(input: string | StoreMemoryInput): Promise<void> {
      const normalized = storeMemoryInputSchema.parse(typeof input === 'string' ? { content: input } : input);
      await memory.store(withDefaultTopic(normalized, options.defaultTopic ?? 'vercel-ai'));
    },

    async saveMessages(messages: unknown, metadata: Record<string, unknown> = {}): Promise<void> {
      const content = contentFromMessages(messages).trim();
      if (!content) return;
      const entry = storeMemoryInputSchema.parse({
        content,
        metadata: { ...metadata, source: 'vercel-ai.messages' },
      });
      await memory.store(withDefaultTopic(entry, options.defaultTopic ?? 'conversation'));
    },

    async recall(query: string, queryOptions: QueryOptions = { limit: options.defaultLimit ?? 5 }): Promise<QueryResponse> {
      return memory.query(query, queryOptions);
    },

    async context(query: string, queryOptions: QueryOptions = { limit: options.defaultLimit ?? 5 }): Promise<string> {
      const response = await memory.query(query, queryOptions);
      return response.results.map((result) => `- ${result.content}`).join('\n');
    },
  };
}

/**
 * LangGraph/LangChain-style BaseStore-ish adapter.
 *
 * Implements get/put/search/listNamespaces in a dependency-free structural shape
 * so it can be wrapped by LangGraph JS projects without pulling LangChain into
 * ReMEM itself.
 */
export function createLangGraphStoreAdapter(memory: ReMEM, options: ReMEMAdapterOptions = {}) {
  return {
    name: 'langgraph-store',

    async put(namespace: string | string[], key: string, value: unknown): Promise<void> {
      const ns = Array.isArray(namespace) ? namespace.join('/') : namespace;
      const content = typeof value === 'string' ? value : JSON.stringify(value);
      await memory.store(withDefaultTopic({
        content,
        topics: [ns],
        metadata: { key, namespace: ns, source: 'langgraph.store' },
      }, options.defaultTopic));
    },

    async search(namespace: string | string[], query: string, queryOptions: QueryOptions = { limit: options.defaultLimit ?? 10 }) {
      const ns = Array.isArray(namespace) ? namespace.join('/') : namespace;
      const response = await memory.query(query, {
        ...queryOptions,
        topics: Array.from(new Set([...(queryOptions.topics ?? []), ns])),
      });
      return response.results.map((result) => ({
        namespace: [ns],
        key: result.id,
        value: result.content,
        createdAt: result.createdAt,
        updatedAt: result.accessedAt,
        score: result.relevanceScore,
      }));
    },

    async get(namespace: string | string[], key: string) {
      const ns = Array.isArray(namespace) ? namespace.join('/') : namespace;
      const response = await memory.query(key, { limit: 20, topics: [ns] });
      const found = response.results.find((result) => result.id === key || result.content.includes(key));
      return found
        ? {
            namespace: [ns],
            key: found.id,
            value: found.content,
            createdAt: found.createdAt,
            updatedAt: found.accessedAt,
          }
        : null;
    },

    async listNamespaces(): Promise<string[][]> {
      const recent = await memory.getRecent(100);
      const namespaces = new Set<string>();
      for (const entry of recent) {
        for (const topic of entry.topics) namespaces.add(topic);
      }
      return [...namespaces].map((ns) => [ns]);
    },
  };
}

/**
 * OpenClaw/session adapter.
 * Stores user/assistant turns and recalls concise context blocks for prompts.
 */
export function createOpenClawAdapter(memory: ReMEM, options: ReMEMAdapterOptions = {}) {
  return {
    name: 'openclaw',

    async rememberTurn(turn: {
      role: 'user' | 'assistant' | 'system' | string;
      content: string;
      sessionId?: string;
      messageId?: string;
      metadata?: Record<string, unknown>;
    }): Promise<void> {
      await memory.store(withDefaultTopic({
        content: `${turn.role}: ${turn.content}`,
        topics: [turn.sessionId ? `session:${turn.sessionId}` : 'session'],
        metadata: {
          ...turn.metadata,
          role: turn.role,
          sessionId: turn.sessionId,
          messageId: turn.messageId,
          source: 'openclaw.turn',
        },
      }, options.defaultTopic ?? 'openclaw'));
    },

    async recallContext(query: string, queryOptions: QueryOptions = { limit: options.defaultLimit ?? 8 }): Promise<string> {
      const response = await memory.query(query, queryOptions);
      return response.results.map((result) => `- ${result.content}`).join('\n');
    },

    async query(query: string, queryOptions?: QueryOptions): Promise<QueryResponse> {
      return memory.query(query, queryOptions);
    },
  };
}
