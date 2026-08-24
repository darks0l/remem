/**
 * ReMEM — HTTP Adapter
 * Framework-agnostic HTTP interface for remote memory access
 */

import type {
  DriftResult,
  NamespaceInput,
  NamespaceQueryScope,
  NeighborPath,
  ProceduralMatch,
  QueryOptions,
  QueryResponse,
  QueryResult,
  QueryWithNeighborsOptions,
  MemoryHealthOptions,
  KnowledgeArtifactRegistration,
  KnowledgeGraphArtifact,
  KnowledgeIngestOptions,
  RememberInput,
  RememberResult,
} from './types.js';
import {
  contextPackOptionsSchema,
  knowledgeArtifactRegistrationSchema,
  knowledgeGraphArtifactSchema,
  knowledgeIngestOptionsSchema,
  namespaceInputSchema,
  namespaceQueryScopeSchema,
  queryWithNeighborsOptionsSchema,
  rememberInputSchema,
  smartRecallOptionsSchema,
  storeMemoryInputSchema,
} from './types.js';
import type { MemoryStoreLike, StorageMaintenanceOptions, StorageMaintenanceResult } from './storage-types.js';
import { ModelAbstraction } from './model.js';
import { QueryEngine } from './query.js';
import { resolveSmartRecallProfile } from './recall-profiles.js';

export interface AdvancedMemoryRuntime {
  store?(input: import('./types.js').StoreMemoryInput): Promise<import('./types.js').MemoryEntry>;
  query?(query: string, options?: QueryOptions): Promise<QueryResponse>;
  getRecent?(n?: number): Promise<QueryResult[]>;
  getByTopic?(topic: string, limit?: number): Promise<QueryResult[]>;
  createSnapshot?(label: string): Promise<unknown>;
  listSnapshots?(): Promise<unknown[]>;
  exportSnapshot?(snapshotId: string): Promise<unknown>;
  importSnapshot?(snapshot: unknown, opts?: { overwrite?: boolean }): Promise<unknown>;
  restoreSnapshot?(snapshotId: string): Promise<number>;
  deleteSnapshot?(snapshotId: string): Promise<boolean>;
  remember(input: RememberInput): Promise<RememberResult>;
  queryWithNeighbors(query: string, options?: QueryWithNeighborsOptions): Promise<QueryResponse & { linksTraversed: number; paths?: NeighborPath[] }>;
  smartRecall(query: string, options?: import('./types.js').SmartRecallOptions): Promise<import('./types.js').SmartRecallResponse>;
  contextPack(query: string, options?: import('./types.js').ContextPackOptions): Promise<import('./types.js').ContextPackResponse>;
  getRecallProfiles(): Array<import('./types.js').SmartRecallProfileDescriptor>;
  getRecallProfile(profile: import('./types.js').SmartRecallProfile): import('./types.js').SmartRecallProfileDescriptor;
  health(options?: MemoryHealthOptions): Promise<import('./types.js').MemoryHealthResponse>;
  storageMaintenance(options?: StorageMaintenanceOptions): Promise<StorageMaintenanceResult>;
  registerKnowledgeArtifact(input: KnowledgeArtifactRegistration): Promise<import('./types.js').KnowledgeArtifactRegistrationResult>;
  ingestKnowledgeGraph(graph: KnowledgeGraphArtifact, options?: KnowledgeIngestOptions): Promise<import('./types.js').KnowledgeIngestResult>;
  knowledgeOverview(options?: { project?: string; limit?: number; resourceGrant?: import('./types.js').KnowledgeResourceGrant }): Promise<unknown>;
  knowledgeSubgraph(query: string, options?: import('./adapters.js').CodebaseSubgraphOptions): Promise<import('./adapters.js').CodebaseGraphSubgraph>;
  knowledgeExplain(query: string, options?: import('./adapters.js').CodebaseSubgraphOptions): Promise<import('./adapters.js').CodebaseGraphSubgraph & { summary: string }>;
  knowledgeEntrypoints(options?: { project?: string; limit?: number; nodeLabels?: string[]; owners?: string[]; resourceGrant?: import('./types.js').KnowledgeResourceGrant }): Promise<import('./adapters.js').CodebaseGraphNodeHealth[]>;
  knowledgeOwners(options?: { project?: string; limit?: number; nodeLabels?: string[]; owners?: string[]; resourceGrant?: import('./types.js').KnowledgeResourceGrant }): Promise<import('./adapters.js').CodebaseGraphOwnerSummary[]>;
  knowledgeHotspots(options?: { project?: string; limit?: number; nodeLabels?: string[]; owners?: string[]; resourceGrant?: import('./types.js').KnowledgeResourceGrant }): Promise<import('./adapters.js').CodebaseGraphNodeHealth[]>;
  knowledgeDeadzones(options?: { project?: string; limit?: number; nodeLabels?: string[]; owners?: string[]; resourceGrant?: import('./types.js').KnowledgeResourceGrant }): Promise<import('./adapters.js').CodebaseGraphNodeHealth[]>;
  storeShared(input: import('./types.js').StoreMemoryInput & { namespace: NamespaceInput; visibility?: 'private' | 'shared' }): Promise<void>;
  queryNamespace(namespace: NamespaceInput, query: string, options?: QueryOptions, scope?: NamespaceQueryScope): Promise<QueryResponse>;
  getRecentInNamespace(namespace: NamespaceInput, n?: number, scope?: NamespaceQueryScope): Promise<QueryResult[]>;
  matchProcedural(context: string): ProceduralMatch[];
  auditIdentityAlignment(sessionText: string): Promise<{
    drift: DriftResult;
    injection: string;
    topStatements: Array<{ id: string; text: string; category: string; weight: number; source?: string; createdAt: number }>;
  }>;
  usesNativeVectorSearch(): boolean;
}

export interface HttpRequestScope {
  workspaceId?: string;
  agentId?: string;
  userId?: string;
  sessionId?: string;
  subject?: string;
  authToken?: string;
  method: string;
  path: string;
  headers: Record<string, string>;
}

export interface ResolvedHttpRuntime {
  store: MemoryStoreLike;
  model?: ModelAbstraction;
  memory?: AdvancedMemoryRuntime;
}

export interface HttpAdapterConfig {
  port?: number;
  host?: string;
  store: MemoryStoreLike;
  model?: ModelAbstraction;
  /** Optional full ReMEM runtime for advanced graph/procedural/identity routes. */
  memory?: AdvancedMemoryRuntime;
  /** Trust x-remem-* scope headers and expose them to runtimeResolver. */
  trustScopeHeaders?: boolean;
  /**
   * Resolve a request-scoped runtime from auth/session context.
   * This lets one HTTP adapter route requests into isolated ReMEM runtimes.
   */
  runtimeResolver?: (
    scope: HttpRequestScope,
    req: import('http').IncomingMessage
  ) => Promise<ResolvedHttpRuntime | null | undefined> | ResolvedHttpRuntime | null | undefined;
  /** Optional bearer token required for all non-OPTIONS requests. */
  authToken?: string;
  /** CORS origin. Defaults to localhost-only usage (no wildcard). */
  corsOrigin?: string;
  /** Max request body size in bytes. Default: 1MiB. */
  maxBodyBytes?: number;
}

interface RouteResult {
  status: number;
  body: unknown;
}

export class HttpAdapter {
  private server?: import('http').Server;
  private engine: QueryEngine;
  private store: MemoryStoreLike;
  private model?: ModelAbstraction;
  private memory?: AdvancedMemoryRuntime;
  private port: number;
  private host: string;
  private trustScopeHeaders: boolean;
  private runtimeResolver?: HttpAdapterConfig['runtimeResolver'];
  private authToken?: string;
  private corsOrigin: string;
  private maxBodyBytes: number;

  constructor(config: HttpAdapterConfig) {
    this.store = config.store;
    this.model = config.model;
    this.memory = config.memory;
    this.engine = new QueryEngine({ store: this.store, model: this.model });
    this.port = config.port ?? 8787;
    this.host = config.host ?? '127.0.0.1';
    this.trustScopeHeaders = config.trustScopeHeaders ?? false;
    this.runtimeResolver = config.runtimeResolver;
    this.authToken = config.authToken;
    this.corsOrigin = config.corsOrigin ?? 'http://localhost';
    this.maxBodyBytes = config.maxBodyBytes ?? 1024 * 1024;
  }

  async start(): Promise<void> {
    const http = await import('http');

    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${this.port}`);
      const method = req.method ?? 'GET';

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', this.corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-ReMEM-Workspace-Id, X-ReMEM-Agent-Id, X-ReMEM-User-Id, X-ReMEM-Session-Id, X-ReMEM-Subject'
      );

      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (!this.isAuthorized(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const result = await this.handleRequest(method, url, req);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      }
    });

    return new Promise((resolve) => {
      this.server!.listen(this.port, this.host, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }

  private async handleRequest(method: string, url: URL, req?: import('http').IncomingMessage): Promise<RouteResult> {
    const path = url.pathname;
    const runtime = await this.resolveRuntime(method, path, req);
    const engine = runtime.engine;
    const store = runtime.store;
    const memory = runtime.memory;
    const model = runtime.model;

    // POST /memory — store a new entry
    if (method === 'POST' && path === '/memory') {
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      if (!body) return { status: 400, body: { error: 'Empty request body' } };
      const input = storeMemoryInputSchema.parse(JSON.parse(body));
      if (memory?.store) await memory.store(input);
      else await engine.store(input);
      return { status: 201, body: { ok: true, message: 'Memory stored' } };
    }

    // POST /memory/remember — classified intake with scoring/dedupe
    if (method === 'POST' && path === '/memory/remember') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      if (!body) return { status: 400, body: { error: 'Empty request body' } };
      const input = rememberInputSchema.parse(JSON.parse(body));
      const result = await memory.remember(input);
      return { status: result.action === 'stored' ? 201 : 200, body: result };
    }

    // POST /memory/shared — store a shared/private namespaced entry
    if (method === 'POST' && path === '/memory/shared') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      if (!body) return { status: 400, body: { error: 'Empty request body' } };
      const parsed = JSON.parse(body) as Record<string, unknown>;
      const input = storeMemoryInputSchema.parse(parsed);
      const namespace = namespaceInputSchema.parse(parsed.namespace);
      const visibility = parsed.visibility === 'private' ? 'private' : 'shared';
      await memory.storeShared({ ...input, namespace, visibility });
      return { status: 201, body: { ok: true, message: 'Shared memory stored', namespace, visibility } };
    }

    // GET /memory — query memory
    if (method === 'GET' && path === '/memory') {
      const query = url.searchParams.get('q') ?? '';
      const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
      const topics = url.searchParams.get('topics')?.split(',').filter(Boolean);
      const minAccessCount = url.searchParams.get('minAccessCount');
      const metadata = url.searchParams.get('metadata');

      const options: QueryOptions = { limit };
      if (topics) options.topics = topics;
      if (minAccessCount) options.minAccessCount = parseInt(minAccessCount, 10);
      if (metadata) options.metadata = JSON.parse(metadata) as Record<string, string | number | boolean | null>;

      const result = memory?.query
        ? await memory.query(query, options)
        : await engine.query(query, options);
      return { status: 200, body: result };
    }

    // POST /memory/namespace/query — query within a namespace with visibility scope
    if (method === 'POST' && path === '/memory/namespace/query') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { namespace?: unknown; query?: unknown; options?: unknown; scope?: unknown } : {};
      if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
        return { status: 400, body: { error: 'query string required' } };
      }
      const namespace = namespaceInputSchema.parse(parsed.namespace);
      const scope = namespaceQueryScopeSchema.parse(parsed.scope ?? {});
      const options = parsed.options ? JSON.parse(JSON.stringify(parsed.options)) as QueryOptions : undefined;
      const result = await memory.queryNamespace(namespace, parsed.query, options, scope);
      return { status: 200, body: result };
    }

    // GET /memory/recent — get recent entries
    if (method === 'GET' && path === '/memory/recent') {
      const n = parseInt(url.searchParams.get('n') ?? '10', 10);
      const results = memory?.getRecent
        ? await memory.getRecent(n)
        : await engine.getRecent(n);
      return { status: 200, body: { results } };
    }

    // POST /memory/namespace/recent — get recent entries within a namespace
    if (method === 'POST' && path === '/memory/namespace/recent') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { namespace?: unknown; n?: unknown; scope?: unknown } : {};
      const namespace = namespaceInputSchema.parse(parsed.namespace);
      const scope = namespaceQueryScopeSchema.parse(parsed.scope ?? {});
      const n = typeof parsed.n === 'number' ? parsed.n : 10;
      const results = await memory.getRecentInNamespace(namespace, n, scope);
      return { status: 200, body: { results } };
    }

    // POST /memory/query-with-neighbors — graph-aware retrieval
    if (method === 'POST' && path === '/memory/query-with-neighbors') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { query?: unknown; options?: unknown } : {};
      if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
        return { status: 400, body: { error: 'query string required' } };
      }
      const options = queryWithNeighborsOptionsSchema.parse(parsed.options ?? {});
      const result = await memory.queryWithNeighbors(parsed.query, options);
      return { status: 200, body: result };
    }

    if (method === 'GET' && path === '/memory/recall-profiles') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      return { status: 200, body: { profiles: memory.getRecallProfiles() } };
    }

    if (method === 'GET' && path.startsWith('/memory/recall-profiles/')) {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      const profile = decodeURIComponent(path.split('/')[3] ?? '').trim();
      const resolvedProfile = resolveSmartRecallProfile(profile);
      const matched = resolvedProfile
        ? memory.getRecallProfiles().find((item) => item.profile === resolvedProfile)
        : undefined;
      if (!matched) {
        return { status: 404, body: { error: `Unknown recall profile: ${profile}` } };
      }
      return { status: 200, body: matched };
    }

    // POST /memory/smart-recall — fused semantic/graph/procedural/recent retrieval
    if (method === 'POST' && path === '/memory/smart-recall') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { query?: unknown; options?: unknown } : {};
      if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
        return { status: 400, body: { error: 'query string required' } };
      }
      const optionPayload = parsed.options && typeof parsed.options === 'object'
        ? {
            ...(parsed.options as Record<string, unknown>),
            ...(typeof (parsed.options as Record<string, unknown>).profile === 'string'
              ? { profile: resolveSmartRecallProfile((parsed.options as Record<string, unknown>).profile as string) ?? (parsed.options as Record<string, unknown>).profile }
              : {}),
          }
        : parsed.options ?? {};
      const options = smartRecallOptionsSchema.parse(optionPayload);
      const result = await memory.smartRecall(parsed.query, options);
      return { status: 200, body: result };
    }

    // POST /memory/context-pack — prompt-ready bounded recall packet
    if (method === 'POST' && path === '/memory/context-pack') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { query?: unknown; options?: unknown } : {};
      if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
        return { status: 400, body: { error: 'query string required' } };
      }
      const optionPayload = parsed.options && typeof parsed.options === 'object'
        ? {
            ...(parsed.options as Record<string, unknown>),
            ...(typeof (parsed.options as Record<string, unknown>).profile === 'string'
              ? { profile: resolveSmartRecallProfile((parsed.options as Record<string, unknown>).profile as string) ?? (parsed.options as Record<string, unknown>).profile }
              : {}),
          }
        : parsed.options ?? {};
      const options = contextPackOptionsSchema.parse(optionPayload);
      const result = await memory.contextPack(parsed.query, options);
      return { status: 200, body: result };
    }

    if ((method === 'GET' || method === 'POST') && path === '/memory/health') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      let options: MemoryHealthOptions | undefined;
      if (method === 'POST') {
        if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
        const body = await this.readBody(req);
        const parsed = body ? JSON.parse(body) as { options?: MemoryHealthOptions } : {};
        options = parsed.options;
      }
      const result = await memory.health(options);
      return { status: 200, body: result };
    }

    // POST /memory/procedural/match — evaluate procedural triggers against context
    if (method === 'POST' && path === '/storage/maintenance') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { options?: StorageMaintenanceOptions } : {};
      const result = await memory.storageMaintenance(parsed.options);
      return { status: 200, body: result };
    }

    // POST /knowledge/artifact - register a tool-owned external knowledge artifact
    if (method === 'POST' && path === '/knowledge/artifact') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const artifact = knowledgeArtifactRegistrationSchema.parse(body ? JSON.parse(body) : {});
      const result = await memory.registerKnowledgeArtifact(artifact);
      return { status: 201, body: result };
    }

    // POST /knowledge/ingest - import portable graph nodes/edges as ReMEM memories/links
    if (method === 'POST' && path === '/knowledge/ingest') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { graph?: unknown; options?: unknown } : {};
      const graph = knowledgeGraphArtifactSchema.parse(parsed.graph ?? parsed);
      const options = parsed.options ? knowledgeIngestOptionsSchema.parse(parsed.options) : undefined;
      const result = await memory.ingestKnowledgeGraph(graph, options);
      return { status: 201, body: result };
    }

    if (method === 'POST' && path === '/knowledge/overview') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { project?: unknown; limit?: unknown; resourceGrant?: unknown } : {};
      const result = await memory.knowledgeOverview({
        project: typeof parsed.project === 'string' && parsed.project.trim() ? parsed.project : undefined,
        limit: typeof parsed.limit === 'number' ? parsed.limit : undefined,
        resourceGrant: parsed.resourceGrant as import('./types.js').KnowledgeResourceGrant | undefined,
      });
      return { status: 200, body: result };
    }

    if (method === 'POST' && path === '/knowledge/subgraph') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { query?: unknown; options?: unknown } : {};
      if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
        return { status: 400, body: { error: 'query string required' } };
      }
      const result = await memory.knowledgeSubgraph(parsed.query, parsed.options as import('./adapters.js').CodebaseSubgraphOptions | undefined);
      return { status: 200, body: result };
    }

    if (method === 'POST' && path === '/knowledge/explain') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { query?: unknown; options?: unknown } : {};
      if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
        return { status: 400, body: { error: 'query string required' } };
      }
      const result = await memory.knowledgeExplain(parsed.query, parsed.options as import('./adapters.js').CodebaseSubgraphOptions | undefined);
      return { status: 200, body: result };
    }

    if (method === 'POST' && path === '/knowledge/entrypoints') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { project?: unknown; limit?: unknown; nodeLabels?: unknown; owners?: unknown; resourceGrant?: unknown } : {};
      const result = await memory.knowledgeEntrypoints({
        project: typeof parsed.project === 'string' && parsed.project.trim() ? parsed.project : undefined,
        limit: typeof parsed.limit === 'number' ? parsed.limit : undefined,
        nodeLabels: Array.isArray(parsed.nodeLabels) ? parsed.nodeLabels.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : undefined,
        owners: Array.isArray(parsed.owners) ? parsed.owners.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : undefined,
        resourceGrant: parsed.resourceGrant as import('./types.js').KnowledgeResourceGrant | undefined,
      });
      return { status: 200, body: { entrypoints: result } };
    }

    if (method === 'POST' && path === '/knowledge/owners') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { project?: unknown; limit?: unknown; nodeLabels?: unknown; owners?: unknown; resourceGrant?: unknown } : {};
      const result = await memory.knowledgeOwners({
        project: typeof parsed.project === 'string' && parsed.project.trim() ? parsed.project : undefined,
        limit: typeof parsed.limit === 'number' ? parsed.limit : undefined,
        nodeLabels: Array.isArray(parsed.nodeLabels) ? parsed.nodeLabels.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : undefined,
        owners: Array.isArray(parsed.owners) ? parsed.owners.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : undefined,
        resourceGrant: parsed.resourceGrant as import('./types.js').KnowledgeResourceGrant | undefined,
      });
      return { status: 200, body: { owners: result } };
    }

    if (method === 'POST' && path === '/knowledge/hotspots') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { project?: unknown; limit?: unknown; nodeLabels?: unknown; owners?: unknown; resourceGrant?: unknown } : {};
      const result = await memory.knowledgeHotspots({
        project: typeof parsed.project === 'string' && parsed.project.trim() ? parsed.project : undefined,
        limit: typeof parsed.limit === 'number' ? parsed.limit : undefined,
        nodeLabels: Array.isArray(parsed.nodeLabels) ? parsed.nodeLabels.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : undefined,
        owners: Array.isArray(parsed.owners) ? parsed.owners.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : undefined,
        resourceGrant: parsed.resourceGrant as import('./types.js').KnowledgeResourceGrant | undefined,
      });
      return { status: 200, body: { hotspots: result } };
    }

    if (method === 'POST' && path === '/knowledge/deadzones') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { project?: unknown; limit?: unknown; nodeLabels?: unknown; owners?: unknown; resourceGrant?: unknown } : {};
      const result = await memory.knowledgeDeadzones({
        project: typeof parsed.project === 'string' && parsed.project.trim() ? parsed.project : undefined,
        limit: typeof parsed.limit === 'number' ? parsed.limit : undefined,
        nodeLabels: Array.isArray(parsed.nodeLabels) ? parsed.nodeLabels.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : undefined,
        owners: Array.isArray(parsed.owners) ? parsed.owners.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : undefined,
        resourceGrant: parsed.resourceGrant as import('./types.js').KnowledgeResourceGrant | undefined,
      });
      return { status: 200, body: { deadzones: result } };
    }

    if (method === 'POST' && path === '/memory/procedural/match') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { context?: unknown } : {};
      if (typeof parsed.context !== 'string' || !parsed.context.trim()) {
        return { status: 400, body: { error: 'context string required' } };
      }
      const matches = memory.matchProcedural(parsed.context);
      return { status: 200, body: { matches } };
    }

    // POST /identity/audit — identity drift audit with corrective injection
    if (method === 'POST' && path === '/identity/audit') {
      if (!memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { sessionText?: unknown } : {};
      if (typeof parsed.sessionText !== 'string' || !parsed.sessionText.trim()) {
        return { status: 400, body: { error: 'sessionText string required' } };
      }
      const audit = await memory.auditIdentityAlignment(parsed.sessionText);
      return { status: 200, body: audit };
    }

    // GET /memory/topics/:topic — get by topic
    if (method === 'GET' && path.startsWith('/memory/topics/')) {
      const topic = decodeURIComponent(path.split('/')[3]);
      const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
      const results = memory?.getByTopic
        ? await memory.getByTopic(topic, limit)
        : await engine.getByTopic(topic, limit);
      return { status: 200, body: { results } };
    }

    // GET /memory/:id — get specific entry
    if (method === 'GET' && path.startsWith('/memory/')) {
      const id = path.split('/')[2];
      if (id === 'recent' || id === 'topics') {
        // Already handled above
        return { status: 404, body: { error: 'Not found' } };
      }
      const entry = await store.get(id);
      return entry
        ? { status: 200, body: { entry } }
        : { status: 404, body: { error: 'Memory not found' } };
    }

    // DELETE /memory/:id — forget an entry
    if (method === 'DELETE' && path.startsWith('/memory/')) {
      const id = path.split('/')[2];
      const forgotten = await store.forget(id);
      return {
        status: forgotten ? 200 : 404,
        body: { ok: forgotten, message: forgotten ? 'Memory forgotten' : 'Memory not found' },
      };
    }

    // GET /snapshots — list snapshots
    if (method === 'GET' && path === '/snapshots') {
      const snapshots = memory?.listSnapshots
        ? await memory.listSnapshots()
        : await store.listSnapshots();
      return { status: 200, body: { snapshots } };
    }

    // POST /snapshots — create snapshot
    if (method === 'POST' && path === '/snapshots') {
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { label?: unknown } : {};
      const label = typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label : 'snapshot';
      const snapshot = memory?.createSnapshot
        ? await memory.createSnapshot(label)
        : await store.createSnapshot(label);
      return { status: 201, body: { snapshot } };
    }

    // GET /snapshots/:id/export — export snapshot
    if (method === 'GET' && path.startsWith('/snapshots/') && path.endsWith('/export')) {
      const id = path.split('/')[2];
      const snapshot = memory?.exportSnapshot
        ? await memory.exportSnapshot(id)
        : await store.exportSnapshot(id);
      return { status: 200, body: { snapshot } };
    }

    // POST /snapshots/import — import snapshot
    if (method === 'POST' && path === '/snapshots/import') {
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = JSON.parse(body) as { snapshot?: unknown; overwrite?: unknown };
      if (!parsed.snapshot || typeof parsed.snapshot !== 'object') {
        return { status: 400, body: { error: 'snapshot object required' } };
      }
      const snapshot = memory?.importSnapshot
        ? await memory.importSnapshot(parsed.snapshot, { overwrite: parsed.overwrite === true })
        : await store.importSnapshot(
            parsed.snapshot as Awaited<ReturnType<typeof store.exportSnapshot>>,
            { overwrite: parsed.overwrite === true }
          );
      return { status: 201, body: { snapshot } };
    }

    // POST /snapshots/:id/restore — restore snapshot
    if (method === 'POST' && path.startsWith('/snapshots/') && path.endsWith('/restore')) {
      const id = path.split('/')[2];
      const restored = memory?.restoreSnapshot
        ? await memory.restoreSnapshot(id)
        : await store.restoreSnapshot(id);
      return { status: 200, body: { ok: true, restored } };
    }

    // DELETE /snapshots/:id — delete snapshot
    if (method === 'DELETE' && path.startsWith('/snapshots/')) {
      const id = path.split('/')[2];
      const deleted = memory?.deleteSnapshot
        ? await memory.deleteSnapshot(id)
        : await store.deleteSnapshot(id);
      return {
        status: deleted ? 200 : 404,
        body: { ok: deleted, message: deleted ? 'Snapshot deleted' : 'Snapshot not found' },
      };
    }

    // GET /events — get event log
    if (method === 'GET' && path === '/events') {
      const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
      const events = store.getEventLog(limit);
      return { status: 200, body: { events } };
    }

    // GET /health — health check
    if (method === 'GET' && path === '/health') {
      return {
        status: 200,
        body: {
          ok: true,
          model: model?.name() ?? 'none',
          advancedRoutes: Boolean(memory),
          nativeVectorSearch: memory?.usesNativeVectorSearch?.() ?? store.supportsNativeVectorSearch?.() ?? false,
        },
      };
    }

    return { status: 404, body: { error: 'Not found', path, method } };
  }

  private isAuthorized(req: import('http').IncomingMessage): boolean {
    if (!this.authToken) return true;
    return req.headers.authorization === `Bearer ${this.authToken}`;
  }

  private async resolveRuntime(
    method: string,
    path: string,
    req?: import('http').IncomingMessage
  ): Promise<ResolvedHttpRuntime & { engine: QueryEngine }> {
    if (!req || !this.runtimeResolver) {
      return {
        store: this.store,
        model: this.model,
        memory: this.memory,
        engine: this.engine,
      };
    }

    const scope = this.buildRequestScope(method, path, req);
    const resolved = await this.runtimeResolver(scope, req);
    if (!resolved) {
      return {
        store: this.store,
        model: this.model,
        memory: this.memory,
        engine: this.engine,
      };
    }

    return {
      ...resolved,
      engine: new QueryEngine({
        store: resolved.store,
        model: resolved.model,
      }),
    };
  }

  private buildRequestScope(method: string, path: string, req: import('http').IncomingMessage): HttpRequestScope {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers[key] = value;
      else if (Array.isArray(value)) headers[key] = value.join(', ');
    }

    const scope: HttpRequestScope = {
      method,
      path,
      headers,
      authToken: headers.authorization?.startsWith('Bearer ') ? headers.authorization.slice(7) : undefined,
    };

    if (!this.trustScopeHeaders) return scope;

    const getHeader = (name: string) => {
      const value = headers[name];
      return value && value.trim() ? value.trim() : undefined;
    };

    scope.workspaceId = getHeader('x-remem-workspace-id');
    scope.agentId = getHeader('x-remem-agent-id');
    scope.userId = getHeader('x-remem-user-id');
    scope.sessionId = getHeader('x-remem-session-id');
    scope.subject = getHeader('x-remem-subject');
    return scope;
  }

  private async readBody(req: import('http').IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let total = 0;
      req.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > this.maxBodyBytes) {
          reject(new Error('Request body too large'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
}
