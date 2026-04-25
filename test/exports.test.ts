/**
 * ReMEM — package export smoke tests
 */

import { describe, expect, it } from 'vitest';
import {
  ReMEM,
  MemoryStore,
  ModelAbstraction,
  QueryEngine,
  MemoryREPL,
  HttpAdapter,
  MemoryConsolidator,
  EpisodicCapturePipeline,
  createVercelAIAdapter,
  createLangGraphStoreAdapter,
  createOpenClawAdapter,
} from '../src/index.js';

describe('package exports', () => {
  it('exports documented public APIs from the root entrypoint', () => {
    expect(ReMEM).toBeTypeOf('function');
    expect(MemoryStore).toBeTypeOf('function');
    expect(ModelAbstraction).toBeTypeOf('function');
    expect(QueryEngine).toBeTypeOf('function');
    expect(MemoryREPL).toBeTypeOf('function');
    expect(HttpAdapter).toBeTypeOf('function');
    expect(MemoryConsolidator).toBeTypeOf('function');
    expect(EpisodicCapturePipeline).toBeTypeOf('function');
    expect(createVercelAIAdapter).toBeTypeOf('function');
    expect(createLangGraphStoreAdapter).toBeTypeOf('function');
    expect(createOpenClawAdapter).toBeTypeOf('function');
  });
});
