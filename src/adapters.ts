/**
 * ReMEM — Framework adapters
 * Lightweight, dependency-free adapters for common agent runtimes.
 */

import type { ReMEM } from './index.js';
import { namespaceQueryScopeSchema, storeMemoryInputSchema, type NamespaceInput, type NamespaceQueryScope, type QueryOptions, type QueryResponse, type StoreMemoryInput } from './types.js';

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

function normalizeNamespace(namespace: NamespaceInput): string {
  return Array.isArray(namespace) ? namespace.join('/') : namespace;
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
      return response.results.map((result) => {
        const source = typeof result.metadata?.source === 'string' ? ` (${result.metadata.source})` : '';
        return `- ${result.content}${source}`;
      }).join('\n');
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

    async put(namespace: string | string[], key: string, value: unknown, putOptions?: { visibility?: 'private' | 'shared' }): Promise<void> {
      const ns = normalizeNamespace(namespace);
      const content = typeof value === 'string' ? value : JSON.stringify(value);
      const base = withDefaultTopic({
        content,
        topics: [ns],
        metadata: { key, namespace: ns, source: 'langgraph.store' },
      }, options.defaultTopic);
      await memory.storeShared({
        ...base,
        namespace: ns,
        visibility: putOptions?.visibility ?? 'shared',
      });
    },

    async search(
      namespace: string | string[],
      query: string,
      queryOptions: QueryOptions = { limit: options.defaultLimit ?? 10 },
      scopeOptions?: NamespaceQueryScope
    ) {
      const ns = normalizeNamespace(namespace);
      const scope = namespaceQueryScopeSchema.parse(scopeOptions ?? {});
      const response = await memory.queryNamespace(ns, query, queryOptions, scope);
      return response.results.map((result) => ({
        namespace: [ns],
        key: result.id,
        value: result.content,
        createdAt: result.createdAt,
        updatedAt: result.accessedAt,
        score: result.relevanceScore,
      }));
    },

    async get(namespace: string | string[], key: string, scopeOptions?: NamespaceQueryScope) {
      const ns = normalizeNamespace(namespace);
      const scope = namespaceQueryScopeSchema.parse(scopeOptions ?? {});
      const response = await memory.queryNamespace(ns, key, { limit: 20 }, scope);
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

    async listNamespaces(scopeOptions?: NamespaceQueryScope): Promise<string[][]> {
      const scope = namespaceQueryScopeSchema.parse(scopeOptions ?? {});
      const recent = await memory.getRecent(100);
      const namespaces = new Set<string>();
      for (const entry of recent) {
        const visibility = typeof entry.metadata?.visibility === 'string' ? entry.metadata.visibility : 'private';
        if (scope.visibility !== 'all' && visibility !== scope.visibility) continue;
        const namespace = typeof entry.metadata?.namespace === 'string' ? entry.metadata.namespace : null;
        if (namespace) namespaces.add(namespace);
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

    async rememberDecision(decision: {
      content: string;
      sessionId?: string;
      topics?: string[];
      metadata?: Record<string, unknown>;
    }): Promise<void> {
      const topics = [
        ...(decision.topics ?? []),
        ...(decision.sessionId ? [`session:${decision.sessionId}`] : []),
        'decision',
      ];
      const metadata = {
        ...(decision.metadata ?? {}),
        source: 'openclaw.decision',
      };

      await memory.store({
        content: decision.content,
        topics,
        metadata,
      });

      await memory.storeInLayer({
        content: decision.content,
        topics,
        metadata,
      }, 'semantic');
    },

    async rememberProcedure(rule: {
      content: string;
      trigger: string | Record<string, unknown>;
      topics?: string[];
      metadata?: Record<string, unknown>;
    }): Promise<void> {
      await memory.storeProcedural({
        content: rule.content,
        topics: [...(rule.topics ?? []), 'procedure'],
        metadata: {
          ...(rule.metadata ?? {}),
          source: 'openclaw.procedure',
        },
      }, rule.trigger as string | Record<string, unknown>);
    },

    async recallContext(query: string, queryOptions: QueryOptions = { limit: options.defaultLimit ?? 8 }): Promise<string> {
      const response = await memory.query(query, queryOptions);
      return response.results.map((result) => {
        const source = typeof result.metadata?.source === 'string' ? ` [${result.metadata.source}]` : '';
        return `- ${result.content}${source}`;
      }).join('\n');
    },

    async recallProjectContext(query: string, optionsWithNeighbors: QueryOptions & { hops?: 1 | 2 } = { limit: options.defaultLimit ?? 8 }): Promise<string> {
      const response = await memory.queryWithNeighbors(query, {
        limit: optionsWithNeighbors.limit ?? (options.defaultLimit ?? 8),
        topics: optionsWithNeighbors.topics,
        minAccessCount: optionsWithNeighbors.minAccessCount,
        since: optionsWithNeighbors.since,
        until: optionsWithNeighbors.until,
        hops: optionsWithNeighbors.hops ?? 1,
        includeBaseResults: true,
        neighborLimit: options.defaultLimit ?? 8,
        minNeighborScore: 0.2,
        includePathDetails: false,
      });
      return response.results.map((result) => `- ${result.content}`).join('\n');
    },

    async query(query: string, queryOptions?: QueryOptions): Promise<QueryResponse> {
      return memory.query(query, queryOptions);
    },
  };
}

/**
 * Hermes harness adapter.
 * Mirrors the polished harness-facing shape from OpenClaw, but keeps the
 * surface generic to common harness concepts: turns, artifacts, decisions,
 * procedures, and scoped recall.
 */
export function createHermesAdapter(memory: ReMEM, options: ReMEMAdapterOptions = {}) {
  return {
    name: 'hermes',

    async rememberTurn(turn: {
      role: 'user' | 'assistant' | 'system' | string;
      content: string;
      threadId?: string;
      runId?: string;
      messageId?: string;
      metadata?: Record<string, unknown>;
    }): Promise<void> {
      await memory.store(withDefaultTopic({
        content: `${turn.role}: ${turn.content}`,
        topics: [
          turn.threadId ? `thread:${turn.threadId}` : 'thread',
          ...(turn.runId ? [`run:${turn.runId}`] : []),
        ],
        metadata: {
          ...turn.metadata,
          role: turn.role,
          threadId: turn.threadId,
          runId: turn.runId,
          messageId: turn.messageId,
          source: 'hermes.turn',
        },
      }, options.defaultTopic ?? 'hermes'));
    },

    async rememberArtifact(artifact: {
      kind: string;
      content: string;
      threadId?: string;
      runId?: string;
      topics?: string[];
      metadata?: Record<string, unknown>;
    }): Promise<void> {
      const topics = [
        ...(artifact.topics ?? []),
        `artifact:${artifact.kind}`,
        ...(artifact.threadId ? [`thread:${artifact.threadId}`] : []),
      ];

      await memory.store({
        content: artifact.content,
        topics,
        metadata: {
          ...(artifact.metadata ?? {}),
          kind: artifact.kind,
          threadId: artifact.threadId,
          runId: artifact.runId,
          source: 'hermes.artifact',
        },
      });
    },

    async rememberDecision(decision: {
      content: string;
      threadId?: string;
      runId?: string;
      topics?: string[];
      metadata?: Record<string, unknown>;
    }): Promise<void> {
      const topics = [
        ...(decision.topics ?? []),
        ...(decision.threadId ? [`thread:${decision.threadId}`] : []),
        'decision',
      ];

      const metadata = {
        ...(decision.metadata ?? {}),
        runId: decision.runId,
        source: 'hermes.decision',
      };

      await memory.store({ content: decision.content, topics, metadata });
      await memory.storeInLayer({ content: decision.content, topics, metadata }, 'semantic');
    },

    async rememberProcedure(rule: {
      content: string;
      trigger: string | Record<string, unknown>;
      topics?: string[];
      metadata?: Record<string, unknown>;
    }): Promise<void> {
      await memory.storeProcedural({
        content: rule.content,
        topics: [...(rule.topics ?? []), 'procedure'],
        metadata: {
          ...(rule.metadata ?? {}),
          source: 'hermes.procedure',
        },
      }, rule.trigger as string | Record<string, unknown>);
    },

    async rememberShared(input: {
      namespace: string | string[];
      content: string;
      visibility?: 'private' | 'shared';
      topics?: string[];
      metadata?: Record<string, unknown>;
    }): Promise<void> {
      await memory.storeShared({
        content: input.content,
        namespace: input.namespace,
        visibility: input.visibility ?? 'shared',
        topics: input.topics ?? [],
        metadata: {
          ...(input.metadata ?? {}),
          source: 'hermes.shared',
        },
      });
    },

    async recallContext(query: string, queryOptions: QueryOptions = { limit: options.defaultLimit ?? 8 }): Promise<string> {
      const response = await memory.query(query, queryOptions);
      return response.results.map((result) => {
        const source = typeof result.metadata?.source === 'string' ? ` [${result.metadata.source}]` : '';
        return `- ${result.content}${source}`;
      }).join('\n');
    },

    async recallShared(namespace: string | string[], query: string, queryOptions: QueryOptions = { limit: options.defaultLimit ?? 8 }, scopeOptions?: NamespaceQueryScope): Promise<string> {
      const scope = namespaceQueryScopeSchema.parse(scopeOptions ?? { visibility: 'shared' });
      const response = await memory.queryNamespace(namespace, query, queryOptions, scope);
      return response.results.map((result) => {
        const visibility = typeof result.metadata?.visibility === 'string' ? ` (${result.metadata.visibility})` : '';
        return `- ${result.content}${visibility}`;
      }).join('\n');
    },

    async query(query: string, queryOptions?: QueryOptions): Promise<QueryResponse> {
      return memory.query(query, queryOptions);
    },
  };
}
