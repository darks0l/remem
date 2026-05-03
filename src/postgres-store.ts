import { createHash, randomUUID } from 'crypto';
import type { Pool, PoolClient, QueryResult as PgQueryResult, QueryResultRow } from 'pg';
import {
  type LayeredMemoryEntry,
  type MemoryEntry,
  type MemoryEvent,
  type MemoryLayer,
  type QueryOptions,
  type QueryResult,
  type StoreMemoryInput,
  memoryEntrySchema,
  queryOptionsSchema,
} from './types.js';
import { EmbeddingService } from './embeddings.js';
import type { MemoryStoreLike, SnapshotExport, SnapshotMeta, StoreMemoryOptions } from './storage-types.js';

export interface PostgresStoreConfig {
  connectionString?: string;
  pool?: Pool;
  schema?: string;
  tablePrefix?: string;
  ssl?: boolean | Record<string, unknown>;
}

type PgPoolConstructor = new (config?: Record<string, unknown>) => Pool;

type Queryable = Pool | PoolClient;

export class PostgresMemoryStore implements MemoryStoreLike {
  private pool: Pool | null = null;
  private ownsPool = false;
  private initialized = false;
  private eventLog: MemoryEvent[] = [];
  private readonly schema: string;
  private readonly tablePrefix: string;
  private readonly config: PostgresStoreConfig;

  constructor(config: string | PostgresStoreConfig = {}) {
    this.config = typeof config === 'string' ? { connectionString: config } : config;
    this.schema = this.safeIdentifier(this.config.schema ?? 'public');
    this.tablePrefix = this.config.tablePrefix ? this.safeIdentifier(this.config.tablePrefix) : '';
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.config.pool) {
      this.pool = this.config.pool;
    } else {
      const pg = await import('pg').catch(() => {
        throw new Error('PostgreSQL storage requires the optional "pg" package. Install it with: npm install pg');
      });
      const PoolCtor = (pg.Pool ?? (pg.default as { Pool?: PgPoolConstructor } | undefined)?.Pool) as PgPoolConstructor | undefined;
      if (!PoolCtor) throw new Error('PostgreSQL storage could not load pg.Pool');
      this.pool = new PoolCtor({ connectionString: this.config.connectionString, ssl: this.config.ssl });
      this.ownsPool = true;
    }

    await this.initTables();
    this.initialized = true;
  }

  private safeIdentifier(value: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Invalid PostgreSQL identifier: ${value}`);
    return value;
  }

  private table(name: string): string {
    return `"${this.schema}"."${this.tablePrefix}${name}"`;
  }

  private ensureInitialized(): void {
    if (!this.pool) throw new Error('PostgresMemoryStore not initialized. Call await memoryStore.init() first.');
  }

  private async pgQuery<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = [], client?: Queryable): Promise<PgQueryResult<T>> {
    this.ensureInitialized();
    return (client ?? this.pool!).query(text, params) as Promise<PgQueryResult<T>>;
  }

  private async initTables(): Promise<void> {
    await this.pgQuery(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table('memory')} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        topics JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at BIGINT NOT NULL,
        accessed_at BIGINT NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        agent_id TEXT,
        user_id TEXT
      )
    `);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_created_at" ON ${this.table('memory')} (created_at DESC)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_accessed_at" ON ${this.table('memory')} (accessed_at DESC)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_agent" ON ${this.table('memory')} (agent_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_user" ON ${this.table('memory')} (user_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_topics" ON ${this.table('memory')} USING GIN (topics)`);

    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table('layered_memories')} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        topics JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        layer TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        accessed_at BIGINT NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        expires_at BIGINT,
        importance REAL NOT NULL DEFAULT 0.5,
        valid_from BIGINT,
        valid_until BIGINT,
        supersedes TEXT,
        superseded_by TEXT,
        agent_id TEXT,
        user_id TEXT,
        created_ts BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::BIGINT
      )
    `);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_layer" ON ${this.table('layered_memories')} (layer)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_expires" ON ${this.table('layered_memories')} (expires_at)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_agent" ON ${this.table('layered_memories')} (agent_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_supersedes" ON ${this.table('layered_memories')} (supersedes)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_superseded_by" ON ${this.table('layered_memories')} (superseded_by)`);

    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table('snapshots')} (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL DEFAULT '',
        snapshot_data JSONB NOT NULL,
        memory_count INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        agent_id TEXT,
        user_id TEXT,
        checksum TEXT
      )
    `);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_snap_agent" ON ${this.table('snapshots')} (agent_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_snap_created" ON ${this.table('snapshots')} (created_at DESC)`);

    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table('embeddings')} (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        vector_base64 TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        model TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        embedding_type TEXT NOT NULL DEFAULT 'memory'
      )
    `);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_emb_memory" ON ${this.table('embeddings')} (memory_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_emb_type" ON ${this.table('embeddings')} (embedding_type)`);

    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table('events')} (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        payload JSONB NOT NULL
      )
    `);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_events_timestamp" ON ${this.table('events')} (timestamp DESC)`);
  }

  async store(input: StoreMemoryInput, opts?: StoreMemoryOptions): Promise<MemoryEntry> {
    const now = Date.now();
    const validated = memoryEntrySchema.parse({
      id: randomUUID(),
      content: input.content,
      topics: input.topics ?? [],
      metadata: input.metadata ?? {},
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
    });

    await this.pgQuery(
      `INSERT INTO ${this.table('memory')} (id, content, topics, metadata, created_at, accessed_at, access_count, agent_id, user_id)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9)`,
      [validated.id, validated.content, JSON.stringify(validated.topics), JSON.stringify(validated.metadata), validated.createdAt, validated.accessedAt, validated.accessCount, opts?.agentId ?? null, opts?.userId ?? null]
    );
    await this.logEvent('memory.stored', { entry: validated });
    return validated;
  }

  async get(id: string): Promise<MemoryEntry | null> {
    await this.pgQuery(`UPDATE ${this.table('memory')} SET access_count = access_count + 1, accessed_at = $1 WHERE id = $2`, [Date.now(), id]);
    const result = await this.pgQuery<Record<string, unknown>>(`SELECT * FROM ${this.table('memory')} WHERE id = $1`, [id]);
    if (result.rowCount === 0) return null;
    await this.logEvent('memory.accessed', { id });
    return memoryEntrySchema.parse(this.rowToMemory(result.rows[0]));
  }

  async query(text: string, options?: QueryOptions): Promise<{ results: QueryResult[]; totalAvailable: number }> {
    const opts = queryOptionsSchema.parse(options ?? {});
    const where: string[] = ['content ILIKE $1'];
    const params: unknown[] = [`%${text}%`];
    let idx = 2;

    if (opts.topics && opts.topics.length > 0) {
      where.push(`topics ?| $${idx}::text[]`);
      params.push(opts.topics);
      idx++;
    }
    if (opts.since) { where.push(`created_at >= $${idx++}`); params.push(opts.since); }
    if (opts.until) { where.push(`created_at <= $${idx++}`); params.push(opts.until); }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const count = await this.pgQuery<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${this.table('memory')} ${whereSql}`, params);
    const totalAvailable = Number(count.rows[0]?.count ?? 0);
    params.push(opts.limit);

    const result = await this.pgQuery<Record<string, unknown>>(
      `SELECT * FROM ${this.table('memory')} ${whereSql} ORDER BY access_count DESC, accessed_at DESC LIMIT $${idx}`,
      params
    );
    const results = result.rows.map((row) => {
      const entry = memoryEntrySchema.parse(this.rowToMemory(row));
      return this.toQueryResult(entry, this.simpleRelevance(entry.content, text));
    });
    await this.logEvent('memory.queried', { text, options: opts, resultCount: results.length });
    return { results, totalAvailable };
  }

  async getAllEntries(): Promise<QueryResult[]> {
    const result = await this.pgQuery<Record<string, unknown>>(`SELECT * FROM ${this.table('memory')} ORDER BY created_at DESC`);
    return result.rows.map((row) => this.toQueryResult(memoryEntrySchema.parse(this.rowToMemory(row)), 0));
  }

  async getRecent(n: number = 10): Promise<QueryResult[]> {
    const result = await this.pgQuery<Record<string, unknown>>(`SELECT * FROM ${this.table('memory')} ORDER BY accessed_at DESC LIMIT $1`, [n]);
    return result.rows.map((row) => this.toQueryResult(memoryEntrySchema.parse(this.rowToMemory(row))));
  }

  async getByTopic(topic: string, limit: number = 20): Promise<QueryResult[]> {
    const result = await this.pgQuery<Record<string, unknown>>(
      `SELECT * FROM ${this.table('memory')} WHERE topics ? $1 ORDER BY accessed_at DESC LIMIT $2`,
      [topic, limit]
    );
    return result.rows.map((row) => this.toQueryResult(memoryEntrySchema.parse(this.rowToMemory(row))));
  }

  async forget(id: string): Promise<boolean> {
    const result = await this.pgQuery(`DELETE FROM ${this.table('memory')} WHERE id = $1`, [id]);
    const forgotten = (result.rowCount ?? 0) > 0;
    if (forgotten) await this.logEvent('memory.forgotten', { id });
    return forgotten;
  }

  async persistLayerEntry(entry: LayeredMemoryEntry, opts?: StoreMemoryOptions): Promise<void> {
    await this.pgQuery(
      `INSERT INTO ${this.table('layered_memories')}
       (id, content, topics, metadata, layer, created_at, accessed_at, access_count, expires_at, importance, valid_from, valid_until, supersedes, superseded_by, agent_id, user_id)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET
        content=EXCLUDED.content, topics=EXCLUDED.topics, metadata=EXCLUDED.metadata, layer=EXCLUDED.layer,
        created_at=EXCLUDED.created_at, accessed_at=EXCLUDED.accessed_at, access_count=EXCLUDED.access_count,
        expires_at=EXCLUDED.expires_at, importance=EXCLUDED.importance, valid_from=EXCLUDED.valid_from,
        valid_until=EXCLUDED.valid_until, supersedes=EXCLUDED.supersedes, superseded_by=EXCLUDED.superseded_by,
        agent_id=EXCLUDED.agent_id, user_id=EXCLUDED.user_id`,
      [entry.id, entry.content, JSON.stringify(entry.topics), JSON.stringify(entry.metadata), entry.layer, entry.createdAt, entry.accessedAt, entry.accessCount, entry.expiresAt ?? null, entry.importance, entry.validFrom ?? null, entry.validUntil ?? null, entry.supersedes ?? null, entry.supersededBy ?? null, opts?.agentId ?? null, opts?.userId ?? null]
    );
  }

  async loadAllLayerEntries(opts?: StoreMemoryOptions): Promise<LayeredMemoryEntry[]> {
    const { where, params } = this.scopeWhere(opts);
    const result = await this.pgQuery<Record<string, unknown>>(`SELECT * FROM ${this.table('layered_memories')} ${where} ORDER BY created_at DESC`, params);
    return result.rows.map((row) => this.rowToLayerEntry(row));
  }

  async forgetLayerEntry(id: string): Promise<boolean> {
    const result = await this.pgQuery(`DELETE FROM ${this.table('layered_memories')} WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private async loadAllMemoryEntries(opts?: StoreMemoryOptions): Promise<MemoryEntry[]> {
    const { where, params } = this.scopeWhere(opts);
    const result = await this.pgQuery<Record<string, unknown>>(`SELECT * FROM ${this.table('memory')} ${where} ORDER BY created_at DESC`, params);
    return result.rows.map((row) => memoryEntrySchema.parse(this.rowToMemory(row)));
  }

  private async restoreMemoryEntry(entry: MemoryEntry, opts?: StoreMemoryOptions, client?: Queryable): Promise<void> {
    const validated = memoryEntrySchema.parse(entry);
    await this.pgQuery(
      `INSERT INTO ${this.table('memory')} (id, content, topics, metadata, created_at, accessed_at, access_count, agent_id, user_id)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content, topics=EXCLUDED.topics, metadata=EXCLUDED.metadata,
        created_at=EXCLUDED.created_at, accessed_at=EXCLUDED.accessed_at, access_count=EXCLUDED.access_count,
        agent_id=EXCLUDED.agent_id, user_id=EXCLUDED.user_id`,
      [validated.id, validated.content, JSON.stringify(validated.topics), JSON.stringify(validated.metadata), validated.createdAt, validated.accessedAt, validated.accessCount, opts?.agentId ?? null, opts?.userId ?? null],
      client
    );
  }

  async createSnapshot(label: string, opts?: StoreMemoryOptions): Promise<SnapshotMeta> {
    const now = Date.now();
    const id = randomUUID();
    const layerEntries = await this.loadAllLayerEntries(opts);
    const coreEntries = await this.loadAllMemoryEntries(opts);
    const snapshotData = { version: '0.6.5', createdAt: now, layerEntries, coreEntries, eventCount: this.eventLog.length };
    const checksum = this.snapshotChecksum(snapshotData);
    const layerCounts = { episodic: 0, semantic: 0, identity: 0, procedural: 0 } as Record<MemoryLayer, number>;
    for (const entry of layerEntries) if (entry.layer in layerCounts) layerCounts[entry.layer]++;

    await this.pgQuery(
      `INSERT INTO ${this.table('snapshots')} (id, label, snapshot_data, memory_count, created_at, agent_id, user_id, checksum)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)`,
      [id, label, JSON.stringify(snapshotData), layerEntries.length + coreEntries.length, now, opts?.agentId ?? null, opts?.userId ?? null, checksum]
    );
    await this.logEvent('snapshot.created', { id, label, memoryCount: layerEntries.length + coreEntries.length, checksum });
    return { id, label, createdAt: now, memoryCount: layerEntries.length + coreEntries.length, layerCounts, checksum, agentId: opts?.agentId ?? null, userId: opts?.userId ?? null };
  }

  async restoreSnapshot(snapshotId: string, opts?: StoreMemoryOptions): Promise<number> {
    const result = await this.pgQuery<Record<string, unknown>>(`SELECT snapshot_data, checksum FROM ${this.table('snapshots')} WHERE id = $1`, [snapshotId]);
    if (result.rowCount === 0) throw new Error(`Snapshot not found: ${snapshotId}`);
    const snapshotData = this.parseJson(result.rows[0].snapshot_data) as { layerEntries: LayeredMemoryEntry[]; coreEntries?: MemoryEntry[]; version: string };
    const checksum = result.rows[0].checksum as string | null;
    if (checksum && this.snapshotChecksum(snapshotData) !== checksum) throw new Error(`Snapshot checksum mismatch: ${snapshotId}`);

    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      await this.clearScoped(opts, client);
      let restored = 0;
      for (const entry of snapshotData.coreEntries ?? []) { await this.restoreMemoryEntry(entry, opts, client); restored++; }
      for (const entry of snapshotData.layerEntries) { await this.persistLayerEntryWithClient(entry, opts, client); restored++; }
      await client.query('COMMIT');
      await this.logEvent('snapshot.restored', { snapshotId, restored });
      return restored;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listSnapshots(opts?: StoreMemoryOptions): Promise<SnapshotMeta[]> {
    const { where, params } = this.scopeWhere(opts);
    const result = await this.pgQuery<Record<string, unknown>>(`SELECT id, label, memory_count, created_at, agent_id, user_id, checksum FROM ${this.table('snapshots')} ${where} ORDER BY created_at DESC`, params);
    return result.rows.map((row) => ({
      id: row.id as string,
      label: row.label as string,
      createdAt: Number(row.created_at),
      memoryCount: Number(row.memory_count),
      layerCounts: { episodic: 0, semantic: 0, identity: 0, procedural: 0 },
      checksum: row.checksum as string | null,
      agentId: row.agent_id as string | null,
      userId: row.user_id as string | null,
    }));
  }

  async exportSnapshot(snapshotId: string): Promise<SnapshotExport> {
    const result = await this.pgQuery<Record<string, unknown>>(`SELECT * FROM ${this.table('snapshots')} WHERE id = $1`, [snapshotId]);
    if (result.rowCount === 0) throw new Error(`Snapshot not found: ${snapshotId}`);
    const row = result.rows[0];
    const snapshotData = this.parseJson(row.snapshot_data);
    const checksum = (row.checksum as string | null) ?? this.snapshotChecksum(snapshotData);
    if (this.snapshotChecksum(snapshotData) !== checksum) throw new Error(`Snapshot checksum mismatch: ${snapshotId}`);
    return { id: row.id as string, label: row.label as string, createdAt: Number(row.created_at), memoryCount: Number(row.memory_count), checksum, agentId: row.agent_id as string | null, userId: row.user_id as string | null, snapshotData };
  }

  async importSnapshot(snapshot: SnapshotExport, opts?: { overwrite?: boolean }): Promise<SnapshotMeta> {
    const checksum = this.snapshotChecksum(snapshot.snapshotData);
    if (checksum !== snapshot.checksum) throw new Error('Snapshot import checksum mismatch');
    const existing = await this.pgQuery(`SELECT id FROM ${this.table('snapshots')} WHERE id = $1`, [snapshot.id]);
    if ((existing.rowCount ?? 0) > 0 && !opts?.overwrite) throw new Error(`Snapshot already exists: ${snapshot.id}`);
    await this.pgQuery(
      `INSERT INTO ${this.table('snapshots')} (id, label, snapshot_data, memory_count, created_at, agent_id, user_id, checksum)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, snapshot_data=EXCLUDED.snapshot_data, memory_count=EXCLUDED.memory_count,
        created_at=EXCLUDED.created_at, agent_id=EXCLUDED.agent_id, user_id=EXCLUDED.user_id, checksum=EXCLUDED.checksum`,
      [snapshot.id, snapshot.label, JSON.stringify(snapshot.snapshotData), snapshot.memoryCount, snapshot.createdAt, snapshot.agentId, snapshot.userId, checksum]
    );
    return { id: snapshot.id, label: snapshot.label, createdAt: snapshot.createdAt, memoryCount: snapshot.memoryCount, layerCounts: { episodic: 0, semantic: 0, identity: 0, procedural: 0 }, checksum, agentId: snapshot.agentId, userId: snapshot.userId };
  }

  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const result = await this.pgQuery(`DELETE FROM ${this.table('snapshots')} WHERE id = $1`, [snapshotId]);
    return (result.rowCount ?? 0) > 0;
  }

  async storeEmbedding(memoryId: string, base64: string, dimension: number, model: string, type: 'memory' | 'layered' = 'memory'): Promise<void> {
    await this.pgQuery(
      `INSERT INTO ${this.table('embeddings')} (id, memory_id, vector_base64, dimension, model, created_at, embedding_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET memory_id=EXCLUDED.memory_id, vector_base64=EXCLUDED.vector_base64,
        dimension=EXCLUDED.dimension, model=EXCLUDED.model, embedding_type=EXCLUDED.embedding_type`,
      [randomUUID(), memoryId, base64, dimension, model, Date.now(), type]
    );
  }

  async getEmbedding(memoryId: string): Promise<{ base64: string; dimension: number } | null> {
    const result = await this.pgQuery<{ vector_base64: string; dimension: number }>(`SELECT vector_base64, dimension FROM ${this.table('embeddings')} WHERE memory_id = $1 LIMIT 1`, [memoryId]);
    if (result.rowCount === 0) return null;
    return { base64: result.rows[0].vector_base64, dimension: Number(result.rows[0].dimension) };
  }

  async deleteEmbedding(memoryId: string): Promise<void> {
    await this.pgQuery(`DELETE FROM ${this.table('embeddings')} WHERE memory_id = $1`, [memoryId]);
  }

  async semanticQuery(queryText: string, queryVector: number[] | null, opts?: QueryOptions): Promise<{ results: QueryResult[]; totalAvailable: number }> {
    const limit = opts?.limit ?? 10;
    const where: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (opts?.topics && opts.topics.length > 0) { where.push(`topics ?| $${idx}::text[]`); params.push(opts.topics); idx++; }
    if (opts?.since) { where.push(`created_at >= $${idx++}`); params.push(opts.since); }
    if (opts?.until) { where.push(`created_at <= $${idx++}`); params.push(opts.until); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = await this.pgQuery<Record<string, unknown>>(`SELECT id, content, topics, created_at, accessed_at, access_count FROM ${this.table('memory')} ${whereSql}`, params);
    const scored: QueryResult[] = [];
    for (const row of result.rows) {
      let relevanceScore: number;
      const embedding = await this.getEmbedding(row.id as string);
      if (queryVector && embedding) {
        try { relevanceScore = EmbeddingService.cosineSimilarity(queryVector, EmbeddingService.decodeVector(embedding.base64, embedding.dimension)); }
        catch { relevanceScore = this.simpleRelevance(row.content as string, queryText); }
      } else {
        relevanceScore = this.simpleRelevance(row.content as string, queryText);
      }
      scored.push({ id: row.id as string, content: row.content as string, topics: this.parseJson(row.topics) as string[], relevanceScore, createdAt: Number(row.created_at), accessedAt: Number(row.accessed_at), accessCount: Number(row.access_count) });
    }
    scored.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    return { results: scored.slice(0, limit), totalAvailable: scored.length };
  }

  getEventLog(limit: number = 100): MemoryEvent[] {
    return this.eventLog.slice(0, limit);
  }

  persist(): void {
    // PostgreSQL commits each statement immediately unless an explicit transaction is used.
  }

  async close(): Promise<void> {
    if (this.pool && this.ownsPool) await this.pool.end();
    this.pool = null;
    this.initialized = false;
  }

  private async persistLayerEntryWithClient(entry: LayeredMemoryEntry, opts: StoreMemoryOptions | undefined, client: Queryable): Promise<void> {
    await this.pgQuery(
      `INSERT INTO ${this.table('layered_memories')}
       (id, content, topics, metadata, layer, created_at, accessed_at, access_count, expires_at, importance, valid_from, valid_until, supersedes, superseded_by, agent_id, user_id)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content, topics=EXCLUDED.topics, metadata=EXCLUDED.metadata, layer=EXCLUDED.layer,
        created_at=EXCLUDED.created_at, accessed_at=EXCLUDED.accessed_at, access_count=EXCLUDED.access_count,
        expires_at=EXCLUDED.expires_at, importance=EXCLUDED.importance, valid_from=EXCLUDED.valid_from,
        valid_until=EXCLUDED.valid_until, supersedes=EXCLUDED.supersedes, superseded_by=EXCLUDED.superseded_by,
        agent_id=EXCLUDED.agent_id, user_id=EXCLUDED.user_id`,
      [entry.id, entry.content, JSON.stringify(entry.topics), JSON.stringify(entry.metadata), entry.layer, entry.createdAt, entry.accessedAt, entry.accessCount, entry.expiresAt ?? null, entry.importance, entry.validFrom ?? null, entry.validUntil ?? null, entry.supersedes ?? null, entry.supersededBy ?? null, opts?.agentId ?? null, opts?.userId ?? null],
      client
    );
  }

  private async clearScoped(opts: StoreMemoryOptions | undefined, client: Queryable): Promise<void> {
    if (opts?.agentId || opts?.userId) {
      const where: string[] = [];
      const params: unknown[] = [];
      let idx = 1;
      if (opts.agentId) { where.push(`agent_id = $${idx++}`); params.push(opts.agentId); }
      if (opts.userId) { where.push(`user_id = $${idx++}`); params.push(opts.userId); }
      await this.pgQuery(`DELETE FROM ${this.table('layered_memories')} WHERE ${where.join(' AND ')}`, params, client);
      await this.pgQuery(`DELETE FROM ${this.table('memory')} WHERE ${where.join(' AND ')}`, params, client);
    } else {
      await this.pgQuery(`DELETE FROM ${this.table('layered_memories')}`, [], client);
      await this.pgQuery(`DELETE FROM ${this.table('memory')}`, [], client);
    }
  }

  private scopeWhere(opts?: StoreMemoryOptions): { where: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (opts?.agentId) { conditions.push(`(agent_id = $${idx++} OR agent_id IS NULL)`); params.push(opts.agentId); }
    if (opts?.userId) { conditions.push(`(user_id = $${idx++} OR user_id IS NULL)`); params.push(opts.userId); }
    return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
  }

  private rowToMemory(row: Record<string, unknown>): MemoryEntry {
    return {
      id: row.id as string,
      content: row.content as string,
      topics: this.parseJson(row.topics) as string[],
      metadata: this.parseJson(row.metadata) as Record<string, unknown>,
      createdAt: Number(row.created_at),
      accessedAt: Number(row.accessed_at),
      accessCount: Number(row.access_count),
    };
  }

  private rowToLayerEntry(row: Record<string, unknown>): LayeredMemoryEntry {
    return {
      id: row.id as string,
      content: row.content as string,
      topics: this.parseJson(row.topics) as string[],
      metadata: this.parseJson(row.metadata) as Record<string, unknown>,
      layer: row.layer as MemoryLayer,
      createdAt: Number(row.created_at),
      accessedAt: Number(row.accessed_at),
      accessCount: Number(row.access_count),
      expiresAt: row.expires_at == null ? undefined : Number(row.expires_at),
      importance: row.importance == null ? 0.5 : Number(row.importance),
      validFrom: row.valid_from == null ? undefined : Number(row.valid_from),
      validUntil: row.valid_until == null ? undefined : Number(row.valid_until),
      supersedes: row.supersedes as string | undefined,
      supersededBy: row.superseded_by as string | undefined,
    };
  }

  private toQueryResult(entry: MemoryEntry, relevanceScore?: number): QueryResult {
    return { id: entry.id, content: entry.content, topics: entry.topics, relevanceScore, createdAt: entry.createdAt, accessedAt: entry.accessedAt, accessCount: entry.accessCount };
  }

  private parseJson(value: unknown): unknown {
    return typeof value === 'string' ? JSON.parse(value) : value;
  }

  private snapshotChecksum(snapshotData: unknown): string {
    return createHash('sha256').update(JSON.stringify(snapshotData)).digest('hex');
  }

  private simpleRelevance(content: string, query: string): number {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return 0;
    const lower = content.toLowerCase();
    return terms.filter((term) => lower.includes(term)).length / terms.length;
  }

  private async logEvent(type: MemoryEvent['type'], payload: Record<string, unknown>): Promise<void> {
    const event: MemoryEvent = { id: randomUUID(), type, timestamp: Date.now(), payload };
    this.eventLog.push(event);
    await this.pgQuery(
      `INSERT INTO ${this.table('events')} (id, type, timestamp, payload) VALUES ($1,$2,$3,$4::jsonb)`,
      [event.id, event.type, event.timestamp, JSON.stringify(event.payload)]
    ).catch(() => undefined);
  }
}

