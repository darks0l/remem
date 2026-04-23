import { z } from 'zod';

/**
 * ReMEM — Core Types
 * Recursive Memory for AI Agents
 */

declare const memoryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    topics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodNumber;
    accessedAt: z.ZodNumber;
    accessCount: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    content: string;
    topics: string[];
    metadata: Record<string, unknown>;
    id: string;
    createdAt: number;
    accessedAt: number;
    accessCount: number;
}, {
    content: string;
    id: string;
    createdAt: number;
    accessedAt: number;
    topics?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    accessCount?: number | undefined;
}>;
type MemoryEntry = z.infer<typeof memoryEntrySchema>;
declare const storeMemoryInputSchema: z.ZodObject<{
    content: z.ZodString;
    topics: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    metadata: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    topics: string[];
    metadata: Record<string, unknown>;
}, {
    content: string;
    topics?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
type StoreMemoryInput = z.infer<typeof storeMemoryInputSchema>;
declare const queryOptionsSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    minAccessCount: z.ZodOptional<z.ZodNumber>;
    since: z.ZodOptional<z.ZodNumber>;
    until: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    topics?: string[] | undefined;
    minAccessCount?: number | undefined;
    since?: number | undefined;
    until?: number | undefined;
}, {
    topics?: string[] | undefined;
    limit?: number | undefined;
    minAccessCount?: number | undefined;
    since?: number | undefined;
    until?: number | undefined;
}>;
type QueryOptions = z.infer<typeof queryOptionsSchema>;
declare const queryResultSchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    topics: z.ZodArray<z.ZodString, "many">;
    relevanceScore: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodNumber;
    accessedAt: z.ZodNumber;
    accessCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    content: string;
    topics: string[];
    id: string;
    createdAt: number;
    accessedAt: number;
    accessCount: number;
    relevanceScore?: number | undefined;
}, {
    content: string;
    topics: string[];
    id: string;
    createdAt: number;
    accessedAt: number;
    accessCount: number;
    relevanceScore?: number | undefined;
}>;
type QueryResult = z.infer<typeof queryResultSchema>;
declare const queryResponseSchema: z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        topics: z.ZodArray<z.ZodString, "many">;
        relevanceScore: z.ZodOptional<z.ZodNumber>;
        createdAt: z.ZodNumber;
        accessedAt: z.ZodNumber;
        accessCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        content: string;
        topics: string[];
        id: string;
        createdAt: number;
        accessedAt: number;
        accessCount: number;
        relevanceScore?: number | undefined;
    }, {
        content: string;
        topics: string[];
        id: string;
        createdAt: number;
        accessedAt: number;
        accessCount: number;
        relevanceScore?: number | undefined;
    }>, "many">;
    totalAvailable: z.ZodNumber;
    query: z.ZodString;
    tookMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    results: {
        content: string;
        topics: string[];
        id: string;
        createdAt: number;
        accessedAt: number;
        accessCount: number;
        relevanceScore?: number | undefined;
    }[];
    totalAvailable: number;
    query: string;
    tookMs: number;
}, {
    results: {
        content: string;
        topics: string[];
        id: string;
        createdAt: number;
        accessedAt: number;
        accessCount: number;
        relevanceScore?: number | undefined;
    }[];
    totalAvailable: number;
    query: string;
    tookMs: number;
}>;
type QueryResponse = z.infer<typeof queryResponseSchema>;
declare const modelConfigSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"bankr">;
    apiKey: z.ZodString;
    baseUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "bankr";
    apiKey: string;
    baseUrl?: string | undefined;
}, {
    type: "bankr";
    apiKey: string;
    baseUrl?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"openai">;
    apiKey: z.ZodString;
    model: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    baseUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "openai";
    apiKey: string;
    model: string;
    baseUrl?: string | undefined;
}, {
    type: "openai";
    apiKey: string;
    baseUrl?: string | undefined;
    model?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"anthropic">;
    apiKey: z.ZodString;
    model: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    baseUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "anthropic";
    apiKey: string;
    model: string;
    baseUrl?: string | undefined;
}, {
    type: "anthropic";
    apiKey: string;
    baseUrl?: string | undefined;
    model?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"ollama">;
    baseUrl: z.ZodDefault<z.ZodString>;
    model: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "ollama";
    baseUrl: string;
    model: string;
}, {
    type: "ollama";
    baseUrl?: string | undefined;
    model?: string | undefined;
}>]>;
type ModelConfig = z.infer<typeof modelConfigSchema>;
interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
interface LLMResponse {
    content: string;
    raw: unknown;
}
interface Adapter {
    name: string;
    store(entry: MemoryEntry): Promise<void>;
    query(text: string, options?: QueryOptions): Promise<QueryResponse>;
    getRecent(n?: number): Promise<QueryResult[]>;
    getByTopic(topic: string, limit?: number): Promise<QueryResult[]>;
}
declare const rememConfigSchema: z.ZodObject<{
    storage: z.ZodDefault<z.ZodEnum<["sqlite", "postgres", "memory"]>>;
    storageConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    llm: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"bankr">;
        apiKey: z.ZodString;
        baseUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "bankr";
        apiKey: string;
        baseUrl?: string | undefined;
    }, {
        type: "bankr";
        apiKey: string;
        baseUrl?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"openai">;
        apiKey: z.ZodString;
        model: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        baseUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "openai";
        apiKey: string;
        model: string;
        baseUrl?: string | undefined;
    }, {
        type: "openai";
        apiKey: string;
        baseUrl?: string | undefined;
        model?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"anthropic">;
        apiKey: z.ZodString;
        model: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        baseUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "anthropic";
        apiKey: string;
        model: string;
        baseUrl?: string | undefined;
    }, {
        type: "anthropic";
        apiKey: string;
        baseUrl?: string | undefined;
        model?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"ollama">;
        baseUrl: z.ZodDefault<z.ZodString>;
        model: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "ollama";
        baseUrl: string;
        model: string;
    }, {
        type: "ollama";
        baseUrl?: string | undefined;
        model?: string | undefined;
    }>]>>;
    adapter: z.ZodOptional<z.ZodString>;
    dbPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    storage: "sqlite" | "postgres" | "memory";
    storageConfig?: Record<string, unknown> | undefined;
    llm?: {
        type: "bankr";
        apiKey: string;
        baseUrl?: string | undefined;
    } | {
        type: "openai";
        apiKey: string;
        model: string;
        baseUrl?: string | undefined;
    } | {
        type: "anthropic";
        apiKey: string;
        model: string;
        baseUrl?: string | undefined;
    } | {
        type: "ollama";
        baseUrl: string;
        model: string;
    } | undefined;
    adapter?: string | undefined;
    dbPath?: string | undefined;
}, {
    storage?: "sqlite" | "postgres" | "memory" | undefined;
    storageConfig?: Record<string, unknown> | undefined;
    llm?: {
        type: "bankr";
        apiKey: string;
        baseUrl?: string | undefined;
    } | {
        type: "openai";
        apiKey: string;
        baseUrl?: string | undefined;
        model?: string | undefined;
    } | {
        type: "anthropic";
        apiKey: string;
        baseUrl?: string | undefined;
        model?: string | undefined;
    } | {
        type: "ollama";
        baseUrl?: string | undefined;
        model?: string | undefined;
    } | undefined;
    adapter?: string | undefined;
    dbPath?: string | undefined;
}>;
type ReMEMConfig = z.infer<typeof rememConfigSchema>;
declare const eventTypeSchema: z.ZodEnum<["memory.stored", "memory.queried", "memory.accessed", "memory.forgotten", "snapshot.created", "snapshot.restored"]>;
type EventType = z.infer<typeof eventTypeSchema>;
declare const memoryEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["memory.stored", "memory.queried", "memory.accessed", "memory.forgotten", "snapshot.created", "snapshot.restored"]>;
    timestamp: z.ZodNumber;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "memory.stored" | "memory.queried" | "memory.accessed" | "memory.forgotten" | "snapshot.created" | "snapshot.restored";
    id: string;
    timestamp: number;
    payload: Record<string, unknown>;
}, {
    type: "memory.stored" | "memory.queried" | "memory.accessed" | "memory.forgotten" | "snapshot.created" | "snapshot.restored";
    id: string;
    timestamp: number;
    payload: Record<string, unknown>;
}>;
type MemoryEvent = z.infer<typeof memoryEventSchema>;

/**
 * ReMEM — MemoryStore
 * SQLite-backed persistent memory store with event sourcing
 * Uses sql.js (WebAssembly) for cross-platform SQLite without native compilation
 */

declare class MemoryStore {
    private db;
    private eventLog;
    private dbPath;
    private initialized;
    constructor(dbPath?: string);
    init(): Promise<void>;
    private initTables;
    private ensureInitialized;
    store(input: StoreMemoryInput): Promise<MemoryEntry>;
    get(id: string): Promise<MemoryEntry | null>;
    query(text: string, options?: QueryOptions): Promise<{
        results: QueryResult[];
        totalAvailable: number;
    }>;
    getRecent(n?: number): Promise<QueryResult[]>;
    getByTopic(topic: string, limit?: number): Promise<QueryResult[]>;
    forget(id: string): Promise<boolean>;
    getEventLog(limit?: number): MemoryEvent[];
    persist(): void;
    close(): void;
    private logEvent;
    private rowToObject;
    private simpleRelevance;
}

/**
 * ReMEM — Model Abstraction
 * Unified LLM interface supporting Bankr, OpenAI, Anthropic, Ollama
 */

declare class ModelAbstraction {
    private client;
    constructor(config: ModelConfig);
    private createClient;
    chat(messages: LLMMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<LLMResponse>;
    name(): string;
}

/**
 * ReMEM — Query Engine
 * RLM-style REPL for navigating memory programmatically
 */

interface QueryEngineConfig {
    store: MemoryStore;
    model?: ModelAbstraction;
    systemPrompt?: string;
}
declare class QueryEngine {
    private _store;
    private model?;
    private systemPrompt;
    constructor(config: QueryEngineConfig);
    /**
     * Query memory using natural language.
     * If a model is configured, uses LLM-assisted query decomposition.
     * Otherwise falls back to direct keyword search.
     */
    query(query: string, options?: QueryOptions): Promise<QueryResponse>;
    /**
     * Direct keyword-based query (no LLM).
     */
    private queryDirect;
    /**
     * LLM-assisted query decomposition.
     * The model analyzes the query and generates optimized search terms.
     */
    private queryWithLLM;
    /**
     * Ask the LLM to rerank results by relevance to the query.
     */
    private rerankResults;
    /**
     * Store a new memory entry.
     */
    store(input: StoreMemoryInput): Promise<void>;
    /**
     * Get recent memory entries.
     */
    getRecent(n?: number): Promise<QueryResult[]>;
    /**
     * Get entries by topic.
     */
    getByTopic(topic: string, limit?: number): Promise<QueryResult[]>;
    /**
     * Recursive query — the RLM-style loop.
     * Keep refining until the answer is complete.
     */
    recursiveQuery(initialQuery: string, maxDepth?: number): Promise<{
        answer: string;
        memories: QueryResult[];
    }>;
}

/**
 * ReMEM — Main Entry Point
 * Recursive Memory for AI Agents
 */

/**
 * ReMEM — RLM-Style Memory System
 *
 * @example
 * const memory = new ReMEM({
 *   storage: 'sqlite',
 *   llm: { type: 'bankr', apiKey: process.env.BANKR_API_KEY },
 * });
 *
 * await memory.init();
 * await memory.store({ content: "User prefers dark mode", topics: ['preferences'] });
 * const results = await memory.query("What UI preferences?");
 */
declare class ReMEM {
    private _store;
    private model?;
    private engine;
    constructor(config: ReMEMConfig);
    /**
     * Initialize the memory store. Must be called before use.
     */
    init(): Promise<void>;
    /**
     * Store a new memory entry.
     */
    store(input: StoreMemoryInput): Promise<void>;
    /**
     * Query memory using natural language.
     */
    query(query: string, options?: QueryOptions): Promise<QueryResponse>;
    /**
     * Get recent memory entries.
     */
    getRecent(n?: number): Promise<QueryResult[]>;
    /**
     * Get entries by topic.
     */
    getByTopic(topic: string, limit?: number): Promise<QueryResult[]>;
    /**
     * Recursive query — RLM-style iterative refinement.
     */
    recursiveQuery(initialQuery: string, maxDepth?: number): Promise<{
        answer: string;
        memories: QueryResult[];
    }>;
    /**
     * Get the underlying MemoryStore for advanced operations.
     */
    getStore(): MemoryStore;
    /**
     * Get the model name if configured.
     */
    getModelName(): string | undefined;
    /**
     * Close the memory store and release resources.
     */
    close(): void;
}

export { type Adapter, type EventType, type LLMMessage, type LLMResponse, type MemoryEntry, type MemoryEvent, MemoryStore, ModelAbstraction, type ModelConfig, QueryEngine, type QueryOptions, type QueryResponse, type QueryResult, ReMEM, type ReMEMConfig, type StoreMemoryInput, eventTypeSchema, memoryEntrySchema, memoryEventSchema, modelConfigSchema, queryOptionsSchema, queryResponseSchema, queryResultSchema, rememConfigSchema, storeMemoryInputSchema };
