/**
 * ReMEM — Duplication & Infection Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReMEM } from '../src/index.js';
import type { IdentityPackage } from '../src/types.js';

describe('ReMEM — Identity Duplication', () => {
  let memory: ReMEM;

  beforeEach(async () => {
    memory = new ReMEM({
      storage: 'memory',
      dbPath: ':memory:',
    });
    await memory.init();
  });

  it('builds an identity package locally', async () => {
    await memory.store({ content: 'User prefers dark mode', topics: ['preferences'] });
    await memory.store({ content: 'The project deadline is Friday', topics: ['work'] });

    const pkg = await memory.buildIdentityPackageLocal({
      soulText: '# SOUL\nI am Darksol.',
      identityText: '# IDENTITY\nName: Darksol',
      includeSoul: true,
      includeIdentity: true,
      includeAllLayers: true,
    });

    expect(pkg.version).toBe('1.0');
    expect(pkg.soul?.content).toContain('Darksol');
    expect(pkg.identity?.content).toContain('Darksol');
    expect(pkg.memories.length).toBeGreaterThan(0);
    expect(pkg.exportedAt).toBeGreaterThan(0);
    expect(pkg.constitution.statements).toEqual([]);
  });

  it('buildIdentityPackageLocal without soul/identity', async () => {
    await memory.store({ content: 'Test memory', topics: ['test'] });

    const pkg = await memory.buildIdentityPackageLocal({
      includeSoul: false,
      includeIdentity: false,
    });

    expect(pkg.soul).toBeUndefined();
    expect(pkg.identity).toBeUndefined();
    expect(pkg.memories.length).toBe(1);
  });

  it('includes constitution statements when identity is enabled', async () => {
    memory.enableIdentity();
    memory.addIdentityStatement('Be direct and capable', 'values', 0.9);

    const pkg = await memory.buildIdentityPackageLocal({
      includeSoul: false,
      includeIdentity: false,
    });

    expect(pkg.constitution.statements.length).toBe(1);
    expect(pkg.constitution.statements[0].text).toBe('Be direct and capable');
    expect(pkg.constitution.statements[0].category).toBe('values');
  });

  it('duplicate() throws when server is unreachable', async () => {
    await memory.store({ content: 'Test memory', topics: ['test'] });

    // No server running at this address — should throw
    await expect(
      memory.duplicate({
        serverUrl: 'http://localhost:19999',
        apiKey: 'test-key',
      })
    ).rejects.toThrow();
  });

  it('infect() throws when server is unreachable', async () => {
    await expect(
      memory.infect({
        serverUrl: 'http://localhost:19999',
        apiKey: 'test-key',
      })
    ).rejects.toThrow();
  });

  it('fetchIdentityPackage() throws when server is unreachable', async () => {
    await expect(
      memory.fetchIdentityPackage({
        serverUrl: 'http://localhost:19999',
        apiKey: 'test-key',
      })
    ).rejects.toThrow();
  });

  it('package has correct schema', async () => {
    const pkg = await memory.buildIdentityPackageLocal({});

    // Should be serializable to JSON (no circular refs)
    expect(() => JSON.stringify(pkg)).not.toThrow();

    // Version should be set
    expect(pkg.version).toBeDefined();
    expect(typeof pkg.version).toBe('string');
  });

  it('layers filter works in buildIdentityPackageLocal', async () => {
    memory.enableLayers();
    await memory.storeInLayer(
      { content: 'Identity memory', topics: ['id'] },
      'identity'
    );
    await memory.storeInLayer(
      { content: 'Episodic memory', topics: ['ep'] },
      'episodic'
    );

    const pkgAll = await memory.buildIdentityPackageLocal({
      includeAllLayers: true,
    });
    expect(pkgAll.memories.length).toBe(2);

    const pkgIdOnly = await memory.buildIdentityPackageLocal({
      includeAllLayers: true,
      layers: ['identity'],
    });
    expect(pkgIdOnly.memories.length).toBe(1);
    expect(pkgIdOnly.memories[0].layer).toBe('identity');
  });

  it('close works after duplicate/infection operations', async () => {
    // Should not throw even if server is down
    try {
      await memory.duplicate({
        serverUrl: 'http://localhost:19999',
        apiKey: 'test-key',
      });
    } catch {
      // Expected — no server
    }
    memory.close();
  });
});
