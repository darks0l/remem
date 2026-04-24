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
    content: string;
    topics: string[];
    metadata: Record<string, unknown>;
    id: string;
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
    content: string;
    id: string;
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
 * ReMEM — Hierarchical Memory Layers
 * Episodic / Semantic / Identity / Procedural
 * with TTL-based eviction, weighted retrieval, temporal validity, and self-edit
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
    constructor(config?: Partial<LayerConfig>);
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
     * Query across all layers with weighted retrieval.
     * Entries from higher-weight layers rank higher, but content match still matters.
     */
    query(text: string, options?: QueryOptions & {
        layers?: MemoryLayer[];
    }): {
        results: QueryResult[];
        totalAvailable: number;
        layerBreakdown: Record<MemoryLayer, number>;
    };
    /**
     * Get recent entries across all layers.
     */
    getRecent(n?: number, layers?: MemoryLayer[]): QueryResult[];
    /**
     * Get entries by topic across all layers.
     */
    getByTopic(topic: string, limit?: number): QueryResult[];
    /**
     * Forget an entry.
     */
    forget(id: string): boolean;
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
     * Auto-assign layer based on content analysis.
     */
    private autoAssignLayer;
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
    private identity?;
    private layers?;
    private _identityEnabled;
    private _layersEnabled;
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
     */
    enableLayers(config?: Partial<LayerConfig>): void;
    /**
     * Store in a specific layer.
     */
    storeInLayer(input: StoreMemoryInput, layer: MemoryLayer): QueryResult | null;
    /**
     * Query across layers with weighted retrieval.
     */
    queryLayers(query: string, options?: QueryOptions & {
        layers?: MemoryLayer[];
    }): ReturnType<LayerManager['query']> | null;
    /**
     * Get layer stats.
     */
    getLayerStats(): ReturnType<LayerManager['getStats']> | null;
    /**
     * Evict expired entries from all layers.
     */
    evictExpiredLayers(): number;
    /**
     * Store a procedural memory — a behavior/rule triggered by a keyword.
     * Use when you learn a rule like "when X happens, always do Y".
     */
    storeProcedural(input: StoreMemoryInput, trigger: string): QueryResult | null;
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

export { type Adapter, type Constitution, ConstitutionInjector, ConstitutionManager, type ConstitutionStatement, DEFAULT_LAYER_CONFIG, DriftDetector, type DriftEvent, type DriftResult, type EventType, type IdentityCategory, type IdentityConfig, type IdentitySystem, type LLMMessage, type LLMResponse, type LayerConfig, LayerManager, type LayeredMemoryEntry, type MemoryEntry, type MemoryEvent, type MemoryLayer, MemoryStore, ModelAbstraction, type ModelConfig, QueryEngine, type QueryOptions, type QueryResponse, type QueryResult, ReMEM, type ReMEMConfig, type StoreMemoryInput, type SupersessionResult, constitutionSchema, constitutionStatementSchema, createIdentitySystem, driftEventSchema, driftResultSchema, eventTypeSchema, identityCategorySchema, identityConfigSchema, layerConfigSchema, layeredMemoryEntrySchema, memoryEntrySchema, memoryEventSchema, memoryLayerSchema, modelConfigSchema, queryOptionsSchema, queryResponseSchema, queryResultSchema, rememConfigSchema, storeMemoryInputSchema };
