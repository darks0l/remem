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
  nodeLabels?: string[];
  owners?: string[];
}

export interface CodebaseSubgraphOptions extends Partial<QueryWithNeighborsOptions> {
  project?: string;
  maxContextChars?: number;
  connectionTypes?: string[];
  includeConnections?: string[];
  minConnectionWeight?: number;
  resourceGrant?: KnowledgeResourceGrant;
  nodeLabels?: string[];
  owners?: string[];
}

export interface CodebaseGraphInventoryOptions {
  project?: string;
  limit?: number;
  resourceGrant?: KnowledgeResourceGrant;
  nodeLabels?: string[];
  owners?: string[];
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
  incomingWeight?: number;
  outgoingWeight?: number;
  relationTypes?: string[];
}

export interface CodebaseGraphCluster {
  id: string;
  nodeIds: string[];
  linkIds: string[];
  size: number;
  totalNodeWeight: number;
  totalLinkWeight: number;
  labels: Record<string, number>;
  owners: string[];
}

export interface CodebaseGraphBridge {
  nodes: CodebaseGraphNodeHealth[];
  links: CodebaseGraphConnection[];
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
  analysisScope: CodebaseGraphAnalysisScope;
  inventory?: {
    owners: CodebaseGraphOwnerSummary[];
    entrypoints: CodebaseGraphNodeHealth[];
    hotspots: CodebaseGraphNodeHealth[];
    deadzones: CodebaseGraphNodeHealth[];
    clusters: CodebaseGraphCluster[];
    bridges: CodebaseGraphBridge;
  };
}

export interface CodebaseGraphAnalysisScope {
  nodeSet: 'subgraph-results' | 'inventory-scope';
  linkSet: 'internal-links-between-returned-nodes';
  structureSet: 'snapshot-internal';
  pageSize: number;
  uniqueLinks: number;
  truncated: boolean;
  connectionTypes?: string[];
  minConnectionWeight?: number;
  nodeLabels?: string[];
  owners?: string[];
  resourceScoped: boolean;
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

function normalizeCodebaseStringFilters(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined;
  const normalized = Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
  return normalized.length ? normalized : undefined;
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

function matchesCodebaseFilters(
  entry: QueryResult,
  options: Pick<CodebaseGraphInventoryOptions, 'nodeLabels' | 'owners'>
): boolean {
  const allowedLabels = normalizeCodebaseStringFilters(options.nodeLabels);
  if (allowedLabels?.length) {
    const label = (getStringMetadata(entry, 'label') ?? '').toLowerCase();
    if (!allowedLabels.includes(label)) return false;
  }

  const allowedOwners = normalizeCodebaseStringFilters(options.owners);
  if (allowedOwners?.length) {
    const owner = topLevelOwner(entry).owner.toLowerCase();
    if (!allowedOwners.includes(owner)) return false;
  }

  return true;
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
  const linkedPageSize = 100;
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

  const scopedKnowledgeNodes = async (inventoryOptions: CodebaseGraphInventoryOptions): Promise<QueryResult[]> => {
    const nodes = await knowledgeNodes(inventoryOptions.project);
    return nodes
      .filter((node) => hasKnowledgeResourceAccess(node, inventoryOptions.resourceGrant))
      .filter((node) => matchesCodebaseFilters(node, inventoryOptions));
  };

  const getAllLinkedMemories = async (
    memoryId: string,
    options: { direction?: 'incoming' | 'outgoing' | 'both'; types?: string[] } = {}
  ) => {
    const items: Array<{ link: MemoryLink; memory: QueryResult | null }> = [];
    let offset = 0;
    while (true) {
      const page = await memory.getLinkedMemories(memoryId, {
        direction: options.direction ?? 'both',
        types: options.types,
        limit: linkedPageSize,
        offset,
      });
      if (page.length === 0) break;
      items.push(...page);
      if (page.length < linkedPageSize) break;
      offset += page.length;
    }
    return items;
  };

  const healthFromLinks = (node: QueryResult, rawLinks: MemoryLink[]): CodebaseGraphNodeHealth => {
    const incomingLinks = rawLinks.filter((link) => link.toId === node.id);
    const outgoingLinks = rawLinks.filter((link) => link.fromId === node.id);
    const incomingWeight = incomingLinks.reduce((sum, link) => sum + codebaseLinkWeight(link), 0);
    const outgoingWeight = outgoingLinks.reduce((sum, link) => sum + codebaseLinkWeight(link), 0);
    const relationTypes = Array.from(new Set(rawLinks.map((link) => link.type))).sort();
    return {
      node,
      incoming: incomingLinks.length,
      outgoing: outgoingLinks.length,
      incomingWeight,
      outgoingWeight,
      relationTypes,
      weight: codebaseNodeWeight(node) + (outgoingWeight * 1.25) + (incomingWeight * 0.35) + (relationTypes.length * 0.1),
      links: rawLinks,
    };
  };

  const buildScopedKnowledgeGraph = async (
    nodes: QueryResult[],
    options: {
      connectionTypes?: string[];
      minConnectionWeight?: number;
      nodeLabels?: string[];
      owners?: string[];
      resourceScoped?: boolean;
      nodeSet: CodebaseGraphAnalysisScope['nodeSet'];
    }
  ) => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const linksById = new Map<string, MemoryLink>();
    const allowedTypes = normalizeCodebaseConnectionTypes(options.connectionTypes);
    const minWeight = options.minConnectionWeight ?? 0;
    for (const node of nodes) {
      const linked = await getAllLinkedMemories(node.id, { direction: 'both', types: allowedTypes });
      for (const item of linked) {
        const link = item.link;
        if (!nodeById.has(link.fromId) || !nodeById.has(link.toId)) continue;
        if (!connectionTypeMatches(link.type, allowedTypes)) continue;
        if (codebaseLinkWeight(link) < minWeight) continue;
        linksById.set(link.id, link);
      }
    }

    const links = Array.from(linksById.values());
    const adjacency = new Map<string, Array<{ neighborId: string; link: MemoryLink }>>();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const link of links) {
      adjacency.get(link.fromId)?.push({ neighborId: link.toId, link });
      adjacency.get(link.toId)?.push({ neighborId: link.fromId, link });
    }

    return {
      nodes,
      nodeById,
      links,
      adjacency,
      analysisScope: {
        nodeSet: options.nodeSet,
        linkSet: 'internal-links-between-returned-nodes',
        structureSet: 'snapshot-internal',
        pageSize: linkedPageSize,
        uniqueLinks: links.length,
        truncated: false,
        ...(allowedTypes?.length ? { connectionTypes: allowedTypes } : {}),
        ...(typeof options.minConnectionWeight === 'number' ? { minConnectionWeight: options.minConnectionWeight } : {}),
        ...(options.nodeLabels?.length ? { nodeLabels: options.nodeLabels } : {}),
        ...(options.owners?.length ? { owners: options.owners } : {}),
        resourceScoped: Boolean(options.resourceScoped),
      } satisfies CodebaseGraphAnalysisScope,
    };
  };

  const analyzeCodebaseGraphStructure = async (graph: Awaited<ReturnType<typeof buildScopedKnowledgeGraph>>): Promise<{
    clusters: CodebaseGraphCluster[];
    bridges: CodebaseGraphBridge;
  }> => {
    const { nodes, nodeById, links, adjacency } = graph;
    const linkById = new Map(links.map((link) => [link.id, link]));
    const visited = new Set<string>();
    const clusters: CodebaseGraphCluster[] = [];
    let clusterIndex = 0;

    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      const stack = [node.id];
      const componentIds: string[] = [];
      const componentLinkIds = new Set<string>();
      visited.add(node.id);

      while (stack.length > 0) {
        const currentId = stack.pop()!;
        componentIds.push(currentId);
        for (const edge of adjacency.get(currentId) ?? []) {
          componentLinkIds.add(edge.link.id);
          if (!visited.has(edge.neighborId)) {
            visited.add(edge.neighborId);
            stack.push(edge.neighborId);
          }
        }
      }

      const labels: Record<string, number> = {};
      const owners = new Set<string>();
      for (const id of componentIds) {
        const componentNode = nodeById.get(id)!;
        const label = getStringMetadata(componentNode, 'label') ?? 'Node';
        labels[label] = (labels[label] ?? 0) + 1;
        owners.add(topLevelOwner(componentNode).owner);
      }

      clusters.push({
        id: `cluster-${++clusterIndex}`,
        nodeIds: componentIds.sort(),
        linkIds: Array.from(componentLinkIds).sort(),
        size: componentIds.length,
        totalNodeWeight: Number(componentIds.reduce((sum, id) => sum + codebaseNodeWeight(nodeById.get(id)!), 0).toFixed(3)),
        totalLinkWeight: Number(Array.from(componentLinkIds).reduce((sum, id) => sum + codebaseLinkWeight(linkById.get(id)!), 0).toFixed(3)),
        labels,
        owners: Array.from(owners).sort(),
      });
    }

    const discovery = new Map<string, number>();
    const low = new Map<string, number>();
    const parent = new Map<string, string | null>();
    const articulationIds = new Set<string>();
    const bridgeLinkIds = new Set<string>();
    let time = 0;

    const dfs = (nodeId: string) => {
      discovery.set(nodeId, ++time);
      low.set(nodeId, time);
      let childCount = 0;

      for (const edge of adjacency.get(nodeId) ?? []) {
        const neighborId = edge.neighborId;
        if (!discovery.has(neighborId)) {
          parent.set(neighborId, nodeId);
          childCount += 1;
          dfs(neighborId);
          low.set(nodeId, Math.min(low.get(nodeId)!, low.get(neighborId)!));
          if (parent.get(nodeId) == null && childCount > 1) articulationIds.add(nodeId);
          if (parent.get(nodeId) != null && low.get(neighborId)! >= discovery.get(nodeId)!) articulationIds.add(nodeId);
          if (low.get(neighborId)! > discovery.get(nodeId)!) bridgeLinkIds.add(edge.link.id);
        } else if (neighborId !== parent.get(nodeId)) {
          low.set(nodeId, Math.min(low.get(nodeId)!, discovery.get(neighborId)!));
        }
      }
    };

    for (const node of nodes) {
      if (!discovery.has(node.id)) {
        parent.set(node.id, null);
        dfs(node.id);
      }
    }

    const bridgeNodes = await Promise.all(
      Array.from(articulationIds).map(async (nodeId) => {
        const node = nodeById.get(nodeId)!;
        const rawLinks = adjacency.get(nodeId)?.map((entry) => entry.link) ?? [];
        return healthFromLinks(node, rawLinks);
      })
    );

    const bridgeLinks = links
      .filter((link) => bridgeLinkIds.has(link.id))
      .map((link) => ({
        fromId: link.fromId,
        toId: link.toId,
        type: link.type,
        weight: codebaseLinkWeight(link),
        from: nodeById.get(link.fromId),
        to: nodeById.get(link.toId),
      }))
      .sort((a, b) => b.weight - a.weight || a.type.localeCompare(b.type));

    return {
      clusters: clusters.sort((a, b) => b.totalNodeWeight - a.totalNodeWeight || b.size - a.size || a.id.localeCompare(b.id)),
      bridges: {
        nodes: bridgeNodes.sort((a, b) => b.weight - a.weight || b.outgoing - a.outgoing || b.incoming - a.incoming),
        links: bridgeLinks,
      },
    };
  };

  const summarizeOwners = (nodes: QueryResult[], limit: number): CodebaseGraphOwnerSummary[] => {
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
  };

  const summarizeEntrypoints = (
    nodes: QueryResult[],
    graph: Awaited<ReturnType<typeof buildScopedKnowledgeGraph>>,
    limit: number
  ): CodebaseGraphNodeHealth[] => {
    const candidates: CodebaseGraphNodeHealth[] = [];
    for (const node of nodes) {
      const label = (getStringMetadata(node, 'label') ?? '').toLowerCase();
      const path = getStringMetadata(node, 'path') ?? '';
      const name = getStringMetadata(node, 'name') ?? '';
      const looksLikeEntrypoint = ['project', 'route', 'command', 'entrypoint', 'api'].includes(label)
        || (label === 'file' && /\b(cli|server|index|main|app|route|command)s?\b/i.test(`${path} ${name}`));
      if (!looksLikeEntrypoint) continue;
      candidates.push(healthFromLinks(node, graph.adjacency.get(node.id)?.map((entry) => entry.link) ?? []));
    }
    return candidates
      .sort((a, b) => b.weight - a.weight || b.outgoing - a.outgoing || a.incoming - b.incoming)
      .slice(0, limit);
  };

  const summarizeHotspots = (
    nodes: QueryResult[],
    graph: Awaited<ReturnType<typeof buildScopedKnowledgeGraph>>,
    limit: number
  ): CodebaseGraphNodeHealth[] => {
    const scored = nodes.map((node) => healthFromLinks(node, graph.adjacency.get(node.id)?.map((entry) => entry.link) ?? []));
    return scored
      .filter((entry) => entry.incoming > 0 || entry.outgoing > 0)
      .sort((a, b) => b.weight - a.weight || b.outgoing - a.outgoing || b.incoming - a.incoming)
      .slice(0, limit);
  };

  const summarizeDeadzones = (
    nodes: QueryResult[],
    graph: Awaited<ReturnType<typeof buildScopedKnowledgeGraph>>,
    limit: number
  ): CodebaseGraphNodeHealth[] => {
    const dead: CodebaseGraphNodeHealth[] = [];
    for (const node of nodes) {
      const label = (getStringMetadata(node, 'label') ?? '').toLowerCase();
      if (!['file', 'function', 'class', 'constant', 'symbol', 'package'].includes(label)) continue;
      const health = healthFromLinks(node, graph.adjacency.get(node.id)?.map((entry) => entry.link) ?? []);
      if (health.incoming === 0 && health.outgoing === 0) {
        dead.push({
          ...health,
          weight: codebaseNodeWeight(node),
        });
      }
    }
    return dead.sort((a, b) => b.weight - a.weight).slice(0, limit);
  };

  const buildInventorySummary = async (
    nodes: QueryResult[],
    options: {
      limit: number;
      connectionTypes?: string[];
      minConnectionWeight?: number;
      nodeLabels?: string[];
      owners?: string[];
      resourceScoped?: boolean;
      nodeSet: CodebaseGraphAnalysisScope['nodeSet'];
    }
  ) => {
    const graph = await buildScopedKnowledgeGraph(nodes, options);
    return {
      analysisScope: graph.analysisScope,
      owners: summarizeOwners(nodes, options.limit),
      entrypoints: summarizeEntrypoints(nodes, graph, options.limit),
      hotspots: summarizeHotspots(nodes, graph, options.limit),
      deadzones: summarizeDeadzones(nodes, graph, options.limit),
      ...(await analyzeCodebaseGraphStructure(graph)),
    };
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
      const linked = await getAllLinkedMemories(node.id, { direction: 'both', types: allowedTypes });
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
      const { project, metadata, nodeLabels, owners, ...rest } = queryOptions;
      const response = await memory.query(query, {
        ...rest,
        metadata: {
          ...(metadata ?? {}),
          source: 'remem.knowledge.node',
          ...(project ? { project } : {}),
        },
      });
      const results = response.results.filter((entry) => matchesCodebaseFilters(entry, { nodeLabels, owners }));
      return {
        ...response,
        results,
        totalAvailable: results.length,
      };
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
      const filteredResults = results.filter((entry) => matchesCodebaseFilters(entry, queryOptions));
      const allowedIds = new Set(filteredResults.map((entry) => entry.id));
      const paths = (response.paths ?? [])
        .filter((path) => connectionTypeMatches(path.type, selectedConnectionTypes))
        .filter((path) => allowedIds.has(path.fromId) && allowedIds.has(path.toId) && allowedIds.has(path.throughId))
        .filter((path) => (queryOptions.minConnectionWeight ?? 0) <= path.score);
      return {
        query,
        project: queryOptions.project,
        results: filteredResults,
        paths,
        linksTraversed: paths.length,
        context: formatCodebaseContext(filteredResults, queryOptions.maxContextChars ?? 6_000),
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
      const inventorySummary = await buildInventorySummary(nodes, {
        limit: queryOptions.limit ?? defaultLimit,
        connectionTypes: selectedConnectionTypes,
        minConnectionWeight: queryOptions.minConnectionWeight,
        nodeLabels: queryOptions.nodeLabels,
        owners: queryOptions.owners,
        resourceScoped: Boolean(queryOptions.resourceGrant),
        nodeSet: 'subgraph-results',
      });
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
        analysisScope: inventorySummary.analysisScope,
        ...(displayType === 'inventory'
          ? {
              inventory: (({ analysisScope, ...inventory }) => inventory)(inventorySummary),
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
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      const graph = await buildScopedKnowledgeGraph(nodes, {
        nodeLabels: inventoryOptions.nodeLabels,
        owners: inventoryOptions.owners,
        resourceScoped: Boolean(inventoryOptions.resourceGrant),
        nodeSet: 'inventory-scope',
      });
      return summarizeEntrypoints(nodes, graph, limit);
    },

    async owners(projectOrOptions?: string | CodebaseGraphInventoryOptions): Promise<CodebaseGraphOwnerSummary[]> {
      const inventoryOptions = typeof projectOrOptions === 'string' ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      return summarizeOwners(nodes, limit);
    },

    async hotspots(projectOrOptions?: string | CodebaseGraphInventoryOptions): Promise<CodebaseGraphNodeHealth[]> {
      const inventoryOptions = typeof projectOrOptions === 'string' ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      const graph = await buildScopedKnowledgeGraph(nodes, {
        nodeLabels: inventoryOptions.nodeLabels,
        owners: inventoryOptions.owners,
        resourceScoped: Boolean(inventoryOptions.resourceGrant),
        nodeSet: 'inventory-scope',
      });
      return summarizeHotspots(nodes, graph, limit);
    },

    async deadzones(projectOrOptions?: string | CodebaseGraphInventoryOptions): Promise<CodebaseGraphNodeHealth[]> {
      const inventoryOptions = typeof projectOrOptions === 'string' ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      const graph = await buildScopedKnowledgeGraph(nodes, {
        nodeLabels: inventoryOptions.nodeLabels,
        owners: inventoryOptions.owners,
        resourceScoped: Boolean(inventoryOptions.resourceGrant),
        nodeSet: 'inventory-scope',
      });
      return summarizeDeadzones(nodes, graph, limit);
    },

    async overview(projectOrOptions?: string | CodebaseGraphInventoryOptions) {
      const inventoryOptions = typeof projectOrOptions === 'string' ? { project: projectOrOptions } : projectOrOptions ?? {};
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      const counts: Record<string, number> = {};
      for (const node of nodes) {
        const label = getStringMetadata(node, 'label') ?? 'Node';
        counts[label] = (counts[label] ?? 0) + 1;
      }
      const inventory = await buildInventorySummary(nodes, {
        limit: inventoryOptions.limit ?? 10,
        nodeLabels: inventoryOptions.nodeLabels,
        owners: inventoryOptions.owners,
        resourceScoped: Boolean(inventoryOptions.resourceGrant),
        nodeSet: 'inventory-scope',
      });
      return {
        project: inventoryOptions.project,
        nodes: nodes.length,
        labels: counts,
        analysisScope: inventory.analysisScope,
        owners: inventory.owners,
        entrypoints: inventory.entrypoints,
        hotspots: inventory.hotspots,
        deadzones: inventory.deadzones,
        clusters: inventory.clusters,
        bridges: inventory.bridges,
      };
    },

    async context(query: string, queryOptions: CodebaseGraphQueryOptions = { limit: defaultLimit }) {
      const response = await this.searchGraph(query, queryOptions);
      return formatCodebaseContext(response.results);
    },
  };
}
