import type {
  LayeredMemoryEntry,
  LinkedMemoryQueryOptions,
  MemoryLink,
  MemoryLinkInput,
  MemoryEntry,
  MemoryEvent,
  MemoryLayer,
  MetadataFilter,
  QueryOptions,
  QueryResult,
  StoreMemoryInput,
} from './types.js';

export interface SnapshotMeta {
  id: string;
  label: string;
  createdAt: number;
  memoryCount: number;
  layerCounts: Record<MemoryLayer, number>;
  checksum: string | null;
  agentId: string | null;
  userId: string | null;
}

export interface SnapshotExport {
  id: string;
  label: string;
  createdAt: number;
  memoryCount: number;
  checksum: string;
  agentId: string | null;
  userId: string | null;
  snapshotData: unknown;
}

export interface StoreMemoryOptions {
  agentId?: string;
  userId?: string;
}

export interface MemoryStoreLike {
  matchMetadata?(entryMetadata: Record<string, unknown>, filters: Record<string, MetadataFilter>): boolean;
  init(): Promise<void>;
  store(input: StoreMemoryInput, opts?: StoreMemoryOptions): Promise<MemoryEntry>;
  get(id: string, opts?: StoreMemoryOptions): Promise<MemoryEntry | null>;
  query(text: string, options?: QueryOptions, opts?: StoreMemoryOptions): Promise<{ results: QueryResult[]; totalAvailable: number }>;
  getAllEntries(opts?: StoreMemoryOptions): Promise<QueryResult[]>;
  getRecent(n?: number, opts?: StoreMemoryOptions): Promise<QueryResult[]>;
  getByTopic(topic: string, limit?: number, opts?: StoreMemoryOptions): Promise<QueryResult[]>;
  forget(id: string, opts?: StoreMemoryOptions): Promise<boolean>;
  createLink(input: MemoryLinkInput, opts?: StoreMemoryOptions): Promise<MemoryLink>;
  getLinks(memoryId: string, options?: LinkedMemoryQueryOptions, opts?: StoreMemoryOptions): Promise<MemoryLink[]>;
  deleteLink(linkId: string): Promise<boolean>;
  getEntryById(id: string, opts?: StoreMemoryOptions): Promise<QueryResult | null>;
  persistLayerEntry(entry: LayeredMemoryEntry, opts?: StoreMemoryOptions): Promise<void>;
  loadAllLayerEntries(opts?: StoreMemoryOptions): Promise<LayeredMemoryEntry[]>;
  forgetLayerEntry(id: string): Promise<boolean>;
  createSnapshot(label: string, opts?: StoreMemoryOptions): Promise<SnapshotMeta>;
  restoreSnapshot(snapshotId: string, opts?: StoreMemoryOptions): Promise<number>;
  listSnapshots(opts?: StoreMemoryOptions): Promise<SnapshotMeta[]>;
  exportSnapshot(snapshotId: string): Promise<SnapshotExport>;
  importSnapshot(snapshot: SnapshotExport, opts?: { overwrite?: boolean }): Promise<SnapshotMeta>;
  deleteSnapshot(snapshotId: string): Promise<boolean>;
  storeEmbedding(memoryId: string, base64: string, dimension: number, model: string, type?: 'memory' | 'layered'): Promise<void>;
  getEmbedding(memoryId: string): Promise<{ base64: string; dimension: number } | null>;
  deleteEmbedding(memoryId: string): Promise<void>;
  semanticQuery(queryText: string, queryVector: number[] | null, opts?: QueryOptions, scope?: StoreMemoryOptions): Promise<{ results: QueryResult[]; totalAvailable: number }>;
  supportsNativeVectorSearch?(): boolean;
  getEventLog(limit?: number): MemoryEvent[];
  persist(): void;
  close(): void | Promise<void>;
}
