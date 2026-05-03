/**
 * ReMEM — HTTP Adapter
 * Framework-agnostic HTTP interface for remote memory access
 */

import type { QueryOptions } from './types.js';
import { storeMemoryInputSchema } from './types.js';
import type { MemoryStoreLike } from './storage-types.js';
import { ModelAbstraction } from './model.js';
import { QueryEngine } from './query.js';

export interface HttpAdapterConfig {
  port?: number;
  host?: string;
  store: MemoryStoreLike;
  model?: ModelAbstraction;
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
  private port: number;
  private host: string;
  private authToken?: string;
  private corsOrigin: string;
  private maxBodyBytes: number;

  constructor(config: HttpAdapterConfig) {
    this.store = config.store;
    this.model = config.model;
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

    // GET /memory — query memory
    if (method === 'GET' && path === '/memory') {
      const query = url.searchParams.get('q') ?? '';
      const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
      const topics = url.searchParams.get('topics')?.split(',').filter(Boolean);

      const options: QueryOptions = { limit };
      if (topics) options.topics = topics;

      const result = await this.engine.query(query, options);
      return { status: 200, body: result };
    }

    // GET /memory/recent — get recent entries
    if (method === 'GET' && path === '/memory/recent') {
      const n = parseInt(url.searchParams.get('n') ?? '10', 10);
      const results = await this.engine.getRecent(n);
      return { status: 200, body: { results } };
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
      return { status: 200, body: { ok: true, model: this.model?.name() ?? 'none' } };
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
