#!/usr/bin/env node
import { ReMEM, ReMEMConfig } from './index.mjs';
import 'zod';
import 'pg';
import 'http';

declare function launchTerminalUi(memory: ReMEM, context: {
    storageLabel: string;
    dbLabel: string;
    scopeLabel: string;
    config: ReMEMConfig;
}): Promise<void>;

type CliRuntime = {
    writeStdout?: (chunk: string) => void;
    writeStderr?: (chunk: string) => void;
    launchUi?: typeof launchTerminalUi;
};
declare function runCli(argv?: string[], runtime?: CliRuntime): Promise<number>;

export { runCli };
