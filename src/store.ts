/**
 * ReMEM — MemoryStore
 * SQLite-backed persistent memory store with event sourcing
 * Uses sql.js (WebAssembly) for cross-platform SQLite without native compilation
 *
 * v0.3.1 adds:
 * - layered_memories table (persists LayerManager entries to SQLite)
 * - snapshots table (snapshot/restore for long-running agents)
 * - agent_id/user_id scoping (multi-agent support)
 * - WAL mode for better concurrent write handling
 * - Atomic persist with rename
 *
 * v0.3.2 adds:
 * - embeddings table (vector storage for semantic search)
 * - semanticQuery() for cosine similarity search
 */

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { createHash, randomUUID } from 'crypto';
import {
  type MemoryEntry,
  type MemoryEvent,
  type QueryOptions,
  type QueryResult,
  type StoreMemoryInput,
  type LayeredMemoryEntry,
  type MemoryLayer,
  memoryEntrySchema,
  queryOptionsSchema,
} from './types.js';
import { EmbeddingService } from './embeddings.js';
import type { MemoryStoreLike, SnapshotExport, SnapshotMeta, StoreMemoryOptions } from './storage-types.js';

export class MemoryStore implements MemoryStoreLike {
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

    // Enable WAL mode for better concurrent write handling
    // Note: sql.js WAL support is limited; this is a best-effort hint
    if (this.db) {
      try { this.db.run('PRAGMA journal_mode=WAL'); } catch { /* WAL not supported in sql.js */ }
      try { this.db.run('PRAGMA synchronous=NORMAL'); } catch { /* ignore */ }
    }

    this.initTables();
    this.initialized = true;
  }

  private initTables(): void {
    if (!this.db) return;

    // Core memory table — now with agent/user scoping
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        topics TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        accessed_at INTEGER NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        agent_id TEXT,
        user_id TEXT
      )
    `);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory(created_at DESC)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_accessed_at ON memory(accessed_at DESC)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_agent ON memory(agent_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_user ON memory(user_id)`);

    // Layered memory table — persists LayerManager entries to SQLite
    // This ensures layers survive process restarts (critical fix for v0.3.1)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS layered_memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        topics TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        layer TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        accessed_at INTEGER NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER,
        importance REAL NOT NULL DEFAULT 0.5,
        valid_from INTEGER,
        valid_until INTEGER,
        supersedes TEXT,
        superseded_by TEXT,
        agent_id TEXT,
        user_id TEXT,
        created_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_lm_layer ON layered_memories(layer)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_lm_expires ON layered_memories(expires_at)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_lm_agent ON layered_memories(agent_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_lm_supersedes ON layered_memories(supersedes)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_lm_superseded_by ON layered_memories(superseded_by)`);

    // Snapshots table — for long-running agent persistence across restarts
    this.db.run(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL DEFAULT '',
        snapshot_data TEXT NOT NULL,
        memory_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        agent_id TEXT,
        user_id TEXT,
        checksum TEXT
      )
    `);
    this.ensureColumn('snapshots', 'checksum', 'TEXT');
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_snap_agent ON snapshots(agent_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_snap_created ON snapshots(created_at DESC)`);

    // Embeddings table — vector embeddings for semantic memory search (v0.3.2)
    // Stores base64-encoded float32 vectors linked to memory entries
    this.db.run(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        vector_base64 TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        model TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        embedding_type TEXT NOT NULL DEFAULT 'memory'
      )
    `);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_emb_memory ON embeddings(memory_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_emb_type ON embeddings(embedding_type)`);

    // Event log
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

  async store(input: StoreMemoryInput, opts?: StoreMemoryOptions): Promise<MemoryEntry> {
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
      `INSERT INTO memory (id, content, topics, metadata, created_at, accessed_at, access_count, agent_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.id,
        validated.content,
        JSON.stringify(validated.topics),
        JSON.stringify(validated.metadata),
        validated.createdAt,
        validated.accessedAt,
        validated.accessCount,
        opts?.agentId ?? null,
        opts?.userId ?? null,
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

  /**
   * Get all memory entries (no text filter, ignores limit).
   * Used internally by the duplication/export feature.
   */
  async getAllEntries(): Promise<QueryResult[]> {
    this.ensureInitialized();

    const result = this.db!.exec('SELECT * FROM memory ORDER BY created_at DESC');

    if (result.length === 0) return [];

    return result[0].values.map((v: unknown[]) => {
      const entry = memoryEntrySchema.parse(this.rowToObject(result[0].columns, v));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        relevanceScore: 0,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount,
      };
    });
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

  // ─── Layered Memory Persistence (v0.3.1) ─────────────────────────────────

  /**
   * Persist a LayerManager entry to SQLite.
   * This is what makes layers survive process restarts.
   */
  async persistLayerEntry(entry: LayeredMemoryEntry, opts?: StoreMemoryOptions): Promise<void> {
    this.ensureInitialized();
    this.db!.run(
      `INSERT OR REPLACE INTO layered_memories
       (id, content, topics, metadata, layer, created_at, accessed_at, access_count,
        expires_at, importance, valid_from, valid_until, supersedes, superseded_by, agent_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.content,
        JSON.stringify(entry.topics),
        JSON.stringify(entry.metadata),
        entry.layer,
        entry.createdAt,
        entry.accessedAt,
        entry.accessCount,
        entry.expiresAt ?? null,
        entry.importance,
        entry.validFrom ?? null,
        entry.validUntil ?? null,
        entry.supersedes ?? null,
        entry.supersededBy ?? null,
        opts?.agentId ?? null,
        opts?.userId ?? null,
      ]
    );
    this.persist();
  }

  /**
   * Load all persisted layer entries from SQLite.
   * Called on ReMEM.init() to restore layer state.
   */
  async loadAllLayerEntries(opts?: StoreMemoryOptions): Promise<LayeredMemoryEntry[]> {
    this.ensureInitialized();

    let sql = 'SELECT * FROM layered_memories WHERE 1=1';
    const params: (string | null)[] = [];

    if (opts?.agentId) {
      sql += ' AND (agent_id = ? OR agent_id IS NULL)';
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      sql += ' AND (user_id = ? OR user_id IS NULL)';
      params.push(opts.userId);
    }

    sql += ' ORDER BY created_at DESC';
    const result = this.db!.exec(sql, params);

    if (result.length === 0) return [];

    return result[0].values.map((v: unknown[]) => {
      const obj = this.rowToObject(result[0].columns, v);
      return {
        id: obj['id'] as string,
        content: obj['content'] as string,
        topics: typeof obj['topics'] === 'string' ? JSON.parse(obj['topics'] as string) : (obj['topics'] as string[]),
        metadata: typeof obj['metadata'] === 'string' ? JSON.parse(obj['metadata'] as string) : (obj['metadata'] as Record<string, unknown>),
        layer: obj['layer'] as MemoryLayer,
        createdAt: obj['createdAt'] as number,
        accessedAt: obj['accessedAt'] as number,
        accessCount: obj['accessCount'] as number,
        expiresAt: obj['expiresAt'] as number | undefined,
        importance: (obj['importance'] as number) ?? 0.5,
        validFrom: obj['validFrom'] as number | undefined,
        validUntil: obj['validUntil'] as number | undefined,
        supersedes: obj['supersedes'] as string | undefined,
        supersededBy: obj['supersededBy'] as string | undefined,
      };
    });
  }

  /**
   * Delete a layered memory entry.
   */
  async forgetLayerEntry(id: string): Promise<boolean> {
    this.ensureInitialized();
    this.db!.run('DELETE FROM layered_memories WHERE id = ?', [id]);
    const changes = this.db!.getRowsModified();
    if (changes > 0) this.persist();
    return changes > 0;
  }

  /**
   * Load full core memory entries for snapshot/restore.
   * Unlike query/getAllEntries, this preserves metadata and timestamps exactly.
   */
  private async loadAllMemoryEntries(opts?: StoreMemoryOptions): Promise<MemoryEntry[]> {
    this.ensureInitialized();

    let sql = 'SELECT * FROM memory WHERE 1=1';
    const params: (string | null)[] = [];

    if (opts?.agentId) { sql += ' AND (agent_id = ? OR agent_id IS NULL)'; params.push(opts.agentId); }
    if (opts?.userId) { sql += ' AND (user_id = ? OR user_id IS NULL)'; params.push(opts.userId); }

    sql += ' ORDER BY created_at DESC';

    const result = this.db!.exec(sql, params);
    if (result.length === 0) return [];

    return result[0].values.map((v: unknown[]) => {
      const row = this.rowToObject(result[0].columns, v);
      return memoryEntrySchema.parse(row);
    });
  }

  /**
   * Persist a full core memory entry, preserving id/timestamps/access count.
   * Used by snapshot restore and migration workflows.
   */
  private async restoreMemoryEntry(entry: MemoryEntry, opts?: StoreMemoryOptions): Promise<void> {
    this.ensureInitialized();
    const validated = memoryEntrySchema.parse(entry);

    this.db!.run(
      `INSERT OR REPLACE INTO memory (id, content, topics, metadata, created_at, accessed_at, access_count, agent_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.id,
        validated.content,
        JSON.stringify(validated.topics),
        JSON.stringify(validated.metadata),
        validated.createdAt,
        validated.accessedAt,
        validated.accessCount,
        opts?.agentId ?? null,
        opts?.userId ?? null,
      ]
    );
  }

  /**
   * Create a named snapshot of current memory state.
   * For long-running agents — take a snapshot before restarts or major operations.
   * @param label Human-readable label for this snapshot
   * @param opts Agent/user scope
   */
  async createSnapshot(label: string, opts?: StoreMemoryOptions): Promise<SnapshotMeta> {
    this.ensureInitialized();
    const now = Date.now();
    const id = randomUUID();

    // Gather current state
    const layerEntries = await this.loadAllLayerEntries(opts);
    const coreEntries = await this.loadAllMemoryEntries(opts);

    const snapshotData = {
      version: '0.6.2',
      createdAt: now,
      layerEntries,
      coreEntries,
      eventCount: this.eventLog.length,
    };

    // Count per layer
    const layerCounts = { episodic: 0, semantic: 0, identity: 0, procedural: 0 } as Record<MemoryLayer, number>;
    for (const e of layerEntries) {
      if (e.layer in layerCounts) layerCounts[e.layer]++;
    }

    const serialized = JSON.stringify(snapshotData);
    const checksum = this.snapshotChecksum(snapshotData);

    this.db!.run(
      `INSERT INTO snapshots (id, label, snapshot_data, memory_count, created_at, agent_id, user_id, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        label,
        serialized,
        layerEntries.length + coreEntries.length,
        now,
        opts?.agentId ?? null,
        opts?.userId ?? null,
        checksum,
      ]
    );
    this.logEvent('snapshot.created', { id, label, memoryCount: layerEntries.length + coreEntries.length, checksum });
    this.persist();

    return {
      id,
      label,
      createdAt: now,
      memoryCount: layerEntries.length + coreEntries.length,
      layerCounts,
      checksum,
      agentId: opts?.agentId ?? null,
      userId: opts?.userId ?? null,
    };
  }

  /**
   * Restore from a snapshot by ID.
   * Overwrites current layer state with snapshot state.
   * @returns Number of entries restored
   */
  async restoreSnapshot(snapshotId: string, opts?: StoreMemoryOptions): Promise<number> {
    this.ensureInitialized();

    const result = this.db!.exec('SELECT snapshot_data, checksum, agent_id, user_id FROM snapshots WHERE id = ?', [snapshotId]);
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const row = this.rowToObject(result[0].columns, result[0].values[0]);
    const snapshotText = row['snapshot_data'] as string;
    const data = JSON.parse(snapshotText) as {
      layerEntries: LayeredMemoryEntry[];
      coreEntries?: MemoryEntry[];
      version: string;
    };
    const expectedChecksum = row['checksum'] as string | null;
    if (expectedChecksum && this.snapshotChecksum(data) !== expectedChecksum) {
      throw new Error(`Snapshot checksum mismatch: ${snapshotId}`);
    }

    // Filter by agent/user scope
    const scopedEntries = data.layerEntries.filter((e) => {
      if (opts?.agentId && e.metadata?.agentId !== opts.agentId) return false;
      if (opts?.userId && e.metadata?.userId !== opts.userId) return false;
      return true;
    });
    const scopedCoreEntries = data.coreEntries ?? [];

    // Clear current scoped entries
    if (opts?.agentId || opts?.userId) {
      const conditions = [];
      const params: (string | null)[] = [];
      if (opts.agentId) { conditions.push('agent_id = ?'); params.push(opts.agentId); }
      if (opts.userId) { conditions.push('user_id = ?'); params.push(opts.userId); }
      this.db!.run(`DELETE FROM layered_memories WHERE ${conditions.join(' AND ')}`, params);
      this.db!.run(`DELETE FROM memory WHERE ${conditions.join(' AND ')}`, params);
    } else {
      this.db!.run('DELETE FROM layered_memories');
      this.db!.run('DELETE FROM memory');
    }

    // Restore core memories from snapshot
    let restored = 0;
    for (const entry of scopedCoreEntries) {
      await this.restoreMemoryEntry(entry, {
        agentId: opts?.agentId,
        userId: opts?.userId,
      });
      restored++;
    }

    // Restore layered entries from snapshot
    for (const entry of scopedEntries) {
      await this.persistLayerEntry(entry, {
        agentId: opts?.agentId,
        userId: opts?.userId,
      });
      restored++;
    }

    this.logEvent('snapshot.restored', { snapshotId, restored });
    this.persist();

    return restored;
  }

  /**
   * List available snapshots.
   */
  async listSnapshots(opts?: StoreMemoryOptions): Promise<SnapshotMeta[]> {
    this.ensureInitialized();

    let sql = 'SELECT id, label, memory_count, created_at, agent_id, user_id, checksum FROM snapshots WHERE 1=1';
    const params: (string | null)[] = [];

    if (opts?.agentId) { sql += ' AND (agent_id = ? OR agent_id IS NULL)'; params.push(opts.agentId); }
    if (opts?.userId) { sql += ' AND (user_id = ? OR user_id IS NULL)'; params.push(opts.userId); }
    sql += ' ORDER BY created_at DESC';

    const result = this.db!.exec(sql, params);
    if (result.length === 0) return [];

    return result[0].values.map((v: unknown[]) => {
      const obj = this.rowToObject(result[0].columns, v);
      return {
        id: obj['id'] as string,
        label: obj['label'] as string,
        createdAt: obj['createdAt'] as number,
        memoryCount: obj['memory_count'] as number,
        layerCounts: { episodic: 0, semantic: 0, identity: 0, procedural: 0 },
        checksum: obj['checksum'] as string | null,
        agentId: obj['agent_id'] as string | null,
        userId: obj['user_id'] as string | null,
      };
    });
  }

  /**
   * Export a snapshot as portable JSON with checksum metadata.
   */
  async exportSnapshot(snapshotId: string): Promise<SnapshotExport> {
    this.ensureInitialized();
    const result = this.db!.exec('SELECT * FROM snapshots WHERE id = ?', [snapshotId]);
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const row = this.rowToObject(result[0].columns, result[0].values[0]);
    const snapshotData = JSON.parse(row['snapshot_data'] as string) as unknown;
    const checksum = (row['checksum'] as string | null) ?? this.snapshotChecksum(snapshotData);
    if (this.snapshotChecksum(snapshotData) !== checksum) {
      throw new Error(`Snapshot checksum mismatch: ${snapshotId}`);
    }

    return {
      id: row['id'] as string,
      label: row['label'] as string,
      createdAt: row['createdAt'] as number,
      memoryCount: row['memory_count'] as number,
      checksum,
      agentId: row['agent_id'] as string | null,
      userId: row['user_id'] as string | null,
      snapshotData,
    };
  }

  /**
   * Import a portable snapshot JSON export into the snapshots table.
   */
  async importSnapshot(snapshot: SnapshotExport, opts?: { overwrite?: boolean }): Promise<SnapshotMeta> {
    this.ensureInitialized();
    const checksum = this.snapshotChecksum(snapshot.snapshotData);
    if (checksum !== snapshot.checksum) {
      throw new Error('Snapshot import checksum mismatch');
    }

    const exists = this.db!.exec('SELECT id FROM snapshots WHERE id = ?', [snapshot.id]);
    if (exists.length > 0 && exists[0].values.length > 0 && !opts?.overwrite) {
      throw new Error(`Snapshot already exists: ${snapshot.id}`);
    }

    const serialized = JSON.stringify(snapshot.snapshotData);
    this.db!.run(
      `INSERT OR REPLACE INTO snapshots (id, label, snapshot_data, memory_count, created_at, agent_id, user_id, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshot.id,
        snapshot.label,
        serialized,
        snapshot.memoryCount,
        snapshot.createdAt,
        snapshot.agentId,
        snapshot.userId,
        checksum,
      ]
    );
    this.persist();

    return {
      id: snapshot.id,
      label: snapshot.label,
      createdAt: snapshot.createdAt,
      memoryCount: snapshot.memoryCount,
      layerCounts: { episodic: 0, semantic: 0, identity: 0, procedural: 0 },
      checksum,
      agentId: snapshot.agentId,
      userId: snapshot.userId,
    };
  }

  /**
   * Delete a snapshot.
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    this.ensureInitialized();
    this.db!.run('DELETE FROM snapshots WHERE id = ?', [snapshotId]);
    const changes = this.db!.getRowsModified();
    if (changes > 0) this.persist();
    return changes > 0;
  }

  // ─── Embeddings (v0.3.2) ───────────────────────────────────────────────────

  /**
   * Store a vector embedding for a memory entry.
   * Called after MemoryStore.store() when embeddings are enabled.
   */
  async storeEmbedding(
    memoryId: string,
    base64: string,
    dimension: number,
    model: string,
    type: 'memory' | 'layered' = 'memory'
  ): Promise<void> {
    this.ensureInitialized();
    const id = randomUUID();
    this.db!.run(
      `INSERT OR REPLACE INTO embeddings (id, memory_id, vector_base64, dimension, model, created_at, embedding_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, memoryId, base64, dimension, model, Date.now(), type]
    );
    this.persist();
  }

  /**
   * Get embedding for a memory entry.
   */
  async getEmbedding(memoryId: string): Promise<{ base64: string; dimension: number } | null> {
    this.ensureInitialized();
    const result = this.db!.exec(
      'SELECT vector_base64, dimension FROM embeddings WHERE memory_id = ?',
      [memoryId]
    );
    if (result.length === 0 || result[0].values.length === 0) return null;
    return {
      base64: result[0].values[0][0] as string,
      dimension: result[0].values[0][1] as number,
    };
  }

  /**
   * Delete embedding for a memory entry.
   */
  async deleteEmbedding(memoryId: string): Promise<void> {
    this.ensureInitialized();
    this.db!.run('DELETE FROM embeddings WHERE memory_id = ?', [memoryId]);
    this.persist();
  }

  /**
   * Hybrid semantic search: cosine similarity over embeddings + keyword fallback.
   *
   * Strategy:
   * 1. If Ollama is available and we have stored embeddings: compute cosine similarity
   * 2. Fall back to keyword + access_count scoring when no embeddings exist
   *
   * @param queryText     The search query
   * @param queryVector   Pre-computed embedding of the query (if available)
   * @param opts          Query options (limit, topics, etc.)
   * @returns             Top results scored by semantic similarity
   */
  async semanticQuery(
    queryText: string,
    queryVector: number[] | null,
    opts?: QueryOptions
  ): Promise<{ results: QueryResult[]; totalAvailable: number }> {
    this.ensureInitialized();
    const limit = opts?.limit ?? 10;

    // Fetch all memory entries with embeddings
    // We load them in memory and compute cosine similarity here
    // (SQLite doesn't have vector indexes; for large datasets consider pgvector/faiss separately)
    let sql = 'SELECT id, content, topics, created_at, accessed_at, access_count FROM memory m';
    const params: (string | number)[] = [];

    if (opts?.topics && opts.topics.length > 0) {
      const topicConditions = opts.topics.map(() => 'm.topics LIKE ?').join(' OR ');
      sql += ` WHERE (${topicConditions})`;
      params.push(...opts.topics.map((t) => `%${t}%`));
    }

    if (opts?.since) {
      sql += params.length ? ' AND m.created_at >= ?' : ' WHERE m.created_at >= ?';
      params.push(opts.since);
    }
    if (opts?.until) {
      sql += params.length ? ' AND m.created_at <= ?' : ' WHERE m.created_at <= ?';
      params.push(opts.until);
    }

    const result = this.db!.exec(sql, params);
    if (result.length === 0) return { results: [], totalAvailable: 0 };

    const rows = result[0].values as unknown[][];
    const scoredResults: QueryResult[] = [];

    for (const row of rows) {
      const [id, content, topics, createdAt, accessedAt, accessCount] = row;
      const topicArr: string[] = typeof topics === 'string' ? JSON.parse(topics) : (topics as string[]);

      // Try to get embedding for this entry
      const emb = await this.getEmbedding(id as string);

      let relevanceScore: number;

      if (queryVector && emb) {
        // Semantic: cosine similarity
        try {
          const vector = EmbeddingService.decodeVector(emb.base64, emb.dimension);
          relevanceScore = EmbeddingService.cosineSimilarity(queryVector, vector);
        } catch {
          // Fall back to keyword scoring if decode fails
          relevanceScore = this.simpleRelevance(content as string, queryText);
        }
      } else {
        // Keyword-based fallback (no embeddings available)
        relevanceScore = this.simpleRelevance(content as string, queryText);
      }

      scoredResults.push({
        id: id as string,
        content: content as string,
        topics: topicArr,
        relevanceScore,
        createdAt: createdAt as number,
        accessedAt: accessedAt as number,
        accessCount: accessCount as number,
      });
    }

    // Sort by relevance score descending
    scoredResults.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

    const totalAvailable = scoredResults.length;
    const limited = scoredResults.slice(0, limit);

    return { results: limited, totalAvailable };
  }

  getEventLog(limit: number = 100): MemoryEvent[] {
    return this.eventLog.slice(0, limit);
  }

  persist(): void {
    if (!this.db || this.dbPath === ':memory:') return;
    try {
      // Atomic write: write to .tmp, then rename. Prevents corruption on crash.
      const { writeFileSync, renameSync } = require('fs');
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tmpPath = `${this.dbPath}.tmp`;
      writeFileSync(tmpPath, buffer);
      renameSync(tmpPath, this.dbPath); // atomic on POSIX; close enough on Windows
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

  private ensureColumn(table: string, column: string, definition: string): void {
    if (!this.db) return;
    const info = this.db.exec(`PRAGMA table_info(${table})`);
    const exists = info[0]?.values.some((row) => row[1] === column) ?? false;
    if (!exists) this.db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  private snapshotChecksum(snapshotData: unknown): string {
    return createHash('sha256').update(JSON.stringify(snapshotData)).digest('hex');
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
