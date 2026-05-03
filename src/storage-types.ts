import type {
  LayeredMemoryEntry,
  MemoryEntry,
  MemoryEvent,
  MemoryLayer,
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
  init(): Promise<void>;
  store(input: StoreMemoryInput, opts?: StoreMemoryOptions): Promise<MemoryEntry>;
  get(id: string): Promise<MemoryEntry | null>;
  query(text: string, options?: QueryOptions): Promise<{ results: QueryResult[]; totalAvailable: number }>;
  getAllEntries(): Promise<QueryResult[]>;
  getRecent(n?: number): Promise<QueryResult[]>;
  getByTopic(topic: string, limit?: number): Promise<QueryResult[]>;
  forget(id: string): Promise<boolean>;
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
  semanticQuery(queryText: string, queryVector: number[] | null, opts?: QueryOptions): Promise<{ results: QueryResult[]; totalAvailable: number }>;
  getEventLog(limit?: number): MemoryEvent[];
  persist(): void;
  close(): void | Promise<void>;
}
