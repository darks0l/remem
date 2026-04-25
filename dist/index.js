"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ConstitutionInjector: () => ConstitutionInjector,
  ConstitutionManager: () => ConstitutionManager,
  DEFAULT_LAYER_CONFIG: () => DEFAULT_LAYER_CONFIG,
  DriftDetector: () => DriftDetector,
  LayerManager: () => LayerManager,
  MemoryStore: () => MemoryStore,
  ModelAbstraction: () => ModelAbstraction,
  QueryEngine: () => QueryEngine,
  ReMEM: () => ReMEM,
  buildIdentityPackage: () => buildIdentityPackage,
  constitutionSchema: () => constitutionSchema,
  constitutionStatementSchema: () => constitutionStatementSchema,
  createIdentitySystem: () => createIdentitySystem,
  downloadPackage: () => downloadPackage,
  driftEventSchema: () => driftEventSchema,
  driftResultSchema: () => driftResultSchema,
  duplicate: () => duplicate,
  duplicationConfigSchema: () => duplicationConfigSchema,
  embeddingConfigSchema: () => embeddingConfigSchema,
  eventTypeSchema: () => eventTypeSchema,
  identityCategorySchema: () => identityCategorySchema,
  identityConfigSchema: () => identityConfigSchema,
  identityPackageSchema: () => identityPackageSchema,
  infect: () => infect,
  infectFromServer: () => infectFromServer,
  infectionConfigSchema: () => infectionConfigSchema,
  layerConfigSchema: () => layerConfigSchema,
  layeredMemoryEntrySchema: () => layeredMemoryEntrySchema,
  memoryEntrySchema: () => memoryEntrySchema,
  memoryEventSchema: () => memoryEventSchema,
  memoryLayerSchema: () => memoryLayerSchema,
  modelConfigSchema: () => modelConfigSchema,
  queryOptionsSchema: () => queryOptionsSchema,
  queryResponseSchema: () => queryResponseSchema,
  queryResultSchema: () => queryResultSchema,
  rememConfigSchema: () => rememConfigSchema,
  storeMemoryInputSchema: () => storeMemoryInputSchema,
  uploadPackage: () => uploadPackage
});
module.exports = __toCommonJS(index_exports);

// src/store.ts
var import_sql = __toESM(require("sql.js"));
var import_crypto2 = require("crypto");

// src/types.ts
var import_zod = require("zod");
var memoryEntrySchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  content: import_zod.z.string(),
  topics: import_zod.z.array(import_zod.z.string()).default([]),
  metadata: import_zod.z.record(import_zod.z.unknown()).default({}),
  createdAt: import_zod.z.number(),
  // unix timestamp ms
  accessedAt: import_zod.z.number(),
  // unix timestamp ms
  accessCount: import_zod.z.number().default(0)
});
var storeMemoryInputSchema = import_zod.z.object({
  content: import_zod.z.string().min(1),
  topics: import_zod.z.array(import_zod.z.string()).optional().default([]),
  metadata: import_zod.z.record(import_zod.z.unknown()).optional().default({})
});
var queryOptionsSchema = import_zod.z.object({
  limit: import_zod.z.number().min(1).max(100).default(10),
  topics: import_zod.z.array(import_zod.z.string()).optional(),
  minAccessCount: import_zod.z.number().optional(),
  since: import_zod.z.number().optional(),
  // unix timestamp ms
  until: import_zod.z.number().optional()
});
var queryResultSchema = import_zod.z.object({
  id: import_zod.z.string(),
  content: import_zod.z.string(),
  topics: import_zod.z.array(import_zod.z.string()),
  relevanceScore: import_zod.z.number().optional(),
  createdAt: import_zod.z.number(),
  accessedAt: import_zod.z.number(),
  accessCount: import_zod.z.number()
});
var queryResponseSchema = import_zod.z.object({
  results: import_zod.z.array(queryResultSchema),
  totalAvailable: import_zod.z.number(),
  query: import_zod.z.string(),
  tookMs: import_zod.z.number()
});
var modelConfigSchema = import_zod.z.discriminatedUnion("type", [
  import_zod.z.object({
    type: import_zod.z.literal("bankr"),
    apiKey: import_zod.z.string().min(1),
    baseUrl: import_zod.z.string().url().optional()
  }),
  import_zod.z.object({
    type: import_zod.z.literal("openai"),
    apiKey: import_zod.z.string().min(1),
    model: import_zod.z.string().optional().default("gpt-4o"),
    baseUrl: import_zod.z.string().url().optional()
  }),
  import_zod.z.object({
    type: import_zod.z.literal("anthropic"),
    apiKey: import_zod.z.string().min(1),
    model: import_zod.z.string().optional().default("claude-sonnet-4-6"),
    baseUrl: import_zod.z.string().url().optional()
  }),
  import_zod.z.object({
    type: import_zod.z.literal("ollama"),
    baseUrl: import_zod.z.string().url().default("http://localhost:11434"),
    model: import_zod.z.string().default("llama3")
  })
]);
var embeddingConfigSchema = import_zod.z.object({
  /** Enable vector embeddings for semantic search (default: false) */
  enabled: import_zod.z.boolean().default(false),
  /** Ollama base URL (e.g. http://192.168.68.73:11434) */
  baseUrl: import_zod.z.string().default("http://localhost:11434"),
  /** Embedding model to use (e.g. 'nomic-embed-text', 'mxbai-embed-large') */
  model: import_zod.z.string().default("nomic-embed-text"),
  /** Embedding dimension (auto-detected on first embed if not set) */
  dimension: import_zod.z.number().optional(),
  /** Whether to generate embeddings async in background (non-blocking store) */
  asyncEmbed: import_zod.z.boolean().default(true)
});
var rememConfigSchema = import_zod.z.object({
  storage: import_zod.z.enum(["sqlite", "postgres", "memory"]).default("sqlite"),
  storageConfig: import_zod.z.record(import_zod.z.unknown()).optional(),
  llm: modelConfigSchema.optional(),
  adapter: import_zod.z.string().optional(),
  dbPath: import_zod.z.string().optional(),
  // for sqlite
  embeddings: embeddingConfigSchema.optional()
});
var eventTypeSchema = import_zod.z.enum([
  "memory.stored",
  "memory.queried",
  "memory.accessed",
  "memory.forgotten",
  "memory.superseded",
  "snapshot.created",
  "snapshot.restored",
  "identity.constitution_updated",
  "identity.drift_detected",
  "identity.drift_correction_injected"
]);
var memoryEventSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  type: eventTypeSchema,
  timestamp: import_zod.z.number(),
  payload: import_zod.z.record(import_zod.z.unknown())
});
var identityCategorySchema = import_zod.z.enum(["values", "boundaries", "preferences", "goals"]);
var constitutionStatementSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  text: import_zod.z.string().min(1),
  category: identityCategorySchema,
  weight: import_zod.z.number().min(0).max(1).default(0.5),
  source: import_zod.z.string().optional(),
  // e.g. 'SOUL.md', 'IDENTITY.md', 'manual'
  createdAt: import_zod.z.number()
});
var constitutionSchema = import_zod.z.object({
  statements: import_zod.z.array(constitutionStatementSchema),
  version: import_zod.z.string().default("1.0"),
  createdAt: import_zod.z.number(),
  updatedAt: import_zod.z.number()
});
var driftResultSchema = import_zod.z.object({
  score: import_zod.z.number().min(0).max(1),
  level: import_zod.z.enum(["aligned", "minor", "moderate", "critical"]),
  violatingStatements: import_zod.z.array(constitutionStatementSchema),
  reasoning: import_zod.z.string(),
  detectedAt: import_zod.z.number()
});
var identityConfigSchema = import_zod.z.object({
  constitution: constitutionSchema.optional(),
  driftThreshold: import_zod.z.number().min(0).max(1).default(0.3),
  criticalThreshold: import_zod.z.number().min(0).max(1).default(0.7),
  autoInject: import_zod.z.boolean().default(true),
  evalModel: modelConfigSchema.optional()
  // separate eval model (local Ollama preferred for cost)
});
var memoryLayerSchema = import_zod.z.enum(["episodic", "semantic", "identity", "procedural"]);
var layerConfigSchema = import_zod.z.object({
  episodic: import_zod.z.object({
    ttlMs: import_zod.z.number().default(36e5),
    // 1 hour
    maxEntries: import_zod.z.number().default(1e3),
    weight: import_zod.z.number().default(0.2)
  }),
  semantic: import_zod.z.object({
    ttlMs: import_zod.z.number().default(6048e5),
    // 7 days
    maxEntries: import_zod.z.number().default(5e3),
    weight: import_zod.z.number().default(0.3),
    // Temporal self-edit options
    selfEdit: import_zod.z.boolean().default(false),
    // auto-supersede conflicting entries
    temporalValidity: import_zod.z.boolean().default(true)
    // track validFrom/validUntil
  }),
  identity: import_zod.z.object({
    ttlMs: import_zod.z.number().default(2592e6),
    // 30 days
    maxEntries: import_zod.z.number().default(500),
    weight: import_zod.z.number().default(0.5)
  }),
  procedural: import_zod.z.object({
    ttlMs: import_zod.z.number().default(2592e6),
    // 30 days (long-term rules)
    maxEntries: import_zod.z.number().default(500),
    weight: import_zod.z.number().default(0.4),
    trigger: import_zod.z.string().optional()
    // keyword that fires this rule
  })
});
var layeredMemoryEntrySchema = memoryEntrySchema.extend({
  layer: memoryLayerSchema.default("episodic"),
  expiresAt: import_zod.z.number().optional(),
  importance: import_zod.z.number().min(0).max(1).default(0.5),
  // Temporal validity (semantic layer)
  validFrom: import_zod.z.number().optional(),
  // when this fact became true
  validUntil: import_zod.z.number().optional(),
  // when this fact stopped being true (null = still valid)
  // Self-edit supersession chain
  supersedes: import_zod.z.string().optional(),
  // id of the entry this one supersedes (older version)
  supersededBy: import_zod.z.string().optional()
  // id of the entry that supersedes this one
});
var driftEventSchema = import_zod.z.object({
  driftResult: driftResultSchema,
  correctionInjected: import_zod.z.boolean().default(false),
  correctionText: import_zod.z.string().optional()
});
var identityPackageSchema = import_zod.z.object({
  version: import_zod.z.string().default("1.0"),
  agentId: import_zod.z.string().optional(),
  userId: import_zod.z.string().optional(),
  exportedAt: import_zod.z.number(),
  constitution: import_zod.z.object({
    statements: import_zod.z.array(constitutionStatementSchema),
    version: import_zod.z.string().default("1.0"),
    createdAt: import_zod.z.number(),
    updatedAt: import_zod.z.number()
  }),
  memories: import_zod.z.array(layeredMemoryEntrySchema),
  soul: import_zod.z.object({
    content: import_zod.z.string(),
    source: import_zod.z.string().optional()
  }).optional(),
  identity: import_zod.z.object({
    content: import_zod.z.string(),
    source: import_zod.z.string().optional()
  }).optional(),
  metadata: import_zod.z.record(import_zod.z.unknown()).default({})
});
var duplicationConfigSchema = import_zod.z.object({
  /** DARKSOL server URL (e.g. https://api.darksol.net) */
  serverUrl: import_zod.z.string().url(),
  /** API key for the server */
  apiKey: import_zod.z.string().min(1),
  /** Include SOUL.md content in export */
  includeSoul: import_zod.z.boolean().default(true),
  /** Include IDENTITY.md content in export */
  includeIdentity: import_zod.z.boolean().default(true),
  /** Include all memory layers in export */
  includeAllLayers: import_zod.z.boolean().default(true),
  /** Only include specific layers */
  layers: import_zod.z.array(memoryLayerSchema).optional(),
  /** Custom agent/user ID for scoping */
  agentId: import_zod.z.string().optional(),
  userId: import_zod.z.string().optional()
});
var infectionConfigSchema = import_zod.z.object({
  /** DARKSOL server URL */
  serverUrl: import_zod.z.string().url(),
  /** API key for the server */
  apiKey: import_zod.z.string().min(1),
  /** Source agent ID to infect FROM (optional — defaults to user\'s primary) */
  sourceAgentId: import_zod.z.string().optional(),
  /** Identity package version to pull (optional — defaults to latest) */
  version: import_zod.z.string().optional(),
  /** Auto-refresh interval in ms (0 = no auto-refresh) */
  refreshIntervalMs: import_zod.z.number().default(0),
  /** Layers to apply from the package */
  layers: import_zod.z.array(import_zod.z.enum(["identity", "semantic", "procedural"])).default(["identity"])
});

// src/embeddings.ts
var import_crypto = require("crypto");
var OLLAMA_EMBED_URL = "/api/embeddings";
var EmbeddingService = class _EmbeddingService {
  config;
  detectedDimension = null;
  httpFetch;
  constructor(config, httpFetch = fetch) {
    this.config = { dimension: 768, ...config };
    this.detectedDimension = config.dimension ?? null;
    this.httpFetch = httpFetch;
  }
  get baseUrl() {
    return this.config.baseUrl;
  }
  get model() {
    return this.config.model;
  }
  get isConfigured() {
    return Boolean(this.config.baseUrl && this.config.model);
  }
  /**
   * Generate embedding for a single text.
   * Uses Ollama's /api/embeddings endpoint.
   */
  async embed(text) {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}${OLLAMA_EMBED_URL}`;
    const response = await this.httpFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text
      })
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      throw new Error(`Embedding failed (${response.status}): ${err}`);
    }
    const data = await response.json();
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error(`Invalid embedding response: ${JSON.stringify(data)}`);
    }
    if (this.detectedDimension === null) {
      this.detectedDimension = data.embedding.length;
    }
    return data.embedding;
  }
  /**
   * Generate embeddings for multiple texts in batch.
   * Calls embed() sequentially — Ollama doesn't have a batch endpoint.
   */
  async embedBatch(texts, signal) {
    const vectors = [];
    for (const text of texts) {
      if (signal?.aborted) break;
      vectors.push(await this.embed(text));
    }
    return vectors;
  }
  /**
   * Encode a float32 vector to base64url.
   * Uses Buffer.from with a Uint8Array view of the Float32Array buffer.
   */
  static encodeVector(vec) {
    const floatArr = new Float32Array(vec);
    const byteArr = new Uint8Array(floatArr.buffer);
    return Buffer.from(byteArr).toString("base64url");
  }
  /**
   * Decode a base64url string back to a float32 vector.
   */
  static decodeVector(base64, dimension) {
    const byteArr = Buffer.from(base64, "base64url");
    const floatArr = new Float32Array(byteArr.buffer, byteArr.byteOffset, dimension);
    return Array.from(floatArr);
  }
  /**
   * Compute cosine similarity between two vectors.
   * Returns a value between -1 (opposite) and 1 (identical).
   */
  static cosineSimilarity(a, b) {
    if (a.length !== b.length) throw new Error("Vector dimension mismatch");
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
  /**
   * Generate and package an embedding vector for storage.
   */
  async generateEmbedding(memoryId, text) {
    const vector = await this.embed(text);
    return {
      id: (0, import_crypto.randomUUID)(),
      memoryId,
      vector,
      base64: _EmbeddingService.encodeVector(vector),
      model: this.config.model,
      createdAt: Date.now()
    };
  }
};

// src/store.ts
var MemoryStore = class {
  db = null;
  eventLog = [];
  dbPath;
  initialized = false;
  constructor(dbPath = ":memory:") {
    this.dbPath = dbPath;
  }
  async init() {
    if (this.initialized) return;
    const SQL = await (0, import_sql.default)();
    if (this.dbPath === ":memory:") {
      this.db = new SQL.Database();
    } else {
      try {
        const { readFileSync, existsSync } = await import("fs");
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
    if (this.db) {
      try {
        this.db.run("PRAGMA journal_mode=WAL");
      } catch {
      }
      try {
        this.db.run("PRAGMA synchronous=NORMAL");
      } catch {
      }
    }
    this.initTables();
    this.initialized = true;
  }
  initTables() {
    if (!this.db) return;
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
    this.db.run(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL DEFAULT '',
        snapshot_data TEXT NOT NULL,
        memory_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        agent_id TEXT,
        user_id TEXT
      )
    `);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_snap_agent ON snapshots(agent_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_snap_created ON snapshots(created_at DESC)`);
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
  ensureInitialized() {
    if (!this.db) throw new Error("MemoryStore not initialized. Call await memoryStore.init() first.");
  }
  async store(input, opts) {
    this.ensureInitialized();
    const now = Date.now();
    const entry = {
      id: (0, import_crypto2.randomUUID)(),
      content: input.content,
      topics: input.topics ?? [],
      metadata: input.metadata ?? {},
      createdAt: now,
      accessedAt: now,
      accessCount: 0
    };
    const validated = memoryEntrySchema.parse(entry);
    this.db.run(
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
        opts?.userId ?? null
      ]
    );
    this.logEvent("memory.stored", { entry: validated });
    this.persist();
    return validated;
  }
  async get(id) {
    this.ensureInitialized();
    this.db.run(`UPDATE memory SET access_count = access_count + 1, accessed_at = ? WHERE id = ?`, [
      Date.now(),
      id
    ]);
    const result = this.db.exec("SELECT * FROM memory WHERE id = ?", [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const row = this.rowToObject(result[0].columns, result[0].values[0]);
    const entry = memoryEntrySchema.parse(row);
    this.logEvent("memory.accessed", { id });
    this.persist();
    return entry;
  }
  async query(text, options) {
    this.ensureInitialized();
    const opts = queryOptionsSchema.parse(options ?? {});
    let sql = "SELECT * FROM memory WHERE content LIKE ?";
    const params = [`%${text}%`];
    if (opts.topics && opts.topics.length > 0) {
      const topicConditions = opts.topics.map(() => "topics LIKE ?").join(" OR ");
      sql += ` AND (${topicConditions})`;
      params.push(...opts.topics.map((t) => `%${t}%`));
    }
    if (opts.since) {
      sql += " AND created_at >= ?";
      params.push(opts.since);
    }
    if (opts.until) {
      sql += " AND created_at <= ?";
      params.push(opts.until);
    }
    sql += " ORDER BY access_count DESC, accessed_at DESC";
    const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as count");
    const countResult = this.db.exec(countSql, params);
    const totalAvailable = countResult[0]?.values[0]?.[0] ?? 0;
    sql += " LIMIT ? OFFSET 0";
    params.push(opts.limit);
    const result = this.db.exec(sql, params);
    if (result.length === 0) {
      return { results: [], totalAvailable };
    }
    const rows = result[0].values.map((v) => this.rowToObject(result[0].columns, v));
    const results = rows.map((row) => {
      const entry = memoryEntrySchema.parse(row);
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        relevanceScore: this.simpleRelevance(entry.content, text),
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount
      };
    });
    this.logEvent("memory.queried", { text, options: opts, resultCount: results.length });
    return { results, totalAvailable };
  }
  /**
   * Get all memory entries (no text filter, ignores limit).
   * Used internally by the duplication/export feature.
   */
  async getAllEntries() {
    this.ensureInitialized();
    const result = this.db.exec("SELECT * FROM memory ORDER BY created_at DESC");
    if (result.length === 0) return [];
    return result[0].values.map((v) => {
      const entry = memoryEntrySchema.parse(this.rowToObject(result[0].columns, v));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        relevanceScore: 0,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount
      };
    });
  }
  async getRecent(n = 10) {
    this.ensureInitialized();
    const result = this.db.exec("SELECT * FROM memory ORDER BY accessed_at DESC LIMIT ?", [n]);
    if (result.length === 0) return [];
    return result[0].values.map((v) => {
      const entry = memoryEntrySchema.parse(this.rowToObject(result[0].columns, v));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount
      };
    });
  }
  async getByTopic(topic, limit = 20) {
    this.ensureInitialized();
    const result = this.db.exec(
      "SELECT * FROM memory WHERE topics LIKE ? ORDER BY accessed_at DESC LIMIT ?",
      [`%${topic}%`, limit]
    );
    if (result.length === 0) return [];
    return result[0].values.map((v) => {
      const entry = memoryEntrySchema.parse(this.rowToObject(result[0].columns, v));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount
      };
    });
  }
  async forget(id) {
    this.ensureInitialized();
    this.db.run("DELETE FROM memory WHERE id = ?", [id]);
    const changes = this.db.getRowsModified();
    if (changes > 0) {
      this.logEvent("memory.forgotten", { id });
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
  async persistLayerEntry(entry, opts) {
    this.ensureInitialized();
    this.db.run(
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
        opts?.userId ?? null
      ]
    );
    this.persist();
  }
  /**
   * Load all persisted layer entries from SQLite.
   * Called on ReMEM.init() to restore layer state.
   */
  async loadAllLayerEntries(opts) {
    this.ensureInitialized();
    let sql = "SELECT * FROM layered_memories WHERE 1=1";
    const params = [];
    if (opts?.agentId) {
      sql += " AND (agent_id = ? OR agent_id IS NULL)";
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      sql += " AND (user_id = ? OR user_id IS NULL)";
      params.push(opts.userId);
    }
    sql += " ORDER BY created_at DESC";
    const result = this.db.exec(sql, params);
    if (result.length === 0) return [];
    return result[0].values.map((v) => {
      const obj = this.rowToObject(result[0].columns, v);
      return {
        id: obj["id"],
        content: obj["content"],
        topics: typeof obj["topics"] === "string" ? JSON.parse(obj["topics"]) : obj["topics"],
        metadata: typeof obj["metadata"] === "string" ? JSON.parse(obj["metadata"]) : obj["metadata"],
        layer: obj["layer"],
        createdAt: obj["createdAt"],
        accessedAt: obj["accessedAt"],
        accessCount: obj["accessCount"],
        expiresAt: obj["expiresAt"],
        importance: obj["importance"] ?? 0.5,
        validFrom: obj["validFrom"],
        validUntil: obj["validUntil"],
        supersedes: obj["supersedes"],
        supersededBy: obj["supersededBy"]
      };
    });
  }
  /**
   * Delete a layered memory entry.
   */
  async forgetLayerEntry(id) {
    this.ensureInitialized();
    this.db.run("DELETE FROM layered_memories WHERE id = ?", [id]);
    const changes = this.db.getRowsModified();
    if (changes > 0) this.persist();
    return changes > 0;
  }
  /**
   * Create a named snapshot of current memory state.
   * For long-running agents — take a snapshot before restarts or major operations.
   * @param label Human-readable label for this snapshot
   * @param opts Agent/user scope
   */
  async createSnapshot(label, opts) {
    this.ensureInitialized();
    const now = Date.now();
    const id = (0, import_crypto2.randomUUID)();
    const layerEntries = await this.loadAllLayerEntries(opts);
    const coreEntries = await this.query("", { limit: 1e4 });
    const snapshotData = {
      version: "0.3.1",
      createdAt: now,
      layerEntries,
      coreEntries: coreEntries.results,
      eventCount: this.eventLog.length
    };
    const layerCounts = { episodic: 0, semantic: 0, identity: 0, procedural: 0 };
    for (const e of layerEntries) {
      if (e.layer in layerCounts) layerCounts[e.layer]++;
    }
    this.db.run(
      `INSERT INTO snapshots (id, label, snapshot_data, memory_count, created_at, agent_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        label,
        JSON.stringify(snapshotData),
        layerEntries.length,
        now,
        opts?.agentId ?? null,
        opts?.userId ?? null
      ]
    );
    this.logEvent("snapshot.created", { id, label, memoryCount: layerEntries.length });
    this.persist();
    return {
      id,
      label,
      createdAt: now,
      memoryCount: layerEntries.length,
      layerCounts,
      agentId: opts?.agentId ?? null,
      userId: opts?.userId ?? null
    };
  }
  /**
   * Restore from a snapshot by ID.
   * Overwrites current layer state with snapshot state.
   * @returns Number of entries restored
   */
  async restoreSnapshot(snapshotId, opts) {
    this.ensureInitialized();
    const result = this.db.exec("SELECT snapshot_data, agent_id, user_id FROM snapshots WHERE id = ?", [snapshotId]);
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    const row = this.rowToObject(result[0].columns, result[0].values[0]);
    const data = JSON.parse(row["snapshot_data"]);
    const scopedEntries = data.layerEntries.filter((e) => {
      if (opts?.agentId && e.metadata?.agentId !== opts.agentId) return false;
      if (opts?.userId && e.metadata?.userId !== opts.userId) return false;
      return true;
    });
    if (opts?.agentId || opts?.userId) {
      const conditions = [];
      const params = [];
      if (opts.agentId) {
        conditions.push("agent_id = ?");
        params.push(opts.agentId);
      }
      if (opts.userId) {
        conditions.push("user_id = ?");
        params.push(opts.userId);
      }
      this.db.run(`DELETE FROM layered_memories WHERE ${conditions.join(" AND ")}`, params);
    } else {
      this.db.run("DELETE FROM layered_memories");
    }
    let restored = 0;
    for (const entry of scopedEntries) {
      await this.persistLayerEntry(entry, {
        agentId: opts?.agentId,
        userId: opts?.userId
      });
      restored++;
    }
    this.logEvent("snapshot.restored", { snapshotId, restored });
    this.persist();
    return restored;
  }
  /**
   * List available snapshots.
   */
  async listSnapshots(opts) {
    this.ensureInitialized();
    let sql = "SELECT id, label, memory_count, created_at, agent_id, user_id FROM snapshots WHERE 1=1";
    const params = [];
    if (opts?.agentId) {
      sql += " AND (agent_id = ? OR agent_id IS NULL)";
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      sql += " AND (user_id = ? OR user_id IS NULL)";
      params.push(opts.userId);
    }
    sql += " ORDER BY created_at DESC";
    const result = this.db.exec(sql, params);
    if (result.length === 0) return [];
    return result[0].values.map((v) => {
      const obj = this.rowToObject(result[0].columns, v);
      return {
        id: obj["id"],
        label: obj["label"],
        createdAt: obj["createdAt"],
        memoryCount: obj["memory_count"],
        layerCounts: { episodic: 0, semantic: 0, identity: 0, procedural: 0 },
        agentId: obj["agent_id"],
        userId: obj["user_id"]
      };
    });
  }
  /**
   * Delete a snapshot.
   */
  async deleteSnapshot(snapshotId) {
    this.ensureInitialized();
    this.db.run("DELETE FROM snapshots WHERE id = ?", [snapshotId]);
    const changes = this.db.getRowsModified();
    if (changes > 0) this.persist();
    return changes > 0;
  }
  // ─── Embeddings (v0.3.2) ───────────────────────────────────────────────────
  /**
   * Store a vector embedding for a memory entry.
   * Called after MemoryStore.store() when embeddings are enabled.
   */
  async storeEmbedding(memoryId, base64, dimension, model, type = "memory") {
    this.ensureInitialized();
    const id = (0, import_crypto2.randomUUID)();
    this.db.run(
      `INSERT OR REPLACE INTO embeddings (id, memory_id, vector_base64, dimension, model, created_at, embedding_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, memoryId, base64, dimension, model, Date.now(), type]
    );
    this.persist();
  }
  /**
   * Get embedding for a memory entry.
   */
  async getEmbedding(memoryId) {
    this.ensureInitialized();
    const result = this.db.exec(
      "SELECT vector_base64, dimension FROM embeddings WHERE memory_id = ?",
      [memoryId]
    );
    if (result.length === 0 || result[0].values.length === 0) return null;
    return {
      base64: result[0].values[0][0],
      dimension: result[0].values[0][1]
    };
  }
  /**
   * Delete embedding for a memory entry.
   */
  async deleteEmbedding(memoryId) {
    this.ensureInitialized();
    this.db.run("DELETE FROM embeddings WHERE memory_id = ?", [memoryId]);
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
  async semanticQuery(queryText, queryVector, opts) {
    this.ensureInitialized();
    const limit = opts?.limit ?? 10;
    let sql = "SELECT id, content, topics, created_at, accessed_at, access_count FROM memory m";
    const params = [];
    if (opts?.topics && opts.topics.length > 0) {
      const topicConditions = opts.topics.map(() => "m.topics LIKE ?").join(" OR ");
      sql += ` WHERE (${topicConditions})`;
      params.push(...opts.topics.map((t) => `%${t}%`));
    }
    if (opts?.since) {
      sql += params.length ? " AND m.created_at >= ?" : " WHERE m.created_at >= ?";
      params.push(opts.since);
    }
    if (opts?.until) {
      sql += params.length ? " AND m.created_at <= ?" : " WHERE m.created_at <= ?";
      params.push(opts.until);
    }
    const result = this.db.exec(sql, params);
    if (result.length === 0) return { results: [], totalAvailable: 0 };
    const rows = result[0].values;
    const scoredResults = [];
    for (const row of rows) {
      const [id, content, topics, createdAt, accessedAt, accessCount] = row;
      const topicArr = typeof topics === "string" ? JSON.parse(topics) : topics;
      const emb = await this.getEmbedding(id);
      let relevanceScore;
      if (queryVector && emb) {
        try {
          const vector = EmbeddingService.decodeVector(emb.base64, emb.dimension);
          relevanceScore = EmbeddingService.cosineSimilarity(queryVector, vector);
        } catch {
          relevanceScore = this.simpleRelevance(content, queryText);
        }
      } else {
        relevanceScore = this.simpleRelevance(content, queryText);
      }
      scoredResults.push({
        id,
        content,
        topics: topicArr,
        relevanceScore,
        createdAt,
        accessedAt,
        accessCount
      });
    }
    scoredResults.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    const totalAvailable = scoredResults.length;
    const limited = scoredResults.slice(0, limit);
    return { results: limited, totalAvailable };
  }
  getEventLog(limit = 100) {
    return this.eventLog.slice(0, limit);
  }
  persist() {
    if (!this.db || this.dbPath === ":memory:") return;
    try {
      const { writeFileSync, renameSync } = require("fs");
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tmpPath = `${this.dbPath}.tmp`;
      writeFileSync(tmpPath, buffer);
      renameSync(tmpPath, this.dbPath);
    } catch {
    }
  }
  close() {
    if (this.db) {
      this.persist();
      this.db.close();
      this.db = null;
    }
  }
  logEvent(type, payload) {
    const event = {
      id: (0, import_crypto2.randomUUID)(),
      type,
      timestamp: Date.now(),
      payload
    };
    this.eventLog.push(event);
    if (this.db) {
      try {
        this.db.run(
          "INSERT INTO events (id, type, timestamp, payload) VALUES (?, ?, ?, ?)",
          [event.id, event.type, event.timestamp, JSON.stringify(event.payload)]
        );
        this.persist();
      } catch {
      }
    }
  }
  rowToObject(columns, values) {
    const obj = {};
    columns.forEach((col, i) => {
      let val = values[i];
      if ((col === "topics" || col === "metadata") && typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {
        }
      }
      if (col === "created_at") obj["createdAt"] = val;
      else if (col === "accessed_at") obj["accessedAt"] = val;
      else if (col === "access_count") obj["accessCount"] = val;
      else obj[col] = val;
    });
    return obj;
  }
  simpleRelevance(content, query) {
    const lower = content.toLowerCase();
    const terms = query.toLowerCase().split(/\s+/);
    const matches = terms.filter((t) => lower.includes(t)).length;
    return matches / terms.length;
  }
};

// src/model.ts
var ModelAbstraction = class {
  client;
  config;
  constructor(config) {
    this.config = config;
    this.client = this.createClient(config);
  }
  createClient(config) {
    switch (config.type) {
      case "bankr":
        return new BankrClient(config);
      case "openai":
        return new OpenAIClient(config);
      case "anthropic":
        return new AnthropicClient(config);
      case "ollama":
        return new OllamaClient(config);
      default:
        throw new Error(`Unknown model type`);
    }
  }
  async chat(messages, options) {
    return this.client.chat(messages, options);
  }
  name() {
    return this.client.name();
  }
};
var BankrClient = class {
  apiKey;
  baseUrl;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.bankr.ai";
  }
  name() {
    return `bankr`;
  }
  async chat(messages, options) {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: "auto",
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096
      })
    });
    if (!response.ok) {
      throw new Error(`Bankr API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return { content, raw: data };
  }
};
var OpenAIClient = class {
  apiKey;
  model;
  baseUrl;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? "gpt-4o";
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
  }
  name() {
    return `openai:${this.model}`;
  }
  async chat(messages, options) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return { content, raw: data };
  }
};
var AnthropicClient = class {
  apiKey;
  model;
  baseUrl;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? "claude-sonnet-4-6";
    this.baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";
  }
  name() {
    return `anthropic:${this.model}`;
  }
  async chat(messages, options) {
    const systemMessage = messages.find((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: this.model,
        system: systemMessage?.content,
        messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096
      })
    });
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.content?.find((c) => c.type === "text")?.text ?? "";
    return { content, raw: data };
  }
};
var OllamaClient = class {
  baseUrl;
  model;
  constructor(config) {
    this.baseUrl = config.baseUrl ?? "http://localhost:11434";
    this.model = config.model ?? "llama3";
  }
  name() {
    return `ollama:${this.model}`;
  }
  async chat(messages, options) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 4096
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.message?.content ?? "";
    return { content, raw: data };
  }
};

// src/query.ts
var DEFAULT_SYSTEM_PROMPT = `You are a memory query assistant. The user has a memory store with entries containing thoughts, facts, preferences, and context.

Your job is to translate natural language queries into precise memory queries. For each query:
1. Identify what the user is looking for
2. Suggest which topics to search
3. Determine appropriate time ranges or access patterns

Memory entries have these fields:
- id: UUID
- content: the memory text
- topics: string tags (e.g., ['preferences', 'ui', 'project-x'])
- createdAt: unix timestamp ms
- accessedAt: unix timestamp ms
- accessCount: how many times this entry was accessed

Respond with a query plan in JSON.`;
var QueryEngine = class {
  _store;
  model;
  systemPrompt;
  constructor(config) {
    this._store = config.store;
    this.model = config.model;
    this.systemPrompt = config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }
  /**
   * Query memory using natural language.
   * If a model is configured, uses LLM-assisted query decomposition.
   * Otherwise falls back to direct keyword search.
   */
  async query(query, options) {
    const start = Date.now();
    if (this.model) {
      return this.queryWithLLM(query, options, start);
    }
    return this.queryDirect(query, options, start);
  }
  /**
   * Direct keyword-based query (no LLM).
   */
  async queryDirect(query, options, start) {
    const { results, totalAvailable } = await this._store.query(query, options);
    return {
      results,
      totalAvailable,
      query,
      tookMs: Date.now() - start
    };
  }
  /**
   * LLM-assisted query decomposition.
   * The model analyzes the query and generates optimized search terms.
   */
  async queryWithLLM(query, options, start) {
    if (!this.model) throw new Error("No model configured");
    const messages = [
      { role: "system", content: this.systemPrompt },
      {
        role: "user",
        content: `Query: "${query}"
        
What topics should I search? What keywords? Respond with a brief search strategy.`
      }
    ];
    const decomposition = await this.model.chat(messages, { temperature: 0.3, maxTokens: 256 });
    const searchText = decomposition.content.trim();
    const { results, totalAvailable } = await this._store.query(searchText, options);
    if (results.length > 0) {
      const reranked = await this.rerankResults(query, results);
      return {
        results: reranked,
        totalAvailable,
        query,
        tookMs: Date.now() - start
      };
    }
    return {
      results: [],
      totalAvailable: 0,
      query,
      tookMs: Date.now() - start
    };
  }
  /**
   * Ask the LLM to rerank results by relevance to the query.
   */
  async rerankResults(query, results) {
    if (!this.model || results.length === 0) return results;
    const messages = [
      {
        role: "system",
        content: "You are a relevance ranker. Rate each memory entry from 0-1 for how relevant it is to the query. Return JSON array of scores in order."
      },
      {
        role: "user",
        content: `Query: "${query}"

Memory entries:
${results.map((r, i) => `[${i}] ${r.content}`).join("\n")}

Respond with a JSON array of scores (0-1) matching the order above. Example: [0.9, 0.3, 0.8]`
      }
    ];
    try {
      const response = await this.model.chat(messages, { temperature: 0.1, maxTokens: 256 });
      const scores = JSON.parse(response.content.trim());
      const scored = results.map((r, i) => ({
        result: r,
        score: scores[i] ?? 0
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored.map((s) => ({
        ...s.result,
        relevanceScore: s.score
      }));
    } catch {
      return results;
    }
  }
  /**
   * Store a new memory entry.
   */
  async store(input) {
    await this._store.store(input);
  }
  /**
   * Get recent memory entries.
   */
  async getRecent(n = 10) {
    return this._store.getRecent(n);
  }
  /**
   * Get entries by topic.
   */
  async getByTopic(topic, limit = 20) {
    return this._store.getByTopic(topic, limit);
  }
  /**
   * Recursive query — the RLM-style loop.
   * Keep refining until the answer is complete.
   */
  async recursiveQuery(initialQuery, maxDepth = 3) {
    if (!this.model) {
      const { results } = await this.query(initialQuery);
      return { answer: "No LLM configured \u2014 cannot synthesize answer.", memories: results };
    }
    const memories = [];
    let currentQuery = initialQuery;
    const contextParts = [];
    for (let depth = 0; depth < maxDepth; depth++) {
      const { results } = await this._store.query(currentQuery, { limit: 5 });
      if (results.length === 0) break;
      memories.push(...results);
      const newContext = results.map((r) => `[${depth}] ${r.content}`).join("\n");
      contextParts.push(newContext);
      const messages = [
        {
          role: "system",
          content: "You are a helpful assistant with access to a memory store. Based on the retrieved memories, answer the query. If you need more information, ask a follow-up query."
        },
        {
          role: "user",
          content: `Query: ${initialQuery}

Retrieved memories:
${contextParts.join("\n---\n")}

Do you have enough to answer the query fully? If yes, provide the answer. If no, ask a specific follow-up query to find more information.`
        }
      ];
      const response = await this.model.chat(messages, { temperature: 0.5, maxTokens: 512 });
      const content = response.content.trim();
      if (content.length < 100 && (content.includes("?") || content.toLowerCase().includes("more"))) {
        currentQuery = content;
        continue;
      }
      return { answer: content, memories };
    }
    const finalMessages = [
      {
        role: "system",
        content: "You are a helpful assistant. Summarize the retrieved memories into a coherent answer."
      },
      {
        role: "user",
        content: `Query: ${initialQuery}

Memories:
${contextParts.join("\n---\n")}`
      }
    ];
    const finalResponse = await this.model.chat(finalMessages, { temperature: 0.5, maxTokens: 512 });
    return { answer: finalResponse.content.trim(), memories };
  }
};

// src/identity.ts
var import_crypto3 = require("crypto");
var ConstitutionManager = class {
  constitution;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config;
  constructor(config = {}) {
    const cfg = config;
    this.config = {
      driftThreshold: cfg.driftThreshold ?? 0.3,
      criticalThreshold: cfg.criticalThreshold ?? 0.7,
      autoInject: cfg.autoInject ?? true,
      evalModel: cfg.evalModel,
      constitution: cfg.constitution ?? {
        statements: [],
        version: "1.0",
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    };
    this.constitution = this.config.constitution;
  }
  /**
   * Import statements from source text (e.g., SOUL.md, IDENTITY.md).
   * Parses the text and extracts identity statements by category.
   */
  importFromText(text, source) {
    const categoryPatterns = {
      values: /(?:values?|core\s*truths?|principles?)[\s:]*\n([\s\S]*?)(?=\n##|\n#|$)/gi,
      boundaries: /(?:boundaries?|limits?|rules?)[\s:]*\n([\s\S]*?)(?=\n##|\n#|$)/gi,
      preferences: /(?:preferences?|likes?|style)[\s:]*\n([\s\S]*?)(?=\n##|\n#|$)/gi,
      goals: /(?:goals?|objectives?|direction)[\s:]*\n([\s\S]*?)(?=\n##|\n#|$)/gi
    };
    let imported = 0;
    const now = Date.now();
    for (const [category, pattern] of Object.entries(categoryPatterns)) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const content = match[1].trim();
        if (!content) continue;
        const lines = content.split(/\n|•|-|\*/).map((l) => l.trim()).filter((l) => l.length > 10);
        for (const line of lines) {
          const statement = {
            id: (0, import_crypto3.randomUUID)(),
            text: line,
            category,
            weight: 0.5,
            source,
            createdAt: now
          };
          const parsed = constitutionStatementSchema.safeParse(statement);
          if (parsed.success) {
            this.constitution.statements.push(parsed.data);
            imported++;
          }
        }
      }
    }
    if (imported === 0) {
      const lines = text.split(/\n/).map((l) => l.replace(/^#+\s*/, "").trim()).filter((l) => l.length > 15 && !l.startsWith("["));
      for (const line of lines.slice(0, 20)) {
        const statement = {
          id: (0, import_crypto3.randomUUID)(),
          text: line,
          category: "values",
          weight: 0.3,
          source,
          createdAt: now
        };
        const parsed = constitutionStatementSchema.safeParse(statement);
        if (parsed.success) {
          this.constitution.statements.push(parsed.data);
          imported++;
        }
      }
    }
    this.constitution.updatedAt = Date.now();
    return imported;
  }
  /**
   * Add a single statement manually.
   */
  addStatement(text, category, weight = 0.5, source) {
    const statement = {
      id: (0, import_crypto3.randomUUID)(),
      text,
      category,
      weight,
      source: source ?? "manual",
      createdAt: Date.now()
    };
    const validated = constitutionStatementSchema.parse(statement);
    this.constitution.statements.push(validated);
    this.constitution.updatedAt = Date.now();
    return validated;
  }
  /**
   * Get all statements, optionally filtered by category.
   */
  getStatements(category) {
    if (!category) return [...this.constitution.statements];
    return this.constitution.statements.filter((s) => s.category === category);
  }
  /**
   * Get the full constitution.
   */
  getConstitution() {
    return { ...this.constitution };
  }
  /**
   * Serialize constitution for injection into LLM context.
   */
  toInjectionBlock() {
    const statements = this.constitution.statements;
    if (statements.length === 0) return "";
    const byCategory = statements.reduce(
      (acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
      },
      {}
    );
    const parts = ["## Identity Constitution\n"];
    for (const [category, stmts] of Object.entries(byCategory)) {
      parts.push(`
### ${category.charAt(0).toUpperCase() + category.slice(1)}
`);
      for (const s of stmts) {
        parts.push(`- [${s.weight.toFixed(1)}] ${s.text}
`);
      }
    }
    return parts.join("");
  }
};
var DriftDetector = class {
  constitution;
  evalModel;
  threshold;
  criticalThreshold;
  constructor(constitution, config = {}) {
    this.constitution = constitution;
    if (config.evalModel) {
      this.evalModel = new ModelAbstraction(config.evalModel);
    }
    this.threshold = config.driftThreshold ?? 0.3;
    this.criticalThreshold = config.criticalThreshold ?? 0.7;
  }
  /**
   * Detect drift using BOTH pattern matching and LLM self-evaluation.
   * Returns a DriftResult with score, level, and violating statements.
   */
  async detectDrift(sessionText, options) {
    const method = options?.method ?? "both";
    let patternDrift = null;
    let llmDrift = null;
    if (method === "pattern" || method === "both") {
      patternDrift = this.detectPatternDrift(sessionText);
    }
    if (method === "llm" || method === "both") {
      llmDrift = await this.detectLLMDrift(sessionText);
    }
    const scores = [patternDrift?.score, llmDrift?.score].filter(
      (s) => s !== null && s !== void 0
    );
    if (scores.length === 0) {
      return {
        score: 0,
        level: "aligned",
        violatingStatements: [],
        reasoning: "No drift detected \u2014 no significant violations found.",
        detectedAt: Date.now()
      };
    }
    const maxScore = Math.max(...scores);
    const allViolations = [
      ...patternDrift?.violatingStatements ?? [],
      ...llmDrift?.violatingStatements ?? []
    ];
    const seen = /* @__PURE__ */ new Set();
    const uniqueViolations = allViolations.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
    const level = maxScore >= this.criticalThreshold ? "critical" : maxScore >= this.threshold ? maxScore >= (this.threshold + this.criticalThreshold) / 2 ? "moderate" : "minor" : "aligned";
    const reasoning = [
      patternDrift && `Pattern matching: ${patternDrift.reasoning}`,
      llmDrift && `LLM evaluation: ${llmDrift.reasoning}`
    ].filter(Boolean).join(" | ");
    return {
      score: maxScore,
      level,
      violatingStatements: uniqueViolations,
      reasoning,
      detectedAt: Date.now()
    };
  }
  /**
   * Fast pattern-matching drift detection.
   * Checks for negation patterns, value contradictions, and boundary violations.
   */
  detectPatternDrift(sessionText) {
    const statements = this.constitution.getStatements();
    const lowerText = sessionText.toLowerCase();
    const negationPatterns = [
      /\bnot\s+(?:a|I|me|my)\b/i,
      /\bdon't\s+think\b/i,
      /\bno\s+longer\b/i,
      /\bchanged\s+my\s+mind\b/i,
      /\bactually\b.*\b(not|no)\b/i
    ];
    const negationMatches = negationPatterns.filter((p) => p.test(lowerText));
    const hasNegation = negationMatches.length > 0;
    const violatingStatements = [];
    for (const statement of statements) {
      const statementLower = statement.text.toLowerCase();
      const negationVariants = [
        statementLower.replace(/^(i\s+|you\s+|we\s+)/i, "not $1"),
        `not ${statementLower}`,
        `i don't ${statementLower.replace(/^(i\s+)/, "")}`
      ];
      for (const variant of negationVariants) {
        if (lowerText.includes(variant.slice(0, 50))) {
          violatingStatements.push(statement);
          break;
        }
      }
    }
    let score = 0;
    const reasoningParts = [];
    if (hasNegation) {
      score += 0.15;
      reasoningParts.push("negation patterns detected");
    }
    if (violatingStatements.length > 0) {
      const weightedSum = violatingStatements.reduce((sum, s) => sum + s.weight, 0);
      score += Math.min(weightedSum / Math.max(statements.length, 1), 0.5);
      reasoningParts.push(`${violatingStatements.length} value contradictions`);
    }
    const level = score >= this.criticalThreshold ? "critical" : score >= this.threshold ? score >= (this.threshold + this.criticalThreshold) / 2 ? "moderate" : "minor" : "aligned";
    return {
      score: Math.min(score, 1),
      level,
      violatingStatements,
      reasoning: reasoningParts.join("; ") || "no violations",
      detectedAt: Date.now()
    };
  }
  /**
   * LLM-based drift evaluation using self-check.
   * Asks the model: "Are you still aligned with these values?"
   */
  async detectLLMDrift(sessionText) {
    if (!this.evalModel) {
      return null;
    }
    const statements = this.constitution.getStatements();
    if (statements.length === 0) return null;
    const constitutionText = this.constitution.toInjectionBlock();
    const messages = [
      {
        role: "system",
        content: `You are an identity alignment checker. Evaluate whether the recent conversation shows drift from the stated identity.

Rate drift on a 0-1 scale where:
- 0.0-0.2: aligned (minor language variation only)
- 0.3-0.5: minor drift (slight deviation from some values)
- 0.6-0.8: moderate drift (significant value contradictions)
- 0.9-1.0: critical drift (core values completely abandoned)

Respond with ONLY valid JSON:
{
  "score": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "violations": ["<list of specific violations>"]
}

Be strict. Better to say there is drift than to excuse it.`
      },
      {
        role: "user",
        content: `Identity Constitution:
${constitutionText}

Recent conversation:
---
${sessionText.slice(-4e3)}
---

Evaluate alignment. Return ONLY JSON.`
      }
    ];
    try {
      const response = await this.evalModel.chat(messages, {
        temperature: 0.1,
        maxTokens: 512
      });
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }
      const parsed = JSON.parse(jsonMatch[0]);
      const score = typeof parsed.score === "number" ? parsed.score : 0;
      const violatingStatements = [];
      if (Array.isArray(parsed.violations)) {
        for (const v of parsed.violations) {
          const match = statements.find(
            (s) => s.text.toLowerCase().includes(String(v).toLowerCase().slice(0, 20)) || String(v).toLowerCase().includes(s.text.toLowerCase().slice(0, 20))
          );
          if (match) violatingStatements.push(match);
        }
      }
      return {
        score: Math.min(Math.max(score, 0), 1),
        level: score >= this.criticalThreshold ? "critical" : score >= this.threshold ? score >= (this.threshold + this.criticalThreshold) / 2 ? "moderate" : "minor" : "aligned",
        violatingStatements,
        reasoning: parsed.reasoning ?? "LLM evaluation complete",
        detectedAt: Date.now()
      };
    } catch {
      return null;
    }
  }
};
var ConstitutionInjector = class {
  constitution;
  autoInject;
  constructor(constitution, autoInject = true) {
    this.constitution = constitution;
    this.autoInject = autoInject;
  }
  /**
   * Generate a constitution injection block for the current drift result.
   * Call this before sending messages to the LLM when drift is detected.
   */
  buildInjection(drift) {
    const constitution = this.constitution.toInjectionBlock();
    if (!constitution) return "";
    const parts = [
      "## \u26A0\uFE0F Identity Alignment Reminder\n",
      `Drift detected: **${drift.level.toUpperCase()}** (score: ${drift.score.toFixed(2)})
`,
      drift.reasoning ? `${drift.reasoning}
` : "",
      "\nYour stated identity:\n",
      constitution
    ];
    if (drift.violatingStatements.length > 0) {
      parts.push("\n## Statements that may have been violated:\n");
      for (const s of drift.violatingStatements) {
        parts.push(`- ${s.text} [${s.category}] weight=${s.weight.toFixed(1)}
`);
      }
    }
    parts.push(
      "\n## Corrective Instruction\n",
      `Re-align with the above constitution. ${drift.level === "critical" ? "This is a critical violation \u2014 stop immediately and correct." : "Gently correct course."}
`
    );
    return parts.join("");
  }
  /**
   * Get the auto-inject setting.
   */
  shouldAutoInject() {
    return this.autoInject;
  }
  /**
   * Set the auto-inject setting.
   */
  setAutoInject(value) {
    this.autoInject = value;
  }
};
function createIdentitySystem(config) {
  const constitution = new ConstitutionManager(config);
  const detector = new DriftDetector(constitution, config);
  const injector = new ConstitutionInjector(constitution, config?.autoInject ?? true);
  return { constitution, detector, injector };
}

// src/layers.ts
var import_crypto4 = require("crypto");
var DEFAULT_LAYER_CONFIG = {
  episodic: { ttlMs: 36e5, maxEntries: 1e3, weight: 0.2 },
  // 1 hour
  semantic: { ttlMs: 6048e5, maxEntries: 5e3, weight: 0.3, selfEdit: false, temporalValidity: true },
  // 7 days
  identity: { ttlMs: 2592e6, maxEntries: 500, weight: 0.5 },
  // 30 days
  procedural: { ttlMs: 2592e6, maxEntries: 500, weight: 0.4 }
  // 30 days
};
var LayerManager = class {
  entries = /* @__PURE__ */ new Map();
  config;
  constructor(config) {
    const merged = {
      episodic: { ...DEFAULT_LAYER_CONFIG.episodic, ...config?.episodic },
      semantic: { ...DEFAULT_LAYER_CONFIG.semantic, ...config?.semantic },
      identity: { ...DEFAULT_LAYER_CONFIG.identity, ...config?.identity },
      procedural: { ...DEFAULT_LAYER_CONFIG.procedural, ...config?.procedural }
    };
    this.config = layerConfigSchema.parse(merged);
  }
  /**
   * Store an entry in the appropriate layer.
   * If layer is not specified, auto-assigns based on topics and content.
   * For semantic layer with selfEdit=true, detects contradictions and auto-supersedes.
   */
  store(input, layer) {
    const assignedLayer = layer ?? this.autoAssignLayer(input);
    const now = Date.now();
    const layerCfg = this.config[assignedLayer];
    let supersedesId;
    if (assignedLayer === "semantic" && layerCfg.selfEdit) {
      const result = this.checkSupersession(input, assignedLayer);
      if (result.superseded && result.supersededEntryId) {
        const old = this.entries.get(result.supersededEntryId);
        if (old) {
          old.validUntil = now;
          this.entries.set(old.id, old);
        }
        supersedesId = result.supersededEntryId;
      }
    }
    const entry = {
      id: (0, import_crypto4.randomUUID)(),
      content: input.content,
      topics: input.topics ?? [],
      metadata: input.metadata ?? {},
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
      layer: assignedLayer,
      expiresAt: now + layerCfg.ttlMs,
      importance: input.metadata?.importance ?? 0.5,
      // Temporal validity (semantic layer)
      validFrom: assignedLayer === "semantic" && layerCfg.temporalValidity ? now : void 0,
      validUntil: void 0,
      // null means still valid
      // Self-edit supersession chain
      supersedes: supersedesId,
      supersededBy: void 0
    };
    this.evictIfNeeded(assignedLayer);
    this.entries.set(entry.id, entry);
    return entry;
  }
  /**
   * Check if new input should supersede an existing semantic entry.
   * Detects contradictions by keyword negation patterns.
   */
  checkSupersession(input, layer) {
    const text = `${input.content} ${(input.topics ?? []).join(" ")}`.toLowerCase();
    for (const entry of this.entries.values()) {
      if (entry.layer !== layer) continue;
      if (entry.supersededBy) continue;
      const negationPatterns = [
        /prefer(s|ring|red)?\s+not\s+/i,
        /prefer(s|ring|red)?\s+instead\s+/i,
        /no\s+longer\s+/i,
        /changed\s+to\s+/i,
        /now\s+uses?\s+/i,
        /switched\s+to\s+/i
      ];
      const hasNegation = negationPatterns.some((p) => p.test(text));
      if (!hasNegation) continue;
      const existingTopics = entry.topics.join(" ").toLowerCase();
      const inputTopics = (input.topics ?? []).join(" ").toLowerCase();
      const contentOverlap = this.simpleRelevance(entry.content, input.content) > 0.5;
      const topicOverlap = existingTopics && inputTopics && (existingTopics.split(" ").some((w) => inputTopics.includes(w)) || inputTopics.split(" ").some((w) => existingTopics.includes(w)));
      if (contentOverlap || topicOverlap) {
        return {
          superseded: true,
          supersededEntryId: entry.id,
          reason: "Contradiction detected \u2014 newer entry supersedes older"
        };
      }
    }
    return { superseded: false };
  }
  /**
   * Store a procedural memory — a triggered behavior/rule.
   * trigger: keyword/pattern that fires this rule
   * condition: when this text appears in context
   * action: what to do when triggered
   */
  storeProcedural(input, trigger) {
    const meta = { ...input.metadata, trigger };
    return this.store({ ...input, metadata: meta }, "procedural");
  }
  /**
   * Fire procedural rules matching the given context text.
   * Returns rules whose trigger keyword appears in the context.
   */
  fireProcedural(context) {
    const triggered = [];
    const ctx = context.toLowerCase();
    for (const entry of this.entries.values()) {
      if (entry.layer !== "procedural") continue;
      const trigger = entry.metadata?.trigger?.toLowerCase();
      if (trigger && ctx.includes(trigger)) {
        triggered.push(entry);
      }
    }
    return triggered;
  }
  /**
   * Get an entry by ID.
   */
  get(id) {
    const entry = this.entries.get(id);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.entries.delete(id);
      return null;
    }
    entry.accessedAt = Date.now();
    entry.accessCount++;
    return entry;
  }
  /**
   * Get all entries across all layers.
   * Used for duplication/export — returns all non-expired entries.
   */
  getAllEntries() {
    const now = Date.now();
    const result = [];
    for (const entry of this.entries.values()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.entries.delete(entry.id);
        continue;
      }
      result.push(entry);
    }
    return result;
  }
  /**
   * Query across all layers with weighted retrieval.
   * Entries from higher-weight layers rank higher, but content match still matters.
   */
  query(text, options) {
    const layers = options?.layers ?? ["episodic", "semantic", "identity", "procedural"];
    const now = Date.now();
    let allEntries = [];
    for (const layer of layers) {
      const layerCfg = this.config[layer];
      for (const entry of this.entries.values()) {
        if (entry.layer !== layer) continue;
        if (entry.expiresAt && now > entry.expiresAt) {
          this.entries.delete(entry.id);
          continue;
        }
        if (options?.topics && options.topics.length > 0) {
          const hasTopic = options.topics.some(
            (t) => entry.topics.some((et) => et.toLowerCase().includes(t.toLowerCase()))
          );
          if (!hasTopic) continue;
        }
        if (options?.since && entry.createdAt < options.since) continue;
        if (options?.until && entry.createdAt > options.until) continue;
        if (options?.minAccessCount && entry.accessCount < options.minAccessCount) continue;
        const contentScore = this.simpleRelevance(entry.content, text);
        const weightedScore = layerCfg.weight * contentScore * (0.5 + entry.importance);
        allEntries.push({ ...entry, weightedScore });
      }
    }
    allEntries.sort((a, b) => b.weightedScore - a.weightedScore);
    const layerBreakdown = {
      episodic: 0,
      semantic: 0,
      identity: 0,
      procedural: 0
    };
    for (const entry of allEntries) {
      layerBreakdown[entry.layer]++;
    }
    const limit = options?.limit ?? 10;
    const results = allEntries.slice(0, limit).map((entry) => ({
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.weightedScore,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount
    }));
    return {
      results,
      totalAvailable: allEntries.length,
      layerBreakdown
    };
  }
  /**
   * Get recent entries across all layers.
   */
  getRecent(n = 10, layers) {
    const targetLayers = layers ?? ["episodic", "semantic", "identity", "procedural"];
    const now = Date.now();
    const entries = [];
    for (const entry of this.entries.values()) {
      if (!targetLayers.includes(entry.layer)) continue;
      if (entry.expiresAt && now > entry.expiresAt) {
        this.entries.delete(entry.id);
        continue;
      }
      const layerWeight = this.config[entry.layer].weight;
      const weightedScore = layerWeight * (entry.accessCount + 1);
      entries.push({ ...entry, weightedScore });
    }
    entries.sort((a, b) => b.weightedScore - a.weightedScore);
    return entries.slice(0, n).map((entry) => ({
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.weightedScore,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount
    }));
  }
  /**
   * Get entries by topic across all layers.
   */
  getByTopic(topic, limit = 20) {
    const now = Date.now();
    const results = [];
    for (const entry of this.entries.values()) {
      if (entry.layer === "episodic") continue;
      if (entry.expiresAt && now > entry.expiresAt) {
        this.entries.delete(entry.id);
        continue;
      }
      if (!entry.topics.some((t) => t.toLowerCase().includes(topic.toLowerCase()))) continue;
      const layerWeight = this.config[entry.layer].weight;
      results.push({
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        relevanceScore: layerWeight * (entry.accessCount + 1),
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount,
        weightedScore: layerWeight
      });
    }
    results.sort((a, b) => b.weightedScore - a.weightedScore);
    return results.slice(0, limit).map(({ weightedScore, ...r }) => r);
  }
  /**
   * Forget an entry.
   */
  forget(id) {
    return this.entries.delete(id);
  }
  /**
   * Restore a LayeredMemoryEntry directly into the store.
   * Used by ReMEM.init() to restore persisted layer entries from SQLite.
   * Does NOT re-assign layer — uses the entry's existing layer field.
   */
  restoreEntry(entry) {
    if (entry.expiresAt && Date.now() > entry.expiresAt) return;
    this.entries.set(entry.id, entry);
  }
  /**
   * Evict entries from a specific layer if over maxEntries.
   * Evicts oldest accessed entries first.
   */
  evictIfNeeded(layer) {
    const cfg = this.config[layer];
    const layerEntries = [...this.entries.values()].filter((e) => e.layer === layer);
    if (layerEntries.length >= cfg.maxEntries) {
      layerEntries.sort((a, b) => a.accessedAt - b.accessedAt);
      const toRemove = layerEntries.slice(0, Math.ceil(cfg.maxEntries * 0.1));
      for (const entry of toRemove) {
        this.entries.delete(entry.id);
      }
    }
  }
  /**
   * Run TTL-based eviction. Call periodically (e.g., on init or query).
   */
  evictExpired() {
    const now = Date.now();
    let evicted = 0;
    for (const [id, entry] of this.entries.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.entries.delete(id);
        evicted++;
      }
    }
    return evicted;
  }
  /**
   * Auto-assign layer based on content analysis.
   */
  autoAssignLayer(input) {
    const text = `${input.content} ${(input.topics ?? []).join(" ")}`.toLowerCase();
    const identityKeywords = ["i am", "i prefer", "my values", "my goals", "my boundaries", "i always", "i never"];
    if (identityKeywords.some((k) => text.includes(k))) return "identity";
    const proceduralKeywords = ["when", "if", "always do", "rule:", "trigger:", "procedure:", "always use", "never use", "do this when"];
    if (proceduralKeywords.some((k) => text.includes(k))) return "procedural";
    const semanticKeywords = ["project", "decision", "agreed", "remember", "context", "learned", "figured out"];
    if (semanticKeywords.some((k) => text.includes(k))) return "semantic";
    return "episodic";
  }
  /**
   * Get stats for each layer.
   */
  getStats() {
    const now = Date.now();
    const counts = { episodic: 0, semantic: 0, identity: 0, procedural: 0 };
    for (const entry of this.entries.values()) {
      if (entry.expiresAt && now > entry.expiresAt) continue;
      counts[entry.layer]++;
    }
    return {
      episodic: { count: counts.episodic, ...this.config.episodic },
      semantic: { count: counts.semantic, ...this.config.semantic },
      identity: { count: counts.identity, ...this.config.identity },
      procedural: { count: counts.procedural, ...this.config.procedural }
    };
  }
  simpleRelevance(content, query) {
    const lower = content.toLowerCase();
    const terms = query.toLowerCase().split(/\s+/);
    const matches = terms.filter((t) => lower.includes(t)).length;
    return matches / Math.max(terms.length, 1);
  }
};

// src/duplicate.ts
async function buildIdentityPackage(params) {
  const { store, layers, identity, soulText, identityText, config } = params;
  const statements = identity ? identity.constitution.getStatements() : [];
  const memories = [];
  if (config.includeAllLayers && layers) {
    const allEntries = layers.getAllEntries();
    const layerFilter = config.layers;
    for (const entry of allEntries) {
      if (layerFilter && !layerFilter.includes(entry.layer)) continue;
      memories.push(entry);
    }
  } else if (!layers) {
    const rawMemories = await store.getAllEntries();
    for (const m of rawMemories) {
      memories.push({
        id: m.id,
        content: m.content,
        topics: m.topics,
        metadata: {},
        createdAt: m.createdAt,
        accessedAt: m.accessedAt,
        accessCount: m.accessCount,
        layer: "episodic",
        importance: 0.5
      });
    }
  }
  const pkg = {
    version: "1.0",
    agentId: config.agentId,
    userId: config.userId,
    exportedAt: Date.now(),
    constitution: {
      statements,
      version: "1.0",
      createdAt: statements[0]?.createdAt ?? Date.now(),
      updatedAt: Date.now()
    },
    memories,
    soul: config.includeSoul && soulText ? { content: soulText, source: "SOUL.md" } : void 0,
    identity: config.includeIdentity && identityText ? { content: identityText, source: "IDENTITY.md" } : void 0,
    metadata: {
      exportedBy: "ReMEM v0.3.3",
      layerCount: memories.length,
      statementCount: statements.length
    }
  };
  return identityPackageSchema.parse(pkg);
}
async function uploadPackage(pkg, config) {
  const response = await fetch(`${config.serverUrl}/api/identity/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(pkg)
  });
  if (!response.ok) {
    throw new Error(
      `Server rejected identity package: ${response.status} ${response.statusText}`
    );
  }
  const json = await response.json();
  return {
    uploadUrl: json.uploadUrl ?? `${config.serverUrl}/api/identity/${pkg.agentId ?? "unknown"}`,
    response: json.response ?? json
  };
}
async function duplicate(params) {
  const pkg = await buildIdentityPackage(params);
  const serverResult = await uploadPackage(pkg, params.config);
  const encoder = new TextEncoder();
  const packageSizeBytes = encoder.encode(JSON.stringify(pkg)).length;
  return {
    packageSizeBytes,
    memoryCount: pkg.memories.length,
    constitutionStatements: pkg.constitution.statements.length,
    exportedAt: pkg.exportedAt,
    serverUploadUrl: serverResult.uploadUrl,
    serverUploadResponse: serverResult.response
  };
}
async function downloadPackage(config) {
  const url = `${config.serverUrl}/api/identity/${config.sourceAgentId ?? "latest"}${config.version ? `?version=${config.version}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`
    }
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch identity package: ${response.status} ${response.statusText}`
    );
  }
  const json = await response.json();
  return identityPackageSchema.parse(json);
}
async function infect(params) {
  const { store, layers, identity, pkg, config } = params;
  if (identity) {
    for (const statement of pkg.constitution.statements) {
      const existing = identity.constitution.getStatements().find(
        (s) => s.id === statement.id
      );
      if (!existing) {
        identity.constitution.addStatement(
          statement.text,
          statement.category,
          statement.weight
        );
      }
    }
  }
  const memoriesLoaded = [];
  const layerFilter = config.layers;
  for (const entry of pkg.memories) {
    if (!layerFilter.includes(entry.layer)) {
      continue;
    }
    if (layers) {
      const stored = layers.store(
        {
          content: entry.content,
          topics: entry.topics,
          metadata: entry.metadata
        },
        entry.layer
      );
      await store.persistLayerEntry(stored, {
        agentId: pkg.agentId,
        userId: pkg.userId
      });
      memoriesLoaded.push(stored);
    } else {
      await store.store(
        {
          content: entry.content,
          topics: entry.topics,
          metadata: entry.metadata
        },
        { agentId: pkg.agentId, userId: pkg.userId }
      );
      memoriesLoaded.push(entry);
    }
  }
  return {
    packageVersion: pkg.version,
    statementsLoaded: pkg.constitution.statements.length,
    memoriesLoaded: memoriesLoaded.length,
    layersApplied: config.layers,
    infectedAt: Date.now(),
    liveConnection: true
  };
}
async function infectFromServer(params) {
  const pkg = await downloadPackage(params.config);
  return infect({ ...params, pkg });
}

// src/index.ts
var ReMEM = class {
  _store;
  model;
  engine;
  identity;
  layers;
  embeddingService;
  _embeddingEnabled = false;
  _identityEnabled = false;
  _layersEnabled = false;
  _agentId;
  _userId;
  constructor(config) {
    const validated = rememConfigSchema.parse(config);
    const storage = validated.storage ?? "sqlite";
    const dbPath = validated.dbPath ?? (storage === "memory" ? ":memory:" : "./remem.db");
    this._store = new MemoryStore(dbPath);
    this._agentId = validated.storageConfig?.agentId;
    this._userId = validated.storageConfig?.userId;
    if (validated.llm) {
      this.model = new ModelAbstraction(validated.llm);
    }
    if (validated.embeddings?.enabled) {
      const embConfig = {
        baseUrl: validated.embeddings.baseUrl ?? "http://localhost:11434",
        model: validated.embeddings.model ?? "nomic-embed-text",
        dimension: validated.embeddings.dimension
      };
      this.embeddingService = new EmbeddingService(embConfig);
      this._embeddingEnabled = true;
    }
    this.engine = new QueryEngine({
      store: this._store,
      model: this.model
    });
  }
  /**
   * Initialize the memory store. Must be called before use.
   * Also restores persisted layer state from SQLite if layers are enabled.
   */
  async init() {
    await this._store.init();
    if (this._layersEnabled && this.layers) {
      const storeOpts = { agentId: this._agentId, userId: this._userId };
      const persisted = await this._store.loadAllLayerEntries(storeOpts);
      for (const entry of persisted) {
        this.layers.restoreEntry(entry);
      }
      if (persisted.length > 0) {
        console.log(`[ReMEM] Restored ${persisted.length} persisted layer entries from SQLite`);
      }
    }
  }
  /**
   * Store a new memory entry.
   * If layers are enabled, also persists to the appropriate layer in SQLite.
   * If embeddings are enabled, generates a vector embedding in the background.
   */
  async store(input) {
    const stored = await this._store.store(input, {
      agentId: this._agentId,
      userId: this._userId
    });
    if (this._layersEnabled && this.layers) {
      const result = this.layers.store(input);
      await this._store.persistLayerEntry(result, {
        agentId: this._agentId,
        userId: this._userId
      });
    }
    if (this._embeddingEnabled && this.embeddingService) {
      const contentToEmbed = input.topics.length > 0 ? `[${input.topics.join(", ")}] ${input.content}` : input.content;
      if (input.metadata?.asyncEmbed === false) {
        try {
          const emb = await this.embeddingService.generateEmbedding(stored.id, contentToEmbed);
          await this._store.storeEmbedding(stored.id, emb.base64, emb.vector.length, emb.model);
        } catch (err) {
          console.warn(`[ReMEM] Embedding failed for ${stored.id}: ${err}`);
        }
      } else {
        this.embeddingService.generateEmbedding(stored.id, contentToEmbed).then((emb) => {
          return this._store.storeEmbedding(stored.id, emb.base64, emb.vector.length, emb.model);
        }).catch((err) => console.warn(`[ReMEM] Async embed failed for ${stored.id}: ${err}`));
      }
    }
  }
  /**
   * Query memory using natural language.
   * Uses semantic search (cosine similarity) when embeddings are enabled,
   * falls back to keyword + access_count scoring otherwise.
   */
  async query(query, options) {
    const start = Date.now();
    if (this._embeddingEnabled && this.embeddingService) {
      try {
        const queryVector = await this.embeddingService.embed(query);
        const { results, totalAvailable } = await this._store.semanticQuery(
          query,
          queryVector,
          options
        );
        return { results, totalAvailable, query, tookMs: Date.now() - start };
      } catch (err) {
        console.warn(`[ReMEM] Semantic query failed, falling back to keyword: ${err}`);
      }
    }
    return this.engine.query(query, options);
  }
  /**
   * Returns true if semantic embeddings are enabled and configured.
   */
  isEmbeddingEnabled() {
    return this._embeddingEnabled;
  }
  /**
   * Returns the embedding service instance (if enabled).
   */
  getEmbeddingService() {
    return this.embeddingService;
  }
  /**
   * Get recent memory entries.
   */
  async getRecent(n = 10) {
    return this.engine.getRecent(n);
  }
  /**
   * Get entries by topic.
   */
  async getByTopic(topic, limit = 20) {
    return this.engine.getByTopic(topic, limit);
  }
  /**
   * Recursive query — RLM-style iterative refinement.
   */
  async recursiveQuery(initialQuery, maxDepth) {
    return this.engine.recursiveQuery(initialQuery, maxDepth ?? 3);
  }
  // ─── Identity Layer ───────────────────────────────────────────────────────
  /**
   * Enable identity layer with optional constitution import.
   */
  enableIdentity(config) {
    const identityConfig = {
      autoInject: config?.autoInject ?? true,
      evalModel: config?.evalModel ?? (this.model ? this.model.config : void 0),
      driftThreshold: 0.3,
      criticalThreshold: 0.7
    };
    this.identity = createIdentitySystem(identityConfig);
    this._identityEnabled = true;
    if (config?.constitutionTexts) {
      for (const { text, source } of config.constitutionTexts) {
        this.identity.constitution.importFromText(text, source);
      }
    }
  }
  /**
   * Add an identity statement.
   */
  addIdentityStatement(text, category, weight) {
    if (!this.identity) return null;
    return this.identity.constitution.addStatement(text, category, weight);
  }
  /**
   * Import identity constitution from text (e.g., SOUL.md content).
   */
  importConstitution(text, source) {
    if (!this.identity) {
      this.enableIdentity();
    }
    return this.identity.constitution.importFromText(text, source);
  }
  /**
   * Detect identity drift in the current session context.
   */
  async detectDrift(sessionText) {
    if (!this.identity) {
      return {
        score: 0,
        level: "aligned",
        violatingStatements: [],
        reasoning: "Identity layer not enabled.",
        detectedAt: Date.now()
      };
    }
    return this.identity.detector.detectDrift(sessionText, { method: "both" });
  }
  /**
   * Get constitution injection block if drift is detected.
   * Use this to prepend correction context to LLM messages.
   */
  getConstitutionInjection(drift) {
    if (!this.identity) return "";
    if (drift.level === "aligned") return "";
    return this.identity.injector.buildInjection(drift);
  }
  /**
   * Get all identity statements.
   */
  getIdentityStatements(category) {
    if (!this.identity) return [];
    return this.identity.constitution.getStatements(category);
  }
  /**
   * Check if identity layer is enabled.
   */
  isIdentityEnabled() {
    return this._identityEnabled;
  }
  // ─── Hierarchical Layers ─────────────────────────────────────────────────
  /**
   * Enable hierarchical memory layers (episodic / semantic / identity).
   * Layers are persisted to SQLite — they survive process restarts.
   */
  async enableLayers(config) {
    this.layers = new LayerManager(config ?? DEFAULT_LAYER_CONFIG);
    this._layersEnabled = true;
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
      } catch {
      }
    }
  }
  /**
   * Store in a specific layer.
   */
  async storeInLayer(input, layer) {
    if (!this.layers) {
      await this.enableLayers();
    }
    const entry = this.layers.store(input, layer);
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId
    });
    return {
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.importance,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount
    };
  }
  /**
   * Query across layers with weighted retrieval.
   */
  queryLayers(query, options) {
    if (!this.layers) return null;
    return this.layers.query(query, options);
  }
  /**
   * Get layer stats.
   */
  getLayerStats() {
    if (!this.layers) return null;
    return this.layers.getStats();
  }
  /**
   * Evict expired entries from all layers.
   */
  evictExpiredLayers() {
    if (!this.layers) return 0;
    return this.layers.evictExpired();
  }
  /**
   * Store a procedural memory — a behavior/rule triggered by a keyword.
   * Use when you learn a rule like "when X happens, always do Y".
   */
  async storeProcedural(input, trigger) {
    if (!this.layers) {
      await this.enableLayers();
    }
    const entry = this.layers.storeProcedural(input, trigger);
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId
    });
    return {
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.importance,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount
    };
  }
  /**
   * Fire procedural rules matching the given context.
   * Returns rules whose trigger keyword appears in the context.
   */
  fireProcedural(context) {
    if (!this.layers) return [];
    const triggered = this.layers.fireProcedural(context);
    return triggered.map((entry) => ({
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      relevanceScore: entry.importance,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount
    }));
  }
  /**
   * Get the temporal history of an entry — trace its supersession chain.
   * Returns all versions from newest to oldest.
   */
  getTemporalHistory(entryId) {
    if (!this.layers) return [];
    const history = [];
    let current = this.layers.get(entryId);
    if (!current) return [];
    while (current) {
      history.push({
        id: current.id,
        content: current.content,
        topics: current.topics,
        relevanceScore: current.importance,
        createdAt: current.createdAt,
        accessedAt: current.accessedAt,
        accessCount: current.accessCount
      });
      const nextId = current.supersededBy;
      current = nextId ? this.layers.get(nextId) ?? null : null;
    }
    return history;
  }
  /**
   * Check if layers are enabled.
   */
  isLayersEnabled() {
    return this._layersEnabled;
  }
  // ─── Snapshots (for long-running agent persistence) ───────────────────────
  /**
   * Create a named snapshot of current memory state.
   * Essential for long-running agents — take a snapshot before restarts.
   * @param label Human-readable label for this snapshot
   */
  async createSnapshot(label) {
    const meta = await this._store.createSnapshot(label, {
      agentId: this._agentId,
      userId: this._userId
    });
    return meta;
  }
  /**
   * Restore from a snapshot by ID.
   * Restores layer entries from the snapshot into the current store.
   * @returns Number of entries restored
   */
  async restoreSnapshot(snapshotId) {
    return this._store.restoreSnapshot(snapshotId, {
      agentId: this._agentId,
      userId: this._userId
    });
  }
  /**
   * List available snapshots.
   */
  async listSnapshots() {
    const snapshots = await this._store.listSnapshots({
      agentId: this._agentId,
      userId: this._userId
    });
    return snapshots.map((s) => ({
      id: s.id,
      label: s.label,
      createdAt: s.createdAt,
      memoryCount: s.memoryCount
    }));
  }
  /**
   * Delete a snapshot.
   */
  async deleteSnapshot(snapshotId) {
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
  async duplicate(config) {
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
        userId: this._userId
      }
    });
  }
  /**
   * Build an identity package locally without uploading.
   * Useful for previewing what would be exported.
   */
  async buildIdentityPackageLocal(config) {
    return buildIdentityPackage({
      store: this._store,
      layers: this.layers,
      identity: this.identity,
      soulText: config.soulText,
      identityText: config.identityText,
      config: {
        serverUrl: "http://localhost",
        // not used for local build
        apiKey: "local-only",
        includeSoul: config.includeSoul ?? true,
        includeIdentity: config.includeIdentity ?? true,
        includeAllLayers: config.includeAllLayers ?? true,
        layers: config.layers,
        agentId: this._agentId,
        userId: this._userId
      }
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
  async infect(config) {
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
        layers: config.layers ?? ["identity"]
      }
    });
  }
  /**
   * Download identity package without applying it (preview).
   */
  async fetchIdentityPackage(config) {
    return downloadPackage({
      serverUrl: config.serverUrl,
      apiKey: config.apiKey,
      sourceAgentId: config.sourceAgentId,
      version: config.version
    });
  }
  // ─── Utilities ───────────────────────────────────────────────────────────
  /**
   * Get the underlying MemoryStore for advanced operations.
   */
  getStore() {
    return this._store;
  }
  /**
   * Get the model name if configured.
   */
  getModelName() {
    return this.model?.name();
  }
  /**
   * Close the memory store and release resources.
   */
  close() {
    this._store.close();
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConstitutionInjector,
  ConstitutionManager,
  DEFAULT_LAYER_CONFIG,
  DriftDetector,
  LayerManager,
  MemoryStore,
  ModelAbstraction,
  QueryEngine,
  ReMEM,
  buildIdentityPackage,
  constitutionSchema,
  constitutionStatementSchema,
  createIdentitySystem,
  downloadPackage,
  driftEventSchema,
  driftResultSchema,
  duplicate,
  duplicationConfigSchema,
  embeddingConfigSchema,
  eventTypeSchema,
  identityCategorySchema,
  identityConfigSchema,
  identityPackageSchema,
  infect,
  infectFromServer,
  infectionConfigSchema,
  layerConfigSchema,
  layeredMemoryEntrySchema,
  memoryEntrySchema,
  memoryEventSchema,
  memoryLayerSchema,
  modelConfigSchema,
  queryOptionsSchema,
  queryResponseSchema,
  queryResultSchema,
  rememConfigSchema,
  storeMemoryInputSchema,
  uploadPackage
});
