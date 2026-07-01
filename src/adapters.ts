/**
 * ReMEM — Framework adapters
 * Lightweight, dependency-free adapters for common agent runtimes.
 */

import type { ReMEM } from './index.js';
import {
  knowledgeArtifactRegistrationSchema,
  knowledgeGraphArtifactSchema,
  namespaceQueryScopeSchema,
  storeMemoryInputSchema,
  authorizeKnowledgeResourceAccess,
  type KnowledgeArtifactRegistration,
  type KnowledgeGraphArtifact,
  type KnowledgeResourceGrant,
  type MemoryLink,
  type NamespaceInput,
  type NamespaceQueryScope,
  type NeighborPath,
  type QueryOptions,
  type QueryResponse,
  type QueryResult,
  type QueryWithNeighborsOptions,
  type StoreMemoryInput,
} from './types.js';

export interface ReMEMAdapterOptions {
  /** Default topic attached to memories stored through the adapter. */
  defaultTopic?: string;
  /** Default query limit when the caller does not provide one. */
  defaultLimit?: number;
}

export interface CodebaseGraphQueryOptions extends QueryOptions {
  project?: string;
}

export interface CodebaseSubgraphOptions extends Partial<QueryWithNeighborsOptions> {
  project?: string;
  maxContextChars?: number;
  connectionTypes?: string[];
  includeConnections?: string[];
  minConnectionWeight?: number;
  resourceGrant?: KnowledgeResourceGrant;
}

export interface CodebaseGraphInventoryOptions {
  project?: string;
  limit?: number;
}

export interface CodebaseGraphOwnerSummary {
  owner: string;
  type: 'directory' | 'package' | 'project';
  nodes: number;
  files: number;
  symbols: number;
  packages: number;
  averageWeight: number;
  paths: string[];
}

export interface CodebaseGraphNodeHealth {
  node: QueryResult;
  incoming: number;
  outgoing: number;
  weight: number;
  links: MemoryLink[];
}

export interface CodebaseGraphSubgraph {
  query: string;
  project?: string;
  results: QueryResult[];
  paths: NeighborPath[];
  linksTraversed: number;
  context: string;
}

export type CodebaseGraphDisplayType = 'memory' | 'graph' | 'context' | 'inventory';

export interface CodebaseGraphAsMemoryOptions extends CodebaseSubgraphOptions {
  displayType?: CodebaseGraphDisplayType;
  snapshotName?: string;
  nodeLabels?: string[];
}

export interface CodebaseGraphConnection {
  fromId: string;
  toId: string;
  type: string;
  weight: number;
  from?: QueryResult;
  to?: QueryResult;
}

export interface CodebaseGraphMemorySnapshot {
  name: 'Codebase Graph as memory';
  displayType: CodebaseGraphDisplayType;
  query: string;
  project?: string;
  summary: string;
  nodes: QueryResult[];
  connections: CodebaseGraphConnection[];
  paths: NeighborPath[];
  linksTraversed: number;
  context: string;
  inventory?: {
    owners: CodebaseGraphOwnerSummary[];
    entrypoints: CodebaseGraphNodeHealth[];
    deadzones: CodebaseGraphNodeHealth[];
  };
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

function getStringMetadata(entry: QueryResult, key: string): string | undefined {
  const value = entry.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function getNumberMetadata(entry: QueryResult, key: string): number | undefined {
  const value = entry.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getStringArrayMetadata(entry: QueryResult, key: string): string[] | undefined {
  const value = entry.metadata?.[key];
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === 'string');
  return strings.length ? strings : undefined;
}

function isKnowledgeNode(entry: QueryResult, project?: string): boolean {
  if (entry.metadata?.source !== 'remem.knowledge.node') return false;
  return !project || entry.metadata?.project === project;
}

function hasKnowledgeResourceAccess(entry: QueryResult, grant?: KnowledgeResourceGrant): boolean {
  if (!grant) return true;
  return authorizeKnowledgeResourceAccess({
    resourceUri: getStringMetadata(entry, 'resourceUri'),
    source: getStringMetadata(entry, 'knowledgeSource'),
    project: getStringMetadata(entry, 'project'),
    requiredScopes: getStringArrayMetadata(entry, 'requiredScopes'),
  }, grant).allowed;
}

function codebaseNodeWeight(entry: QueryResult): number {
  return getNumberMetadata(entry, 'graphWeight') ?? getNumberMetadata(entry, 'nodeWeight') ?? 1;
}

function codebaseLinkWeight(link: MemoryLink): number {
  const metadata = link.metadata ?? {};
  const value = metadata.graphWeight ?? metadata.weight ?? metadata.strength;
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
}

function normalizeCodebaseConnectionTypes(types?: string[]): string[] | undefined {
  if (!types?.length) return undefined;
  return Array.from(new Set(types
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean)
    .map((type) => type.startsWith('knowledge:') ? type : `knowledge:${type}`)));
}

function connectionTypeMatches(type: string, allowed?: string[]): boolean {
  if (!allowed?.length) return true;
  return allowed.includes(type.toLowerCase());
}

function topLevelOwner(entry: QueryResult): { owner: string; type: CodebaseGraphOwnerSummary['type'] } {
  const label = getStringMetadata(entry, 'label')?.toLowerCase();
  const path = getStringMetadata(entry, 'path') ?? getStringMetadata(entry, 'name') ?? '';
  if (label === 'package') return { owner: path || 'external', type: 'package' };
  if (label === 'project') return { owner: getStringMetadata(entry, 'name') ?? 'project', type: 'project' };
  const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '');
  const first = normalized.split('/').filter(Boolean)[0];
  return { owner: first || '.', type: 'directory' };
}

function formatCodebaseContext(results: QueryResult[], maxChars = 6_000): string {
  const lines: string[] = [];
  for (const result of results) {
    const label = getStringMetadata(result, 'label') ?? 'Node';
    const name = getStringMetadata(result, 'name') ?? getStringMetadata(result, 'externalId') ?? result.id;
    const path = getStringMetadata(result, 'path');
    const project = getStringMetadata(result, 'project');
    const header = `${label}: ${name}${path ? ` (${path})` : ''}${project ? ` [${project}]` : ''}`;
    lines.push(`- ${header}`);
    const summary = result.content.split('\n').filter((line) => !line.startsWith(`${label}:`)).join(' ').trim();
    if (summary) lines.push(`  ${summary}`);
    if (lines.join('\n').length >= maxChars) break;
  }
  const content = lines.join('\n');
  return content.length > maxChars ? `${content.slice(0, Math.max(0, maxChars - 14)).trimEnd()}\n...truncated` : content;
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

/**
 * Codebase knowledge adapter.
 *
 * This does not try to reimplement a parser or tree-sitter pipeline. It gives
 * code graph tools a stable way to feed ReMEM with architecture nodes, routes,
 * call/import edges, ADRs, and compressed graph artifact pointers.
 */
export function createCodebaseMemoryAdapter(memory: ReMEM, options: ReMEMAdapterOptions = {}) {
  const defaultLimit = options.defaultLimit ?? 10;
  const codebaseLinkTypeWeights = {
    'knowledge:http_calls': 1.35,
    'knowledge:calls': 1.25,
    'knowledge:uses': 1.15,
    'knowledge:imports': 1.05,
    'knowledge:depends_on': 1.05,
    'knowledge:defines': 0.95,
    'knowledge:contains': 0.7,
  };

  const knowledgeNodes = async (project?: string): Promise<QueryResult[]> => {
    const entries = await memory.getStore().getAllEntries();
    return entries.filter((entry) => isKnowledgeNode(entry, project));
  };

  const collectConnections = async (
    nodes: QueryResult[],
    options: {
      connectionTypes?: string[];
      minConnectionWeight?: number;
      includeExternal?: boolean;
    } = {}
  ): Promise<CodebaseGraphConnection[]> => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const allowedTypes = normalizeCodebaseConnectionTypes(options.connectionTypes);
    const minWeight = options.minConnectionWeight ?? 0;
    const connections = new Map<string, CodebaseGraphConnection>();

    for (const node of nodes) {
      const linked = await memory.getLinkedMemories(node.id, { direction: 'both', limit: 100 });
      for (const item of linked) {
        const link = item.link;
        const type = link.type.toLowerCase();
        const weight = codebaseLinkWeight(link);
        if (!connectionTypeMatches(type, allowedTypes)) continue;
        if (weight < minWeight) continue;
        const from = byId.get(link.fromId);
        const to = byId.get(link.toId);
        if (!options.includeExternal && (!from || !to)) continue;
        connections.set(link.id, {
          fromId: link.fromId,
          toId: link.toId,
          type: link.type,
          weight,
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        });
      }
    }

    return Array.from(connections.values())
      .sort((a, b) => b.weight - a.weight || a.type.localeCompare(b.type));
  };

  return {
    name: 'Codebase Graph as memory',
    key: 'codebase-memory',

    async registerArtifact(input: KnowledgeArtifactRegistration) {
      const artifact = knowledgeArtifactRegistrationSchema.parse(input);
      return memory.registerKnowledgeArtifact(artifact);
    },

    async ingestGraph(graph: KnowledgeGraphArtifact, ingestOptions?: Parameters<ReMEM['ingestKnowledgeGraph']>[1]) {
      const parsed = knowledgeGraphArtifactSchema.parse(graph);
      return memory.ingestKnowledgeGraph(parsed, ingestOptions);
    },

    async searchGraph(query: string, queryOptions: CodebaseGraphQueryOptions = { limit: defaultLimit }) {
      const { project, metadata, ...rest } = queryOptions;
      return memory.query(query, {
        ...rest,
        metadata: {
          ...(metadata ?? {}),
          source: 'remem.knowledge.node',
          ...(project ? { project } : {}),
        },
      });
    },

    async architecture(project?: string, limit = defaultLimit) {
      return memory.query('architecture routes packages entry points hotspots boundaries clusters', {
        limit,
        metadata: {
          source: 'remem.knowledge.node',
          ...(project ? { project } : {}),
        },
      });
    },

    async impact(subject: string, optionsOrLimit: number | (Partial<QueryWithNeighborsOptions> & { project?: string }) = defaultLimit) {
      const queryOptions = typeof optionsOrLimit === 'number'
        ? { limit: optionsOrLimit, neighborLimit: optionsOrLimit }
        : optionsOrLimit;
      const limit = queryOptions.limit ?? defaultLimit;
      const { project, metadata, ...rest } = queryOptions;

      return memory.queryWithNeighbors(subject, {
        ...rest,
        limit,
        linkTypeWeights: {
          ...codebaseLinkTypeWeights,
          ...(rest.linkTypeWeights ?? {}),
        },
        metadata: {
          ...(metadata ?? {}),
          source: 'remem.knowledge.node',
          ...(project ? { project } : {}),
        },
        hops: 2,
        includeBaseResults: true,
        includePathDetails: true,
        neighborLimit: queryOptions.neighborLimit ?? limit,
        minNeighborScore: queryOptions.minNeighborScore ?? 0.08,
      });
    },

    async subgraph(query: string, queryOptions: CodebaseSubgraphOptions = {}) {
      const selectedConnectionTypes = normalizeCodebaseConnectionTypes([
        ...(queryOptions.connectionTypes ?? []),
        ...(queryOptions.includeConnections ?? []),
      ]);
      const response = await this.impact(query, {
        ...queryOptions,
        ...(selectedConnectionTypes ? { linkTypes: selectedConnectionTypes } : {}),
        limit: queryOptions.limit ?? defaultLimit,
        neighborLimit: queryOptions.neighborLimit ?? (queryOptions.limit ?? defaultLimit),
        includePathDetails: true,
      });
      const results = response.results.filter((entry) => hasKnowledgeResourceAccess(entry, queryOptions.resourceGrant));
      const allowedIds = new Set(results.map((entry) => entry.id));
      const paths = (response.paths ?? [])
        .filter((path) => connectionTypeMatches(path.type, selectedConnectionTypes))
        .filter((path) => allowedIds.has(path.fromId) && allowedIds.has(path.toId) && allowedIds.has(path.throughId))
        .filter((path) => (queryOptions.minConnectionWeight ?? 0) <= path.score);
      return {
        query,
        project: queryOptions.project,
        results,
        paths,
        linksTraversed: paths.length,
        context: formatCodebaseContext(results, queryOptions.maxContextChars ?? 6_000),
      };
    },

    async asMemory(query: string, queryOptions: CodebaseGraphAsMemoryOptions = {}): Promise<CodebaseGraphMemorySnapshot> {
      const displayType = queryOptions.displayType ?? 'memory';
      const selectedConnectionTypes = normalizeCodebaseConnectionTypes([
        ...(queryOptions.connectionTypes ?? []),
        ...(queryOptions.includeConnections ?? []),
      ]);
      const subgraph = await this.subgraph(query, {
        ...queryOptions,
        connectionTypes: selectedConnectionTypes,
        limit: queryOptions.limit ?? defaultLimit,
        neighborLimit: queryOptions.neighborLimit ?? (queryOptions.limit ?? defaultLimit),
      });
      const allowedLabels = queryOptions.nodeLabels?.map((label) => label.toLowerCase());
      const nodes = allowedLabels?.length
        ? subgraph.results.filter((node) => allowedLabels.includes((getStringMetadata(node, 'label') ?? '').toLowerCase()))
        : subgraph.results;
      const connections = await collectConnections(nodes, {
        connectionTypes: selectedConnectionTypes,
        minConnectionWeight: queryOptions.minConnectionWeight,
      });
      const relationTypes = Array.from(new Set(connections.map((connection) => connection.type))).sort();
      const project = queryOptions.project;
      const summary = `${queryOptions.snapshotName ?? 'Codebase Graph as memory'} captured ${nodes.length} nodes and ${connections.length} selected connections${project ? ` for ${project}` : ''}${relationTypes.length ? ` (${relationTypes.join(', ')})` : ''}.`;

      return {
        name: 'Codebase Graph as memory',
        displayType,
        query,
        project,
        summary,
        nodes,
        connections,
        paths: subgraph.paths,
        linksTraversed: subgraph.linksTraversed,
        context: displayType === 'graph'
          ? formatCodebaseContext(nodes, queryOptions.maxContextChars ?? 4_000)
          : subgraph.context,
        ...(displayType === 'inventory'
          ? {
              inventory: {
                owners: await this.owners({ project, limit: 10 }),
                entrypoints: await this.entrypoints({ project, limit: 10 }),
                deadzones: await this.deadzones({ project, limit: 10 }),
              },
            }
          : {}),
      };
    },

    async graphAsMemory(query: string, queryOptions: CodebaseGraphAsMemoryOptions = {}) {
      return this.asMemory(query, queryOptions);
    },

    async explain(query: string, queryOptions: CodebaseSubgraphOptions = {}) {
      const graph = await this.subgraph(query, queryOptions);
      const focus = graph.results[0];
      const label = focus ? getStringMetadata(focus, 'label') ?? 'Node' : 'Node';
      const name = focus ? getStringMetadata(focus, 'name') ?? getStringMetadata(focus, 'externalId') ?? focus.id : query;
      const relationTypes = Array.from(new Set(graph.paths.map((path) => path.type))).sort();
      const summary = graph.results.length === 0
        ? `No codebase graph nodes matched ${query}.`
        : `${label} ${name} connects to ${Math.max(0, graph.results.length - 1)} graph nodes through ${graph.linksTraversed} traversed links${relationTypes.length ? ` (${relationTypes.join(', ')})` : ''}.`;
      return {
        ...graph,
        summary,
      };
    },

    async entrypoints(projectOrOptions?: string | CodebaseGraphInventoryOptions) {
      const inventoryOptions = typeof projectOrOptions === 'string' ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await knowledgeNodes(inventoryOptions.project);
      const candidates: CodebaseGraphNodeHealth[] = [];
      for (const node of nodes) {
        const label = (getStringMetadata(node, 'label') ?? '').toLowerCase();
        const path = getStringMetadata(node, 'path') ?? '';
        const name = getStringMetadata(node, 'name') ?? '';
        const looksLikeEntrypoint = ['project', 'route', 'command', 'entrypoint', 'api'].includes(label)
          || (label === 'file' && /\b(cli|server|index|main|app|route|command)s?\b/i.test(`${path} ${name}`));
        if (!looksLikeEntrypoint) continue;
        const links = await memory.getLinkedMemories(node.id, { direction: 'both', limit: 100 });
        const rawLinks = links.map((item) => item.link);
        const incoming = rawLinks.filter((link) => link.toId === node.id);
        const outgoing = rawLinks.filter((link) => link.fromId === node.id);
        candidates.push({
          node,
          incoming: incoming.length,
          outgoing: outgoing.length,
          weight: codebaseNodeWeight(node)
            + outgoing.reduce((sum, link) => sum + codebaseLinkWeight(link), 0)
            + incoming.reduce((sum, link) => sum + codebaseLinkWeight(link) * 0.15, 0),
          links: rawLinks,
        });
      }
      return candidates
        .sort((a, b) => b.weight - a.weight || b.outgoing - a.outgoing || a.incoming - b.incoming)
        .slice(0, limit);
    },

    async owners(projectOrOptions?: string | CodebaseGraphInventoryOptions): Promise<CodebaseGraphOwnerSummary[]> {
      const inventoryOptions = typeof projectOrOptions === 'string' ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await knowledgeNodes(inventoryOptions.project);
      const owners = new Map<string, CodebaseGraphOwnerSummary>();
      for (const node of nodes) {
        const { owner, type } = topLevelOwner(node);
        const key = `${type}:${owner}`;
        const summary = owners.get(key) ?? { owner, type, nodes: 0, files: 0, symbols: 0, packages: 0, averageWeight: 0, paths: [] };
        const label = (getStringMetadata(node, 'label') ?? '').toLowerCase();
        const path = getStringMetadata(node, 'path');
        const previousTotal = summary.averageWeight * summary.nodes;
        summary.nodes += 1;
        summary.averageWeight = (previousTotal + codebaseNodeWeight(node)) / summary.nodes;
        if (label === 'file') summary.files += 1;
        if (['function', 'class', 'constant', 'symbol'].includes(label)) summary.symbols += 1;
        if (label === 'package') summary.packages += 1;
        if (path && !summary.paths.includes(path)) summary.paths.push(path);
        owners.set(key, summary);
      }
      return Array.from(owners.values())
        .sort((a, b) => (b.nodes * b.averageWeight) - (a.nodes * a.averageWeight) || a.owner.localeCompare(b.owner))
        .slice(0, limit)
        .map((owner) => ({ ...owner, averageWeight: Number(owner.averageWeight.toFixed(3)), paths: owner.paths.slice(0, 10) }));
    },

    async deadzones(projectOrOptions?: string | CodebaseGraphInventoryOptions): Promise<CodebaseGraphNodeHealth[]> {
      const inventoryOptions = typeof projectOrOptions === 'string' ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await knowledgeNodes(inventoryOptions.project);
      const dead: CodebaseGraphNodeHealth[] = [];
      for (const node of nodes) {
        const label = (getStringMetadata(node, 'label') ?? '').toLowerCase();
        if (!['file', 'function', 'class', 'constant', 'symbol', 'package'].includes(label)) continue;
        const links = await memory.getLinkedMemories(node.id, { direction: 'both', limit: 100 });
        const rawLinks = links.map((item) => item.link);
        const incoming = rawLinks.filter((link) => link.toId === node.id).length;
        const outgoing = rawLinks.filter((link) => link.fromId === node.id).length;
        if (incoming === 0 && outgoing === 0) {
          dead.push({ node, incoming, outgoing, weight: codebaseNodeWeight(node), links: rawLinks });
        }
      }
      return dead.sort((a, b) => b.weight - a.weight).slice(0, limit);
    },

    async overview(project?: string) {
      const nodes = await knowledgeNodes(project);
      const counts: Record<string, number> = {};
      for (const node of nodes) {
        const label = getStringMetadata(node, 'label') ?? 'Node';
        counts[label] = (counts[label] ?? 0) + 1;
      }
      return {
        project,
        nodes: nodes.length,
        labels: counts,
        owners: await this.owners({ project, limit: 10 }),
        entrypoints: await this.entrypoints({ project, limit: 10 }),
        deadzones: await this.deadzones({ project, limit: 10 }),
      };
    },

    async context(query: string, queryOptions: CodebaseGraphQueryOptions = { limit: defaultLimit }) {
      const response = await this.searchGraph(query, queryOptions);
      return formatCodebaseContext(response.results);
    },
  };
}
