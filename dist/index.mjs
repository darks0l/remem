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
  "snapshot.created",
  "snapshot.restored"
]);
var memoryEventSchema = z.object({
  id: z.string().uuid(),
  type: eventTypeSchema,
  timestamp: z.number(),
  payload: z.record(z.unknown())
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
  ensureInitialized() {
    if (!this.db) throw new Error("MemoryStore not initialized. Call await memoryStore.init() first.");
  }
  async store(input) {
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
      `INSERT INTO memory (id, content, topics, metadata, created_at, accessed_at, access_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.id,
        validated.content,
        JSON.stringify(validated.topics),
        JSON.stringify(validated.metadata),
        validated.createdAt,
        validated.accessedAt,
        validated.accessCount
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
  getEventLog(limit = 100) {
    return this.eventLog.slice(0, limit);
  }
  persist() {
    if (!this.db || this.dbPath === ":memory:") return;
    try {
      const { writeFileSync } = __require("fs");
      const data = this.db.export();
      const buffer = Buffer.from(data);
      writeFileSync(this.dbPath, buffer);
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
  constructor(config) {
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

// src/index.ts
var ReMEM = class {
  _store;
  model;
  engine;
  constructor(config) {
    const validated = rememConfigSchema.parse(config);
    const dbPath = validated.dbPath ?? ":memory:";
    this._store = new MemoryStore(dbPath);
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
   */
  async init() {
    await this._store.init();
  }
  /**
   * Store a new memory entry.
   */
  async store(input) {
    await this.engine.store(input);
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
  MemoryStore,
  ModelAbstraction,
  QueryEngine,
  ReMEM,
  eventTypeSchema,
  memoryEntrySchema,
  memoryEventSchema,
  modelConfigSchema,
  queryOptionsSchema,
  queryResponseSchema,
  queryResultSchema,
  rememConfigSchema,
  storeMemoryInputSchema
};
