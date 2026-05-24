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

    // Default style is "js"
    test('replaces region content with evaluation result (default js style)', () => {
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

    test('preserves content outside regions (js style)', () => {
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

    test('handles multiple regions independently (js style)', () => {
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

    // Explicit style: "html"
    test('replaces region content with evaluation result (html style)', () => {
        const result = compile(`
            fn.preprocess {
                style: "html"
                content: """<!--#exon-->
<!--
fn.string.join { "hello" " " "world" }
-->
old content
<!--#endexon-->"""
            }
        `)
        expect(result).toContain('<!--#exon-->')
        expect(result).toContain('<!--')
        expect(result).toContain('string.join')
        expect(result).toContain('-->')
        expect(result).toContain('<!--#endexon-->')
        expect(result).toContain('hello world')
        expect(result).not.toContain('old content')
    })

    test('preserves content outside regions (html style)', () => {
        const result = compile(`
            fn.preprocess {
                style: "html"
                content: """before
<!--#exon-->
<!--
fn.string.join { "generated" }
-->
old
<!--#endexon-->
after"""
            }
        `)
        expect(result).toContain('before')
        expect(result).toContain('after')
        expect(result).toContain('generated')
        expect(result).not.toContain('old')
    })

    // Custom pattern object
    test('accepts custom pattern object', () => {
        const result = compile(`
            fn.preprocess {
                content: """## BEGIN
[[ fn.string.join { "custom" } ]]
old
## END"""
                pattern: {
                    start: "## BEGIN"
                    end: "## END"
                    regionStart: "[["
                    regionEnd: "]]"
                }
            }
        `)
        expect(result).toContain('custom')
        expect(result).not.toContain('old')
    })

    // Error cases
    test('throws when style and pattern are both set', () => {
        expect(() => compile(`
            fn.preprocess {
                content: "x"
                style: "js"
                pattern: {
                    start: "A"
                    end: "B"
                    regionStart: "C"
                    regionEnd: "D"
                }
            }
        `)).toThrow()
    })

    test('throws when pattern is missing required fields', () => {
        expect(() => compile(`
            fn.preprocess {
                content: "x"
                pattern: { start: "A" }
            }
        `)).toThrow()
    })

    test('throws on unknown style', () => {
        expect(() => compile(`
            fn.preprocess {
                content: "x"
                style: "xml"
            }
        `)).toThrow()
    })

    test('errors on missing content parameter', () => {
        expect(() => compile(`fn.preprocess { }`)).toThrow()
    })
})
