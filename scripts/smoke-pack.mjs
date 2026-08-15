import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'remem-pack-'));

function runNpm(args, options = {}) {
  if (process.env.npm_execpath) {
    return execFileSync(process.execPath, [process.env.npm_execpath, ...args], options);
  }
  return execFileSync('npm', args, options);
}

try {
  const packJson = runNpm(['pack', '--json'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const [{ filename }] = JSON.parse(packJson);
  const tarballPath = path.join(rootDir, filename);
  const installSpec = pathToFileURL(tarballPath).href;

  runNpm(['init', '-y'], {
    cwd: tempDir,
    stdio: 'ignore',
  });
  runNpm(['install', installSpec], {
    cwd: tempDir,
    stdio: 'ignore',
  });

  const smokeCode = `
    import assert from 'node:assert/strict';
    import { ReMEM, createCodebaseMemoryAdapter } from '@darksol/remem';

    assert.equal(typeof ReMEM, 'function');
    assert.equal(typeof createCodebaseMemoryAdapter, 'function');

    const memory = new ReMEM({ storage: 'memory' });
    await memory.init();
    await memory.store({
      content: 'Meta prefers short direct release notes.',
      topics: ['preferences', 'release']
    });

    const query = await memory.query('How should release notes feel?');
    assert.equal(query.results.length >= 1, true);

    const adapter = createCodebaseMemoryAdapter(memory);
    await adapter.ingestGraph({
      source: 'codebase-memory-mcp',
      project: 'remem',
      nodes: [
        { id: 'fn:ProcessOrder', label: 'Function', name: 'ProcessOrder', path: 'src/orders.ts' },
        { id: 'route:POST /orders', label: 'Route', name: 'POST /orders', path: 'src/routes.ts' }
      ],
      edges: [
        { from: 'route:POST /orders', to: 'fn:ProcessOrder', type: 'HTTP_CALLS' }
      ]
    });

    const overview = await adapter.overview({
      project: 'remem',
      nodeLabels: ['Function'],
      owners: ['src'],
      limit: 5
    });
    assert.equal(overview.nodes, 1);
    assert.equal(overview.labels.Function, 1);
  `;

  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', smokeCode], {
    cwd: tempDir,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });

  const tarballs = fs.readdirSync(rootDir).filter((entry) => /^darksol-remem-.*\.tgz$/.test(entry));
  for (const tarball of tarballs) {
    fs.rmSync(path.join(rootDir, tarball), { force: true });
  }
}
