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

import {
  type IdentityPackage,
  type DuplicationConfig,
  type InfectionConfig,
  type DuplicateResult,
  type InfectionResult,
  type ConstitutionStatement,
  type LayeredMemoryEntry,
  identityPackageSchema,
} from './types.js';

// Re-export types for public API
export type { DuplicateResult, InfectionResult } from './types.js';
import { MemoryStore } from './store.js';
import { LayerManager } from './layers.js';
import type { IdentitySystem } from './identity.js';

// ─── Duplication (Export) ─────────────────────────────────────────────────

/**
 * Build an identity package from the local ReMEM instance.
 * This does NOT upload — it only builds the package.
 * Use `uploadPackage()` to send to the server.
 */
export async function buildIdentityPackage(params: {
  store: MemoryStore;
  layers?: LayerManager;
  identity?: IdentitySystem;
  soulText?: string;
  identityText?: string;
  config: DuplicationConfig;
}): Promise<IdentityPackage> {
  const { store, layers, identity, soulText, identityText, config } = params;

  // Gather constitution statements
  const statements: ConstitutionStatement[] = identity
    ? identity.constitution.getStatements()
    : [];

  // Gather memories from layers
  const memories: LayeredMemoryEntry[] = [];
  if (config.includeAllLayers && layers) {
    const allEntries = layers.getAllEntries();
    const layerFilter = config.layers;
    for (const entry of allEntries) {
      if (layerFilter && !layerFilter.includes(entry.layer)) continue;
      memories.push(entry as LayeredMemoryEntry);
    }
  } else if (!layers) {
    // Fall back to raw store query — get all entries
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
        layer: 'episodic',
        importance: 0.5,
      } as LayeredMemoryEntry);
    }
  }

  const pkg: IdentityPackage = {
    version: '1.0',
    agentId: config.agentId,
    userId: config.userId,
    exportedAt: Date.now(),
    constitution: {
      statements,
      version: '1.0',
      createdAt: statements[0]?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    },
    memories,
    soul: config.includeSoul && soulText
      ? { content: soulText, source: 'SOUL.md' }
      : undefined,
    identity: config.includeIdentity && identityText
      ? { content: identityText, source: 'IDENTITY.md' }
      : undefined,
    metadata: {
      exportedBy: 'ReMEM v0.3.3',
      layerCount: memories.length,
      statementCount: statements.length,
    },
  };

  return identityPackageSchema.parse(pkg);
}

/**
 * Upload an identity package to the DARKSOL server.
 */
export async function uploadPackage(
  pkg: IdentityPackage,
  config: DuplicationConfig
): Promise<{ uploadUrl: string; response: unknown }> {
  const response = await fetch(`${config.serverUrl}/api/identity/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(pkg),
  });

  if (!response.ok) {
    throw new Error(
      `Server rejected identity package: ${response.status} ${response.statusText}`
    );
  }

  const json = await response.json() as { uploadUrl: string; response?: unknown };
  return {
    uploadUrl: json.uploadUrl ?? `${config.serverUrl}/api/identity/${pkg.agentId ?? 'unknown'}`,
    response: json.response ?? json,
  };
}

/**
 * Full duplication: build + upload identity package to DARKSOL server.
 * Returns upload confirmation details.
 */
export async function duplicate(params: {
  store: MemoryStore;
  layers?: LayerManager;
  identity?: IdentitySystem;
  soulText?: string;
  identityText?: string;
  config: DuplicationConfig;
}): Promise<DuplicateResult> {
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
    serverUploadResponse: serverResult.response,
  };
}

// ─── Infection (Import) ───────────────────────────────────────────────────

/**
 * Download an identity package from the DARKSOL server.
 */
export async function downloadPackage(
  config: InfectionConfig
): Promise<IdentityPackage> {
  const url = `${config.serverUrl}/api/identity/${config.sourceAgentId ?? 'latest'}${
    config.version ? `?version=${config.version}` : ''
  }`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch identity package: ${response.status} ${response.statusText}`
    );
  }

  const json = await response.json() as IdentityPackage;
  return identityPackageSchema.parse(json);
}

/**
 * Apply an identity package to the local ReMEM instance.
 * This injects the constitution statements into the identity system,
 * and optionally stores memories in the appropriate layers.
 */
export async function infect(params: {
  store: MemoryStore;
  layers?: LayerManager;
  identity?: IdentitySystem;
  pkg: IdentityPackage;
  config: InfectionConfig;
}): Promise<InfectionResult> {
  const { store, layers, identity, pkg, config } = params;

  // Load constitution statements into identity system
  if (identity) {
    for (const statement of pkg.constitution.statements) {
      // Avoid duplicates by checking ID
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

  // Store memories from the package into the appropriate layers
  const memoriesLoaded: LayeredMemoryEntry[] = [];
  const layerFilter = config.layers;

  for (const entry of pkg.memories) {
    if (!layerFilter.includes(entry.layer as 'identity' | 'semantic' | 'procedural')) {
      continue;
    }
    // Store in the layer
    if (layers) {
      const stored = layers.store(
        {
          content: entry.content,
          topics: entry.topics,
          metadata: entry.metadata,
        },
        entry.layer
      );
      await store.persistLayerEntry(stored, {
        agentId: pkg.agentId,
        userId: pkg.userId,
      });
      memoriesLoaded.push(stored as LayeredMemoryEntry);
    } else {
      // No layers — store in base
      await store.store(
        {
          content: entry.content,
          topics: entry.topics,
          metadata: entry.metadata,
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
    liveConnection: true,
  };
}

/**
 * Pull + infect in one shot.
 * Downloads from server and applies the identity package locally.
 */
export async function infectFromServer(params: {
  store: MemoryStore;
  layers?: LayerManager;
  identity?: IdentitySystem;
  config: InfectionConfig;
}): Promise<InfectionResult> {
  const pkg = await downloadPackage(params.config);
  return infect({ ...params, pkg });
}
