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
    id: string;
    content: string;
    topics: string[];
    metadata: Record<string, unknown>;
    createdAt: number;
    accessedAt: number;
    accessCount: number;
}, {
    id: string;
    content: string;
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
    id: string;
    content: string;
    topics: string[];
    createdAt: number;
    accessedAt: number;
    accessCount: number;
    relevanceScore?: number | undefined;
}, {
    id: string;
    content: string;
    topics: string[];
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
        id: string;
        content: string;
        topics: string[];
        createdAt: number;
        accessedAt: number;
        accessCount: number;
        relevanceScore?: number | undefined;
    }, {
        id: string;
        content: string;
        topics: string[];
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
        id: string;
        content: string;
        topics: string[];
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
        id: string;
        content: string;
        topics: string[];
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
declare const embeddingConfigSchema: z.ZodObject<{
    /** Enable vector embeddings for semantic search (default: false) */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Ollama base URL (e.g. http://192.168.68.73:11434) */
    baseUrl: z.ZodDefault<z.ZodString>;
    /** Embedding model to use (e.g. 'nomic-embed-text', 'mxbai-embed-large') */
    model: z.ZodDefault<z.ZodString>;
    /** Embedding dimension (auto-detected on first embed if not set) */
    dimension: z.ZodOptional<z.ZodNumber>;
    /** Whether to generate embeddings async in background (non-blocking store) */
    asyncEmbed: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    model: string;
    enabled: boolean;
    asyncEmbed: boolean;
    dimension?: number | undefined;
}, {
    baseUrl?: string | undefined;
    model?: string | undefined;
    enabled?: boolean | undefined;
    dimension?: number | undefined;
    asyncEmbed?: boolean | undefined;
}>;
type EmbeddingConfig$1 = z.infer<typeof embeddingConfigSchema>;
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
    embeddings: z.ZodOptional<z.ZodObject<{
        /** Enable vector embeddings for semantic search (default: false) */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /** Ollama base URL (e.g. http://192.168.68.73:11434) */
        baseUrl: z.ZodDefault<z.ZodString>;
        /** Embedding model to use (e.g. 'nomic-embed-text', 'mxbai-embed-large') */
        model: z.ZodDefault<z.ZodString>;
        /** Embedding dimension (auto-detected on first embed if not set) */
        dimension: z.ZodOptional<z.ZodNumber>;
        /** Whether to generate embeddings async in background (non-blocking store) */
        asyncEmbed: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        model: string;
        enabled: boolean;
        asyncEmbed: boolean;
        dimension?: number | undefined;
    }, {
        baseUrl?: string | undefined;
        model?: string | undefined;
        enabled?: boolean | undefined;
        dimension?: number | undefined;
        asyncEmbed?: boolean | undefined;
    }>>;
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
    embeddings?: {
        baseUrl: string;
        model: string;
        enabled: boolean;
        asyncEmbed: boolean;
        dimension?: number | undefined;
    } | undefined;
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
    embeddings?: {
        baseUrl?: string | undefined;
        model?: string | undefined;
        enabled?: boolean | undefined;
        dimension?: number | undefined;
        asyncEmbed?: boolean | undefined;
    } | undefined;
}>;
type ReMEMConfig = z.infer<typeof rememConfigSchema>;
declare const eventTypeSchema: z.ZodEnum<["memory.stored", "memory.queried", "memory.accessed", "memory.forgotten", "memory.superseded", "snapshot.created", "snapshot.restored", "identity.constitution_updated", "identity.drift_detected", "identity.drift_correction_injected"]>;
type EventType = z.infer<typeof eventTypeSchema>;
declare const memoryEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["memory.stored", "memory.queried", "memory.accessed", "memory.forgotten", "memory.superseded", "snapshot.created", "snapshot.restored", "identity.constitution_updated", "identity.drift_detected", "identity.drift_correction_injected"]>;
    timestamp: z.ZodNumber;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "memory.stored" | "memory.queried" | "memory.accessed" | "memory.forgotten" | "memory.superseded" | "snapshot.created" | "snapshot.restored" | "identity.constitution_updated" | "identity.drift_detected" | "identity.drift_correction_injected";
    id: string;
    timestamp: number;
    payload: Record<string, unknown>;
}, {
    type: "memory.stored" | "memory.queried" | "memory.accessed" | "memory.forgotten" | "memory.superseded" | "snapshot.created" | "snapshot.restored" | "identity.constitution_updated" | "identity.drift_detected" | "identity.drift_correction_injected";
    id: string;
    timestamp: number;
    payload: Record<string, unknown>;
}>;
type MemoryEvent = z.infer<typeof memoryEventSchema>;
declare const identityCategorySchema: z.ZodEnum<["values", "boundaries", "preferences", "goals"]>;
type IdentityCategory = z.infer<typeof identityCategorySchema>;
declare const constitutionStatementSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    category: z.ZodEnum<["values", "boundaries", "preferences", "goals"]>;
    weight: z.ZodDefault<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: number;
    text: string;
    category: "values" | "boundaries" | "preferences" | "goals";
    weight: number;
    source?: string | undefined;
}, {
    id: string;
    createdAt: number;
    text: string;
    category: "values" | "boundaries" | "preferences" | "goals";
    weight?: number | undefined;
    source?: string | undefined;
}>;
type ConstitutionStatement = z.infer<typeof constitutionStatementSchema>;
declare const constitutionSchema: z.ZodObject<{
    statements: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        category: z.ZodEnum<["values", "boundaries", "preferences", "goals"]>;
        weight: z.ZodDefault<z.ZodNumber>;
        source: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: number;
        text: string;
        category: "values" | "boundaries" | "preferences" | "goals";
        weight: number;
        source?: string | undefined;
    }, {
        id: string;
        createdAt: number;
        text: string;
        category: "values" | "boundaries" | "preferences" | "goals";
        weight?: number | undefined;
        source?: string | undefined;
    }>, "many">;
    version: z.ZodDefault<z.ZodString>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: number;
    statements: {
        id: string;
        createdAt: number;
        text: string;
        category: "values" | "boundaries" | "preferences" | "goals";
        weight: number;
        source?: string | undefined;
    }[];
    version: string;
    updatedAt: number;
}, {
    createdAt: number;
    statements: {
        id: string;
        createdAt: number;
        text: string;
        category: "values" | "boundaries" | "preferences" | "goals";
        weight?: number | undefined;
        source?: string | undefined;
    }[];
    updatedAt: number;
    version?: string | undefined;
}>;
type Constitution = z.infer<typeof constitutionSchema>;
declare const driftResultSchema: z.ZodObject<{
    score: z.ZodNumber;
    level: z.ZodEnum<["aligned", "minor", "moderate", "critical"]>;
    violatingStatements: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        category: z.ZodEnum<["values", "boundaries", "preferences", "goals"]>;
        weight: z.ZodDefault<z.ZodNumber>;
        source: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: number;
        text: string;
        category: "values" | "boundaries" | "preferences" | "goals";
        weight: number;
        source?: string | undefined;
    }, {
        id: string;
        createdAt: number;
        text: string;
        category: "values" | "boundaries" | "preferences" | "goals";
        weight?: number | undefined;
        source?: string | undefined;
    }>, "many">;
    reasoning: z.ZodString;
    detectedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    score: number;
    level: "aligned" | "minor" | "moderate" | "critical";
    violatingStatements: {
        id: string;
        createdAt: number;
        text: string;
        category: "values" | "boundaries" | "preferences" | "goals";
        weight: number;
        source?: string | undefined;
    }[];
    reasoning: string;
    detectedAt: number;
}, {
    score: number;
    level: "aligned" | "minor" | "moderate" | "critical";
    violatingStatements: {
        id: string;
        createdAt: number;
        text: string;
        category: "values" | "boundaries" | "preferences" | "goals";
        weight?: number | undefined;
        source?: string | undefined;
    }[];
    reasoning: string;
    detectedAt: number;
}>;
type DriftResult = z.infer<typeof driftResultSchema>;
declare const identityConfigSchema: z.ZodObject<{
    constitution: z.ZodOptional<z.ZodObject<{
        statements: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
            category: z.ZodEnum<["values", "boundaries", "preferences", "goals"]>;
            weight: z.ZodDefault<z.ZodNumber>;
            source: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight: number;
            source?: string | undefined;
        }, {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight?: number | undefined;
            source?: string | undefined;
        }>, "many">;
        version: z.ZodDefault<z.ZodString>;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        createdAt: number;
        statements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight: number;
            source?: string | undefined;
        }[];
        version: string;
        updatedAt: number;
    }, {
        createdAt: number;
        statements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight?: number | undefined;
            source?: string | undefined;
        }[];
        updatedAt: number;
        version?: string | undefined;
    }>>;
    driftThreshold: z.ZodDefault<z.ZodNumber>;
    criticalThreshold: z.ZodDefault<z.ZodNumber>;
    autoInject: z.ZodDefault<z.ZodBoolean>;
    evalModel: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
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
}, "strip", z.ZodTypeAny, {
    driftThreshold: number;
    criticalThreshold: number;
    autoInject: boolean;
    constitution?: {
        createdAt: number;
        statements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight: number;
            source?: string | undefined;
        }[];
        version: string;
        updatedAt: number;
    } | undefined;
    evalModel?: {
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
}, {
    constitution?: {
        createdAt: number;
        statements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight?: number | undefined;
            source?: string | undefined;
        }[];
        updatedAt: number;
        version?: string | undefined;
    } | undefined;
    driftThreshold?: number | undefined;
    criticalThreshold?: number | undefined;
    autoInject?: boolean | undefined;
    evalModel?: {
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
}>;
type IdentityConfig = z.infer<typeof identityConfigSchema>;
declare const memoryLayerSchema: z.ZodEnum<["episodic", "semantic", "identity", "procedural"]>;
type MemoryLayer = z.infer<typeof memoryLayerSchema>;
declare const layerConfigSchema: z.ZodObject<{
    episodic: z.ZodObject<{
        ttlMs: z.ZodDefault<z.ZodNumber>;
        maxEntries: z.ZodDefault<z.ZodNumber>;
        weight: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        weight: number;
        ttlMs: number;
        maxEntries: number;
    }, {
        weight?: number | undefined;
        ttlMs?: number | undefined;
        maxEntries?: number | undefined;
    }>;
    semantic: z.ZodObject<{
        ttlMs: z.ZodDefault<z.ZodNumber>;
        maxEntries: z.ZodDefault<z.ZodNumber>;
        weight: z.ZodDefault<z.ZodNumber>;
        selfEdit: z.ZodDefault<z.ZodBoolean>;
        temporalValidity: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        weight: number;
        ttlMs: number;
        maxEntries: number;
        selfEdit: boolean;
        temporalValidity: boolean;
    }, {
        weight?: number | undefined;
        ttlMs?: number | undefined;
        maxEntries?: number | undefined;
        selfEdit?: boolean | undefined;
        temporalValidity?: boolean | undefined;
    }>;
    identity: z.ZodObject<{
        ttlMs: z.ZodDefault<z.ZodNumber>;
        maxEntries: z.ZodDefault<z.ZodNumber>;
        weight: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        weight: number;
        ttlMs: number;
        maxEntries: number;
    }, {
        weight?: number | undefined;
        ttlMs?: number | undefined;
        maxEntries?: number | undefined;
    }>;
    procedural: z.ZodObject<{
        ttlMs: z.ZodDefault<z.ZodNumber>;
        maxEntries: z.ZodDefault<z.ZodNumber>;
        weight: z.ZodDefault<z.ZodNumber>;
        trigger: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        weight: number;
        ttlMs: number;
        maxEntries: number;
        trigger?: string | undefined;
    }, {
        weight?: number | undefined;
        ttlMs?: number | undefined;
        maxEntries?: number | undefined;
        trigger?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    episodic: {
        weight: number;
        ttlMs: number;
        maxEntries: number;
    };
    semantic: {
        weight: number;
        ttlMs: number;
        maxEntries: number;
        selfEdit: boolean;
        temporalValidity: boolean;
    };
    identity: {
        weight: number;
        ttlMs: number;
        maxEntries: number;
    };
    procedural: {
        weight: number;
        ttlMs: number;
        maxEntries: number;
        trigger?: string | undefined;
    };
}, {
    episodic: {
        weight?: number | undefined;
        ttlMs?: number | undefined;
        maxEntries?: number | undefined;
    };
    semantic: {
        weight?: number | undefined;
        ttlMs?: number | undefined;
        maxEntries?: number | undefined;
        selfEdit?: boolean | undefined;
        temporalValidity?: boolean | undefined;
    };
    identity: {
        weight?: number | undefined;
        ttlMs?: number | undefined;
        maxEntries?: number | undefined;
    };
    procedural: {
        weight?: number | undefined;
        ttlMs?: number | undefined;
        maxEntries?: number | undefined;
        trigger?: string | undefined;
    };
}>;
type LayerConfig = z.infer<typeof layerConfigSchema>;
declare const layeredMemoryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    topics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodNumber;
    accessedAt: z.ZodNumber;
    accessCount: z.ZodDefault<z.ZodNumber>;
} & {
    layer: z.ZodDefault<z.ZodEnum<["episodic", "semantic", "identity", "procedural"]>>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    importance: z.ZodDefault<z.ZodNumber>;
    validFrom: z.ZodOptional<z.ZodNumber>;
    validUntil: z.ZodOptional<z.ZodNumber>;
    supersedes: z.ZodOptional<z.ZodString>;
    supersededBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    content: string;
    topics: string[];
    metadata: Record<string, unknown>;
    createdAt: number;
    accessedAt: number;
    accessCount: number;
    layer: "episodic" | "semantic" | "identity" | "procedural";
    importance: number;
    expiresAt?: number | undefined;
    validFrom?: number | undefined;
    validUntil?: number | undefined;
    supersedes?: string | undefined;
    supersededBy?: string | undefined;
}, {
    id: string;
    content: string;
    createdAt: number;
    accessedAt: number;
    topics?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    accessCount?: number | undefined;
    layer?: "episodic" | "semantic" | "identity" | "procedural" | undefined;
    expiresAt?: number | undefined;
    importance?: number | undefined;
    validFrom?: number | undefined;
    validUntil?: number | undefined;
    supersedes?: string | undefined;
    supersededBy?: string | undefined;
}>;
type LayeredMemoryEntry = z.infer<typeof layeredMemoryEntrySchema>;
declare const driftEventSchema: z.ZodObject<{
    driftResult: z.ZodObject<{
        score: z.ZodNumber;
        level: z.ZodEnum<["aligned", "minor", "moderate", "critical"]>;
        violatingStatements: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
            category: z.ZodEnum<["values", "boundaries", "preferences", "goals"]>;
            weight: z.ZodDefault<z.ZodNumber>;
            source: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight: number;
            source?: string | undefined;
        }, {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight?: number | undefined;
            source?: string | undefined;
        }>, "many">;
        reasoning: z.ZodString;
        detectedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        score: number;
        level: "aligned" | "minor" | "moderate" | "critical";
        violatingStatements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight: number;
            source?: string | undefined;
        }[];
        reasoning: string;
        detectedAt: number;
    }, {
        score: number;
        level: "aligned" | "minor" | "moderate" | "critical";
        violatingStatements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight?: number | undefined;
            source?: string | undefined;
        }[];
        reasoning: string;
        detectedAt: number;
    }>;
    correctionInjected: z.ZodDefault<z.ZodBoolean>;
    correctionText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    driftResult: {
        score: number;
        level: "aligned" | "minor" | "moderate" | "critical";
        violatingStatements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight: number;
            source?: string | undefined;
        }[];
        reasoning: string;
        detectedAt: number;
    };
    correctionInjected: boolean;
    correctionText?: string | undefined;
}, {
    driftResult: {
        score: number;
        level: "aligned" | "minor" | "moderate" | "critical";
        violatingStatements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight?: number | undefined;
            source?: string | undefined;
        }[];
        reasoning: string;
        detectedAt: number;
    };
    correctionInjected?: boolean | undefined;
    correctionText?: string | undefined;
}>;
type DriftEvent = z.infer<typeof driftEventSchema>;
declare const identityPackageSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    agentId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    exportedAt: z.ZodNumber;
    constitution: z.ZodObject<{
        statements: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
            category: z.ZodEnum<["values", "boundaries", "preferences", "goals"]>;
            weight: z.ZodDefault<z.ZodNumber>;
            source: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight: number;
            source?: string | undefined;
        }, {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight?: number | undefined;
            source?: string | undefined;
        }>, "many">;
        version: z.ZodDefault<z.ZodString>;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        createdAt: number;
        statements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight: number;
            source?: string | undefined;
        }[];
        version: string;
        updatedAt: number;
    }, {
        createdAt: number;
        statements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight?: number | undefined;
            source?: string | undefined;
        }[];
        updatedAt: number;
        version?: string | undefined;
    }>;
    memories: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        topics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        createdAt: z.ZodNumber;
        accessedAt: z.ZodNumber;
        accessCount: z.ZodDefault<z.ZodNumber>;
    } & {
        layer: z.ZodDefault<z.ZodEnum<["episodic", "semantic", "identity", "procedural"]>>;
        expiresAt: z.ZodOptional<z.ZodNumber>;
        importance: z.ZodDefault<z.ZodNumber>;
        validFrom: z.ZodOptional<z.ZodNumber>;
        validUntil: z.ZodOptional<z.ZodNumber>;
        supersedes: z.ZodOptional<z.ZodString>;
        supersededBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content: string;
        topics: string[];
        metadata: Record<string, unknown>;
        createdAt: number;
        accessedAt: number;
        accessCount: number;
        layer: "episodic" | "semantic" | "identity" | "procedural";
        importance: number;
        expiresAt?: number | undefined;
        validFrom?: number | undefined;
        validUntil?: number | undefined;
        supersedes?: string | undefined;
        supersededBy?: string | undefined;
    }, {
        id: string;
        content: string;
        createdAt: number;
        accessedAt: number;
        topics?: string[] | undefined;
        metadata?: Record<string, unknown> | undefined;
        accessCount?: number | undefined;
        layer?: "episodic" | "semantic" | "identity" | "procedural" | undefined;
        expiresAt?: number | undefined;
        importance?: number | undefined;
        validFrom?: number | undefined;
        validUntil?: number | undefined;
        supersedes?: string | undefined;
        supersededBy?: string | undefined;
    }>, "many">;
    soul: z.ZodOptional<z.ZodObject<{
        content: z.ZodString;
        source: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        source?: string | undefined;
    }, {
        content: string;
        source?: string | undefined;
    }>>;
    identity: z.ZodOptional<z.ZodObject<{
        content: z.ZodString;
        source: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        source?: string | undefined;
    }, {
        content: string;
        source?: string | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, unknown>;
    version: string;
    constitution: {
        createdAt: number;
        statements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight: number;
            source?: string | undefined;
        }[];
        version: string;
        updatedAt: number;
    };
    exportedAt: number;
    memories: {
        id: string;
        content: string;
        topics: string[];
        metadata: Record<string, unknown>;
        createdAt: number;
        accessedAt: number;
        accessCount: number;
        layer: "episodic" | "semantic" | "identity" | "procedural";
        importance: number;
        expiresAt?: number | undefined;
        validFrom?: number | undefined;
        validUntil?: number | undefined;
        supersedes?: string | undefined;
        supersededBy?: string | undefined;
    }[];
    agentId?: string | undefined;
    userId?: string | undefined;
    identity?: {
        content: string;
        source?: string | undefined;
    } | undefined;
    soul?: {
        content: string;
        source?: string | undefined;
    } | undefined;
}, {
    constitution: {
        createdAt: number;
        statements: {
            id: string;
            createdAt: number;
            text: string;
            category: "values" | "boundaries" | "preferences" | "goals";
            weight?: number | undefined;
            source?: string | undefined;
        }[];
        updatedAt: number;
        version?: string | undefined;
    };
    exportedAt: number;
    memories: {
        id: string;
        content: string;
        createdAt: number;
        accessedAt: number;
        topics?: string[] | undefined;
        metadata?: Record<string, unknown> | undefined;
        accessCount?: number | undefined;
        layer?: "episodic" | "semantic" | "identity" | "procedural" | undefined;
        expiresAt?: number | undefined;
        importance?: number | undefined;
        validFrom?: number | undefined;
        validUntil?: number | undefined;
        supersedes?: string | undefined;
        supersededBy?: string | undefined;
    }[];
    agentId?: string | undefined;
    userId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    identity?: {
        content: string;
        source?: string | undefined;
    } | undefined;
    version?: string | undefined;
    soul?: {
        content: string;
        source?: string | undefined;
    } | undefined;
}>;
type IdentityPackage = z.infer<typeof identityPackageSchema>;
declare const duplicationConfigSchema: z.ZodObject<{
    /** DARKSOL server URL (e.g. https://api.darksol.net) */
    serverUrl: z.ZodString;
    /** API key for the server */
    apiKey: z.ZodString;
    /** Include SOUL.md content in export */
    includeSoul: z.ZodDefault<z.ZodBoolean>;
    /** Include IDENTITY.md content in export */
    includeIdentity: z.ZodDefault<z.ZodBoolean>;
    /** Include all memory layers in export */
    includeAllLayers: z.ZodDefault<z.ZodBoolean>;
    /** Only include specific layers */
    layers: z.ZodOptional<z.ZodArray<z.ZodEnum<["episodic", "semantic", "identity", "procedural"]>, "many">>;
    /** Custom agent/user ID for scoping */
    agentId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    apiKey: string;
    serverUrl: string;
    includeSoul: boolean;
    includeIdentity: boolean;
    includeAllLayers: boolean;
    agentId?: string | undefined;
    userId?: string | undefined;
    layers?: ("episodic" | "semantic" | "identity" | "procedural")[] | undefined;
}, {
    apiKey: string;
    serverUrl: string;
    agentId?: string | undefined;
    userId?: string | undefined;
    includeSoul?: boolean | undefined;
    includeIdentity?: boolean | undefined;
    includeAllLayers?: boolean | undefined;
    layers?: ("episodic" | "semantic" | "identity" | "procedural")[] | undefined;
}>;
type DuplicationConfig = z.infer<typeof duplicationConfigSchema>;
declare const infectionConfigSchema: z.ZodObject<{
    /** DARKSOL server URL */
    serverUrl: z.ZodString;
    /** API key for the server */
    apiKey: z.ZodString;
    /** Source agent ID to infect FROM (optional — defaults to user\'s primary) */
    sourceAgentId: z.ZodOptional<z.ZodString>;
    /** Identity package version to pull (optional — defaults to latest) */
    version: z.ZodOptional<z.ZodString>;
    /** Auto-refresh interval in ms (0 = no auto-refresh) */
    refreshIntervalMs: z.ZodDefault<z.ZodNumber>;
    /** Layers to apply from the package */
    layers: z.ZodDefault<z.ZodArray<z.ZodEnum<["identity", "semantic", "procedural"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    apiKey: string;
    serverUrl: string;
    layers: ("semantic" | "identity" | "procedural")[];
    refreshIntervalMs: number;
    version?: string | undefined;
    sourceAgentId?: string | undefined;
}, {
    apiKey: string;
    serverUrl: string;
    version?: string | undefined;
    layers?: ("semantic" | "identity" | "procedural")[] | undefined;
    sourceAgentId?: string | undefined;
    refreshIntervalMs?: number | undefined;
}>;
type InfectionConfig = z.infer<typeof infectionConfigSchema>;
type DuplicateResult = {
    packageSizeBytes: number;
    memoryCount: number;
    constitutionStatements: number;
    exportedAt: number;
    serverUploadUrl?: string;
    serverUploadResponse?: unknown;
};
type InfectionResult = {
    packageVersion: string;
    statementsLoaded: number;
    memoriesLoaded: number;
    layersApplied: string[];
    infectedAt: number;
    liveConnection: boolean;
};

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

interface SnapshotMeta {
    id: string;
    label: string;
    createdAt: number;
    memoryCount: number;
    layerCounts: Record<MemoryLayer, number>;
    agentId: string | null;
    userId: string | null;
}
interface StoreMemoryOptions {
    agentId?: string;
    userId?: string;
}
declare class MemoryStore {
    private db;
    private eventLog;
    private dbPath;
    private initialized;
    constructor(dbPath?: string);
    init(): Promise<void>;
    private initTables;
    private ensureInitialized;
    store(input: StoreMemoryInput, opts?: StoreMemoryOptions): Promise<MemoryEntry>;
    get(id: string): Promise<MemoryEntry | null>;
    query(text: string, options?: QueryOptions): Promise<{
        results: QueryResult[];
        totalAvailable: number;
    }>;
    /**
     * Get all memory entries (no text filter, ignores limit).
     * Used internally by the duplication/export feature.
     */
    getAllEntries(): Promise<QueryResult[]>;
    getRecent(n?: number): Promise<QueryResult[]>;
    getByTopic(topic: string, limit?: number): Promise<QueryResult[]>;
    forget(id: string): Promise<boolean>;
    /**
     * Persist a LayerManager entry to SQLite.
     * This is what makes layers survive process restarts.
     */
    persistLayerEntry(entry: LayeredMemoryEntry, opts?: StoreMemoryOptions): Promise<void>;
    /**
     * Load all persisted layer entries from SQLite.
     * Called on ReMEM.init() to restore layer state.
     */
    loadAllLayerEntries(opts?: StoreMemoryOptions): Promise<LayeredMemoryEntry[]>;
    /**
     * Delete a layered memory entry.
     */
    forgetLayerEntry(id: string): Promise<boolean>;
    /**
     * Create a named snapshot of current memory state.
     * For long-running agents — take a snapshot before restarts or major operations.
     * @param label Human-readable label for this snapshot
     * @param opts Agent/user scope
     */
    createSnapshot(label: string, opts?: StoreMemoryOptions): Promise<SnapshotMeta>;
    /**
     * Restore from a snapshot by ID.
     * Overwrites current layer state with snapshot state.
     * @returns Number of entries restored
     */
    restoreSnapshot(snapshotId: string, opts?: StoreMemoryOptions): Promise<number>;
    /**
     * List available snapshots.
     */
    listSnapshots(opts?: StoreMemoryOptions): Promise<SnapshotMeta[]>;
    /**
     * Delete a snapshot.
     */
    deleteSnapshot(snapshotId: string): Promise<boolean>;
    /**
     * Store a vector embedding for a memory entry.
     * Called after MemoryStore.store() when embeddings are enabled.
     */
    storeEmbedding(memoryId: string, base64: string, dimension: number, model: string, type?: 'memory' | 'layered'): Promise<void>;
    /**
     * Get embedding for a memory entry.
     */
    getEmbedding(memoryId: string): Promise<{
        base64: string;
        dimension: number;
    } | null>;
    /**
     * Delete embedding for a memory entry.
     */
    deleteEmbedding(memoryId: string): Promise<void>;
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
    semanticQuery(queryText: string, queryVector: number[] | null, opts?: QueryOptions): Promise<{
        results: QueryResult[];
        totalAvailable: number;
    }>;
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
    config: ModelConfig;
    constructor(config: ModelConfig);
    private createClient;
    chat(messages: LLMMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<LLMResponse>;
    name(): string;
}

/**
 * ReMEM — Embedding Service
 * Generates and stores vector embeddings for semantic memory search.
 *
 * Uses Ollama's /api/embeddings endpoint (or any compatible OpenAI-style embeddings API).
 * Stores embeddings in SQLite as base64-encoded float32 arrays.
 *
 * v0.3.2: Added for semantic search — cosine similarity replaces keyword-only matching.
 */
interface EmbeddingConfig {
    /** Ollama base URL (e.g. http://192.168.68.73:11434) */
    baseUrl: string;
    /** Model to use for embeddings (e.g. 'nomic-embed-text', 'mxbai-embed-large') */
    model: string;
    /** Dimension of the embedding vectors (auto-detected on first run, or set explicitly) */
    dimension?: number;
}
interface EmbeddingVector {
    id: string;
    memoryId: string;
    vector: number[];
    base64: string;
    model: string;
    createdAt: number;
}
declare class EmbeddingService {
    private config;
    private detectedDimension;
    private httpFetch;
    constructor(config: EmbeddingConfig, httpFetch?: typeof fetch);
    get baseUrl(): string;
    get model(): string;
    get isConfigured(): boolean;
    /**
     * Generate embedding for a single text.
     * Uses Ollama's /api/embeddings endpoint.
     */
    embed(text: string): Promise<number[]>;
    /**
     * Generate embeddings for multiple texts in batch.
     * Calls embed() sequentially — Ollama doesn't have a batch endpoint.
     */
    embedBatch(texts: string[], signal?: AbortSignal): Promise<number[][]>;
    /**
     * Encode a float32 vector to base64url.
     * Uses Buffer.from with a Uint8Array view of the Float32Array buffer.
     */
    static encodeVector(vec: number[]): string;
    /**
     * Decode a base64url string back to a float32 vector.
     */
    static decodeVector(base64: string, dimension: number): number[];
    /**
     * Compute cosine similarity between two vectors.
     * Returns a value between -1 (opposite) and 1 (identical).
     */
    static cosineSimilarity(a: number[], b: number[]): number;
    /**
     * Generate and package an embedding vector for storage.
     */
    generateEmbedding(memoryId: string, text: string): Promise<EmbeddingVector>;
}

/**
 * ReMEM — Hierarchical Memory Layers
 * Episodic / Semantic / Identity / Procedural
 * with TTL-based eviction, weighted retrieval, temporal validity, self-edit,
 * episodic compression, and semantic embedding-based scoring.
 */

declare const DEFAULT_LAYER_CONFIG: Required<LayerConfig>;
interface SupersessionResult {
    superseded: boolean;
    supersededEntryId?: string;
    newEntry?: LayeredMemoryEntry;
    reason?: string;
}
declare class LayerManager {
    private entries;
    private config;
    private embeddingService;
    private entryEmbeddings;
    constructor(config?: Partial<LayerConfig>, embeddingService?: EmbeddingService | null);
    /**
     * Store an entry in the appropriate layer.
     * If layer is not specified, auto-assigns based on topics and content.
     * For semantic layer with selfEdit=true, detects contradictions and auto-supersedes.
     */
    store(input: StoreMemoryInput, layer?: MemoryLayer): LayeredMemoryEntry;
    /**
     * Check if new input should supersede an existing semantic entry.
     * Detects contradictions by keyword negation patterns.
     */
    private checkSupersession;
    /**
     * Store a procedural memory — a triggered behavior/rule.
     * trigger: keyword/pattern that fires this rule
     * condition: when this text appears in context
     * action: what to do when triggered
     */
    storeProcedural(input: StoreMemoryInput, trigger: string): LayeredMemoryEntry;
    /**
     * Fire procedural rules matching the given context text.
     * Returns rules whose trigger keyword appears in the context.
     */
    fireProcedural(context: string): LayeredMemoryEntry[];
    /**
     * Get an entry by ID.
     */
    get(id: string): LayeredMemoryEntry | null;
    /**
     * Get all entries across all layers.
     * Used for duplication/export — returns all non-expired entries.
     */
    getAllEntries(): LayeredMemoryEntry[];
    /**
     * Query across all layers with weighted retrieval.
     * Entries from higher-weight layers rank higher, but content match still matters.
     * When EmbeddingService is set, uses hybrid scoring: 40% keyword + 60% cosine similarity.
     */
    query(text: string, options?: QueryOptions & {
        layers?: MemoryLayer[];
    }): Promise<{
        results: QueryResult[];
        totalAvailable: number;
        layerBreakdown: Record<MemoryLayer, number>;
    }>;
    /**
     * Get recent entries across all layers.
     */
    getRecent(n?: number, layers?: MemoryLayer[]): QueryResult[];
    /**
     * Get entries by topic across all layers.
     */
    getByTopic(topic: string, limit?: number): QueryResult[];
    /**
     * Store a pre-computed embedding vector for an entry.
     * Enables semantic similarity scoring in queries.
     */
    setEntryEmbedding(id: string, vector: number[]): void;
    /**
     * Forget an entry.
     */
    forget(id: string): boolean;
    /**
     * Restore a LayeredMemoryEntry directly into the store.
     * Used by ReMEM.init() to restore persisted layer entries from SQLite.
     * Does NOT re-assign layer — uses the entry's existing layer field.
     */
    restoreEntry(entry: LayeredMemoryEntry): void;
    /**
     * Evict entries from a specific layer if over maxEntries.
     * Evicts oldest accessed entries first.
     */
    private evictIfNeeded;
    /**
     * Run TTL-based eviction. Call periodically (e.g., on init or query).
     */
    evictExpired(): number;
    /**
     * Get entries eligible for compression — oldest episodic entries.
     * These will be LLM-compressed into a semantic summary before eviction.
     * @param count Number of entries to return for compression
     */
    getEntriesForCompression(count?: number): LayeredMemoryEntry[];
    /**
     * Compress episodic entries into a semantic summary.
     * Creates a new semantic layer entry that summarizes the episodic content.
     * Returns the new semantic entry ID, or null if compression not applicable.
     */
    compressToSemantic(episodicEntries: LayeredMemoryEntry[], model: {
        chat(messages: Array<{
            role: string;
            content: string;
        }>, opts?: {
            temperature?: number;
            maxTokens?: number;
        }): Promise<{
            content: string;
        }>;
    }): Promise<{
        compressedEntry: LayeredMemoryEntry;
        entriesEvicted: number;
    } | null>;
    /**
     * Auto-assign layer based on content analysis.
     */
    private autoAssignLayer;
    /**
     * Check if episodic layer is above 80% capacity and needs compression.
     */
    needsEpisodicCompression(): boolean;
    /**
     * Get stats for each layer.
     */
    getStats(): Record<MemoryLayer, {
        count: number;
        maxEntries: number;
        ttlMs: number;
        weight: number;
    }>;
    private simpleRelevance;
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
 * ReMEM — RLM-Style Memory REPL
 * Recursive Language Model loop for navigating memory programmatically.
 *
 * RLM Core Insight (from "Recursive Language Models"):
 * Treat the memory store as an external environment. Instead of retrieving
 * and truncating (losing detail), let the model write code to navigate it.
 *
 * The model never sees all memory at once — only constant-size metadata
 * about the store structure and what it's already observed. This enables
 * arbitrarily large memory stores without context window overflow.
 *
 * Design:
 * - Root model call: receives query + environment metadata (constant size)
 * - Model generates JavaScript to navigate: query layers, get chunks, recurse
 * - Executor runs the JS safely (Function constructor, not eval)
 * - Next iteration: model sees only what it observed, decides next action
 * - Loop until model returns __done or maxDepth reached
 */

type MemoryAction = {
    action: 'observe';
    data: unknown;
} | {
    action: 'done';
    answer: string;
};
interface REPLObservation {
    iteration: number;
    code: string;
    result: unknown;
    action: MemoryAction;
}
interface MemoryREPLOptions {
    /** Memory store for actual operations */
    store: MemoryStore;
    /** Layer manager (optional — enables layer-aware navigation) */
    layers?: LayerManager;
    /** LLM for the REPL loop */
    model?: ModelAbstraction;
    /** Max recursion depth (default: 5) */
    maxDepth?: number;
    /** Max entries to return in final answer (default: 20) */
    maxResults?: number;
    /** Custom system prompt for the REPL model */
    systemPrompt?: string;
}
declare class MemoryREPL {
    private store;
    private layers?;
    private model?;
    private maxDepth;
    private maxResults;
    private systemPrompt;
    constructor(options: MemoryREPLOptions);
    /**
     * Navigate memory using the RLM loop.
     * Model writes JS to explore, executor runs it, results feed back into next iteration.
     */
    navigate(query: string): Promise<{
        answer: string;
        observations: REPLObservation[];
    }>;
    /**
     * Build constant-size metadata about the store environment.
     * This is what the RLM paper calls the "screen" — fixed size regardless of memory size.
     */
    private buildEnvironmentMetadata;
    /**
     * Extract executable JavaScript code from the model's response.
     * Looks for the first { ... } object containing mem.* calls.
     */
    private extractCode;
    /**
     * Execute model-generated code safely.
     * Uses Function constructor — no eval, no require, no Node.js globals.
     * Only exposes the safe memory API.
     */
    private executeCode;
    /**
     * Build the safe memory API exposed to model-generated code.
     * Only exposes query/retrieve operations — no mutation, no system access.
     */
    private buildMemoryAPI;
    /**
     * Format observation result for display to the model in next iteration.
     */
    private formatObservation;
}

/**
 * ReMEM — HTTP Adapter
 * Framework-agnostic HTTP interface for remote memory access
 */

interface HttpAdapterConfig {
    port?: number;
    host?: string;
    store: MemoryStore;
    model?: ModelAbstraction;
    /** Optional bearer token required for all non-OPTIONS requests. */
    authToken?: string;
    /** CORS origin. Defaults to localhost-only usage (no wildcard). */
    corsOrigin?: string;
    /** Max request body size in bytes. Default: 1MiB. */
    maxBodyBytes?: number;
}
declare class HttpAdapter {
    private server?;
    private engine;
    private store;
    private model?;
    private port;
    private host;
    private authToken?;
    private corsOrigin;
    private maxBodyBytes;
    constructor(config: HttpAdapterConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private handleRequest;
    private isAuthorized;
    private readBody;
}

/**
 * ReMEM — Memory Consolidation
 * Deduplication, merging, and conflict resolution across memory layers.
 *
 * v0.6.0: Memory consolidation
 * - Similarity-based deduplication: merge near-duplicate entries on store
 * - Cross-layer conflict resolution: contradiction detection + supersession
 * - Cross-layer promotion: frequently-accessed episodic entries promoted to semantic
 * - Periodic consolidation: full deduplication pass over all layers
 *
 * Usage:
 *   const consolidator = new MemoryConsolidator(remem, embeddingService);
 *   await consolidator.deduplicateLayer('semantic');
 *   await consolidator.promoteFrequentEpisodic();
 */

interface ConsolidationOptions {
    /** Cosine similarity threshold for deduplication (0-1). Default: 0.85 */
    similarityThreshold?: number;
    /** Minimum access count to trigger episodic promotion. Default: 5 */
    promotionAccessThreshold?: number;
    /** Run consolidation on every store() call. Default: false (manual only) */
    autoOnStore?: boolean;
    /** Merge strategy for near-duplicates */
    mergeStrategy?: 'newer_wins' | 'older_wins' | 'concatenate' | 'supersede';
}
interface ConsolidationResult {
    deduplicated: number;
    promoted: number;
    superseded: number;
    errors: string[];
}
interface SimilarityPair {
    entryA: LayeredMemoryEntry;
    entryB: LayeredMemoryEntry;
    similarity: number;
}
/**
 * MemoryConsolidator
 *
 * Handles:
 * 1. Deduplication — find and merge near-duplicate entries using embeddings
 * 2. Conflict resolution — detect contradictions, mark one as superseded
 * 3. Cross-layer promotion — promote frequently-accessed episodic entries to semantic
 * 4. Periodic full consolidation — run over all layers to clean up
 */
declare class MemoryConsolidator {
    private remem;
    private embeddingService;
    private options;
    constructor(remem: MemoryConsolidator['remem'], embeddingService?: EmbeddingService | null, options?: ConsolidationOptions);
    /**
     * Find all near-duplicate pairs in a layer.
     * Uses embedding cosine similarity when available, keyword fallback otherwise.
     */
    findSimilarPairs(layer: MemoryLayer): Promise<SimilarityPair[]>;
    /**
     * Compute similarity between two entries.
     * Uses embeddings when available, keyword Jaccard fallback.
     */
    computeSimilarity(a: LayeredMemoryEntry, b: LayeredMemoryEntry): Promise<number>;
    private getEntryEmbedding;
    private cosineSimilarity;
    private keywordSimilarity;
    /**
     * Merge two entries according to the configured merge strategy.
     * Returns the merged entry content + metadata.
     */
    merge(a: LayeredMemoryEntry, b: LayeredMemoryEntry): {
        content: string;
        topics: string[];
        metadata: Record<string, unknown>;
    };
    /**
     * Run deduplication over a specific layer.
     * Finds similar pairs, merges them, and deletes the merged entries.
     * @returns Number of entries deduplicated
     */
    deduplicateLayer(layer: MemoryLayer): Promise<ConsolidationResult>;
    /**
     * Detect contradictions between entries in the same layer.
     * Uses negation pattern matching to find conflicting statements.
     *
     * e.g., "User prefers dark mode" vs "User prefers light mode"
     */
    detectConflicts(layer: MemoryLayer): Promise<Array<{
        older: LayeredMemoryEntry;
        newer: LayeredMemoryEntry;
    }>>;
    /**
     * Resolve conflicts by marking older entries as superseded.
     * Keeps the newest (most recent) entry as authoritative.
     */
    resolveConflicts(layer: MemoryLayer): Promise<ConsolidationResult>;
    /**
     * Promote frequently-accessed episodic entries to semantic layer.
     * Entries with accessCount >= promotionAccessThreshold that are still in episodic
     * after 10 minutes get promoted to semantic layer (they're important enough to keep longer).
     */
    promoteFrequentEpisodic(): Promise<ConsolidationResult>;
    /**
     * Run full consolidation over all layers.
     * 1. Deduplicate each layer
     * 2. Resolve conflicts in semantic and identity layers
     * 3. Promote frequent episodic entries
     *
     * @param layers Layers to consolidate. Defaults to all.
     */
    consolidateAll(layers?: MemoryLayer[]): Promise<ConsolidationResult>;
}

/**
 * ReMEM — Episodic Capture Pipeline
 * Automatic event capture for the episodic memory layer.
 *
 * v0.5.0: Episodic capture pipeline
 * - Event buffering + batched writes to MemoryStore
 * - Importance scoring based on event type + content analysis
 * - Deduplication of rapid similar events
 * - Integration via EventSource adapters or direct capture()
 *
 * Usage:
 *   const pipeline = new EpisodicCapturePipeline(remem);
 *   pipeline.capture({ type: 'user.message', content: '...', metadata: {...} });
 *   pipeline.capture({ type: 'decision', content: 'Agreed to build X', metadata: { importance: 0.9 }});
 *   pipeline.start(); // start flush interval
 */

type CaptureEventType = 'agent.turn' | 'agent.response' | 'agent.tool_call' | 'agent.tool_result' | 'agent.error' | 'user.message' | 'user.feedback' | 'user.question' | 'memory.store' | 'memory.query' | 'memory.recall' | 'session.start' | 'session.end' | 'session.compaction' | 'decision' | 'learning' | 'goal.set' | 'goal.achieved' | 'identity.drift' | 'identity.correction';
interface CaptureEvent {
    id?: string;
    type: CaptureEventType;
    /** Human-readable content describing the event */
    content: string;
    /** Raw metadata about the event (sender, channel, model, tool name, etc.) */
    metadata?: Record<string, unknown>;
    /** Unix timestamp ms — defaults to Date.now() */
    timestamp?: number;
    /** Override auto-computed importance (0-1). Auto-computed if not set. */
    importanceOverride?: number;
    /** Skip deduplication for this event (e.g., decisions should never be deduped) */
    noDedup?: boolean;
}
interface CaptureOptions {
    /** Batch flush interval in ms (default: 1000) */
    flushIntervalMs?: number;
    /** Max events per batch before forced flush (default: 50) */
    maxBatchSize?: number;
    /** Deduplication window in ms — suppress events identical in type+content (default: 2000) */
    dedupWindowMs?: number;
    /** Store to a specific layer (default: 'episodic') */
    layer?: MemoryLayer;
}
declare class EpisodicCapturePipeline {
    private remem;
    private eventBuffer;
    private dedupSet;
    private flushIntervalMs;
    private maxBatchSize;
    private dedupWindowMs;
    private layer;
    private intervalHandle;
    private started;
    private eventCount;
    private droppedCount;
    constructor(remem: EpisodicCapturePipeline['remem'], options?: CaptureOptions);
    /**
     * Capture a single event into the episodic layer.
     * Events are buffered and flushed in batches.
     */
    capture(event: CaptureEvent): void;
    /**
     * Capture multiple events at once.
     */
    captureBatch(events: CaptureEvent[]): void;
    /**
     * Start the periodic flush interval.
     * Call once after registering event sources.
     */
    start(): void;
    /**
     * Stop the flush interval and flush remaining events.
     */
    stop(): void;
    /**
     * Flush the event buffer to MemoryStore.
     */
    flush(): Promise<void>;
    /**
     * Extract topics from event type and content.
     */
    private extractTopics;
    /**
     * Format an event into a human-readable episodic memory string.
     */
    private formatEvent;
    /**
     * Generate embedding for a stored entry (async, non-blocking).
     * Returns early if no embedding service available.
     */
    private generateEmbedding;
    /**
     * Get capture statistics.
     */
    getStats(): {
        eventCount: number;
        droppedCount: number;
        bufferSize: number;
        started: boolean;
    };
}

/**
 * ReMEM — Framework adapters
 * Lightweight, dependency-free adapters for common agent runtimes.
 */

interface ReMEMAdapterOptions {
    /** Default topic attached to memories stored through the adapter. */
    defaultTopic?: string;
    /** Default query limit when the caller does not provide one. */
    defaultLimit?: number;
}
/**
 * Vercel AI SDK-style helper.
 *
 * The AI SDK does not mandate one memory interface, so this adapter exposes
 * tiny primitives that fit neatly into middleware/tools: save messages,
 * remember arbitrary text, and recall relevant context.
 */
declare function createVercelAIAdapter(memory: ReMEM, options?: ReMEMAdapterOptions): {
    name: string;
    remember(input: string | StoreMemoryInput): Promise<void>;
    saveMessages(messages: unknown, metadata?: Record<string, unknown>): Promise<void>;
    recall(query: string, queryOptions?: QueryOptions): Promise<QueryResponse>;
    context(query: string, queryOptions?: QueryOptions): Promise<string>;
};
/**
 * LangGraph/LangChain-style BaseStore-ish adapter.
 *
 * Implements get/put/search/listNamespaces in a dependency-free structural shape
 * so it can be wrapped by LangGraph JS projects without pulling LangChain into
 * ReMEM itself.
 */
declare function createLangGraphStoreAdapter(memory: ReMEM, options?: ReMEMAdapterOptions): {
    name: string;
    put(namespace: string | string[], key: string, value: unknown): Promise<void>;
    search(namespace: string | string[], query: string, queryOptions?: QueryOptions): Promise<{
        namespace: string[];
        key: string;
        value: string;
        createdAt: number;
        updatedAt: number;
        score: number | undefined;
    }[]>;
    get(namespace: string | string[], key: string): Promise<{
        namespace: string[];
        key: string;
        value: string;
        createdAt: number;
        updatedAt: number;
    } | null>;
    listNamespaces(): Promise<string[][]>;
};
/**
 * OpenClaw/session adapter.
 * Stores user/assistant turns and recalls concise context blocks for prompts.
 */
declare function createOpenClawAdapter(memory: ReMEM, options?: ReMEMAdapterOptions): {
    name: string;
    rememberTurn(turn: {
        role: "user" | "assistant" | "system" | string;
        content: string;
        sessionId?: string;
        messageId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void>;
    recallContext(query: string, queryOptions?: QueryOptions): Promise<string>;
    query(query: string, queryOptions?: QueryOptions): Promise<QueryResponse>;
};

/**
 * ReMEM — Identity & Constitution
 * RLM-style identity layer with drift detection and constitution injection
 */

declare class ConstitutionManager {
    private constitution;
    private config;
    constructor(config?: Partial<IdentityConfig>);
    /**
     * Import statements from source text (e.g., SOUL.md, IDENTITY.md).
     * Parses the text and extracts identity statements by category.
     */
    importFromText(text: string, source: string): number;
    /**
     * Add a single statement manually.
     */
    addStatement(text: string, category: ConstitutionStatement['category'], weight?: number, source?: string): ConstitutionStatement;
    /**
     * Get all statements, optionally filtered by category.
     */
    getStatements(category?: ConstitutionStatement['category']): ConstitutionStatement[];
    /**
     * Get the full constitution.
     */
    getConstitution(): Constitution;
    /**
     * Serialize constitution for injection into LLM context.
     */
    toInjectionBlock(): string;
}
declare class DriftDetector {
    private constitution;
    private evalModel?;
    private threshold;
    private criticalThreshold;
    constructor(constitution: ConstitutionManager, config?: Partial<IdentityConfig>);
    /**
     * Detect drift using BOTH pattern matching and LLM self-evaluation.
     * Returns a DriftResult with score, level, and violating statements.
     */
    detectDrift(sessionText: string, options?: {
        method?: 'pattern' | 'llm' | 'both';
        confidenceThreshold?: number;
    }): Promise<DriftResult>;
    /**
     * Fast pattern-matching drift detection.
     * Checks for negation patterns, value contradictions, and boundary violations.
     */
    private detectPatternDrift;
    /**
     * LLM-based drift evaluation using self-check.
     * Asks the model: "Are you still aligned with these values?"
     */
    private detectLLMDrift;
}
declare class ConstitutionInjector {
    private constitution;
    private autoInject;
    constructor(constitution: ConstitutionManager, autoInject?: boolean);
    /**
     * Generate a constitution injection block for the current drift result.
     * Call this before sending messages to the LLM when drift is detected.
     */
    buildInjection(drift: DriftResult): string;
    /**
     * Get the auto-inject setting.
     */
    shouldAutoInject(): boolean;
    /**
     * Set the auto-inject setting.
     */
    setAutoInject(value: boolean): void;
}
interface IdentitySystem {
    constitution: ConstitutionManager;
    detector: DriftDetector;
    injector: ConstitutionInjector;
}
declare function createIdentitySystem(config?: IdentityConfig): IdentitySystem;

/**
 * ReMEM — Identity Duplication & Infection
 *
 * Duplication: Export the agent's memory, identity, and soul into a portable
 * identity package and upload to DARKSOL server.
 *
 * Infection: Pull an identity package from DARKSOL server and overlay it
 * on the local ReMEM instance (live connection required).
 *
 * v0.3.3
 */

/**
 * Build an identity package from the local ReMEM instance.
 * This does NOT upload — it only builds the package.
 * Use `uploadPackage()` to send to the server.
 */
declare function buildIdentityPackage(params: {
    store: MemoryStore;
    layers?: LayerManager;
    identity?: IdentitySystem;
    soulText?: string;
    identityText?: string;
    config: DuplicationConfig;
}): Promise<IdentityPackage>;
/**
 * Upload an identity package to the DARKSOL server.
 */
declare function uploadPackage(pkg: IdentityPackage, config: DuplicationConfig): Promise<{
    uploadUrl: string;
    response: unknown;
}>;
/**
 * Full duplication: build + upload identity package to DARKSOL server.
 * Returns upload confirmation details.
 */
declare function duplicate(params: {
    store: MemoryStore;
    layers?: LayerManager;
    identity?: IdentitySystem;
    soulText?: string;
    identityText?: string;
    config: DuplicationConfig;
}): Promise<DuplicateResult>;
/**
 * Download an identity package from the DARKSOL server.
 */
declare function downloadPackage(config: InfectionConfig): Promise<IdentityPackage>;
/**
 * Apply an identity package to the local ReMEM instance.
 * This injects the constitution statements into the identity system,
 * and optionally stores memories in the appropriate layers.
 */
declare function infect(params: {
    store: MemoryStore;
    layers?: LayerManager;
    identity?: IdentitySystem;
    pkg: IdentityPackage;
    config: InfectionConfig;
}): Promise<InfectionResult>;
/**
 * Pull + infect in one shot.
 * Downloads from server and applies the identity package locally.
 */
declare function infectFromServer(params: {
    store: MemoryStore;
    layers?: LayerManager;
    identity?: IdentitySystem;
    config: InfectionConfig;
}): Promise<InfectionResult>;

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
    private identity?;
    private layers?;
    private embeddingService?;
    private _embeddingEnabled;
    private _identityEnabled;
    private _layersEnabled;
    private _agentId?;
    private _userId?;
    constructor(config: ReMEMConfig);
    /**
     * Initialize the memory store. Must be called before use.
     * Also restores persisted layer state from SQLite if layers are enabled.
     */
    init(): Promise<void>;
    /**
     * Store a new memory entry.
     * If layers are enabled, also persists to the appropriate layer in SQLite.
     * If embeddings are enabled, generates a vector embedding in the background.
     */
    store(input: StoreMemoryInput): Promise<void>;
    /**
     * Query memory using natural language.
     * Uses semantic search (cosine similarity) when embeddings are enabled,
     * falls back to keyword + access_count scoring otherwise.
     */
    query(query: string, options?: QueryOptions): Promise<QueryResponse>;
    /**
     * Returns true if semantic embeddings are enabled and configured.
     */
    isEmbeddingEnabled(): boolean;
    /**
     * Returns the embedding service instance (if enabled).
     */
    getEmbeddingService(): EmbeddingService | undefined;
    /**
     * Get the layer manager for advanced layer/consolidation operations.
     */
    getLayerManager(): LayerManager | undefined;
    /**
     * Persist a layer entry. Exposed for advanced consolidation workflows.
     */
    persistLayerEntry(entry: LayeredMemoryEntry): Promise<void>;
    /**
     * Persist a vector embedding for a layered memory entry.
     */
    persistLayerEmbedding(entryId: string, vector: number[], model: string): Promise<void>;
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
    replNavigate(query: string): Promise<{
        answer: string;
        observations: unknown[];
    }>;
    /**
     * Enable identity layer with optional constitution import.
     */
    enableIdentity(config?: {
        constitutionTexts?: Array<{
            text: string;
            source: string;
        }>;
        autoInject?: boolean;
        evalModel?: ModelAbstraction['config'];
    }): void;
    /**
     * Add an identity statement.
     */
    addIdentityStatement(text: string, category: ConstitutionStatement['category'], weight?: number): ConstitutionStatement | null;
    /**
     * Import identity constitution from text (e.g., SOUL.md content).
     */
    importConstitution(text: string, source: string): number;
    /**
     * Detect identity drift in the current session context.
     */
    detectDrift(sessionText: string): Promise<DriftResult>;
    /**
     * Get constitution injection block if drift is detected.
     * Use this to prepend correction context to LLM messages.
     */
    getConstitutionInjection(drift: DriftResult): string;
    /**
     * Get all identity statements.
     */
    getIdentityStatements(category?: ConstitutionStatement['category']): ConstitutionStatement[];
    /**
     * Check if identity layer is enabled.
     */
    isIdentityEnabled(): boolean;
    /**
     * Enable hierarchical memory layers (episodic / semantic / identity).
     * Layers are persisted to SQLite — they survive process restarts.
     */
    enableLayers(config?: Partial<LayerConfig>): Promise<void>;
    /**
     * Store in a specific layer.
     */
    storeInLayer(input: StoreMemoryInput, layer: MemoryLayer): Promise<QueryResult | null>;
    /**
     * Query across layers with weighted retrieval.
     * Uses hybrid scoring (keyword + semantic embeddings) when embedding service is available.
     */
    queryLayers(query: string, options?: QueryOptions & {
        layers?: MemoryLayer[];
    }): Promise<Awaited<ReturnType<LayerManager['query']>> | null>;
    /**
     * Get layer stats.
     */
    getLayerStats(): ReturnType<LayerManager['getStats']> | null;
    /**
     * Evict expired entries from all layers.
     */
    evictExpiredLayers(): number;
    /**
     * Check if episodic layer needs compression.
     * Returns true when episodic is above 80% capacity.
     */
    needsEpisodicCompression(): boolean;
    /**
     * Compress oldest episodic entries into semantic summaries.
     * Call this when episodic layer fills up — uses the LLM to summarize
     * old entries rather than losing them to TTL eviction.
     *
     * @param count How many episodic entries to compress (default: 20)
     * @returns compressed entry info, or null if layers/llm not available
     */
    compressEpisodic(count?: number): Promise<{
        compressedEntryId: string;
        summary: string;
        entriesEvicted: number;
    } | null>;
    /**
     * Store a procedural memory — a behavior/rule triggered by a keyword.
     * Use when you learn a rule like "when X happens, always do Y".
     */
    storeProcedural(input: StoreMemoryInput, trigger: string): Promise<QueryResult | null>;
    /**
     * Fire procedural rules matching the given context.
     * Returns rules whose trigger keyword appears in the context.
     */
    fireProcedural(context: string): QueryResult[];
    /**
     * Get the temporal history of an entry — trace its supersession chain.
     * Returns all versions from newest to oldest.
     */
    getTemporalHistory(entryId: string): QueryResult[];
    /**
     * Check if layers are enabled.
     */
    isLayersEnabled(): boolean;
    /**
     * Create a named snapshot of current memory state.
     * Essential for long-running agents — take a snapshot before restarts.
     * @param label Human-readable label for this snapshot
     */
    createSnapshot(label: string): Promise<{
        id: string;
        label: string;
        createdAt: number;
        memoryCount: number;
        layerCounts: Record<string, number>;
    }>;
    /**
     * Restore from a snapshot by ID.
     * Restores layer entries from the snapshot into the current store.
     * @returns Number of entries restored
     */
    restoreSnapshot(snapshotId: string): Promise<number>;
    /**
     * List available snapshots.
     */
    listSnapshots(): Promise<Array<{
        id: string;
        label: string;
        createdAt: number;
        memoryCount: number;
    }>>;
    /**
     * Delete a snapshot.
     */
    deleteSnapshot(snapshotId: string): Promise<boolean>;
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
    duplicate(config: {
        serverUrl: string;
        apiKey: string;
        soulText?: string;
        identityText?: string;
        includeSoul?: boolean;
        includeIdentity?: boolean;
        includeAllLayers?: boolean;
        layers?: Array<'episodic' | 'semantic' | 'identity' | 'procedural'>;
    }): Promise<DuplicateResult>;
    /**
     * Build an identity package locally without uploading.
     * Useful for previewing what would be exported.
     */
    buildIdentityPackageLocal(config: {
        soulText?: string;
        identityText?: string;
        includeSoul?: boolean;
        includeIdentity?: boolean;
        includeAllLayers?: boolean;
        layers?: Array<'episodic' | 'semantic' | 'identity' | 'procedural'>;
    }): Promise<IdentityPackage>;
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
    infect(config: {
        serverUrl: string;
        apiKey: string;
        sourceAgentId?: string;
        version?: string;
        refreshIntervalMs?: number;
        layers?: Array<'identity' | 'semantic' | 'procedural'>;
    }): Promise<InfectionResult>;
    /**
     * Download identity package without applying it (preview).
     */
    fetchIdentityPackage(config: {
        serverUrl: string;
        apiKey: string;
        sourceAgentId?: string;
        version?: string;
    }): Promise<IdentityPackage>;
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

export { type Adapter, type Constitution, ConstitutionInjector, ConstitutionManager, type ConstitutionStatement, DEFAULT_LAYER_CONFIG, DriftDetector, type DriftEvent, type DriftResult, type DuplicateResult, type DuplicationConfig, type EmbeddingConfig$1 as EmbeddingConfig, EpisodicCapturePipeline, type EventType, HttpAdapter, type IdentityCategory, type IdentityConfig, type IdentityPackage, type IdentitySystem, type InfectionConfig, type InfectionResult, type LLMMessage, type LLMResponse, type LayerConfig, LayerManager, type LayeredMemoryEntry, MemoryConsolidator, type MemoryEntry, type MemoryEvent, type MemoryLayer, MemoryREPL, MemoryStore, ModelAbstraction, type ModelConfig, QueryEngine, type QueryOptions, type QueryResponse, type QueryResult, ReMEM, type ReMEMAdapterOptions, type ReMEMConfig, type StoreMemoryInput, type SupersessionResult, buildIdentityPackage, constitutionSchema, constitutionStatementSchema, createIdentitySystem, createLangGraphStoreAdapter, createOpenClawAdapter, createVercelAIAdapter, downloadPackage, driftEventSchema, driftResultSchema, duplicate, duplicationConfigSchema, embeddingConfigSchema, eventTypeSchema, identityCategorySchema, identityConfigSchema, identityPackageSchema, infect, infectFromServer, infectionConfigSchema, layerConfigSchema, layeredMemoryEntrySchema, memoryEntrySchema, memoryEventSchema, memoryLayerSchema, modelConfigSchema, queryOptionsSchema, queryResponseSchema, queryResultSchema, rememConfigSchema, storeMemoryInputSchema, uploadPackage };
