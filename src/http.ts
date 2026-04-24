/**
 * ReMEM — HTTP Adapter
 * Framework-agnostic HTTP interface for remote memory access
 */

import type { QueryOptions, QueryResponse, QueryResult, StoreMemoryInput, MemoryEntry, MemoryEvent } from './types.js';
import { MemoryStore } from './store.js';
import { ModelAbstraction } from './model.js';
import { QueryEngine } from './query.js';
import { randomUUID } from 'crypto';

export interface HttpAdapterConfig {
  port?: number;
  store: MemoryStore;
  model?: ModelAbstraction;
}

interface ParsedUrl {
  pathname: string;
  searchParams: URLSearchParams;
}

export class HttpAdapter {
  private server?: import('http').Server;
  private engine: QueryEngine;
  private store: MemoryStore;
  private port: number;

  constructor(config: HttpAdapterConfig) {
    this.store = config.store;
    this.model = config.model;
    this.engine = new QueryEngine({ store: this.store, model: this.model });
    this.port = config.port ?? 8787;
  }

  async start(): Promise<void> {
    const http = await import('http');

    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${this.port}`);
      const method = req.method ?? 'GET';

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        const result = await this.handleRequest(method, url, req);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      }
    });

    return new Promise((resolve) => {
      this.server!.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }

  private async handleRequest(method: string, url: URL, req?: import('http').IncomingMessage): Promise<unknown> {
    const path = url.pathname;

    // POST /memory — store a new entry
    if (method === 'POST' && path === '/memory') {
      if (!req) return { error: 'Request body unavailable' };
      const body = await this.readBody(req);
      if (!body) return { error: 'Empty request body' };
      const input = JSON.parse(body) as StoreMemoryInput;
      await this.engine.store(input);
      return { ok: true, message: 'Memory stored' };
    }

    // GET /memory — query memory
    if (method === 'GET' && path === '/memory') {
      const query = url.searchParams.get('q') ?? '';
      const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
      const topics = url.searchParams.get('topics')?.split(',').filter(Boolean);

      const options: QueryOptions = { limit };
      if (topics) options.topics = topics;

      const result = await this.engine.query(query, options);
      return result;
    }

    // GET /memory/recent — get recent entries
    if (method === 'GET' && path === '/memory/recent') {
      const n = parseInt(url.searchParams.get('n') ?? '10', 10);
      const results = await this.engine.getRecent(n);
      return { results };
    }

    // GET /memory/topics/:topic — get by topic
    if (method === 'GET' && path.startsWith('/memory/topics/')) {
      const topic = decodeURIComponent(path.split('/')[3]);
      const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
      const results = await this.engine.getByTopic(topic, limit);
      return { results };
    }

    // GET /memory/:id — get specific entry
    if (method === 'GET' && path.startsWith('/memory/')) {
      const id = path.split('/')[2];
      if (id === 'recent' || id === 'topics') {
        // Already handled above
        return { error: 'Not found' };
      }
      const entry = await this.store.get(id);
      return { entry };
    }

    // DELETE /memory/:id — forget an entry
    if (method === 'DELETE' && path.startsWith('/memory/')) {
      const id = path.split('/')[2];
      const forgotten = await this.store.forget(id);
      return { ok: forgotten, message: forgotten ? 'Memory forgotten' : 'Memory not found' };
    }

    // GET /events — get event log
    if (method === 'GET' && path === '/events') {
      const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
      const events = this.store.getEventLog(limit);
      return { events };
    }

    // GET /health — health check
    if (method === 'GET' && path === '/health') {
      return { ok: true, model: this.model?.name() ?? 'none' };
    }

    return { error: 'Not found', path, method };
  }

  private async readBody(req: import('http').IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
}
