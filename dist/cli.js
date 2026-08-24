#!/usr/bin/env node
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

// src/cli.ts
var cli_exports = {};
__export(cli_exports, {
  runCli: () => runCli
});
module.exports = __toCommonJS(cli_exports);
var import_promises2 = __toESM(require("fs/promises"));
var import_node_path = __toESM(require("path"));
var import_node_zlib = require("zlib");
var import_node_util = require("util");

// src/store.ts
var import_sql = __toESM(require("sql.js"));
var import_crypto2 = require("crypto");
var import_node_fs = require("fs");

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
var rememberKindSchema = import_zod.z.enum([
  "fact",
  "preference",
  "decision",
  "procedure",
  "recent-event",
  "artifact-note"
]);
var rememberActionSchema = import_zod.z.enum([
  "stored",
  "skipped_duplicate",
  "skipped_low_signal",
  "preview"
]);
var rememberInputSchema = storeMemoryInputSchema.extend({
  kind: rememberKindSchema.optional(),
  source: import_zod.z.string().min(1).optional(),
  dryRun: import_zod.z.boolean().default(false),
  forceStore: import_zod.z.boolean().default(false)
});
var rememberBatchInputSchema = import_zod.z.array(rememberInputSchema).min(1);
var rememberResultSchema = import_zod.z.object({
  action: rememberActionSchema,
  kind: rememberKindSchema,
  layer: import_zod.z.enum(["episodic", "semantic", "identity", "procedural"]),
  score: import_zod.z.number().min(0).max(1),
  threshold: import_zod.z.number().min(0).max(1),
  reason: import_zod.z.string(),
  duplicateOf: import_zod.z.string().optional(),
  conflictIds: import_zod.z.array(import_zod.z.string()).default([]),
  topics: import_zod.z.array(import_zod.z.string()),
  metadata: import_zod.z.record(import_zod.z.unknown()).default({}),
  entry: memoryEntrySchema.optional(),
  trigger: import_zod.z.unknown().optional()
});
var rememberBatchOptionsSchema = import_zod.z.object({
  stopOnError: import_zod.z.boolean().default(false)
});
var rememberBatchItemResultSchema = import_zod.z.object({
  index: import_zod.z.number().int().nonnegative(),
  ok: import_zod.z.boolean(),
  result: rememberResultSchema.optional(),
  error: import_zod.z.string().optional()
});
var rememberBatchResultSchema = import_zod.z.object({
  total: import_zod.z.number().int().nonnegative(),
  stored: import_zod.z.number().int().nonnegative(),
  previews: import_zod.z.number().int().nonnegative(),
  skippedDuplicate: import_zod.z.number().int().nonnegative(),
  skippedLowSignal: import_zod.z.number().int().nonnegative(),
  failed: import_zod.z.number().int().nonnegative(),
  results: import_zod.z.array(rememberBatchItemResultSchema)
});
var metadataFilterValueSchema = import_zod.z.union([import_zod.z.string(), import_zod.z.number(), import_zod.z.boolean(), import_zod.z.null()]);
var metadataFilterOperatorSchema = import_zod.z.object({
  eq: metadataFilterValueSchema.optional(),
  in: import_zod.z.array(metadataFilterValueSchema).min(1).optional(),
  contains: import_zod.z.union([import_zod.z.string(), import_zod.z.number(), import_zod.z.boolean()]).optional(),
  gt: import_zod.z.number().optional(),
  gte: import_zod.z.number().optional(),
  lt: import_zod.z.number().optional(),
  lte: import_zod.z.number().optional(),
  exists: import_zod.z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "Metadata operator filter must include at least one operator"
});
var metadataFilterSchema = import_zod.z.union([metadataFilterValueSchema, metadataFilterOperatorSchema]);
var queryOptionsSchema = import_zod.z.object({
  limit: import_zod.z.number().min(1).max(100).default(10),
  topics: import_zod.z.array(import_zod.z.string()).optional(),
  metadata: import_zod.z.record(metadataFilterSchema).optional(),
  minAccessCount: import_zod.z.number().optional(),
  since: import_zod.z.number().optional(),
  // unix timestamp ms
  until: import_zod.z.number().optional()
});
var queryResultSchema = import_zod.z.object({
  id: import_zod.z.string(),
  content: import_zod.z.string(),
  topics: import_zod.z.array(import_zod.z.string()),
  metadata: import_zod.z.record(import_zod.z.unknown()).default({}),
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
var memoryLinkSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  fromId: import_zod.z.string().uuid(),
  toId: import_zod.z.string().uuid(),
  type: import_zod.z.string().min(1),
  metadata: import_zod.z.record(import_zod.z.unknown()).default({}),
  createdAt: import_zod.z.number()
});
var memoryLinkInputSchema = import_zod.z.object({
  fromId: import_zod.z.string().uuid(),
  toId: import_zod.z.string().uuid(),
  type: import_zod.z.string().min(1),
  metadata: import_zod.z.record(import_zod.z.unknown()).optional().default({})
});
var linkedMemoryQueryOptionsSchema = import_zod.z.object({
  direction: import_zod.z.enum(["outgoing", "incoming", "both"]).default("both"),
  types: import_zod.z.array(import_zod.z.string()).optional(),
  limit: import_zod.z.number().min(1).max(100).default(20),
  offset: import_zod.z.number().int().min(0).default(0)
});
var queryWithNeighborsOptionsSchema = queryOptionsSchema.extend({
  hops: import_zod.z.union([import_zod.z.literal(1), import_zod.z.literal(2)]).default(1),
  linkTypes: import_zod.z.array(import_zod.z.string()).optional(),
  includeBaseResults: import_zod.z.boolean().default(true),
  neighborLimit: import_zod.z.number().min(1).max(100).default(25),
  minNeighborScore: import_zod.z.number().min(0).max(1).default(0.2),
  linkTypeWeights: import_zod.z.record(import_zod.z.number().min(0).max(2)).optional(),
  includePathDetails: import_zod.z.boolean().default(false)
});
var neighborPathSchema = import_zod.z.object({
  fromId: import_zod.z.string(),
  toId: import_zod.z.string(),
  throughId: import_zod.z.string(),
  type: import_zod.z.string(),
  hop: import_zod.z.number().min(1),
  score: import_zod.z.number().min(0).max(2)
});
var smartRecallProfileSchema = import_zod.z.enum([
  "fast",
  "deep",
  "agent-safe",
  "ops-debug",
  "coding-agent",
  "ops-handoff",
  "research-brief"
]);
var smartRecallOptionsSchema = queryWithNeighborsOptionsSchema.extend({
  profile: smartRecallProfileSchema.default("fast"),
  includeProcedural: import_zod.z.boolean().default(true),
  proceduralLimit: import_zod.z.number().min(1).max(50).default(5),
  includeRecent: import_zod.z.boolean().default(false),
  recentLimit: import_zod.z.number().min(1).max(50).default(5)
});
var smartRecallProfileDefaultsSchema = import_zod.z.object({
  profile: smartRecallProfileSchema,
  limit: import_zod.z.number().min(1).max(100),
  hops: import_zod.z.union([import_zod.z.literal(1), import_zod.z.literal(2)]),
  includeRecent: import_zod.z.boolean(),
  includeProcedural: import_zod.z.boolean(),
  recentLimit: import_zod.z.number().min(1).max(50).optional(),
  proceduralLimit: import_zod.z.number().min(1).max(50).optional(),
  minNeighborScore: import_zod.z.number().min(0).max(1).optional(),
  neighborLimit: import_zod.z.number().min(1).max(100).optional()
});
var contextPackSectionTitlesSchema = import_zod.z.object({
  recall: import_zod.z.string(),
  graph: import_zod.z.string(),
  procedural: import_zod.z.string(),
  recent: import_zod.z.string(),
  actions: import_zod.z.string()
});
var smartRecallProfileDescriptorSchema = import_zod.z.object({
  profile: smartRecallProfileSchema,
  label: import_zod.z.string(),
  overview: import_zod.z.string(),
  recommendedFor: import_zod.z.array(import_zod.z.string()).min(1),
  defaultOptions: smartRecallProfileDefaultsSchema,
  contextPackTitles: contextPackSectionTitlesSchema
});
var smartRecallResultSchema = queryResultSchema.extend({
  sourceLane: import_zod.z.enum(["semantic", "graph", "procedural", "recent"]),
  reasons: import_zod.z.array(import_zod.z.string()).default([]),
  combinedScore: import_zod.z.number()
});
var smartRecallResponseSchema = import_zod.z.object({
  results: import_zod.z.array(smartRecallResultSchema),
  totalAvailable: import_zod.z.number(),
  query: import_zod.z.string(),
  tookMs: import_zod.z.number(),
  profile: smartRecallProfileSchema,
  lanes: import_zod.z.object({
    semantic: import_zod.z.number(),
    graph: import_zod.z.number(),
    procedural: import_zod.z.number(),
    recent: import_zod.z.number()
  })
});
var dreamMemoryLayerSchema = import_zod.z.enum(["identity", "semantic", "procedural"]);
var dreamOptionsSchema = import_zod.z.object({
  query: import_zod.z.string().default("What long-memory patterns matter most right now?"),
  layers: import_zod.z.array(dreamMemoryLayerSchema).default(["identity", "semantic", "procedural"]),
  limit: import_zod.z.number().min(1).max(50).default(12),
  metadata: import_zod.z.record(metadataFilterSchema).optional(),
  topicAllowlist: import_zod.z.array(import_zod.z.string()).optional()
});
var dreamResponseSchema = import_zod.z.object({
  query: import_zod.z.string(),
  title: import_zod.z.string(),
  content: import_zod.z.string(),
  themes: import_zod.z.array(import_zod.z.string()),
  actions: import_zod.z.array(import_zod.z.string()),
  sourceIds: import_zod.z.array(import_zod.z.string()),
  sourceLayers: import_zod.z.array(dreamMemoryLayerSchema),
  sourceCount: import_zod.z.number(),
  modelUsed: import_zod.z.string().optional(),
  tookMs: import_zod.z.number()
});
var contextPackOptionsSchema = smartRecallOptionsSchema.extend({
  maxChars: import_zod.z.number().min(500).max(5e4).default(6e3),
  includeDream: import_zod.z.boolean().default(false),
  includeRecent: import_zod.z.boolean().default(true),
  includeMetadata: import_zod.z.boolean().default(false)
});
var contextPackSectionSchema = import_zod.z.object({
  kind: import_zod.z.enum(["overview", "recall", "graph", "procedural", "recent", "actions", "dream"]),
  title: import_zod.z.string(),
  content: import_zod.z.string(),
  sourceIds: import_zod.z.array(import_zod.z.string()).default([])
});
var contextPackResponseSchema = import_zod.z.object({
  query: import_zod.z.string(),
  profile: smartRecallProfileSchema,
  content: import_zod.z.string(),
  sections: import_zod.z.array(contextPackSectionSchema),
  sourceIds: import_zod.z.array(import_zod.z.string()),
  maxChars: import_zod.z.number(),
  usedChars: import_zod.z.number(),
  truncated: import_zod.z.boolean(),
  tookMs: import_zod.z.number()
});
var memoryHealthOptionsSchema = import_zod.z.object({
  staleAgeMs: import_zod.z.number().min(1).default(7 * 24 * 60 * 60 * 1e3),
  maxSnapshotAgeMs: import_zod.z.number().min(1).default(24 * 60 * 60 * 1e3),
  minSnapshotMemories: import_zod.z.number().min(1).default(10),
  maxUntaggedRatio: import_zod.z.number().min(0).max(1).default(0.25),
  duplicateSampleLimit: import_zod.z.number().min(1).max(50).default(10)
});
var memoryHealthCheckSchema = import_zod.z.object({
  name: import_zod.z.string(),
  status: import_zod.z.enum(["pass", "warn", "fail"]),
  detail: import_zod.z.string(),
  value: import_zod.z.unknown().optional(),
  action: import_zod.z.string().optional(),
  command: import_zod.z.string().optional()
});
var memoryHealthRecommendationSchema = import_zod.z.object({
  priority: import_zod.z.enum(["low", "medium", "high"]),
  action: import_zod.z.string(),
  reason: import_zod.z.string(),
  command: import_zod.z.string().optional()
});
var memoryHealthResponseSchema = import_zod.z.object({
  score: import_zod.z.number().min(0).max(100),
  status: import_zod.z.enum(["healthy", "watch", "attention"]),
  checkedAt: import_zod.z.number(),
  checks: import_zod.z.array(memoryHealthCheckSchema),
  recommendations: import_zod.z.array(memoryHealthRecommendationSchema),
  stats: import_zod.z.object({
    coreCount: import_zod.z.number(),
    layerCount: import_zod.z.number(),
    snapshotCount: import_zod.z.number(),
    eventCount: import_zod.z.number(),
    duplicateGroups: import_zod.z.number(),
    staleCount: import_zod.z.number(),
    untaggedCount: import_zod.z.number()
  })
});
var namespaceInputSchema = import_zod.z.union([
  import_zod.z.string().min(1),
  import_zod.z.array(import_zod.z.string().min(1)).min(1)
]);
var namespaceQueryScopeSchema = import_zod.z.object({
  visibility: import_zod.z.enum(["private", "shared", "all"]).default("all"),
  includeDescendants: import_zod.z.boolean().default(false)
});
var knowledgeResourceUriSchema = import_zod.z.string().min(1).max(2048).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
  message: "Knowledge resource URI cannot include control characters"
}).refine((value) => {
  try {
    const parsed = new URL(value);
    const scheme = parsed.protocol.slice(0, -1);
    return /^[a-z][a-z0-9+.-]*$/i.test(scheme) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}, {
  message: "Knowledge resource URI must be an absolute URI without embedded credentials"
});
var knowledgeResourceScopeSchema = import_zod.z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9:._/-]*$/, "Knowledge resource scopes must be token-like strings");
var knowledgeResourceGrantSchema = import_zod.z.object({
  resourceUri: knowledgeResourceUriSchema.optional(),
  source: import_zod.z.string().min(1).optional(),
  project: import_zod.z.string().min(1).optional(),
  scopes: import_zod.z.array(knowledgeResourceScopeSchema).default([])
});
function authorizeKnowledgeResourceAccess(resource, grant) {
  const parsedGrant = knowledgeResourceGrantSchema.parse(grant);
  const parsedResource = {
    ...resource,
    ...resource.resourceUri ? { resourceUri: knowledgeResourceUriSchema.parse(resource.resourceUri) } : {},
    requiredScopes: import_zod.z.array(knowledgeResourceScopeSchema).default([]).parse(resource.requiredScopes ?? [])
  };
  if (parsedResource.resourceUri && parsedGrant.resourceUri && parsedResource.resourceUri !== parsedGrant.resourceUri) {
    return { allowed: false, missingScopes: [], reason: "resource-uri-mismatch" };
  }
  if (parsedResource.source && parsedGrant.source && parsedResource.source !== parsedGrant.source) {
    return { allowed: false, missingScopes: [], reason: "source-mismatch" };
  }
  if (parsedResource.project && parsedGrant.project && parsedResource.project !== parsedGrant.project) {
    return { allowed: false, missingScopes: [], reason: "project-mismatch" };
  }
  const grantedScopes = new Set(parsedGrant.scopes);
  const missingScopes = parsedResource.requiredScopes.filter((scope) => !grantedScopes.has(scope));
  return missingScopes.length ? { allowed: false, missingScopes, reason: "missing-scopes" } : { allowed: true, missingScopes: [] };
}
var knowledgeNodeSchema = import_zod.z.object({
  id: import_zod.z.string().min(1),
  label: import_zod.z.string().min(1).default("Node"),
  name: import_zod.z.string().min(1).optional(),
  kind: import_zod.z.string().min(1).optional(),
  content: import_zod.z.string().optional(),
  summary: import_zod.z.string().optional(),
  path: import_zod.z.string().optional(),
  language: import_zod.z.string().optional(),
  weight: import_zod.z.number().min(0).max(2).optional(),
  metadata: import_zod.z.record(import_zod.z.unknown()).optional().default({})
});
var knowledgeEdgeSchema = import_zod.z.object({
  from: import_zod.z.string().min(1),
  to: import_zod.z.string().min(1),
  type: import_zod.z.string().min(1),
  weight: import_zod.z.number().min(0).max(2).optional(),
  metadata: import_zod.z.record(import_zod.z.unknown()).optional().default({})
});
var knowledgeGraphArtifactSchema = import_zod.z.object({
  source: import_zod.z.string().min(1).default("external-knowledge"),
  project: import_zod.z.string().min(1).optional(),
  version: import_zod.z.string().optional(),
  generatedAt: import_zod.z.number().optional(),
  artifactPath: import_zod.z.string().optional(),
  resourceUri: knowledgeResourceUriSchema.optional(),
  requiredScopes: import_zod.z.array(knowledgeResourceScopeSchema).optional().default([]),
  nodes: import_zod.z.array(knowledgeNodeSchema).default([]),
  edges: import_zod.z.array(knowledgeEdgeSchema).default([]),
  metadata: import_zod.z.record(import_zod.z.unknown()).optional().default({})
});
var knowledgeIngestOptionsSchema = import_zod.z.object({
  source: import_zod.z.string().min(1).optional(),
  project: import_zod.z.string().min(1).optional(),
  namespace: namespaceInputSchema.optional(),
  visibility: import_zod.z.enum(["private", "shared"]).default("shared"),
  topic: import_zod.z.string().min(1).default("knowledge-graph"),
  linkTypePrefix: import_zod.z.string().default("knowledge")
});
var knowledgeIngestResultSchema = import_zod.z.object({
  source: import_zod.z.string(),
  project: import_zod.z.string().optional(),
  namespace: import_zod.z.string(),
  nodesStored: import_zod.z.number(),
  edgesLinked: import_zod.z.number(),
  skippedEdges: import_zod.z.number(),
  nodeMemoryIds: import_zod.z.record(import_zod.z.string())
});
var knowledgeArtifactRegistrationSchema = import_zod.z.object({
  source: import_zod.z.string().min(1).default("external-knowledge"),
  project: import_zod.z.string().min(1).optional(),
  artifactPath: import_zod.z.string().min(1),
  resourceUri: knowledgeResourceUriSchema.optional(),
  requiredScopes: import_zod.z.array(knowledgeResourceScopeSchema).optional().default([]),
  format: import_zod.z.string().min(1).default("json"),
  compression: import_zod.z.string().min(1).optional(),
  checksum: import_zod.z.string().optional(),
  generatedAt: import_zod.z.number().optional(),
  metadata: import_zod.z.record(import_zod.z.unknown()).optional().default({})
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
var postgresStorageConfigSchema = import_zod.z.object({
  connectionString: import_zod.z.string().optional(),
  schema: import_zod.z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  tablePrefix: import_zod.z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  ssl: import_zod.z.union([import_zod.z.boolean(), import_zod.z.record(import_zod.z.unknown())]).optional(),
  pgvector: import_zod.z.object({
    enabled: import_zod.z.boolean().default(false),
    embeddingType: import_zod.z.enum(["memory", "layered", "both"]).default("memory"),
    ivfflatLists: import_zod.z.number().min(1).max(5e3).default(100)
  }).optional(),
  pool: import_zod.z.unknown().optional()
});
var storageScopeConfigSchema = import_zod.z.object({
  workspaceId: import_zod.z.string().min(1).optional(),
  agentId: import_zod.z.string().min(1).optional(),
  userId: import_zod.z.string().min(1).optional()
}).passthrough();
var rememConfigSchema = import_zod.z.object({
  storage: import_zod.z.enum(["sqlite", "postgres", "memory"]).default("sqlite"),
  storageConfig: storageScopeConfigSchema.optional(),
  postgres: postgresStorageConfigSchema.optional(),
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
  "memory.linked",
  "memory.unlinked",
  "memory.superseded",
  "snapshot.created",
  "snapshot.restored",
  "storage.maintenance",
  "knowledge.ingested",
  "knowledge.artifact_registered",
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
  supersedes: import_zod.z.string().nullish(),
  // id of the entry this one supersedes (older version)
  supersededBy: import_zod.z.string().nullish()
  // id of the entry that supersedes this one
});
var proceduralTriggerSchema = import_zod.z.object({
  terms: import_zod.z.array(import_zod.z.string()).optional().default([]),
  phrases: import_zod.z.array(import_zod.z.string()).optional().default([]),
  topics: import_zod.z.array(import_zod.z.string()).optional().default([]),
  excludeTerms: import_zod.z.array(import_zod.z.string()).optional().default([]),
  regex: import_zod.z.string().optional(),
  match: import_zod.z.enum(["any", "all"]).default("any"),
  minScore: import_zod.z.number().min(0).max(1).default(0.25),
  priority: import_zod.z.number().min(0).max(1).default(0.5)
});
var proceduralMatchSchema = import_zod.z.object({
  entry: layeredMemoryEntrySchema,
  score: import_zod.z.number().min(0).max(2),
  reasons: import_zod.z.array(import_zod.z.string())
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
        workspace_id TEXT,
        agent_id TEXT,
        user_id TEXT
      )
    `);
    this.ensureColumn("memory", "workspace_id", "TEXT");
    this.ensureColumn("memory", "agent_id", "TEXT");
    this.ensureColumn("memory", "user_id", "TEXT");
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory(created_at DESC)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_accessed_at ON memory(accessed_at DESC)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_workspace ON memory(workspace_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_agent ON memory(agent_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_memory_user ON memory(user_id)`);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memory_links (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        type TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        workspace_id TEXT,
        agent_id TEXT,
        user_id TEXT
      )
    `);
    this.ensureColumn("memory_links", "workspace_id", "TEXT");
    this.ensureColumn("memory_links", "agent_id", "TEXT");
    this.ensureColumn("memory_links", "user_id", "TEXT");
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ml_from ON memory_links(from_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ml_to ON memory_links(to_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ml_type ON memory_links(type)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ml_workspace ON memory_links(workspace_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ml_agent ON memory_links(agent_id)`);
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
        workspace_id TEXT,
        agent_id TEXT,
        user_id TEXT,
        created_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
    this.ensureColumn("layered_memories", "workspace_id", "TEXT");
    this.ensureColumn("layered_memories", "agent_id", "TEXT");
    this.ensureColumn("layered_memories", "user_id", "TEXT");
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_lm_layer ON layered_memories(layer)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_lm_expires ON layered_memories(expires_at)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_lm_workspace ON layered_memories(workspace_id)`);
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
        workspace_id TEXT,
        agent_id TEXT,
        user_id TEXT,
        checksum TEXT
      )
    `);
    this.ensureColumn("snapshots", "workspace_id", "TEXT");
    this.ensureColumn("snapshots", "agent_id", "TEXT");
    this.ensureColumn("snapshots", "user_id", "TEXT");
    this.ensureColumn("snapshots", "checksum", "TEXT");
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_snap_workspace ON snapshots(workspace_id)`);
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
  async store(input2, opts) {
    this.ensureInitialized();
    const now = Date.now();
    const entry = {
      id: (0, import_crypto2.randomUUID)(),
      content: input2.content,
      topics: input2.topics ?? [],
      metadata: input2.metadata ?? {},
      createdAt: now,
      accessedAt: now,
      accessCount: 0
    };
    const validated = memoryEntrySchema.parse(entry);
    this.db.run(
      `INSERT INTO memory (id, content, topics, metadata, created_at, accessed_at, access_count, workspace_id, agent_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.id,
        validated.content,
        JSON.stringify(validated.topics),
        JSON.stringify(validated.metadata),
        validated.createdAt,
        validated.accessedAt,
        validated.accessCount,
        opts?.workspaceId ?? null,
        opts?.agentId ?? null,
        opts?.userId ?? null
      ]
    );
    this.logEvent("memory.stored", { entry: validated });
    this.persist();
    return validated;
  }
  async get(id, opts) {
    this.ensureInitialized();
    let sql = "SELECT * FROM memory WHERE id = ?";
    const params = [id];
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
    if (opts?.agentId) {
      sql += " AND (agent_id = ? OR agent_id IS NULL)";
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      sql += " AND (user_id = ? OR user_id IS NULL)";
      params.push(opts.userId);
    }
    const result = this.db.exec(sql, params);
    if (result.length === 0 || result[0].values.length === 0) return null;
    this.db.run(`UPDATE memory SET access_count = access_count + 1, accessed_at = ? WHERE id = ?`, [
      Date.now(),
      id
    ]);
    const row = this.rowToObject(result[0].columns, result[0].values[0]);
    const entry = memoryEntrySchema.parse(row);
    this.logEvent("memory.accessed", { id });
    this.persist();
    return entry;
  }
  async query(text, options, scope) {
    this.ensureInitialized();
    const opts = queryOptionsSchema.parse(options ?? {});
    const terms = text.toLowerCase().split(/\s+/).map((term) => term.trim()).filter(Boolean);
    let sql = "SELECT * FROM memory WHERE 1=1";
    const params = [];
    if (terms.length > 0) {
      sql += ` AND (${terms.map(() => "LOWER(content) LIKE ?").join(" OR ")})`;
      params.push(...terms.map((term) => `%${term}%`));
    }
    if (scope?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(scope.workspaceId);
    }
    if (scope?.agentId) {
      sql += " AND (agent_id = ? OR agent_id IS NULL)";
      params.push(scope.agentId);
    }
    if (scope?.userId) {
      sql += " AND (user_id = ? OR user_id IS NULL)";
      params.push(scope.userId);
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
    const result = this.db.exec(sql, params);
    if (result.length === 0) {
      this.logEvent("memory.queried", { text, options: opts, resultCount: 0 });
      return { results: [], totalAvailable: 0 };
    }
    const rows = result[0].values.map((v) => this.rowToObject(result[0].columns, v));
    const filteredEntries = rows.map((row) => memoryEntrySchema.parse(row)).filter((entry) => !opts.topics || this.matchTopics(entry.topics, opts.topics)).filter((entry) => !opts.minAccessCount || entry.accessCount >= opts.minAccessCount).filter((entry) => !opts.metadata || this.matchMetadata(entry.metadata, opts.metadata));
    const scoredEntries = filteredEntries.map((entry) => ({
      entry,
      relevanceScore: this.simpleRelevance(entry.content, text),
      exactScore: this.exactTokenRelevance(entry.content, text)
    })).filter((scored) => terms.length === 0 || scored.relevanceScore > 0).sort(
      (a, b) => b.relevanceScore - a.relevanceScore || b.entry.accessCount - a.entry.accessCount || b.exactScore - a.exactScore || b.entry.accessedAt - a.entry.accessedAt || (a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0)
    );
    const totalAvailable = scoredEntries.length;
    const results = scoredEntries.slice(0, opts.limit).map(({ entry, relevanceScore }) => ({
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      metadata: entry.metadata,
      relevanceScore,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount
    }));
    this.logEvent("memory.queried", { text, options: opts, resultCount: results.length });
    return { results, totalAvailable };
  }
  /**
   * Get all memory entries (no text filter, ignores limit).
   * Used internally by the duplication/export feature.
   */
  async getAllEntries(opts) {
    this.ensureInitialized();
    let sql = "SELECT * FROM memory WHERE 1=1";
    const params = [];
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
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
      const entry = memoryEntrySchema.parse(this.rowToObject(result[0].columns, v));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        metadata: entry.metadata,
        relevanceScore: 0,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount
      };
    });
  }
  async getRecent(n = 10, opts) {
    this.ensureInitialized();
    let sql = "SELECT * FROM memory WHERE 1=1";
    const params = [];
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
    if (opts?.agentId) {
      sql += " AND (agent_id = ? OR agent_id IS NULL)";
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      sql += " AND (user_id = ? OR user_id IS NULL)";
      params.push(opts.userId);
    }
    sql += " ORDER BY accessed_at DESC LIMIT ?";
    params.push(n);
    const result = this.db.exec(sql, params);
    if (result.length === 0) return [];
    return result[0].values.map((v) => {
      const entry = memoryEntrySchema.parse(this.rowToObject(result[0].columns, v));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount
      };
    });
  }
  async getByTopic(topic, limit = 20, opts) {
    this.ensureInitialized();
    let sql = "SELECT * FROM memory WHERE 1=1";
    const params = [];
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
    if (opts?.agentId) {
      sql += " AND (agent_id = ? OR agent_id IS NULL)";
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      sql += " AND (user_id = ? OR user_id IS NULL)";
      params.push(opts.userId);
    }
    sql += " ORDER BY accessed_at DESC";
    const result = this.db.exec(sql, params);
    if (result.length === 0) return [];
    return result[0].values.map((v) => {
      const entry = memoryEntrySchema.parse(this.rowToObject(result[0].columns, v));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount
      };
    }).filter((entry) => entry.topics.includes(topic)).slice(0, limit);
  }
  async forget(id, opts) {
    this.ensureInitialized();
    let sql = "DELETE FROM memory WHERE id = ?";
    const params = [id];
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
    if (opts?.agentId) {
      sql += " AND (agent_id = ? OR agent_id IS NULL)";
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      sql += " AND (user_id = ? OR user_id IS NULL)";
      params.push(opts.userId);
    }
    this.db.run(sql, params);
    const changes = this.db.getRowsModified();
    if (changes > 0) {
      this.logEvent("memory.forgotten", { id });
      this.persist();
      return true;
    }
    return false;
  }
  async createLink(input2, opts) {
    this.ensureInitialized();
    const validated = memoryLinkInputSchema.parse(input2);
    const link = memoryLinkSchema.parse({
      id: (0, import_crypto2.randomUUID)(),
      fromId: validated.fromId,
      toId: validated.toId,
      type: validated.type,
      metadata: validated.metadata ?? {},
      createdAt: Date.now()
    });
    this.db.run(
      `INSERT INTO memory_links (id, from_id, to_id, type, metadata, created_at, workspace_id, agent_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        link.id,
        link.fromId,
        link.toId,
        link.type,
        JSON.stringify(link.metadata),
        link.createdAt,
        opts?.workspaceId ?? null,
        opts?.agentId ?? null,
        opts?.userId ?? null
      ]
    );
    this.logEvent("memory.linked", { link });
    this.persist();
    return link;
  }
  async getLinks(memoryId, options, opts) {
    this.ensureInitialized();
    const query = linkedMemoryQueryOptionsSchema.parse(options ?? {});
    let sql = "SELECT * FROM memory_links WHERE 1=1";
    const params = [];
    if (query.direction === "outgoing") {
      sql += " AND from_id = ?";
      params.push(memoryId);
    } else if (query.direction === "incoming") {
      sql += " AND to_id = ?";
      params.push(memoryId);
    } else {
      sql += " AND (from_id = ? OR to_id = ?)";
      params.push(memoryId, memoryId);
    }
    if (query.types && query.types.length > 0) {
      sql += ` AND type IN (${query.types.map(() => "?").join(", ")})`;
      params.push(...query.types);
    }
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
    if (opts?.agentId) {
      sql += " AND (agent_id = ? OR agent_id IS NULL)";
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      sql += " AND (user_id = ? OR user_id IS NULL)";
      params.push(opts.userId);
    }
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(query.limit);
    params.push(query.offset);
    const result = this.db.exec(sql, params);
    if (result.length === 0) return [];
    return result[0].values.map((v) => this.rowToLink(result[0].columns, v));
  }
  async deleteLink(linkId) {
    this.ensureInitialized();
    this.db.run("DELETE FROM memory_links WHERE id = ?", [linkId]);
    const changes = this.db.getRowsModified();
    if (changes > 0) {
      this.logEvent("memory.unlinked", { linkId });
      this.persist();
      return true;
    }
    return false;
  }
  async getEntryById(id, opts) {
    this.ensureInitialized();
    let coreSql = "SELECT * FROM memory WHERE id = ?";
    const coreParams = [id];
    if (opts?.workspaceId) {
      coreSql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      coreParams.push(opts.workspaceId);
    }
    if (opts?.agentId) {
      coreSql += " AND (agent_id = ? OR agent_id IS NULL)";
      coreParams.push(opts.agentId);
    }
    if (opts?.userId) {
      coreSql += " AND (user_id = ? OR user_id IS NULL)";
      coreParams.push(opts.userId);
    }
    const core = this.db.exec(coreSql, coreParams);
    if (core.length > 0 && core[0].values.length > 0) {
      const entry = memoryEntrySchema.parse(this.rowToObject(core[0].columns, core[0].values[0]));
      return {
        id: entry.id,
        content: entry.content,
        topics: entry.topics,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
        accessedAt: entry.accessedAt,
        accessCount: entry.accessCount
      };
    }
    let layeredSql = "SELECT * FROM layered_memories WHERE id = ?";
    const layeredParams = [id];
    if (opts?.workspaceId) {
      layeredSql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      layeredParams.push(opts.workspaceId);
    }
    if (opts?.agentId) {
      layeredSql += " AND (agent_id = ? OR agent_id IS NULL)";
      layeredParams.push(opts.agentId);
    }
    if (opts?.userId) {
      layeredSql += " AND (user_id = ? OR user_id IS NULL)";
      layeredParams.push(opts.userId);
    }
    const layered = this.db.exec(layeredSql, layeredParams);
    if (layered.length === 0 || layered[0].values.length === 0) return null;
    const obj = this.rowToObject(layered[0].columns, layered[0].values[0]);
    return {
      id: obj["id"],
      content: obj["content"],
      topics: Array.isArray(obj["topics"]) ? obj["topics"] : JSON.parse(String(obj["topics"] ?? "[]")),
      metadata: typeof obj["metadata"] === "object" && obj["metadata"] !== null ? obj["metadata"] : JSON.parse(String(obj["metadata"] ?? "{}")),
      createdAt: obj["createdAt"],
      accessedAt: obj["accessedAt"],
      accessCount: obj["accessCount"]
    };
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
        expires_at, importance, valid_from, valid_until, supersedes, superseded_by, workspace_id, agent_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        opts?.workspaceId ?? null,
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
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
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
   * Load full core memory entries for snapshot/restore.
   * Unlike query/getAllEntries, this preserves metadata and timestamps exactly.
   */
  async loadAllMemoryEntries(opts) {
    this.ensureInitialized();
    let sql = "SELECT * FROM memory WHERE 1=1";
    const params = [];
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
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
      const row = this.rowToObject(result[0].columns, v);
      return memoryEntrySchema.parse(row);
    });
  }
  /**
   * Persist a full core memory entry, preserving id/timestamps/access count.
   * Used by snapshot restore and migration workflows.
   */
  async restoreMemoryEntry(entry, opts) {
    this.ensureInitialized();
    const validated = memoryEntrySchema.parse(entry);
    this.db.run(
      `INSERT OR REPLACE INTO memory (id, content, topics, metadata, created_at, accessed_at, access_count, workspace_id, agent_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.id,
        validated.content,
        JSON.stringify(validated.topics),
        JSON.stringify(validated.metadata),
        validated.createdAt,
        validated.accessedAt,
        validated.accessCount,
        opts?.workspaceId ?? null,
        opts?.agentId ?? null,
        opts?.userId ?? null
      ]
    );
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
    const coreEntries = await this.loadAllMemoryEntries(opts);
    const snapshotData = {
      version: "0.8.0",
      createdAt: now,
      layerEntries,
      coreEntries,
      links: await this.loadAllLinks(opts),
      eventCount: this.eventLog.length
    };
    const layerCounts = { episodic: 0, semantic: 0, identity: 0, procedural: 0 };
    for (const e of layerEntries) {
      if (e.layer in layerCounts) layerCounts[e.layer]++;
    }
    const serialized = JSON.stringify(snapshotData);
    const checksum = this.snapshotChecksum(snapshotData);
    this.db.run(
      `INSERT INTO snapshots (id, label, snapshot_data, memory_count, created_at, workspace_id, agent_id, user_id, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        label,
        serialized,
        layerEntries.length + coreEntries.length,
        now,
        opts?.workspaceId ?? null,
        opts?.agentId ?? null,
        opts?.userId ?? null,
        checksum
      ]
    );
    this.logEvent("snapshot.created", { id, label, memoryCount: layerEntries.length + coreEntries.length, checksum });
    this.persist();
    return {
      id,
      label,
      createdAt: now,
      memoryCount: layerEntries.length + coreEntries.length,
      layerCounts,
      checksum,
      workspaceId: opts?.workspaceId ?? null,
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
    const result = this.db.exec("SELECT snapshot_data, checksum, workspace_id, agent_id, user_id FROM snapshots WHERE id = ?", [snapshotId]);
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    const row = this.rowToObject(result[0].columns, result[0].values[0]);
    const snapshotText = row["snapshot_data"];
    const data = JSON.parse(snapshotText);
    const expectedChecksum = row["checksum"];
    if (expectedChecksum && this.snapshotChecksum(data) !== expectedChecksum) {
      throw new Error(`Snapshot checksum mismatch: ${snapshotId}`);
    }
    const scopedEntries = data.layerEntries;
    const scopedCoreEntries = data.coreEntries ?? [];
    if (opts?.workspaceId || opts?.agentId || opts?.userId) {
      const conditions = [];
      const params = [];
      if (opts.workspaceId) {
        conditions.push("workspace_id = ?");
        params.push(opts.workspaceId);
      }
      if (opts.agentId) {
        conditions.push("agent_id = ?");
        params.push(opts.agentId);
      }
      if (opts.userId) {
        conditions.push("user_id = ?");
        params.push(opts.userId);
      }
      this.db.run(`DELETE FROM layered_memories WHERE ${conditions.join(" AND ")}`, params);
      this.db.run(`DELETE FROM memory WHERE ${conditions.join(" AND ")}`, params);
      this.db.run(`DELETE FROM memory_links WHERE ${conditions.join(" AND ")}`, params);
    } else {
      this.db.run("DELETE FROM layered_memories");
      this.db.run("DELETE FROM memory");
      this.db.run("DELETE FROM memory_links");
    }
    let restored = 0;
    for (const entry of scopedCoreEntries) {
      await this.restoreMemoryEntry(entry, {
        workspaceId: opts?.workspaceId,
        agentId: opts?.agentId,
        userId: opts?.userId
      });
      restored++;
    }
    for (const entry of scopedEntries) {
      await this.persistLayerEntry(entry, {
        workspaceId: opts?.workspaceId,
        agentId: opts?.agentId,
        userId: opts?.userId
      });
      restored++;
    }
    for (const link of data.links ?? []) {
      await this.restoreLink(link, {
        workspaceId: opts?.workspaceId,
        agentId: opts?.agentId,
        userId: opts?.userId
      });
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
    let sql = "SELECT id, label, memory_count, created_at, workspace_id, agent_id, user_id, checksum FROM snapshots WHERE 1=1";
    const params = [];
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
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
        checksum: obj["checksum"],
        workspaceId: obj["workspace_id"],
        agentId: obj["agent_id"],
        userId: obj["user_id"]
      };
    });
  }
  /**
   * Export a snapshot as portable JSON with checksum metadata.
   */
  async exportSnapshot(snapshotId) {
    this.ensureInitialized();
    const result = this.db.exec("SELECT * FROM snapshots WHERE id = ?", [snapshotId]);
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    const row = this.rowToObject(result[0].columns, result[0].values[0]);
    const snapshotData = JSON.parse(row["snapshot_data"]);
    const checksum = row["checksum"] ?? this.snapshotChecksum(snapshotData);
    if (this.snapshotChecksum(snapshotData) !== checksum) {
      throw new Error(`Snapshot checksum mismatch: ${snapshotId}`);
    }
    return {
      id: row["id"],
      label: row["label"],
      createdAt: row["createdAt"],
      memoryCount: row["memory_count"],
      checksum,
      workspaceId: row["workspace_id"],
      agentId: row["agent_id"],
      userId: row["user_id"],
      snapshotData
    };
  }
  /**
   * Import a portable snapshot JSON export into the snapshots table.
   */
  async importSnapshot(snapshot, opts) {
    this.ensureInitialized();
    const checksum = this.snapshotChecksum(snapshot.snapshotData);
    if (checksum !== snapshot.checksum) {
      throw new Error("Snapshot import checksum mismatch");
    }
    const exists = this.db.exec("SELECT id FROM snapshots WHERE id = ?", [snapshot.id]);
    if (exists.length > 0 && exists[0].values.length > 0 && !opts?.overwrite) {
      throw new Error(`Snapshot already exists: ${snapshot.id}`);
    }
    const serialized = JSON.stringify(snapshot.snapshotData);
    this.db.run(
      `INSERT OR REPLACE INTO snapshots (id, label, snapshot_data, memory_count, created_at, workspace_id, agent_id, user_id, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshot.id,
        snapshot.label,
        serialized,
        snapshot.memoryCount,
        snapshot.createdAt,
        snapshot.workspaceId,
        snapshot.agentId,
        snapshot.userId,
        checksum
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
      workspaceId: snapshot.workspaceId,
      agentId: snapshot.agentId,
      userId: snapshot.userId
    };
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
   * Run low-level storage maintenance.
   * Prunes expired layered memories, removes dangling links/embeddings, and
   * optionally compacts the SQLite database. Supports dry-run for planning.
   */
  async maintenance(options = {}, opts) {
    this.ensureInitialized();
    const checkedAt = options.now ?? Date.now();
    const dryRun = options.dryRun === true;
    const pruneExpired = options.pruneExpired !== false;
    const pruneOrphanLinks = options.pruneOrphanLinks !== false;
    const pruneOrphanEmbeddings = options.pruneOrphanEmbeddings !== false;
    const compact = options.compact === true;
    let expiredLayerEntries = 0;
    let orphanLinks = 0;
    let orphanEmbeddings = 0;
    const scope = this.scopeClause(opts, "workspace_id", "agent_id", "user_id");
    if (pruneExpired) {
      const where = ["expires_at IS NOT NULL", "expires_at <= ?", ...scope.conditions];
      const params = [checkedAt, ...scope.params];
      expiredLayerEntries = this.countRows(`SELECT COUNT(*) AS count FROM layered_memories WHERE ${where.join(" AND ")}`, params);
      if (!dryRun && expiredLayerEntries > 0) {
        this.db.run(`DELETE FROM layered_memories WHERE ${where.join(" AND ")}`, params);
      }
    }
    if (pruneOrphanLinks) {
      const orphanWhere = "(NOT EXISTS (SELECT 1 FROM memory m WHERE m.id = memory_links.from_id) OR NOT EXISTS (SELECT 1 FROM memory m WHERE m.id = memory_links.to_id))";
      const scopedWhere = scope.conditions.length ? `${orphanWhere} AND ${scope.conditions.join(" AND ")}` : orphanWhere;
      orphanLinks = this.countRows(`SELECT COUNT(*) AS count FROM memory_links WHERE ${scopedWhere}`, scope.params);
      if (!dryRun && orphanLinks > 0) {
        this.db.run(`DELETE FROM memory_links WHERE ${scopedWhere}`, scope.params);
      }
    }
    if (pruneOrphanEmbeddings) {
      const memorySql = "SELECT 1 FROM memory m WHERE m.id = embeddings.memory_id";
      const layerSql = "SELECT 1 FROM layered_memories m WHERE m.id = embeddings.memory_id";
      const where = `NOT EXISTS (${memorySql}) AND NOT EXISTS (${layerSql})`;
      orphanEmbeddings = this.countRows(`SELECT COUNT(*) AS count FROM embeddings WHERE ${where}`);
      if (!dryRun && orphanEmbeddings > 0) {
        this.db.run(`DELETE FROM embeddings WHERE ${where}`);
      }
    }
    let compacted = false;
    if (compact && !dryRun) {
      try {
        this.db.run("VACUUM");
        compacted = true;
      } catch {
        compacted = false;
      }
    }
    if (!dryRun && (expiredLayerEntries > 0 || orphanLinks > 0 || orphanEmbeddings > 0 || compacted)) {
      this.logEvent("storage.maintenance", {
        expiredLayerEntries,
        orphanLinks,
        orphanEmbeddings,
        compacted,
        scoped: opts ?? {}
      });
      this.persist();
    }
    return {
      checkedAt,
      dryRun,
      expiredLayerEntries,
      orphanLinks,
      orphanEmbeddings,
      compacted,
      scoped: opts ?? {}
    };
  }
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
  async semanticQuery(queryText, queryVector, opts, scope) {
    this.ensureInitialized();
    const limit = opts?.limit ?? 10;
    let sql = "SELECT id, content, topics, metadata, created_at, accessed_at, access_count FROM memory m WHERE 1=1";
    const params = [];
    if (scope?.workspaceId) {
      sql += " AND (m.workspace_id = ? OR m.workspace_id IS NULL)";
      params.push(scope.workspaceId);
    }
    if (scope?.agentId) {
      sql += " AND (m.agent_id = ? OR m.agent_id IS NULL)";
      params.push(scope.agentId);
    }
    if (scope?.userId) {
      sql += " AND (m.user_id = ? OR m.user_id IS NULL)";
      params.push(scope.userId);
    }
    if (opts?.since) {
      sql += " AND m.created_at >= ?";
      params.push(opts.since);
    }
    if (opts?.until) {
      sql += " AND m.created_at <= ?";
      params.push(opts.until);
    }
    const result = this.db.exec(sql, params);
    if (result.length === 0) return { results: [], totalAvailable: 0 };
    const rows = result[0].values;
    const scoredResults = [];
    for (const row of rows) {
      const [id, content, topics, metadata, createdAt, accessedAt, accessCount] = row;
      const topicArr = typeof topics === "string" ? JSON.parse(topics) : topics;
      const metadataObj = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
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
        metadata: metadataObj,
        relevanceScore,
        createdAt,
        accessedAt,
        accessCount
      });
    }
    const filteredResults = scoredResults.filter((entry) => !opts?.topics || this.matchTopics(entry.topics, opts.topics)).filter((entry) => !opts?.minAccessCount || entry.accessCount >= opts.minAccessCount).filter((entry) => !opts?.metadata || this.matchMetadata(entry.metadata ?? {}, opts.metadata));
    filteredResults.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    const totalAvailable = filteredResults.length;
    const limited = filteredResults.slice(0, limit);
    return { results: limited, totalAvailable };
  }
  getEventLog(limit = 100) {
    return this.eventLog.slice(0, limit);
  }
  persist() {
    if (!this.db || this.dbPath === ":memory:") return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tmpPath = `${this.dbPath}.tmp`;
      (0, import_node_fs.writeFileSync)(tmpPath, buffer);
      (0, import_node_fs.renameSync)(tmpPath, this.dbPath);
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
  ensureColumn(table, column, definition) {
    if (!this.db) return;
    const info = this.db.exec(`PRAGMA table_info(${table})`);
    const exists = info[0]?.values.some((row) => row[1] === column) ?? false;
    if (!exists) this.db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  countRows(sql, params = []) {
    const result = this.db.exec(sql, params);
    return Number(result[0]?.values[0]?.[0] ?? 0);
  }
  scopeClause(opts, workspaceColumn, agentColumn, userColumn) {
    const conditions = [];
    const params = [];
    if (opts?.workspaceId) {
      conditions.push(`${workspaceColumn} = ?`);
      params.push(opts.workspaceId);
    }
    if (opts?.agentId) {
      conditions.push(`${agentColumn} = ?`);
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      conditions.push(`${userColumn} = ?`);
      params.push(opts.userId);
    }
    return { conditions, params };
  }
  snapshotChecksum(snapshotData) {
    return (0, import_crypto2.createHash)("sha256").update(JSON.stringify(snapshotData)).digest("hex");
  }
  async loadAllLinks(opts) {
    this.ensureInitialized();
    let sql = "SELECT * FROM memory_links WHERE 1=1";
    const params = [];
    if (opts?.workspaceId) {
      sql += " AND (workspace_id = ? OR workspace_id IS NULL)";
      params.push(opts.workspaceId);
    }
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
    return result[0].values.map((v) => this.rowToLink(result[0].columns, v));
  }
  async restoreLink(link, opts) {
    this.ensureInitialized();
    const validated = memoryLinkSchema.parse(link);
    this.db.run(
      `INSERT OR REPLACE INTO memory_links (id, from_id, to_id, type, metadata, created_at, workspace_id, agent_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.id,
        validated.fromId,
        validated.toId,
        validated.type,
        JSON.stringify(validated.metadata),
        validated.createdAt,
        opts?.workspaceId ?? null,
        opts?.agentId ?? null,
        opts?.userId ?? null
      ]
    );
  }
  rowToLink(columns, values) {
    const obj = this.rowToObject(columns, values);
    return memoryLinkSchema.parse({
      id: obj["id"],
      fromId: obj["from_id"],
      toId: obj["to_id"],
      type: obj["type"],
      metadata: typeof obj["metadata"] === "string" ? JSON.parse(obj["metadata"]) : obj["metadata"],
      createdAt: obj["createdAt"]
    });
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
  matchMetadata(entryMetadata, filters) {
    return Object.entries(filters).every(([key, expected]) => this.matchMetadataValue(entryMetadata[key], expected));
  }
  matchMetadataValue(actual, expected) {
    if (expected === null || typeof expected !== "object" || Array.isArray(expected)) {
      if (expected === null) return actual === null || actual === void 0;
      return actual === expected;
    }
    if ("exists" in expected && expected.exists !== void 0) {
      const exists = actual !== void 0 && actual !== null;
      if (exists !== expected.exists) return false;
    }
    if ("eq" in expected && expected.eq !== void 0) {
      if (!this.matchMetadataValue(actual, expected.eq)) return false;
    }
    if ("in" in expected && expected.in) {
      if (!expected.in.some((candidate) => this.matchMetadataValue(actual, candidate))) return false;
    }
    if ("contains" in expected && expected.contains !== void 0) {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected.contains)) return false;
      } else if (typeof actual === "string") {
        if (!actual.includes(String(expected.contains))) return false;
      } else {
        return false;
      }
    }
    if (typeof actual === "number") {
      if ("gt" in expected && expected.gt !== void 0 && !(actual > expected.gt)) return false;
      if ("gte" in expected && expected.gte !== void 0 && !(actual >= expected.gte)) return false;
      if ("lt" in expected && expected.lt !== void 0 && !(actual < expected.lt)) return false;
      if ("lte" in expected && expected.lte !== void 0 && !(actual <= expected.lte)) return false;
    } else if ("gt" in expected && expected.gt !== void 0 || "gte" in expected && expected.gte !== void 0 || "lt" in expected && expected.lt !== void 0 || "lte" in expected && expected.lte !== void 0) {
      return false;
    }
    return true;
  }
  matchTopics(entryTopics, requestedTopics) {
    return requestedTopics.some((topic) => entryTopics.includes(topic));
  }
  simpleRelevance(content, query) {
    const lower = content.toLowerCase();
    const terms = query.toLowerCase().split(/\s+/);
    const matches = terms.filter((t) => lower.includes(t)).length;
    return matches / terms.length;
  }
  exactTokenRelevance(content, query) {
    const tokenize = (value) => value.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return 0;
    const contentTokens = new Set(tokenize(content));
    const matches = queryTokens.filter((token) => contentTokens.has(token)).length;
    return matches / queryTokens.length;
  }
};

// src/postgres-store.ts
var import_crypto3 = require("crypto");
var PostgresMemoryStore = class {
  pool = null;
  ownsPool = false;
  initialized = false;
  eventLog = [];
  schema;
  tablePrefix;
  config;
  pgvectorAvailable = false;
  constructor(config = {}) {
    this.config = typeof config === "string" ? { connectionString: config } : config;
    this.schema = this.safeIdentifier(this.config.schema ?? "public");
    this.tablePrefix = this.config.tablePrefix ? this.safeIdentifier(this.config.tablePrefix) : "";
  }
  async init() {
    if (this.initialized) return;
    if (this.config.pool) {
      this.pool = this.config.pool;
    } else {
      const pg = await import("pg").catch(() => {
        throw new Error('PostgreSQL storage requires the optional "pg" package. Install it with: npm install pg');
      });
      const PoolCtor = pg.Pool ?? pg.default?.Pool;
      if (!PoolCtor) throw new Error("PostgreSQL storage could not load pg.Pool");
      this.pool = new PoolCtor({ connectionString: this.config.connectionString, ssl: this.config.ssl });
      this.ownsPool = true;
    }
    await this.initTables();
    this.initialized = true;
  }
  supportsNativeVectorSearch() {
    return this.pgvectorAvailable;
  }
  safeIdentifier(value) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Invalid PostgreSQL identifier: ${value}`);
    return value;
  }
  table(name) {
    return `"${this.schema}"."${this.tablePrefix}${name}"`;
  }
  ensureInitialized() {
    if (!this.pool) throw new Error("PostgresMemoryStore not initialized. Call await memoryStore.init() first.");
  }
  async pgQuery(text, params = [], client) {
    this.ensureInitialized();
    return (client ?? this.pool).query(text, params);
  }
  async initTables() {
    await this.pgQuery(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table("memory")} (
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
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_created_at" ON ${this.table("memory")} (created_at DESC)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_accessed_at" ON ${this.table("memory")} (accessed_at DESC)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_agent" ON ${this.table("memory")} (agent_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_user" ON ${this.table("memory")} (user_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_memory_topics" ON ${this.table("memory")} USING GIN (topics)`);
    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table("memory_links")} (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        type TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at BIGINT NOT NULL,
        agent_id TEXT,
        user_id TEXT
      )
    `);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_ml_from" ON ${this.table("memory_links")} (from_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_ml_to" ON ${this.table("memory_links")} (to_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_ml_type" ON ${this.table("memory_links")} (type)`);
    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table("layered_memories")} (
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
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_layer" ON ${this.table("layered_memories")} (layer)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_expires" ON ${this.table("layered_memories")} (expires_at)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_agent" ON ${this.table("layered_memories")} (agent_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_supersedes" ON ${this.table("layered_memories")} (supersedes)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_lm_superseded_by" ON ${this.table("layered_memories")} (superseded_by)`);
    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table("snapshots")} (
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
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_snap_agent" ON ${this.table("snapshots")} (agent_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_snap_created" ON ${this.table("snapshots")} (created_at DESC)`);
    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table("embeddings")} (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        vector_base64 TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        model TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        embedding_type TEXT NOT NULL DEFAULT 'memory'
      )
    `);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_emb_memory" ON ${this.table("embeddings")} (memory_id)`);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_emb_type" ON ${this.table("embeddings")} (embedding_type)`);
    await this.maybeEnablePgvector();
    await this.pgQuery(`
      CREATE TABLE IF NOT EXISTS ${this.table("events")} (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        payload JSONB NOT NULL
      )
    `);
    await this.pgQuery(`CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_events_timestamp" ON ${this.table("events")} (timestamp DESC)`);
  }
  async store(input2, opts) {
    const now = Date.now();
    const validated = memoryEntrySchema.parse({
      id: (0, import_crypto3.randomUUID)(),
      content: input2.content,
      topics: input2.topics ?? [],
      metadata: input2.metadata ?? {},
      createdAt: now,
      accessedAt: now,
      accessCount: 0
    });
    await this.pgQuery(
      `INSERT INTO ${this.table("memory")} (id, content, topics, metadata, created_at, accessed_at, access_count, agent_id, user_id)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9)`,
      [validated.id, validated.content, JSON.stringify(validated.topics), JSON.stringify(validated.metadata), validated.createdAt, validated.accessedAt, validated.accessCount, opts?.agentId ?? null, opts?.userId ?? null]
    );
    await this.logEvent("memory.stored", { entry: validated });
    return validated;
  }
  async get(id, opts) {
    const where = ["id = $1"];
    const params = [id];
    let idx = 2;
    if (opts?.agentId) {
      where.push(`(agent_id = $${idx} OR agent_id IS NULL)`);
      params.push(opts.agentId);
      idx++;
    }
    if (opts?.userId) {
      where.push(`(user_id = $${idx} OR user_id IS NULL)`);
      params.push(opts.userId);
      idx++;
    }
    const result = await this.pgQuery(
      `SELECT * FROM ${this.table("memory")} WHERE ${where.join(" AND ")}`,
      params
    );
    if (result.rowCount === 0) return null;
    await this.pgQuery(`UPDATE ${this.table("memory")} SET access_count = access_count + 1, accessed_at = $1 WHERE id = $2`, [Date.now(), id]);
    await this.logEvent("memory.accessed", { id });
    return memoryEntrySchema.parse(this.rowToMemory(result.rows[0]));
  }
  async query(text, options, scope) {
    const opts = queryOptionsSchema.parse(options ?? {});
    const where = ["content ILIKE $1"];
    const params = [`%${text}%`];
    let idx = 2;
    if (scope?.agentId) {
      where.push(`(agent_id = $${idx} OR agent_id IS NULL)`);
      params.push(scope.agentId);
      idx++;
    }
    if (scope?.userId) {
      where.push(`(user_id = $${idx} OR user_id IS NULL)`);
      params.push(scope.userId);
      idx++;
    }
    if (opts.topics && opts.topics.length > 0) {
      where.push(`topics ?| $${idx}::text[]`);
      params.push(opts.topics);
      idx++;
    }
    if (opts.since) {
      where.push(`created_at >= $${idx++}`);
      params.push(opts.since);
    }
    if (opts.until) {
      where.push(`created_at <= $${idx++}`);
      params.push(opts.until);
    }
    if (opts.minAccessCount) {
      where.push(`access_count >= $${idx++}`);
      params.push(opts.minAccessCount);
    }
    if (opts.metadata && Object.keys(opts.metadata).length > 0) {
      where.push(`metadata @> $${idx}::jsonb`);
      params.push(JSON.stringify(opts.metadata));
      idx++;
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;
    const count = await this.pgQuery(`SELECT COUNT(*)::text AS count FROM ${this.table("memory")} ${whereSql}`, params);
    const totalAvailable = Number(count.rows[0]?.count ?? 0);
    params.push(opts.limit);
    const result = await this.pgQuery(
      `SELECT * FROM ${this.table("memory")} ${whereSql} ORDER BY access_count DESC, accessed_at DESC LIMIT $${idx}`,
      params
    );
    const results = result.rows.map((row) => {
      const entry = memoryEntrySchema.parse(this.rowToMemory(row));
      return this.toQueryResult(entry, this.simpleRelevance(entry.content, text));
    });
    await this.logEvent("memory.queried", { text, options: opts, resultCount: results.length });
    return { results, totalAvailable };
  }
  async getAllEntries(opts) {
    const { where, params } = this.scopeWhere(opts);
    const result = await this.pgQuery(`SELECT * FROM ${this.table("memory")} ${where} ORDER BY created_at DESC`, params);
    return result.rows.map((row) => this.toQueryResult(memoryEntrySchema.parse(this.rowToMemory(row)), 0));
  }
  async getRecent(n = 10, opts) {
    const { where, params } = this.scopeWhere(opts);
    const result = await this.pgQuery(`SELECT * FROM ${this.table("memory")} ${where} ORDER BY accessed_at DESC LIMIT $${params.length + 1}`, [...params, n]);
    return result.rows.map((row) => this.toQueryResult(memoryEntrySchema.parse(this.rowToMemory(row))));
  }
  async getByTopic(topic, limit = 20, opts) {
    const { where, params } = this.scopeWhere(opts);
    const whereSql = where ? `${where} AND topics ? $${params.length + 1}` : `WHERE topics ? $1`;
    const result = await this.pgQuery(
      `SELECT * FROM ${this.table("memory")} ${whereSql} ORDER BY accessed_at DESC LIMIT $${params.length + 2}`,
      [...params, topic, limit]
    );
    return result.rows.map((row) => this.toQueryResult(memoryEntrySchema.parse(this.rowToMemory(row))));
  }
  async forget(id, opts) {
    const where = ["id = $1"];
    const params = [id];
    let idx = 2;
    if (opts?.agentId) {
      where.push(`(agent_id = $${idx} OR agent_id IS NULL)`);
      params.push(opts.agentId);
      idx++;
    }
    if (opts?.userId) {
      where.push(`(user_id = $${idx} OR user_id IS NULL)`);
      params.push(opts.userId);
      idx++;
    }
    const result = await this.pgQuery(`DELETE FROM ${this.table("memory")} WHERE ${where.join(" AND ")}`, params);
    const forgotten = (result.rowCount ?? 0) > 0;
    if (forgotten) await this.logEvent("memory.forgotten", { id });
    return forgotten;
  }
  async createLink(input2, opts) {
    const validated = memoryLinkInputSchema.parse(input2);
    const link = memoryLinkSchema.parse({
      id: (0, import_crypto3.randomUUID)(),
      fromId: validated.fromId,
      toId: validated.toId,
      type: validated.type,
      metadata: validated.metadata ?? {},
      createdAt: Date.now()
    });
    await this.pgQuery(
      `INSERT INTO ${this.table("memory_links")} (id, from_id, to_id, type, metadata, created_at, agent_id, user_id)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)`,
      [link.id, link.fromId, link.toId, link.type, JSON.stringify(link.metadata), link.createdAt, opts?.agentId ?? null, opts?.userId ?? null]
    );
    await this.logEvent("memory.linked", { link });
    return link;
  }
  async getLinks(memoryId, options, opts) {
    const query = linkedMemoryQueryOptionsSchema.parse(options ?? {});
    const where = [];
    const params = [];
    let idx = 1;
    if (query.direction === "outgoing") {
      where.push(`from_id = $${idx++}`);
      params.push(memoryId);
    } else if (query.direction === "incoming") {
      where.push(`to_id = $${idx++}`);
      params.push(memoryId);
    } else {
      where.push(`(from_id = $${idx} OR to_id = $${idx + 1})`);
      params.push(memoryId, memoryId);
      idx += 2;
    }
    if (query.types && query.types.length > 0) {
      where.push(`type = ANY($${idx++}::text[])`);
      params.push(query.types);
    }
    if (opts?.agentId) {
      where.push(`(agent_id = $${idx} OR agent_id IS NULL)`);
      params.push(opts.agentId);
      idx++;
    }
    if (opts?.userId) {
      where.push(`(user_id = $${idx} OR user_id IS NULL)`);
      params.push(opts.userId);
      idx++;
    }
    params.push(query.limit, query.offset);
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = await this.pgQuery(
      `SELECT * FROM ${this.table("memory_links")} ${whereSql} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    return result.rows.map((row) => this.rowToLink(row));
  }
  async deleteLink(linkId) {
    const result = await this.pgQuery(`DELETE FROM ${this.table("memory_links")} WHERE id = $1`, [linkId]);
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) await this.logEvent("memory.unlinked", { linkId });
    return deleted;
  }
  async getEntryById(id, opts) {
    const memoryWhere = ["id = $1"];
    const memoryParams = [id];
    let idx = 2;
    if (opts?.agentId) {
      memoryWhere.push(`(agent_id = $${idx} OR agent_id IS NULL)`);
      memoryParams.push(opts.agentId);
      idx++;
    }
    if (opts?.userId) {
      memoryWhere.push(`(user_id = $${idx} OR user_id IS NULL)`);
      memoryParams.push(opts.userId);
      idx++;
    }
    let result = await this.pgQuery(`SELECT * FROM ${this.table("memory")} WHERE ${memoryWhere.join(" AND ")}`, memoryParams);
    if ((result.rowCount ?? 0) > 0) {
      return this.toQueryResult(memoryEntrySchema.parse(this.rowToMemory(result.rows[0])));
    }
    const layeredWhere = ["id = $1"];
    const layeredParams = [id];
    let layeredIdx = 2;
    if (opts?.agentId) {
      layeredWhere.push(`(agent_id = $${layeredIdx} OR agent_id IS NULL)`);
      layeredParams.push(opts.agentId);
      layeredIdx++;
    }
    if (opts?.userId) {
      layeredWhere.push(`(user_id = $${layeredIdx} OR user_id IS NULL)`);
      layeredParams.push(opts.userId);
      layeredIdx++;
    }
    result = await this.pgQuery(`SELECT * FROM ${this.table("layered_memories")} WHERE ${layeredWhere.join(" AND ")}`, layeredParams);
    if ((result.rowCount ?? 0) === 0) return null;
    const entry = this.rowToLayerEntry(result.rows[0]);
    return {
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount
    };
  }
  async persistLayerEntry(entry, opts) {
    await this.pgQuery(
      `INSERT INTO ${this.table("layered_memories")}
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
  async loadAllLayerEntries(opts) {
    const { where, params } = this.scopeWhere(opts);
    const result = await this.pgQuery(`SELECT * FROM ${this.table("layered_memories")} ${where} ORDER BY created_at DESC`, params);
    return result.rows.map((row) => this.rowToLayerEntry(row));
  }
  async forgetLayerEntry(id) {
    const result = await this.pgQuery(`DELETE FROM ${this.table("layered_memories")} WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
  async loadAllMemoryEntries(opts) {
    const { where, params } = this.scopeWhere(opts);
    const result = await this.pgQuery(`SELECT * FROM ${this.table("memory")} ${where} ORDER BY created_at DESC`, params);
    return result.rows.map((row) => memoryEntrySchema.parse(this.rowToMemory(row)));
  }
  async restoreMemoryEntry(entry, opts, client) {
    const validated = memoryEntrySchema.parse(entry);
    await this.pgQuery(
      `INSERT INTO ${this.table("memory")} (id, content, topics, metadata, created_at, accessed_at, access_count, agent_id, user_id)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content, topics=EXCLUDED.topics, metadata=EXCLUDED.metadata,
        created_at=EXCLUDED.created_at, accessed_at=EXCLUDED.accessed_at, access_count=EXCLUDED.access_count,
        agent_id=EXCLUDED.agent_id, user_id=EXCLUDED.user_id`,
      [validated.id, validated.content, JSON.stringify(validated.topics), JSON.stringify(validated.metadata), validated.createdAt, validated.accessedAt, validated.accessCount, opts?.agentId ?? null, opts?.userId ?? null],
      client
    );
  }
  async createSnapshot(label, opts) {
    const now = Date.now();
    const id = (0, import_crypto3.randomUUID)();
    const layerEntries = await this.loadAllLayerEntries(opts);
    const coreEntries = await this.loadAllMemoryEntries(opts);
    const links = await this.loadAllLinks(opts);
    const snapshotData = { version: "0.8.0", createdAt: now, layerEntries, coreEntries, links, eventCount: this.eventLog.length };
    const checksum = this.snapshotChecksum(snapshotData);
    const layerCounts = { episodic: 0, semantic: 0, identity: 0, procedural: 0 };
    for (const entry of layerEntries) if (entry.layer in layerCounts) layerCounts[entry.layer]++;
    await this.pgQuery(
      `INSERT INTO ${this.table("snapshots")} (id, label, snapshot_data, memory_count, created_at, agent_id, user_id, checksum)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)`,
      [id, label, JSON.stringify(snapshotData), layerEntries.length + coreEntries.length, now, opts?.agentId ?? null, opts?.userId ?? null, checksum]
    );
    await this.logEvent("snapshot.created", { id, label, memoryCount: layerEntries.length + coreEntries.length, checksum });
    return { id, label, createdAt: now, memoryCount: layerEntries.length + coreEntries.length, layerCounts, checksum, workspaceId: opts?.workspaceId ?? null, agentId: opts?.agentId ?? null, userId: opts?.userId ?? null };
  }
  async restoreSnapshot(snapshotId, opts) {
    const result = await this.pgQuery(`SELECT snapshot_data, checksum FROM ${this.table("snapshots")} WHERE id = $1`, [snapshotId]);
    if (result.rowCount === 0) throw new Error(`Snapshot not found: ${snapshotId}`);
    const snapshotData = this.parseJson(result.rows[0].snapshot_data);
    const checksum = result.rows[0].checksum;
    if (checksum && this.snapshotChecksum(snapshotData) !== checksum) throw new Error(`Snapshot checksum mismatch: ${snapshotId}`);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.clearScoped(opts, client);
      let restored = 0;
      for (const entry of snapshotData.coreEntries ?? []) {
        await this.restoreMemoryEntry(entry, opts, client);
        restored++;
      }
      for (const entry of snapshotData.layerEntries) {
        await this.persistLayerEntryWithClient(entry, opts, client);
        restored++;
      }
      for (const link of snapshotData.links ?? []) {
        await this.restoreLinkWithClient(link, opts, client);
      }
      await client.query("COMMIT");
      await this.logEvent("snapshot.restored", { snapshotId, restored });
      return restored;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  async listSnapshots(opts) {
    const { where, params } = this.scopeWhere(opts);
    const result = await this.pgQuery(`SELECT id, label, memory_count, created_at, agent_id, user_id, checksum FROM ${this.table("snapshots")} ${where} ORDER BY created_at DESC`, params);
    return result.rows.map((row) => ({
      id: row.id,
      label: row.label,
      createdAt: Number(row.created_at),
      memoryCount: Number(row.memory_count),
      layerCounts: { episodic: 0, semantic: 0, identity: 0, procedural: 0 },
      checksum: row.checksum,
      workspaceId: null,
      agentId: row.agent_id,
      userId: row.user_id
    }));
  }
  async exportSnapshot(snapshotId) {
    const result = await this.pgQuery(`SELECT * FROM ${this.table("snapshots")} WHERE id = $1`, [snapshotId]);
    if (result.rowCount === 0) throw new Error(`Snapshot not found: ${snapshotId}`);
    const row = result.rows[0];
    const snapshotData = this.parseJson(row.snapshot_data);
    const checksum = row.checksum ?? this.snapshotChecksum(snapshotData);
    if (this.snapshotChecksum(snapshotData) !== checksum) throw new Error(`Snapshot checksum mismatch: ${snapshotId}`);
    return { id: row.id, label: row.label, createdAt: Number(row.created_at), memoryCount: Number(row.memory_count), checksum, workspaceId: null, agentId: row.agent_id, userId: row.user_id, snapshotData };
  }
  async importSnapshot(snapshot, opts) {
    const checksum = this.snapshotChecksum(snapshot.snapshotData);
    if (checksum !== snapshot.checksum) throw new Error("Snapshot import checksum mismatch");
    const existing = await this.pgQuery(`SELECT id FROM ${this.table("snapshots")} WHERE id = $1`, [snapshot.id]);
    if ((existing.rowCount ?? 0) > 0 && !opts?.overwrite) throw new Error(`Snapshot already exists: ${snapshot.id}`);
    await this.pgQuery(
      `INSERT INTO ${this.table("snapshots")} (id, label, snapshot_data, memory_count, created_at, agent_id, user_id, checksum)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, snapshot_data=EXCLUDED.snapshot_data, memory_count=EXCLUDED.memory_count,
        created_at=EXCLUDED.created_at, agent_id=EXCLUDED.agent_id, user_id=EXCLUDED.user_id, checksum=EXCLUDED.checksum`,
      [snapshot.id, snapshot.label, JSON.stringify(snapshot.snapshotData), snapshot.memoryCount, snapshot.createdAt, snapshot.agentId, snapshot.userId, checksum]
    );
    return { id: snapshot.id, label: snapshot.label, createdAt: snapshot.createdAt, memoryCount: snapshot.memoryCount, layerCounts: { episodic: 0, semantic: 0, identity: 0, procedural: 0 }, checksum, workspaceId: snapshot.workspaceId, agentId: snapshot.agentId, userId: snapshot.userId };
  }
  async deleteSnapshot(snapshotId) {
    const result = await this.pgQuery(`DELETE FROM ${this.table("snapshots")} WHERE id = $1`, [snapshotId]);
    return (result.rowCount ?? 0) > 0;
  }
  async maintenance(options = {}, opts) {
    const checkedAt = options.now ?? Date.now();
    const dryRun = options.dryRun === true;
    const pruneExpired = options.pruneExpired !== false;
    const pruneOrphanLinks = options.pruneOrphanLinks !== false;
    const pruneOrphanEmbeddings = options.pruneOrphanEmbeddings !== false;
    const compact = options.compact === true;
    let expiredLayerEntries = 0;
    let orphanLinks = 0;
    let orphanEmbeddings = 0;
    const scoped = this.exactScopeConditions(opts, 2);
    if (pruneExpired) {
      const conditions = ["expires_at IS NOT NULL", "expires_at <= $1", ...scoped.conditions];
      const params = [checkedAt, ...scoped.params];
      expiredLayerEntries = await this.countPgRows(`SELECT COUNT(*)::text AS count FROM ${this.table("layered_memories")} WHERE ${conditions.join(" AND ")}`, params);
      if (!dryRun && expiredLayerEntries > 0) {
        await this.pgQuery(`DELETE FROM ${this.table("layered_memories")} WHERE ${conditions.join(" AND ")}`, params);
      }
    }
    if (pruneOrphanLinks) {
      const scopedLinks = this.exactScopeConditions(opts, 1);
      const orphanWhere = "(NOT EXISTS (SELECT 1 FROM " + this.table("memory") + " m WHERE m.id = ml.from_id) OR NOT EXISTS (SELECT 1 FROM " + this.table("memory") + " m WHERE m.id = ml.to_id))";
      const conditions = [orphanWhere, ...scopedLinks.conditions];
      orphanLinks = await this.countPgRows(`SELECT COUNT(*)::text AS count FROM ${this.table("memory_links")} ml WHERE ${conditions.join(" AND ")}`, scopedLinks.params);
      if (!dryRun && orphanLinks > 0) {
        await this.pgQuery(`DELETE FROM ${this.table("memory_links")} ml WHERE ${conditions.join(" AND ")}`, scopedLinks.params);
      }
    }
    if (pruneOrphanEmbeddings) {
      const memorySql = `SELECT 1 FROM ${this.table("memory")} m WHERE m.id = e.memory_id`;
      const layerSql = `SELECT 1 FROM ${this.table("layered_memories")} m WHERE m.id = e.memory_id`;
      const where = `NOT EXISTS (${memorySql}) AND NOT EXISTS (${layerSql})`;
      orphanEmbeddings = await this.countPgRows(`SELECT COUNT(*)::text AS count FROM ${this.table("embeddings")} e WHERE ${where}`);
      if (!dryRun && orphanEmbeddings > 0) {
        await this.pgQuery(`DELETE FROM ${this.table("embeddings")} e WHERE ${where}`);
      }
    }
    let compacted = false;
    if (compact && !dryRun) {
      await Promise.all([
        this.pgQuery(`VACUUM (ANALYZE) ${this.table("memory")}`).catch(() => void 0),
        this.pgQuery(`VACUUM (ANALYZE) ${this.table("layered_memories")}`).catch(() => void 0),
        this.pgQuery(`VACUUM (ANALYZE) ${this.table("memory_links")}`).catch(() => void 0),
        this.pgQuery(`VACUUM (ANALYZE) ${this.table("embeddings")}`).catch(() => void 0)
      ]);
      compacted = true;
    }
    if (!dryRun && (expiredLayerEntries > 0 || orphanLinks > 0 || orphanEmbeddings > 0 || compacted)) {
      await this.logEvent("storage.maintenance", {
        expiredLayerEntries,
        orphanLinks,
        orphanEmbeddings,
        compacted,
        scoped: opts ?? {}
      });
    }
    return {
      checkedAt,
      dryRun,
      expiredLayerEntries,
      orphanLinks,
      orphanEmbeddings,
      compacted,
      scoped: opts ?? {}
    };
  }
  async storeEmbedding(memoryId, base64, dimension, model, type = "memory") {
    const vectorValue = this.pgvectorAvailable ? this.toPgvectorLiteral(EmbeddingService.decodeVector(base64, dimension)) : null;
    await this.pgQuery(
      `INSERT INTO ${this.table("embeddings")} (id, memory_id, vector_base64, dimension, model, created_at, embedding_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET memory_id=EXCLUDED.memory_id, vector_base64=EXCLUDED.vector_base64,
        dimension=EXCLUDED.dimension, model=EXCLUDED.model, embedding_type=EXCLUDED.embedding_type`,
      [(0, import_crypto3.randomUUID)(), memoryId, base64, dimension, model, Date.now(), type]
    );
    if (this.pgvectorAvailable && vectorValue) {
      await this.pgQuery(
        `UPDATE ${this.table("embeddings")} SET vector_value = $1::vector WHERE memory_id = $2 AND embedding_type = $3`,
        [vectorValue, memoryId, type]
      ).catch(() => void 0);
    }
  }
  async getEmbedding(memoryId) {
    const result = await this.pgQuery(`SELECT vector_base64, dimension FROM ${this.table("embeddings")} WHERE memory_id = $1 LIMIT 1`, [memoryId]);
    if (result.rowCount === 0) return null;
    return { base64: result.rows[0].vector_base64, dimension: Number(result.rows[0].dimension) };
  }
  async deleteEmbedding(memoryId) {
    await this.pgQuery(`DELETE FROM ${this.table("embeddings")} WHERE memory_id = $1`, [memoryId]);
  }
  async semanticQuery(queryText, queryVector, opts, scope) {
    if (queryVector && this.pgvectorAvailable) {
      const native = await this.semanticQueryPgvector(queryText, queryVector, opts, scope);
      if (native) return native;
    }
    const limit = opts?.limit ?? 10;
    const where = [];
    const params = [];
    let idx = 1;
    if (scope?.agentId) {
      where.push(`(agent_id = $${idx} OR agent_id IS NULL)`);
      params.push(scope.agentId);
      idx++;
    }
    if (scope?.userId) {
      where.push(`(user_id = $${idx} OR user_id IS NULL)`);
      params.push(scope.userId);
      idx++;
    }
    if (opts?.topics && opts.topics.length > 0) {
      where.push(`topics ?| $${idx}::text[]`);
      params.push(opts.topics);
      idx++;
    }
    if (opts?.since) {
      where.push(`created_at >= $${idx++}`);
      params.push(opts.since);
    }
    if (opts?.until) {
      where.push(`created_at <= $${idx++}`);
      params.push(opts.until);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = await this.pgQuery(`SELECT id, content, topics, metadata, created_at, accessed_at, access_count FROM ${this.table("memory")} ${whereSql}`, params);
    const scored = [];
    for (const row of result.rows) {
      let relevanceScore;
      const embedding = await this.getEmbedding(row.id);
      const metadata = this.parseJson(row.metadata);
      if (queryVector && embedding) {
        try {
          relevanceScore = EmbeddingService.cosineSimilarity(queryVector, EmbeddingService.decodeVector(embedding.base64, embedding.dimension));
        } catch {
          relevanceScore = this.simpleRelevance(row.content, queryText);
        }
      } else {
        relevanceScore = this.simpleRelevance(row.content, queryText);
      }
      scored.push({ id: row.id, content: row.content, topics: this.parseJson(row.topics), metadata, relevanceScore, createdAt: Number(row.created_at), accessedAt: Number(row.accessed_at), accessCount: Number(row.access_count) });
    }
    const filtered = scored.filter((entry) => !opts?.metadata || this.matchMetadata(entry.metadata ?? {}, opts.metadata)).filter((entry) => !opts?.minAccessCount || entry.accessCount >= opts.minAccessCount);
    filtered.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    return { results: filtered.slice(0, limit), totalAvailable: filtered.length };
  }
  async maybeEnablePgvector() {
    if (!this.config.pgvector?.enabled) return;
    try {
      await this.pgQuery("CREATE EXTENSION IF NOT EXISTS vector");
      const ext = await this.pgQuery("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists");
      this.pgvectorAvailable = Boolean(ext.rows[0]?.exists);
      if (!this.pgvectorAvailable) return;
      await this.ensureVectorColumn();
      await this.backfillVectorRows();
      await this.ensureVectorIndexes();
    } catch {
      this.pgvectorAvailable = false;
    }
  }
  async ensureVectorColumn() {
    await this.pgQuery(`ALTER TABLE ${this.table("embeddings")} ADD COLUMN IF NOT EXISTS vector_value vector`);
  }
  async backfillVectorRows() {
    const rows = await this.pgQuery(
      `SELECT memory_id, vector_base64, dimension FROM ${this.table("embeddings")} WHERE vector_value IS NULL`
    );
    for (const row of rows.rows) {
      try {
        const decoded = EmbeddingService.decodeVector(row.vector_base64, Number(row.dimension));
        await this.pgQuery(
          `UPDATE ${this.table("embeddings")} SET vector_value = $1::vector WHERE memory_id = $2`,
          [this.toPgvectorLiteral(decoded), row.memory_id]
        );
      } catch {
      }
    }
  }
  async ensureVectorIndexes() {
    const embeddingType = this.config.pgvector?.embeddingType ?? "memory";
    const lists = this.config.pgvector?.ivfflatLists ?? 100;
    const targets = embeddingType === "both" ? ["memory", "layered"] : [embeddingType];
    for (const target of targets) {
      await this.pgQuery(
        `CREATE INDEX IF NOT EXISTS "${this.tablePrefix}idx_emb_${target}_vector_ivfflat" ON ${this.table("embeddings")} USING ivfflat (vector_value vector_cosine_ops) WITH (lists = ${lists}) WHERE embedding_type = '${target}' AND vector_value IS NOT NULL`
      );
    }
  }
  async semanticQueryPgvector(_queryText, queryVector, opts, scope) {
    const limit = opts?.limit ?? 10;
    const vectorLiteral = this.toPgvectorLiteral(queryVector);
    const embeddingType = this.config.pgvector?.embeddingType ?? "memory";
    if (embeddingType !== "memory" && embeddingType !== "both") return null;
    const where = [];
    const params = [vectorLiteral];
    let idx = 2;
    if (scope?.agentId) {
      where.push(`(m.agent_id = $${idx} OR m.agent_id IS NULL)`);
      params.push(scope.agentId);
      idx++;
    }
    if (scope?.userId) {
      where.push(`(m.user_id = $${idx} OR m.user_id IS NULL)`);
      params.push(scope.userId);
      idx++;
    }
    if (opts?.topics && opts.topics.length > 0) {
      where.push(`m.topics ?| $${idx}::text[]`);
      params.push(opts.topics);
      idx++;
    }
    if (opts?.since) {
      where.push(`m.created_at >= $${idx++}`);
      params.push(opts.since);
    }
    if (opts?.until) {
      where.push(`m.created_at <= $${idx++}`);
      params.push(opts.until);
    }
    if (opts?.minAccessCount) {
      where.push(`m.access_count >= $${idx++}`);
      params.push(opts.minAccessCount);
    }
    if (opts?.metadata && Object.keys(opts.metadata).length > 0) {
      where.push(`m.metadata @> $${idx}::jsonb`);
      params.push(JSON.stringify(opts.metadata));
      idx++;
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const filterSql = where.length ? `AND ${where.join(" AND ")}` : "";
    const count = await this.pgQuery(`SELECT COUNT(*)::text AS count FROM ${this.table("memory")} m ${whereSql}`, params.slice(1));
    const result = await this.pgQuery(
      `SELECT m.id, m.content, m.topics, m.metadata, m.created_at, m.accessed_at, m.access_count,
              1 - (e.vector_value <=> $1::vector) AS semantic_score
         FROM ${this.table("memory")} m
         JOIN ${this.table("embeddings")} e ON e.memory_id = m.id
        WHERE e.embedding_type = 'memory' AND e.vector_value IS NOT NULL ${filterSql}
        ORDER BY e.vector_value <=> $1::vector ASC
        LIMIT ${limit}`,
      params
    );
    return {
      results: result.rows.map((row) => ({
        id: row.id,
        content: row.content,
        topics: this.parseJson(row.topics),
        metadata: this.parseJson(row.metadata),
        relevanceScore: Number(row.semantic_score),
        createdAt: Number(row.created_at),
        accessedAt: Number(row.accessed_at),
        accessCount: Number(row.access_count)
      })).filter((entry) => !opts?.metadata || this.matchMetadata(entry.metadata ?? {}, opts.metadata)).filter((entry) => !opts?.minAccessCount || entry.accessCount >= opts.minAccessCount),
      totalAvailable: Number(count.rows[0]?.count ?? 0)
    };
  }
  toPgvectorLiteral(vector) {
    return `[${vector.map((n) => Number.isFinite(n) ? Number(n).toString() : "0").join(",")}]`;
  }
  getEventLog(limit = 100) {
    return this.eventLog.slice(0, limit);
  }
  persist() {
  }
  async close() {
    if (this.pool && this.ownsPool) await this.pool.end();
    this.pool = null;
    this.initialized = false;
  }
  async persistLayerEntryWithClient(entry, opts, client) {
    await this.pgQuery(
      `INSERT INTO ${this.table("layered_memories")}
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
  async clearScoped(opts, client) {
    if (opts?.agentId || opts?.userId) {
      const where = [];
      const params = [];
      let idx = 1;
      if (opts.agentId) {
        where.push(`agent_id = $${idx++}`);
        params.push(opts.agentId);
      }
      if (opts.userId) {
        where.push(`user_id = $${idx++}`);
        params.push(opts.userId);
      }
      await this.pgQuery(`DELETE FROM ${this.table("layered_memories")} WHERE ${where.join(" AND ")}`, params, client);
      await this.pgQuery(`DELETE FROM ${this.table("memory")} WHERE ${where.join(" AND ")}`, params, client);
      await this.pgQuery(`DELETE FROM ${this.table("memory_links")} WHERE ${where.join(" AND ")}`, params, client);
    } else {
      await this.pgQuery(`DELETE FROM ${this.table("layered_memories")}`, [], client);
      await this.pgQuery(`DELETE FROM ${this.table("memory")}`, [], client);
      await this.pgQuery(`DELETE FROM ${this.table("memory_links")}`, [], client);
    }
  }
  scopeWhere(opts) {
    const conditions = [];
    const params = [];
    let idx = 1;
    if (opts?.agentId) {
      conditions.push(`(agent_id = $${idx++} OR agent_id IS NULL)`);
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      conditions.push(`(user_id = $${idx++} OR user_id IS NULL)`);
      params.push(opts.userId);
    }
    return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
  }
  exactScopeConditions(opts, startIndex = 1) {
    const conditions = [];
    const params = [];
    let idx = startIndex;
    if (opts?.agentId) {
      conditions.push(`agent_id = $${idx++}`);
      params.push(opts.agentId);
    }
    if (opts?.userId) {
      conditions.push(`user_id = $${idx++}`);
      params.push(opts.userId);
    }
    return { conditions, params };
  }
  async countPgRows(sql, params = []) {
    const result = await this.pgQuery(sql, params);
    return Number(result.rows[0]?.count ?? 0);
  }
  rowToMemory(row) {
    return {
      id: row.id,
      content: row.content,
      topics: this.parseJson(row.topics),
      metadata: this.parseJson(row.metadata),
      createdAt: Number(row.created_at),
      accessedAt: Number(row.accessed_at),
      accessCount: Number(row.access_count)
    };
  }
  rowToLayerEntry(row) {
    return {
      id: row.id,
      content: row.content,
      topics: this.parseJson(row.topics),
      metadata: this.parseJson(row.metadata),
      layer: row.layer,
      createdAt: Number(row.created_at),
      accessedAt: Number(row.accessed_at),
      accessCount: Number(row.access_count),
      expiresAt: row.expires_at == null ? void 0 : Number(row.expires_at),
      importance: row.importance == null ? 0.5 : Number(row.importance),
      validFrom: row.valid_from == null ? void 0 : Number(row.valid_from),
      validUntil: row.valid_until == null ? void 0 : Number(row.valid_until),
      supersedes: row.supersedes,
      supersededBy: row.superseded_by
    };
  }
  toQueryResult(entry, relevanceScore) {
    return { id: entry.id, content: entry.content, topics: entry.topics, metadata: entry.metadata, relevanceScore, createdAt: entry.createdAt, accessedAt: entry.accessedAt, accessCount: entry.accessCount };
  }
  matchMetadata(entryMetadata, filters) {
    return Object.entries(filters).every(([key, expected]) => this.matchMetadataValue(entryMetadata[key], expected));
  }
  matchMetadataValue(actual, expected) {
    if (expected === null || typeof expected !== "object" || Array.isArray(expected)) {
      if (expected === null) return actual === null || actual === void 0;
      return actual === expected;
    }
    if ("exists" in expected && expected.exists !== void 0) {
      const exists = actual !== void 0 && actual !== null;
      if (exists !== expected.exists) return false;
    }
    if ("eq" in expected && expected.eq !== void 0) {
      if (!this.matchMetadataValue(actual, expected.eq)) return false;
    }
    if ("in" in expected && expected.in) {
      if (!expected.in.some((candidate) => this.matchMetadataValue(actual, candidate))) return false;
    }
    if ("contains" in expected && expected.contains !== void 0) {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected.contains)) return false;
      } else if (typeof actual === "string") {
        if (!actual.includes(String(expected.contains))) return false;
      } else {
        return false;
      }
    }
    if (typeof actual === "number") {
      if ("gt" in expected && expected.gt !== void 0 && !(actual > expected.gt)) return false;
      if ("gte" in expected && expected.gte !== void 0 && !(actual >= expected.gte)) return false;
      if ("lt" in expected && expected.lt !== void 0 && !(actual < expected.lt)) return false;
      if ("lte" in expected && expected.lte !== void 0 && !(actual <= expected.lte)) return false;
    } else if ("gt" in expected && expected.gt !== void 0 || "gte" in expected && expected.gte !== void 0 || "lt" in expected && expected.lt !== void 0 || "lte" in expected && expected.lte !== void 0) {
      return false;
    }
    return true;
  }
  async loadAllLinks(opts) {
    const { where, params } = this.scopeWhere(opts);
    const result = await this.pgQuery(`SELECT * FROM ${this.table("memory_links")} ${where} ORDER BY created_at DESC`, params);
    return result.rows.map((row) => this.rowToLink(row));
  }
  rowToLink(row) {
    return memoryLinkSchema.parse({
      id: row.id,
      fromId: row.from_id,
      toId: row.to_id,
      type: row.type,
      metadata: this.parseJson(row.metadata),
      createdAt: Number(row.created_at)
    });
  }
  async restoreLinkWithClient(link, opts, client) {
    const validated = memoryLinkSchema.parse(link);
    await this.pgQuery(
      `INSERT INTO ${this.table("memory_links")} (id, from_id, to_id, type, metadata, created_at, agent_id, user_id)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET from_id=EXCLUDED.from_id, to_id=EXCLUDED.to_id, type=EXCLUDED.type, metadata=EXCLUDED.metadata, created_at=EXCLUDED.created_at, agent_id=EXCLUDED.agent_id, user_id=EXCLUDED.user_id`,
      [validated.id, validated.fromId, validated.toId, validated.type, JSON.stringify(validated.metadata), validated.createdAt, opts?.agentId ?? null, opts?.userId ?? null],
      client
    );
  }
  parseJson(value) {
    return typeof value === "string" ? JSON.parse(value) : value;
  }
  snapshotChecksum(snapshotData) {
    return (0, import_crypto3.createHash)("sha256").update(JSON.stringify(snapshotData)).digest("hex");
  }
  simpleRelevance(content, query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return 0;
    const lower = content.toLowerCase();
    return terms.filter((term) => lower.includes(term)).length / terms.length;
  }
  async logEvent(type, payload) {
    const event = { id: (0, import_crypto3.randomUUID)(), type, timestamp: Date.now(), payload };
    this.eventLog.push(event);
    await this.pgQuery(
      `INSERT INTO ${this.table("events")} (id, type, timestamp, payload) VALUES ($1,$2,$3,$4::jsonb)`,
      [event.id, event.type, event.timestamp, JSON.stringify(event.payload)]
    ).catch(() => void 0);
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
        metadata: s.result.metadata ?? {},
        relevanceScore: s.score
      }));
    } catch {
      return results;
    }
  }
  /**
   * Store a new memory entry.
   */
  async store(input2) {
    await this._store.store(input2);
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
var import_crypto4 = require("crypto");
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
            id: (0, import_crypto4.randomUUID)(),
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
          id: (0, import_crypto4.randomUUID)(),
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
      id: (0, import_crypto4.randomUUID)(),
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
      /\bnot\s+(?:a|i|me|my)\b/i,
      /\bdon't\s+think\b/i,
      /\bno\s+longer\b/i,
      /\bchanged\s+my\s+mind\b/i,
      /\bactually\b.*\b(not|no)\b/i,
      /\bignore\b/i,
      /\bwhatever\b/i,
      /\bbreak\b.*\brule/i
    ];
    const negationMatches = negationPatterns.filter((p) => p.test(lowerText));
    const violatingStatements = [];
    const reasoningParts = [];
    let score = 0;
    for (const statement of statements) {
      const statementLower = statement.text.toLowerCase();
      const keywords = statementLower.split(/[^a-z0-9]+/i).filter((token) => token.length >= 4).slice(0, 8);
      const keywordHits = keywords.filter((keyword) => lowerText.includes(keyword));
      const negatedNearKeyword = keywords.some((keyword) => new RegExp(`(?:not|never|no longer|ignore|break)\\W+(?:\\w+\\W+){0,3}${this.escapeRegex(keyword)}`, "i").test(lowerText));
      const softContradiction = this.findSoftContradiction(statementLower, lowerText);
      if (negatedNearKeyword || softContradiction) {
        violatingStatements.push(statement);
        score += Math.min(0.35, 0.12 + statement.weight * 0.35 + keywordHits.length * 0.03);
        reasoningParts.push(`${statement.category} drift near: ${statement.text.slice(0, 48)}`);
      }
    }
    if (negationMatches.length > 0) {
      score += Math.min(0.2, negationMatches.length * 0.05);
      reasoningParts.push("negation / override language detected");
    }
    const uniqueViolations = violatingStatements.filter(
      (statement, index, list) => list.findIndex((candidate) => candidate.id === statement.id) === index
    );
    const level = score >= this.criticalThreshold ? "critical" : score >= this.threshold ? score >= (this.threshold + this.criticalThreshold) / 2 ? "moderate" : "minor" : "aligned";
    return {
      score: Math.min(score, 1),
      level,
      violatingStatements: uniqueViolations,
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
  findSoftContradiction(statementLower, sessionLower) {
    const contrastPairs = [
      [/\balways\b/i, /\bnever\b/i],
      [/\bnever\b/i, /\balways\b/i],
      [/\bprivate\b/i, /\bpublic\b/i],
      [/\bdirect\b/i, /\bhedge\b/i],
      [/\bcareful\b/i, /\breckless\b/i],
      [/\brespect\b/i, /\bignore\b/i]
    ];
    return contrastPairs.some(([left, right]) => left.test(statementLower) && right.test(sessionLower));
  }
  escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
var import_crypto5 = require("crypto");
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
  store(input2, layer) {
    const assignedLayer = layer ?? this.autoAssignLayer(input2);
    const now = Date.now();
    const layerCfg = this.config[assignedLayer];
    let supersedesId;
    if (assignedLayer === "semantic" && layerCfg.selfEdit) {
      const result = this.checkSupersession(input2, assignedLayer);
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
      id: (0, import_crypto5.randomUUID)(),
      content: input2.content,
      topics: input2.topics ?? [],
      metadata: input2.metadata ?? {},
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
      layer: assignedLayer,
      expiresAt: now + layerCfg.ttlMs,
      importance: input2.metadata?.importance ?? 0.5,
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
  checkSupersession(input2, layer) {
    const text = `${input2.content} ${(input2.topics ?? []).join(" ")}`.toLowerCase();
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
      const inputTopics = (input2.topics ?? []).join(" ").toLowerCase();
      const contentOverlap = this.simpleRelevance(entry.content, input2.content) > 0.5;
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
  storeProcedural(input2, trigger) {
    const normalizedTrigger = typeof trigger === "string" ? proceduralTriggerSchema.parse({ terms: [trigger], phrases: [trigger], match: "any" }) : proceduralTriggerSchema.parse(trigger);
    const meta = { ...input2.metadata, trigger: normalizedTrigger };
    return this.store({ ...input2, metadata: meta }, "procedural");
  }
  /**
   * Fire procedural rules matching the given context text.
   * Returns rules whose trigger keyword appears in the context.
   */
  fireProcedural(context) {
    return this.matchProcedural(context).map((match) => match.entry);
  }
  matchProcedural(context) {
    const matches = [];
    const ctx = context.toLowerCase();
    const tokens = new Set(ctx.split(/[^a-z0-9_:-]+/i).filter(Boolean));
    for (const entry of this.entries.values()) {
      if (entry.layer !== "procedural") continue;
      const trigger = this.normalizeTrigger(entry.metadata?.trigger);
      if (!trigger) continue;
      const reasons = [];
      let score = 0;
      const termMatches = trigger.terms.filter((term) => tokens.has(term.toLowerCase()));
      const phraseMatches = trigger.phrases.filter((phrase) => ctx.includes(phrase.toLowerCase()));
      const topicMatches = trigger.topics.filter(
        (topic) => entry.topics.some((entryTopic) => entryTopic.toLowerCase().includes(topic.toLowerCase())) || ctx.includes(topic.toLowerCase())
      );
      const excludeHit = trigger.excludeTerms.some((term) => tokens.has(term.toLowerCase()) || ctx.includes(term.toLowerCase()));
      const regexHit = trigger.regex ? this.safeRegexTest(trigger.regex, context) : false;
      if (excludeHit) continue;
      if (termMatches.length > 0) {
        score += Math.min(0.4, termMatches.length * 0.2);
        reasons.push(`term:${termMatches.join(",")}`);
      }
      if (phraseMatches.length > 0) {
        score += Math.min(0.35, phraseMatches.length * 0.25);
        reasons.push(`phrase:${phraseMatches.join(",")}`);
      }
      if (topicMatches.length > 0) {
        score += Math.min(0.2, topicMatches.length * 0.1);
        reasons.push(`topic:${topicMatches.join(",")}`);
      }
      if (regexHit) {
        score += 0.35;
        reasons.push("regex");
      }
      const totalSignals = [termMatches.length > 0, phraseMatches.length > 0, topicMatches.length > 0, regexHit].filter(Boolean).length;
      const requiredSignals = trigger.match === "all" ? [trigger.terms.length > 0, trigger.phrases.length > 0, trigger.topics.length > 0, Boolean(trigger.regex)].filter(Boolean).length : 1;
      if (totalSignals < requiredSignals) continue;
      const priority = trigger.priority ?? 0.5;
      score *= 0.75 + priority;
      if (score < (trigger.minScore ?? 0.25)) continue;
      matches.push(proceduralMatchSchema.parse({ entry, score: Math.min(score, 2), reasons }));
    }
    matches.sort((a, b) => b.score - a.score || b.entry.importance - a.entry.importance);
    return matches;
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
        if (options?.metadata) {
          const matchesMetadata = Object.entries(options.metadata).every(([key, expected]) => {
            const actual = entry.metadata?.[key];
            if (expected === null) return actual === null || actual === void 0;
            return actual === expected;
          });
          if (!matchesMetadata) continue;
        }
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
      metadata: entry.metadata,
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
      metadata: entry.metadata,
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
        metadata: entry.metadata,
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
  autoAssignLayer(input2) {
    const metadataLayerHint = typeof input2.metadata?.intakeLayerHint === "string" ? input2.metadata.intakeLayerHint : void 0;
    if (metadataLayerHint === "episodic" || metadataLayerHint === "semantic" || metadataLayerHint === "identity" || metadataLayerHint === "procedural") {
      return metadataLayerHint;
    }
    const text = `${input2.content} ${(input2.topics ?? []).join(" ")}`.toLowerCase();
    const identityKeywords = ["i am", "i prefer", "my values", "my goals", "my boundaries", "i always", "i never"];
    if (identityKeywords.some((k) => text.includes(k))) return "identity";
    const proceduralKeywords = ["when", "if", "always do", "rule:", "trigger:", "procedure:", "always use", "never use", "do this when"];
    if (proceduralKeywords.some((k) => text.includes(k))) return "procedural";
    const semanticKeywords = ["project", "decision", "agreed", "remember", "context", "learned", "figured out"];
    if (semanticKeywords.some((k) => text.includes(k))) return "semantic";
    return "episodic";
  }
  normalizeTrigger(trigger) {
    if (!trigger) return null;
    if (typeof trigger === "string") {
      return proceduralTriggerSchema.parse({ terms: [trigger], phrases: [trigger], match: "any" });
    }
    if (typeof trigger === "object") {
      const parsed = proceduralTriggerSchema.safeParse(trigger);
      return parsed.success ? parsed.data : null;
    }
    return null;
  }
  safeRegexTest(pattern, context) {
    try {
      return new RegExp(pattern, "i").test(context);
    } catch {
      return false;
    }
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
var import_node_vm = require("vm");
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
- You may use await with the provided mem methods
- Do NOT use fetch, require, import, timers, or any Node.js APIs
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
   * Uses a restricted VM context with no Node globals exposed.
   * Only exposes the safe memory API and applies execution timeouts.
   */
  async executeCode(code) {
    const memAPI = Object.freeze(this.buildMemoryAPI());
    const context = (0, import_node_vm.createContext)(
      /* @__PURE__ */ Object.create(null),
      {
        name: "remem-repl",
        codeGeneration: { strings: false, wasm: false }
      }
    );
    Object.defineProperty(context, "mem", {
      value: memAPI,
      enumerable: true,
      configurable: false,
      writable: false
    });
    try {
      const script = new import_node_vm.Script(`"use strict"; (async () => (${code}))()`);
      const result = script.runInContext(context, {
        timeout: 500,
        displayErrors: true
      });
      return await this.withTimeout(Promise.resolve(result), 3e3);
    } catch (err) {
      return { __error: String(err) };
    }
  }
  withTimeout(promise, timeoutMs) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`REPL execution timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
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
  async storeLayerEntry(input2, layer) {
    if (this.remem.storeInLayer) {
      const storedResult = await this.remem.storeInLayer(input2, layer);
      if (storedResult?.id) {
        return this.remem.getLayerManager?.()?.get(storedResult.id) ?? null;
      }
      return null;
    }
    const directResult = await this.remem.store(input2, layer);
    if (directResult && typeof directResult === "object" && "id" in directResult) {
      return directResult;
    }
    return null;
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
        const mergedInput = {
          content: merged.content,
          topics: merged.topics,
          metadata: {
            ...merged.metadata,
            consolidatedFrom: [pair.entryA.id, pair.entryB.id],
            similarity: pair.similarity
          }
        };
        const newEntry = await this.storeLayerEntry(mergedInput, layer);
        if (!newEntry) {
          result.errors.push(`Merged entry storage failed for ${pair.entryA.id}+${pair.entryB.id}`);
          continue;
        }
        layerManager.forget(pair.entryA.id);
        layerManager.forget(pair.entryB.id);
        processedIds.add(pair.entryA.id);
        processedIds.add(pair.entryB.id);
        result.deduplicated++;
        if (this.options.mergeStrategy === "supersede") {
          result.superseded++;
        }
        if (this.embeddingService) {
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
          const promotedEntry = await this.storeLayerEntry(
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
          if (!promotedEntry?.id) {
            result.errors.push(`Promotion storage failed for ${entry.id}`);
            continue;
          }
          entry.supersededBy = promotedEntry.id;
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
  async runWorkflow(options = {}) {
    const layers = options.layers ?? ["episodic", "semantic", "identity", "procedural"];
    const base = await this.consolidateAll(layers);
    const result = {
      ...base,
      summariesCreated: 0,
      proceduresCreated: 0,
      summaries: [],
      procedures: [],
      affectedIds: []
    };
    const summaryEnabled = options.summary?.enabled ?? true;
    if (summaryEnabled) {
      const summaryRecords = await this.generateTopicSummaries(options.summary);
      result.summaries = summaryRecords;
      result.summariesCreated = summaryRecords.length;
      result.affectedIds.push(...summaryRecords.flatMap((record) => record.entryId ? [record.entryId, ...record.sourceIds] : record.sourceIds));
    }
    const proceduresEnabled = options.proceduralPromotion?.enabled ?? false;
    if (proceduresEnabled && result.summaries.length > 0) {
      const procedureRecords = await this.promoteSummariesToProcedures(
        result.summaries,
        options.proceduralPromotion?.maxProcedures ?? 3
      );
      result.procedures = procedureRecords;
      result.proceduresCreated = procedureRecords.length;
      result.affectedIds.push(...procedureRecords.flatMap((record) => record.entryId ? [record.entryId] : []));
    }
    result.affectedIds = Array.from(new Set(result.affectedIds));
    return result;
  }
  async generateTopicSummaries(options = {}) {
    const clusters = this.buildSummaryClusters(options);
    const records = [];
    for (const cluster of clusters) {
      const content = await this.summarizeCluster(cluster);
      const stored = await this.storeSummary(cluster, content, options?.metadata ?? {});
      records.push({
        entryId: stored?.id,
        topic: cluster.topic,
        sourceIds: cluster.entries.map((entry) => entry.id),
        sourceLayers: Array.from(new Set(cluster.entries.map((entry) => entry.layer))),
        content
      });
    }
    return records;
  }
  buildSummaryClusters(options = {}) {
    const layerManager = this.remem.getLayerManager?.();
    if (!layerManager) return [];
    const sourceLayers = options.sourceLayers ?? ["episodic", "semantic", "identity"];
    const minClusterSize = options.minClusterSize ?? 3;
    const maxClusters = options.maxClusters ?? 3;
    const allowlist = options.topicAllowlist ? new Set(options.topicAllowlist) : null;
    const entries = layerManager.getAllEntries().filter((entry) => sourceLayers.includes(entry.layer));
    const clusters = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      for (const topic of entry.topics) {
        if (!topic || topic === "promoted-from-episodic") continue;
        if (allowlist && !allowlist.has(topic)) continue;
        const bucket = clusters.get(topic) ?? [];
        bucket.push(entry);
        clusters.set(topic, bucket);
      }
    }
    const usedIds = /* @__PURE__ */ new Set();
    return [...clusters.entries()].filter(([, topicEntries]) => topicEntries.length >= minClusterSize).sort((a, b) => b[1].length - a[1].length).map(([topic, topicEntries]) => ({
      topic,
      entries: topicEntries.sort((a, b) => a.createdAt - b.createdAt).filter((entry) => !usedIds.has(entry.id))
    })).filter((cluster) => cluster.entries.length >= minClusterSize).slice(0, maxClusters).map((cluster) => {
      cluster.entries.forEach((entry) => usedIds.add(entry.id));
      return cluster;
    });
  }
  async summarizeCluster(cluster) {
    const model = this.remem.getModel?.();
    const lines = cluster.entries.map((entry, index) => `${index + 1}. [${entry.layer}] ${entry.content}`);
    if (model) {
      try {
        const response = await model.chat([
          {
            role: "system",
            content: "You are consolidating agent memory into durable semantic memory. Write a compact summary that preserves facts, decisions, and changes without filler."
          },
          {
            role: "user",
            content: `Topic: ${cluster.topic}
Entries:
${lines.join("\n")}

Return a 2-4 sentence durable summary for future recall. Mention changes or contradictions if present. No bullets.`
          }
        ], { temperature: 0.2, maxTokens: 220 });
        const text = response.content.trim();
        if (text) return text;
      } catch {
      }
    }
    const preview = cluster.entries.slice(0, 4).map((entry) => entry.content.trim()).filter(Boolean).join(" ");
    return `Consolidated ${cluster.entries.length} memories about ${cluster.topic}. ${preview}`.trim();
  }
  async storeSummary(cluster, content, metadata) {
    const summaryInput = {
      content,
      topics: Array.from(/* @__PURE__ */ new Set([cluster.topic, "consolidated-summary"])),
      metadata: {
        ...metadata,
        source: "memory.consolidation.summary",
        summaryOf: cluster.entries.map((entry) => entry.id),
        summaryTopic: cluster.topic,
        sourceLayers: Array.from(new Set(cluster.entries.map((entry) => entry.layer))),
        consolidatedAt: Date.now()
      }
    };
    if (this.remem.storeInLayer) {
      return this.remem.storeInLayer(summaryInput, "semantic");
    }
    await Promise.resolve(this.remem.store(summaryInput));
    return null;
  }
  async promoteSummariesToProcedures(summaries, maxProcedures) {
    if (!this.remem.storeProcedural) return [];
    const model = this.remem.getModel?.();
    const records = [];
    for (const summary of summaries.slice(0, maxProcedures)) {
      const candidate = await this.deriveProcedureFromSummary(summary, model);
      if (!candidate) continue;
      const stored = await this.remem.storeProcedural(
        {
          content: candidate.content,
          topics: [summary.topic, "consolidated-procedure"],
          metadata: {
            source: "memory.consolidation.procedure",
            sourceSummaryEntryId: summary.entryId,
            sourceIds: summary.sourceIds,
            generatedAt: Date.now()
          }
        },
        candidate.trigger
      );
      records.push({
        entryId: stored?.id,
        sourceSummaryEntryId: summary.entryId,
        content: candidate.content,
        trigger: candidate.trigger
      });
    }
    return records;
  }
  async deriveProcedureFromSummary(summary, model) {
    if (!model) return null;
    try {
      const response = await model.chat([
        {
          role: "system",
          content: "Turn durable memory summaries into operational procedures only when a clear repeatable rule exists. Return strict JSON."
        },
        {
          role: "user",
          content: `Topic: ${summary.topic}
Summary: ${summary.content}

Return JSON with shape {"content":"...","triggerTerms":["..."],"triggerPhrases":["..."],"minScore":0.25}. If there is no clear procedure, return {"content":"","triggerTerms":[],"triggerPhrases":[],"minScore":0.25}.`
        }
      ], { temperature: 0.1, maxTokens: 180 });
      const parsed = this.extractJsonObject(response.content);
      const content = typeof parsed?.content === "string" ? parsed.content.trim() : "";
      if (!content) return null;
      const triggerTerms = Array.isArray(parsed?.triggerTerms) ? parsed.triggerTerms.filter((value) => typeof value === "string" && value.trim().length > 0) : [summary.topic];
      const triggerPhrases = Array.isArray(parsed?.triggerPhrases) ? parsed.triggerPhrases.filter((value) => typeof value === "string" && value.trim().length > 0) : [];
      const minScore = typeof parsed?.minScore === "number" ? parsed.minScore : 0.25;
      return {
        sourceSummaryEntryId: summary.entryId,
        content,
        trigger: {
          terms: triggerTerms.length > 0 ? triggerTerms : [summary.topic],
          phrases: triggerPhrases,
          minScore,
          priority: 0.7
        }
      };
    } catch {
      return null;
    }
  }
  extractJsonObject(raw) {
    const trimmed = raw.trim();
    const direct = this.tryParseJson(trimmed);
    if (direct) return direct;
    const match = trimmed.match(/\{[\s\S]*\}/);
    return match ? this.tryParseJson(match[0]) : null;
  }
  tryParseJson(raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
};

// src/recall-profiles.ts
var PROFILE_ALIASES = {
  agentsafe: "agent-safe",
  "agent-safe": "agent-safe",
  agent_safe: "agent-safe",
  opsdebug: "ops-debug",
  "ops-debug": "ops-debug",
  ops_debug: "ops-debug",
  coding: "coding-agent",
  codingagent: "coding-agent",
  "coding-agent": "coding-agent",
  coding_agent: "coding-agent",
  ops: "ops-handoff",
  opshandoff: "ops-handoff",
  "ops-handoff": "ops-handoff",
  ops_handoff: "ops-handoff",
  handoff: "ops-handoff",
  research: "research-brief",
  researchbrief: "research-brief",
  "research-brief": "research-brief",
  research_brief: "research-brief"
};
function normalizeSmartRecallProfileInput(profile) {
  return (profile ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}
function resolveSmartRecallProfile(profile) {
  const normalized = normalizeSmartRecallProfileInput(profile);
  if (!normalized) return null;
  return PROFILE_ALIASES[normalized] ?? null;
}

// src/adapters.ts
function getStringMetadata(entry, key) {
  const value = entry.metadata?.[key];
  return typeof value === "string" ? value : void 0;
}
function getNumberMetadata(entry, key) {
  const value = entry.metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function getStringArrayMetadata(entry, key) {
  const value = entry.metadata?.[key];
  if (!Array.isArray(value)) return void 0;
  const strings = value.filter((item) => typeof item === "string");
  return strings.length ? strings : void 0;
}
function isKnowledgeNode(entry, project) {
  if (entry.metadata?.source !== "remem.knowledge.node") return false;
  return !project || entry.metadata?.project === project;
}
function hasKnowledgeResourceAccess(entry, grant) {
  if (!grant) return true;
  return authorizeKnowledgeResourceAccess({
    resourceUri: getStringMetadata(entry, "resourceUri"),
    source: getStringMetadata(entry, "knowledgeSource"),
    project: getStringMetadata(entry, "project"),
    requiredScopes: getStringArrayMetadata(entry, "requiredScopes")
  }, grant).allowed;
}
function codebaseNodeWeight(entry) {
  return getNumberMetadata(entry, "graphWeight") ?? getNumberMetadata(entry, "nodeWeight") ?? 1;
}
function codebaseLinkWeight(link) {
  const metadata = link.metadata ?? {};
  const value = metadata.graphWeight ?? metadata.weight ?? metadata.strength;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
}
function normalizeCodebaseConnectionTypes(types) {
  if (!types?.length) return void 0;
  return Array.from(new Set(types.map((type) => type.trim().toLowerCase()).filter(Boolean).map((type) => type.startsWith("knowledge:") ? type : `knowledge:${type}`)));
}
function normalizeCodebaseStringFilters(values) {
  if (!values?.length) return void 0;
  const normalized = Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
  return normalized.length ? normalized : void 0;
}
function connectionTypeMatches(type, allowed) {
  if (!allowed?.length) return true;
  return allowed.includes(type.toLowerCase());
}
function topLevelOwner(entry) {
  const label = getStringMetadata(entry, "label")?.toLowerCase();
  const path2 = getStringMetadata(entry, "path") ?? getStringMetadata(entry, "name") ?? "";
  if (label === "package") return { owner: path2 || "external", type: "package" };
  if (label === "project") return { owner: getStringMetadata(entry, "name") ?? "project", type: "project" };
  const normalized = path2.replace(/\\/g, "/").replace(/^\.\//, "");
  const first = normalized.split("/").filter(Boolean)[0];
  return { owner: first || ".", type: "directory" };
}
function matchesCodebaseFilters(entry, options) {
  const allowedLabels = normalizeCodebaseStringFilters(options.nodeLabels);
  if (allowedLabels?.length) {
    const label = (getStringMetadata(entry, "label") ?? "").toLowerCase();
    if (!allowedLabels.includes(label)) return false;
  }
  const allowedOwners = normalizeCodebaseStringFilters(options.owners);
  if (allowedOwners?.length) {
    const owner = topLevelOwner(entry).owner.toLowerCase();
    if (!allowedOwners.includes(owner)) return false;
  }
  return true;
}
function formatCodebaseContext(results, maxChars = 6e3) {
  const lines = [];
  for (const result of results) {
    const label = getStringMetadata(result, "label") ?? "Node";
    const name = getStringMetadata(result, "name") ?? getStringMetadata(result, "externalId") ?? result.id;
    const path2 = getStringMetadata(result, "path");
    const project = getStringMetadata(result, "project");
    const header = `${label}: ${name}${path2 ? ` (${path2})` : ""}${project ? ` [${project}]` : ""}`;
    lines.push(`- ${header}`);
    const summary = result.content.split("\n").filter((line) => !line.startsWith(`${label}:`)).join(" ").trim();
    if (summary) lines.push(`  ${summary}`);
    if (lines.join("\n").length >= maxChars) break;
  }
  const content = lines.join("\n");
  return content.length > maxChars ? `${content.slice(0, Math.max(0, maxChars - 14)).trimEnd()}
...truncated` : content;
}
function createCodebaseMemoryAdapter(memory, options = {}) {
  const defaultLimit = options.defaultLimit ?? 10;
  const linkedPageSize = 100;
  const codebaseLinkTypeWeights = {
    "knowledge:http_calls": 1.35,
    "knowledge:calls": 1.25,
    "knowledge:uses": 1.15,
    "knowledge:imports": 1.05,
    "knowledge:depends_on": 1.05,
    "knowledge:defines": 0.95,
    "knowledge:contains": 0.7
  };
  const knowledgeNodes = async (project) => {
    const entries = await memory.getStore().getAllEntries();
    return entries.filter((entry) => isKnowledgeNode(entry, project));
  };
  const scopedKnowledgeNodes = async (inventoryOptions) => {
    const nodes = await knowledgeNodes(inventoryOptions.project);
    return nodes.filter((node) => hasKnowledgeResourceAccess(node, inventoryOptions.resourceGrant)).filter((node) => matchesCodebaseFilters(node, inventoryOptions));
  };
  const getAllLinkedMemories = async (memoryId, options2 = {}) => {
    const items = [];
    let offset = 0;
    while (true) {
      const page = await memory.getLinkedMemories(memoryId, {
        direction: options2.direction ?? "both",
        types: options2.types,
        limit: linkedPageSize,
        offset
      });
      if (page.length === 0) break;
      items.push(...page);
      if (page.length < linkedPageSize) break;
      offset += page.length;
    }
    return items;
  };
  const healthFromLinks = (node, rawLinks) => {
    const incomingLinks = rawLinks.filter((link) => link.toId === node.id);
    const outgoingLinks = rawLinks.filter((link) => link.fromId === node.id);
    const incomingWeight = incomingLinks.reduce((sum, link) => sum + codebaseLinkWeight(link), 0);
    const outgoingWeight = outgoingLinks.reduce((sum, link) => sum + codebaseLinkWeight(link), 0);
    const relationTypes = Array.from(new Set(rawLinks.map((link) => link.type))).sort();
    return {
      node,
      incoming: incomingLinks.length,
      outgoing: outgoingLinks.length,
      incomingWeight,
      outgoingWeight,
      relationTypes,
      weight: codebaseNodeWeight(node) + outgoingWeight * 1.25 + incomingWeight * 0.35 + relationTypes.length * 0.1,
      links: rawLinks
    };
  };
  const buildScopedKnowledgeGraph = async (nodes, options2) => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const linksById = /* @__PURE__ */ new Map();
    const allowedTypes = normalizeCodebaseConnectionTypes(options2.connectionTypes);
    const minWeight = options2.minConnectionWeight ?? 0;
    for (const node of nodes) {
      const linked = await getAllLinkedMemories(node.id, { direction: "both", types: allowedTypes });
      for (const item of linked) {
        const link = item.link;
        if (!nodeById.has(link.fromId) || !nodeById.has(link.toId)) continue;
        if (!connectionTypeMatches(link.type, allowedTypes)) continue;
        if (codebaseLinkWeight(link) < minWeight) continue;
        linksById.set(link.id, link);
      }
    }
    const links = Array.from(linksById.values());
    const adjacency = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const link of links) {
      adjacency.get(link.fromId)?.push({ neighborId: link.toId, link });
      adjacency.get(link.toId)?.push({ neighborId: link.fromId, link });
    }
    return {
      nodes,
      nodeById,
      links,
      adjacency,
      analysisScope: {
        nodeSet: options2.nodeSet,
        linkSet: "internal-links-between-returned-nodes",
        structureSet: "snapshot-internal",
        pageSize: linkedPageSize,
        uniqueLinks: links.length,
        truncated: false,
        ...allowedTypes?.length ? { connectionTypes: allowedTypes } : {},
        ...typeof options2.minConnectionWeight === "number" ? { minConnectionWeight: options2.minConnectionWeight } : {},
        ...options2.nodeLabels?.length ? { nodeLabels: options2.nodeLabels } : {},
        ...options2.owners?.length ? { owners: options2.owners } : {},
        resourceScoped: Boolean(options2.resourceScoped)
      }
    };
  };
  const analyzeCodebaseGraphStructure = async (graph) => {
    const { nodes, nodeById, links, adjacency } = graph;
    const linkById = new Map(links.map((link) => [link.id, link]));
    const visited = /* @__PURE__ */ new Set();
    const clusters = [];
    let clusterIndex = 0;
    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      const stack = [node.id];
      const componentIds = [];
      const componentLinkIds = /* @__PURE__ */ new Set();
      visited.add(node.id);
      while (stack.length > 0) {
        const currentId = stack.pop();
        componentIds.push(currentId);
        for (const edge of adjacency.get(currentId) ?? []) {
          componentLinkIds.add(edge.link.id);
          if (!visited.has(edge.neighborId)) {
            visited.add(edge.neighborId);
            stack.push(edge.neighborId);
          }
        }
      }
      const labels = {};
      const owners = /* @__PURE__ */ new Set();
      for (const id of componentIds) {
        const componentNode = nodeById.get(id);
        const label = getStringMetadata(componentNode, "label") ?? "Node";
        labels[label] = (labels[label] ?? 0) + 1;
        owners.add(topLevelOwner(componentNode).owner);
      }
      clusters.push({
        id: `cluster-${++clusterIndex}`,
        nodeIds: componentIds.sort(),
        linkIds: Array.from(componentLinkIds).sort(),
        size: componentIds.length,
        totalNodeWeight: Number(componentIds.reduce((sum, id) => sum + codebaseNodeWeight(nodeById.get(id)), 0).toFixed(3)),
        totalLinkWeight: Number(Array.from(componentLinkIds).reduce((sum, id) => sum + codebaseLinkWeight(linkById.get(id)), 0).toFixed(3)),
        labels,
        owners: Array.from(owners).sort()
      });
    }
    const discovery = /* @__PURE__ */ new Map();
    const low = /* @__PURE__ */ new Map();
    const parent = /* @__PURE__ */ new Map();
    const articulationIds = /* @__PURE__ */ new Set();
    const bridgeLinkIds = /* @__PURE__ */ new Set();
    let time = 0;
    const dfs = (nodeId) => {
      discovery.set(nodeId, ++time);
      low.set(nodeId, time);
      let childCount = 0;
      for (const edge of adjacency.get(nodeId) ?? []) {
        const neighborId = edge.neighborId;
        if (!discovery.has(neighborId)) {
          parent.set(neighborId, nodeId);
          childCount += 1;
          dfs(neighborId);
          low.set(nodeId, Math.min(low.get(nodeId), low.get(neighborId)));
          if (parent.get(nodeId) == null && childCount > 1) articulationIds.add(nodeId);
          if (parent.get(nodeId) != null && low.get(neighborId) >= discovery.get(nodeId)) articulationIds.add(nodeId);
          if (low.get(neighborId) > discovery.get(nodeId)) bridgeLinkIds.add(edge.link.id);
        } else if (neighborId !== parent.get(nodeId)) {
          low.set(nodeId, Math.min(low.get(nodeId), discovery.get(neighborId)));
        }
      }
    };
    for (const node of nodes) {
      if (!discovery.has(node.id)) {
        parent.set(node.id, null);
        dfs(node.id);
      }
    }
    const bridgeNodes = await Promise.all(
      Array.from(articulationIds).map(async (nodeId) => {
        const node = nodeById.get(nodeId);
        const rawLinks = adjacency.get(nodeId)?.map((entry) => entry.link) ?? [];
        return healthFromLinks(node, rawLinks);
      })
    );
    const bridgeLinks = links.filter((link) => bridgeLinkIds.has(link.id)).map((link) => ({
      fromId: link.fromId,
      toId: link.toId,
      type: link.type,
      weight: codebaseLinkWeight(link),
      from: nodeById.get(link.fromId),
      to: nodeById.get(link.toId)
    })).sort((a, b) => b.weight - a.weight || a.type.localeCompare(b.type));
    return {
      clusters: clusters.sort((a, b) => b.totalNodeWeight - a.totalNodeWeight || b.size - a.size || a.id.localeCompare(b.id)),
      bridges: {
        nodes: bridgeNodes.sort((a, b) => b.weight - a.weight || b.outgoing - a.outgoing || b.incoming - a.incoming),
        links: bridgeLinks
      }
    };
  };
  const summarizeOwners = (nodes, limit) => {
    const owners = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      const { owner, type } = topLevelOwner(node);
      const key = `${type}:${owner}`;
      const summary = owners.get(key) ?? { owner, type, nodes: 0, files: 0, symbols: 0, packages: 0, averageWeight: 0, paths: [] };
      const label = (getStringMetadata(node, "label") ?? "").toLowerCase();
      const path2 = getStringMetadata(node, "path");
      const previousTotal = summary.averageWeight * summary.nodes;
      summary.nodes += 1;
      summary.averageWeight = (previousTotal + codebaseNodeWeight(node)) / summary.nodes;
      if (label === "file") summary.files += 1;
      if (["function", "class", "constant", "symbol"].includes(label)) summary.symbols += 1;
      if (label === "package") summary.packages += 1;
      if (path2 && !summary.paths.includes(path2)) summary.paths.push(path2);
      owners.set(key, summary);
    }
    return Array.from(owners.values()).sort((a, b) => b.nodes * b.averageWeight - a.nodes * a.averageWeight || a.owner.localeCompare(b.owner)).slice(0, limit).map((owner) => ({ ...owner, averageWeight: Number(owner.averageWeight.toFixed(3)), paths: owner.paths.slice(0, 10) }));
  };
  const summarizeEntrypoints = (nodes, graph, limit) => {
    const candidates = [];
    for (const node of nodes) {
      const label = (getStringMetadata(node, "label") ?? "").toLowerCase();
      const path2 = getStringMetadata(node, "path") ?? "";
      const name = getStringMetadata(node, "name") ?? "";
      const looksLikeEntrypoint = ["project", "route", "command", "entrypoint", "api"].includes(label) || label === "file" && /\b(cli|server|index|main|app|route|command)s?\b/i.test(`${path2} ${name}`);
      if (!looksLikeEntrypoint) continue;
      candidates.push(healthFromLinks(node, graph.adjacency.get(node.id)?.map((entry) => entry.link) ?? []));
    }
    return candidates.sort((a, b) => b.weight - a.weight || b.outgoing - a.outgoing || a.incoming - b.incoming).slice(0, limit);
  };
  const summarizeHotspots = (nodes, graph, limit) => {
    const scored = nodes.map((node) => healthFromLinks(node, graph.adjacency.get(node.id)?.map((entry) => entry.link) ?? []));
    return scored.filter((entry) => entry.incoming > 0 || entry.outgoing > 0).sort((a, b) => b.weight - a.weight || b.outgoing - a.outgoing || b.incoming - a.incoming).slice(0, limit);
  };
  const summarizeDeadzones = (nodes, graph, limit) => {
    const dead = [];
    for (const node of nodes) {
      const label = (getStringMetadata(node, "label") ?? "").toLowerCase();
      if (!["file", "function", "class", "constant", "symbol", "package"].includes(label)) continue;
      const health = healthFromLinks(node, graph.adjacency.get(node.id)?.map((entry) => entry.link) ?? []);
      if (health.incoming === 0 && health.outgoing === 0) {
        dead.push({
          ...health,
          weight: codebaseNodeWeight(node)
        });
      }
    }
    return dead.sort((a, b) => b.weight - a.weight).slice(0, limit);
  };
  const buildInventorySummary = async (nodes, options2) => {
    const graph = await buildScopedKnowledgeGraph(nodes, options2);
    return {
      analysisScope: graph.analysisScope,
      owners: summarizeOwners(nodes, options2.limit),
      entrypoints: summarizeEntrypoints(nodes, graph, options2.limit),
      hotspots: summarizeHotspots(nodes, graph, options2.limit),
      deadzones: summarizeDeadzones(nodes, graph, options2.limit),
      ...await analyzeCodebaseGraphStructure(graph)
    };
  };
  const collectConnections = async (nodes, options2 = {}) => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const allowedTypes = normalizeCodebaseConnectionTypes(options2.connectionTypes);
    const minWeight = options2.minConnectionWeight ?? 0;
    const connections = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      const linked = await getAllLinkedMemories(node.id, { direction: "both", types: allowedTypes });
      for (const item of linked) {
        const link = item.link;
        const type = link.type.toLowerCase();
        const weight = codebaseLinkWeight(link);
        if (!connectionTypeMatches(type, allowedTypes)) continue;
        if (weight < minWeight) continue;
        const from = byId.get(link.fromId);
        const to = byId.get(link.toId);
        if (!options2.includeExternal && (!from || !to)) continue;
        connections.set(link.id, {
          fromId: link.fromId,
          toId: link.toId,
          type: link.type,
          weight,
          ...from ? { from } : {},
          ...to ? { to } : {}
        });
      }
    }
    return Array.from(connections.values()).sort((a, b) => b.weight - a.weight || a.type.localeCompare(b.type));
  };
  return {
    name: "Codebase Graph as memory",
    key: "codebase-memory",
    async registerArtifact(input2) {
      const artifact = knowledgeArtifactRegistrationSchema.parse(input2);
      return memory.registerKnowledgeArtifact(artifact);
    },
    async ingestGraph(graph, ingestOptions) {
      const parsed = knowledgeGraphArtifactSchema.parse(graph);
      return memory.ingestKnowledgeGraph(parsed, ingestOptions);
    },
    async searchGraph(query, queryOptions = { limit: defaultLimit }) {
      const { project, metadata, nodeLabels, owners, ...rest } = queryOptions;
      const response = await memory.query(query, {
        ...rest,
        metadata: {
          ...metadata ?? {},
          source: "remem.knowledge.node",
          ...project ? { project } : {}
        }
      });
      const results = response.results.filter((entry) => matchesCodebaseFilters(entry, { nodeLabels, owners }));
      return {
        ...response,
        results,
        totalAvailable: results.length
      };
    },
    async architecture(project, limit = defaultLimit) {
      return memory.query("architecture routes packages entry points hotspots boundaries clusters", {
        limit,
        metadata: {
          source: "remem.knowledge.node",
          ...project ? { project } : {}
        }
      });
    },
    async impact(subject, optionsOrLimit = defaultLimit) {
      const queryOptions = typeof optionsOrLimit === "number" ? { limit: optionsOrLimit, neighborLimit: optionsOrLimit } : optionsOrLimit;
      const limit = queryOptions.limit ?? defaultLimit;
      const { project, metadata, ...rest } = queryOptions;
      return memory.queryWithNeighbors(subject, {
        ...rest,
        limit,
        linkTypeWeights: {
          ...codebaseLinkTypeWeights,
          ...rest.linkTypeWeights ?? {}
        },
        metadata: {
          ...metadata ?? {},
          source: "remem.knowledge.node",
          ...project ? { project } : {}
        },
        hops: 2,
        includeBaseResults: true,
        includePathDetails: true,
        neighborLimit: queryOptions.neighborLimit ?? limit,
        minNeighborScore: queryOptions.minNeighborScore ?? 0.08
      });
    },
    async subgraph(query, queryOptions = {}) {
      const selectedConnectionTypes = normalizeCodebaseConnectionTypes([
        ...queryOptions.connectionTypes ?? [],
        ...queryOptions.includeConnections ?? []
      ]);
      const response = await this.impact(query, {
        ...queryOptions,
        ...selectedConnectionTypes ? { linkTypes: selectedConnectionTypes } : {},
        limit: queryOptions.limit ?? defaultLimit,
        neighborLimit: queryOptions.neighborLimit ?? (queryOptions.limit ?? defaultLimit),
        includePathDetails: true
      });
      const results = response.results.filter((entry) => hasKnowledgeResourceAccess(entry, queryOptions.resourceGrant));
      const filteredResults = results.filter((entry) => matchesCodebaseFilters(entry, queryOptions));
      const allowedIds = new Set(filteredResults.map((entry) => entry.id));
      const paths = (response.paths ?? []).filter((path2) => connectionTypeMatches(path2.type, selectedConnectionTypes)).filter((path2) => allowedIds.has(path2.fromId) && allowedIds.has(path2.toId) && allowedIds.has(path2.throughId)).filter((path2) => (queryOptions.minConnectionWeight ?? 0) <= path2.score);
      return {
        query,
        project: queryOptions.project,
        results: filteredResults,
        paths,
        linksTraversed: paths.length,
        context: formatCodebaseContext(filteredResults, queryOptions.maxContextChars ?? 6e3)
      };
    },
    async asMemory(query, queryOptions = {}) {
      const displayType = queryOptions.displayType ?? "memory";
      const selectedConnectionTypes = normalizeCodebaseConnectionTypes([
        ...queryOptions.connectionTypes ?? [],
        ...queryOptions.includeConnections ?? []
      ]);
      const subgraph = await this.subgraph(query, {
        ...queryOptions,
        connectionTypes: selectedConnectionTypes,
        limit: queryOptions.limit ?? defaultLimit,
        neighborLimit: queryOptions.neighborLimit ?? (queryOptions.limit ?? defaultLimit)
      });
      const allowedLabels = queryOptions.nodeLabels?.map((label) => label.toLowerCase());
      const nodes = allowedLabels?.length ? subgraph.results.filter((node) => allowedLabels.includes((getStringMetadata(node, "label") ?? "").toLowerCase())) : subgraph.results;
      const connections = await collectConnections(nodes, {
        connectionTypes: selectedConnectionTypes,
        minConnectionWeight: queryOptions.minConnectionWeight
      });
      const relationTypes = Array.from(new Set(connections.map((connection) => connection.type))).sort();
      const project = queryOptions.project;
      const inventorySummary = await buildInventorySummary(nodes, {
        limit: queryOptions.limit ?? defaultLimit,
        connectionTypes: selectedConnectionTypes,
        minConnectionWeight: queryOptions.minConnectionWeight,
        nodeLabels: queryOptions.nodeLabels,
        owners: queryOptions.owners,
        resourceScoped: Boolean(queryOptions.resourceGrant),
        nodeSet: "subgraph-results"
      });
      const summary = `${queryOptions.snapshotName ?? "Codebase Graph as memory"} captured ${nodes.length} nodes and ${connections.length} selected connections${project ? ` for ${project}` : ""}${relationTypes.length ? ` (${relationTypes.join(", ")})` : ""}.`;
      return {
        name: "Codebase Graph as memory",
        displayType,
        query,
        project,
        summary,
        nodes,
        connections,
        paths: subgraph.paths,
        linksTraversed: subgraph.linksTraversed,
        context: displayType === "graph" ? formatCodebaseContext(nodes, queryOptions.maxContextChars ?? 4e3) : subgraph.context,
        analysisScope: inventorySummary.analysisScope,
        ...displayType === "inventory" ? {
          inventory: (({ analysisScope, ...inventory }) => inventory)(inventorySummary)
        } : {}
      };
    },
    async graphAsMemory(query, queryOptions = {}) {
      return this.asMemory(query, queryOptions);
    },
    async explain(query, queryOptions = {}) {
      const graph = await this.subgraph(query, queryOptions);
      const focus = graph.results[0];
      const label = focus ? getStringMetadata(focus, "label") ?? "Node" : "Node";
      const name = focus ? getStringMetadata(focus, "name") ?? getStringMetadata(focus, "externalId") ?? focus.id : query;
      const relationTypes = Array.from(new Set(graph.paths.map((path2) => path2.type))).sort();
      const summary = graph.results.length === 0 ? `No codebase graph nodes matched ${query}.` : `${label} ${name} connects to ${Math.max(0, graph.results.length - 1)} graph nodes through ${graph.linksTraversed} traversed links${relationTypes.length ? ` (${relationTypes.join(", ")})` : ""}.`;
      return {
        ...graph,
        summary
      };
    },
    async entrypoints(projectOrOptions) {
      const inventoryOptions = typeof projectOrOptions === "string" ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      const graph = await buildScopedKnowledgeGraph(nodes, {
        nodeLabels: inventoryOptions.nodeLabels,
        owners: inventoryOptions.owners,
        resourceScoped: Boolean(inventoryOptions.resourceGrant),
        nodeSet: "inventory-scope"
      });
      return summarizeEntrypoints(nodes, graph, limit);
    },
    async owners(projectOrOptions) {
      const inventoryOptions = typeof projectOrOptions === "string" ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      return summarizeOwners(nodes, limit);
    },
    async hotspots(projectOrOptions) {
      const inventoryOptions = typeof projectOrOptions === "string" ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      const graph = await buildScopedKnowledgeGraph(nodes, {
        nodeLabels: inventoryOptions.nodeLabels,
        owners: inventoryOptions.owners,
        resourceScoped: Boolean(inventoryOptions.resourceGrant),
        nodeSet: "inventory-scope"
      });
      return summarizeHotspots(nodes, graph, limit);
    },
    async deadzones(projectOrOptions) {
      const inventoryOptions = typeof projectOrOptions === "string" ? { project: projectOrOptions } : projectOrOptions ?? {};
      const limit = inventoryOptions.limit ?? defaultLimit;
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      const graph = await buildScopedKnowledgeGraph(nodes, {
        nodeLabels: inventoryOptions.nodeLabels,
        owners: inventoryOptions.owners,
        resourceScoped: Boolean(inventoryOptions.resourceGrant),
        nodeSet: "inventory-scope"
      });
      return summarizeDeadzones(nodes, graph, limit);
    },
    async overview(projectOrOptions) {
      const inventoryOptions = typeof projectOrOptions === "string" ? { project: projectOrOptions } : projectOrOptions ?? {};
      const nodes = await scopedKnowledgeNodes(inventoryOptions);
      const counts = {};
      for (const node of nodes) {
        const label = getStringMetadata(node, "label") ?? "Node";
        counts[label] = (counts[label] ?? 0) + 1;
      }
      const inventory = await buildInventorySummary(nodes, {
        limit: inventoryOptions.limit ?? 10,
        nodeLabels: inventoryOptions.nodeLabels,
        owners: inventoryOptions.owners,
        resourceScoped: Boolean(inventoryOptions.resourceGrant),
        nodeSet: "inventory-scope"
      });
      return {
        project: inventoryOptions.project,
        nodes: nodes.length,
        labels: counts,
        analysisScope: inventory.analysisScope,
        owners: inventory.owners,
        entrypoints: inventory.entrypoints,
        hotspots: inventory.hotspots,
        deadzones: inventory.deadzones,
        clusters: inventory.clusters,
        bridges: inventory.bridges
      };
    },
    async context(query, queryOptions = { limit: defaultLimit }) {
      const response = await this.searchGraph(query, queryOptions);
      return formatCodebaseContext(response.results);
    }
  };
}

// src/index.ts
var SMART_RECALL_PROFILE_CATALOG = {
  fast: {
    label: "Fast",
    overview: "Fast-pass recall for immediate answer shaping.",
    recommendedFor: [
      "short interactive replies",
      "quick preference lookups",
      "low-latency triage"
    ],
    defaultOptions: { profile: "fast", hops: 1, includeRecent: false, includeProcedural: true, limit: 8 },
    contextPackTitles: {
      recall: "Highest-signal memories",
      graph: "Linked context",
      procedural: "Guardrails",
      recent: "Recent context",
      actions: "Suggested next moves"
    }
  },
  deep: {
    label: "Deep",
    overview: "Broader recall across semantic, graph, procedural, and recent lanes.",
    recommendedFor: [
      "general long-context synthesis",
      "higher-signal handoffs",
      "broader project recall"
    ],
    defaultOptions: { profile: "deep", hops: 2, includeRecent: true, includeProcedural: true, limit: 12, recentLimit: 6 },
    contextPackTitles: {
      recall: "High-signal memories",
      graph: "Linked graph context",
      procedural: "Procedural guidance",
      recent: "Recent context",
      actions: "Suggested next moves"
    }
  },
  "agent-safe": {
    label: "Agent Safe",
    overview: "Prompt-safe recall tuned for bounded handoffs and minimal noise.",
    recommendedFor: [
      "compact worker handoffs",
      "default bounded prompts",
      "shared agent contexts"
    ],
    defaultOptions: { profile: "agent-safe", hops: 1, includeRecent: true, includeProcedural: true, limit: 8, minNeighborScore: 0.3 },
    contextPackTitles: {
      recall: "Prompt-safe memories",
      graph: "Relevant linked context",
      procedural: "Operating rules",
      recent: "Recent context",
      actions: "Suggested next moves"
    }
  },
  "ops-debug": {
    label: "Ops Debug",
    overview: "Ops-heavy recall with extra recent and procedural weight for debugging and recovery work.",
    recommendedFor: [
      "production debugging",
      "incident investigation",
      "runbook-heavy workflows"
    ],
    defaultOptions: { profile: "ops-debug", hops: 2, includeRecent: true, includeProcedural: true, limit: 15, recentLimit: 10, proceduralLimit: 10 },
    contextPackTitles: {
      recall: "Operational memory",
      graph: "Linked investigation context",
      procedural: "Runbooks and guardrails",
      recent: "Recent operational context",
      actions: "Suggested next moves"
    }
  },
  "coding-agent": {
    label: "Coding Agent",
    overview: "Coding-focused recall tuned for implementation context, linked architecture, and procedural release rules.",
    recommendedFor: [
      "implementation work",
      "release prep",
      "codebase-aware handoffs"
    ],
    defaultOptions: {
      profile: "coding-agent",
      hops: 2,
      includeRecent: true,
      includeProcedural: true,
      limit: 10,
      recentLimit: 6,
      proceduralLimit: 8,
      minNeighborScore: 0.24,
      neighborLimit: 30
    },
    contextPackTitles: {
      recall: "Implementation-critical memories",
      graph: "Architecture and linked code context",
      procedural: "Coding and release guardrails",
      recent: "Recent project context",
      actions: "Suggested implementation moves"
    }
  },
  "ops-handoff": {
    label: "Ops Handoff",
    overview: "Handoff-oriented recall tuned for state transfer, recent activity, and clear operational rules.",
    recommendedFor: [
      "shift handoffs",
      "operator continuity",
      "state-heavy debugging"
    ],
    defaultOptions: {
      profile: "ops-handoff",
      hops: 2,
      includeRecent: true,
      includeProcedural: true,
      limit: 14,
      recentLimit: 10,
      proceduralLimit: 10,
      minNeighborScore: 0.2,
      neighborLimit: 35
    },
    contextPackTitles: {
      recall: "Handoff-critical memories",
      graph: "Linked system context",
      procedural: "Runbooks and escalation rules",
      recent: "Recent state and events",
      actions: "Suggested handoff actions"
    }
  },
  "research-brief": {
    label: "Research Brief",
    overview: "Research-oriented recall tuned for breadth, linked evidence, and concise briefing output.",
    recommendedFor: [
      "research synthesis",
      "evidence gathering",
      "brief generation"
    ],
    defaultOptions: {
      profile: "research-brief",
      hops: 2,
      includeRecent: true,
      includeProcedural: false,
      limit: 14,
      recentLimit: 4,
      minNeighborScore: 0.16,
      neighborLimit: 30
    },
    contextPackTitles: {
      recall: "High-value findings",
      graph: "Connected evidence and supporting context",
      procedural: "Research guardrails",
      recent: "Recent research context",
      actions: "Suggested research follow-ups"
    }
  }
};
function getSmartRecallProfiles() {
  return Object.keys(SMART_RECALL_PROFILE_CATALOG).map((profile) => {
    const descriptor = SMART_RECALL_PROFILE_CATALOG[profile];
    return {
      profile,
      label: descriptor.label,
      overview: descriptor.overview,
      recommendedFor: [...descriptor.recommendedFor],
      defaultOptions: { ...descriptor.defaultOptions },
      contextPackTitles: { ...descriptor.contextPackTitles }
    };
  });
}
function getSmartRecallProfile(profile) {
  const descriptor = SMART_RECALL_PROFILE_CATALOG[profile];
  return {
    profile,
    label: descriptor.label,
    overview: descriptor.overview,
    recommendedFor: [...descriptor.recommendedFor],
    defaultOptions: { ...descriptor.defaultOptions },
    contextPackTitles: { ...descriptor.contextPackTitles }
  };
}
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
  _layerConfig;
  _workspaceId;
  _agentId;
  _userId;
  normalizeNamespace(namespace) {
    const parsed = namespaceInputSchema.parse(namespace);
    return Array.isArray(parsed) ? parsed.join("/") : parsed;
  }
  getStoreScope() {
    return {
      workspaceId: this._workspaceId,
      agentId: this._agentId,
      userId: this._userId
    };
  }
  namespaceTopicTrail(namespace) {
    const parts = namespace.split("/").map((part) => part.trim()).filter(Boolean);
    return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
  }
  buildScopedMetadataFilters(scope, namespace, existing) {
    const parsedScope = namespaceQueryScopeSchema.parse(scope ?? {});
    const metadata = { ...existing ?? {} };
    if (namespace) {
      metadata.namespace = parsedScope.includeDescendants ? { contains: namespace } : namespace;
    }
    if (parsedScope.visibility === "private") {
      metadata.visibility = { in: ["private"] };
    } else if (parsedScope.visibility === "shared") {
      metadata.visibility = { in: ["shared"] };
    } else {
      metadata.visibility = { in: ["private", "shared"] };
    }
    return metadata;
  }
  normalizeRememberContent(content) {
    return content.trim().replace(/\s+/g, " ").toLowerCase();
  }
  rememberTokenSet(content) {
    return new Set(
      this.normalizeRememberContent(content).split(/[^a-z0-9_:/.-]+/i).filter((token) => token.length >= 3)
    );
  }
  inferRememberKind(input2) {
    if (input2.kind) return input2.kind;
    const text = `${input2.content} ${(input2.topics ?? []).join(" ")}`.toLowerCase();
    const metadata = input2.metadata ?? {};
    if (["artifactPath", "resourceUri", "url", "filePath", "checksum"].some((key) => typeof metadata[key] === "string")) {
      return "artifact-note";
    }
    if (/\b(prefer|preference|likes|dislikes|favorite|style|tone|settings?)\b/i.test(text)) {
      return "preference";
    }
    if (/\b(decided|decision|agreed|we will|ship with|going with|resolved|chosen)\b/i.test(text)) {
      return "decision";
    }
    if (/\b(always|never|when|if)\b/i.test(text) || /\b(checklist|runbook|procedure|playbook|must|should)\b/i.test(text)) {
      return "procedure";
    }
    if (/\b(today|just|observed|incident|happened|ran into|saw|noticed|error|failed|met with)\b/i.test(text)) {
      return "recent-event";
    }
    return "fact";
  }
  rememberLayerForKind(kind) {
    switch (kind) {
      case "procedure":
        return "procedural";
      case "recent-event":
        return "episodic";
      case "preference":
        return "identity";
      case "decision":
      case "artifact-note":
      case "fact":
      default:
        return "semantic";
    }
  }
  rememberScore(kind, content, topics, metadata) {
    const normalized = this.normalizeRememberContent(content);
    const tokenCount = normalized.split(/\s+/).filter(Boolean).length;
    let score = {
      fact: 0.6,
      preference: 0.74,
      decision: 0.82,
      procedure: 0.86,
      "recent-event": 0.62,
      "artifact-note": 0.78
    }[kind];
    if (content.length >= 40) score += 0.05;
    if (content.length >= 90) score += 0.04;
    if (topics.length > 0) score += Math.min(0.08, topics.length * 0.02);
    if (Object.keys(metadata).length > 0) score += 0.05;
    if (/\b(because|due to|so that|resolved|root cause|owner|release|version)\b/i.test(content)) score += 0.04;
    if (/\d/.test(content) || /https?:\/\//i.test(content)) score += 0.03;
    if (tokenCount <= 3) score -= 0.25;
    if (content.length < 18) score -= 0.18;
    if (/^(ok|okay|thanks|nice|cool|sounds good|got it|lol|yep|yup)[.! ]*$/i.test(normalized)) score -= 0.55;
    const threshold = kind === "recent-event" ? 0.55 : 0.58;
    const bounded = Math.max(0, Math.min(1, Number(score.toFixed(3))));
    const reason = bounded >= threshold ? `High-signal ${kind} memory` : `Below intake threshold for ${kind}`;
    return { score: bounded, threshold, reason };
  }
  rememberDuplicate(entries, content, topics) {
    const normalized = this.normalizeRememberContent(content);
    const nextTokens = this.rememberTokenSet(content);
    const nextTopicKey = [...topics].sort().join("|");
    for (const entry of entries) {
      const existing = this.normalizeRememberContent(entry.content);
      if (existing === normalized) return entry;
      const existingTokens = this.rememberTokenSet(entry.content);
      const union = /* @__PURE__ */ new Set([...nextTokens, ...existingTokens]);
      const intersection = [...nextTokens].filter((token) => existingTokens.has(token)).length;
      const tokenSimilarity = union.size === 0 ? 0 : intersection / union.size;
      const existingTopicKey = [...entry.topics].sort().join("|");
      if (tokenSimilarity >= 0.92 && (!nextTopicKey || !existingTopicKey || nextTopicKey === existingTopicKey)) {
        return entry;
      }
    }
    return null;
  }
  rememberConflicts(entries, content, topics) {
    const normalized = this.normalizeRememberContent(content);
    const contradictionSignal = /\b(not|no longer|instead|switched|changed to|moved to|replaced)\b/i.test(normalized);
    if (!contradictionSignal || topics.length === 0) return [];
    const nextTokens = this.rememberTokenSet(content);
    return entries.filter((entry) => entry.topics.some((topic) => topics.includes(topic))).filter((entry) => {
      const existingTokens = this.rememberTokenSet(entry.content);
      const union = /* @__PURE__ */ new Set([...nextTokens, ...existingTokens]);
      const intersection = [...nextTokens].filter((token) => existingTokens.has(token)).length;
      return union.size > 0 && intersection / union.size >= 0.35;
    }).map((entry) => entry.id).slice(0, 5);
  }
  buildProcedureTrigger(input2) {
    const existing = input2.metadata.trigger;
    if (existing && typeof existing === "object") return existing;
    const stopwords = /* @__PURE__ */ new Set(["the", "and", "that", "with", "from", "this", "when", "then", "before", "after", "always", "never", "should", "must"]);
    const terms = Array.from(this.rememberTokenSet(input2.content)).filter((token) => !stopwords.has(token)).slice(0, 6);
    const phrase = input2.content.trim().split(/\s+/).slice(0, 6).join(" ");
    return {
      terms,
      phrases: phrase ? [phrase] : [],
      topics: input2.topics.slice(0, 6),
      match: "any",
      minScore: 0.2,
      priority: 0.7
    };
  }
  graphNodeLabel(entry) {
    const metadataName = entry.metadata?.name;
    if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
    return entry.content.split("\n")[0]?.trim().slice(0, 80) || entry.id;
  }
  dotEscape(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }
  constructor(config) {
    const validated = rememConfigSchema.parse(config);
    const storage = validated.storage ?? "sqlite";
    if (storage === "postgres") {
      this._store = new PostgresMemoryStore({
        ...validated.storageConfig ?? {},
        ...validated.postgres ?? {}
      });
    } else {
      const dbPath = validated.dbPath ?? (storage === "memory" ? ":memory:" : "./remem.db");
      this._store = new MemoryStore(dbPath);
    }
    this._workspaceId = validated.storageConfig?.workspaceId;
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
   * Also restores persisted layer state from the configured store if layers are enabled.
   */
  async init() {
    await this._store.init();
    if (this._layersEnabled && this.layers) {
      const storeOpts = this.getStoreScope();
      const persisted = await this._store.loadAllLayerEntries(storeOpts);
      for (const entry of persisted) {
        this.layers.restoreEntry(entry);
      }
      if (persisted.length > 0) {
        console.log(`[ReMEM] Restored ${persisted.length} persisted layer entries from storage`);
      }
    }
  }
  /**
   * Store a new memory entry.
   * If layers are enabled, also persists to the appropriate layer in SQLite.
   * If embeddings are enabled, generates a vector embedding in the background.
   */
  async store(input2) {
    const normalized = storeMemoryInputSchema.parse(input2);
    const stored = await this._store.store(normalized, this.getStoreScope());
    if (this._layersEnabled && this.layers) {
      const result = this.layers.store(normalized);
      await this._store.persistLayerEntry(result, this.getStoreScope());
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
    return stored;
  }
  async remember(input2) {
    const normalized = rememberInputSchema.parse(input2);
    const kind = this.inferRememberKind(normalized);
    const layer = this.rememberLayerForKind(kind);
    const topics = Array.from(/* @__PURE__ */ new Set([...normalized.topics ?? [], kind, layer]));
    const metadata = {
      ...normalized.metadata ?? {},
      memoryKind: kind,
      intakeLayerHint: layer,
      rememberedAt: Date.now(),
      ...normalized.source ? { source: normalized.source } : {}
    };
    const { score, threshold, reason } = this.rememberScore(kind, normalized.content, topics, metadata);
    const recent = await this.getRecent(50);
    const duplicate2 = this.rememberDuplicate(recent, normalized.content, topics);
    const conflictIds = this.rememberConflicts(recent, normalized.content, topics);
    if (duplicate2) {
      return {
        action: normalized.dryRun ? "preview" : "skipped_duplicate",
        kind,
        layer,
        score,
        threshold,
        reason: "Near-identical memory already exists in recent recall.",
        duplicateOf: duplicate2.id,
        conflictIds,
        topics,
        metadata
      };
    }
    if (!normalized.forceStore && score < threshold) {
      return {
        action: normalized.dryRun ? "preview" : "skipped_low_signal",
        kind,
        layer,
        score,
        threshold,
        reason,
        conflictIds,
        topics,
        metadata
      };
    }
    const trigger = kind === "procedure" ? this.buildProcedureTrigger({ content: normalized.content, topics, metadata }) : void 0;
    const finalMetadata = {
      ...metadata,
      intakeScore: score,
      intakeReason: reason,
      ...trigger ? { trigger } : {},
      ...conflictIds.length > 0 ? { conflictIds } : {}
    };
    if (normalized.dryRun) {
      return {
        action: "preview",
        kind,
        layer,
        score,
        threshold,
        reason,
        conflictIds,
        topics,
        metadata: finalMetadata,
        ...trigger ? { trigger } : {}
      };
    }
    const entry = await this.store({
      content: normalized.content,
      topics,
      metadata: finalMetadata
    });
    return {
      action: "stored",
      kind,
      layer,
      score,
      threshold,
      reason,
      conflictIds,
      topics,
      metadata: finalMetadata,
      entry,
      ...trigger ? { trigger } : {}
    };
  }
  async rememberMany(inputs, options) {
    const normalizedInputs = rememberBatchInputSchema.parse(inputs);
    const opts = rememberBatchOptionsSchema.parse(options ?? {});
    const results = [];
    let stored = 0;
    let previews = 0;
    let skippedDuplicate = 0;
    let skippedLowSignal = 0;
    let failed = 0;
    for (const [index, input2] of normalizedInputs.entries()) {
      try {
        const result = await this.remember(input2);
        results.push({ index, ok: true, result });
        if (result.action === "stored") stored += 1;
        else if (result.action === "preview") previews += 1;
        else if (result.action === "skipped_duplicate") skippedDuplicate += 1;
        else if (result.action === "skipped_low_signal") skippedLowSignal += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        results.push({ index, ok: false, error: message });
        if (opts.stopOnError) {
          throw error;
        }
      }
    }
    return {
      total: normalizedInputs.length,
      stored,
      previews,
      skippedDuplicate,
      skippedLowSignal,
      failed,
      results
    };
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
        const { results: results2, totalAvailable: totalAvailable2 } = await this._store.semanticQuery(
          query,
          queryVector,
          options,
          this.getStoreScope()
        );
        return { results: results2, totalAvailable: totalAvailable2, query, tookMs: Date.now() - start };
      } catch (err) {
        console.warn(`[ReMEM] Semantic query failed, falling back to keyword: ${err}`);
      }
    }
    const { results, totalAvailable } = await this._store.query(query, options, this.getStoreScope());
    return { results, totalAvailable, query, tookMs: Date.now() - start };
  }
  async linkMemories(fromId, toId, type, metadata = {}) {
    return this._store.createLink({ fromId, toId, type, metadata }, this.getStoreScope());
  }
  async getLinkedMemories(memoryId, options) {
    const opts = linkedMemoryQueryOptionsSchema.parse(options ?? {});
    const links = await this._store.getLinks(memoryId, opts, this.getStoreScope());
    return Promise.all(links.map(async (link) => {
      const otherId = link.fromId === memoryId ? link.toId : link.fromId;
      return {
        link,
        memory: await this._store.getEntryById(otherId, this.getStoreScope())
      };
    }));
  }
  async unlinkMemories(linkId) {
    return this._store.deleteLink(linkId);
  }
  async queryWithNeighbors(query, options) {
    const opts = queryWithNeighborsOptionsSchema.parse(options ?? {});
    const base = await this.query(query, opts);
    const merged = /* @__PURE__ */ new Map();
    const paths = [];
    if (opts.includeBaseResults) {
      for (const result of base.results) merged.set(result.id, result);
    }
    let frontier = base.results.map((r) => ({ id: r.id, sourceId: r.id, score: r.relevanceScore ?? 0.6 }));
    const seen = new Set(frontier.map((item) => item.id));
    let linksTraversed = 0;
    for (let hop = 0; hop < opts.hops; hop++) {
      const nextFrontier = [];
      for (const item of frontier) {
        const neighbors = await this.getLinkedMemories(item.id, {
          direction: "both",
          types: opts.linkTypes,
          limit: opts.neighborLimit
        });
        linksTraversed += neighbors.length;
        for (const neighbor of neighbors) {
          if (!neighbor.memory) continue;
          const linkWeight = opts.linkTypeWeights?.[neighbor.link.type] ?? this.defaultLinkWeight(neighbor.link.type);
          const connectionWeight = this.metadataNumericWeight(neighbor.link.metadata, ["graphWeight", "weight", "strength"], 1);
          const nodeWeight = this.metadataNumericWeight(neighbor.memory.metadata ?? {}, ["graphWeight", "nodeWeight", "importance"], 1);
          const hopDecay = Math.max(0.2, 0.9 - hop * 0.15);
          const neighborScore = Math.min(1.5, (item.score || 0.6) * hopDecay * linkWeight * connectionWeight * nodeWeight);
          if (neighborScore < opts.minNeighborScore) continue;
          if (opts.includePathDetails) {
            paths.push({
              fromId: item.sourceId,
              toId: neighbor.memory.id,
              throughId: item.id,
              type: neighbor.link.type,
              hop: hop + 1,
              score: neighborScore
            });
          }
          const existing = merged.get(neighbor.memory.id);
          const enriched = {
            ...neighbor.memory,
            metadata: neighbor.memory.metadata ?? {},
            relevanceScore: Math.max(existing?.relevanceScore ?? 0, neighborScore, neighbor.memory.relevanceScore ?? 0)
          };
          merged.set(neighbor.memory.id, enriched);
          if (!seen.has(neighbor.memory.id)) {
            seen.add(neighbor.memory.id);
            nextFrontier.push({ id: neighbor.memory.id, sourceId: item.sourceId, score: neighborScore });
          }
        }
      }
      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }
    const results = Array.from(merged.values()).sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)).slice(0, opts.limit);
    return {
      results,
      totalAvailable: results.length,
      query,
      tookMs: base.tookMs,
      linksTraversed,
      ...opts.includePathDetails ? { paths } : {}
    };
  }
  async smartRecall(query, options) {
    const start = Date.now();
    const opts = smartRecallOptionsSchema.parse(options ?? {});
    const merged = { ...getSmartRecallProfile(opts.profile).defaultOptions, ...opts };
    const semanticBase = await this.query(query, merged);
    const graphBase = await this.queryWithNeighbors(query, {
      ...merged,
      includeBaseResults: true
    });
    const proceduralMatches = merged.includeProcedural ? (() => {
      const matches = /* @__PURE__ */ new Map();
      const pushMatches = (items) => {
        for (const item of items) {
          const existing = matches.get(item.entry.id);
          if (!existing || item.score > existing.score) {
            matches.set(item.entry.id, item);
          }
        }
      };
      pushMatches(this.matchProcedural(query));
      if (matches.size < merged.proceduralLimit) {
        const expansionContext = [
          query,
          ...semanticBase.results.slice(0, 3).map((result) => result.content),
          ...semanticBase.results.slice(0, 3).flatMap((result) => result.topics)
        ].join("\n");
        pushMatches(this.matchProcedural(expansionContext));
      }
      return Array.from(matches.values()).sort((a, b) => b.score - a.score).slice(0, merged.proceduralLimit);
    })() : [];
    const recentResults = merged.includeRecent ? (await this.getRecent(merged.recentLimit)).filter((entry) => {
      if (merged.topics && merged.topics.length > 0 && !merged.topics.some((topic) => entry.topics.includes(topic))) return false;
      if (merged.minAccessCount && entry.accessCount < merged.minAccessCount) return false;
      if (merged.metadata && this._store.matchMetadata && !this._store.matchMetadata(entry.metadata ?? {}, merged.metadata)) return false;
      return true;
    }) : [];
    const mergedResults = /* @__PURE__ */ new Map();
    const upsert = (result, sourceLane, combinedScore, reasons) => {
      const existing = mergedResults.get(result.id);
      const nextReasons = Array.from(/* @__PURE__ */ new Set([...existing?.reasons ?? [], ...reasons]));
      const nextScore = Math.max(existing?.combinedScore ?? 0, combinedScore);
      const nextLane = (existing?.combinedScore ?? -1) > combinedScore ? existing.sourceLane : sourceLane;
      mergedResults.set(result.id, {
        ...result,
        metadata: result.metadata ?? {},
        relevanceScore: Math.max(result.relevanceScore ?? 0, existing?.relevanceScore ?? 0),
        sourceLane: nextLane,
        reasons: nextReasons,
        combinedScore: nextScore
      });
    };
    for (const result of semanticBase.results) {
      upsert(result, "semantic", result.relevanceScore ?? 0.4, [`semantic:${(result.relevanceScore ?? 0).toFixed(2)}`]);
    }
    for (const result of graphBase.results) {
      const score = Math.min(1.5, (result.relevanceScore ?? 0.35) + 0.12);
      upsert(result, "graph", score, ["graph:linked-neighbor"]);
    }
    for (const match of proceduralMatches) {
      upsert(
        {
          id: match.entry.id,
          content: match.entry.content,
          topics: match.entry.topics,
          metadata: match.entry.metadata,
          relevanceScore: match.score,
          createdAt: match.entry.createdAt,
          accessedAt: match.entry.accessedAt,
          accessCount: match.entry.accessCount
        },
        "procedural",
        Math.min(1.5, match.score + 0.2),
        match.reasons.map((reason) => `procedural:${reason}`)
      );
    }
    for (const result of recentResults) {
      const recencyBoost = 0.15 + Math.min(0.2, result.accessCount * 0.02);
      upsert(result, "recent", (result.relevanceScore ?? 0.2) + recencyBoost, ["recent:active-context"]);
    }
    const results = Array.from(mergedResults.values()).sort((a, b) => b.combinedScore - a.combinedScore).slice(0, merged.limit);
    return {
      results,
      totalAvailable: mergedResults.size,
      query,
      tookMs: Date.now() - start,
      profile: merged.profile,
      lanes: {
        semantic: semanticBase.results.length,
        graph: Math.max(0, graphBase.results.length - semanticBase.results.length),
        procedural: proceduralMatches.length,
        recent: recentResults.length
      }
    };
  }
  async dream(options) {
    const start = Date.now();
    const opts = dreamOptionsSchema.parse(options ?? {});
    if (!this.layers) {
      await this.enableLayers();
    }
    const layerManager = this.layers;
    if (!layerManager) {
      return {
        query: opts.query,
        title: "Dream from long memory",
        content: "Long-memory dreaming is unavailable because layers are not enabled.",
        themes: [],
        actions: [],
        sourceIds: [],
        sourceLayers: opts.layers,
        sourceCount: 0,
        tookMs: Date.now() - start
      };
    }
    const queryTerms = new Set(
      opts.query.toLowerCase().split(/\W+/).filter((term) => term.length >= 3)
    );
    const scopedEntries = layerManager.getAllEntries().filter((entry) => opts.layers.includes(entry.layer)).filter((entry) => {
      if (opts.topicAllowlist?.length && !opts.topicAllowlist.some((topic) => entry.topics.includes(topic))) return false;
      if (opts.metadata && this._store.matchMetadata && !this._store.matchMetadata(entry.metadata ?? {}, opts.metadata)) return false;
      return true;
    });
    const scoredEntries = scopedEntries.map((entry) => {
      const text = `${entry.content} ${entry.topics.join(" ")}`.toLowerCase();
      const termHits = [...queryTerms].filter((term) => text.includes(term)).length;
      const score = termHits * 5 + entry.accessCount * 1.5 + entry.importance * 10 + (entry.layer === "identity" ? 4 : entry.layer === "procedural" ? 3 : 2);
      return { entry, score };
    }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.entry.createdAt - a.entry.createdAt;
    }).slice(0, opts.limit);
    const entries = scoredEntries.map((item) => item.entry);
    const sourceIds = entries.map((entry) => entry.id);
    const sourceLayers = Array.from(new Set(entries.map((entry) => entry.layer)));
    const topicCounts = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      for (const topic of entry.topics) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }
    const themes = [...topicCounts.entries()].filter(([topic]) => !topic.startsWith("session:")).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([topic]) => topic);
    const actions = entries.filter((entry) => entry.layer === "procedural" || entry.topics.includes("decision") || entry.topics.includes("procedure")).slice(0, 4).map((entry) => entry.content);
    if (!entries.length) {
      return {
        query: opts.query,
        title: "Dream from long memory",
        content: "No long-memory entries matched this dream pass yet.",
        themes: [],
        actions: [],
        sourceIds: [],
        sourceLayers: opts.layers,
        sourceCount: 0,
        tookMs: Date.now() - start
      };
    }
    const model = this.getModel();
    if (model) {
      const sourceBlock = entries.map((entry, index) => {
        const layer = entry.layer.toUpperCase();
        const topics = entry.topics.join(", ");
        return `${index + 1}. [${layer}] ${entry.content}
Topics: ${topics}`;
      }).join("\n\n");
      const response = await model.chat([
        {
          role: "system",
          content: "You are synthesizing an agent dream from long-term memory. Be compact, concrete, and forward-looking. Return strict JSON with keys title, content, themes, actions."
        },
        {
          role: "user",
          content: `Dream query: ${opts.query}

Use only these long-memory sources:

${sourceBlock}

Return JSON shaped like {"title":"...","content":"...","themes":["..."],"actions":["..."]}. Themes/actions should each have 2-4 short items.`
        }
      ], { temperature: 0.4, maxTokens: 700 });
      try {
        const parsed = JSON.parse(response.content);
        return {
          query: opts.query,
          title: parsed.title?.trim() || "Dream from long memory",
          content: parsed.content?.trim() || entries.map((entry) => entry.content).join("\n"),
          themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 4) : themes,
          actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 4) : actions,
          sourceIds,
          sourceLayers,
          sourceCount: entries.length,
          modelUsed: this.getModelName(),
          tookMs: Date.now() - start
        };
      } catch {
      }
    }
    return {
      query: opts.query,
      title: "Dream from long memory",
      content: [
        `Long memory keeps circling back to ${themes.length ? themes.join(", ") : "a few durable themes"}.`,
        `Most salient signals: ${entries.slice(0, 3).map((entry) => entry.content).join(" | ")}`,
        actions.length ? `Operational pull: ${actions.join(" | ")}` : "Operational pull: consolidate durable rules and turn repeated patterns into procedures."
      ].join("\n\n"),
      themes,
      actions,
      sourceIds,
      sourceLayers,
      sourceCount: entries.length,
      tookMs: Date.now() - start
    };
  }
  async contextPack(query, options) {
    const start = Date.now();
    const opts = contextPackOptionsSchema.parse({
      profile: "agent-safe",
      includeRecent: true,
      ...options
    });
    const recall = await this.smartRecall(query, opts);
    const seenIds = /* @__PURE__ */ new Set();
    const sourceIds = [];
    const sections = [];
    let truncated = false;
    const rememberSources = (ids) => {
      for (const id of ids) {
        if (!seenIds.has(id)) {
          seenIds.add(id);
          sourceIds.push(id);
        }
      }
    };
    const formatResult = (result, index) => {
      const lane = "sourceLane" in result ? ` lane=${result.sourceLane}` : "";
      const score = "combinedScore" in result ? ` score=${result.combinedScore.toFixed(2)}` : typeof result.relevanceScore === "number" ? ` score=${result.relevanceScore.toFixed(2)}` : "";
      const topics = result.topics.length ? ` topics=${result.topics.join(",")}` : "";
      const metadata = opts.includeMetadata && Object.keys(result.metadata ?? {}).length ? ` metadata=${JSON.stringify(result.metadata)}` : "";
      const reasons = "reasons" in result && result.reasons.length ? ` reasons=${result.reasons.join("|")}` : "";
      return `${index + 1}. [${result.id}]${lane}${score}${topics}${reasons}${metadata}
${result.content}`;
    };
    const profileDescriptor = getSmartRecallProfile(recall.profile);
    const semanticRecall = recall.results.filter((result) => result.sourceLane === "semantic");
    const laneGroups = {
      recall: semanticRecall.length ? semanticRecall : recall.results.filter((result) => result.sourceLane !== "recent").slice(0, 3),
      graph: recall.results.filter((result) => result.sourceLane === "graph" || result.reasons.some((reason) => reason.startsWith("graph:"))),
      procedural: recall.results.filter((result) => result.sourceLane === "procedural" || result.reasons.some((reason) => reason.startsWith("procedural:")))
    };
    const addSection = (section) => {
      const next = this.renderContextPack(query, recall.profile, [...sections, section], opts.maxChars);
      sections.push({
        ...section,
        content: next.sectionContents[next.sectionContents.length - 1] ?? section.content
      });
      truncated = truncated || next.truncated;
      rememberSources(section.sourceIds);
    };
    addSection({
      kind: "overview",
      title: "Recall overview",
      content: [
        `profile: ${recall.profile}`,
        `goal: ${profileDescriptor.overview}`,
        `lanes: semantic=${recall.lanes.semantic}, graph=${recall.lanes.graph}, procedural=${recall.lanes.procedural}, recent=${recall.lanes.recent}`,
        `totalAvailable: ${recall.totalAvailable}`
      ].join("\n"),
      sourceIds: []
    });
    if (laneGroups.recall.length) {
      addSection({
        kind: "recall",
        title: profileDescriptor.contextPackTitles.recall,
        content: laneGroups.recall.map(formatResult).join("\n\n"),
        sourceIds: laneGroups.recall.map((result) => result.id)
      });
    }
    if (laneGroups.graph.length) {
      addSection({
        kind: "graph",
        title: profileDescriptor.contextPackTitles.graph,
        content: laneGroups.graph.map(formatResult).join("\n\n"),
        sourceIds: laneGroups.graph.map((result) => result.id)
      });
    }
    if (laneGroups.procedural.length) {
      addSection({
        kind: "procedural",
        title: profileDescriptor.contextPackTitles.procedural,
        content: laneGroups.procedural.map(formatResult).join("\n\n"),
        sourceIds: laneGroups.procedural.map((result) => result.id)
      });
    }
    if (opts.includeRecent) {
      const recent = (await this.getRecent(opts.recentLimit)).filter((entry) => !seenIds.has(entry.id));
      if (recent.length) {
        addSection({
          kind: "recent",
          title: profileDescriptor.contextPackTitles.recent,
          content: recent.map(formatResult).join("\n\n"),
          sourceIds: recent.map((entry) => entry.id)
        });
      }
    }
    const actionCandidates = [
      ...laneGroups.procedural,
      ...laneGroups.recall.filter((result) => result.topics.includes("decision") || result.topics.includes("procedure")),
      ...laneGroups.graph.filter((result) => result.topics.includes("decision") || result.topics.includes("procedure"))
    ];
    const actionLines = Array.from(new Set(actionCandidates.map((result) => result.content.trim()))).slice(0, 5);
    if (actionLines.length) {
      addSection({
        kind: "actions",
        title: profileDescriptor.contextPackTitles.actions,
        content: actionLines.map((line, index) => `${index + 1}. ${line}`).join("\n"),
        sourceIds: actionCandidates.map((result) => result.id)
      });
    }
    if (opts.includeDream) {
      const dream = await this.dream({
        query,
        layers: ["identity", "semantic", "procedural"],
        limit: Math.min(Math.max(opts.limit, 4), 20),
        metadata: opts.metadata,
        topicAllowlist: opts.topics
      });
      if (dream.content && dream.sourceCount > 0) {
        addSection({
          kind: "dream",
          title: dream.title,
          content: [
            dream.content,
            dream.themes.length ? `themes: ${dream.themes.join(", ")}` : "",
            dream.actions.length ? `actions: ${dream.actions.join(" | ")}` : ""
          ].filter(Boolean).join("\n"),
          sourceIds: dream.sourceIds
        });
      }
    }
    const rendered = this.renderContextPack(query, recall.profile, sections, opts.maxChars);
    return {
      query,
      profile: recall.profile,
      content: rendered.content,
      sections: sections.map((section, index) => ({
        ...section,
        content: rendered.sectionContents[index] ?? section.content
      })),
      sourceIds,
      maxChars: opts.maxChars,
      usedChars: rendered.content.length,
      truncated: truncated || rendered.truncated,
      tookMs: Date.now() - start
    };
  }
  renderContextPack(query, profile, sections, maxChars) {
    const header = `# ReMEM Context Pack
query: ${query}
profile: ${profile}
`;
    const sectionContents = [];
    let content = header;
    let truncated = false;
    for (const section of sections) {
      const prefix = `
## ${section.title}
`;
      const available = maxChars - content.length - prefix.length;
      if (available <= 0) {
        truncated = true;
        break;
      }
      let body = section.content;
      if (body.length > available) {
        body = `${body.slice(0, Math.max(0, available - 24)).trimEnd()}
[truncated]`;
        truncated = true;
      }
      sectionContents.push(body);
      content += `${prefix}${body}
`;
      if (truncated) break;
    }
    return {
      content: content.slice(0, maxChars),
      sectionContents,
      truncated
    };
  }
  analyzeMemoryGraphStructure(nodes, links, topics) {
    const adjacency = /* @__PURE__ */ new Map();
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const linkById = new Map(links.map((link) => [link.id, link]));
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const link of links) {
      adjacency.get(link.fromId)?.push({ neighborId: link.toId, link });
      adjacency.get(link.toId)?.push({ neighborId: link.fromId, link });
    }
    const visited = /* @__PURE__ */ new Set();
    const clusters = [];
    let clusterIndex = 0;
    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      const stack = [node.id];
      const componentIds = [];
      const componentLinkIds = /* @__PURE__ */ new Set();
      visited.add(node.id);
      while (stack.length > 0) {
        const currentId = stack.pop();
        componentIds.push(currentId);
        for (const edge of adjacency.get(currentId) ?? []) {
          componentLinkIds.add(edge.link.id);
          if (!visited.has(edge.neighborId)) {
            visited.add(edge.neighborId);
            stack.push(edge.neighborId);
          }
        }
      }
      const componentIdSet = new Set(componentIds);
      const topTopics = topics.map((topic) => ({
        topic: topic.topic,
        count: topic.nodeIds.filter((id) => componentIdSet.has(id)).length
      })).filter((topic) => topic.count > 0).sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic)).slice(0, 5);
      clusters.push({
        id: `cluster-${++clusterIndex}`,
        nodeIds: componentIds.sort(),
        linkIds: Array.from(componentLinkIds).sort(),
        size: componentIds.length,
        totalNodeWeight: Number(componentIds.reduce((sum, id) => sum + (nodeById.get(id)?.weight ?? 0), 0).toFixed(4)),
        totalLinkWeight: Number(Array.from(componentLinkIds).reduce((sum, id) => sum + (linkById.get(id)?.weight ?? 0), 0).toFixed(4)),
        topTopics
      });
    }
    const discovery = /* @__PURE__ */ new Map();
    const low = /* @__PURE__ */ new Map();
    const parent = /* @__PURE__ */ new Map();
    const articulationIds = /* @__PURE__ */ new Set();
    const bridgeLinkIds = /* @__PURE__ */ new Set();
    let time = 0;
    const dfs = (nodeId) => {
      discovery.set(nodeId, ++time);
      low.set(nodeId, time);
      let childCount = 0;
      for (const edge of adjacency.get(nodeId) ?? []) {
        const neighborId = edge.neighborId;
        if (!discovery.has(neighborId)) {
          parent.set(neighborId, nodeId);
          childCount += 1;
          dfs(neighborId);
          low.set(nodeId, Math.min(low.get(nodeId), low.get(neighborId)));
          if (parent.get(nodeId) == null && childCount > 1) {
            articulationIds.add(nodeId);
          }
          if (parent.get(nodeId) != null && low.get(neighborId) >= discovery.get(nodeId)) {
            articulationIds.add(nodeId);
          }
          if (low.get(neighborId) > discovery.get(nodeId)) {
            bridgeLinkIds.add(edge.link.id);
          }
        } else if (neighborId !== parent.get(nodeId)) {
          low.set(nodeId, Math.min(low.get(nodeId), discovery.get(neighborId)));
        }
      }
    };
    for (const node of nodes) {
      if (!discovery.has(node.id)) {
        parent.set(node.id, null);
        dfs(node.id);
      }
    }
    return {
      clusters,
      bridges: {
        nodes: Array.from(articulationIds).map((nodeId) => {
          const node = nodeById.get(nodeId);
          const bridgeLinkIdsForNode = (adjacency.get(nodeId) ?? []).filter((edge) => bridgeLinkIds.has(edge.link.id)).map((edge) => edge.link.id).sort();
          return {
            nodeId,
            label: node.label,
            degree: (adjacency.get(nodeId) ?? []).length,
            topics: node.topics,
            bridgeLinkIds: bridgeLinkIdsForNode
          };
        }).sort((a, b) => b.bridgeLinkIds.length - a.bridgeLinkIds.length || b.degree - a.degree || a.label.localeCompare(b.label)),
        links: links.filter((link) => bridgeLinkIds.has(link.id)).map((link) => ({
          linkId: link.id,
          fromId: link.fromId,
          toId: link.toId,
          type: link.type,
          weight: link.weight
        })).sort((a, b) => b.weight - a.weight || a.type.localeCompare(b.type))
      }
    };
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
  usesNativeVectorSearch() {
    return Boolean(this._store.supportsNativeVectorSearch?.());
  }
  defaultLinkWeight(type) {
    switch (type) {
      case "knowledge:calls":
      case "knowledge:http_calls":
      case "knowledge:uses":
        return 1.1;
      case "knowledge:imports":
      case "knowledge:depends_on":
        return 1;
      case "knowledge:defines":
        return 0.9;
      case "knowledge:contains":
        return 0.7;
      case "supports":
      case "about":
        return 1;
      case "same_project":
      case "same_person":
        return 0.9;
      case "follows":
      case "caused_by":
        return 0.8;
      case "contradicts":
        return 0.55;
      default:
        return 0.75;
    }
  }
  metadataNumericWeight(metadata, keys, fallback) {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(0, Math.min(2, value));
      }
    }
    return fallback;
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
    return this._store.getRecent(n, this.getStoreScope());
  }
  /**
   * Return a compact inventory of the configured memory scope.
   * Useful for health checks, release audits, and agent context budgeting.
   */
  async stats() {
    const scope = this.getStoreScope();
    const [coreEntries, layerEntries, snapshots] = await Promise.all([
      this._store.getAllEntries(scope),
      this._store.loadAllLayerEntries(scope),
      this._store.listSnapshots(scope)
    ]);
    const topicCounts = /* @__PURE__ */ new Map();
    let oldestMemoryAt = null;
    let newestMemoryAt = null;
    for (const entry of coreEntries) {
      oldestMemoryAt = oldestMemoryAt === null ? entry.createdAt : Math.min(oldestMemoryAt, entry.createdAt);
      newestMemoryAt = newestMemoryAt === null ? entry.createdAt : Math.max(newestMemoryAt, entry.createdAt);
      for (const topic of entry.topics) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }
    const topics = [...topicCounts.entries()].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
    return {
      coreCount: coreEntries.length,
      layerCount: layerEntries.length,
      snapshotCount: snapshots.length,
      eventCount: this._store.getEventLog().length,
      topics,
      layers: this.getLayerStats(),
      oldestMemoryAt,
      newestMemoryAt
    };
  }
  /**
   * Build a visualization-ready snapshot of the current memory graph.
   * Returns weighted nodes, internal links, topic clusters, and Graphviz DOT.
   */
  async graph(options = {}) {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 100);
    const topics = options.topics?.filter(Boolean);
    const metadata = options.metadata && Object.keys(options.metadata).length > 0 ? options.metadata : void 0;
    const queryOptions = {
      limit,
      ...topics && topics.length > 0 ? { topics } : {},
      ...metadata ? { metadata } : {},
      minAccessCount: options.minAccessCount,
      since: options.since,
      until: options.until
    };
    const response = await this.query(options.query ?? "", queryOptions);
    const initialNodes = response.results.map((entry) => ({
      id: entry.id,
      label: this.graphNodeLabel(entry),
      content: entry.content,
      topics: entry.topics,
      metadata: entry.metadata ?? {},
      createdAt: entry.createdAt,
      accessedAt: entry.accessedAt,
      accessCount: entry.accessCount,
      weight: Number(((entry.relevanceScore ?? 0) + Math.min(1, entry.accessCount * 0.05) + Math.min(1, entry.topics.length * 0.08)).toFixed(4))
    }));
    const nodeIds = new Set(initialNodes.map((node) => node.id));
    const linksById = /* @__PURE__ */ new Map();
    const maxLinks = Math.min(Math.max(options.maxLinks ?? 250, 0), 1e3);
    const pageSize = 100;
    let truncated = false;
    for (const node of initialNodes) {
      if (linksById.size >= maxLinks) break;
      let offset = 0;
      while (linksById.size < maxLinks) {
        const linked = await this.getLinkedMemories(node.id, { direction: "both", limit: pageSize, offset });
        if (linked.length === 0) break;
        for (const item of linked) {
          const link = item.link;
          if (!nodeIds.has(link.fromId) || !nodeIds.has(link.toId)) continue;
          linksById.set(link.id, {
            id: link.id,
            fromId: link.fromId,
            toId: link.toId,
            type: link.type,
            weight: this.metadataNumericWeight(link.metadata ?? {}, ["graphWeight", "weight", "strength"], this.defaultLinkWeight(link.type)),
            metadata: link.metadata ?? {},
            createdAt: link.createdAt
          });
          if (linksById.size >= maxLinks) {
            truncated = true;
            break;
          }
        }
        if (linked.length < pageSize || linksById.size >= maxLinks) break;
        offset += linked.length;
      }
    }
    const links = Array.from(linksById.values()).sort((a, b) => b.weight - a.weight || a.type.localeCompare(b.type));
    const connectedIds = new Set(links.flatMap((link) => [link.fromId, link.toId]));
    const nodes = options.includeIsolated === false ? initialNodes.filter((node) => connectedIds.has(node.id)) : initialNodes;
    const finalNodeIds = new Set(nodes.map((node) => node.id));
    const finalLinks = links.filter((link) => finalNodeIds.has(link.fromId) && finalNodeIds.has(link.toId));
    const topicMap = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      for (const topic of node.topics) {
        if (!topicMap.has(topic)) topicMap.set(topic, /* @__PURE__ */ new Set());
        topicMap.get(topic).add(node.id);
      }
    }
    const topicClusters = Array.from(topicMap.entries()).map(([topic, ids]) => ({ topic, count: ids.size, nodeIds: Array.from(ids).sort() })).sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
    const structure = this.analyzeMemoryGraphStructure(nodes, finalLinks, topicClusters);
    const dotLines = [
      "digraph remem_memory {",
      "  graph [rankdir=LR];",
      '  node [shape=box, style="rounded,filled", fillcolor="#111827", fontcolor="#f9fafb", color="#374151"];',
      '  edge [color="#6b7280", fontcolor="#9ca3af"];',
      ...nodes.map((node) => `  "${this.dotEscape(node.id)}" [label="${this.dotEscape(node.label)}\\n${this.dotEscape(node.topics.slice(0, 3).join(", "))}"];`),
      ...finalLinks.map((link) => `  "${this.dotEscape(link.fromId)}" -> "${this.dotEscape(link.toId)}" [label="${this.dotEscape(link.type)}", penwidth="${Math.max(1, link.weight).toFixed(2)}"];`),
      "}"
    ];
    const cytoscape = {
      elements: [
        ...nodes.map((node) => ({
          group: "nodes",
          data: {
            id: node.id,
            label: node.label,
            content: node.content,
            topics: node.topics,
            weight: node.weight,
            metadata: node.metadata,
            createdAt: node.createdAt,
            accessedAt: node.accessedAt,
            accessCount: node.accessCount
          }
        })),
        ...finalLinks.map((link) => ({
          group: "edges",
          data: {
            id: link.id,
            source: link.fromId,
            target: link.toId,
            label: link.type,
            type: link.type,
            weight: link.weight,
            metadata: link.metadata,
            createdAt: link.createdAt
          }
        }))
      ]
    };
    return {
      name: "ReMEM Memory Graph",
      ...options.query ? { query: options.query } : {},
      nodes,
      links: finalLinks,
      topics: topicClusters,
      clusters: structure.clusters,
      bridges: structure.bridges,
      dot: dotLines.join("\n"),
      cytoscape,
      analysisScope: {
        nodeSet: "query-results",
        linkSet: "internal-links-between-returned-nodes",
        structureSet: "snapshot-internal",
        querySource: "filtered-query",
        pageSize,
        uniqueLinks: finalLinks.length,
        truncated,
        includeIsolated: options.includeIsolated !== false,
        maxLinks
      },
      generatedAt: Date.now()
    };
  }
  /**
   * Run storage maintenance for the configured memory scope.
   * Use dryRun first to inspect expired layers and dangling storage rows before pruning.
   */
  async storageMaintenance(options) {
    if (!this._store.maintenance) {
      throw new Error("Configured storage adapter does not support maintenance");
    }
    return this._store.maintenance(options, {
      agentId: this._agentId,
      userId: this._userId
    });
  }
  /**
   * Register an external knowledge artifact without importing all of its rows.
   * Use this for compressed or tool-owned graph files, for example a
   * `.codebase-memory/graph.db.zst` produced by a codebase-memory MCP.
   */
  async registerKnowledgeArtifact(input2) {
    const artifact = knowledgeArtifactRegistrationSchema.parse(input2);
    const source = artifact.source;
    const namespace = this.normalizeNamespace(["knowledge", source, artifact.project ?? "default"]);
    const content = [
      `External knowledge artifact registered: ${artifact.artifactPath}`,
      `source: ${source}`,
      artifact.project ? `project: ${artifact.project}` : null,
      artifact.resourceUri ? `resource: ${artifact.resourceUri}` : null,
      `format: ${artifact.format}`,
      artifact.compression ? `compression: ${artifact.compression}` : null,
      artifact.checksum ? `checksum: ${artifact.checksum}` : null,
      artifact.requiredScopes.length ? `required scopes: ${artifact.requiredScopes.join(", ")}` : null
    ].filter(Boolean).join("\n");
    const entry = await this._store.store({
      content,
      topics: Array.from(/* @__PURE__ */ new Set(["knowledge-artifact", source, ...this.namespaceTopicTrail(namespace)])),
      metadata: {
        ...artifact.metadata,
        source: "remem.knowledge.artifact",
        knowledgeSource: source,
        project: artifact.project,
        artifactPath: artifact.artifactPath,
        resourceUri: artifact.resourceUri,
        requiredScopes: artifact.requiredScopes,
        format: artifact.format,
        compression: artifact.compression,
        checksum: artifact.checksum,
        generatedAt: artifact.generatedAt,
        namespace,
        visibility: "shared"
      }
    }, {
      agentId: this._agentId,
      userId: this._userId
    });
    return {
      id: entry.id,
      source,
      project: artifact.project,
      artifactPath: artifact.artifactPath,
      resourceUri: artifact.resourceUri,
      requiredScopes: artifact.requiredScopes.length ? artifact.requiredScopes : void 0
    };
  }
  /**
   * Ingest a portable external knowledge graph into ReMEM.
   * Nodes become memory entries and edges become ReMEM links, so existing
   * graph recall can traverse architecture/import/call relationships.
   */
  async ingestKnowledgeGraph(artifact, options) {
    const graph = knowledgeGraphArtifactSchema.parse(artifact);
    const opts = knowledgeIngestOptionsSchema.parse({
      source: graph.source,
      project: graph.project,
      ...options
    });
    const source = opts.source ?? graph.source;
    const project = opts.project ?? graph.project;
    const namespace = this.normalizeNamespace(opts.namespace ?? ["knowledge", source, project ?? "default"]);
    const scope = this.getStoreScope();
    const nodeMemoryIds = {};
    let nodesStored = 0;
    let edgesLinked = 0;
    let skippedEdges = 0;
    for (const node of graph.nodes) {
      const graphWeight = node.weight ?? this.inferKnowledgeNodeWeight(node);
      const entry = await this._store.store({
        content: this.renderKnowledgeNodeContent(node),
        topics: Array.from(/* @__PURE__ */ new Set([
          opts.topic,
          source,
          node.label,
          ...node.kind ? [node.kind] : [],
          ...node.language ? [`language:${node.language}`] : [],
          ...this.namespaceTopicTrail(namespace)
        ])),
        metadata: {
          ...node.metadata,
          source: "remem.knowledge.node",
          knowledgeSource: source,
          project,
          resourceUri: graph.resourceUri,
          requiredScopes: graph.requiredScopes,
          externalId: node.id,
          label: node.label,
          name: node.name,
          kind: node.kind,
          path: node.path,
          language: node.language,
          graphWeight,
          nodeWeight: graphWeight,
          namespace,
          visibility: opts.visibility
        }
      }, scope);
      nodeMemoryIds[node.id] = entry.id;
      nodesStored += 1;
    }
    for (const edge of graph.edges) {
      const fromId = nodeMemoryIds[edge.from];
      const toId = nodeMemoryIds[edge.to];
      if (!fromId || !toId) {
        skippedEdges += 1;
        continue;
      }
      const graphWeight = edge.weight ?? this.inferKnowledgeEdgeWeight(edge);
      await this._store.createLink({
        fromId,
        toId,
        type: this.normalizeKnowledgeLinkType(edge.type, opts.linkTypePrefix),
        metadata: {
          ...edge.metadata,
          source: "remem.knowledge.edge",
          knowledgeSource: source,
          project,
          externalFrom: edge.from,
          externalTo: edge.to,
          externalType: edge.type,
          graphWeight,
          weight: graphWeight
        }
      }, scope);
      edgesLinked += 1;
    }
    return {
      source,
      project,
      namespace,
      nodesStored,
      edgesLinked,
      skippedEdges,
      nodeMemoryIds
    };
  }
  /**
   * Summarize imported knowledge/codebase graph memories by label, owner, and graph health.
   * Useful when another system owns indexing and ReMEM is the durable recall + traversal layer.
   */
  async knowledgeOverview(options = {}) {
    return createCodebaseMemoryAdapter(this).overview(options);
  }
  /**
   * Retrieve a scoped codebase/knowledge subgraph with prompt-ready context.
   * This exposes imported graph memories without requiring callers to instantiate an adapter themselves.
   */
  async knowledgeSubgraph(query, options = {}) {
    return createCodebaseMemoryAdapter(this).subgraph(query, options);
  }
  /**
   * Explain a focused codebase/knowledge graph query with a compact summary.
   * Useful when a caller needs one inspectable answer instead of building custom adapter glue.
   */
  async knowledgeExplain(query, options = {}) {
    return createCodebaseMemoryAdapter(this).explain(query, options);
  }
  /**
   * Return likely entrypoints from imported knowledge/codebase graph memories.
   */
  async knowledgeEntrypoints(options = {}) {
    return createCodebaseMemoryAdapter(this).entrypoints(options);
  }
  /**
   * Return owner/directory/package summaries from imported knowledge/codebase graph memories.
   */
  async knowledgeOwners(options = {}) {
    return createCodebaseMemoryAdapter(this).owners(options);
  }
  /**
   * Return the most connected graph nodes inside the current imported knowledge scope.
   */
  async knowledgeHotspots(options = {}) {
    return createCodebaseMemoryAdapter(this).hotspots(options);
  }
  /**
   * Return isolated or weakly connected graph nodes inside the current imported knowledge scope.
   */
  async knowledgeDeadzones(options = {}) {
    return createCodebaseMemoryAdapter(this).deadzones(options);
  }
  renderKnowledgeNodeContent(node) {
    const title = node.name ?? node.id;
    const lines = [
      `${node.label}: ${title}`,
      node.kind ? `kind: ${node.kind}` : null,
      node.path ? `path: ${node.path}` : null,
      node.language ? `language: ${node.language}` : null,
      node.summary,
      node.content
    ].filter((line) => typeof line === "string" && line.trim().length > 0);
    return lines.join("\n");
  }
  inferKnowledgeNodeWeight(node) {
    const label = node.label.toLowerCase();
    const kind = node.kind?.toLowerCase();
    if (kind === "entrypoint" || ["route", "api", "command"].includes(label)) return 1.25;
    if (label === "project") return 1.15;
    if (["class", "function"].includes(label)) return 1.1;
    if (label === "file") return 1;
    if (label === "package") return 0.9;
    if (label === "directory") return 0.75;
    if (label === "constant") return 0.85;
    return 1;
  }
  inferKnowledgeEdgeWeight(edge) {
    const type = edge.type.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    switch (type) {
      case "http_calls":
      case "calls":
      case "uses":
        return 1.2;
      case "imports":
      case "depends_on":
        return 1.05;
      case "defines":
        return 0.95;
      case "contains":
        return 0.7;
      default:
        return 1;
    }
  }
  normalizeKnowledgeLinkType(type, prefix) {
    const normalized = type.trim().toLowerCase().replace(/[^a-z0-9_:-]+/g, "_").replace(/^_+|_+$/g, "");
    if (!prefix) return normalized || "related";
    return `${prefix}:${normalized || "related"}`;
  }
  /**
   * Return a first-class memory health report with concrete maintenance actions.
   * Use this before long-running sessions, releases, or agent handoffs to decide
   * whether to snapshot, consolidate, dedupe, enrich metadata, or pack context.
   */
  async health(options) {
    const opts = memoryHealthOptionsSchema.parse(options ?? {});
    const checkedAt = Date.now();
    const scope = this.getStoreScope();
    const [coreEntries, layerEntries, snapshots, stats] = await Promise.all([
      this._store.getAllEntries(scope),
      this._store.loadAllLayerEntries(scope),
      this._store.listSnapshots(scope),
      this.stats()
    ]);
    const allEntries = [...coreEntries, ...layerEntries];
    const checks = [];
    const recommendations = [];
    const addRecommendation = (priority, action, reason, command) => {
      recommendations.push({ priority, action, reason, ...command ? { command } : {} });
    };
    if (allEntries.length === 0) {
      checks.push({
        name: "memory-volume",
        status: "warn",
        detail: "No memories are stored in this scope yet.",
        value: 0,
        action: "Store durable user, project, or procedure memories before relying on recall.",
        command: 'remem store --content "..." --topics ...'
      });
      addRecommendation("medium", "seed-memory", "The memory scope is empty, so recall and context packs have nothing durable to work with.", 'remem store --content "..." --topics ...');
    } else {
      checks.push({
        name: "memory-volume",
        status: "pass",
        detail: `${allEntries.length} memories available in this scope.`,
        value: allEntries.length
      });
    }
    const newestSnapshotAt = snapshots.reduce((latest, snapshot) => latest === null ? snapshot.createdAt : Math.max(latest, snapshot.createdAt), null);
    const snapshotAgeMs = newestSnapshotAt === null ? null : checkedAt - newestSnapshotAt;
    if (allEntries.length >= opts.minSnapshotMemories && snapshots.length === 0) {
      checks.push({
        name: "snapshot-coverage",
        status: "warn",
        detail: `${allEntries.length} memories exist but no snapshot has been created.`,
        value: snapshots.length,
        action: "Create a recovery checkpoint before more writes or a release.",
        command: "remem snapshots --action create --label before-maintenance"
      });
      addRecommendation("high", "create-snapshot", "There is enough memory state to deserve a restore point.", "remem snapshots --action create --label before-maintenance");
    } else if (snapshotAgeMs !== null && snapshotAgeMs > opts.maxSnapshotAgeMs) {
      checks.push({
        name: "snapshot-freshness",
        status: "warn",
        detail: `Newest snapshot is ${Math.round(snapshotAgeMs / 36e5)}h old.`,
        value: snapshotAgeMs,
        action: "Create a fresh snapshot before maintenance or deployment.",
        command: "remem snapshots --action create --label fresh-checkpoint"
      });
      addRecommendation("medium", "refresh-snapshot", "The latest snapshot is older than the configured freshness window.", "remem snapshots --action create --label fresh-checkpoint");
    } else {
      checks.push({
        name: "snapshot-coverage",
        status: "pass",
        detail: snapshots.length ? `${snapshots.length} snapshot(s), newest checkpoint is current enough.` : "Snapshot not required yet for this memory volume.",
        value: snapshots.length
      });
    }
    const duplicateGroups = this.findDuplicateGroups(allEntries, opts.duplicateSampleLimit);
    if (duplicateGroups.length > 0) {
      checks.push({
        name: "duplicate-content",
        status: "warn",
        detail: `${duplicateGroups.length} exact duplicate content group(s) found.`,
        value: duplicateGroups.map((group) => ({ content: group.content, count: group.ids.length, ids: group.ids })),
        action: "Run consolidation to merge duplicate or repeated memories.",
        command: "remem consolidate --summaries"
      });
      addRecommendation("medium", "consolidate-duplicates", "Repeated memories make retrieval noisier and waste context budget.", "remem consolidate --summaries");
    } else {
      checks.push({
        name: "duplicate-content",
        status: "pass",
        detail: "No exact duplicate content groups found.",
        value: 0
      });
    }
    const staleEntries = allEntries.filter((entry) => {
      const lastTouched = entry.accessedAt || entry.createdAt;
      return entry.accessCount === 0 && lastTouched < checkedAt - opts.staleAgeMs;
    });
    if (staleEntries.length > 0) {
      checks.push({
        name: "stale-unaccessed",
        status: "warn",
        detail: `${staleEntries.length} memories have never been recalled and are older than the stale window.`,
        value: staleEntries.slice(0, 10).map((entry) => entry.id),
        action: "Review stale memories and consolidate or prune low-value entries.",
        command: 'remem context-pack --query "What stale memories still matter?" --profile deep'
      });
      addRecommendation("low", "review-stale-memory", "Old unaccessed memories may be useful, but they should be reviewed before they become dead weight.", 'remem context-pack --query "What stale memories still matter?" --profile deep');
    } else {
      checks.push({
        name: "stale-unaccessed",
        status: "pass",
        detail: "No stale never-recalled memories found.",
        value: 0
      });
    }
    const untaggedEntries = allEntries.filter((entry) => entry.topics.length === 0);
    const untaggedRatio = allEntries.length ? untaggedEntries.length / allEntries.length : 0;
    if (untaggedRatio > opts.maxUntaggedRatio) {
      checks.push({
        name: "topic-coverage",
        status: "warn",
        detail: `${untaggedEntries.length}/${allEntries.length} memories have no topics.`,
        value: { untagged: untaggedEntries.length, ratio: untaggedRatio },
        action: "Add topics to improve filtered recall and context-pack quality."
      });
      addRecommendation("medium", "improve-topic-coverage", "Too many untagged memories reduce precision for scoped recall.");
    } else {
      checks.push({
        name: "topic-coverage",
        status: "pass",
        detail: `${untaggedEntries.length}/${allEntries.length} memories are untagged.`,
        value: { untagged: untaggedEntries.length, ratio: untaggedRatio }
      });
    }
    const layerStats = stats.layers;
    const pressuredLayers = layerStats ? Object.entries(layerStats).filter(([, layer]) => layer.maxEntries > 0 && layer.count / layer.maxEntries >= 0.8) : [];
    if (pressuredLayers.length > 0) {
      checks.push({
        name: "layer-pressure",
        status: "warn",
        detail: pressuredLayers.map(([layer, value]) => `${layer} ${value.count}/${value.maxEntries}`).join(", "),
        value: Object.fromEntries(pressuredLayers),
        action: "Run consolidation or compression before TTL/size pressure drops signal.",
        command: "remem consolidate --summaries --procedural"
      });
      addRecommendation("high", "relieve-layer-pressure", "One or more long-memory layers are near capacity.", "remem consolidate --summaries --procedural");
    } else {
      checks.push({
        name: "layer-pressure",
        status: "pass",
        detail: layerStats ? "Layer capacity is below the pressure threshold." : "Layer stats unavailable.",
        value: layerStats
      });
    }
    let score = 100;
    for (const check of checks) {
      if (check.status === "fail") score -= 30;
      if (check.status === "warn") score -= check.name === "snapshot-coverage" || check.name === "layer-pressure" ? 15 : 10;
    }
    score = Math.max(0, Math.min(100, score));
    return {
      score,
      status: score >= 85 ? "healthy" : score >= 65 ? "watch" : "attention",
      checkedAt,
      checks,
      recommendations: recommendations.sort((a, b) => this.recommendationRank(b.priority) - this.recommendationRank(a.priority)),
      stats: {
        coreCount: stats.coreCount,
        layerCount: stats.layerCount,
        snapshotCount: stats.snapshotCount,
        eventCount: stats.eventCount,
        duplicateGroups: duplicateGroups.length,
        staleCount: staleEntries.length,
        untaggedCount: untaggedEntries.length
      }
    };
  }
  findDuplicateGroups(entries, limit) {
    const groups = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      const key = entry.content.trim().replace(/\s+/g, " ").toLowerCase();
      if (!key) continue;
      const group = groups.get(key) ?? { content: entry.content, ids: [] };
      group.ids.push(entry.id);
      groups.set(key, group);
    }
    return [...groups.values()].filter((group) => group.ids.length > 1).sort((a, b) => b.ids.length - a.ids.length || a.content.localeCompare(b.content)).slice(0, limit);
  }
  recommendationRank(priority) {
    return { high: 3, medium: 2, low: 1 }[priority];
  }
  /**
   * Get entries by topic.
   */
  async getByTopic(topic, limit = 20) {
    return this._store.getByTopic(topic, limit, this.getStoreScope());
  }
  async storeShared(input2) {
    const { namespace: rawNamespace, visibility: rawVisibility, ...rest } = input2;
    const namespace = this.normalizeNamespace(rawNamespace);
    const visibility = rawVisibility ?? "shared";
    const topics = Array.from(/* @__PURE__ */ new Set([...rest.topics ?? [], ...this.namespaceTopicTrail(namespace)]));
    await this.store({
      content: rest.content,
      topics,
      metadata: {
        ...rest.metadata ?? {},
        namespace,
        visibility
      }
    });
  }
  getRecallProfiles() {
    return getSmartRecallProfiles();
  }
  getRecallProfile(profile) {
    return getSmartRecallProfile(profile);
  }
  async queryNamespace(namespace, query, options, scope) {
    const normalizedNamespace = this.normalizeNamespace(namespace);
    const parsedScope = namespaceQueryScopeSchema.parse(scope ?? {});
    const topics = parsedScope.includeDescendants ? options?.topics : Array.from(/* @__PURE__ */ new Set([...options?.topics ?? [], normalizedNamespace]));
    const queryOptions = queryWithNeighborsOptionsSchema.pick({
      limit: true,
      topics: true,
      metadata: true,
      minAccessCount: true,
      since: true,
      until: true
    }).parse({
      ...options ?? {},
      ...topics ? { topics } : {},
      metadata: this.buildScopedMetadataFilters(parsedScope, normalizedNamespace, options?.metadata)
    });
    return this.query(query, queryOptions);
  }
  async getRecentInNamespace(namespace, n = 10, scope) {
    const normalizedNamespace = this.normalizeNamespace(namespace);
    const recent = await this.getRecent(Math.max(n * 3, n));
    const filters = this.buildScopedMetadataFilters(scope, normalizedNamespace);
    return recent.filter((entry) => this._store.matchMetadata ? this._store.matchMetadata(entry.metadata ?? {}, filters ?? {}) : true).slice(0, n);
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
  async auditIdentityAlignment(sessionText) {
    const drift = await this.detectDrift(sessionText);
    return {
      drift,
      injection: this.getConstitutionInjection(drift),
      topStatements: drift.violatingStatements.slice(0, 5)
    };
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
    this._layerConfig = config ?? this._layerConfig;
    this.layers = new LayerManager(this._layerConfig ?? DEFAULT_LAYER_CONFIG, this.embeddingService);
    this._layersEnabled = true;
    if (this._store) {
      try {
        const storeOpts = this.getStoreScope();
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
  async storeInLayer(input2, layer) {
    const normalized = storeMemoryInputSchema.parse(input2);
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
      metadata: entry.metadata,
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
    for (const entry of entries) {
      await this._store.forgetLayerEntry(entry.id);
    }
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
  async storeProcedural(input2, trigger) {
    if (!this.layers) {
      await this.enableLayers();
    }
    const entry = this.layers.storeProcedural(input2, trigger);
    await this._store.persistLayerEntry(entry, {
      agentId: this._agentId,
      userId: this._userId
    });
    return {
      id: entry.id,
      content: entry.content,
      topics: entry.topics,
      metadata: entry.metadata,
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
    return this.matchProcedural(context).map((match) => ({
      id: match.entry.id,
      content: match.entry.content,
      topics: match.entry.topics,
      metadata: match.entry.metadata,
      relevanceScore: match.score,
      createdAt: match.entry.createdAt,
      accessedAt: match.entry.accessedAt,
      accessCount: match.entry.accessCount
    }));
  }
  matchProcedural(context) {
    if (!this.layers) return [];
    return this.layers.matchProcedural(context);
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
        metadata: current.metadata,
        relevanceScore: current.importance,
        createdAt: current.createdAt,
        accessedAt: current.accessedAt,
        accessCount: current.accessCount
      });
      const nextId = current.supersededBy ?? void 0;
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
    const meta = await this._store.createSnapshot(label, this.getStoreScope());
    return meta;
  }
  /**
   * Restore from a snapshot by ID.
   * Verifies checksum, then restores core and layered entries from the snapshot into the current store.
   * @returns Number of entries restored
   */
  async restoreSnapshot(snapshotId) {
    const restored = await this._store.restoreSnapshot(snapshotId, this.getStoreScope());
    if (this._layersEnabled) {
      await this.enableLayers(this._layerConfig);
    }
    return restored;
  }
  /**
   * List available snapshots.
   */
  async listSnapshots() {
    const snapshots = await this._store.listSnapshots(this.getStoreScope());
    return snapshots.map((s) => ({
      id: s.id,
      label: s.label,
      createdAt: s.createdAt,
      memoryCount: s.memoryCount,
      checksum: s.checksum
    }));
  }
  /**
   * Export a snapshot as portable JSON.
   */
  async exportSnapshot(snapshotId) {
    return this._store.exportSnapshot(snapshotId);
  }
  /**
   * Import a portable snapshot JSON export.
   */
  async importSnapshot(snapshot, opts) {
    return this._store.importSnapshot(snapshot, opts);
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
   * Get the configured model client for advanced workflows.
   */
  getModel() {
    return this.model;
  }
  /**
   * Run a first-class consolidation workflow: dedupe, conflict resolution,
   * promotion, optional summary generation, and optional procedural promotion.
   */
  async runConsolidation(options = {}) {
    if (!this.layers) {
      await this.enableLayers();
    }
    const consolidator = new MemoryConsolidator(this, this.embeddingService ?? null, options);
    return consolidator.runWorkflow(options);
  }
  /**
   * Close the memory store and release resources.
   */
  close() {
    this._store.close();
  }
};

// src/smoke.ts
async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }
  return response.json();
}
async function runEmbeddingProbe(memory, config) {
  const results = [];
  if (!config.embeddings?.enabled) {
    results.push({
      name: "embeddings",
      status: "skip",
      detail: "Embeddings are not enabled."
    });
    return results;
  }
  results.push({
    name: "embeddings-runtime",
    status: memory.isEmbeddingEnabled() ? "pass" : "fail",
    detail: memory.isEmbeddingEnabled() ? "Embedding runtime is enabled." : "Embeddings were configured but runtime is not active."
  });
  const service = memory.getEmbeddingService();
  if (!service) {
    results.push({
      name: "embeddings-service",
      status: "fail",
      detail: "Embedding service instance is unavailable."
    });
    return results;
  }
  try {
    const baseUrl = service.baseUrl.replace(/\/$/, "");
    await fetchJson(`${baseUrl}/api/tags`);
    results.push({
      name: "embeddings-endpoint",
      status: "pass",
      detail: `Reached Ollama endpoint at ${baseUrl}.`
    });
  } catch (error) {
    results.push({
      name: "embeddings-endpoint",
      status: "fail",
      detail: `Embedding endpoint probe failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  return results;
}
async function runLlmProbe(config) {
  const llm = config.llm;
  if (!llm) {
    return [{
      name: "llm",
      status: "skip",
      detail: "No LLM configured."
    }];
  }
  if (llm.type === "ollama") {
    try {
      const baseUrl = llm.baseUrl.replace(/\/$/, "");
      await fetchJson(`${baseUrl}/api/tags`);
      return [{
        name: "llm-endpoint",
        status: "pass",
        detail: `Reached Ollama chat endpoint at ${baseUrl}.`
      }];
    } catch (error) {
      return [{
        name: "llm-endpoint",
        status: "fail",
        detail: `LLM endpoint probe failed: ${error instanceof Error ? error.message : String(error)}`
      }];
    }
  }
  const authHeader = llm.type === "anthropic" ? { "x-api-key": llm.apiKey, "anthropic-version": "2023-06-01" } : { Authorization: `Bearer ${llm.apiKey}` };
  const modelsUrl = llm.type === "openai" ? `${(llm.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "")}/models` : llm.type === "anthropic" ? `${(llm.baseUrl ?? "https://api.anthropic.com/v1").replace(/\/$/, "")}/models` : `${(llm.baseUrl ?? "https://api.bankr.ai").replace(/\/$/, "")}/v1/models`;
  try {
    await fetchJson(modelsUrl, { headers: authHeader });
    return [{
      name: "llm-endpoint",
      status: "pass",
      detail: `Reached ${llm.type} model endpoint.`
    }];
  } catch (error) {
    return [{
      name: "llm-endpoint",
      status: "warn",
      detail: `Configured ${llm.type}, but endpoint probe failed: ${error instanceof Error ? error.message : String(error)}`
    }];
  }
}
async function runSmokeChecks(memory, config) {
  const checks = [];
  checks.push({
    name: "memory-init",
    status: "pass",
    detail: "Memory store initialized."
  });
  checks.push({
    name: "layers",
    status: memory.isLayersEnabled() ? "pass" : "warn",
    detail: memory.isLayersEnabled() ? "Layer manager enabled." : "Layers are not enabled."
  });
  try {
    const snapshot = await memory.createSnapshot(`smoke-check-${Date.now()}`);
    const snapshots = await memory.listSnapshots();
    const exists = snapshots.some((item) => item.id === snapshot.id);
    await memory.deleteSnapshot(snapshot.id);
    checks.push({
      name: "snapshot-roundtrip",
      status: exists ? "pass" : "fail",
      detail: exists ? "Snapshot create/list/delete roundtrip succeeded." : "Snapshot was created but not visible in list output."
    });
  } catch (error) {
    checks.push({
      name: "snapshot-roundtrip",
      status: "fail",
      detail: `Snapshot roundtrip failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  checks.push(...await runEmbeddingProbe(memory, config));
  checks.push(...await runLlmProbe(config));
  return checks;
}

// src/setup.ts
function formatMaybeJson(value) {
  return JSON.stringify(value, null, 2).split("\n");
}
function storageSummary(context) {
  return [
    `storage: ${context.storageLabel}`,
    `db: ${context.dbLabel}`,
    `scope: ${context.scopeLabel}`,
    `native vector search: ${context.memory.usesNativeVectorSearch() ? "yes" : "no"}`,
    `snapshots: ${context.snapshots.length}`
  ];
}
function embeddingSummary(config, memory) {
  const enabled = Boolean(config.embeddings?.enabled);
  return [
    `enabled: ${enabled ? "yes" : "no"}`,
    "provider: Ollama-compatible",
    `base URL: ${config.embeddings?.baseUrl ?? "http://localhost:11434"}`,
    `model: ${config.embeddings?.model ?? "nomic-embed-text"}`,
    `runtime active: ${memory.isEmbeddingEnabled() ? "yes" : "no"}`
  ];
}
function llmSummary(config) {
  const llm = config.llm;
  const configuredModel = llm?.type === "bankr" ? "provider default" : llm?.model ?? "none";
  return [
    `configured: ${llm ? "yes" : "no"}`,
    `provider: ${llm?.type ?? "none"}`,
    `model: ${configuredModel}`,
    `base URL: ${"baseUrl" in (llm ?? {}) ? llm.baseUrl ?? "default" : "default"}`
  ];
}
function openClawChecklist() {
  return [
    "Use when you want memory behind session turns, decisions, and reusable procedures.",
    "",
    "Recommended onboarding:",
    "1. Create a local SQLite or Postgres-backed ReMEM instance.",
    "2. Enable embeddings if conversational recall quality matters.",
    "3. Wrap the instance with createOpenClawAdapter(memory).",
    "4. Write turns + decisions into memory from your runtime hooks.",
    "5. Pull concise context blocks with recallContext() or recallProjectContext().",
    "",
    "Best fit:",
    "- persistent session memory",
    "- release rules / decisions / user preferences",
    "- shared project memory without bloating prompt context"
  ];
}
function hermesChecklist() {
  return [
    "Use when you want harness-oriented memory around threads, runs, artifacts, and shared lanes.",
    "",
    "Recommended onboarding:",
    "1. Stand up the base ReMEM store.",
    "2. Wrap it with createHermesAdapter(memory).",
    "3. Persist turns, artifacts, decisions, and shared namespace notes.",
    "4. Use recallShared() for reusable team/project lanes.",
    "",
    "Best fit:",
    "- thread/run scoped recall",
    "- artifacts and rollout lanes",
    "- shared namespace memory across harness workflows"
  ];
}
function setupPlan(runtimeFocus) {
  const runtimeStep = runtimeFocus === "OpenClaw" ? "Wire createOpenClawAdapter(memory) into turn + decision hooks." : runtimeFocus === "Hermes" ? "Wire createHermesAdapter(memory) into thread/run/artifact hooks." : "Choose the adapter surface your runtime actually needs.";
  return [
    "1. Pick storage lane (sqlite first, postgres when shared infra is real)",
    "2. Turn on embeddings if semantic recall matters",
    "3. Add an LLM only if you need recursive/synthesis workflows",
    `4. ${runtimeStep}`,
    "5. Generate starter config + smoke test init/status before shipping"
  ];
}
function smokeCheckSummary() {
  return [
    "Running real smoke checks against the configured runtime...",
    "Includes snapshot roundtrip plus optional embedding / model endpoint probes."
  ];
}
function generateExampleConfig(context) {
  const config = context.config;
  const example = {
    storage: config.storage ?? "sqlite",
    dbPath: config.dbPath ?? "./remem.db",
    storageConfig: config.storageConfig ?? {},
    ...config.postgres ? { postgres: config.postgres } : {},
    ...config.embeddings ? { embeddings: config.embeddings } : {},
    ...config.llm ? { llm: { ...config.llm, ...config.llm.type !== "ollama" ? { apiKey: "ENV_OR_SECRET_HERE" } : {} } } : {}
  };
  return formatMaybeJson(example);
}
function generateAdapterSnippet(runtimeFocus) {
  if (runtimeFocus === "OpenClaw") {
    return [
      "import { ReMEM, createOpenClawAdapter } from '@darksol/remem';",
      "",
      "const memory = new ReMEM({ dbPath: './remem.db' });",
      "await memory.init();",
      "await memory.enableLayers();",
      "",
      "const openclaw = createOpenClawAdapter(memory);",
      "await openclaw.rememberTurn({",
      "  role: 'user',",
      "  content: 'Ship after tests pass',",
      "  sessionId: 'general',",
      "});",
      "",
      "const context = await openclaw.recallContext('release rules');"
    ];
  }
  if (runtimeFocus === "Hermes") {
    return [
      "import { ReMEM, createHermesAdapter } from '@darksol/remem';",
      "",
      "const memory = new ReMEM({ dbPath: './remem.db' });",
      "await memory.init();",
      "await memory.enableLayers();",
      "",
      "const hermes = createHermesAdapter(memory);",
      "await hermes.rememberTurn({",
      "  role: 'user',",
      "  content: 'Ship Hermes support after tests pass',",
      "  threadId: 'general',",
      "  runId: 'run-42',",
      "});",
      "",
      "const shared = await hermes.recallShared(['team', 'hermes'], 'rollout lane');"
    ];
  }
  return [
    "import { ReMEM } from '@darksol/remem';",
    "",
    "const memory = new ReMEM({ dbPath: './remem.db' });",
    "await memory.init();",
    "await memory.enableLayers();",
    "",
    "// Pick the adapter your runtime actually needs:",
    "// createOpenClawAdapter(memory)",
    "// createHermesAdapter(memory)",
    "// createLangGraphStoreAdapter(memory)",
    "// createVercelAIAdapter(memory)"
  ];
}
function executionModelNotes() {
  return [
    "What belongs in the UI:",
    "- config review",
    "- onboarding guidance",
    "- adapter choice",
    "- starter snippets",
    "- smoke checks",
    "",
    "What should stay out of the UI:",
    "- routine agent memory writes",
    "- full manual recall browsing as a primary workflow",
    "- procedural / layered ops that agents can already script directly"
  ];
}
function generateInitArtifacts(context) {
  const configJson = `${generateExampleConfig({ config: context.config }).join("\n")}
`;
  const snippetTs = `${generateAdapterSnippet(context.runtimeFocus).join("\n")}
`;
  const envExampleLines = [
    "# ReMEM starter environment",
    context.config.storage === "postgres" ? "REMEM_POSTGRES_URL=postgres://user:pass@localhost:5432/remem" : "# REMEM_POSTGRES_URL=",
    context.config.embeddings?.enabled ? `REMEM_EMBEDDINGS_URL=${context.config.embeddings.baseUrl}` : "# REMEM_EMBEDDINGS_URL=http://localhost:11434",
    context.config.embeddings?.enabled ? `REMEM_EMBEDDINGS_MODEL=${context.config.embeddings.model}` : "# REMEM_EMBEDDINGS_MODEL=nomic-embed-text",
    context.config.llm?.type && context.config.llm.type !== "ollama" ? `REMEM_${context.config.llm.type.toUpperCase()}_API_KEY=your-key-here` : "# REMEM_LLM_API_KEY="
  ];
  return {
    configJson,
    snippetTs,
    envExample: `${envExampleLines.join("\n")}
`
  };
}

// src/ui.ts
var import_promises = __toESM(require("readline/promises"));
var import_node_process = require("process");
function clearScreen() {
  import_node_process.stdout.write("\x1Bc");
}
function divider(width = 92) {
  return "\u2500".repeat(width);
}
function truncate(value, width) {
  if (value.length <= width) return value;
  return `${value.slice(0, Math.max(0, width - 1))}\u2026`;
}
function panel(title, lines = []) {
  const width = 92;
  const top = `\u250C${divider(width - 2)}\u2510`;
  const mid = `\u251C${divider(width - 2)}\u2524`;
  const bottom = `\u2514${divider(width - 2)}\u2518`;
  const titleLine = `\u2502 ${truncate(title, width - 4)}`.padEnd(width - 1, " ") + "\u2502";
  const body = (lines.length ? lines : [""]).map((line) => `\u2502 ${truncate(String(line), width - 4)}`.padEnd(width - 1, " ") + "\u2502");
  return [top, titleLine, mid, ...body, bottom].join("\n");
}
function hero(selectedRuntime) {
  return [
    "\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557",
    "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551",
    "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551",
    "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551",
    "\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551",
    "\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D",
    "",
    `setup + integration console  |  focus: ${selectedRuntime}`
  ].join("\n");
}
async function pause(rl, message = "Press Enter to continue...") {
  await rl.question(`
${message}`);
}
async function overviewFlow(context) {
  console.log(panel("ReMEM setup overview", [
    ...storageSummary(context),
    "",
    `runtime focus: ${context.runtimeFocus}`,
    "This console is for human setup and adapter onboarding.",
    "The agent-facing memory ops stay in CLI/API land."
  ]));
}
async function runtimeFocusFlow(rl, context) {
  const answer = (await rl.question("Pick runtime focus [1] OpenClaw [2] Hermes [3] Generic: ")).trim();
  if (answer === "1") context.runtimeFocus = "OpenClaw";
  else if (answer === "2") context.runtimeFocus = "Hermes";
  else if (answer === "3") context.runtimeFocus = "Generic";
  console.log(panel("Runtime focus updated", [
    `selected: ${context.runtimeFocus}`,
    context.runtimeFocus === "OpenClaw" ? "Next screens will bias toward session-turn memory onboarding." : context.runtimeFocus === "Hermes" ? "Next screens will bias toward thread/run/artifact onboarding." : "Next screens will stay framework-neutral."
  ]));
}
async function storageFlow(context) {
  console.log(panel("Storage configuration", [
    ...storageSummary(context),
    "",
    context.storageLabel === "postgres" ? "Use this when shared/server deployments need scoped persistence." : context.storageLabel === "memory" ? "Ephemeral lane for tests, demos, and smoke checks." : "SQLite is the sane default for local durable memory and first integration passes."
  ]));
}
async function embeddingsFlow(context) {
  console.log(panel("Embeddings configuration", [
    ...embeddingSummary(context.config, context.memory),
    "",
    "Turn this on when you want semantic recall instead of pure keyword matching."
  ]));
}
async function llmFlow(context) {
  console.log(panel("LLM configuration", [
    ...llmSummary(context.config),
    "",
    "Only needed for recursive/synthesis workflows. Core memory store/query does not require it."
  ]));
}
async function adapterFlow(context) {
  const lines = context.runtimeFocus === "OpenClaw" ? openClawChecklist() : context.runtimeFocus === "Hermes" ? hermesChecklist() : [
    "Pick the thinnest adapter surface that matches your runtime.",
    "",
    "- OpenClaw: session turns, decisions, procedures, project context",
    "- Hermes: threads, runs, artifacts, shared namespaces",
    "- LangGraph: BaseStore-ish search/put/get namespace lane",
    "- Vercel AI: helper surface for saved messages + context recall"
  ];
  console.log(panel(`${context.runtimeFocus} adapter onboarding`, lines));
}
async function snippetFlow(context) {
  console.log(panel(`${context.runtimeFocus} starter snippet`, generateAdapterSnippet(context.runtimeFocus)));
}
async function generatedConfigFlow(context) {
  console.log(panel("Starter config", generateExampleConfig(context)));
}
async function smokeChecksFlow(context) {
  console.log(panel("Smoke checks", smokeCheckSummary()));
  console.log();
  const checks = await runSmokeChecks(context.memory, context.config);
  console.log(panel("Smoke check results", checks.map((check) => `${check.status.toUpperCase()}  ${check.name}  ${check.detail}`)));
}
async function executionPlanFlow(context) {
  console.log(panel("Execution plan", setupPlan(context.runtimeFocus)));
  console.log();
  console.log(panel("Scope sanity check", executionModelNotes()));
}
async function launchTerminalUi(memory, context) {
  if (!import_node_process.stdin.isTTY || !import_node_process.stdout.isTTY) {
    throw new Error("terminal_ui_requires_tty");
  }
  const rl = import_promises.default.createInterface({ input: import_node_process.stdin, output: import_node_process.stdout });
  const setupContext = {
    memory,
    storageLabel: context.storageLabel,
    dbLabel: context.dbLabel,
    scopeLabel: context.scopeLabel,
    config: context.config,
    snapshots: await memory.listSnapshots(),
    runtimeFocus: "OpenClaw"
  };
  try {
    for (; ; ) {
      clearScreen();
      console.log(hero(setupContext.runtimeFocus));
      console.log();
      console.log(panel("ReMEM setup console", [
        "1. Overview",
        "2. Choose runtime focus",
        "3. Storage configuration",
        "4. Embeddings configuration",
        "5. LLM configuration",
        "6. Adapter onboarding",
        "7. Starter snippet",
        "8. Generate starter config",
        "9. Smoke checks",
        "10. Recommended execution plan",
        "0. Exit"
      ]));
      const choice = (await rl.question("\nSelect action: ")).trim();
      clearScreen();
      try {
        if (choice === "0") break;
        if (choice === "1") await overviewFlow(setupContext);
        else if (choice === "2") await runtimeFocusFlow(rl, setupContext);
        else if (choice === "3") await storageFlow(setupContext);
        else if (choice === "4") await embeddingsFlow(setupContext);
        else if (choice === "5") await llmFlow(setupContext);
        else if (choice === "6") await adapterFlow(setupContext);
        else if (choice === "7") await snippetFlow(setupContext);
        else if (choice === "8") await generatedConfigFlow(setupContext);
        else if (choice === "9") await smokeChecksFlow(setupContext);
        else if (choice === "10") await executionPlanFlow(setupContext);
        else console.log(panel("Unknown action", ["Pick one of the listed numbers."]));
      } catch (error) {
        console.log(panel("Action failed", [error instanceof Error ? error.message : String(error)]));
      }
      await pause(rl);
    }
  } finally {
    rl.close();
    clearScreen();
  }
}

// src/cli.ts
var gunzipAsync = (0, import_node_util.promisify)(import_node_zlib.gunzip);
function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || "help";
  const rest = [];
  const options = {};
  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) {
      rest.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }
  return { command, rest, options };
}
function asString(value, fallback = "") {
  if (typeof value === "string") return value;
  return fallback;
}
function asNumber(value, fallback) {
  const parsed = Number(asString(value, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}
function asCsv(value) {
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
function asNamespace(value) {
  if (typeof value !== "string") return [];
  return value.replace(/\//g, ",").split(",").map((item) => item.trim()).filter(Boolean);
}
function parseMaybeJson(value) {
  if (typeof value !== "string" || !value.trim()) return {};
  return JSON.parse(value);
}
function resolveProfileOption(value, fallback) {
  return resolveSmartRecallProfile(asString(value)) ?? fallback;
}
function buildConfig(options) {
  const storage = asString(options.storage, "sqlite");
  const dbPath = asString(options.db, storage === "memory" ? ":memory:" : "./remem.db");
  const workspaceId = asString(options["workspace-id"]) || void 0;
  const agentId = asString(options["agent-id"]) || void 0;
  const userId = asString(options["user-id"]) || void 0;
  const config = {
    storage,
    dbPath,
    storageConfig: {
      workspaceId,
      agentId,
      userId
    }
  };
  const postgresUrl = asString(options["postgres-url"]);
  if (storage === "postgres" && postgresUrl) {
    config.postgres = { connectionString: postgresUrl };
  }
  if (options.embeddings) {
    config.embeddings = {
      enabled: true,
      baseUrl: asString(options["embeddings-url"], "http://localhost:11434"),
      model: asString(options["embeddings-model"], "nomic-embed-text"),
      asyncEmbed: true
    };
  }
  const llmType = asString(options["llm-type"]);
  if (llmType) {
    const apiKey = asString(options["llm-api-key"]);
    const model = asString(options["llm-model"]);
    const baseUrl = asString(options["llm-base-url"]);
    if (llmType === "ollama") {
      config.llm = {
        type: "ollama",
        baseUrl: baseUrl || "http://localhost:11434",
        model: model || "llama3"
      };
    } else if (llmType === "openai" && apiKey) {
      config.llm = { type: "openai", apiKey, model: model || "gpt-4o", ...baseUrl ? { baseUrl } : {} };
    } else if (llmType === "anthropic" && apiKey) {
      config.llm = { type: "anthropic", apiKey, model: model || "claude-sonnet-4-6", ...baseUrl ? { baseUrl } : {} };
    } else if (llmType === "bankr" && apiKey) {
      config.llm = { type: "bankr", apiKey, ...baseUrl ? { baseUrl } : {} };
    }
  }
  return {
    config,
    storageLabel: storage,
    dbLabel: storage === "postgres" ? postgresUrl || "postgres" : dbPath,
    scopeLabel: [workspaceId ? `workspace:${workspaceId}` : null, agentId ? `agent:${agentId}` : null, userId ? `user:${userId}` : null].filter(Boolean).join(" | ") || "global"
  };
}
function helpText() {
  return `ReMEM CLI

Usage:
  remem ui [--db <path>] [--storage sqlite|memory|postgres] [--workspace-id <id>] [--agent-id <id>] [--user-id <id>]
  remem init [same flags as ui] [--runtime openclaw|hermes|generic] [--out-dir <path>] [--json]
  remem status [--db <path>]
  remem stats [--db <path>] [--json]
  remem graph [--query <text>] [--limit 100] [--dot] [--json]
  remem health [--db <path>] [--json]
  remem storage-maintenance [--dry-run] [--compact] [--json]
  remem knowledge-artifact --path <file> [--source codebase-memory-mcp] [--project <name>] [--resource-uri <uri>] [--required-scopes a,b] [--format sqlite] [--compression zstd] [--json]
  remem knowledge-ingest --artifact <graph.json|graph.json.gz> [--source <name>] [--project <name>] [--namespace team/code] [--visibility shared|private] [--json]
  remem knowledge-overview [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem knowledge-explain --query <text> [--project <name>] [--limit 8] [--neighbor-limit 8] [--connections calls,imports] [--labels Function,Route] [--owners src,packages] [--max-context-chars 6000] [--json]
  remem knowledge-subgraph --query <text> [--project <name>] [--limit 8] [--neighbor-limit 8] [--connections calls,imports] [--labels Function,Route] [--owners src,packages] [--max-context-chars 6000] [--json]
  remem knowledge-entrypoints [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem knowledge-owners [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem knowledge-hotspots [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem knowledge-deadzones [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem store --content <text> [--topics a,b] [--metadata '{"kind":"note"}']
  remem remember --content <text> [--kind fact|preference|decision|procedure|recent-event|artifact-note] [--topics a,b] [--source <name>] [--dry-run]
  remem remember-batch --file <items.json> [--stop-on-error] [--json]
  remem query --query <text> [--limit 8]
  remem recent [--limit 10]
  remem topic --topic <name> [--limit 10]
  remem layer-store --layer semantic --content <text> [--topics a,b]
  remem procedural-store --content <text> --trigger <phrase> [--topics a,b]
  remem procedural-match --context <text>
  remem shared-store --namespace team/ops --content <text> [--visibility shared|private]
  remem namespace-query --namespace team/ops --query <text> [--visibility all|shared|private]
  remem namespace-recent --namespace team/ops [--limit 10] [--visibility all|shared|private]
  remem recall-profiles [--profile <name>] [--json]
  remem smart-recall --query <text> [--profile fast|deep|agent-safe|ops-debug|coding-agent|ops-handoff|research-brief] [--limit 8]
  remem context-pack --query <text> [--profile fast|deep|agent-safe|ops-debug|coding-agent|ops-handoff|research-brief] [--max-chars 6000] [--dream]
  remem dream [--query <text>] [--layers identity,semantic,procedural] [--limit 12]
  remem snapshots --action list|create|restore|delete [--label <name>] [--snapshot-id <id>]
  remem consolidate [--summaries] [--procedural]
  remem smoke-check [--db <path>] [--json]
  remem doctor [--config <path>] [--json]
  remem validate-config --config <path> [--json]

Human-facing setup:
  remem ui / remem init      Setup console for runtime focus selection, storage,
                             embeddings, model config, adapter onboarding,
                             starter snippets/config, and smoke checks.

Agent-facing ops:
  Use the direct CLI commands above for memory writes, recall, snapshots, and consolidation.

Common config flags:
  --db <path>                SQLite path (default ./remem.db)
  --storage <mode>           sqlite | memory | postgres
  --postgres-url <url>       Postgres connection string
  --workspace-id <id>        Workspace scope
  --agent-id <id>            Agent scope
  --user-id <id>             User scope
  --embeddings               Enable embedding search
  --embeddings-url <url>     Ollama embeddings URL
  --embeddings-model <name>  Embedding model (default nomic-embed-text)
  --llm-type <provider>      bankr | openai | anthropic | ollama
  --llm-api-key <key>        API key for bankr/openai/anthropic
  --llm-model <name>         Model override
  --llm-base-url <url>       Custom provider base URL
  --runtime <name>           openclaw | hermes | generic (for init artifacts)
  --out-dir <path>           Output directory for generated init artifacts
  --json                     Emit machine-readable JSON output
`;
}
function isJsonMode(options) {
  return Boolean(options.json);
}
function emitError(runtime, jsonMode, message) {
  if (jsonMode) {
    writeStderr(runtime, `${JSON.stringify({ ok: false, error: message })}
`);
  } else {
    writeStderr(runtime, `Error: ${message}
`);
  }
}
function requireOption(value, name, jsonMode, runtime) {
  const str = asString(value);
  if (!str) {
    emitError(runtime, jsonMode, `Missing required option: --${name}`);
    return null;
  }
  return str;
}
function writeStdout(runtime, chunk) {
  (runtime.writeStdout ?? ((value) => process.stdout.write(value)))(chunk);
}
function writeStderr(runtime, chunk) {
  (runtime.writeStderr ?? ((value) => process.stderr.write(value)))(chunk);
}
function emitJson(runtime, value) {
  writeStdout(runtime, `${JSON.stringify(value)}
`);
}
function emitText(runtime, value = "") {
  writeStdout(runtime, value);
}
function formatQueryResults(results) {
  if (!results.length) return "No results.";
  return results.map((result, index) => `${index + 1}. ${result.content}${typeof result.relevanceScore === "number" ? ` (score ${result.relevanceScore.toFixed(3)})` : ""}`).join("\n");
}
function formatChecks(checks) {
  return checks.map((check) => `- [${check.status}] ${check.name}: ${check.detail}`).join("\n");
}
function formatRecommendations(recommendations) {
  if (!recommendations.length) return "No recommendations.";
  return recommendations.map((item) => {
    const command = item.command ? `
  command: ${item.command}` : "";
    return `- [${item.priority}] ${item.action}: ${item.reason}${command}`;
  }).join("\n");
}
function hasFailingChecks(checks) {
  return checks.some((check) => check.status === "fail");
}
function parseRuntimeFocus(value) {
  const normalized = asString(value, "openclaw").toLowerCase();
  if (normalized === "hermes") return "Hermes";
  if (normalized === "generic") return "Generic";
  return "OpenClaw";
}
async function writeInitArtifacts(outDir, artifacts) {
  await import_promises2.default.mkdir(outDir, { recursive: true });
  const files = [
    { path: import_node_path.default.join(outDir, "remem.config.json"), content: artifacts.configJson },
    { path: import_node_path.default.join(outDir, "remem-snippet.ts"), content: artifacts.snippetTs },
    { path: import_node_path.default.join(outDir, ".env.example"), content: artifacts.envExample }
  ];
  await Promise.all(files.map((file) => import_promises2.default.writeFile(file.path, file.content, "utf8")));
  return files.map((file) => file.path);
}
async function readJsonFile(filePath) {
  const raw = await import_promises2.default.readFile(filePath, "utf8");
  return JSON.parse(raw);
}
async function readRememberBatchFile(filePath) {
  const parsed = await readJsonFile(import_node_path.default.resolve(filePath));
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
    return parsed.items;
  }
  throw new Error("Batch file must be a JSON array or an object with an items array.");
}
async function readKnowledgeGraphFile(filePath) {
  const resolved = import_node_path.default.resolve(filePath);
  const data = await import_promises2.default.readFile(resolved);
  const raw = resolved.endsWith(".gz") ? (await gunzipAsync(data)).toString("utf8") : data.toString("utf8");
  return knowledgeGraphArtifactSchema.parse(JSON.parse(raw));
}
async function validateConfigFile(filePath) {
  const resolved = import_node_path.default.resolve(filePath);
  const checks = [];
  let config = null;
  try {
    const parsed = await readJsonFile(resolved);
    checks.push({
      name: "config-json",
      status: "pass",
      detail: `Read valid JSON from ${resolved}.`
    });
    const knownConfigKeys = ["storage", "storageConfig", "postgres", "llm", "adapter", "dbPath", "embeddings"];
    const hasKnownConfigKey = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && knownConfigKeys.some((key) => Object.prototype.hasOwnProperty.call(parsed, key));
    const validation = hasKnownConfigKey ? rememConfigSchema.safeParse(parsed) : {
      success: false,
      error: {
        issues: [{ path: [], message: "No ReMEM config fields found." }]
      }
    };
    if (validation.success) {
      config = validation.data;
      checks.push({
        name: "config-schema",
        status: "pass",
        detail: "Configuration matches ReMEM schema."
      });
    } else {
      checks.push({
        name: "config-schema",
        status: "fail",
        detail: validation.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ")
      });
    }
  } catch (error) {
    checks.push({
      name: "config-json",
      status: "fail",
      detail: `Could not read/parse config: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  if (config) {
    if (config.storage === "postgres" && !config.postgres?.connectionString) {
      checks.push({
        name: "postgres-url",
        status: "warn",
        detail: "Postgres storage is selected but no connectionString is set."
      });
    }
    if ((config.storage ?? "sqlite") === "sqlite" && !config.dbPath) {
      checks.push({
        name: "sqlite-db-path",
        status: "warn",
        detail: "SQLite storage will use the default ./remem.db path."
      });
    }
  }
  return {
    ok: !hasFailingChecks(checks),
    configPath: resolved,
    config,
    checks
  };
}
function publicConfigValidation(validation) {
  return {
    ok: validation.ok,
    configPath: validation.configPath,
    checks: validation.checks
  };
}
async function packageVersion() {
  const binaryDir = process.argv[1] ? import_node_path.default.dirname(process.argv[1]) : process.cwd();
  const candidates = [
    import_node_path.default.resolve(process.cwd(), "package.json"),
    import_node_path.default.resolve(binaryDir, "..", "package.json")
  ];
  for (const candidate of candidates) {
    try {
      const parsed = await readJsonFile(candidate);
      if (parsed.name === "@darksol/remem" && parsed.version) return parsed.version;
    } catch {
    }
  }
  return "unknown";
}
async function runDoctor(memory, context, options) {
  const checks = [];
  const version = await packageVersion();
  checks.push({
    name: "package-version",
    status: version === "unknown" ? "warn" : "pass",
    detail: `@darksol/remem ${version}`
  });
  checks.push({
    name: "node-version",
    status: "pass",
    detail: process.version
  });
  checks.push({
    name: "binary-path",
    status: "pass",
    detail: process.argv[1] ?? "unknown"
  });
  const configPath = asString(options.config);
  let configValidation = null;
  if (configPath) {
    configValidation = await validateConfigFile(configPath);
    checks.push(...configValidation.checks);
  } else {
    checks.push({
      name: "config-file",
      status: "skip",
      detail: "No --config path provided."
    });
  }
  checks.push({
    name: "storage",
    status: "pass",
    detail: `${context.storageLabel} (${context.dbLabel})`
  });
  checks.push({
    name: "scope",
    status: "pass",
    detail: context.scopeLabel
  });
  checks.push({
    name: "native-vector-search",
    status: memory.usesNativeVectorSearch() ? "pass" : "skip",
    detail: memory.usesNativeVectorSearch() ? "Native vector search is active." : "Native vector search is not active for this storage/config."
  });
  checks.push(...await runSmokeChecks(memory, configValidation?.config ?? context.config));
  return {
    ok: !hasFailingChecks(checks),
    command: "doctor",
    version,
    storage: context.storageLabel,
    db: context.dbLabel,
    scope: context.scopeLabel,
    configPath: configValidation?.configPath ?? null,
    checks
  };
}
async function withMemory(options, fn) {
  const context = buildConfig(options);
  const memory = new ReMEM(context.config);
  await memory.init();
  await memory.enableLayers();
  try {
    return await fn(memory, context);
  } finally {
    memory.close();
  }
}
async function runCli(argv = process.argv, runtime = {}) {
  const { command, options } = parseArgs(argv);
  const jsonMode = isJsonMode(options);
  const uiLauncher = runtime.launchUi ?? launchTerminalUi;
  if (command === "help" || command === "--help" || command === "-h") {
    emitText(runtime, helpText());
    return 0;
  }
  if (command === "ui" || command === "console") {
    await withMemory(options, async (memory, context) => {
      await uiLauncher(memory, {
        storageLabel: context.storageLabel,
        dbLabel: context.dbLabel,
        scopeLabel: context.scopeLabel,
        config: context.config
      });
    });
    return 0;
  }
  if (command === "init") {
    await withMemory(options, async (memory, context) => {
      const runtimeFocus = parseRuntimeFocus(options.runtime);
      const artifacts = generateInitArtifacts({ config: context.config, runtimeFocus });
      const outDir = import_node_path.default.resolve(asString(options["out-dir"], import_node_path.default.join(process.cwd(), ".remem")));
      const written = await writeInitArtifacts(outDir, artifacts);
      const configValidation = await validateConfigFile(import_node_path.default.join(outDir, "remem.config.json"));
      const smokeChecks = await runSmokeChecks(memory, context.config);
      const doctorChecks = options.check || options.doctor ? (await runDoctor(memory, context, { ...options, config: import_node_path.default.join(outDir, "remem.config.json") })).checks : void 0;
      const payload = {
        ok: configValidation.ok && !hasFailingChecks(smokeChecks) && (!doctorChecks || !hasFailingChecks(doctorChecks)),
        command,
        runtimeFocus,
        outDir,
        files: written,
        configValidation: publicConfigValidation(configValidation),
        smokeChecks,
        ...doctorChecks ? { doctorChecks } : {}
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        const checkOutput = options.check || options.doctor ? `
Doctor checks:
${formatChecks(doctorChecks ?? [])}
` : "";
        emitText(runtime, `Generated init artifacts in ${outDir}
${written.map((file) => `- ${file}`).join("\n")}
${checkOutput}`);
      }
    });
    return 0;
  }
  if (command === "status") {
    await withMemory(options, async (memory, context) => {
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        layersEnabled: memory.isLayersEnabled(),
        nativeVectorSearch: memory.usesNativeVectorSearch(),
        layerStats: memory.getLayerStats(),
        snapshots: await memory.listSnapshots()
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `status: ok
storage: ${payload.storage}
db: ${payload.db}
scope: ${payload.scope}
layers: ${payload.layersEnabled ? "enabled" : "disabled"}
snapshots: ${payload.snapshots.length}
`);
    });
    return 0;
  }
  if (command === "stats") {
    await withMemory(options, async (memory, context) => {
      const stats = await memory.stats();
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...stats
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        const topTopics = stats.topics.slice(0, 8).map((item) => `${item.topic}:${item.count}`).join(", ") || "none";
        emitText(
          runtime,
          [
            `core memories: ${stats.coreCount}`,
            `layer memories: ${stats.layerCount}`,
            `snapshots: ${stats.snapshotCount}`,
            `events: ${stats.eventCount}`,
            `top topics: ${topTopics}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "graph") {
    await withMemory(options, async (memory, context) => {
      const metadata = parseMaybeJson(options.metadata);
      const graph = await memory.graph({
        query: asString(options.query) || void 0,
        limit: asNumber(options.limit, 100),
        topics: asCsv(options.topics),
        metadata,
        includeIsolated: !options["hide-isolated"],
        maxLinks: asNumber(options["max-links"], 250)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...graph
      };
      if (options.dot) emitText(runtime, `${graph.dot}
`);
      else if (jsonMode) emitJson(runtime, payload);
      else {
        const topTopics = graph.topics.slice(0, 8).map((item) => `${item.topic}:${item.count}`).join(", ") || "none";
        emitText(
          runtime,
          [
            `memory graph: ${graph.nodes.length} nodes, ${graph.links.length} links`,
            `top topics: ${topTopics}`,
            `dot: remem graph --dot${graph.query ? ` --query "${graph.query}"` : ""}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "health") {
    await withMemory(options, async (memory, context) => {
      const healthOptions = {
        staleAgeMs: asNumber(options["stale-age-ms"], 7 * 24 * 60 * 60 * 1e3),
        maxSnapshotAgeMs: asNumber(options["max-snapshot-age-ms"], 24 * 60 * 60 * 1e3),
        minSnapshotMemories: asNumber(options["min-snapshot-memories"], 10),
        maxUntaggedRatio: asNumber(options["max-untagged-ratio"], 0.25),
        duplicateSampleLimit: asNumber(options["duplicate-sample-limit"], 10)
      };
      const health = await memory.health(healthOptions);
      const payload = {
        ok: health.status !== "attention",
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...health
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `health: ${health.status} (${health.score}/100)`,
            "checks:",
            formatChecks(health.checks),
            "recommendations:",
            formatRecommendations(health.recommendations),
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "storage-maintenance") {
    await withMemory(options, async (memory, context) => {
      const maintenanceOptions = {
        dryRun: Boolean(options["dry-run"]),
        compact: Boolean(options.compact),
        pruneExpired: !options["skip-expired"],
        pruneOrphanLinks: !options["skip-orphan-links"],
        pruneOrphanEmbeddings: !options["skip-orphan-embeddings"],
        now: options.now ? asNumber(options.now, Date.now()) : void 0
      };
      const result = await memory.storageMaintenance(maintenanceOptions);
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `storage maintenance: ${result.dryRun ? "dry-run" : "applied"}`,
            `expired layer entries: ${result.expiredLayerEntries}`,
            `orphan links: ${result.orphanLinks}`,
            `orphan embeddings: ${result.orphanEmbeddings}`,
            `compacted: ${result.compacted ? "yes" : "no"}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "knowledge-artifact") {
    await withMemory(options, async (memory, context) => {
      const artifactPath = requireOption(options.path, "path", jsonMode, runtime);
      if (artifactPath === null) return;
      const registration = knowledgeArtifactRegistrationSchema.parse({
        source: asString(options.source, "codebase-memory-mcp"),
        project: asString(options.project) || void 0,
        artifactPath,
        resourceUri: asString(options["resource-uri"]) || void 0,
        requiredScopes: asCsv(options["required-scopes"]),
        format: asString(options.format, artifactPath.endsWith(".zst") ? "sqlite" : "json"),
        compression: asString(options.compression, artifactPath.endsWith(".zst") ? "zstd" : "") || void 0,
        checksum: asString(options.checksum) || void 0,
        generatedAt: options["generated-at"] ? asNumber(options["generated-at"], Date.now()) : void 0,
        metadata: parseMaybeJson(options.metadata)
      });
      const result = await memory.registerKnowledgeArtifact(registration);
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `Registered knowledge artifact ${result.artifactPath} (${result.id}).
`);
    });
    return 0;
  }
  if (command === "knowledge-ingest") {
    await withMemory(options, async (memory, context) => {
      const artifactPath = requireOption(options.artifact, "artifact", jsonMode, runtime);
      if (artifactPath === null) return;
      const resolved = import_node_path.default.resolve(artifactPath);
      try {
        const stat = await import_promises2.default.stat(resolved);
        if (!stat.isFile()) {
          emitError(runtime, jsonMode, `Path is not a file: ${resolved}`);
          return;
        }
      } catch {
        emitError(runtime, jsonMode, `File not found: ${resolved}`);
        return;
      }
      const graph = await readKnowledgeGraphFile(artifactPath);
      const visibility = asString(options.visibility, "shared") === "private" ? "private" : "shared";
      const result = await memory.ingestKnowledgeGraph(graph, {
        source: asString(options.source) || graph.source,
        project: asString(options.project) || graph.project,
        namespace: asNamespace(options.namespace).length ? asNamespace(options.namespace) : void 0,
        visibility,
        topic: asString(options.topic, "knowledge-graph"),
        linkTypePrefix: asString(options["link-prefix"], "knowledge")
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        artifact: import_node_path.default.resolve(artifactPath),
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `Ingested ${result.nodesStored} knowledge nodes and ${result.edgesLinked} links (${result.skippedEdges} skipped).
`);
    });
    return 0;
  }
  if (command === "knowledge-overview") {
    await withMemory(options, async (memory, context) => {
      const result = await memory.knowledgeOverview({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `knowledge overview${result.project ? ` (${result.project})` : ""}`,
            `nodes: ${result.nodes}`,
            `labels: ${Object.entries(result.labels).map(([label, count]) => `${label}:${count}`).join(", ") || "none"}`,
            `owners: ${result.owners.length}`,
            `entrypoints: ${result.entrypoints.length}`,
            `hotspots: ${result.hotspots.length}`,
            `deadzones: ${result.deadzones.length}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "knowledge-subgraph") {
    await withMemory(options, async (memory, context) => {
      const query = requireOption(options.query, "query", jsonMode, runtime);
      if (query === null) return;
      const result = await memory.knowledgeSubgraph(query, {
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 8),
        neighborLimit: asNumber(options["neighbor-limit"], asNumber(options.limit, 8)),
        maxContextChars: asNumber(options["max-context-chars"], 6e3),
        connectionTypes: asCsv(options.connections),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners),
        minConnectionWeight: options["min-connection-weight"] ? asNumber(options["min-connection-weight"], 0) : void 0
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `knowledge subgraph for "${query}"`,
            `nodes: ${result.results.length}`,
            `paths: ${result.paths.length}`,
            `links traversed: ${result.linksTraversed}`,
            "",
            result.context,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "knowledge-explain") {
    await withMemory(options, async (memory, context) => {
      const query = requireOption(options.query, "query", jsonMode, runtime);
      if (query === null) return;
      const result = await memory.knowledgeExplain(query, {
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 8),
        neighborLimit: asNumber(options["neighbor-limit"], asNumber(options.limit, 8)),
        maxContextChars: asNumber(options["max-context-chars"], 6e3),
        connectionTypes: asCsv(options.connections),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners),
        minConnectionWeight: options["min-connection-weight"] ? asNumber(options["min-connection-weight"], 0) : void 0
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            payload.summary,
            "",
            payload.context,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "knowledge-entrypoints") {
    await withMemory(options, async (memory, context) => {
      const entrypoints = await memory.knowledgeEntrypoints({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        entrypoints
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, entrypoints.length ? `${entrypoints.map((item) => `- ${item.node.content.split("\n")[0]}`).join("\n")}
` : "No entrypoints.\n");
    });
    return 0;
  }
  if (command === "knowledge-owners") {
    await withMemory(options, async (memory, context) => {
      const owners = await memory.knowledgeOwners({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        owners
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, owners.length ? `${owners.map((item) => `- ${item.owner} (${item.type}) nodes:${item.nodes}`).join("\n")}
` : "No owners.\n");
    });
    return 0;
  }
  if (command === "knowledge-hotspots") {
    await withMemory(options, async (memory, context) => {
      const hotspots = await memory.knowledgeHotspots({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        hotspots
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, hotspots.length ? `${hotspots.map((item) => `- ${item.node.content.split("\n")[0]} in:${item.incoming} out:${item.outgoing}`).join("\n")}
` : "No hotspots.\n");
    });
    return 0;
  }
  if (command === "knowledge-deadzones") {
    await withMemory(options, async (memory, context) => {
      const deadzones = await memory.knowledgeDeadzones({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        deadzones
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, deadzones.length ? `${deadzones.map((item) => `- ${item.node.content.split("\n")[0]} in:${item.incoming} out:${item.outgoing}`).join("\n")}
` : "No deadzones.\n");
    });
    return 0;
  }
  if (command === "store") {
    await withMemory(options, async (memory) => {
      const content = requireOption(options.content, "content", jsonMode, runtime);
      if (content === null) return;
      await memory.store({
        content,
        topics: asCsv(options.topics),
        metadata: parseMaybeJson(options.metadata)
      });
      if (jsonMode) emitJson(runtime, { ok: true, command, stored: true });
      else emitText(runtime, "Stored memory entry.\n");
    });
    return 0;
  }
  if (command === "remember") {
    await withMemory(options, async (memory) => {
      const content = requireOption(options.content, "content", jsonMode, runtime);
      if (content === null) return;
      const result = await memory.remember({
        content,
        topics: asCsv(options.topics),
        metadata: parseMaybeJson(options.metadata),
        kind: asString(options.kind) || void 0,
        source: asString(options.source) || void 0,
        dryRun: Boolean(options["dry-run"]),
        forceStore: Boolean(options["force-store"])
      });
      const payload = { ok: result.action === "stored" || result.action === "preview", command, ...result };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${result.action}: ${result.reason}
kind: ${result.kind}
layer: ${result.layer}
score: ${result.score}
`);
    });
    return 0;
  }
  if (command === "remember-batch") {
    await withMemory(options, async (memory) => {
      const file = requireOption(options.file, "file", jsonMode, runtime);
      if (file === null) return;
      const result = await memory.rememberMany(await readRememberBatchFile(file), {
        stopOnError: Boolean(options["stop-on-error"])
      });
      const payload = { ok: result.failed === 0, command, ...result };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `remember-batch processed ${result.total} items`,
            `stored: ${result.stored}`,
            `preview: ${result.previews}`,
            `duplicates: ${result.skippedDuplicate}`,
            `low-signal: ${result.skippedLowSignal}`,
            `failed: ${result.failed}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "query") {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, ...await memory.query(asString(options.query), { limit: Number(asString(options.limit, "8")) || 8 }) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "recent") {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, results: await memory.getRecent(Number(asString(options.limit, "10")) || 10) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "topic") {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, results: await memory.getByTopic(asString(options.topic), Number(asString(options.limit, "10")) || 10) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "layer-store") {
    await withMemory(options, async (memory) => {
      const layer = requireOption(options.layer, "layer", jsonMode, runtime);
      if (layer === null) return;
      const payload = {
        ok: true,
        command,
        layer,
        result: await memory.storeInLayer({
          content: asString(options.content),
          topics: asCsv(options.topics),
          metadata: parseMaybeJson(options.metadata)
        }, layer)
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `Stored layered memory in ${layer}.
`);
    });
    return 0;
  }
  if (command === "procedural-store") {
    await withMemory(options, async (memory) => {
      const trigger = requireOption(options.trigger, "trigger", jsonMode, runtime);
      if (trigger === null) return;
      const payload = {
        ok: true,
        command,
        result: await memory.storeProcedural({
          content: asString(options.content),
          topics: asCsv(options.topics),
          metadata: parseMaybeJson(options.metadata)
        }, trigger)
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, "Stored procedural memory.\n");
    });
    return 0;
  }
  if (command === "procedural-match") {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, matches: memory.matchProcedural(asString(options.context)) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${payload.matches.length} procedural matches found.
`);
    });
    return 0;
  }
  if (command === "shared-store") {
    await withMemory(options, async (memory) => {
      const ns = asNamespace(options.namespace);
      if (!ns.length) {
        emitError(runtime, jsonMode, "Missing required option: --namespace");
        return;
      }
      await memory.storeShared({
        namespace: ns,
        visibility: asString(options.visibility, "shared") === "private" ? "private" : "shared",
        content: asString(options.content),
        topics: asCsv(options.topics),
        metadata: parseMaybeJson(options.metadata)
      });
      if (jsonMode) emitJson(runtime, { ok: true, command, stored: true });
      else emitText(runtime, "Stored shared memory entry.\n");
    });
    return 0;
  }
  if (command === "namespace-query") {
    await withMemory(options, async (memory) => {
      const ns = asNamespace(options.namespace);
      if (!ns.length) {
        emitError(runtime, jsonMode, "Missing required option: --namespace");
        return;
      }
      const visibility = asString(options.visibility, "all");
      const payload = {
        ok: true,
        command,
        ...await memory.queryNamespace(
          ns,
          asString(options.query),
          { limit: Number(asString(options.limit, "8")) || 8 },
          {
            visibility: visibility === "shared" ? "shared" : visibility === "private" ? "private" : "all",
            includeDescendants: Boolean(options.descendants)
          }
        )
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "namespace-recent") {
    await withMemory(options, async (memory) => {
      const ns = asNamespace(options.namespace);
      if (!ns.length) {
        emitError(runtime, jsonMode, "Missing required option: --namespace");
        return;
      }
      const visibility = asString(options.visibility, "all");
      const payload = {
        ok: true,
        command,
        results: await memory.getRecentInNamespace(
          ns,
          Number(asString(options.limit, "10")) || 10,
          {
            visibility: visibility === "shared" ? "shared" : visibility === "private" ? "private" : "all",
            includeDescendants: Boolean(options.descendants)
          }
        )
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "recall-profiles") {
    const profiles = getSmartRecallProfiles();
    const requested = asString(options.profile).trim();
    const resolvedProfile = resolveSmartRecallProfile(requested);
    const payload = requested ? profiles.find((profile) => profile.profile === resolvedProfile) : { profiles };
    if (!payload) {
      emitError(runtime, jsonMode, `Unknown recall profile: ${requested}`);
      return 1;
    }
    if (jsonMode) {
      emitJson(runtime, { ok: true, command, ..."profile" in payload ? { profile: payload } : payload });
    } else if ("profile" in payload) {
      emitText(
        runtime,
        [
          `${payload.profile} (${payload.label})`,
          payload.overview,
          `recommended for: ${payload.recommendedFor.join("; ")}`,
          `defaults: ${JSON.stringify(payload.defaultOptions)}`,
          ""
        ].join("\n")
      );
    } else {
      emitText(
        runtime,
        `${payload.profiles.map((profile) => `${profile.profile} - ${profile.overview}`).join("\n")}
`
      );
    }
    return 0;
  }
  if (command === "smart-recall") {
    await withMemory(options, async (memory) => {
      const metadataFilters = parseMaybeJson(options.metadata);
      const smartRecallOptions = smartRecallOptionsSchema.parse({
        profile: resolveProfileOption(options.profile, "fast"),
        limit: Number(asString(options.limit, "8")) || 8,
        includeRecent: Boolean(options.recent),
        recentLimit: Number(asString(options["recent-limit"], "5")) || 5,
        includeProcedural: options.procedural === false ? false : true,
        proceduralLimit: Number(asString(options["procedural-limit"], "5")) || 5,
        hops: Number(asString(options.hops, "1")) === 2 ? 2 : 1,
        minNeighborScore: Number(asString(options["min-neighbor-score"], "0.2")) || 0.2,
        neighborLimit: Number(asString(options["neighbor-limit"], "25")) || 25,
        includeBaseResults: true,
        includePathDetails: false,
        topics: asCsv(options.topics).length ? asCsv(options.topics) : void 0,
        minAccessCount: options["min-access-count"] ? Number(asString(options["min-access-count"])) : void 0,
        metadata: metadataFilters && Object.keys(metadataFilters).length ? metadataFilters : void 0
      });
      const payload = {
        ok: true,
        command,
        ...await memory.smartRecall(asString(options.query), smartRecallOptions)
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "context-pack") {
    await withMemory(options, async (memory) => {
      const metadataFilters = parseMaybeJson(options.metadata);
      const contextPackOptions = contextPackOptionsSchema.parse({
        profile: resolveProfileOption(options.profile, "agent-safe"),
        limit: Number(asString(options.limit, "8")) || 8,
        maxChars: Number(asString(options["max-chars"], "6000")) || 6e3,
        includeDream: Boolean(options.dream),
        includeRecent: options.recent === false ? false : true,
        includeMetadata: Boolean(options["include-metadata"]),
        recentLimit: Number(asString(options["recent-limit"], "5")) || 5,
        includeProcedural: options.procedural === false ? false : true,
        proceduralLimit: Number(asString(options["procedural-limit"], "5")) || 5,
        hops: Number(asString(options.hops, "1")) === 2 ? 2 : 1,
        minNeighborScore: Number(asString(options["min-neighbor-score"], "0.2")) || 0.2,
        neighborLimit: Number(asString(options["neighbor-limit"], "25")) || 25,
        includeBaseResults: true,
        includePathDetails: false,
        topics: asCsv(options.topics).length ? asCsv(options.topics) : void 0,
        minAccessCount: options["min-access-count"] ? Number(asString(options["min-access-count"])) : void 0,
        metadata: metadataFilters && Object.keys(metadataFilters).length ? metadataFilters : void 0
      });
      const payload = {
        ok: true,
        command,
        ...await memory.contextPack(asString(options.query), contextPackOptions)
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${payload.content}
`);
    });
    return 0;
  }
  if (command === "dream") {
    await withMemory(options, async (memory) => {
      const metadataFilters = parseMaybeJson(options.metadata);
      const parsedLayers = asCsv(options.layers).filter(Boolean);
      const payload = {
        ok: true,
        command,
        ...await memory.dream({
          query: asString(options.query, "What long-memory patterns matter most right now?"),
          layers: parsedLayers.length ? parsedLayers : ["identity", "semantic", "procedural"],
          limit: Number(asString(options.limit, "12")) || 12,
          metadata: metadataFilters && Object.keys(metadataFilters).length ? metadataFilters : void 0,
          topicAllowlist: asCsv(options.topics).length ? asCsv(options.topics) : void 0
        })
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${payload.title}
${payload.content}
`);
    });
    return 0;
  }
  if (command === "snapshots") {
    await withMemory(options, async (memory) => {
      const action = asString(options.action, "list");
      if (action === "create") {
        const payload2 = { ok: true, command, action, snapshot: await memory.createSnapshot(asString(options.label, `snapshot-${Date.now()}`)) };
        if (jsonMode) emitJson(runtime, payload2);
        else emitText(runtime, `Created snapshot ${payload2.snapshot.id}.
`);
        return;
      }
      if (action === "restore") {
        const payload2 = { ok: true, command, action, restored: await memory.restoreSnapshot(asString(options["snapshot-id"])) };
        if (jsonMode) emitJson(runtime, payload2);
        else emitText(runtime, `Restored ${payload2.restored} entries from snapshot.
`);
        return;
      }
      if (action === "delete") {
        const payload2 = { ok: true, command, action, deleted: await memory.deleteSnapshot(asString(options["snapshot-id"])) };
        if (jsonMode) emitJson(runtime, payload2);
        else emitText(runtime, payload2.deleted ? "Deleted snapshot.\n" : "Snapshot not found.\n");
        return;
      }
      const payload = { ok: true, command, action: "list", snapshots: await memory.listSnapshots() };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, payload.snapshots.length ? `${payload.snapshots.map((snapshot) => `- ${snapshot.id} ${snapshot.label}`).join("\n")}
` : "No snapshots.\n");
    });
    return 0;
  }
  if (command === "consolidate") {
    await withMemory(options, async (memory) => {
      const payload = {
        ok: true,
        command,
        result: await memory.runConsolidation({
          summary: {
            enabled: Boolean(options.summaries)
          },
          proceduralPromotion: {
            enabled: Boolean(options.procedural)
          }
        })
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, "Consolidation run completed.\n");
    });
    return 0;
  }
  if (command === "smoke-check") {
    await withMemory(options, async (memory, context) => {
      const checks = await runSmokeChecks(memory, context.config);
      const payload = {
        ok: !hasFailingChecks(checks),
        command,
        checks
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatChecks(checks)}
`);
    });
    return 0;
  }
  if (command === "doctor") {
    await withMemory(options, async (memory, context) => {
      const payload = await runDoctor(memory, context, options);
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatChecks(payload.checks)}
`);
    });
    return 0;
  }
  if (command === "validate-config") {
    const configPath = asString(options.config);
    const payload = configPath ? { command, ...publicConfigValidation(await validateConfigFile(configPath)) } : {
      ok: false,
      command,
      configPath: null,
      checks: [{ name: "config-path", status: "fail", detail: "Pass --config <path>." }]
    };
    if (jsonMode) emitJson(runtime, payload);
    else emitText(runtime, `${formatChecks(payload.checks)}
`);
    return payload.ok ? 0 : 1;
  }
  emitText(runtime, helpText());
  return 1;
}
async function main() {
  try {
    process.exitCode = await runCli(process.argv);
  } catch (error) {
    const jsonMode = process.argv.includes("--json");
    const message = error instanceof Error ? error.message : String(error);
    if (jsonMode) {
      writeStderr({}, `${JSON.stringify({ ok: false, error: message })}
`);
    } else {
      writeStderr({}, `Error: ${message}
`);
    }
    process.exitCode = 1;
  }
}
void main();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runCli
});
