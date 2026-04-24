var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/store.ts
import initSqlJs from "sql.js";
import { randomUUID } from "crypto";

// src/types.ts
import { z } from "zod";
var memoryEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  topics: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.number(),
  // unix timestamp ms
  accessedAt: z.number(),
  // unix timestamp ms
  accessCount: z.number().default(0)
});
var storeMemoryInputSchema = z.object({
  content: z.string().min(1),
  topics: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({})
});
var queryOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  topics: z.array(z.string()).optional(),
  minAccessCount: z.number().optional(),
  since: z.number().optional(),
  // unix timestamp ms
  until: z.number().optional()
});
var queryResultSchema = z.object({
  id: z.string(),
  content: z.string(),
  topics: z.array(z.string()),
  relevanceScore: z.number().optional(),
  createdAt: z.number(),
  accessedAt: z.number(),
  accessCount: z.number()
});
var queryResponseSchema = z.object({
  results: z.array(queryResultSchema),
  totalAvailable: z.number(),
  query: z.string(),
  tookMs: z.number()
});
var modelConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bankr"),
    apiKey: z.string().min(1),
    baseUrl: z.string().url().optional()
  }),
  z.object({
    type: z.literal("openai"),
    apiKey: z.string().min(1),
    model: z.string().optional().default("gpt-4o"),
    baseUrl: z.string().url().optional()
  }),
  z.object({
    type: z.literal("anthropic"),
    apiKey: z.string().min(1),
    model: z.string().optional().default("claude-sonnet-4-6"),
    baseUrl: z.string().url().optional()
  }),
  z.object({
    type: z.literal("ollama"),
    baseUrl: z.string().url().default("http://localhost:11434"),
    model: z.string().default("llama3")
  })
]);
var rememConfigSchema = z.object({
  storage: z.enum(["sqlite", "postgres", "memory"]).default("sqlite"),
  storageConfig: z.record(z.unknown()).optional(),
  llm: modelConfigSchema.optional(),
  adapter: z.string().optional(),
  dbPath: z.string().optional()
  // for sqlite
});
var eventTypeSchema = z.enum([
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
var memoryEventSchema = z.object({
  id: z.string().uuid(),
  type: eventTypeSchema,
  timestamp: z.number(),
  payload: z.record(z.unknown())
});
var identityCategorySchema = z.enum(["values", "boundaries", "preferences", "goals"]);
var constitutionStatementSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1),
  category: identityCategorySchema,
  weight: z.number().min(0).max(1).default(0.5),
  source: z.string().optional(),
  // e.g. 'SOUL.md', 'IDENTITY.md', 'manual'
  createdAt: z.number()
});
var constitutionSchema = z.object({
  statements: z.array(constitutionStatementSchema),
  version: z.string().default("1.0"),
  createdAt: z.number(),
  updatedAt: z.number()
});
var driftResultSchema = z.object({
  score: z.number().min(0).max(1),
  level: z.enum(["aligned", "minor", "moderate", "critical"]),
  violatingStatements: z.array(constitutionStatementSchema),
  reasoning: z.string(),
  detectedAt: z.number()
});
var identityConfigSchema = z.object({
  constitution: constitutionSchema.optional(),
  driftThreshold: z.number().min(0).max(1).default(0.3),
  criticalThreshold: z.number().min(0).max(1).default(0.7),
  autoInject: z.boolean().default(true),
  evalModel: modelConfigSchema.optional()
  // separate eval model (local Ollama preferred for cost)
});
var memoryLayerSchema = z.enum(["episodic", "semantic", "identity", "procedural"]);
var layerConfigSchema = z.object({
  episodic: z.object({
    ttlMs: z.number().default(36e5),
    // 1 hour
    maxEntries: z.number().default(1e3),
    weight: z.number().default(0.2)
  }),
  semantic: z.object({
    ttlMs: z.number().default(6048e5),
    // 7 days
    maxEntries: z.number().default(5e3),
    weight: z.number().default(0.3),
    // Temporal self-edit options
    selfEdit: z.boolean().default(false),
    // auto-supersede conflicting entries
    temporalValidity: z.boolean().default(true)
    // track validFrom/validUntil
  }),
  identity: z.object({
    ttlMs: z.number().default(2592e6),
    // 30 days
    maxEntries: z.number().default(500),
    weight: z.number().default(0.5)
  }),
  procedural: z.object({
    ttlMs: z.number().default(2592e6),
    // 30 days (long-term rules)
    maxEntries: z.number().default(500),
    weight: z.number().default(0.4),
    trigger: z.string().optional()
    // keyword that fires this rule
  })
});
var layeredMemoryEntrySchema = memoryEntrySchema.extend({
  layer: memoryLayerSchema.default("episodic"),
  expiresAt: z.number().optional(),
  importance: z.number().min(0).max(1).default(0.5),
  // Temporal validity (semantic layer)
  validFrom: z.number().optional(),
  // when this fact became true
  validUntil: z.number().optional(),
  // when this fact stopped being true (null = still valid)
  // Self-edit supersession chain
  supersedes: z.string().optional(),
  // id of the entry this one supersedes (older version)
  supersededBy: z.string().optional()
  // id of the entry that supersedes this one
});
var driftEventSchema = z.object({
  driftResult: driftResultSchema,
  correctionInjected: z.boolean().default(false),
  correctionText: z.string().optional()
});

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
    const SQL = await initSqlJs();
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
      id: randomUUID(),
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
    const id = randomUUID();
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
  getEventLog(limit = 100) {
    return this.eventLog.slice(0, limit);
  }
  persist() {
    if (!this.db || this.dbPath === ":memory:") return;
    try {
      const { writeFileSync, renameSync } = __require("fs");
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
      id: randomUUID(),
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
import { randomUUID as randomUUID2 } from "crypto";
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
            id: randomUUID2(),
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
          id: randomUUID2(),
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
      id: randomUUID2(),
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
import { randomUUID as randomUUID3 } from "crypto";
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
      id: randomUUID3(),
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

// src/index.ts
var ReMEM = class {
  _store;
  model;
  engine;
  identity;
  layers;
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
   */
  async store(input) {
    await this.engine.store(input);
    if (this._layersEnabled && this.layers) {
      const result = this.layers.store(input);
      await this._store.persistLayerEntry(result, {
        agentId: this._agentId,
        userId: this._userId
      });
    }
  }
  /**
   * Query memory using natural language.
   */
  async query(query, options) {
    return this.engine.query(query, options);
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
export {
  ConstitutionInjector,
  ConstitutionManager,
  DEFAULT_LAYER_CONFIG,
  DriftDetector,
  LayerManager,
  MemoryStore,
  ModelAbstraction,
  QueryEngine,
  ReMEM,
  constitutionSchema,
  constitutionStatementSchema,
  createIdentitySystem,
  driftEventSchema,
  driftResultSchema,
  eventTypeSchema,
  identityCategorySchema,
  identityConfigSchema,
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
  storeMemoryInputSchema
};
