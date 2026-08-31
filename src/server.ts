import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpAdapter, type HttpAdapterConfig } from './http.js';
import type { ReMEM } from './index.js';
import type { ModelConfig, ReMEMConfig } from './types.js';

export interface ReMEMIdentityText {
  text: string;
  source: string;
}

export interface ReMEMHttpServerConfig {
  memory: ReMEMConfig;
  http?: Pick<HttpAdapterConfig, 'port' | 'host' | 'trustScopeHeaders' | 'authToken' | 'corsOrigin' | 'maxBodyBytes'>;
  enableLayers?: boolean;
  identity?: {
    autoInject?: boolean;
    evalModel?: ModelConfig;
    constitutionTexts?: ReMEMIdentityText[];
  };
  runtimeResolver?: HttpAdapterConfig['runtimeResolver'];
}

export interface ReMEMHttpServerHandle {
  adapter: HttpAdapter;
  memory: ReMEM;
  stop(): Promise<void>;
}

export async function readIdentityConstitutionFiles(files: string[]): Promise<ReMEMIdentityText[]> {
  const uniqueFiles = [...new Set(files.map((file) => file.trim()).filter(Boolean))];
  const texts = await Promise.all(
    uniqueFiles.map(async (file) => {
      const resolved = path.resolve(file);
      return {
        text: await fs.readFile(resolved, 'utf8'),
        source: path.basename(resolved),
      };
    }),
  );
  return texts;
}

export async function startReMEMHttpServer(config: ReMEMHttpServerConfig): Promise<ReMEMHttpServerHandle> {
  const { ReMEM } = await import('./index.js');
  const memory = new ReMEM(config.memory);
  await memory.init();

  if (config.enableLayers !== false) {
    await memory.enableLayers();
  }

  if (config.identity?.constitutionTexts?.length) {
    memory.enableIdentity({
      autoInject: config.identity.autoInject,
      evalModel: config.identity.evalModel,
      constitutionTexts: config.identity.constitutionTexts,
    });
  }

  const adapter = new HttpAdapter({
    port: config.http?.port,
    host: config.http?.host,
    trustScopeHeaders: config.http?.trustScopeHeaders,
    authToken: config.http?.authToken,
    corsOrigin: config.http?.corsOrigin,
    maxBodyBytes: config.http?.maxBodyBytes,
    runtimeResolver: config.runtimeResolver,
    store: memory.getStore(),
    model: memory.getModel(),
    memory,
  });

  try {
    await adapter.start();
  } catch (error) {
    memory.close();
    throw error;
  }

  return {
    adapter,
    memory,
    async stop() {
      await adapter.stop();
      memory.close();
    },
  };
}
