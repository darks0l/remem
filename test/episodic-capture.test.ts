/**
 * ReMEM — Episodic Capture Pipeline Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EpisodicCapturePipeline, type CaptureEvent } from '../src/episodic-capture.js';

// Mock LayeredMemoryEntry
function makeMockEntry(content: string) {
  return {
    id: `test-${Math.random().toString(36).slice(2, 7)}`,
    content,
    topics: [] as string[],
    metadata: {},
    createdAt: Date.now(),
    accessedAt: Date.now(),
    accessCount: 0,
  };
}

describe('EpisodicCapturePipeline', () => {
  let mockRemem: any;
  let pipeline: EpisodicCapturePipeline;

  beforeEach(() => {
    mockRemem = {
      store: vi.fn((input) => makeMockEntry(input.content)),
    };
    // Use short interval so flush fires quickly during tests
    pipeline = new EpisodicCapturePipeline(mockRemem, {
      flushIntervalMs: 10,
      maxBatchSize: 10,
      dedupWindowMs: 500,
    });
    pipeline.start();
  });

  afterEach(() => {
    pipeline.stop();
    vi.clearAllMocks();
  });

  // ─── Importance Scoring ────────────────────────────────────────────────────

  describe('importance scoring', () => {
    it('should score decisions as high importance', async () => {
      pipeline.capture({ type: 'decision', content: 'We decided to build X' });
      await new Promise((r) => setTimeout(r, 30));
      expect(mockRemem.store).toHaveBeenCalledTimes(1);
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.metadata.importance).toBeGreaterThanOrEqual(0.85);
    });

    it('should score goal.achieved as highest importance', async () => {
      pipeline.capture({ type: 'goal.achieved', content: 'Shipped v1.0' });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.metadata.importance).toBeGreaterThanOrEqual(0.9);
    });

    it('should score agent.error with elevated importance', async () => {
      pipeline.capture({ type: 'agent.error', content: 'Pipeline failed: fetch error' });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.metadata.importance).toBeGreaterThanOrEqual(0.7);
    });

    it('should respect importance override', async () => {
      pipeline.capture({ type: 'agent.turn', content: 'Minor thing', importanceOverride: 0.95 });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.metadata.importance).toBe(0.95);
    });

    it('should lower score for low-importance keywords like ping/heartbeat', async () => {
      pipeline.capture({ type: 'agent.turn', content: 'heartbeat ping ACK' });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.metadata.importance).toBeLessThan(0.5);
    });

    it('should boost score for long content', async () => {
      const shortEvent: CaptureEvent = { type: 'learning', content: 'X is good' };
      const longEvent: CaptureEvent = {
        type: 'learning',
        content:
          'X is good and we should use it because it provides significant advantages over the alternatives especially when dealing with complex scenarios requiring careful consideration of multiple factors and tradeoffs',
      };

      pipeline.capture(shortEvent);
      pipeline.capture(longEvent);
      await new Promise((r) => setTimeout(r, 30));

      const [shortCall, longCall] = mockRemem.store.mock.calls;
      expect(longCall[0].metadata.importance).toBeGreaterThan(shortCall[0].metadata.importance);
    });

    it('should lower score for very short content', async () => {
      pipeline.capture({ type: 'agent.turn', content: 'ok' });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.metadata.importance).toBeLessThan(0.4);
    });
  });

  // ─── Topic Extraction ─────────────────────────────────────────────────────

  describe('topic extraction', () => {
    it('should extract topic prefix from event type', async () => {
      pipeline.capture({ type: 'user.message', content: 'Hello world' });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.topics).toContain('user');
    });

    it('should add topic for decision events', async () => {
      pipeline.capture({ type: 'decision', content: 'We decided to build X' });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.topics).toContain('decision');
    });

    it('should extract hashtags from content', async () => {
      pipeline.capture({
        type: 'learning',
        content: 'Remember to use #openai and #anthropic for LLM tasks',
      });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.topics).toContain('openai');
      expect(call.topics).toContain('anthropic');
    });

    it('should add error topic for agent.error', async () => {
      pipeline.capture({ type: 'agent.error', content: 'Something went wrong' });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.topics).toContain('error');
    });
  });

  // ─── Deduplication ───────────────────────────────────────────────────────

  describe('deduplication', () => {
    it('should suppress duplicate events within dedup window', async () => {
      const event: CaptureEvent = { type: 'agent.turn', content: 'Hello world' };
      pipeline.capture(event);
      pipeline.capture(event); // duplicate
      pipeline.capture(event); // duplicate
      await new Promise((r) => setTimeout(r, 30));
      // Only first one should be stored
      expect(mockRemem.store).toHaveBeenCalledTimes(1);
    });

    it('should not suppress events with different content', async () => {
      pipeline.capture({ type: 'agent.turn', content: 'Hello world' });
      pipeline.capture({ type: 'agent.turn', content: 'Goodbye world' });
      await new Promise((r) => setTimeout(r, 30));
      expect(mockRemem.store).toHaveBeenCalledTimes(2);
    });

    it('should not suppress events with different type', async () => {
      pipeline.capture({ type: 'agent.turn', content: 'Hello world' });
      pipeline.capture({ type: 'agent.response', content: 'Hello world' });
      await new Promise((r) => setTimeout(r, 30));
      expect(mockRemem.store).toHaveBeenCalledTimes(2);
    });

    it('should not dedup events with noDedup=true', async () => {
      const event: CaptureEvent = { type: 'decision', content: 'Important decision', noDedup: true };
      pipeline.capture(event);
      pipeline.capture(event);
      pipeline.capture(event);
      await new Promise((r) => setTimeout(r, 30));
      expect(mockRemem.store).toHaveBeenCalledTimes(3);
    });

    it('should allow dedup after window expires', async () => {
      // Use very short dedup window
      const shortPipeline = new EpisodicCapturePipeline(mockRemem, {
        flushIntervalMs: 10,
        maxBatchSize: 10,
        dedupWindowMs: 50,
      });
      shortPipeline.start();

      shortPipeline.capture({ type: 'agent.turn', content: 'Hello' });
      await new Promise((r) => setTimeout(r, 80)); // wait for dedup to expire
      shortPipeline.capture({ type: 'agent.turn', content: 'Hello' });
      await new Promise((r) => setTimeout(r, 30));

      expect(mockRemem.store).toHaveBeenCalledTimes(2);
      shortPipeline.stop();
    });
  });

  // ─── Batch Flushing ───────────────────────────────────────────────────────

  describe('batch flushing', () => {
    it('should flush on interval', async () => {
      pipeline.capture({ type: 'user.message', content: 'Test 1' });
      pipeline.capture({ type: 'user.message', content: 'Test 2' });
      // Not flushed yet
      expect(mockRemem.store).not.toHaveBeenCalled();
      // Wait for interval
      await new Promise((r) => setTimeout(r, 30));
      expect(mockRemem.store).toHaveBeenCalledTimes(2);
    });

    it('should force flush when maxBatchSize reached', () => {
      const smallPipeline = new EpisodicCapturePipeline(mockRemem, {
        maxBatchSize: 3,
        flushIntervalMs: 10000,
      });
      smallPipeline.start();

      smallPipeline.capture({ type: 'agent.turn', content: 'a' });
      expect(mockRemem.store).not.toHaveBeenCalled();
      smallPipeline.capture({ type: 'agent.turn', content: 'b' });
      expect(mockRemem.store).not.toHaveBeenCalled();
      smallPipeline.capture({ type: 'agent.turn', content: 'c' }); // triggers flush
      expect(mockRemem.store).toHaveBeenCalledTimes(3);

      smallPipeline.stop();
    });

    it('should flush remaining events on stop()', async () => {
      pipeline.capture({ type: 'user.message', content: 'Should be flushed on stop' });
      pipeline.capture({ type: 'user.message', content: 'Also this' });
      expect(mockRemem.store).not.toHaveBeenCalled();
      pipeline.stop();
      // stop() flushes immediately
      expect(mockRemem.store).toHaveBeenCalledTimes(2);
      // Restart for afterEach
      pipeline.start();
    });
  });

  // ─── Content Formatting ───────────────────────────────────────────────────

  describe('content formatting', () => {
    it('should include event type in formatted content', async () => {
      pipeline.capture({ type: 'decision', content: 'Build X' });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.content).toContain('[decision]');
      expect(call.content).toContain('Build X');
    });

    it('should include importance label in formatted content', async () => {
      pipeline.capture({ type: 'decision', content: 'Critical decision' });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      // decisions get high importance, should have red/yellow marker
      expect(call.content).toMatch(/[🟡🔴]/);
    });

    it('should pass through event metadata', async () => {
      pipeline.capture({
        type: 'user.message',
        content: 'Hello',
        metadata: { channel: 'discord', sender: 'Meta' },
      });
      await new Promise((r) => setTimeout(r, 30));
      const call = mockRemem.store.mock.calls[0][0];
      expect(call.metadata.channel).toBe('discord');
      expect(call.metadata.sender).toBe('Meta');
    });
  });

  // ─── Stats ───────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('should track event count and dropped count', async () => {
      pipeline.capture({ type: 'user.message', content: 'Hello' });
      pipeline.capture({ type: 'user.message', content: 'Hello' }); // deduped
      pipeline.capture({ type: 'user.message', content: 'World' });
      pipeline.capture({ type: 'user.message', content: 'World' }); // deduped
      pipeline.capture({ type: 'user.message', content: 'World' }); // deduped
      await new Promise((r) => setTimeout(r, 30));

      const stats = pipeline.getStats();
      expect(stats.eventCount).toBe(5);
      expect(stats.droppedCount).toBe(3);
    });
  });

  // ─── captureBatch ────────────────────────────────────────────────────────

  describe('captureBatch()', () => {
    it('should capture multiple events', async () => {
      pipeline.captureBatch([
        { type: 'user.message', content: 'Hello' },
        { type: 'decision', content: 'Decision 1' },
        { type: 'learning', content: 'Learned X' },
      ]);
      await new Promise((r) => setTimeout(r, 30));
      expect(mockRemem.store).toHaveBeenCalledTimes(3);
    });
  });
});
