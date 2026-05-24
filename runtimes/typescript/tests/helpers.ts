import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path'
import { describe, test, expect } from 'vitest'
import { Parser } from '../src/Parser'
import { Resolver } from '../src/Resolver'
import { RuntimeOptions } from '../src/RuntimeOptions'
import { ScriptRepository } from '../src/ScriptRepository'
import * as Native from '../src/fn'

const samplesDir = path.resolve(__dirname, '..', '..', '..', 'examples')

function makeManager() {
    const manager = new ScriptRepository()
    for (const Ctor of Native.components()) {
        manager.register(new Ctor())
    }
    return manager
}

export type ExtraFiles = Record<string, string>;

export function parseAndResolve(filePath: string, searchPaths: string[] = [samplesDir], argv: string[] = []): any {
    const manager = makeManager()
    const parser = new Parser(manager, searchPaths)
    const ast = parser.parse(filePath)
    const options = new RuntimeOptions({ run: false, test: false }, argv)
    const resolver = new Resolver(manager, options)
    return resolver.resolve(ast)
}

export function compile(source: string, extraFiles?: ExtraFiles): any {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exon-test-'));
    try {
        const mainFile = path.join(dir, 'Main.exon');
        fs.writeFileSync(mainFile, source);

        if (extraFiles) {
            for (const [name, content] of Object.entries(extraFiles)) {
                const filePath = path.join(dir, name);
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, content);
            }
        }

        return parseAndResolve(mainFile);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

export function compileWithArgv(source: string, argv: string[]): any {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exon-test-'));
    try {
        const mainFile = path.join(dir, 'Main.exon');
        fs.writeFileSync(mainFile, source);
        return parseAndResolve(mainFile, [samplesDir], argv);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

// Like compile(), but places Main.exon inside <tmp>/<subdir>/ so that
// relative-parent imports (..Foo, ...Foo, etc.) can be tested.
// Extra files are written relative to <tmp> (the "project root").
export function compileAt(subdir: string, source: string, extraFiles?: ExtraFiles): any {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exon-test-'));
    try {
        const mainDir = path.join(dir, subdir);
        fs.mkdirSync(mainDir, { recursive: true });
        const mainFile = path.join(mainDir, 'Main.exon');
        fs.writeFileSync(mainFile, source);

        if (extraFiles) {
            for (const [name, content] of Object.entries(extraFiles)) {
                const filePath = path.join(dir, name);
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, content);
            }
        }

        return parseAndResolve(mainFile, []);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

export type TestCase = { name: string; ok: boolean }

export function runExonTests(filePath: string, searchPaths: string[] = [samplesDir]): TestCase[] {
    const lines: string[] = []
    const origLog = console.log
    console.log = (...args: any[]) => lines.push(args.join(''))
    try {
        const manager = makeManager()
        const parser = new Parser(manager, searchPaths)
        const ast = parser.parse(filePath)
        const options = new RuntimeOptions({ run: false, test: true })
        const resolver = new Resolver(manager, options)
        resolver.resolve(ast)
    } finally {
        console.log = origLog
    }
    return lines
        .filter(l => /\[(OK|FAIL)\]/.test(l))
        .map(l => {
            const m = l.match(/\[(OK|FAIL)\]\s*(.+)/)
            return {
                name: m ? m[2].trim() : l.trim(),
                ok: l.includes('[OK]'),
            }
        })
}

export function exonFile(...segments: string[]): string {
    return path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', ...segments)
}

export function describeExonFile(fileName: string): void {
    const baseName = fileName.replace(/\.exon$/, '')
    let cases: TestCase[] = []
    let loadErr: Error | null = null

    try {
        cases = runExonTests(exonFile(fileName))
    } catch (e) {
        loadErr = e instanceof Error ? e : new Error(String(e))
    }

    describe(`tests/fixtures/${baseName}`, () => {
        if (loadErr) {
            test(`load ${fileName}`, () => { throw loadErr })
        } else {
            for (const { name, ok } of cases) {
                test(name, () => expect(ok, name).toBe(true))
            }
        }
    })
}