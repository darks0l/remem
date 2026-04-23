/**
 * ReMEM — MemoryStore
 * SQLite-backed persistent memory store with event sourcing
 * Uses sql.js (WebAssembly) for cross-platform SQLite without native compilation
 */

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { randomUUID } from 'crypto';
import {
  type MemoryEntry,
  type MemoryEvent,
  type QueryOptions,
  type QueryResult,
  type StoreMemoryInput,
  memoryEntrySchema,
  queryOptionsSchema,
} from './types.js';

export class MemoryStore {
  private db: SqlJsDatabase | null = null;
  private eventLog: Array<MemoryEvent> = [];
  private dbPath: string;
  private initialized = false;

  constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    const SQL = await initSqlJs();

    if (this.dbPath === ':memory:') {
      this.db = new SQL.Database();
    } else {
      try {
        const { readFileSync, existsSync } = await import('fs');
        if (existsSync(this.dbPath)) {
          const fileBuffer = readFileSync(this.dbPath);
          this.db = new SQL.Database(fileBuffer);
        } else {
          this.db = new SQL.Database();
        }
      } catch {
        this.db = new SQL.Database();
      }
    }

    this.initTables();
    this.initialized = true;
  }

  private initTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        topics TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        accessed_at INTEGER NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory(created_at DESC)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_accessed_at ON memory(accessed_at DESC)`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        payload TEXT NOT NULL
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC)`);
  }

  private ensureInitialized(): void {
    if (!this.db) throw new Error('MemoryStore not initialized. Call await memoryStore.init() first.');
  }

  async store(input: StoreMemoryInput): Promise<MemoryEntry> {
    this.ensureInitialized();
    const now = Date.now();
    const entry: MemoryEntry = {
      id: randomUUID(),
      content: input.content,
      topics: input.topics ?? [],
      metadata: input.metadata ?? {},
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
    };

    const validated = memoryEntrySchema.parse(entry);

    this.db!.run(
      `INSERT INTO memory (id, content, topics, metadata, created_at, accessed_at, access_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.id,
        validated.content,
        JSON.stringify(validated.topics),
        JSON.stringify(validated.metadata),
        validated.createdAt,
        validated.accessedAt,
        validated.accessCount,
      ]
    );

    this.logEvent('memory.stored', { entry: validated });
    this.persist();

    return validated;
  }

  async get(id: string): Promise<MemoryEntry | null> {
    this.ensureInitialized();

    this.db!.run(`UPDATE memory SET access_count = access_count + 1, accessed_at = ? WHERE id = ?`, [
      Date.now(),
      id,
    ]);

    const result = this.db!.exec('SELECT * FROM memory WHERE id = ?', [id]);

    if (result.length === 0 || result[0].values.length === 0) return null;

    const row = this.rowToObject(result[0].columns, result[0].values[0]);
    const entry = memoryEntrySchema.parse(row);

    this.logEvent('memory.accessed', { id });
    this.persist();

    return entry;
  }

  async query(text: string, options?: QueryOptions): Promise<{ results: QueryResult[]; totalAvailable: number }> {
    this.ensureInitialized();
    const opts = queryOptionsSchema.parse(options ?? {});

    // Build SQL query
    let sql = 'SELECT * FROM memory WHERE content LIKE ?';
    const params: (string | number)[] = [`%${text}%`];

    if (opts.topics && opts.topics.length > 0) {
      const topicConditions = opts.topics.map(() => 'topics LIKE ?').join(' OR ');
      sql += ` AND (${topicConditions})`;
      params.push(...opts.topics.map((t) => `%${t}%`));
    }

    if (opts.since) {
      sql += ' AND created_at >= ?';
      params.push(opts.since);
    }

    if (opts.until) {
      sql += ' AND created_at <= ?';
      params.push(opts.until);
    }

    sql += ' ORDER BY access_count DESC, accessed_at DESC';

    // Count total
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = this.db!.exec(countSql, params);
    const totalAvailable = countResult[0]?.values[0]?.[0] as number ?? 0;

    // Fetch limited results
    sql += ' LIMIT ? OFFSET 0';
    params.push(opts.limit);

    const result = this.db!.exec(sql, params);

    if (result.length === 0) {
      return { results: [], totalAvailable };
    }

    const rows = result[0].values.map((v: unknown[]) => this.rowToObject(result[0].columns, v));

    const results: QueryResult[] = rows.map((row) => {
      const entry = memoryEntrySchema.parse(row);
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        relevanceScore: this.simpleRelevance(entry.content, text),
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount,
      };
    });

    this.logEvent('memory.queried', { text, options: opts, resultCount: results.length });

    return { results, totalAvailable };
  }

  async getRecent(n: number = 10): Promise<QueryResult[]> {
    this.ensureInitialized();

    const result = this.db!.exec('SELECT * FROM memory ORDER BY accessed_at DESC LIMIT ?', [n]);

    if (result.length === 0) return [];

    return result[0].values.map((v: unknown[]) => {
      const entry = memoryEntrySchema.parse(this.rowToObject(result[0].columns, v));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount,
      };
    });
  }

  async getByTopic(topic: string, limit: number = 20): Promise<QueryResult[]> {
    this.ensureInitialized();

    const result = this.db!.exec(
      'SELECT * FROM memory WHERE topics LIKE ? ORDER BY accessed_at DESC LIMIT ?',
      [`%${topic}%`, limit]
    );

    if (result.length === 0) return [];

    return result[0].values.map((v: unknown[]) => {
      const entry = memoryEntrySchema.parse(this.rowToObject(result[0].columns, v));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount,
      };
    });
  }

  async forget(id: string): Promise<boolean> {
    this.ensureInitialized();

    this.db!.run('DELETE FROM memory WHERE id = ?', [id]);
    const changes = this.db!.getRowsModified();

    if (changes > 0) {
      this.logEvent('memory.forgotten', { id });
      this.persist();
      return true;
    }
    return false;
  }

  getEventLog(limit: number = 100): MemoryEvent[] {
    return this.eventLog.slice(0, limit);
  }

  persist(): void {
    if (!this.db || this.dbPath === ':memory:') return;
    try {
      const { writeFileSync } = require('fs');
      const data = this.db.export();
      const buffer = Buffer.from(data);
      writeFileSync(this.dbPath, buffer);
    } catch {
      // Ignore persist errors in memory-only mode
    }
  }

  close(): void {
    if (this.db) {
      this.persist();
      this.db.close();
      this.db = null;
    }
  }

  private logEvent(type: MemoryEvent['type'], payload: Record<string, unknown>): void {
    const event: MemoryEvent = {
      id: randomUUID(),
      type,
      timestamp: Date.now(),
      payload,
    };
    this.eventLog.push(event);

    // Also persist to DB
    if (this.db) {
      try {
        this.db.run(
          'INSERT INTO events (id, type, timestamp, payload) VALUES (?, ?, ?, ?)',
          [event.id, event.type, event.timestamp, JSON.stringify(event.payload)]
        );
        this.persist();
      } catch {
        // Ignore if events table write fails
      }
    }
  }

  private rowToObject(columns: string[], values: unknown[]): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      let val = values[i];
      // Parse JSON fields
      if ((col === 'topics' || col === 'metadata') && typeof val === 'string') {
        try {
          val = JSON.parse(val);
        } catch {
          // Keep as string if parse fails
        }
      }
      // Map snake_case DB columns to camelCase
      if (col === 'created_at') obj['createdAt'] = val;
      else if (col === 'accessed_at') obj['accessedAt'] = val;
      else if (col === 'access_count') obj['accessCount'] = val;
      else obj[col] = val;
    });
    return obj;
  }

  private simpleRelevance(content: string, query: string): number {
    const lower = content.toLowerCase();
    const terms = query.toLowerCase().split(/\s+/);
    const matches = terms.filter((t) => lower.includes(t)).length;
    return matches / terms.length;
  }
}
