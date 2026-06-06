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
} from './types.js';
import {
  namespaceInputSchema,
  namespaceQueryScopeSchema,
  queryWithNeighborsOptionsSchema,
  storeMemoryInputSchema,
} from './types.js';
import type { MemoryStoreLike } from './storage-types.js';
import { ModelAbstraction } from './model.js';
import { QueryEngine } from './query.js';

export interface AdvancedMemoryRuntime {
  queryWithNeighbors(query: string, options?: QueryWithNeighborsOptions): Promise<QueryResponse & { linksTraversed: number; paths?: NeighborPath[] }>;
  smartRecall(query: string, options?: import('./types.js').SmartRecallOptions): Promise<import('./types.js').SmartRecallResponse>;
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

export interface HttpAdapterConfig {
  port?: number;
  host?: string;
  store: MemoryStoreLike;
  model?: ModelAbstraction;
  /** Optional full ReMEM runtime for advanced graph/procedural/identity routes. */
  memory?: AdvancedMemoryRuntime;
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
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    // POST /memory — store a new entry
    if (method === 'POST' && path === '/memory') {
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      if (!body) return { status: 400, body: { error: 'Empty request body' } };
      const input = storeMemoryInputSchema.parse(JSON.parse(body));
      await this.engine.store(input);
      return { status: 201, body: { ok: true, message: 'Memory stored' } };
    }

    // POST /memory/shared — store a shared/private namespaced entry
    if (method === 'POST' && path === '/memory/shared') {
      if (!this.memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      if (!body) return { status: 400, body: { error: 'Empty request body' } };
      const parsed = JSON.parse(body) as Record<string, unknown>;
      const input = storeMemoryInputSchema.parse(parsed);
      const namespace = namespaceInputSchema.parse(parsed.namespace);
      const visibility = parsed.visibility === 'private' ? 'private' : 'shared';
      await this.memory.storeShared({ ...input, namespace, visibility });
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

      const result = await this.engine.query(query, options);
      return { status: 200, body: result };
    }

    // POST /memory/namespace/query — query within a namespace with visibility scope
    if (method === 'POST' && path === '/memory/namespace/query') {
      if (!this.memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { namespace?: unknown; query?: unknown; options?: unknown; scope?: unknown } : {};
      if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
        return { status: 400, body: { error: 'query string required' } };
      }
      const namespace = namespaceInputSchema.parse(parsed.namespace);
      const scope = namespaceQueryScopeSchema.parse(parsed.scope ?? {});
      const options = parsed.options ? JSON.parse(JSON.stringify(parsed.options)) as QueryOptions : undefined;
      const result = await this.memory.queryNamespace(namespace, parsed.query, options, scope);
      return { status: 200, body: result };
    }

    // GET /memory/recent — get recent entries
    if (method === 'GET' && path === '/memory/recent') {
      const n = parseInt(url.searchParams.get('n') ?? '10', 10);
      const results = await this.engine.getRecent(n);
      return { status: 200, body: { results } };
    }

    // POST /memory/namespace/recent — get recent entries within a namespace
    if (method === 'POST' && path === '/memory/namespace/recent') {
      if (!this.memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { namespace?: unknown; n?: unknown; scope?: unknown } : {};
      const namespace = namespaceInputSchema.parse(parsed.namespace);
      const scope = namespaceQueryScopeSchema.parse(parsed.scope ?? {});
      const n = typeof parsed.n === 'number' ? parsed.n : 10;
      const results = await this.memory.getRecentInNamespace(namespace, n, scope);
      return { status: 200, body: { results } };
    }

    // POST /memory/query-with-neighbors — graph-aware retrieval
    if (method === 'POST' && path === '/memory/query-with-neighbors') {
      if (!this.memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { query?: unknown; options?: unknown } : {};
      if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
        return { status: 400, body: { error: 'query string required' } };
      }
      const options = queryWithNeighborsOptionsSchema.parse(parsed.options ?? {});
      const result = await this.memory.queryWithNeighbors(parsed.query, options);
      return { status: 200, body: result };
    }

    // POST /memory/smart-recall — fused semantic/graph/procedural/recent retrieval
    if (method === 'POST' && path === '/memory/smart-recall') {
      if (!this.memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { query?: unknown; options?: unknown } : {};
      if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
        return { status: 400, body: { error: 'query string required' } };
      }
      const result = await this.memory.smartRecall(parsed.query, parsed.options as import('./types.js').SmartRecallOptions | undefined);
      return { status: 200, body: result };
    }

    // POST /memory/procedural/match — evaluate procedural triggers against context
    if (method === 'POST' && path === '/memory/procedural/match') {
      if (!this.memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { context?: unknown } : {};
      if (typeof parsed.context !== 'string' || !parsed.context.trim()) {
        return { status: 400, body: { error: 'context string required' } };
      }
      const matches = this.memory.matchProcedural(parsed.context);
      return { status: 200, body: { matches } };
    }

    // POST /identity/audit — identity drift audit with corrective injection
    if (method === 'POST' && path === '/identity/audit') {
      if (!this.memory) return { status: 501, body: { error: 'Advanced memory runtime not configured' } };
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { sessionText?: unknown } : {};
      if (typeof parsed.sessionText !== 'string' || !parsed.sessionText.trim()) {
        return { status: 400, body: { error: 'sessionText string required' } };
      }
      const audit = await this.memory.auditIdentityAlignment(parsed.sessionText);
      return { status: 200, body: audit };
    }

    // GET /memory/topics/:topic — get by topic
    if (method === 'GET' && path.startsWith('/memory/topics/')) {
      const topic = decodeURIComponent(path.split('/')[3]);
      const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
      const results = await this.engine.getByTopic(topic, limit);
      return { status: 200, body: { results } };
    }

    // GET /memory/:id — get specific entry
    if (method === 'GET' && path.startsWith('/memory/')) {
      const id = path.split('/')[2];
      if (id === 'recent' || id === 'topics') {
        // Already handled above
        return { status: 404, body: { error: 'Not found' } };
      }
      const entry = await this.store.get(id);
      return entry
        ? { status: 200, body: { entry } }
        : { status: 404, body: { error: 'Memory not found' } };
    }

    // DELETE /memory/:id — forget an entry
    if (method === 'DELETE' && path.startsWith('/memory/')) {
      const id = path.split('/')[2];
      const forgotten = await this.store.forget(id);
      return {
        status: forgotten ? 200 : 404,
        body: { ok: forgotten, message: forgotten ? 'Memory forgotten' : 'Memory not found' },
      };
    }

    // GET /snapshots — list snapshots
    if (method === 'GET' && path === '/snapshots') {
      const snapshots = await this.store.listSnapshots();
      return { status: 200, body: { snapshots } };
    }

    // POST /snapshots — create snapshot
    if (method === 'POST' && path === '/snapshots') {
      if (!req) return { status: 400, body: { error: 'Request body unavailable' } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) as { label?: unknown } : {};
      const label = typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label : 'snapshot';
      const snapshot = await this.store.createSnapshot(label);
      return { status: 201, body: { snapshot } };
    }

    // GET /snapshots/:id/export — export snapshot
    if (method === 'GET' && path.startsWith('/snapshots/') && path.endsWith('/export')) {
      const id = path.split('/')[2];
      const snapshot = await this.store.exportSnapshot(id);
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
      const snapshot = await this.store.importSnapshot(
        parsed.snapshot as Awaited<ReturnType<typeof this.store.exportSnapshot>>,
        { overwrite: parsed.overwrite === true }
      );
      return { status: 201, body: { snapshot } };
    }

    // POST /snapshots/:id/restore — restore snapshot
    if (method === 'POST' && path.startsWith('/snapshots/') && path.endsWith('/restore')) {
      const id = path.split('/')[2];
      const restored = await this.store.restoreSnapshot(id);
      return { status: 200, body: { ok: true, restored } };
    }

    // DELETE /snapshots/:id — delete snapshot
    if (method === 'DELETE' && path.startsWith('/snapshots/')) {
      const id = path.split('/')[2];
      const deleted = await this.store.deleteSnapshot(id);
      return {
        status: deleted ? 200 : 404,
        body: { ok: deleted, message: deleted ? 'Snapshot deleted' : 'Snapshot not found' },
      };
    }

    // GET /events — get event log
    if (method === 'GET' && path === '/events') {
      const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
      const events = this.store.getEventLog(limit);
      return { status: 200, body: { events } };
    }

    // GET /health — health check
    if (method === 'GET' && path === '/health') {
      return {
        status: 200,
        body: {
          ok: true,
          model: this.model?.name() ?? 'none',
          advancedRoutes: Boolean(this.memory),
          nativeVectorSearch: this.memory?.usesNativeVectorSearch?.() ?? this.store.supportsNativeVectorSearch?.() ?? false,
        },
      };
    }

    return { status: 404, body: { error: 'Not found', path, method } };
  }

  private isAuthorized(req: import('http').IncomingMessage): boolean {
    if (!this.authToken) return true;
    return req.headers.authorization === `Bearer ${this.authToken}`;
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
