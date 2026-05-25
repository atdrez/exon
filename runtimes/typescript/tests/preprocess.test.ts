import { describe, test, expect } from 'vitest'
import { compile, withTempFile } from './helpers'

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

    test('ignores indented //#exon markers that are not at line start (js style)', () => {
        const result = compile(`
            fn.preprocess {
                content: """// Region syntax example (not a real region):
//     //#exon
//     /* exon code */
//     output
//     //#endexon
//#exon
/*
fn.string.join { "real" }
*/
old
//#endexon"""
            }
        `)
        expect(result).toContain('real')
        expect(result).not.toContain('old')
        expect(result).toContain('//     //#exon')
    })

    test('processes region with no prior output (js style)', () => {
        const result = compile(`
            fn.preprocess {
                content: """//#exon
/*
fn.string.join { "generated" }
*/
//#endexon"""
            }
        `)
        expect(result).toContain('generated')
    })

    test('stringifies numeric result (js style)', () => {
        const result = compile(`
            fn.preprocess {
                content: """//#exon
/*
fn.add { 10 32 }
*/
old
//#endexon"""
            }
        `)
        expect(result).toContain('42')
        expect(result).not.toContain('old')
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

    test('handles multiple regions independently (html style)', () => {
        const result = compile(`
            fn.preprocess {
                style: "html"
                content: """<!--#exon-->
<!--
fn.string.join { "alpha" }
-->
old1
<!--#endexon-->
middle
<!--#exon-->
<!--
fn.string.join { "beta" }
-->
old2
<!--#endexon-->"""
            }
        `)
        expect(result).toContain('alpha')
        expect(result).toContain('beta')
        expect(result).toContain('middle')
        expect(result).not.toContain('old1')
        expect(result).not.toContain('old2')
    })

    test('processes region with no prior output (html style)', () => {
        const result = compile(`
            fn.preprocess {
                style: "html"
                content: """<!--#exon-->
<!--
fn.string.join { "generated" }
-->
<!--#endexon-->"""
            }
        `)
        expect(result).toContain('generated')
    })

    test('result containing HTML tags is preserved verbatim (html style)', () => {
        const result = compile(`
            fn.preprocess {
                style: "html"
                content: """<!--#exon-->
<!--
fn.string.join { "<strong>" "text" "</strong>" }
-->
stale
<!--#endexon-->"""
            }
        `)
        expect(result).toContain('<strong>text</strong>')
        expect(result).not.toContain('stale')
    })

    // file: parameter
    test('reads content from file path (js style)', () => {
        const result = withTempFile('target.js',
            '//#exon\n/*\nfn.string.join { "from-file" }\n*/\nstale\n//#endexon\n',
            (p) => compile(`fn.preprocess { file: "${p}" }`)
        )
        expect(result).toContain('from-file')
        expect(result).not.toContain('stale')
    })

    // resultToString: object branch -> JSON
    test('serializes object result to JSON', () => {
        const result = compile(`
            fn.preprocess {
                content: """//#exon
/*
{ key: "hello" count: 2 }
*/
stale
//#endexon"""
            }
        `)
        expect(result).toContain('"key"')
        expect(result).toContain('"hello"')
        expect(result).not.toContain('stale')
    })

    // resultToString: fallback String(value) via boolean
    test('stringifies boolean result', () => {
        const result = compile(`
            fn.preprocess {
                content: """//#exon
/*
fn.eq { 1 1 }
*/
stale
//#endexon"""
            }
        `)
        expect(result).toContain('true')
        expect(result).not.toContain('stale')
    })

    // CRLF line endings
    test('handles CRLF line endings (js style)', () => {
        const crlf = '//#exon\r\n/*\r\nfn.string.join { "crlf-ok" }\r\n*/\r\nstale\r\n//#endexon\r\n'
        const result = withTempFile('target.js', crlf,
            (p) => compile(`fn.preprocess { file: "${p}" }`)
        )
        expect(result).toContain('crlf-ok')
        expect(result).not.toContain('stale')
    })

    // Indented HTML markers (index.html style)
    test('processes indented HTML markers (html style)', () => {
        const lines = [
            '        <!--#exon-->',
            '        <!--',
            'fn.string.join { "indented" }',
            '        -->',
            '        stale',
            '        <!--#endexon-->',
        ].join('\n')
        const result = withTempFile('page.html', lines,
            (p) => compile(`fn.preprocess { file: "${p}" style: "html" }`)
        )
        expect(result).toContain('indented')
        expect(result).not.toContain('stale')
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
