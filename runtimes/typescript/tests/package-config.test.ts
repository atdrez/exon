// SPDX-License-Identifier: MIT

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { loadPackageConfig, DEFAULT_ENTRY_FILE } from '../src/PackageConfig';

let tmpDirs: string[] = [];

function writePackageJson(content: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exon-pkgcfg-'));
    tmpDirs.push(dir);
    const filePath = path.join(dir, 'exon-package.json');
    fs.writeFileSync(filePath, content);
    return filePath;
}

afterEach(() => {
    for (const dir of tmpDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs = [];
});

describe('loadPackageConfig', () => {
    it('parses name, version and metadata fields', () => {
        const filePath = writePackageJson(`{
            "name": "my-module",
            "version": "1.0.0",
            "description": "A description of the project",
            "license": "ISC",
            "author": "",
            "private": true
        }`);

        const config = loadPackageConfig(filePath);

        expect(config.name).toBe('my-module');
        expect(config.version).toBe('1.0.0');
        expect(config.description).toBe('A description of the project');
        expect(config.license).toBe('ISC');
        expect(config.author).toBe('');
        expect(config.private).toBe(true);
    });

    it('defaults entry to main.exon when missing', () => {
        const filePath = writePackageJson(`{ "name": "my-module" }`);
        expect(loadPackageConfig(filePath).entry).toBe(DEFAULT_ENTRY_FILE);
        expect(DEFAULT_ENTRY_FILE).toBe('main.exon');
    });

    it('reads an explicit entry field', () => {
        const filePath = writePackageJson(`{ "entry": "start.exon" }`);
        expect(loadPackageConfig(filePath).entry).toBe('start.exon');
    });

    it('parses scripts as a string map', () => {
        const filePath = writePackageJson(`{
            "scripts": {
                "dev": "exon -r main.exon devmode=1",
                "postinstall": "exon -r tools/process.exon"
            }
        }`);

        const config = loadPackageConfig(filePath);
        expect(config.scripts).toEqual({
            dev: 'exon -r main.exon devmode=1',
            postinstall: 'exon -r tools/process.exon',
        });
    });

    it('defaults scripts to an empty object when missing', () => {
        const filePath = writePackageJson(`{ "name": "my-module" }`);
        expect(loadPackageConfig(filePath).scripts).toEqual({});
    });

    it('parses dependencies with source and optional retarget', () => {
        const filePath = writePackageJson(`{
            "dependencies": {
                "ui": {
                    "source": "http://link.com/ui/v1.0"
                },
                "http": {
                    "retarget": "otherHttp",
                    "source": "http://link.com/http/v2.0"
                },
                "local": {
                    "source": "../../myfavoritepackage"
                }
            }
        }`);

        const config = loadPackageConfig(filePath);

        expect(config.dependencies.ui).toEqual({ source: 'http://link.com/ui/v1.0' });
        expect(config.dependencies.http).toEqual({ retarget: 'otherHttp', source: 'http://link.com/http/v2.0' });
        expect(config.dependencies.local).toEqual({ source: '../../myfavoritepackage' });
    });

    it('defaults dependencies to an empty object when missing', () => {
        const filePath = writePackageJson(`{ "name": "my-module" }`);
        expect(loadPackageConfig(filePath).dependencies).toEqual({});
    });

    it('throws when a dependency is missing "source"', () => {
        const filePath = writePackageJson(`{
            "dependencies": { "ui": { "retarget": "foo" } }
        }`);

        expect(() => loadPackageConfig(filePath)).toThrow(/source/);
    });

    it('throws when "scripts" is not an object', () => {
        const filePath = writePackageJson(`{ "scripts": "dev" }`);
        expect(() => loadPackageConfig(filePath)).toThrow(/scripts/);
    });

    it('throws when "dependencies" is not an object', () => {
        const filePath = writePackageJson(`{ "dependencies": "ui" }`);
        expect(() => loadPackageConfig(filePath)).toThrow(/dependencies/);
    });

    it('parses nodeDependencies as a string map', () => {
        const filePath = writePackageJson(`{
            "nodeDependencies": {
                "lodash": "^4.17.21",
                "tar": "^7.5.20"
            }
        }`);

        const config = loadPackageConfig(filePath);
        expect(config.nodeDependencies).toEqual({
            lodash: '^4.17.21',
            tar: '^7.5.20',
        });
    });

    it('defaults nodeDependencies to an empty object when missing', () => {
        const filePath = writePackageJson(`{ "name": "my-module" }`);
        expect(loadPackageConfig(filePath).nodeDependencies).toEqual({});
    });

    it('throws when "nodeDependencies" is not an object', () => {
        const filePath = writePackageJson(`{ "nodeDependencies": "lodash" }`);
        expect(() => loadPackageConfig(filePath)).toThrow(/nodeDependencies/);
    });

    it('throws when the file is not valid JSON', () => {
        const filePath = writePackageJson(`{ name: "my-module" }`);
        expect(() => loadPackageConfig(filePath)).toThrow(/failed to parse JSON/);
    });
});
