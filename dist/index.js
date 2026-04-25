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
  EpisodicCapturePipeline: () => EpisodicCapturePipeline,
  HttpAdapter: () => HttpAdapter,
  LayerManager: () => LayerManager,
  MemoryConsolidator: () => MemoryConsolidator,
  MemoryREPL: () => MemoryREPL,
  MemoryStore: () => MemoryStore,
  ModelAbstraction: () => ModelAbstraction,
  QueryEngine: () => QueryEngine,
  ReMEM: () => ReMEM,
  buildIdentityPackage: () => buildIdentityPackage,
  constitutionSchema: () => constitutionSchema,
  constitutionStatementSchema: () => constitutionStatementSchema,
  createIdentitySystem: () => createIdentitySystem,
  createLangGraphStoreAdapter: () => createLangGraphStoreAdapter,
  createOpenClawAdapter: () => createOpenClawAdapter,
  createVercelAIAdapter: () => createVercelAIAdapter,
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
  embeddingService = null;
  entryEmbeddings = /* @__PURE__ */ new Map();
  constructor(config, embeddingService) {
    const merged = {
      episodic: { ...DEFAULT_LAYER_CONFIG.episodic, ...config?.episodic },
      semantic: { ...DEFAULT_LAYER_CONFIG.semantic, ...config?.semantic },
      identity: { ...DEFAULT_LAYER_CONFIG.identity, ...config?.identity },
      procedural: { ...DEFAULT_LAYER_CONFIG.procedural, ...config?.procedural }
    };
    this.config = layerConfigSchema.parse(merged);
    this.embeddingService = embeddingService ?? null;
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
   * When EmbeddingService is set, uses hybrid scoring: 40% keyword + 60% cosine similarity.
   */
  async query(text, options) {
    const layers = options?.layers ?? ["episodic", "semantic", "identity", "procedural"];
    const now = Date.now();
    let queryEmbedding = null;
    if (this.embeddingService) {
      try {
        queryEmbedding = await this.embeddingService.embed(text);
      } catch {
        queryEmbedding = null;
      }
    }
    let allEntries = [];
    for (const layer of layers) {
      const layerCfg = this.config[layer];
      for (const entry of this.entries.values()) {
        if (entry.layer !== layer) continue;
        if (entry.expiresAt && now > entry.expiresAt) {
          this.entries.delete(entry.id);
          continue;
        }
        if (entry.validUntil && now > entry.validUntil) {
          continue;
        }
        if (entry.validFrom && now < entry.validFrom) {
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
        let blendedScore = contentScore;
        if (queryEmbedding && this.entryEmbeddings.has(entry.id)) {
          const entryEmbedding = this.entryEmbeddings.get(entry.id);
          const semanticScore = EmbeddingService.cosineSimilarity(queryEmbedding, entryEmbedding);
          blendedScore = contentScore * 0.4 + semanticScore * 0.6;
        }
        const weightedScore = layerCfg.weight * blendedScore * (0.5 + entry.importance);
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
   * Store a pre-computed embedding vector for an entry.
   * Enables semantic similarity scoring in queries.
   */
  setEntryEmbedding(id, vector) {
    this.entryEmbeddings.set(id, vector);
  }
  /**
   * Forget an entry.
   */
  forget(id) {
    this.entryEmbeddings.delete(id);
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
   * Get entries eligible for compression — oldest episodic entries.
   * These will be LLM-compressed into a semantic summary before eviction.
   * @param count Number of entries to return for compression
   */
  getEntriesForCompression(count = 20) {
    const episodic = [...this.entries.values()].filter((e) => e.layer === "episodic");
    episodic.sort((a, b) => a.createdAt - b.createdAt);
    return episodic.slice(0, Math.min(count, episodic.length));
  }
  /**
   * Compress episodic entries into a semantic summary.
   * Creates a new semantic layer entry that summarizes the episodic content.
   * Returns the new semantic entry ID, or null if compression not applicable.
   */
  compressToSemantic(episodicEntries, model) {
    if (episodicEntries.length === 0) return Promise.resolve(null);
    const now = Date.now();
    const episodicText = episodicEntries.sort((a, b) => a.createdAt - b.createdAt).map((e) => `[${new Date(e.createdAt).toISOString().slice(0, 10)}] ${e.content}`).join("\n");
    const compressionPrompt = `You are compressing a series of short-term episodic memories into a single semantic summary. These are raw observations, preferences, or context fragments from a session.

Episodic memories:
${episodicText}

Your task:
1. Identify recurring themes, facts, or patterns across these entries
2. Discard transient details (timestamps, one-off observations with no pattern)
3. Write a semantic summary that captures what matters: decisions made, preferences expressed, context established, facts learned
4. Keep it concise \u2014 2-4 sentences max. The goal is to preserve meaning, not volume.

Respond with ONLY a JSON object:
{
  "summary": "Your 2-4 sentence semantic summary here.",
  "topics": ["topic1", "topic2"],
  "keyFacts": ["fact1", "fact2"]
}`;
    return model.chat([{ role: "user", content: compressionPrompt }], { temperature: 0.3, maxTokens: 512 }).then(async (response) => {
      let parsed = {};
      try {
        const match = response.content.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {
        parsed = { summary: response.content.slice(0, 500), topics: [], keyFacts: [] };
      }
      const summary = parsed.summary ?? response.content.slice(0, 500);
      const topics = parsed.topics ?? [];
      const keyFacts = parsed.keyFacts ?? [];
      const semanticCfg = this.config.semantic;
      const compressedEntry = {
        id: `compression-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        content: summary,
        topics: ["compressed", "episodic-summary", ...topics],
        metadata: {
          compressed: true,
          sourceEntryCount: episodicEntries.length,
          keyFacts,
          compressedAt: now
        },
        createdAt: now,
        accessedAt: now,
        accessCount: 0,
        layer: "semantic",
        expiresAt: now + semanticCfg.ttlMs,
        importance: 0.6,
        validFrom: now,
        validUntil: void 0
      };
      this.entries.set(compressedEntry.id, compressedEntry);
      let evicted = 0;
      for (const entry of episodicEntries) {
        if (this.entries.has(entry.id)) {
          this.entries.delete(entry.id);
          evicted++;
        }
      }
      return { compressedEntry, entriesEvicted: evicted };
    }).catch(() => null);
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
   * Check if episodic layer is above 80% capacity and needs compression.
   */
  needsEpisodicCompression() {
    const episodic = this.getStats().episodic;
    return episodic.count > episodic.maxEntries * 0.8;
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

// src/repl.ts
var DEFAULT_SYSTEM_PROMPT2 = `You are a memory navigation assistant. The user has a large memory store containing thoughts, facts, preferences, and context.

Your job is to navigate the memory store by writing JavaScript code. You NEVER see the full memory \u2014 you only see metadata and what you observe from your own queries.

AVAILABLE API (in the 'mem' object):
- mem.query(text, { limit })       \u2014 search memories by text, returns { results: [...], total }
- mem.get(id)                       \u2014 get a single memory entry by ID
- mem.getRecent(n)                  \u2014 get N most recently accessed memories
- mem.getByTopic(topic, limit)      \u2014 get memories by topic tag
- mem.layers.stats()                 \u2014 get per-layer memory counts
- mem.layers.query(text, opts)      \u2014 query across specific layers with weighted retrieval
- mem.layers.fireProcedural(text)   \u2014 fire procedural rules matching context text

NAVIGATION STRATEGY:
1. Start by querying broad terms to understand what's in memory
2. Then dig into specific layers or topics that look relevant
3. Load the actual content of interesting entries with mem.get(id)
4. Synthesize what you found into a coherent answer

RESPONSE FORMAT \u2014 return EXACTLY one of:

  // When you have a complete answer:
  ({ action: "done", answer: "Your synthesized answer here." })

  // When you need to observe more before answering:
  ({ action: "observe", data: { what: "description of what you're checking", findings: "what you expect to find" } })

IMPORTANT:
- Always return valid JavaScript object literals, not statements
- Do NOT use await, async, fetch, require, import, or any Node.js APIs
- The 'mem' object methods are already Promise-aware when used with await inside your code
- You can write multi-line code that calls multiple mem methods and returns an observation
- Be specific in your queries \u2014 don't just ask for everything at once
- After observing results, build on them with more targeted queries
- If you have enough to answer, say done!

MAX DEPTH: If you reach the recursion limit without enough information, fall back to your best direct query and answer.`;
var MemoryREPL = class {
  store;
  layers;
  model;
  maxDepth;
  maxResults;
  systemPrompt;
  constructor(options) {
    this.store = options.store;
    this.layers = options.layers;
    this.model = options.model;
    this.maxDepth = options.maxDepth ?? 5;
    this.maxResults = options.maxResults ?? 20;
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT2;
  }
  /**
   * Navigate memory using the RLM loop.
   * Model writes JS to explore, executor runs it, results feed back into next iteration.
   */
  async navigate(query) {
    const observations = [];
    const envMeta = await this.buildEnvironmentMetadata();
    let currentContext = `Query: ${query}

Store metadata:
${envMeta}`;
    for (let depth = 0; depth < this.maxDepth; depth++) {
      const messages = [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: currentContext }
      ];
      const response = await this.model.chat(messages, {
        temperature: 0.4,
        maxTokens: 1024
      });
      const raw = response.content.trim();
      let parsed;
      try {
        const objectMatch = raw.match(/\{[\s\S]*\}/);
        if (!objectMatch) {
          parsed = { action: "done", answer: raw };
        } else {
          parsed = JSON.parse(objectMatch[0]);
        }
      } catch {
        parsed = { action: "done", answer: raw };
      }
      if (parsed.action === "done") {
        return {
          answer: parsed.answer,
          observations
        };
      }
      const code = this.extractCode(raw);
      if (code) {
        const result = await this.executeCode(code);
        const observation = {
          iteration: depth + 1,
          code,
          result,
          action: { action: "observe", data: result }
        };
        observations.push(observation);
        currentContext = `Query: ${query}

## Iteration ${depth + 1} Observations:
${this.formatObservation(result)}

Continue exploring or synthesize your answer.`;
      } else {
        const observation = {
          iteration: depth + 1,
          code: "(no code)",
          result: raw,
          action: { action: "observe", data: raw }
        };
        observations.push(observation);
        currentContext = `Query: ${query}

## Iteration ${depth + 1}:
${raw}

If you have enough, return { action: "done", answer: "..." }. Otherwise continue exploring.`;
      }
    }
    const { results } = await this.store.query(query, { limit: this.maxResults });
    const fallback = `Recursion limit reached. Direct query found ${results.length} relevant memories:

${results.slice(0, 10).map((r) => `- ${r.content}`).join("\n")}`;
    return { answer: fallback, observations };
  }
  /**
   * Build constant-size metadata about the store environment.
   * This is what the RLM paper calls the "screen" — fixed size regardless of memory size.
   */
  async buildEnvironmentMetadata() {
    const lines = [];
    try {
      const recent = await this.store.getRecent(5);
      lines.push(`Recent memories (5): ${recent.length} available`);
      if (recent.length > 0) {
        for (const r of recent.slice(0, 3)) {
          lines.push(`  - [${new Date(r.createdAt).toISOString().slice(0, 10)}] ${r.content.slice(0, 80)}`);
        }
      }
    } catch {
    }
    if (this.layers) {
      const stats = this.layers.getStats();
      lines.push(`
Layer counts:`);
      for (const [layer, s] of Object.entries(stats)) {
        lines.push(`  - ${layer}: ${s.count}/${s.maxEntries} (ttl: ${Math.round(s.ttlMs / 36e5)}h)`);
      }
    }
    lines.push(`
Embeddings: ${this.store ? "available (semantic search enabled)" : "not configured"}`);
    return lines.join("\n");
  }
  /**
   * Extract executable JavaScript code from the model's response.
   * Looks for the first { ... } object containing mem.* calls.
   */
  extractCode(response) {
    const match = response.match(/(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/);
    if (!match) return null;
    const obj = match[1];
    if (!obj.includes("mem.") && !obj.includes("return")) return null;
    return obj;
  }
  /**
   * Execute model-generated code safely.
   * Uses Function constructor — no eval, no require, no Node.js globals.
   * Only exposes the safe memory API.
   */
  executeCode(code) {
    const memAPI = this.buildMemoryAPI();
    const executor = new Function(
      "mem",
      `return (async () => { ${code} })()`
    );
    try {
      return executor(memAPI);
    } catch (err) {
      return Promise.resolve({ __error: String(err) });
    }
  }
  /**
   * Build the safe memory API exposed to model-generated code.
   * Only exposes query/retrieve operations — no mutation, no system access.
   */
  buildMemoryAPI() {
    const store = this.store;
    const layers = this.layers;
    return {
      // Core store operations
      query: async (text, opts) => {
        try {
          const result = await store.query(text, { limit: opts?.limit ?? 10 });
          return {
            count: result.results.length,
            total: result.totalAvailable,
            entries: result.results.map((r) => ({
              id: r.id,
              content: r.content.slice(0, 200),
              topics: r.topics,
              relevance: r.relevanceScore
            }))
          };
        } catch (err) {
          return { __error: `query failed: ${err}` };
        }
      },
      get: async (id) => {
        try {
          const entry = await store.get(id);
          if (!entry) return { __error: "not found" };
          return {
            id: entry.id,
            content: entry.content,
            topics: entry.topics,
            createdAt: entry.createdAt,
            accessedAt: entry.accessedAt,
            accessCount: entry.accessCount
          };
        } catch (err) {
          return { __error: `get failed: ${err}` };
        }
      },
      getRecent: async (n = 10) => {
        try {
          const results = await store.getRecent(n);
          return {
            count: results.length,
            entries: results.map((r) => ({
              id: r.id,
              content: r.content.slice(0, 150),
              topics: r.topics
            }))
          };
        } catch (err) {
          return { __error: `getRecent failed: ${err}` };
        }
      },
      getByTopic: async (topic, limit = 20) => {
        try {
          const results = await store.getByTopic(topic, limit);
          return {
            count: results.length,
            topic,
            entries: results.map((r) => ({
              id: r.id,
              content: r.content.slice(0, 150),
              topics: r.topics
            }))
          };
        } catch (err) {
          return { __error: `getByTopic failed: ${err}` };
        }
      },
      // Layer-aware navigation
      layers: {
        stats: () => {
          if (!layers) return { __error: "layers not enabled" };
          return layers.getStats();
        },
        query: async (text, opts) => {
          if (!layers) return { __error: "layers not enabled" };
          try {
            const result = await layers.query(text, {
              limit: opts?.limit ?? 10,
              layers: opts?.layers
            });
            return {
              count: result.results.length,
              total: result.totalAvailable,
              layerBreakdown: result.layerBreakdown,
              entries: result.results.map((r) => ({
                id: r.id,
                content: r.content.slice(0, 150),
                topics: r.topics,
                relevance: r.relevanceScore
              }))
            };
          } catch (err) {
            return { __error: `layer query failed: ${err}` };
          }
        },
        fireProcedural: (context) => {
          if (!layers) return { __error: "layers not enabled" };
          try {
            const triggered = layers.fireProcedural(context);
            return {
              count: triggered.length,
              rules: triggered.map((e) => ({
                id: e.id,
                content: e.content,
                trigger: e.metadata?.trigger
              }))
            };
          } catch (err) {
            return { __error: `fireProcedural failed: ${err}` };
          }
        },
        getTemporalHistory: (entryId) => {
          if (!layers) return { __error: "layers not enabled" };
          try {
            const history = layers.getTemporalHistory(entryId);
            return {
              count: history.length,
              entries: history.map((r) => ({
                id: r.id,
                content: r.content.slice(0, 150)
              }))
            };
          } catch (err) {
            return { __error: `getTemporalHistory failed: ${err}` };
          }
        }
      }
    };
  }
  /**
   * Format observation result for display to the model in next iteration.
   */
  formatObservation(result) {
    if (!result) return "  (no result)";
    if (typeof result === "object" && result !== null && "__error" in result) {
      return `  ERROR: ${result.__error}`;
    }
    if (typeof result === "object" && result !== null) {
      const r = result;
      if ("count" in r && "entries" in r) {
        const entries = r.entries;
        if (entries.length === 0) return "  No entries found.";
        return entries.slice(0, 5).map((e) => `  - [${e.id?.toString().slice(0, 8)}] ${String(e.content).slice(0, 100)}`).join("\n");
      }
      if ("total" in r) {
        return `  Found ${r.total} total, showing ${r.count ?? 0}`;
      }
    }
    const json = JSON.stringify(result, null, 2);
    return json.length > 500 ? json.slice(0, 500) + "..." : json;
  }
};

// src/http.ts
var HttpAdapter = class {
  server;
  engine;
  store;
  model;
  port;
  host;
  authToken;
  corsOrigin;
  maxBodyBytes;
  constructor(config) {
    this.store = config.store;
    this.model = config.model;
    this.engine = new QueryEngine({ store: this.store, model: this.model });
    this.port = config.port ?? 8787;
    this.host = config.host ?? "127.0.0.1";
    this.authToken = config.authToken;
    this.corsOrigin = config.corsOrigin ?? "http://localhost";
    this.maxBodyBytes = config.maxBodyBytes ?? 1024 * 1024;
  }
  async start() {
    const http = await import("http");
    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);
      const method = req.method ?? "GET";
      res.setHeader("Access-Control-Allow-Origin", this.corsOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (!this.isAuthorized(req)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
      try {
        const result = await this.handleRequest(method, url, req);
        res.writeHead(result.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result.body));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
    });
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        resolve();
      });
    });
  }
  async stop() {
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }
  async handleRequest(method, url, req) {
    const path = url.pathname;
    if (method === "POST" && path === "/memory") {
      if (!req) return { status: 400, body: { error: "Request body unavailable" } };
      const body = await this.readBody(req);
      if (!body) return { status: 400, body: { error: "Empty request body" } };
      const input = storeMemoryInputSchema.parse(JSON.parse(body));
      await this.engine.store(input);
      return { status: 201, body: { ok: true, message: "Memory stored" } };
    }
    if (method === "GET" && path === "/memory") {
      const query = url.searchParams.get("q") ?? "";
      const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);
      const topics = url.searchParams.get("topics")?.split(",").filter(Boolean);
      const options = { limit };
      if (topics) options.topics = topics;
      const result = await this.engine.query(query, options);
      return { status: 200, body: result };
    }
    if (method === "GET" && path === "/memory/recent") {
      const n = parseInt(url.searchParams.get("n") ?? "10", 10);
      const results = await this.engine.getRecent(n);
      return { status: 200, body: { results } };
    }
    if (method === "GET" && path.startsWith("/memory/topics/")) {
      const topic = decodeURIComponent(path.split("/")[3]);
      const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
      const results = await this.engine.getByTopic(topic, limit);
      return { status: 200, body: { results } };
    }
    if (method === "GET" && path.startsWith("/memory/")) {
      const id = path.split("/")[2];
      if (id === "recent" || id === "topics") {
        return { status: 404, body: { error: "Not found" } };
      }
      const entry = await this.store.get(id);
      return entry ? { status: 200, body: { entry } } : { status: 404, body: { error: "Memory not found" } };
    }
    if (method === "DELETE" && path.startsWith("/memory/")) {
      const id = path.split("/")[2];
      const forgotten = await this.store.forget(id);
      return {
        status: forgotten ? 200 : 404,
        body: { ok: forgotten, message: forgotten ? "Memory forgotten" : "Memory not found" }
      };
    }
    if (method === "GET" && path === "/snapshots") {
      const snapshots = await this.store.listSnapshots();
      return { status: 200, body: { snapshots } };
    }
    if (method === "POST" && path === "/snapshots") {
      if (!req) return { status: 400, body: { error: "Request body unavailable" } };
      const body = await this.readBody(req);
      const parsed = body ? JSON.parse(body) : {};
      const label = typeof parsed.label === "string" && parsed.label.trim() ? parsed.label : "snapshot";
      const snapshot = await this.store.createSnapshot(label);
      return { status: 201, body: { snapshot } };
    }
    if (method === "POST" && path.startsWith("/snapshots/") && path.endsWith("/restore")) {
      const id = path.split("/")[2];
      const restored = await this.store.restoreSnapshot(id);
      return { status: 200, body: { ok: true, restored } };
    }
    if (method === "DELETE" && path.startsWith("/snapshots/")) {
      const id = path.split("/")[2];
      const deleted = await this.store.deleteSnapshot(id);
      return {
        status: deleted ? 200 : 404,
        body: { ok: deleted, message: deleted ? "Snapshot deleted" : "Snapshot not found" }
      };
    }
    if (method === "GET" && path === "/events") {
      const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);
      const events = this.store.getEventLog(limit);
      return { status: 200, body: { events } };
    }
    if (method === "GET" && path === "/health") {
      return { status: 200, body: { ok: true, model: this.model?.name() ?? "none" } };
    }
    return { status: 404, body: { error: "Not found", path, method } };
  }
  isAuthorized(req) {
    if (!this.authToken) return true;
    return req.headers.authorization === `Bearer ${this.authToken}`;
  }
  async readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let total = 0;
      req.on("data", (chunk) => {
        total += chunk.length;
        if (total > this.maxBodyBytes) {
          reject(new Error("Request body too large"));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }
};

// src/consolidate.ts
var DEFAULT_OPTIONS = {
  similarityThreshold: 0.85,
  promotionAccessThreshold: 5,
  autoOnStore: false,
  mergeStrategy: "newer_wins"
};
var MemoryConsolidator = class {
  remem;
  embeddingService;
  options;
  constructor(remem, embeddingService = null, options = {}) {
    this.remem = remem;
    this.embeddingService = embeddingService ?? remem.getEmbeddingService?.() ?? null;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  // =========================================================================
  // Similarity-Based Deduplication
  // =========================================================================
  /**
   * Find all near-duplicate pairs in a layer.
   * Uses embedding cosine similarity when available, keyword fallback otherwise.
   */
  async findSimilarPairs(layer) {
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) return [];
    const entries = layerManager.getAllEntries().filter((e) => e.layer === layer);
    const pairs = [];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const similarity = await this.computeSimilarity(entries[i], entries[j]);
        if (similarity >= this.options.similarityThreshold) {
          pairs.push({ entryA: entries[i], entryB: entries[j], similarity });
        }
      }
    }
    return pairs;
  }
  /**
   * Compute similarity between two entries.
   * Uses embeddings when available, keyword Jaccard fallback.
   */
  async computeSimilarity(a, b) {
    if (this.embeddingService) {
      try {
        const embA = await this.getEntryEmbedding(a.id);
        const embB = await this.getEntryEmbedding(b.id);
        if (embA && embB) {
          return this.cosineSimilarity(embA, embB);
        }
      } catch {
      }
    }
    return this.keywordSimilarity(a.content, b.content);
  }
  async getEntryEmbedding(entryId) {
    const layerManager = this.remem.getLayerManager?.();
    if (layerManager && "entryEmbeddings" in layerManager) {
      const embeddings = layerManager.entryEmbeddings;
      return embeddings.get(entryId) ?? null;
    }
    return null;
  }
  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }
  keywordSimilarity(textA, textB) {
    const tokensA = new Set(textA.toLowerCase().split(/\W+/).filter(Boolean));
    const tokensB = new Set(textB.toLowerCase().split(/\W+/).filter(Boolean));
    const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
    const union = (/* @__PURE__ */ new Set([...tokensA, ...tokensB])).size;
    return union > 0 ? intersection / union : 0;
  }
  // =========================================================================
  // Merge Strategies
  // =========================================================================
  /**
   * Merge two entries according to the configured merge strategy.
   * Returns the merged entry content + metadata.
   */
  merge(a, b) {
    const strategy = this.options.mergeStrategy;
    const older = a.createdAt <= b.createdAt ? a : b;
    const newer = a.createdAt <= b.createdAt ? b : a;
    const winner = strategy === "older_wins" ? older : newer;
    let content;
    let topics;
    let metadata;
    switch (strategy) {
      case "newer_wins":
      case "older_wins": {
        content = winner.content;
        topics = [.../* @__PURE__ */ new Set([...a.topics, ...b.topics])];
        metadata = { ...a.metadata, ...b.metadata, mergedFrom: [a.id, b.id], winner: winner.id, consolidatedAt: Date.now() };
        break;
      }
      case "concatenate": {
        content = `${older.content}
---
${newer.content}`;
        topics = [.../* @__PURE__ */ new Set([...a.topics, ...b.topics])];
        metadata = { ...a.metadata, ...b.metadata, mergedFrom: [a.id, b.id], consolidatedAt: Date.now() };
        break;
      }
      case "supersede": {
        content = winner.content;
        topics = winner.topics;
        metadata = { ...winner.metadata, consolidatedAt: Date.now() };
        break;
      }
      default:
        content = winner.content;
        topics = winner.topics;
        metadata = { ...winner.metadata };
    }
    return { content, topics, metadata };
  }
  // =========================================================================
  // Deduplicate a Layer
  // =========================================================================
  /**
   * Run deduplication over a specific layer.
   * Finds similar pairs, merges them, and deletes the merged entries.
   * @returns Number of entries deduplicated
   */
  async deduplicateLayer(layer) {
    const result = { deduplicated: 0, promoted: 0, superseded: 0, errors: [] };
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) {
      result.errors.push("No layer manager available");
      return result;
    }
    const pairs = await this.findSimilarPairs(layer);
    const processedIds = /* @__PURE__ */ new Set();
    for (const pair of pairs) {
      if (processedIds.has(pair.entryA.id) || processedIds.has(pair.entryB.id)) continue;
      const merged = this.merge(pair.entryA, pair.entryB);
      try {
        const newEntry = this.remem.store(
          {
            content: merged.content,
            topics: merged.topics,
            metadata: {
              ...merged.metadata,
              consolidatedFrom: [pair.entryA.id, pair.entryB.id],
              similarity: pair.similarity
            }
          },
          layer
        );
        layerManager.forget(pair.entryA.id);
        layerManager.forget(pair.entryB.id);
        processedIds.add(pair.entryA.id);
        processedIds.add(pair.entryB.id);
        result.deduplicated++;
        if (this.options.mergeStrategy === "supersede") {
          result.superseded++;
        }
        if (this.embeddingService && newEntry.id) {
          try {
            const vec = await this.embeddingService.embed(merged.content);
            await this.remem.persistLayerEntry?.({ ...newEntry, content: merged.content });
            await this.remem.persistLayerEmbedding?.(newEntry.id, vec, this.embeddingService.model);
            if (layerManager && "setEntryEmbedding" in layerManager) {
              layerManager.setEntryEmbedding(newEntry.id, vec);
            }
          } catch (err) {
            result.errors.push(`Embedding generation failed for ${newEntry.id}: ${err}`);
          }
        }
      } catch (err) {
        result.errors.push(`Merge failed for ${pair.entryA.id}+${pair.entryB.id}: ${err}`);
      }
    }
    return result;
  }
  // =========================================================================
  // Cross-Layer Conflict Resolution
  // =========================================================================
  /**
   * Detect contradictions between entries in the same layer.
   * Uses negation pattern matching to find conflicting statements.
   *
   * e.g., "User prefers dark mode" vs "User prefers light mode"
   */
  async detectConflicts(layer) {
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) return [];
    const entries = layerManager.getAllEntries().filter((e) => e.layer === layer);
    const conflicts = [];
    const NEGATION_PATTERNS = [
      /prefer(s|ring|red)?\s+not\s+/i,
      /prefer(s|ring|red)?\s+instead\s+/i,
      /no\s+longer\s+/i,
      /changed\s+to\s+/i,
      /now\s+(use|pref|like)\s+/i,
      /switched\s+to\s+/i,
      /from\s+\w+\s+to\s+\w+\s+transition/i
    ];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        const aHasNegation = NEGATION_PATTERNS.some((p) => p.test(a.content));
        const bHasNegation = NEGATION_PATTERNS.some((p) => p.test(b.content));
        if (aHasNegation !== bHasNegation) {
          const sharedTopics = a.topics.filter((t) => b.topics.includes(t));
          if (sharedTopics.length > 0) {
            const older = aHasNegation ? b : a;
            const newer = aHasNegation ? a : b;
            conflicts.push({ older, newer });
          }
        }
      }
    }
    return conflicts;
  }
  /**
   * Resolve conflicts by marking older entries as superseded.
   * Keeps the newest (most recent) entry as authoritative.
   */
  async resolveConflicts(layer) {
    const result = { deduplicated: 0, promoted: 0, superseded: 0, errors: [] };
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) {
      result.errors.push("No layer manager available");
      return result;
    }
    const conflicts = await this.detectConflicts(layer);
    for (const { older, newer } of conflicts) {
      try {
        older.supersededBy = newer.id;
        older.validUntil = newer.createdAt;
        await this.remem.persistLayerEntry?.(older);
        result.superseded++;
      } catch (err) {
        result.errors.push(`Conflict resolution failed for ${older.id}: ${err}`);
      }
    }
    return result;
  }
  // =========================================================================
  // Cross-Layer Promotion
  // =========================================================================
  /**
   * Promote frequently-accessed episodic entries to semantic layer.
   * Entries with accessCount >= promotionAccessThreshold that are still in episodic
   * after 10 minutes get promoted to semantic layer (they're important enough to keep longer).
   */
  async promoteFrequentEpisodic() {
    const result = { deduplicated: 0, promoted: 0, superseded: 0, errors: [] };
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) {
      result.errors.push("No layer manager available");
      return result;
    }
    const entries = layerManager.getAllEntries().filter((e) => e.layer === "episodic");
    const now = Date.now();
    const EPISODIC_KEEP_MS = 10 * 60 * 1e3;
    for (const entry of entries) {
      if (entry.accessCount >= this.options.promotionAccessThreshold && now - entry.createdAt >= EPISODIC_KEEP_MS) {
        try {
          const promoted = this.remem.store(
            {
              content: entry.content,
              topics: [...entry.topics, "promoted-from-episodic"],
              metadata: {
                ...entry.metadata,
                promotedFrom: entry.id,
                originalLayer: "episodic",
                originalCreatedAt: entry.createdAt,
                promotedAt: now,
                accessCount: entry.accessCount
              }
            },
            "semantic"
          );
          entry.supersededBy = promoted.id;
          entry.validUntil = now;
          await this.remem.persistLayerEntry?.(entry);
          layerManager.forget(entry.id);
          result.promoted++;
        } catch (err) {
          result.errors.push(`Promotion failed for ${entry.id}: ${err}`);
        }
      }
    }
    return result;
  }
  // =========================================================================
  // Full Periodic Consolidation
  // =========================================================================
  /**
   * Run full consolidation over all layers.
   * 1. Deduplicate each layer
   * 2. Resolve conflicts in semantic and identity layers
   * 3. Promote frequent episodic entries
   *
   * @param layers Layers to consolidate. Defaults to all.
   */
  async consolidateAll(layers = ["episodic", "semantic", "identity", "procedural"]) {
    const result = { deduplicated: 0, promoted: 0, superseded: 0, errors: [] };
    for (const layer of layers) {
      const dedupResult = await this.deduplicateLayer(layer);
      result.deduplicated += dedupResult.deduplicated;
      result.superseded += dedupResult.superseded;
      result.errors.push(...dedupResult.errors);
      if (layer === "semantic" || layer === "identity") {
        const conflictResult = await this.resolveConflicts(layer);
        result.superseded += conflictResult.superseded;
        result.errors.push(...conflictResult.errors);
      }
    }
    const promotionResult = await this.promoteFrequentEpisodic();
    result.promoted += promotionResult.promoted;
    result.errors.push(...promotionResult.errors);
    return result;
  }
};

// src/episodic-capture.ts
var import_crypto5 = require("crypto");
var HIGH_IMPORTANCE_PATTERNS = [
  "decision",
  "agreed",
  "decided",
  "commit",
  "ship",
  "deploy",
  "publish",
  "fix",
  "bug",
  "broken",
  "hack",
  "workaround",
  "important",
  "critical",
  "priority",
  "blocker",
  "ship it",
  "go",
  "no-go",
  "approved",
  "rejected",
  "refactor",
  "architecture",
  "design",
  "strategy",
  "plan"
];
var LOW_IMPORTANCE_PATTERNS = [
  "ping",
  "pong",
  "heartbeat",
  "typing",
  "read",
  "check",
  "ACK",
  "ok",
  "yes",
  "noop",
  "noop",
  "null",
  "skip",
  "ignore",
  "watermark"
];
var TYPE_IMPORTANCE = {
  "decision": 0.9,
  "goal.achieved": 0.95,
  "identity.drift": 0.8,
  "identity.correction": 0.8,
  "agent.error": 0.7,
  "learning": 0.75,
  "user.feedback": 0.65,
  "user.question": 0.55,
  "goal.set": 0.7,
  "memory.store": 0.5,
  "memory.query": 0.3,
  "memory.recall": 0.4,
  "session.start": 0.2,
  "session.end": 0.3,
  "session.compaction": 0.1,
  "agent.turn": 0.4,
  "agent.response": 0.4,
  "agent.tool_call": 0.5,
  "agent.tool_result": 0.45,
  "user.message": 0.5
};
function scoreImportance(event) {
  if (event.importanceOverride !== void 0) {
    return Math.max(0, Math.min(1, event.importanceOverride));
  }
  let score = TYPE_IMPORTANCE[event.type] ?? 0.5;
  const lower = event.content.toLowerCase();
  for (const pattern of HIGH_IMPORTANCE_PATTERNS) {
    if (lower.includes(pattern)) {
      score = Math.min(1, score + 0.15);
      break;
    }
  }
  for (const pattern of LOW_IMPORTANCE_PATTERNS) {
    if (lower.includes(pattern)) {
      score = Math.max(0.1, score - 0.2);
      break;
    }
  }
  if (event.content.length < 20) {
    score = Math.max(0.1, score - 0.1);
  }
  if (event.content.length > 500) {
    score = Math.min(1, score + 0.1);
  }
  return Math.max(0, Math.min(1, score));
}
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return h;
}
function makeDedupKey(event) {
  const normalized = event.content.toLowerCase().replace(/\s+/g, " ").trim();
  return {
    type: event.type,
    contentHash: hashString(normalized)
  };
}
var EpisodicCapturePipeline = class {
  remem;
  eventBuffer = [];
  dedupSet = /* @__PURE__ */ new Map();
  flushIntervalMs;
  maxBatchSize;
  dedupWindowMs;
  layer;
  intervalHandle = null;
  started = false;
  eventCount = 0;
  droppedCount = 0;
  constructor(remem, options = {}) {
    this.remem = remem;
    this.flushIntervalMs = options.flushIntervalMs ?? 1e3;
    this.maxBatchSize = options.maxBatchSize ?? 50;
    this.dedupWindowMs = options.dedupWindowMs ?? 2e3;
    this.layer = options.layer ?? "episodic";
  }
  /**
   * Capture a single event into the episodic layer.
   * Events are buffered and flushed in batches.
   */
  capture(event) {
    const now = Date.now();
    this.eventCount++;
    const enriched = {
      ...event,
      id: event.id ?? (0, import_crypto5.randomUUID)(),
      timestamp: event.timestamp ?? now
    };
    if (!enriched.noDedup) {
      const key = makeDedupKey(enriched);
      const keyStr = `${key.type}::${key.contentHash}`;
      const existing = this.dedupSet.get(keyStr);
      if (existing && now < existing.expiresAt) {
        this.droppedCount++;
        return;
      }
      this.dedupSet.set(keyStr, { key, expiresAt: now + this.dedupWindowMs });
    }
    this.eventBuffer.push(enriched);
    if (this.eventBuffer.length >= this.maxBatchSize) {
      this.flush().catch((err) => console.error("[EpisodicCapture] flush error:", err));
    }
  }
  /**
   * Capture multiple events at once.
   */
  captureBatch(events) {
    for (const event of events) {
      this.capture(event);
    }
  }
  /**
   * Start the periodic flush interval.
   * Call once after registering event sources.
   */
  start() {
    if (this.started) return;
    this.started = true;
    this.intervalHandle = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flush().catch((err) => console.error("[EpisodicCapture] flush error:", err));
      }
      const now = Date.now();
      for (const [key, val] of this.dedupSet.entries()) {
        if (now >= val.expiresAt) this.dedupSet.delete(key);
      }
    }, this.flushIntervalMs);
  }
  /**
   * Stop the flush interval and flush remaining events.
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (this.eventBuffer.length > 0) {
      this.flush().catch((err) => console.error("[EpisodicCapture] final flush error:", err));
    }
    this.started = false;
  }
  /**
   * Flush the event buffer to MemoryStore.
   */
  async flush() {
    if (this.eventBuffer.length === 0) return;
    const batch = this.eventBuffer.splice(0, this.eventBuffer.length);
    for (const event of batch) {
      const importance = scoreImportance(event);
      const topics = this.extractTopics(event);
      const content = this.formatEvent(event);
      const entry = this.remem.store(
        {
          content,
          topics,
          metadata: {
            ...event.metadata,
            captureEventId: event.id,
            captureEventType: event.type,
            importance,
            capturedAt: event.timestamp
          }
        },
        this.layer
      );
      if (this.remem.getLayerManager && typeof entry.id === "string") {
        void this.generateEmbedding(entry.id, content).catch(() => {
        });
      }
    }
  }
  /**
   * Extract topics from event type and content.
   */
  extractTopics(event) {
    const topics = [event.type.split(".")[0]];
    switch (event.type) {
      case "decision":
        topics.push("decision");
        break;
      case "learning":
        topics.push("learning");
        break;
      case "goal.set":
      case "goal.achieved":
        topics.push("goal");
        break;
      case "identity.drift":
      case "identity.correction":
        topics.push("identity", "drift");
        break;
      case "agent.error":
        topics.push("error");
        break;
      case "user.message":
        topics.push("user-interaction");
        if (event.metadata?.channel?.includes("discord")) topics.push("discord");
        break;
      case "session.compaction":
        topics.push("session", "maintenance");
        break;
    }
    const hashtags = event.content.match(/#[a-zA-Z][\w-]*/g);
    if (hashtags) {
      topics.push(...hashtags.map((t) => t.slice(1).toLowerCase()));
    }
    return [...new Set(topics)];
  }
  /**
   * Format an event into a human-readable episodic memory string.
   */
  formatEvent(event) {
    const ts = event.timestamp ? new Date(event.timestamp).toISOString().slice(0, 19).replace("T", " ") : "";
    const metaStr = event.metadata ? Object.entries(event.metadata).filter(([k]) => !["importance", "capturedAt"].includes(k)).slice(0, 5).map(([k, v]) => `${k}=${String(v).slice(0, 50)}`).join(" ") : "";
    const importance = scoreImportance(event);
    const importanceLabel = importance >= 0.8 ? "\u{1F534}" : importance >= 0.6 ? "\u{1F7E1}" : importance >= 0.4 ? "\u{1F7E2}" : "\u26AA";
    return `[${event.type}] ${event.content}${metaStr ? ` (${metaStr})` : ""} ${importanceLabel} ${ts}`.trim();
  }
  /**
   * Generate embedding for a stored entry (async, non-blocking).
   * Returns early if no embedding service available.
   */
  async generateEmbedding(_entryId, _content) {
  }
  /**
   * Get capture statistics.
   */
  getStats() {
    return {
      eventCount: this.eventCount,
      droppedCount: this.droppedCount,
      bufferSize: this.eventBuffer.length,
      started: this.started
    };
  }
};

// src/adapters.ts
function withDefaultTopic(input, defaultTopic) {
  const normalized = storeMemoryInputSchema.parse(input);
  if (!defaultTopic) return normalized;
  const topics = Array.from(/* @__PURE__ */ new Set([...normalized.topics, defaultTopic]));
  return { ...normalized, topics };
}
function contentFromMessages(messages) {
  if (!Array.isArray(messages)) return String(messages ?? "");
  return messages.map((message) => {
    if (typeof message === "string") return message;
    if (!message || typeof message !== "object") return String(message ?? "");
    const record = message;
    const role = typeof record.role === "string" ? `${record.role}: ` : "";
    const content = record.content;
    if (typeof content === "string") return `${role}${content}`;
    if (Array.isArray(content)) {
      const text = content.map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && typeof part.text === "string") {
          return part.text;
        }
        return "";
      }).filter(Boolean).join("\n");
      return `${role}${text}`;
    }
    return `${role}${JSON.stringify(content ?? "")}`;
  }).filter(Boolean).join("\n");
}
function createVercelAIAdapter(memory, options = {}) {
  return {
    name: "vercel-ai",
    async remember(input) {
      const normalized = storeMemoryInputSchema.parse(typeof input === "string" ? { content: input } : input);
      await memory.store(withDefaultTopic(normalized, options.defaultTopic ?? "vercel-ai"));
    },
    async saveMessages(messages, metadata = {}) {
      const content = contentFromMessages(messages).trim();
      if (!content) return;
      const entry = storeMemoryInputSchema.parse({
        content,
        metadata: { ...metadata, source: "vercel-ai.messages" }
      });
      await memory.store(withDefaultTopic(entry, options.defaultTopic ?? "conversation"));
    },
    async recall(query, queryOptions = { limit: options.defaultLimit ?? 5 }) {
      return memory.query(query, queryOptions);
    },
    async context(query, queryOptions = { limit: options.defaultLimit ?? 5 }) {
      const response = await memory.query(query, queryOptions);
      return response.results.map((result) => `- ${result.content}`).join("\n");
    }
  };
}
function createLangGraphStoreAdapter(memory, options = {}) {
  return {
    name: "langgraph-store",
    async put(namespace, key, value) {
      const ns = Array.isArray(namespace) ? namespace.join("/") : namespace;
      const content = typeof value === "string" ? value : JSON.stringify(value);
      await memory.store(withDefaultTopic({
        content,
        topics: [ns],
        metadata: { key, namespace: ns, source: "langgraph.store" }
      }, options.defaultTopic));
    },
    async search(namespace, query, queryOptions = { limit: options.defaultLimit ?? 10 }) {
      const ns = Array.isArray(namespace) ? namespace.join("/") : namespace;
      const response = await memory.query(query, {
        ...queryOptions,
        topics: Array.from(/* @__PURE__ */ new Set([...queryOptions.topics ?? [], ns]))
      });
      return response.results.map((result) => ({
        namespace: [ns],
        key: result.id,
        value: result.content,
        createdAt: result.createdAt,
        updatedAt: result.accessedAt,
        score: result.relevanceScore
      }));
    },
    async get(namespace, key) {
      const ns = Array.isArray(namespace) ? namespace.join("/") : namespace;
      const response = await memory.query(key, { limit: 20, topics: [ns] });
      const found = response.results.find((result) => result.id === key || result.content.includes(key));
      return found ? {
        namespace: [ns],
        key: found.id,
        value: found.content,
        createdAt: found.createdAt,
        updatedAt: found.accessedAt
      } : null;
    },
    async listNamespaces() {
      const recent = await memory.getRecent(100);
      const namespaces = /* @__PURE__ */ new Set();
      for (const entry of recent) {
        for (const topic of entry.topics) namespaces.add(topic);
      }
      return [...namespaces].map((ns) => [ns]);
    }
  };
}
function createOpenClawAdapter(memory, options = {}) {
  return {
    name: "openclaw",
    async rememberTurn(turn) {
      await memory.store(withDefaultTopic({
        content: `${turn.role}: ${turn.content}`,
        topics: [turn.sessionId ? `session:${turn.sessionId}` : "session"],
        metadata: {
          ...turn.metadata,
          role: turn.role,
          sessionId: turn.sessionId,
          messageId: turn.messageId,
          source: "openclaw.turn"
        }
      }, options.defaultTopic ?? "openclaw"));
    },
    async recallContext(query, queryOptions = { limit: options.defaultLimit ?? 8 }) {
      const response = await memory.query(query, queryOptions);
      return response.results.map((result) => `- ${result.content}`).join("\n");
    },
    async query(query, queryOptions) {
      return memory.query(query, queryOptions);
    }
  };
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
    const normalized = storeMemoryInputSchema.parse(input);
    const stored = await this._store.store(normalized, {
      agentId: this._agentId,
      userId: this._userId
    });
    if (this._layersEnabled && this.layers) {
      const result = this.layers.store(normalized);
      await this._store.persistLayerEntry(result, {
        agentId: this._agentId,
        userId: this._userId
      });
    }
    if (this._embeddingEnabled && this.embeddingService) {
      const contentToEmbed = normalized.topics.length > 0 ? `[${normalized.topics.join(", ")}] ${normalized.content}` : normalized.content;
      if (normalized.metadata?.asyncEmbed === false) {
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
   * Get the layer manager for advanced layer/consolidation operations.
   */
  getLayerManager() {
    return this.layers;
  }
  /**
   * Persist a layer entry. Exposed for advanced consolidation workflows.
   */
  async persistLayerEntry(entry) {
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId
    });
  }
  /**
   * Persist a vector embedding for a layered memory entry.
   */
  async persistLayerEmbedding(entryId, vector, model) {
    const base64 = EmbeddingService.encodeVector(vector);
    await this._store.storeEmbedding(entryId, base64, vector.length, model, "layered");
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
  async replNavigate(query) {
    if (!this.model) {
      const { results } = await this.query(query);
      return {
        answer: results.length > 0 ? `No LLM configured \u2014 used direct query. Found ${results.length} results:
` + results.slice(0, 5).map((r) => `- ${r.content}`).join("\n") : "No LLM configured and no direct query results.",
        observations: []
      };
    }
    const repl = new MemoryREPL({
      store: this._store,
      layers: this.layers,
      model: this.model,
      maxDepth: 5,
      maxResults: 20
    });
    return repl.navigate(query);
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
    this.layers = new LayerManager(config ?? DEFAULT_LAYER_CONFIG, this.embeddingService);
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
        if (this.embeddingService) {
          for (const entry of persisted) {
            try {
              const stored = await this._store.getEmbedding(entry.id);
              if (stored) {
                const vector = EmbeddingService.decodeVector(stored.base64, stored.dimension);
                this.layers.setEntryEmbedding(entry.id, vector);
              }
            } catch {
            }
          }
        }
      } catch {
      }
    }
    if (this.needsEpisodicCompression() && this.model) {
      this.compressEpisodic(20).catch(() => {
      });
    }
  }
  /**
   * Store in a specific layer.
   */
  async storeInLayer(input, layer) {
    const normalized = storeMemoryInputSchema.parse(input);
    if (!this.layers) {
      await this.enableLayers();
    }
    const entry = this.layers.store(normalized, layer);
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId
    });
    if (this.embeddingService) {
      const contentToEmbed = normalized.topics.length > 0 ? `[${normalized.topics.join(", ")}] ${normalized.content}` : normalized.content;
      this.embeddingService.generateEmbedding(entry.id, contentToEmbed).then(async (emb) => {
        await this._store.storeEmbedding(entry.id, emb.base64, emb.vector.length, emb.model);
        this.layers.setEntryEmbedding(entry.id, emb.vector);
      }).catch((err) => console.warn(`[ReMEM] Layer embedding failed for ${entry.id}: ${err}`));
    }
    if (this.needsEpisodicCompression() && this.model) {
      this.compressEpisodic(20).catch(() => {
      });
    }
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
   * Uses hybrid scoring (keyword + semantic embeddings) when embedding service is available.
   */
  async queryLayers(query, options) {
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
   * Check if episodic layer needs compression.
   * Returns true when episodic is above 80% capacity.
   */
  needsEpisodicCompression() {
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
  async compressEpisodic(count = 20) {
    if (!this.layers || !this.model) return null;
    const entries = this.layers.getEntriesForCompression(count);
    if (entries.length === 0) return null;
    const result = await this.layers.compressToSemantic(entries, this.model);
    if (!result) return null;
    await this._store.persistLayerEntry(result.compressedEntry, {
      agentId: this._agentId,
      userId: this._userId
    });
    return {
      compressedEntryId: result.compressedEntry.id,
      summary: result.compressedEntry.content,
      entriesEvicted: result.entriesEvicted
    };
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
  EpisodicCapturePipeline,
  HttpAdapter,
  LayerManager,
  MemoryConsolidator,
  MemoryREPL,
  MemoryStore,
  ModelAbstraction,
  QueryEngine,
  ReMEM,
  buildIdentityPackage,
  constitutionSchema,
  constitutionStatementSchema,
  createIdentitySystem,
  createLangGraphStoreAdapter,
  createOpenClawAdapter,
  createVercelAIAdapter,
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
