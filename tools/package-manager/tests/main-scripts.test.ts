// SPDX-License-Identifier: MIT

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const { spawnSyncMock } = vi.hoisted(() => ({
    spawnSyncMock: vi.fn().mockReturnValue({ status: 0, error: undefined }),
}));

vi.mock('child_process', () => ({
    spawnSync: spawnSyncMock,
}));

import { runInstall } from '../src/main';

let tmpDirs: string[] = [];
let originalCwd: string;

beforeEach(() => {
    originalCwd = process.cwd();
    spawnSyncMock.mockClear();
    spawnSyncMock.mockReturnValue({ status: 0, error: undefined });
});

afterEach(() => {
    process.chdir(originalCwd);
    for (const dir of tmpDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs = [];
});

function mkTmpProject(config: Record<string, unknown>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exon-scripts-'));
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'exon-package.json'), JSON.stringify(config));
    return dir;
}

describe('install script hooks', () => {
    it('runs preinstall before installing dependencies and postinstall after', async () => {
        const dir = mkTmpProject({
            entry: 'main.exon',
            scripts: {
                preinstall: 'echo pre',
                postinstall: 'echo post',
            },
            nodeDependencies: { left: '1.0.0' },
        });

        process.chdir(dir);
        await runInstall([]);

        expect(spawnSyncMock).toHaveBeenCalledTimes(3);

        const commands = spawnSyncMock.mock.calls.map((call) => call[0] as string);
        expect(commands[0]).toBe('echo pre');
        expect(commands[1]).toContain('npm install');
        expect(commands[2]).toBe('echo post');
    });

    it('runs only preinstall when postinstall is not defined', async () => {
        const dir = mkTmpProject({
            entry: 'main.exon',
            scripts: { preinstall: 'echo only-pre' },
        });

        process.chdir(dir);
        await runInstall([]);

        expect(spawnSyncMock).toHaveBeenCalledTimes(1);
        expect(spawnSyncMock.mock.calls[0][0]).toBe('echo only-pre');
    });

    it('runs only postinstall when preinstall is not defined', async () => {
        const dir = mkTmpProject({
            entry: 'main.exon',
            scripts: { postinstall: 'echo only-post' },
        });

        process.chdir(dir);
        await runInstall([]);

        expect(spawnSyncMock).toHaveBeenCalledTimes(1);
        expect(spawnSyncMock.mock.calls[0][0]).toBe('echo only-post');
    });

    it('runs no scripts when none are declared', async () => {
        const dir = mkTmpProject({ entry: 'main.exon' });

        process.chdir(dir);
        await runInstall([]);

        expect(spawnSyncMock).not.toHaveBeenCalled();
    });
});
