/**
 * ReMEM — Main Entry Point
 * Recursive Memory for AI Agents
 */

import { MemoryStore } from './store.js';
import { PostgresMemoryStore, type PostgresStoreConfig } from './postgres-store.js';
import type { MemoryStoreLike, StorageMaintenanceOptions, StorageMaintenanceResult } from './storage-types.js';
import { ModelAbstraction } from './model.js';
import { QueryEngine } from './query.js';
import {
  createIdentitySystem,
  type IdentitySystem,
} from './identity.js';
import { LayerManager, DEFAULT_LAYER_CONFIG, type LayerConfig } from './layers.js';
import {
  duplicate,
  infectFromServer,
  buildIdentityPackage,
  downloadPackage,
} from './duplicate.js';
import { EmbeddingService, type EmbeddingConfig as EmbedServiceConfig } from './embeddings.js';
import { MemoryREPL } from './repl.js';
import { MemoryConsolidator, type ConsolidationWorkflowOptions, type ConsolidationWorkflowResult } from './consolidate.js';
import { resolveSmartRecallProfile } from './recall-profiles.js';
import {
  createCodebaseMemoryAdapter,
  type CodebaseGraphInventoryOptions,
  type CodebaseGraphSubgraph,
  type CodebaseSubgraphOptions,
} from './adapters.js';
import {
  linkedMemoryQueryOptionsSchema,
  knowledgeArtifactRegistrationSchema,
  knowledgeGraphArtifactSchema,
  knowledgeIngestOptionsSchema,
  queryWithNeighborsOptionsSchema,
  rememConfigSchema,
  rememberInputSchema,
  rememberBatchInputSchema,
  rememberBatchOptionsSchema,
  smartRecallOptionsSchema,
  dreamOptionsSchema,
  contextPackOptionsSchema,
  memoryHealthOptionsSchema,
  type LinkedMemoryQueryOptions,
  type ContextPackOptions,
  type ContextPackResponse,
  type ContextPackSection,
  type DreamMemoryLayer,
  type DreamOptions,
  type DreamResponse,
  type MemoryLink,
  type MemoryHealthCheck,
  type MemoryHealthOptions,
  type MemoryHealthRecommendation,
  type MemoryHealthResponse,
  type LayeredMemoryEntry,
  type MemoryEntry,
  type KnowledgeArtifactRegistration,
  type KnowledgeArtifactRegistrationResult,
  type KnowledgeGraphArtifact,
  type KnowledgeEdge,
  type KnowledgeIngestOptions,
  type KnowledgeIngestResult,
  type KnowledgeNode,
  type KnowledgeResourceGrant,
  type NeighborPath,
  type ProceduralMatch,
  type ProceduralTrigger,
  type QueryWithNeighborsOptions,
  type RememberInput,
  type RememberBatchOptions,
  type RememberBatchResult,
  type RememberKind,
  type RememberResult,
  type ReMEMConfig,
  type SmartRecallOptions,
  type SmartRecallProfile,
  type SmartRecallProfileDefaults,
  type SmartRecallProfileDescriptor,
  type SmartRecallResult,
  type SmartRecallResponse,
  type StoreMemoryInput,
  type QueryOptions,
  type QueryResponse,
  type QueryResult,
  type ConstitutionStatement,
  type DriftResult,
  type MemoryLayer,
  type NamespaceInput,
  type NamespaceQueryScope,
  type DuplicateResult,
  type InfectionResult,
  namespaceInputSchema,
  namespaceQueryScopeSchema,
  storeMemoryInputSchema,
} from './types.js';

export interface MemoryGraphOptions extends Omit<QueryOptions, 'limit'> {
  query?: string;
  limit?: number;
  includeIsolated?: boolean;
  maxLinks?: number;
}

export interface MemoryGraphNode {
  id: string;
  label: string;
  content: string;
  topics: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
  weight: number;
}

export interface MemoryGraphLink {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  weight: number;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface MemoryGraphTopicCluster {
  topic: string;
  count: number;
  nodeIds: string[];
}

export interface MemoryGraphStructureCluster {
  id: string;
  nodeIds: string[];
  linkIds: string[];
  size: number;
  totalNodeWeight: number;
  totalLinkWeight: number;
  topTopics: Array<{ topic: string; count: number }>;
}

export interface MemoryGraphBridgeNode {
  nodeId: string;
  label: string;
  degree: number;
  topics: string[];
  bridgeLinkIds: string[];
}

export interface MemoryGraphBridgeLink {
  linkId: string;
  fromId: string;
  toId: string;
  type: string;
  weight: number;
}

export interface MemoryGraphCytoscapeNode {
  group: 'nodes';
  data: {
    id: string;
    label: string;
    content: string;
    topics: string[];
    weight: number;
    metadata: Record<string, unknown>;
    createdAt: number;
    accessedAt: number;
    accessCount: number;
  };
}

export interface MemoryGraphCytoscapeEdge {
  group: 'edges';
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    type: string;
    weight: number;
    metadata: Record<string, unknown>;
    createdAt: number;
  };
}

export interface MemoryGraphCytoscapeExport {
  elements: Array<MemoryGraphCytoscapeNode | MemoryGraphCytoscapeEdge>;
}

export interface MemoryGraphAnalysisScope {
  nodeSet: 'query-results';
  linkSet: 'internal-links-between-returned-nodes';
  structureSet: 'snapshot-internal';
  querySource: 'filtered-query';
  pageSize: number;
  uniqueLinks: number;
  truncated: boolean;
  includeIsolated: boolean;
  maxLinks: number;
}

export interface MemoryGraphSnapshot {
  name: 'ReMEM Memory Graph';
  query?: string;
  nodes: MemoryGraphNode[];
  links: MemoryGraphLink[];
  topics: MemoryGraphTopicCluster[];
  clusters: MemoryGraphStructureCluster[];
  bridges: {
    nodes: MemoryGraphBridgeNode[];
    links: MemoryGraphBridgeLink[];
  };
  dot: string;
  cytoscape: MemoryGraphCytoscapeExport;
  analysisScope: MemoryGraphAnalysisScope;
  generatedAt: number;
}

const SMART_RECALL_PROFILE_CATALOG = {
  fast: {
    label: 'Fast',
    overview: 'Fast-pass recall for immediate answer shaping.',
    recommendedFor: [
      'short interactive replies',
      'quick preference lookups',
      'low-latency triage',
    ],
    defaultOptions: { profile: 'fast', hops: 1, includeRecent: false, includeProcedural: true, limit: 8 },
    contextPackTitles: {
      recall: 'Highest-signal memories',
      graph: 'Linked context',
      procedural: 'Guardrails',
      recent: 'Recent context',
      actions: 'Suggested next moves',
    },
  },
  deep: {
    label: 'Deep',
    overview: 'Broader recall across semantic, graph, procedural, and recent lanes.',
    recommendedFor: [
      'general long-context synthesis',
      'higher-signal handoffs',
      'broader project recall',
    ],
    defaultOptions: { profile: 'deep', hops: 2, includeRecent: true, includeProcedural: true, limit: 12, recentLimit: 6 },
    contextPackTitles: {
      recall: 'High-signal memories',
      graph: 'Linked graph context',
      procedural: 'Procedural guidance',
      recent: 'Recent context',
      actions: 'Suggested next moves',
    },
  },
  'agent-safe': {
    label: 'Agent Safe',
    overview: 'Prompt-safe recall tuned for bounded handoffs and minimal noise.',
    recommendedFor: [
      'compact worker handoffs',
      'default bounded prompts',
      'shared agent contexts',
    ],
    defaultOptions: { profile: 'agent-safe', hops: 1, includeRecent: true, includeProcedural: true, limit: 8, minNeighborScore: 0.3 },
    contextPackTitles: {
      recall: 'Prompt-safe memories',
      graph: 'Relevant linked context',
      procedural: 'Operating rules',
      recent: 'Recent context',
      actions: 'Suggested next moves',
    },
  },
  'ops-debug': {
    label: 'Ops Debug',
    overview: 'Ops-heavy recall with extra recent and procedural weight for debugging and recovery work.',
    recommendedFor: [
      'production debugging',
      'incident investigation',
      'runbook-heavy workflows',
    ],
    defaultOptions: { profile: 'ops-debug', hops: 2, includeRecent: true, includeProcedural: true, limit: 15, recentLimit: 10, proceduralLimit: 10 },
    contextPackTitles: {
      recall: 'Operational memory',
      graph: 'Linked investigation context',
      procedural: 'Runbooks and guardrails',
      recent: 'Recent operational context',
      actions: 'Suggested next moves',
    },
  },
  'coding-agent': {
    label: 'Coding Agent',
    overview: 'Coding-focused recall tuned for implementation context, linked architecture, and procedural release rules.',
    recommendedFor: [
      'implementation work',
      'release prep',
      'codebase-aware handoffs',
    ],
    defaultOptions: {
      profile: 'coding-agent',
      hops: 2,
      includeRecent: true,
      includeProcedural: true,
      limit: 10,
      recentLimit: 6,
      proceduralLimit: 8,
      minNeighborScore: 0.24,
      neighborLimit: 30,
    },
    contextPackTitles: {
      recall: 'Implementation-critical memories',
      graph: 'Architecture and linked code context',
      procedural: 'Coding and release guardrails',
      recent: 'Recent project context',
      actions: 'Suggested implementation moves',
    },
  },
  'ops-handoff': {
    label: 'Ops Handoff',
    overview: 'Handoff-oriented recall tuned for state transfer, recent activity, and clear operational rules.',
    recommendedFor: [
      'shift handoffs',
      'operator continuity',
      'state-heavy debugging',
    ],
    defaultOptions: {
      profile: 'ops-handoff',
      hops: 2,
      includeRecent: true,
      includeProcedural: true,
      limit: 14,
      recentLimit: 10,
      proceduralLimit: 10,
      minNeighborScore: 0.2,
      neighborLimit: 35,
    },
    contextPackTitles: {
      recall: 'Handoff-critical memories',
      graph: 'Linked system context',
      procedural: 'Runbooks and escalation rules',
      recent: 'Recent state and events',
      actions: 'Suggested handoff actions',
    },
  },
  'research-brief': {
    label: 'Research Brief',
    overview: 'Research-oriented recall tuned for breadth, linked evidence, and concise briefing output.',
    recommendedFor: [
      'research synthesis',
      'evidence gathering',
      'brief generation',
    ],
    defaultOptions: {
      profile: 'research-brief',
      hops: 2,
      includeRecent: true,
      includeProcedural: false,
      limit: 14,
      recentLimit: 4,
      minNeighborScore: 0.16,
      neighborLimit: 30,
    },
    contextPackTitles: {
      recall: 'High-value findings',
      graph: 'Connected evidence and supporting context',
      procedural: 'Research guardrails',
      recent: 'Recent research context',
      actions: 'Suggested research follow-ups',
    },
  },
} satisfies Record<SmartRecallProfile, Omit<SmartRecallProfileDescriptor, 'profile'>>;

export function getSmartRecallProfiles(): SmartRecallProfileDescriptor[] {
  return (Object.keys(SMART_RECALL_PROFILE_CATALOG) as SmartRecallProfile[])
    .map((profile) => {
      const descriptor = SMART_RECALL_PROFILE_CATALOG[profile];
      return {
      profile,
      label: descriptor.label,
      overview: descriptor.overview,
      recommendedFor: [...descriptor.recommendedFor],
      defaultOptions: { ...descriptor.defaultOptions } as SmartRecallProfileDefaults,
      contextPackTitles: { ...descriptor.contextPackTitles },
      };
    });
}

export function getSmartRecallProfile(profile: SmartRecallProfile): SmartRecallProfileDescriptor {
  const descriptor = SMART_RECALL_PROFILE_CATALOG[profile];
  return {
    profile,
    label: descriptor.label,
    overview: descriptor.overview,
    recommendedFor: [...descriptor.recommendedFor],
    defaultOptions: { ...descriptor.defaultOptions } as SmartRecallProfileDefaults,
    contextPackTitles: { ...descriptor.contextPackTitles },
  };
}

export function resolveRecallProfile(profile: string | null | undefined): SmartRecallProfile | null {
  return resolveSmartRecallProfile(profile);
}

/**
 * ReMEM — RLM-Style Memory System
 *
 * @example
 * const memory = new ReMEM({
 *   storage: 'sqlite',
 *   llm: { type: 'bankr', apiKey: process.env.BANKR_API_KEY },
 * });
 *
 * await memory.init();
 * await memory.store({ content: "User prefers dark mode", topics: ['preferences'] });
 * const results = await memory.query("What UI preferences?");
 */
export class ReMEM {
  private _store: MemoryStoreLike;
  private model?: ModelAbstraction;
  private engine: QueryEngine;
  private identity?: IdentitySystem;
  private layers?: LayerManager;
  private embeddingService?: EmbeddingService;
  private _embeddingEnabled: boolean = false;
  private _identityEnabled: boolean = false;
  private _layersEnabled: boolean = false;
  private _layerConfig?: Partial<LayerConfig>;
  private _agentId?: string;
  private _userId?: string;

  private normalizeNamespace(namespace: NamespaceInput): string {
    const parsed = namespaceInputSchema.parse(namespace);
    return Array.isArray(parsed) ? parsed.join('/') : parsed;
  }

  private namespaceTopicTrail(namespace: string): string[] {
    const parts = namespace.split('/').map((part) => part.trim()).filter(Boolean);
    return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
  }

  private buildScopedMetadataFilters(
    scope?: NamespaceQueryScope,
    namespace?: string,
    existing?: QueryOptions['metadata']
  ): QueryOptions['metadata'] {
    const parsedScope = namespaceQueryScopeSchema.parse(scope ?? {});
    const metadata: NonNullable<QueryOptions['metadata']> = { ...(existing ?? {}) };

    if (namespace) {
      metadata.namespace = parsedScope.includeDescendants
        ? { contains: namespace }
        : namespace;
    }

    if (parsedScope.visibility === 'private') {
      metadata.visibility = { in: ['private'] };
    } else if (parsedScope.visibility === 'shared') {
      metadata.visibility = { in: ['shared'] };
    } else {
      metadata.visibility = { in: ['private', 'shared'] };
    }

    return metadata;
  }

  private normalizeRememberContent(content: string): string {
    return content.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private rememberTokenSet(content: string): Set<string> {
    return new Set(
      this.normalizeRememberContent(content)
        .split(/[^a-z0-9_:/.-]+/i)
        .filter((token) => token.length >= 3)
    );
  }

  private inferRememberKind(input: { content: string; topics?: string[]; metadata?: Record<string, unknown>; kind?: RememberKind }): RememberKind {
    if (input.kind) return input.kind;
    const text = `${input.content} ${(input.topics ?? []).join(' ')}`.toLowerCase();
    const metadata = input.metadata ?? {};

    if (['artifactPath', 'resourceUri', 'url', 'filePath', 'checksum'].some((key) => typeof metadata[key] === 'string')) {
      return 'artifact-note';
    }
    if (/\b(prefer|preference|likes|dislikes|favorite|style|tone|settings?)\b/i.test(text)) {
      return 'preference';
    }
    if (/\b(decided|decision|agreed|we will|ship with|going with|resolved|chosen)\b/i.test(text)) {
      return 'decision';
    }
    if (/\b(always|never|when|if)\b/i.test(text) || /\b(checklist|runbook|procedure|playbook|must|should)\b/i.test(text)) {
      return 'procedure';
    }
    if (/\b(today|just|observed|incident|happened|ran into|saw|noticed|error|failed|met with)\b/i.test(text)) {
      return 'recent-event';
    }
    return 'fact';
  }

  private rememberLayerForKind(kind: RememberKind): MemoryLayer {
    switch (kind) {
      case 'procedure':
        return 'procedural';
      case 'recent-event':
        return 'episodic';
      case 'preference':
        return 'identity';
      case 'decision':
      case 'artifact-note':
      case 'fact':
      default:
        return 'semantic';
    }
  }

  private rememberScore(kind: RememberKind, content: string, topics: string[], metadata: Record<string, unknown>): { score: number; threshold: number; reason: string } {
    const normalized = this.normalizeRememberContent(content);
    const tokenCount = normalized.split(/\s+/).filter(Boolean).length;
    let score = ({
      fact: 0.6,
      preference: 0.74,
      decision: 0.82,
      procedure: 0.86,
      'recent-event': 0.62,
      'artifact-note': 0.78,
    } satisfies Record<RememberKind, number>)[kind];

    if (content.length >= 40) score += 0.05;
    if (content.length >= 90) score += 0.04;
    if (topics.length > 0) score += Math.min(0.08, topics.length * 0.02);
    if (Object.keys(metadata).length > 0) score += 0.05;
    if (/\b(because|due to|so that|resolved|root cause|owner|release|version)\b/i.test(content)) score += 0.04;
    if (/\d/.test(content) || /https?:\/\//i.test(content)) score += 0.03;
    if (tokenCount <= 3) score -= 0.25;
    if (content.length < 18) score -= 0.18;
    if (/^(ok|okay|thanks|nice|cool|sounds good|got it|lol|yep|yup)[.! ]*$/i.test(normalized)) score -= 0.55;

    const threshold = kind === 'recent-event' ? 0.55 : 0.58;
    const bounded = Math.max(0, Math.min(1, Number(score.toFixed(3))));
    const reason = bounded >= threshold
      ? `High-signal ${kind} memory`
      : `Below intake threshold for ${kind}`;
    return { score: bounded, threshold, reason };
  }

  private rememberDuplicate(entries: QueryResult[], content: string, topics: string[]): QueryResult | null {
    const normalized = this.normalizeRememberContent(content);
    const nextTokens = this.rememberTokenSet(content);
    const nextTopicKey = [...topics].sort().join('|');

    for (const entry of entries) {
      const existing = this.normalizeRememberContent(entry.content);
      if (existing === normalized) return entry;

      const existingTokens = this.rememberTokenSet(entry.content);
      const union = new Set([...nextTokens, ...existingTokens]);
      const intersection = [...nextTokens].filter((token) => existingTokens.has(token)).length;
      const tokenSimilarity = union.size === 0 ? 0 : intersection / union.size;
      const existingTopicKey = [...entry.topics].sort().join('|');

      if (tokenSimilarity >= 0.92 && (!nextTopicKey || !existingTopicKey || nextTopicKey === existingTopicKey)) {
        return entry;
      }
    }

    return null;
  }

  private rememberConflicts(entries: QueryResult[], content: string, topics: string[]): string[] {
    const normalized = this.normalizeRememberContent(content);
    const contradictionSignal = /\b(not|no longer|instead|switched|changed to|moved to|replaced)\b/i.test(normalized);
    if (!contradictionSignal || topics.length === 0) return [];

    const nextTokens = this.rememberTokenSet(content);
    return entries
      .filter((entry) => entry.topics.some((topic) => topics.includes(topic)))
      .filter((entry) => {
        const existingTokens = this.rememberTokenSet(entry.content);
        const union = new Set([...nextTokens, ...existingTokens]);
        const intersection = [...nextTokens].filter((token) => existingTokens.has(token)).length;
        return union.size > 0 && intersection / union.size >= 0.35;
      })
      .map((entry) => entry.id)
      .slice(0, 5);
  }

  private buildProcedureTrigger(input: { content: string; topics: string[]; metadata: Record<string, unknown> }) {
    const existing = input.metadata.trigger;
    if (existing && typeof existing === 'object') return existing;

    const stopwords = new Set(['the', 'and', 'that', 'with', 'from', 'this', 'when', 'then', 'before', 'after', 'always', 'never', 'should', 'must']);
    const terms = Array.from(this.rememberTokenSet(input.content))
      .filter((token) => !stopwords.has(token))
      .slice(0, 6);
    const phrase = input.content
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .join(' ');

    return {
      terms,
      phrases: phrase ? [phrase] : [],
      topics: input.topics.slice(0, 6),
      match: 'any' as const,
      minScore: 0.2,
      priority: 0.7,
    };
  }

  private graphNodeLabel(entry: QueryResult): string {
    const metadataName = entry.metadata?.name;
    if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
    return entry.content.split('\n')[0]?.trim().slice(0, 80) || entry.id;
  }

  private dotEscape(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  constructor(config: ReMEMConfig) {
    const validated = rememConfigSchema.parse(config);

    // Initialize storage — default to SQLite if not specified
    const storage = validated.storage ?? 'sqlite';
    if (storage === 'postgres') {
      this._store = new PostgresMemoryStore({
        ...(validated.storageConfig ?? {}),
        ...(validated.postgres ?? {}),
      } as PostgresStoreConfig);
    } else {
      const dbPath = validated.dbPath ?? (storage === 'memory' ? ':memory:' : './remem.db');
      this._store = new MemoryStore(dbPath);
    }

    // Agent/user scoping for multi-agent support
    this._agentId = validated.storageConfig?.agentId as string | undefined;
    this._userId = validated.storageConfig?.userId as string | undefined;

    // Initialize model if provided
    if (validated.llm) {
      this.model = new ModelAbstraction(validated.llm);
    }

    // Initialize embedding service if enabled (v0.3.2)
    if (validated.embeddings?.enabled) {
      const embConfig: EmbedServiceConfig = {
        baseUrl: validated.embeddings.baseUrl ?? 'http://localhost:11434',
        model: validated.embeddings.model ?? 'nomic-embed-text',
        dimension: validated.embeddings.dimension,
      };
      this.embeddingService = new EmbeddingService(embConfig);
      this._embeddingEnabled = true;
    }

    // Initialize query engine (store initialized in init())
    this.engine = new QueryEngine({
      store: this._store,
      model: this.model,
    });
  }

  /**
   * Initialize the memory store. Must be called before use.
   * Also restores persisted layer state from the configured store if layers are enabled.
   */
  async init(): Promise<void> {
    await this._store.init();

    // Restore persisted layer entries from the configured store
    if (this._layersEnabled && this.layers) {
      const storeOpts = { agentId: this._agentId, userId: this._userId };
      const persisted = await this._store.loadAllLayerEntries(storeOpts);
      for (const entry of persisted) {
        this.layers.restoreEntry(entry);
      }
      if (persisted.length > 0) {
        console.log(`[ReMEM] Restored ${persisted.length} persisted layer entries from storage`);
      }
    }
  }

  /**
   * Store a new memory entry.
   * If layers are enabled, also persists to the appropriate layer in SQLite.
   * If embeddings are enabled, generates a vector embedding in the background.
   */
  async store(input: StoreMemoryInput): Promise<MemoryEntry> {
    const normalized = storeMemoryInputSchema.parse(input);

    // Store in the underlying store to get the entry ID for embedding
    const stored = await this._store.store(normalized, {
      agentId: this._agentId,
      userId: this._userId,
    });

    // Also store in layers if enabled (layers are persisted to the configured store)
    if (this._layersEnabled && this.layers) {
      const result = this.layers.store(normalized);
      await this._store.persistLayerEntry(result, {
        agentId: this._agentId,
        userId: this._userId,
      });
    }

    // Generate embedding (sync or async) if enabled
    if (this._embeddingEnabled && this.embeddingService) {
      const contentToEmbed = normalized.topics.length > 0
        ? `[${normalized.topics.join(', ')}] ${normalized.content}`
        : normalized.content;

      if (normalized.metadata?.asyncEmbed === false) {
        // Synchronous: block until embedding is computed and stored
        try {
          const emb = await this.embeddingService.generateEmbedding(stored.id, contentToEmbed);
          await this._store.storeEmbedding(stored.id, emb.base64, emb.vector.length, emb.model);
        } catch (err) {
          console.warn(`[ReMEM] Embedding failed for ${stored.id}: ${err}`);
        }
      } else {
        // Async: fire and forget
        this.embeddingService
          .generateEmbedding(stored.id, contentToEmbed)
          .then((emb) => {
            return this._store.storeEmbedding(stored.id, emb.base64, emb.vector.length, emb.model);
          })
          .catch((err) => console.warn(`[ReMEM] Async embed failed for ${stored.id}: ${err}`));
      }
    }

    return stored;
  }

  async remember(input: RememberInput): Promise<RememberResult> {
    const normalized = rememberInputSchema.parse(input);
    const kind = this.inferRememberKind(normalized);
    const layer = this.rememberLayerForKind(kind);
    const topics = Array.from(new Set([...(normalized.topics ?? []), kind, layer]));
    const metadata = {
      ...(normalized.metadata ?? {}),
      memoryKind: kind,
      intakeLayerHint: layer,
      rememberedAt: Date.now(),
      ...(normalized.source ? { source: normalized.source } : {}),
    } as Record<string, unknown>;
    const { score, threshold, reason } = this.rememberScore(kind, normalized.content, topics, metadata);
    const recent = await this.getRecent(50);
    const duplicate = this.rememberDuplicate(recent, normalized.content, topics);
    const conflictIds = this.rememberConflicts(recent, normalized.content, topics);

    if (duplicate) {
      return {
        action: normalized.dryRun ? 'preview' : 'skipped_duplicate',
        kind,
        layer,
        score,
        threshold,
        reason: 'Near-identical memory already exists in recent recall.',
        duplicateOf: duplicate.id,
        conflictIds,
        topics,
        metadata,
      };
    }

    if (!normalized.forceStore && score < threshold) {
      return {
        action: normalized.dryRun ? 'preview' : 'skipped_low_signal',
        kind,
        layer,
        score,
        threshold,
        reason,
        conflictIds,
        topics,
        metadata,
      };
    }

    const trigger = kind === 'procedure'
      ? this.buildProcedureTrigger({ content: normalized.content, topics, metadata })
      : undefined;
    const finalMetadata = {
      ...metadata,
      intakeScore: score,
      intakeReason: reason,
      ...(trigger ? { trigger } : {}),
      ...(conflictIds.length > 0 ? { conflictIds } : {}),
    } as Record<string, unknown>;

    if (normalized.dryRun) {
      return {
        action: 'preview',
        kind,
        layer,
        score,
        threshold,
        reason,
        conflictIds,
        topics,
        metadata: finalMetadata,
        ...(trigger ? { trigger } : {}),
      };
    }

    const entry = await this.store({
      content: normalized.content,
      topics,
      metadata: finalMetadata,
    });

    return {
      action: 'stored',
      kind,
      layer,
      score,
      threshold,
      reason,
      conflictIds,
      topics,
      metadata: finalMetadata,
      entry,
      ...(trigger ? { trigger } : {}),
    };
  }

  async rememberMany(inputs: RememberInput[], options?: RememberBatchOptions): Promise<RememberBatchResult> {
    const normalizedInputs = rememberBatchInputSchema.parse(inputs);
    const opts = rememberBatchOptionsSchema.parse(options ?? {});
    const results: RememberBatchResult['results'] = [];
    let stored = 0;
    let previews = 0;
    let skippedDuplicate = 0;
    let skippedLowSignal = 0;
    let failed = 0;

    for (const [index, input] of normalizedInputs.entries()) {
      try {
        const result = await this.remember(input);
        results.push({ index, ok: true, result });

        if (result.action === 'stored') stored += 1;
        else if (result.action === 'preview') previews += 1;
        else if (result.action === 'skipped_duplicate') skippedDuplicate += 1;
        else if (result.action === 'skipped_low_signal') skippedLowSignal += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        results.push({ index, ok: false, error: message });
        if (opts.stopOnError) {
          throw error;
        }
      }
    }

    return {
      total: normalizedInputs.length,
      stored,
      previews,
      skippedDuplicate,
      skippedLowSignal,
      failed,
      results,
    };
  }

  /**
   * Query memory using natural language.
   * Uses semantic search (cosine similarity) when embeddings are enabled,
   * falls back to keyword + access_count scoring otherwise.
   */
  async query(query: string, options?: QueryOptions): Promise<QueryResponse> {
    const start = Date.now();

    // If embeddings are enabled and Ollama is reachable, use semantic search
    if (this._embeddingEnabled && this.embeddingService) {
      try {
        const queryVector = await this.embeddingService.embed(query);
        const { results, totalAvailable } = await this._store.semanticQuery(
          query,
          queryVector,
          options,
          { agentId: this._agentId, userId: this._userId }
        );
        return { results, totalAvailable, query, tookMs: Date.now() - start };
      } catch (err) {
        // Embedding failed — fall back to keyword search
        console.warn(`[ReMEM] Semantic query failed, falling back to keyword: ${err}`);
      }
    }

    // Fallback: standard keyword + access_count query
    const { results, totalAvailable } = await this._store.query(query, options, {
      agentId: this._agentId,
      userId: this._userId,
    });
    return { results, totalAvailable, query, tookMs: Date.now() - start };
  }

  async linkMemories(fromId: string, toId: string, type: string, metadata: Record<string, unknown> = {}): Promise<MemoryLink> {
    return this._store.createLink({ fromId, toId, type, metadata }, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  async getLinkedMemories(memoryId: string, options?: LinkedMemoryQueryOptions): Promise<Array<{ link: MemoryLink; memory: QueryResult | null }>> {
    const opts = linkedMemoryQueryOptionsSchema.parse(options ?? {});
    const links = await this._store.getLinks(memoryId, opts, {
      agentId: this._agentId,
      userId: this._userId,
    });

    return Promise.all(links.map(async (link) => {
      const otherId = link.fromId === memoryId ? link.toId : link.fromId;
      return {
        link,
        memory: await this._store.getEntryById(otherId, {
          agentId: this._agentId,
          userId: this._userId,
        }),
      };
    }));
  }

  async unlinkMemories(linkId: string): Promise<boolean> {
    return this._store.deleteLink(linkId);
  }

  async queryWithNeighbors(query: string, options?: QueryWithNeighborsOptions): Promise<QueryResponse & { linksTraversed: number; paths?: NeighborPath[] }> {
    const opts = queryWithNeighborsOptionsSchema.parse(options ?? {});
    const base = await this.query(query, opts);
    const merged = new Map<string, QueryResult>();
    const paths: NeighborPath[] = [];

    if (opts.includeBaseResults) {
      for (const result of base.results) merged.set(result.id, result);
    }

    let frontier = base.results.map((r) => ({ id: r.id, sourceId: r.id, score: r.relevanceScore ?? 0.6 }));
    const seen = new Set(frontier.map((item) => item.id));
    let linksTraversed = 0;

    for (let hop = 0; hop < opts.hops; hop++) {
      const nextFrontier: Array<{ id: string; sourceId: string; score: number }> = [];
      for (const item of frontier) {
        const neighbors = await this.getLinkedMemories(item.id, {
          direction: 'both',
          types: opts.linkTypes,
          limit: opts.neighborLimit,
        });
        linksTraversed += neighbors.length;

        for (const neighbor of neighbors) {
          if (!neighbor.memory) continue;

          const linkWeight = opts.linkTypeWeights?.[neighbor.link.type] ?? this.defaultLinkWeight(neighbor.link.type);
          const connectionWeight = this.metadataNumericWeight(neighbor.link.metadata, ['graphWeight', 'weight', 'strength'], 1);
          const nodeWeight = this.metadataNumericWeight(neighbor.memory.metadata ?? {}, ['graphWeight', 'nodeWeight', 'importance'], 1);
          const hopDecay = Math.max(0.2, 0.9 - hop * 0.15);
          const neighborScore = Math.min(1.5, (item.score || 0.6) * hopDecay * linkWeight * connectionWeight * nodeWeight);
          if (neighborScore < opts.minNeighborScore) continue;

          if (opts.includePathDetails) {
            paths.push({
              fromId: item.sourceId,
              toId: neighbor.memory.id,
              throughId: item.id,
              type: neighbor.link.type,
              hop: hop + 1,
              score: neighborScore,
            });
          }

          const existing = merged.get(neighbor.memory.id);
          const enriched: QueryResult = {
            ...neighbor.memory,
            metadata: neighbor.memory.metadata ?? {},
            relevanceScore: Math.max(existing?.relevanceScore ?? 0, neighborScore, neighbor.memory.relevanceScore ?? 0),
          };
          merged.set(neighbor.memory.id, enriched);

          if (!seen.has(neighbor.memory.id)) {
            seen.add(neighbor.memory.id);
            nextFrontier.push({ id: neighbor.memory.id, sourceId: item.sourceId, score: neighborScore });
          }
        }
      }
      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }

    const results = Array.from(merged.values())
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .slice(0, opts.limit);

    return {
      results,
      totalAvailable: results.length,
      query,
      tookMs: base.tookMs,
      linksTraversed,
      ...(opts.includePathDetails ? { paths } : {}),
    };
  }

  async smartRecall(query: string, options?: SmartRecallOptions): Promise<SmartRecallResponse> {
    const start = Date.now();
    const opts = smartRecallOptionsSchema.parse(options ?? {});
    const merged = { ...getSmartRecallProfile(opts.profile).defaultOptions, ...opts } as SmartRecallOptions;
    const semanticBase = await this.query(query, merged);
    const graphBase = await this.queryWithNeighbors(query, {
      ...merged,
      includeBaseResults: true,
    });

    const proceduralMatches = merged.includeProcedural
      ? (() => {
          const matches = new Map<string, ProceduralMatch>();
          const pushMatches = (items: ProceduralMatch[]) => {
            for (const item of items) {
              const existing = matches.get(item.entry.id);
              if (!existing || item.score > existing.score) {
                matches.set(item.entry.id, item);
              }
            }
          };

          pushMatches(this.matchProcedural(query));

          if (matches.size < merged.proceduralLimit) {
            const expansionContext = [
              query,
              ...semanticBase.results.slice(0, 3).map((result) => result.content),
              ...semanticBase.results.slice(0, 3).flatMap((result) => result.topics),
            ].join('\n');
            pushMatches(this.matchProcedural(expansionContext));
          }

          return Array.from(matches.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, merged.proceduralLimit);
        })()
      : [];

    const recentResults = merged.includeRecent
      ? (await this.getRecent(merged.recentLimit)).filter((entry) => {
          if (merged.topics && merged.topics.length > 0 && !merged.topics.some((topic) => entry.topics.includes(topic))) return false;
          if (merged.minAccessCount && entry.accessCount < merged.minAccessCount) return false;
          if (merged.metadata && this._store.matchMetadata && !this._store.matchMetadata(entry.metadata ?? {}, merged.metadata)) return false;
          return true;
        })
      : [];

    const mergedResults = new Map<string, import('./types.js').SmartRecallResult>();

    const upsert = (
      result: QueryResult,
      sourceLane: 'semantic' | 'graph' | 'procedural' | 'recent',
      combinedScore: number,
      reasons: string[]
    ) => {
      const existing = mergedResults.get(result.id);
      const nextReasons = Array.from(new Set([...(existing?.reasons ?? []), ...reasons]));
      const nextScore = Math.max(existing?.combinedScore ?? 0, combinedScore);
      const nextLane = (existing?.combinedScore ?? -1) > combinedScore ? existing!.sourceLane : sourceLane;

      mergedResults.set(result.id, {
        ...result,
        metadata: result.metadata ?? {},
        relevanceScore: Math.max(result.relevanceScore ?? 0, existing?.relevanceScore ?? 0),
        sourceLane: nextLane,
        reasons: nextReasons,
        combinedScore: nextScore,
      });
    };

    for (const result of semanticBase.results) {
      upsert(result, 'semantic', result.relevanceScore ?? 0.4, [`semantic:${(result.relevanceScore ?? 0).toFixed(2)}`]);
    }

    for (const result of graphBase.results) {
      const score = Math.min(1.5, (result.relevanceScore ?? 0.35) + 0.12);
      upsert(result, 'graph', score, ['graph:linked-neighbor']);
    }

    for (const match of proceduralMatches) {
      upsert(
        {
          id: match.entry.id,
          content: match.entry.content,
          topics: match.entry.topics,
          metadata: match.entry.metadata,
          relevanceScore: match.score,
          createdAt: match.entry.createdAt,
          accessedAt: match.entry.accessedAt,
          accessCount: match.entry.accessCount,
        },
        'procedural',
        Math.min(1.5, match.score + 0.2),
        match.reasons.map((reason) => `procedural:${reason}`)
      );
    }

    for (const result of recentResults) {
      const recencyBoost = 0.15 + Math.min(0.2, result.accessCount * 0.02);
      upsert(result, 'recent', (result.relevanceScore ?? 0.2) + recencyBoost, ['recent:active-context']);
    }

    const results = Array.from(mergedResults.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, merged.limit);

    return {
      results,
      totalAvailable: mergedResults.size,
      query,
      tookMs: Date.now() - start,
      profile: merged.profile,
      lanes: {
        semantic: semanticBase.results.length,
        graph: Math.max(0, graphBase.results.length - semanticBase.results.length),
        procedural: proceduralMatches.length,
        recent: recentResults.length,
      },
    };
  }

  async dream(options?: DreamOptions): Promise<DreamResponse> {
    const start = Date.now();
    const opts = dreamOptionsSchema.parse(options ?? {});

    if (!this.layers) {
      await this.enableLayers();
    }

    const layerManager = this.layers;
    if (!layerManager) {
      return {
        query: opts.query,
        title: 'Dream from long memory',
        content: 'Long-memory dreaming is unavailable because layers are not enabled.',
        themes: [],
        actions: [],
        sourceIds: [],
        sourceLayers: opts.layers,
        sourceCount: 0,
        tookMs: Date.now() - start,
      };
    }

    const queryTerms = new Set(
      opts.query
        .toLowerCase()
        .split(/\W+/)
        .filter((term) => term.length >= 3)
    );

    const scopedEntries = layerManager
      .getAllEntries()
      .filter((entry) => opts.layers.includes(entry.layer as DreamMemoryLayer))
      .filter((entry) => {
        if (opts.topicAllowlist?.length && !opts.topicAllowlist.some((topic) => entry.topics.includes(topic))) return false;
        if (opts.metadata && this._store.matchMetadata && !this._store.matchMetadata(entry.metadata ?? {}, opts.metadata)) return false;
        return true;
      });

    const scoredEntries = scopedEntries
      .map((entry) => {
        const text = `${entry.content} ${entry.topics.join(' ')}`.toLowerCase();
        const termHits = [...queryTerms].filter((term) => text.includes(term)).length;
        const score = termHits * 5 + entry.accessCount * 1.5 + entry.importance * 10 + (entry.layer === 'identity' ? 4 : entry.layer === 'procedural' ? 3 : 2);
        return { entry, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.entry.createdAt - a.entry.createdAt;
      })
      .slice(0, opts.limit);

    const entries = scoredEntries.map((item) => item.entry);
    const sourceIds = entries.map((entry) => entry.id);
    const sourceLayers = Array.from(new Set(entries.map((entry) => entry.layer as DreamMemoryLayer)));

    const topicCounts = new Map<string, number>();
    for (const entry of entries) {
      for (const topic of entry.topics) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }

    const themes = [...topicCounts.entries()]
      .filter(([topic]) => !topic.startsWith('session:'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([topic]) => topic);

    const actions = entries
      .filter((entry) => entry.layer === 'procedural' || entry.topics.includes('decision') || entry.topics.includes('procedure'))
      .slice(0, 4)
      .map((entry) => entry.content);

    if (!entries.length) {
      return {
        query: opts.query,
        title: 'Dream from long memory',
        content: 'No long-memory entries matched this dream pass yet.',
        themes: [],
        actions: [],
        sourceIds: [],
        sourceLayers: opts.layers,
        sourceCount: 0,
        tookMs: Date.now() - start,
      };
    }

    const model = this.getModel();
    if (model) {
      const sourceBlock = entries.map((entry, index) => {
        const layer = entry.layer.toUpperCase();
        const topics = entry.topics.join(', ');
        return `${index + 1}. [${layer}] ${entry.content}\nTopics: ${topics}`;
      }).join('\n\n');

      const response = await model.chat([
        {
          role: 'system',
          content: 'You are synthesizing an agent dream from long-term memory. Be compact, concrete, and forward-looking. Return strict JSON with keys title, content, themes, actions.',
        },
        {
          role: 'user',
          content: `Dream query: ${opts.query}\n\nUse only these long-memory sources:\n\n${sourceBlock}\n\nReturn JSON shaped like {"title":"...","content":"...","themes":["..."],"actions":["..."]}. Themes/actions should each have 2-4 short items.`,
        },
      ], { temperature: 0.4, maxTokens: 700 });

      try {
        const parsed = JSON.parse(response.content) as { title?: string; content?: string; themes?: string[]; actions?: string[] };
        return {
          query: opts.query,
          title: parsed.title?.trim() || 'Dream from long memory',
          content: parsed.content?.trim() || entries.map((entry) => entry.content).join('\n'),
          themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 4) : themes,
          actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 4) : actions,
          sourceIds,
          sourceLayers,
          sourceCount: entries.length,
          modelUsed: this.getModelName(),
          tookMs: Date.now() - start,
        };
      } catch {
        // fall through to deterministic synthesis
      }
    }

    return {
      query: opts.query,
      title: 'Dream from long memory',
      content: [
        `Long memory keeps circling back to ${themes.length ? themes.join(', ') : 'a few durable themes'}.`,
        `Most salient signals: ${entries.slice(0, 3).map((entry) => entry.content).join(' | ')}`,
        actions.length ? `Operational pull: ${actions.join(' | ')}` : 'Operational pull: consolidate durable rules and turn repeated patterns into procedures.',
      ].join('\n\n'),
      themes,
      actions,
      sourceIds,
      sourceLayers,
      sourceCount: entries.length,
      tookMs: Date.now() - start,
    };
  }

  async contextPack(query: string, options?: ContextPackOptions): Promise<ContextPackResponse> {
    const start = Date.now();
    const opts = contextPackOptionsSchema.parse({
      profile: 'agent-safe',
      includeRecent: true,
      ...options,
    });

    const recall = await this.smartRecall(query, opts);
    const seenIds = new Set<string>();
    const sourceIds: string[] = [];
    const sections: ContextPackSection[] = [];
    let truncated = false;

    const rememberSources = (ids: string[]) => {
      for (const id of ids) {
        if (!seenIds.has(id)) {
          seenIds.add(id);
          sourceIds.push(id);
        }
      }
    };

    const formatResult = (result: SmartRecallResult | QueryResult, index: number) => {
      const lane = 'sourceLane' in result ? ` lane=${result.sourceLane}` : '';
      const score = 'combinedScore' in result
        ? ` score=${result.combinedScore.toFixed(2)}`
        : typeof result.relevanceScore === 'number'
          ? ` score=${result.relevanceScore.toFixed(2)}`
          : '';
      const topics = result.topics.length ? ` topics=${result.topics.join(',')}` : '';
      const metadata = opts.includeMetadata && Object.keys(result.metadata ?? {}).length
        ? ` metadata=${JSON.stringify(result.metadata)}`
        : '';
      const reasons = 'reasons' in result && result.reasons.length
        ? ` reasons=${result.reasons.join('|')}`
        : '';
      return `${index + 1}. [${result.id}]${lane}${score}${topics}${reasons}${metadata}\n${result.content}`;
    };

    const profileDescriptor = getSmartRecallProfile(recall.profile);
    const semanticRecall = recall.results.filter((result) => result.sourceLane === 'semantic');

    const laneGroups = {
      recall: semanticRecall.length
        ? semanticRecall
        : recall.results.filter((result) => result.sourceLane !== 'recent').slice(0, 3),
      graph: recall.results.filter((result) => result.sourceLane === 'graph' || result.reasons.some((reason) => reason.startsWith('graph:'))),
      procedural: recall.results.filter((result) => result.sourceLane === 'procedural' || result.reasons.some((reason) => reason.startsWith('procedural:'))),
    };

    const addSection = (section: ContextPackSection) => {
      const next = this.renderContextPack(query, recall.profile, [...sections, section], opts.maxChars);
      sections.push({
        ...section,
        content: next.sectionContents[next.sectionContents.length - 1] ?? section.content,
      });
      truncated = truncated || next.truncated;
      rememberSources(section.sourceIds);
    };

    addSection({
        kind: 'overview',
        title: 'Recall overview',
        content: [
          `profile: ${recall.profile}`,
          `goal: ${profileDescriptor.overview}`,
          `lanes: semantic=${recall.lanes.semantic}, graph=${recall.lanes.graph}, procedural=${recall.lanes.procedural}, recent=${recall.lanes.recent}`,
          `totalAvailable: ${recall.totalAvailable}`,
        ].join('\n'),
      sourceIds: [],
    });

    if (laneGroups.recall.length) {
      addSection({
        kind: 'recall',
        title: profileDescriptor.contextPackTitles.recall,
        content: laneGroups.recall.map(formatResult).join('\n\n'),
        sourceIds: laneGroups.recall.map((result) => result.id),
      });
    }

    if (laneGroups.graph.length) {
      addSection({
        kind: 'graph',
        title: profileDescriptor.contextPackTitles.graph,
        content: laneGroups.graph.map(formatResult).join('\n\n'),
        sourceIds: laneGroups.graph.map((result) => result.id),
      });
    }

    if (laneGroups.procedural.length) {
      addSection({
        kind: 'procedural',
        title: profileDescriptor.contextPackTitles.procedural,
        content: laneGroups.procedural.map(formatResult).join('\n\n'),
        sourceIds: laneGroups.procedural.map((result) => result.id),
      });
    }

    if (opts.includeRecent) {
      const recent = (await this.getRecent(opts.recentLimit)).filter((entry) => !seenIds.has(entry.id));
      if (recent.length) {
        addSection({
          kind: 'recent',
          title: profileDescriptor.contextPackTitles.recent,
          content: recent.map(formatResult).join('\n\n'),
          sourceIds: recent.map((entry) => entry.id),
        });
      }
    }

    const actionCandidates = [
      ...laneGroups.procedural,
      ...laneGroups.recall.filter((result) => result.topics.includes('decision') || result.topics.includes('procedure')),
      ...laneGroups.graph.filter((result) => result.topics.includes('decision') || result.topics.includes('procedure')),
    ];
    const actionLines = Array.from(new Set(actionCandidates.map((result) => result.content.trim()))).slice(0, 5);
    if (actionLines.length) {
      addSection({
        kind: 'actions',
        title: profileDescriptor.contextPackTitles.actions,
        content: actionLines.map((line, index) => `${index + 1}. ${line}`).join('\n'),
        sourceIds: actionCandidates.map((result) => result.id),
      });
    }

    if (opts.includeDream) {
      const dream = await this.dream({
        query,
        layers: ['identity', 'semantic', 'procedural'],
        limit: Math.min(Math.max(opts.limit, 4), 20),
        metadata: opts.metadata,
        topicAllowlist: opts.topics,
      });
      if (dream.content && dream.sourceCount > 0) {
        addSection({
          kind: 'dream',
          title: dream.title,
          content: [
            dream.content,
            dream.themes.length ? `themes: ${dream.themes.join(', ')}` : '',
            dream.actions.length ? `actions: ${dream.actions.join(' | ')}` : '',
          ].filter(Boolean).join('\n'),
          sourceIds: dream.sourceIds,
        });
      }
    }

    const rendered = this.renderContextPack(query, recall.profile, sections, opts.maxChars);

    return {
      query,
      profile: recall.profile,
      content: rendered.content,
      sections: sections.map((section, index) => ({
        ...section,
        content: rendered.sectionContents[index] ?? section.content,
      })),
      sourceIds,
      maxChars: opts.maxChars,
      usedChars: rendered.content.length,
      truncated: truncated || rendered.truncated,
      tookMs: Date.now() - start,
    };
  }

  private renderContextPack(query: string, profile: SmartRecallOptions['profile'], sections: ContextPackSection[], maxChars: number) {
    const header = `# ReMEM Context Pack\nquery: ${query}\nprofile: ${profile}\n`;
    const sectionContents: string[] = [];
    let content = header;
    let truncated = false;

    for (const section of sections) {
      const prefix = `\n## ${section.title}\n`;
      const available = maxChars - content.length - prefix.length;
      if (available <= 0) {
        truncated = true;
        break;
      }

      let body = section.content;
      if (body.length > available) {
        body = `${body.slice(0, Math.max(0, available - 24)).trimEnd()}\n[truncated]`;
        truncated = true;
      }

      sectionContents.push(body);
      content += `${prefix}${body}\n`;
      if (truncated) break;
    }

    return {
      content: content.slice(0, maxChars),
      sectionContents,
      truncated,
    };
  }

  private analyzeMemoryGraphStructure(
    nodes: MemoryGraphNode[],
    links: MemoryGraphLink[],
    topics: MemoryGraphTopicCluster[]
  ): {
    clusters: MemoryGraphStructureCluster[];
    bridges: { nodes: MemoryGraphBridgeNode[]; links: MemoryGraphBridgeLink[] };
  } {
    const adjacency = new Map<string, Array<{ neighborId: string; link: MemoryGraphLink }>>();
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const linkById = new Map(links.map((link) => [link.id, link]));

    for (const node of nodes) {
      adjacency.set(node.id, []);
    }

    for (const link of links) {
      adjacency.get(link.fromId)?.push({ neighborId: link.toId, link });
      adjacency.get(link.toId)?.push({ neighborId: link.fromId, link });
    }

    const visited = new Set<string>();
    const clusters: MemoryGraphStructureCluster[] = [];
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

      const componentIdSet = new Set(componentIds);
      const topTopics = topics
        .map((topic) => ({
          topic: topic.topic,
          count: topic.nodeIds.filter((id) => componentIdSet.has(id)).length,
        }))
        .filter((topic) => topic.count > 0)
        .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
        .slice(0, 5);

      clusters.push({
        id: `cluster-${++clusterIndex}`,
        nodeIds: componentIds.sort(),
        linkIds: Array.from(componentLinkIds).sort(),
        size: componentIds.length,
        totalNodeWeight: Number(componentIds.reduce((sum, id) => sum + (nodeById.get(id)?.weight ?? 0), 0).toFixed(4)),
        totalLinkWeight: Number(Array.from(componentLinkIds).reduce((sum, id) => sum + (linkById.get(id)?.weight ?? 0), 0).toFixed(4)),
        topTopics,
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

          if (parent.get(nodeId) == null && childCount > 1) {
            articulationIds.add(nodeId);
          }
          if (parent.get(nodeId) != null && low.get(neighborId)! >= discovery.get(nodeId)!) {
            articulationIds.add(nodeId);
          }
          if (low.get(neighborId)! > discovery.get(nodeId)!) {
            bridgeLinkIds.add(edge.link.id);
          }
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

    return {
      clusters,
      bridges: {
        nodes: Array.from(articulationIds)
          .map((nodeId) => {
            const node = nodeById.get(nodeId)!;
            const bridgeLinkIdsForNode = (adjacency.get(nodeId) ?? [])
              .filter((edge) => bridgeLinkIds.has(edge.link.id))
              .map((edge) => edge.link.id)
              .sort();
            return {
              nodeId,
              label: node.label,
              degree: (adjacency.get(nodeId) ?? []).length,
              topics: node.topics,
              bridgeLinkIds: bridgeLinkIdsForNode,
            };
          })
          .sort((a, b) => b.bridgeLinkIds.length - a.bridgeLinkIds.length || b.degree - a.degree || a.label.localeCompare(b.label)),
        links: links
          .filter((link) => bridgeLinkIds.has(link.id))
          .map((link) => ({
            linkId: link.id,
            fromId: link.fromId,
            toId: link.toId,
            type: link.type,
            weight: link.weight,
          }))
          .sort((a, b) => b.weight - a.weight || a.type.localeCompare(b.type)),
      },
    };
  }

  /**
   * Returns true if semantic embeddings are enabled and configured.
   */
  isEmbeddingEnabled(): boolean {
    return this._embeddingEnabled;
  }

  /**
   * Returns the embedding service instance (if enabled).
   */
  getEmbeddingService(): EmbeddingService | undefined {
    return this.embeddingService;
  }

  usesNativeVectorSearch(): boolean {
    return Boolean(this._store.supportsNativeVectorSearch?.());
  }

  private defaultLinkWeight(type: string): number {
    switch (type) {
      case 'knowledge:calls':
      case 'knowledge:http_calls':
      case 'knowledge:uses':
        return 1.1;
      case 'knowledge:imports':
      case 'knowledge:depends_on':
        return 1;
      case 'knowledge:defines':
        return 0.9;
      case 'knowledge:contains':
        return 0.7;
      case 'supports':
      case 'about':
        return 1;
      case 'same_project':
      case 'same_person':
        return 0.9;
      case 'follows':
      case 'caused_by':
        return 0.8;
      case 'contradicts':
        return 0.55;
      default:
        return 0.75;
    }
  }

  private metadataNumericWeight(metadata: Record<string, unknown>, keys: string[], fallback: number): number {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.min(2, value));
      }
    }
    return fallback;
  }

  /**
   * Get the layer manager for advanced layer/consolidation operations.
   */
  getLayerManager(): LayerManager | undefined {
    return this.layers;
  }

  /**
   * Persist a layer entry. Exposed for advanced consolidation workflows.
   */
  async persistLayerEntry(entry: import('./types.js').LayeredMemoryEntry): Promise<void> {
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  /**
   * Persist a vector embedding for a layered memory entry.
   */
  async persistLayerEmbedding(entryId: string, vector: number[], model: string): Promise<void> {
    const base64 = EmbeddingService.encodeVector(vector);
    await this._store.storeEmbedding(entryId, base64, vector.length, model, 'layered');
  }

  /**
   * Get recent memory entries.
   */
  async getRecent(n: number = 10): Promise<QueryResult[]> {
    return this._store.getRecent(n, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  /**
   * Return a compact inventory of the configured memory scope.
   * Useful for health checks, release audits, and agent context budgeting.
   */
  async stats(): Promise<{
    coreCount: number;
    layerCount: number;
    snapshotCount: number;
    eventCount: number;
    topics: Array<{ topic: string; count: number }>;
    layers: ReturnType<LayerManager['getStats']> | null;
    oldestMemoryAt: number | null;
    newestMemoryAt: number | null;
  }> {
    const scope = { agentId: this._agentId, userId: this._userId };
    const [coreEntries, layerEntries, snapshots] = await Promise.all([
      this._store.getAllEntries(scope),
      this._store.loadAllLayerEntries(scope),
      this._store.listSnapshots(scope),
    ]);

    const topicCounts = new Map<string, number>();
    let oldestMemoryAt: number | null = null;
    let newestMemoryAt: number | null = null;

    for (const entry of coreEntries) {
      oldestMemoryAt = oldestMemoryAt === null ? entry.createdAt : Math.min(oldestMemoryAt, entry.createdAt);
      newestMemoryAt = newestMemoryAt === null ? entry.createdAt : Math.max(newestMemoryAt, entry.createdAt);
      for (const topic of entry.topics) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }

    const topics = [...topicCounts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));

    return {
      coreCount: coreEntries.length,
      layerCount: layerEntries.length,
      snapshotCount: snapshots.length,
      eventCount: this._store.getEventLog().length,
      topics,
      layers: this.getLayerStats(),
      oldestMemoryAt,
      newestMemoryAt,
    };
  }

  /**
   * Build a visualization-ready snapshot of the current memory graph.
   * Returns weighted nodes, internal links, topic clusters, and Graphviz DOT.
   */
  async graph(options: MemoryGraphOptions = {}): Promise<MemoryGraphSnapshot> {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 100);
    const topics = options.topics?.filter(Boolean);
    const metadata = options.metadata && Object.keys(options.metadata).length > 0
      ? options.metadata
      : undefined;
    const queryOptions: QueryOptions = {
      limit,
      ...(topics && topics.length > 0 ? { topics } : {}),
      ...(metadata ? { metadata } : {}),
      minAccessCount: options.minAccessCount,
      since: options.since,
      until: options.until,
    };
    const response = await this.query(options.query ?? '', queryOptions);
    const initialNodes: MemoryGraphNode[] = response.results.map((entry) => ({
      id: entry.id,
      label: this.graphNodeLabel(entry),
      content: entry.content,
      topics: entry.topics,
      metadata: entry.metadata ?? {},
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
      weight: Number(((entry.relevanceScore ?? 0) + Math.min(1, entry.accessCount * 0.05) + Math.min(1, entry.topics.length * 0.08)).toFixed(4)),
    }));
    const nodeIds = new Set(initialNodes.map((node) => node.id));
    const linksById = new Map<string, MemoryGraphLink>();
    const maxLinks = Math.min(Math.max(options.maxLinks ?? 250, 0), 1_000);
    const pageSize = 100;
    let truncated = false;

    for (const node of initialNodes) {
      if (linksById.size >= maxLinks) break;
      let offset = 0;
      while (linksById.size < maxLinks) {
        const linked = await this.getLinkedMemories(node.id, { direction: 'both', limit: pageSize, offset });
        if (linked.length === 0) break;
        for (const item of linked) {
          const link = item.link;
          if (!nodeIds.has(link.fromId) || !nodeIds.has(link.toId)) continue;
          linksById.set(link.id, {
            id: link.id,
            fromId: link.fromId,
            toId: link.toId,
            type: link.type,
            weight: this.metadataNumericWeight(link.metadata ?? {}, ['graphWeight', 'weight', 'strength'], this.defaultLinkWeight(link.type)),
            metadata: link.metadata ?? {},
            createdAt: link.createdAt,
          });
          if (linksById.size >= maxLinks) {
            truncated = true;
            break;
          }
        }
        if (linked.length < pageSize || linksById.size >= maxLinks) break;
        offset += linked.length;
      }
    }

    const links = Array.from(linksById.values())
      .sort((a, b) => b.weight - a.weight || a.type.localeCompare(b.type));
    const connectedIds = new Set(links.flatMap((link) => [link.fromId, link.toId]));
    const nodes = options.includeIsolated === false
      ? initialNodes.filter((node) => connectedIds.has(node.id))
      : initialNodes;
    const finalNodeIds = new Set(nodes.map((node) => node.id));
    const finalLinks = links.filter((link) => finalNodeIds.has(link.fromId) && finalNodeIds.has(link.toId));
    const topicMap = new Map<string, Set<string>>();

    for (const node of nodes) {
      for (const topic of node.topics) {
        if (!topicMap.has(topic)) topicMap.set(topic, new Set());
        topicMap.get(topic)!.add(node.id);
      }
    }

    const topicClusters = Array.from(topicMap.entries())
      .map(([topic, ids]) => ({ topic, count: ids.size, nodeIds: Array.from(ids).sort() }))
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
    const structure = this.analyzeMemoryGraphStructure(nodes, finalLinks, topicClusters);
    const dotLines = [
      'digraph remem_memory {',
      '  graph [rankdir=LR];',
      '  node [shape=box, style="rounded,filled", fillcolor="#111827", fontcolor="#f9fafb", color="#374151"];',
      '  edge [color="#6b7280", fontcolor="#9ca3af"];',
      ...nodes.map((node) => `  "${this.dotEscape(node.id)}" [label="${this.dotEscape(node.label)}\\n${this.dotEscape(node.topics.slice(0, 3).join(', '))}"];`),
      ...finalLinks.map((link) => `  "${this.dotEscape(link.fromId)}" -> "${this.dotEscape(link.toId)}" [label="${this.dotEscape(link.type)}", penwidth="${Math.max(1, link.weight).toFixed(2)}"];`),
      '}',
    ];
    const cytoscape: MemoryGraphCytoscapeExport = {
      elements: [
        ...nodes.map((node): MemoryGraphCytoscapeNode => ({
          group: 'nodes',
          data: {
            id: node.id,
            label: node.label,
            content: node.content,
            topics: node.topics,
            weight: node.weight,
            metadata: node.metadata,
            createdAt: node.createdAt,
            accessedAt: node.accessedAt,
            accessCount: node.accessCount,
          },
        })),
        ...finalLinks.map((link): MemoryGraphCytoscapeEdge => ({
          group: 'edges',
          data: {
            id: link.id,
            source: link.fromId,
            target: link.toId,
            label: link.type,
            type: link.type,
            weight: link.weight,
            metadata: link.metadata,
            createdAt: link.createdAt,
          },
        })),
      ],
    };

    return {
      name: 'ReMEM Memory Graph',
      ...(options.query ? { query: options.query } : {}),
      nodes,
      links: finalLinks,
      topics: topicClusters,
      clusters: structure.clusters,
      bridges: structure.bridges,
      dot: dotLines.join('\n'),
      cytoscape,
      analysisScope: {
        nodeSet: 'query-results',
        linkSet: 'internal-links-between-returned-nodes',
        structureSet: 'snapshot-internal',
        querySource: 'filtered-query',
        pageSize,
        uniqueLinks: finalLinks.length,
        truncated,
        includeIsolated: options.includeIsolated !== false,
        maxLinks,
      },
      generatedAt: Date.now(),
    };
  }

  /**
   * Run storage maintenance for the configured memory scope.
   * Use dryRun first to inspect expired layers and dangling storage rows before pruning.
   */
  async storageMaintenance(options?: StorageMaintenanceOptions): Promise<StorageMaintenanceResult> {
    if (!this._store.maintenance) {
      throw new Error('Configured storage adapter does not support maintenance');
    }
    return this._store.maintenance(options, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  /**
   * Register an external knowledge artifact without importing all of its rows.
   * Use this for compressed or tool-owned graph files, for example a
   * `.codebase-memory/graph.db.zst` produced by a codebase-memory MCP.
   */
  async registerKnowledgeArtifact(input: KnowledgeArtifactRegistration): Promise<KnowledgeArtifactRegistrationResult> {
    const artifact = knowledgeArtifactRegistrationSchema.parse(input);
    const source = artifact.source;
    const namespace = this.normalizeNamespace(['knowledge', source, artifact.project ?? 'default']);
    const content = [
      `External knowledge artifact registered: ${artifact.artifactPath}`,
      `source: ${source}`,
      artifact.project ? `project: ${artifact.project}` : null,
      artifact.resourceUri ? `resource: ${artifact.resourceUri}` : null,
      `format: ${artifact.format}`,
      artifact.compression ? `compression: ${artifact.compression}` : null,
      artifact.checksum ? `checksum: ${artifact.checksum}` : null,
      artifact.requiredScopes.length ? `required scopes: ${artifact.requiredScopes.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    const entry = await this._store.store({
      content,
      topics: Array.from(new Set(['knowledge-artifact', source, ...this.namespaceTopicTrail(namespace)])),
      metadata: {
        ...artifact.metadata,
        source: 'remem.knowledge.artifact',
        knowledgeSource: source,
        project: artifact.project,
        artifactPath: artifact.artifactPath,
        resourceUri: artifact.resourceUri,
        requiredScopes: artifact.requiredScopes,
        format: artifact.format,
        compression: artifact.compression,
        checksum: artifact.checksum,
        generatedAt: artifact.generatedAt,
        namespace,
        visibility: 'shared',
      },
    }, {
      agentId: this._agentId,
      userId: this._userId,
    });

    return {
      id: entry.id,
      source,
      project: artifact.project,
      artifactPath: artifact.artifactPath,
      resourceUri: artifact.resourceUri,
      requiredScopes: artifact.requiredScopes.length ? artifact.requiredScopes : undefined,
    };
  }

  /**
   * Ingest a portable external knowledge graph into ReMEM.
   * Nodes become memory entries and edges become ReMEM links, so existing
   * graph recall can traverse architecture/import/call relationships.
   */
  async ingestKnowledgeGraph(
    artifact: KnowledgeGraphArtifact,
    options?: KnowledgeIngestOptions
  ): Promise<KnowledgeIngestResult> {
    const graph = knowledgeGraphArtifactSchema.parse(artifact);
    const opts = knowledgeIngestOptionsSchema.parse({
      source: graph.source,
      project: graph.project,
      ...options,
    });
    const source = opts.source ?? graph.source;
    const project = opts.project ?? graph.project;
    const namespace = this.normalizeNamespace(opts.namespace ?? ['knowledge', source, project ?? 'default']);
    const scope = { agentId: this._agentId, userId: this._userId };
    const nodeMemoryIds: Record<string, string> = {};
    let nodesStored = 0;
    let edgesLinked = 0;
    let skippedEdges = 0;

    for (const node of graph.nodes) {
      const graphWeight = node.weight ?? this.inferKnowledgeNodeWeight(node);
      const entry = await this._store.store({
        content: this.renderKnowledgeNodeContent(node),
        topics: Array.from(new Set([
          opts.topic,
          source,
          node.label,
          ...(node.kind ? [node.kind] : []),
          ...(node.language ? [`language:${node.language}`] : []),
          ...this.namespaceTopicTrail(namespace),
        ])),
        metadata: {
          ...node.metadata,
          source: 'remem.knowledge.node',
          knowledgeSource: source,
          project,
          resourceUri: graph.resourceUri,
          requiredScopes: graph.requiredScopes,
          externalId: node.id,
          label: node.label,
          name: node.name,
          kind: node.kind,
          path: node.path,
          language: node.language,
          graphWeight,
          nodeWeight: graphWeight,
          namespace,
          visibility: opts.visibility,
        },
      }, scope);
      nodeMemoryIds[node.id] = entry.id;
      nodesStored += 1;
    }

    for (const edge of graph.edges) {
      const fromId = nodeMemoryIds[edge.from];
      const toId = nodeMemoryIds[edge.to];
      if (!fromId || !toId) {
        skippedEdges += 1;
        continue;
      }
      const graphWeight = edge.weight ?? this.inferKnowledgeEdgeWeight(edge);
      await this._store.createLink({
        fromId,
        toId,
        type: this.normalizeKnowledgeLinkType(edge.type, opts.linkTypePrefix),
        metadata: {
          ...edge.metadata,
          source: 'remem.knowledge.edge',
          knowledgeSource: source,
          project,
          externalFrom: edge.from,
          externalTo: edge.to,
          externalType: edge.type,
          graphWeight,
          weight: graphWeight,
        },
      }, scope);
      edgesLinked += 1;
    }

    return {
      source,
      project,
      namespace,
      nodesStored,
      edgesLinked,
      skippedEdges,
      nodeMemoryIds,
    };
  }

  /**
   * Summarize imported knowledge/codebase graph memories by label, owner, and graph health.
   * Useful when another system owns indexing and ReMEM is the durable recall + traversal layer.
   */
  async knowledgeOverview(
    options: CodebaseGraphInventoryOptions & { resourceGrant?: KnowledgeResourceGrant } = {}
  ) {
    return createCodebaseMemoryAdapter(this).overview(options);
  }

  /**
   * Retrieve a scoped codebase/knowledge subgraph with prompt-ready context.
   * This exposes imported graph memories without requiring callers to instantiate an adapter themselves.
   */
  async knowledgeSubgraph(query: string, options: CodebaseSubgraphOptions = {}): Promise<CodebaseGraphSubgraph> {
    return createCodebaseMemoryAdapter(this).subgraph(query, options);
  }

  private renderKnowledgeNodeContent(node: KnowledgeNode): string {
    const title = node.name ?? node.id;
    const lines = [
      `${node.label}: ${title}`,
      node.kind ? `kind: ${node.kind}` : null,
      node.path ? `path: ${node.path}` : null,
      node.language ? `language: ${node.language}` : null,
      node.summary,
      node.content,
    ].filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
    return lines.join('\n');
  }

  private inferKnowledgeNodeWeight(node: KnowledgeNode): number {
    const label = node.label.toLowerCase();
    const kind = node.kind?.toLowerCase();
    if (kind === 'entrypoint' || ['route', 'api', 'command'].includes(label)) return 1.25;
    if (label === 'project') return 1.15;
    if (['class', 'function'].includes(label)) return 1.1;
    if (label === 'file') return 1;
    if (label === 'package') return 0.9;
    if (label === 'directory') return 0.75;
    if (label === 'constant') return 0.85;
    return 1;
  }

  private inferKnowledgeEdgeWeight(edge: KnowledgeEdge): number {
    const type = edge.type.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    switch (type) {
      case 'http_calls':
      case 'calls':
      case 'uses':
        return 1.2;
      case 'imports':
      case 'depends_on':
        return 1.05;
      case 'defines':
        return 0.95;
      case 'contains':
        return 0.7;
      default:
        return 1;
    }
  }

  private normalizeKnowledgeLinkType(type: string, prefix: string): string {
    const normalized = type.trim().toLowerCase().replace(/[^a-z0-9_:-]+/g, '_').replace(/^_+|_+$/g, '');
    if (!prefix) return normalized || 'related';
    return `${prefix}:${normalized || 'related'}`;
  }

  /**
   * Return a first-class memory health report with concrete maintenance actions.
   * Use this before long-running sessions, releases, or agent handoffs to decide
   * whether to snapshot, consolidate, dedupe, enrich metadata, or pack context.
   */
  async health(options?: MemoryHealthOptions): Promise<MemoryHealthResponse> {
    const opts = memoryHealthOptionsSchema.parse(options ?? {});
    const checkedAt = Date.now();
    const scope = { agentId: this._agentId, userId: this._userId };
    const [coreEntries, layerEntries, snapshots, stats] = await Promise.all([
      this._store.getAllEntries(scope),
      this._store.loadAllLayerEntries(scope),
      this._store.listSnapshots(scope),
      this.stats(),
    ]);

    const allEntries = [...coreEntries, ...layerEntries];
    const checks: MemoryHealthCheck[] = [];
    const recommendations: MemoryHealthRecommendation[] = [];

    const addRecommendation = (
      priority: MemoryHealthRecommendation['priority'],
      action: string,
      reason: string,
      command?: string
    ) => {
      recommendations.push({ priority, action, reason, ...(command ? { command } : {}) });
    };

    if (allEntries.length === 0) {
      checks.push({
        name: 'memory-volume',
        status: 'warn',
        detail: 'No memories are stored in this scope yet.',
        value: 0,
        action: 'Store durable user, project, or procedure memories before relying on recall.',
        command: 'remem store --content "..." --topics ...',
      });
      addRecommendation('medium', 'seed-memory', 'The memory scope is empty, so recall and context packs have nothing durable to work with.', 'remem store --content "..." --topics ...');
    } else {
      checks.push({
        name: 'memory-volume',
        status: 'pass',
        detail: `${allEntries.length} memories available in this scope.`,
        value: allEntries.length,
      });
    }

    const newestSnapshotAt = snapshots.reduce<number | null>((latest, snapshot) => (
      latest === null ? snapshot.createdAt : Math.max(latest, snapshot.createdAt)
    ), null);
    const snapshotAgeMs = newestSnapshotAt === null ? null : checkedAt - newestSnapshotAt;
    if (allEntries.length >= opts.minSnapshotMemories && snapshots.length === 0) {
      checks.push({
        name: 'snapshot-coverage',
        status: 'warn',
        detail: `${allEntries.length} memories exist but no snapshot has been created.`,
        value: snapshots.length,
        action: 'Create a recovery checkpoint before more writes or a release.',
        command: 'remem snapshots --action create --label before-maintenance',
      });
      addRecommendation('high', 'create-snapshot', 'There is enough memory state to deserve a restore point.', 'remem snapshots --action create --label before-maintenance');
    } else if (snapshotAgeMs !== null && snapshotAgeMs > opts.maxSnapshotAgeMs) {
      checks.push({
        name: 'snapshot-freshness',
        status: 'warn',
        detail: `Newest snapshot is ${Math.round(snapshotAgeMs / 3_600_000)}h old.`,
        value: snapshotAgeMs,
        action: 'Create a fresh snapshot before maintenance or deployment.',
        command: 'remem snapshots --action create --label fresh-checkpoint',
      });
      addRecommendation('medium', 'refresh-snapshot', 'The latest snapshot is older than the configured freshness window.', 'remem snapshots --action create --label fresh-checkpoint');
    } else {
      checks.push({
        name: 'snapshot-coverage',
        status: 'pass',
        detail: snapshots.length ? `${snapshots.length} snapshot(s), newest checkpoint is current enough.` : 'Snapshot not required yet for this memory volume.',
        value: snapshots.length,
      });
    }

    const duplicateGroups = this.findDuplicateGroups(allEntries, opts.duplicateSampleLimit);
    if (duplicateGroups.length > 0) {
      checks.push({
        name: 'duplicate-content',
        status: 'warn',
        detail: `${duplicateGroups.length} exact duplicate content group(s) found.`,
        value: duplicateGroups.map((group) => ({ content: group.content, count: group.ids.length, ids: group.ids })),
        action: 'Run consolidation to merge duplicate or repeated memories.',
        command: 'remem consolidate --summaries',
      });
      addRecommendation('medium', 'consolidate-duplicates', 'Repeated memories make retrieval noisier and waste context budget.', 'remem consolidate --summaries');
    } else {
      checks.push({
        name: 'duplicate-content',
        status: 'pass',
        detail: 'No exact duplicate content groups found.',
        value: 0,
      });
    }

    const staleEntries = allEntries.filter((entry) => {
      const lastTouched = entry.accessedAt || entry.createdAt;
      return entry.accessCount === 0 && lastTouched < checkedAt - opts.staleAgeMs;
    });
    if (staleEntries.length > 0) {
      checks.push({
        name: 'stale-unaccessed',
        status: 'warn',
        detail: `${staleEntries.length} memories have never been recalled and are older than the stale window.`,
        value: staleEntries.slice(0, 10).map((entry) => entry.id),
        action: 'Review stale memories and consolidate or prune low-value entries.',
        command: 'remem context-pack --query "What stale memories still matter?" --profile deep',
      });
      addRecommendation('low', 'review-stale-memory', 'Old unaccessed memories may be useful, but they should be reviewed before they become dead weight.', 'remem context-pack --query "What stale memories still matter?" --profile deep');
    } else {
      checks.push({
        name: 'stale-unaccessed',
        status: 'pass',
        detail: 'No stale never-recalled memories found.',
        value: 0,
      });
    }

    const untaggedEntries = allEntries.filter((entry) => entry.topics.length === 0);
    const untaggedRatio = allEntries.length ? untaggedEntries.length / allEntries.length : 0;
    if (untaggedRatio > opts.maxUntaggedRatio) {
      checks.push({
        name: 'topic-coverage',
        status: 'warn',
        detail: `${untaggedEntries.length}/${allEntries.length} memories have no topics.`,
        value: { untagged: untaggedEntries.length, ratio: untaggedRatio },
        action: 'Add topics to improve filtered recall and context-pack quality.',
      });
      addRecommendation('medium', 'improve-topic-coverage', 'Too many untagged memories reduce precision for scoped recall.');
    } else {
      checks.push({
        name: 'topic-coverage',
        status: 'pass',
        detail: `${untaggedEntries.length}/${allEntries.length} memories are untagged.`,
        value: { untagged: untaggedEntries.length, ratio: untaggedRatio },
      });
    }

    const layerStats = stats.layers;
    const pressuredLayers = layerStats
      ? Object.entries(layerStats).filter(([, layer]) => layer.maxEntries > 0 && layer.count / layer.maxEntries >= 0.8)
      : [];
    if (pressuredLayers.length > 0) {
      checks.push({
        name: 'layer-pressure',
        status: 'warn',
        detail: pressuredLayers.map(([layer, value]) => `${layer} ${value.count}/${value.maxEntries}`).join(', '),
        value: Object.fromEntries(pressuredLayers),
        action: 'Run consolidation or compression before TTL/size pressure drops signal.',
        command: 'remem consolidate --summaries --procedural',
      });
      addRecommendation('high', 'relieve-layer-pressure', 'One or more long-memory layers are near capacity.', 'remem consolidate --summaries --procedural');
    } else {
      checks.push({
        name: 'layer-pressure',
        status: 'pass',
        detail: layerStats ? 'Layer capacity is below the pressure threshold.' : 'Layer stats unavailable.',
        value: layerStats,
      });
    }

    let score = 100;
    for (const check of checks) {
      if (check.status === 'fail') score -= 30;
      if (check.status === 'warn') score -= check.name === 'snapshot-coverage' || check.name === 'layer-pressure' ? 15 : 10;
    }
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      status: score >= 85 ? 'healthy' : score >= 65 ? 'watch' : 'attention',
      checkedAt,
      checks,
      recommendations: recommendations.sort((a, b) => this.recommendationRank(b.priority) - this.recommendationRank(a.priority)),
      stats: {
        coreCount: stats.coreCount,
        layerCount: stats.layerCount,
        snapshotCount: stats.snapshotCount,
        eventCount: stats.eventCount,
        duplicateGroups: duplicateGroups.length,
        staleCount: staleEntries.length,
        untaggedCount: untaggedEntries.length,
      },
    };
  }

  private findDuplicateGroups(entries: Array<QueryResult | LayeredMemoryEntry>, limit: number) {
    const groups = new Map<string, { content: string; ids: string[] }>();
    for (const entry of entries) {
      const key = entry.content.trim().replace(/\s+/g, ' ').toLowerCase();
      if (!key) continue;
      const group = groups.get(key) ?? { content: entry.content, ids: [] };
      group.ids.push(entry.id);
      groups.set(key, group);
    }
    return [...groups.values()]
      .filter((group) => group.ids.length > 1)
      .sort((a, b) => b.ids.length - a.ids.length || a.content.localeCompare(b.content))
      .slice(0, limit);
  }

  private recommendationRank(priority: MemoryHealthRecommendation['priority']) {
    return { high: 3, medium: 2, low: 1 }[priority];
  }

  /**
   * Get entries by topic.
   */
  async getByTopic(topic: string, limit: number = 20): Promise<QueryResult[]> {
    return this._store.getByTopic(topic, limit, {
      agentId: this._agentId,
      userId: this._userId,
    });
  }

  async storeShared(input: StoreMemoryInput & { namespace: NamespaceInput; visibility?: 'private' | 'shared' }): Promise<void> {
    const { namespace: rawNamespace, visibility: rawVisibility, ...rest } = input;
    const namespace = this.normalizeNamespace(rawNamespace);
    const visibility = rawVisibility ?? 'shared';
    const topics = Array.from(new Set([...(rest.topics ?? []), ...this.namespaceTopicTrail(namespace)]));

    await this.store({
      content: rest.content,
      topics,
      metadata: {
        ...(rest.metadata ?? {}),
        namespace,
        visibility,
      },
    });
  }

  getRecallProfiles(): SmartRecallProfileDescriptor[] {
    return getSmartRecallProfiles();
  }

  getRecallProfile(profile: SmartRecallProfile): SmartRecallProfileDescriptor {
    return getSmartRecallProfile(profile);
  }

  async queryNamespace(
    namespace: NamespaceInput,
    query: string,
    options?: QueryOptions,
    scope?: NamespaceQueryScope
  ): Promise<QueryResponse> {
    const normalizedNamespace = this.normalizeNamespace(namespace);
    const parsedScope = namespaceQueryScopeSchema.parse(scope ?? {});
    const topics = parsedScope.includeDescendants
      ? options?.topics
      : Array.from(new Set([...(options?.topics ?? []), normalizedNamespace]));
    const queryOptions = queryWithNeighborsOptionsSchema.pick({
      limit: true,
      topics: true,
      metadata: true,
      minAccessCount: true,
      since: true,
      until: true,
    }).parse({
      ...(options ?? {}),
      ...(topics ? { topics } : {}),
      metadata: this.buildScopedMetadataFilters(parsedScope, normalizedNamespace, options?.metadata),
    });
    return this.query(query, queryOptions);
  }

  async getRecentInNamespace(
    namespace: NamespaceInput,
    n: number = 10,
    scope?: NamespaceQueryScope
  ): Promise<QueryResult[]> {
    const normalizedNamespace = this.normalizeNamespace(namespace);
    const recent = await this.getRecent(Math.max(n * 3, n));
    const filters = this.buildScopedMetadataFilters(scope, normalizedNamespace);

    return recent
      .filter((entry) => this._store.matchMetadata ? this._store.matchMetadata(entry.metadata ?? {}, filters ?? {}) : true)
      .slice(0, n);
  }

  /**
   * Recursive query — RLM-style iterative refinement.
   */
  async recursiveQuery(
    initialQuery: string,
    maxDepth?: number
  ): Promise<{ answer: string; memories: QueryResult[] }> {
    return this.engine.recursiveQuery(initialQuery, maxDepth ?? 3);
  }

  /**
   * RLM-style Memory REPL — navigate memory programmatically.
   *
   * The model writes JavaScript to navigate the memory store. This enables
   * arbitrarily large memory stores without context window overflow — the model
   * never sees all memory at once, only constant-size metadata about what it
   * has observed.
   *
   * Requires: model configured.
   * Optional: layers enabled (enables layer-aware navigation).
   *
   * @returns { answer: string, observations: REPL debug trace }
   */
  async replNavigate(query: string): Promise<{ answer: string; observations: unknown[] }> {
    if (!this.model) {
      // Fall back to direct query
      const { results } = await this.query(query);
      return {
        answer: results.length > 0
          ? `No LLM configured — used direct query. Found ${results.length} results:\n` +
            results.slice(0, 5).map((r) => `- ${r.content}`).join('\n')
          : 'No LLM configured and no direct query results.',
        observations: [],
      };
    }

    const repl = new MemoryREPL({
      store: this._store,
      layers: this.layers,
      model: this.model,
      maxDepth: 5,
      maxResults: 20,
    });

    return repl.navigate(query);
  }

  // ─── Identity Layer ───────────────────────────────────────────────────────

  /**
   * Enable identity layer with optional constitution import.
   */
  enableIdentity(config?: {
    constitutionTexts?: Array<{ text: string; source: string }>;
    autoInject?: boolean;
    evalModel?: ModelAbstraction['config'];
  }): void {
    const identityConfig = {
      autoInject: config?.autoInject ?? true,
      evalModel: config?.evalModel ?? (this.model ? this.model.config : undefined),
      driftThreshold: 0.3,
      criticalThreshold: 0.7,
    };

    this.identity = createIdentitySystem(identityConfig);
    this._identityEnabled = true;

    // Import constitution texts
    if (config?.constitutionTexts) {
      for (const { text, source } of config.constitutionTexts) {
        this.identity.constitution.importFromText(text, source);
      }
    }
  }

  /**
   * Add an identity statement.
   */
  addIdentityStatement(
    text: string,
    category: ConstitutionStatement['category'],
    weight?: number
  ): ConstitutionStatement | null {
    if (!this.identity) return null;
    return this.identity.constitution.addStatement(text, category, weight);
  }

  /**
   * Import identity constitution from text (e.g., SOUL.md content).
   */
  importConstitution(text: string, source: string): number {
    if (!this.identity) {
      this.enableIdentity();
    }
    return this.identity!.constitution.importFromText(text, source);
  }

  /**
   * Detect identity drift in the current session context.
   */
  async detectDrift(sessionText: string): Promise<DriftResult> {
    if (!this.identity) {
      return {
        score: 0,
        level: 'aligned',
        violatingStatements: [],
        reasoning: 'Identity layer not enabled.',
        detectedAt: Date.now(),
      };
    }
    return this.identity.detector.detectDrift(sessionText, { method: 'both' });
  }

  async auditIdentityAlignment(sessionText: string): Promise<{
    drift: DriftResult;
    injection: string;
    topStatements: ConstitutionStatement[];
  }> {
    const drift = await this.detectDrift(sessionText);
    return {
      drift,
      injection: this.getConstitutionInjection(drift),
      topStatements: drift.violatingStatements.slice(0, 5),
    };
  }

  /**
   * Get constitution injection block if drift is detected.
   * Use this to prepend correction context to LLM messages.
   */
  getConstitutionInjection(drift: DriftResult): string {
    if (!this.identity) return '';
    if (drift.level === 'aligned') return '';
    return this.identity.injector.buildInjection(drift);
  }

  /**
   * Get all identity statements.
   */
  getIdentityStatements(category?: ConstitutionStatement['category']): ConstitutionStatement[] {
    if (!this.identity) return [];
    return this.identity.constitution.getStatements(category);
  }

  /**
   * Check if identity layer is enabled.
   */
  isIdentityEnabled(): boolean {
    return this._identityEnabled;
  }

  // ─── Hierarchical Layers ─────────────────────────────────────────────────

  /**
   * Enable hierarchical memory layers (episodic / semantic / identity).
   * Layers are persisted to SQLite — they survive process restarts.
   */
  async enableLayers(config?: Partial<LayerConfig>): Promise<void> {
    this._layerConfig = config ?? this._layerConfig;
    // Wire EmbeddingService into LayerManager if available
    this.layers = new LayerManager(this._layerConfig ?? DEFAULT_LAYER_CONFIG, this.embeddingService);
    this._layersEnabled = true;

    // Restore persisted layer entries from SQLite after init
    if (this._store) {
      try {
        const storeOpts = { agentId: this._agentId, userId: this._userId };
        const persisted = await this._store.loadAllLayerEntries(storeOpts);
        for (const entry of persisted) {
          this.layers.restoreEntry(entry);
        }
        if (persisted.length > 0) {
          console.log(`[ReMEM] Restored ${persisted.length} persisted layer entries from SQLite`);
        }

        // Restore entry embeddings from SQLite
        if (this.embeddingService) {
          for (const entry of persisted) {
            try {
              const stored = await this._store.getEmbedding(entry.id);
              if (stored) {
                const vector = EmbeddingService.decodeVector(stored.base64, stored.dimension);
                this.layers.setEntryEmbedding(entry.id, vector);
              }
            } catch {
              // Best-effort embedding restore
            }
          }
        }
      } catch {
        // Layer restore is best-effort — don't fail init if it breaks
      }
    }

    // Auto-compress episodic if over capacity after restore
    if (this.needsEpisodicCompression() && this.model) {
      this.compressEpisodic(20).catch(() => {/* best-effort */});
    }
  }

  /**
   * Store in a specific layer.
   */
  async storeInLayer(input: StoreMemoryInput, layer: MemoryLayer): Promise<QueryResult | null> {
    const normalized = storeMemoryInputSchema.parse(input);

    if (!this.layers) {
      await this.enableLayers();
    }
    const entry = this.layers!.store(normalized, layer);
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId,
    });

    // Generate embedding and store in LayerManager for hybrid layer scoring
    if (this.embeddingService) {
      const contentToEmbed = normalized.topics.length > 0
        ? `[${normalized.topics.join(', ')}] ${normalized.content}`
        : normalized.content;

      this.embeddingService
        .generateEmbedding(entry.id, contentToEmbed)
        .then(async (emb) => {
          await this._store.storeEmbedding(entry.id, emb.base64, emb.vector.length, emb.model);
          this.layers!.setEntryEmbedding(entry.id, emb.vector);
        })
        .catch((err) => console.warn(`[ReMEM] Layer embedding failed for ${entry.id}: ${err}`));
    }

    // Check episodic capacity — auto-compress if needed
    if (this.needsEpisodicCompression() && this.model) {
      this.compressEpisodic(20).catch(() => {/* best-effort */});
    }

    return {
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      metadata: entry.metadata,
      relevanceScore: entry.importance,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
    };
  }

  /**
   * Query across layers with weighted retrieval.
   * Uses hybrid scoring (keyword + semantic embeddings) when embedding service is available.
   */
  async queryLayers(
    query: string,
    options?: QueryOptions & { layers?: MemoryLayer[] }
  ): Promise<Awaited<ReturnType<LayerManager['query']>> | null> {
    if (!this.layers) return null;
    return this.layers.query(query, options);
  }

  /**
   * Get layer stats.
   */
  getLayerStats(): ReturnType<LayerManager['getStats']> | null {
    if (!this.layers) return null;
    return this.layers.getStats();
  }

  /**
   * Evict expired entries from all layers.
   */
  evictExpiredLayers(): number {
    if (!this.layers) return 0;
    return this.layers.evictExpired();
  }

  /**
   * Check if episodic layer needs compression.
   * Returns true when episodic is above 80% capacity.
   */
  needsEpisodicCompression(): boolean {
    if (!this.layers) return false;
    const stats = this.layers.getStats();
    const episodic = stats.episodic;
    return episodic.count > episodic.maxEntries * 0.8;
  }

  /**
   * Compress oldest episodic entries into semantic summaries.
   * Call this when episodic layer fills up — uses the LLM to summarize
   * old entries rather than losing them to TTL eviction.
   *
   * @param count How many episodic entries to compress (default: 20)
   * @returns compressed entry info, or null if layers/llm not available
   */
  async compressEpisodic(count: number = 20): Promise<{
    compressedEntryId: string;
    summary: string;
    entriesEvicted: number;
  } | null> {
    if (!this.layers || !this.model) return null;

    const entries = this.layers.getEntriesForCompression(count);
    if (entries.length === 0) return null;

    const result = await this.layers.compressToSemantic(entries, this.model);
    if (!result) return null;

    // Persist the compressed entry to SQLite
    await this._store.persistLayerEntry(result.compressedEntry, {
      agentId: this._agentId,
      userId: this._userId,
    });
    for (const entry of entries) {
      await this._store.forgetLayerEntry(entry.id);
    }

    return {
      compressedEntryId: result.compressedEntry.id,
      summary: result.compressedEntry.content,
      entriesEvicted: result.entriesEvicted,
    };
  }

  /**
   * Store a procedural memory — a behavior/rule triggered by a keyword.
   * Use when you learn a rule like "when X happens, always do Y".
   */
  async storeProcedural(input: StoreMemoryInput, trigger: string | Partial<ProceduralTrigger>): Promise<QueryResult | null> {
    if (!this.layers) {
      await this.enableLayers();
    }
    const entry = this.layers!.storeProcedural(input, trigger);
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId,
    });
    return {
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      metadata: entry.metadata,
      relevanceScore: entry.importance,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
    };
  }

  /**
   * Fire procedural rules matching the given context.
   * Returns rules whose trigger keyword appears in the context.
   */
  fireProcedural(context: string): QueryResult[] {
    return this.matchProcedural(context).map((match) => ({
      id: match.entry.id,
      content: match.entry.content,
      topics: match.entry.topics,
      metadata: match.entry.metadata,
      relevanceScore: match.score,
      createdAt: match.entry.createdAt,
      accessedAt: match.entry.accessedAt,
      accessCount: match.entry.accessCount,
    }));
  }

  matchProcedural(context: string): ProceduralMatch[] {
    if (!this.layers) return [];
    return this.layers.matchProcedural(context);
  }

  /**
   * Get the temporal history of an entry — trace its supersession chain.
   * Returns all versions from newest to oldest.
   */
  getTemporalHistory(entryId: string): QueryResult[] {
    if (!this.layers) return [];

    const history: QueryResult[] = [];
    let current = this.layers.get(entryId);

    if (!current) return [];

    // Walk the supersession chain backward (newest to oldest)
    while (current) {
      history.push({
        id: current.id,
        content: current.content,
        topics: current.topics,
        metadata: current.metadata,
        relevanceScore: current.importance,
        createdAt: current.createdAt,
        accessedAt: current.accessedAt,
        accessCount: current.accessCount,
      });
      const nextId: string | undefined = current.supersededBy ?? undefined;
      current = nextId ? this.layers.get(nextId) ?? null : null;
    }

    return history;
  }

  /**
   * Check if layers are enabled.
   */
  isLayersEnabled(): boolean {
    return this._layersEnabled;
  }

  // ─── Snapshots (for long-running agent persistence) ───────────────────────

  /**
   * Create a named snapshot of current memory state.
   * Essential for long-running agents — take a snapshot before restarts.
   * @param label Human-readable label for this snapshot
   */
  async createSnapshot(label: string): Promise<{
    id: string;
    label: string;
    createdAt: number;
    memoryCount: number;
    layerCounts: Record<string, number>;
    checksum: string | null;
  }> {
    const meta = await this._store.createSnapshot(label, {
      agentId: this._agentId,
      userId: this._userId,
    });
    return meta;
  }

  /**
   * Restore from a snapshot by ID.
   * Verifies checksum, then restores core and layered entries from the snapshot into the current store.
   * @returns Number of entries restored
   */
  async restoreSnapshot(snapshotId: string): Promise<number> {
    const restored = await this._store.restoreSnapshot(snapshotId, {
      agentId: this._agentId,
      userId: this._userId,
    });
    if (this._layersEnabled) {
      await this.enableLayers(this._layerConfig);
    }
    return restored;
  }

  /**
   * List available snapshots.
   */
  async listSnapshots(): Promise<Array<{
    id: string;
    label: string;
    createdAt: number;
    memoryCount: number;
    checksum: string | null;
  }>> {
    const snapshots = await this._store.listSnapshots({
      agentId: this._agentId,
      userId: this._userId,
    });
    return snapshots.map((s) => ({
      id: s.id,
      label: s.label,
      createdAt: s.createdAt,
      memoryCount: s.memoryCount,
      checksum: s.checksum,
    }));
  }

  /**
   * Export a snapshot as portable JSON.
   */
  async exportSnapshot(snapshotId: string) {
    return this._store.exportSnapshot(snapshotId);
  }

  /**
   * Import a portable snapshot JSON export.
   */
  async importSnapshot(snapshot: Awaited<ReturnType<MemoryStoreLike['exportSnapshot']>>, opts?: { overwrite?: boolean }) {
    return this._store.importSnapshot(snapshot, opts);
  }

  /**
   * Delete a snapshot.
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    return this._store.deleteSnapshot(snapshotId);
  }

  // ─── Identity Duplication & Infection ──────────────────────────────────────

  /**
   * Export and upload the agent's identity package to DARKSOL server.
   * This backs up all memories, constitution statements, and optionally
   * SOUL/IDENTITY text to the DARKSOL cloud.
   *
   * Usage:
   * ```
   * const result = await memory.duplicate({
   *   serverUrl: 'https://api.darksol.net',
   *   apiKey: 'your-api-key',
   *   soulText: soulMdContent,
   *   identityText: identityMdContent,
   * });
   * console.log(`Uploaded ${result.memoryCount} memories`);
   * ```
   */
  async duplicate(config: {
    serverUrl: string;
    apiKey: string;
    soulText?: string;
    identityText?: string;
    includeSoul?: boolean;
    includeIdentity?: boolean;
    includeAllLayers?: boolean;
    layers?: Array<'episodic' | 'semantic' | 'identity' | 'procedural'>;
  }): Promise<DuplicateResult> {
    return duplicate({
      store: this._store,
      layers: this.layers,
      identity: this.identity,
      soulText: config.soulText,
      identityText: config.identityText,
      config: {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        includeSoul: config.includeSoul ?? true,
        includeIdentity: config.includeIdentity ?? true,
        includeAllLayers: config.includeAllLayers ?? true,
        layers: config.layers,
        agentId: this._agentId,
        userId: this._userId,
      } as import('./types.js').DuplicationConfig,
    });
  }

  /**
   * Build an identity package locally without uploading.
   * Useful for previewing what would be exported.
   */
  async buildIdentityPackageLocal(config: {
    soulText?: string;
    identityText?: string;
    includeSoul?: boolean;
    includeIdentity?: boolean;
    includeAllLayers?: boolean;
    layers?: Array<'episodic' | 'semantic' | 'identity' | 'procedural'>;
  }): Promise<import('./types.js').IdentityPackage> {
    return buildIdentityPackage({
      store: this._store,
      layers: this.layers,
      identity: this.identity,
      soulText: config.soulText,
      identityText: config.identityText,
      config: {
        serverUrl: 'http://localhost', // not used for local build
        apiKey: 'local-only',
        includeSoul: config.includeSoul ?? true,
        includeIdentity: config.includeIdentity ?? true,
        includeAllLayers: config.includeAllLayers ?? true,
        layers: config.layers,
        agentId: this._agentId,
        userId: this._userId,
      } as import('./types.js').DuplicationConfig,
    });
  }

  /**
   * Pull an identity package from DARKSOL server and infect this ReMEM instance.
   * Requires live connection — if the server is unreachable, throws.
   * Infected agents gain the source identity's constitution and memories.
   *
   * Usage:
   * ```
   * const result = await memory.infect({
   *   serverUrl: 'https://api.darksol.net',
   *   apiKey: 'your-api-key',
   *   layers: ['identity', 'procedural'],
   * });
   * ```
   */
  async infect(config: {
    serverUrl: string;
    apiKey: string;
    sourceAgentId?: string;
    version?: string;
    refreshIntervalMs?: number;
    layers?: Array<'identity' | 'semantic' | 'procedural'>;
  }): Promise<InfectionResult> {
    return infectFromServer({
      store: this._store,
      layers: this.layers,
      identity: this.identity,
      config: {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        sourceAgentId: config.sourceAgentId,
        version: config.version,
        refreshIntervalMs: config.refreshIntervalMs ?? 0,
        layers: config.layers ?? ['identity'],
      },
    });
  }

  /**
   * Download identity package without applying it (preview).
   */
  async fetchIdentityPackage(config: {
    serverUrl: string;
    apiKey: string;
    sourceAgentId?: string;
    version?: string;
  }): Promise<import('./types.js').IdentityPackage> {
    return downloadPackage({
      serverUrl: config.serverUrl,
      apiKey: config.apiKey,
      sourceAgentId: config.sourceAgentId,
      version: config.version,
    } as import('./types.js').InfectionConfig);
  }

  // ─── Utilities ───────────────────────────────────────────────────────────

  /**
   * Get the underlying MemoryStore for advanced operations.
   */
  getStore(): MemoryStoreLike {
    return this._store;
  }

  /**
   * Get the model name if configured.
   */
  getModelName(): string | undefined {
    return this.model?.name();
  }

  /**
   * Get the configured model client for advanced workflows.
   */
  getModel(): ModelAbstraction | undefined {
    return this.model;
  }

  /**
   * Run a first-class consolidation workflow: dedupe, conflict resolution,
   * promotion, optional summary generation, and optional procedural promotion.
   */
  async runConsolidation(options: ConsolidationWorkflowOptions = {}): Promise<ConsolidationWorkflowResult> {
    if (!this.layers) {
      await this.enableLayers();
    }
    const consolidator = new MemoryConsolidator(this, this.embeddingService ?? null, options);
    return consolidator.runWorkflow(options);
  }

  /**
   * Close the memory store and release resources.
   */
  close(): void {
    this._store.close();
  }
}

// Re-export everything
export { MemoryStore } from './store.js';
export { PostgresMemoryStore } from './postgres-store.js';
export type {
  MemoryStoreLike,
  SnapshotExport,
  SnapshotMeta,
  StorageMaintenanceOptions,
  StorageMaintenanceResult,
  StoreMemoryOptions,
} from './storage-types.js';
export { ModelAbstraction } from './model.js';
export { QueryEngine } from './query.js';
export { MemoryREPL } from './repl.js';
export { HttpAdapter } from './http.js';
export { MemoryConsolidator } from './consolidate.js';
export { EpisodicCapturePipeline } from './episodic-capture.js';
export { normalizeSmartRecallProfileInput, resolveSmartRecallProfile } from './recall-profiles.js';
export {
  createVercelAIAdapter,
  createHermesAdapter,
  createLangGraphStoreAdapter,
  createOpenClawAdapter,
  createCodebaseMemoryAdapter,
} from './adapters.js';
export type {
  CodebaseGraphAsMemoryOptions,
  CodebaseGraphConnection,
  CodebaseGraphDisplayType,
  CodebaseGraphInventoryOptions,
  CodebaseGraphMemorySnapshot,
  CodebaseGraphNodeHealth,
  CodebaseGraphOwnerSummary,
  CodebaseGraphQueryOptions,
  CodebaseGraphSubgraph,
  CodebaseSubgraphOptions,
  ReMEMAdapterOptions,
} from './adapters.js';
export * from './types.js';
export * from './identity.js';
export * from './layers.js';
export * from './duplicate.js';
