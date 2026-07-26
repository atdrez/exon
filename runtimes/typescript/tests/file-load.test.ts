import { describe, it, expect } from 'vitest'
import { compile } from './helpers'

describe('fn.file.load: path resolution', () => {
    it('resolves a directly declared path relative to its own file', () => {
        const result = compile(`
            fn.file.load { path: "./data/meta.txt" }
        `, {
            'data/meta.txt': 'root-relative'
        })

        expect(result).toBe('root-relative')
    })

    it('resolves the path relative to the declaring file when inherited with no overrides', () => {
        const result = compile(`
            lib.reader { }
        `, {
            'lib/reader.exon': `fn.file.load { path: "./data/meta.txt" }`,
            'lib/data/meta.txt': 'lib-relative'
        })

        expect(result).toBe('lib-relative')
    })

    it('resolves the path relative to the base type file, not the instance file, even when the instance declares its own sibling fields', () => {
        const result = compile(`
            lib.reader {
                extra: { marker: "instance" }
            }
        `, {
            'data/meta.txt': 'wrong-instance-relative',
            'lib/reader.exon': `fn.file.load { path: "./data/meta.txt" }`,
            'lib/data/meta.txt': 'right-declaring-file-relative'
        })

        expect(result).toBe('right-declaring-file-relative')
    })

    it('resolves the path relative the previous folder', () => {
        const result = compile(`
            lib.reader {
                extra: { marker: "instance" }
            }
        `, {
            'data/meta.txt': 'right-declaring-file-relative',
            'lib/reader.exon': `fn.file.load { path: "../data/meta.txt" }`,
            'lib/data/meta.txt': 'wrong-instance-relative'
        })

        expect(result).toBe('right-declaring-file-relative')
    })

    it('reports a clear error when the file cannot be found relative to the declaring file', () => {
        expect(() => compile(`
            lib.reader { extra: { marker: "instance" } }
        `, {
            'data/meta.txt': 'wrong-instance-relative',
            'lib/reader.exon': `fn.file.load { path: "./data/meta.txt" }`
        })).toThrow(/unable to load/)
    })
})
