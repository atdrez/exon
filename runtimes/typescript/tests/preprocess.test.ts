import { describe, test, expect } from 'vitest'
import { compile } from './helpers'

describe('fn.preprocess', () => {
    test('returns content unchanged when no regions present', () => {
        const result = compile(`
            fn.preprocess {
                content: "no regions here"
            }
        `)
        expect(result).toBe('no regions here')
    })

    test('replaces non-commented part with evaluation result', () => {
        const result = compile(`
            fn.preprocess {
                content: """//#exon
/*
fn.string.join { "hello" " " "world" }
*/
old content
//#endexon"""
            }
        `)
        expect(result).toContain('//#exon')
        expect(result).toContain('/*')
        expect(result).toContain('string.join')
        expect(result).toContain('*/')
        expect(result).toContain('//#endexon')
        expect(result).toContain('hello world')
        expect(result).not.toContain('old content')
    })

    test('preserves content outside regions', () => {
        const result = compile(`
            fn.preprocess {
                content: """before
//#exon
/*
fn.string.join { "generated" }
*/
old
//#endexon
after"""
            }
        `)
        expect(result).toContain('before')
        expect(result).toContain('after')
        expect(result).toContain('generated')
        expect(result).not.toContain('old')
    })

    test('handles multiple regions independently', () => {
        const result = compile(`
            fn.preprocess {
                content: """//#exon
/*
fn.string.join { "first" }
*/
old1
//#endexon
middle
//#exon
/*
fn.string.join { "second" }
*/
old2
//#endexon"""
            }
        `)
        expect(result).toContain('first')
        expect(result).toContain('second')
        expect(result).toContain('middle')
        expect(result).not.toContain('old1')
        expect(result).not.toContain('old2')
    })

    test('errors on missing content parameter', () => {
        expect(() => compile(`fn.preprocess { }`)).toThrow()
    })
})
