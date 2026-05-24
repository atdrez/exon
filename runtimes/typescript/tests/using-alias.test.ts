// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest'
import { compile } from './helpers'

describe('using ... as alias', () => {
    it('resolves a script via explicit alias', () => {
        const result = compile(`
            using fn.add as plus
            {
                out: plus { 3 7 }
            }
        `)
        expect(result.out).toBe(10)
    })

    it('resolves a dotted script name via explicit alias', () => {
        const result = compile(`
            using fn.json.encode as jsonencoder
            {
                out: jsonencoder { { name: "exon" } }
            }
        `)
        expect(JSON.parse(result.out)).toEqual({ name: "exon" })
    })

    it('resolves clash between two using directives with same last segment', () => {
        const result = compile(`
            using fn.json.encode as jsonencoder
            using fn.xml.encode as xmlencoder
            {
                j: jsonencoder { { v: 1 } }
            }
        `)
        expect(JSON.parse(result.j)).toEqual({ v: 1 })
    })

    it('multiple aliases coexist', () => {
        const result = compile(`
            using fn.add as plus
            using fn.mul as times
            {
                out: plus { times { 2 3 } 4 }
            }
        `)
        expect(result.out).toBe(10)
    })

    it('wildcard using still works alongside aliased using', () => {
        const result = compile(`
            using fn.json.encode as jsonencoder
            using fn.*
            {
                out: jsonencoder { { a: add { 1 2 } } }
            }
        `)
        expect(JSON.parse(result.out)).toEqual({ a: 3 })
    })

    it('last-segment alias resolves bare name to full namespace', () => {
        const result = compile(`
            using fn.json.encode
            {
                out: encode { { n: 1 } }
            }
        `)
        expect(JSON.parse(result.out)).toEqual({ n: 1 })
    })

    it('aliased wildcard resolves prefix.name to namespace prefix', () => {
        const result = compile(`
            using fn.json.* as myjson
            {
                out: myjson.encode { { n: 1 } }
            }
        `)
        expect(JSON.parse(result.out)).toEqual({ n: 1 })
    })

    it('aliased namespace resolves prefix.name to namespace', () => {
        const result = compile(`
            using fn.json as myjson
            {
                out: myjson.encode { { n: 1 } }
            }
        `)
        expect(JSON.parse(result.out)).toEqual({ n: 1 })
    })

    it('throws on missing alias identifier after as', () => {
        expect(() => compile(`
            using fn.json.encode as
            { out: jsonencoder {} }
        `)).toThrow()
    })

    it('throws when * is used alone', () => {
        expect(() => compile(`
            using *
            { out: encode {} }
        `)).toThrow()
    })

    it('throws when * appears as first segment', () => {
        expect(() => compile(`
            using *.*
            { out: encode {} }
        `)).toThrow()
    })

    it('throws when * appears in a middle segment', () => {
        expect(() => compile(`
            using fn.*.encode
            { out: encode {} }
        `)).toThrow()
    })

    it('throws when alias is *', () => {
        expect(() => compile(`
            using fn.add as *
            { out: add { 1 2 } }
        `)).toThrow()
    })
})
