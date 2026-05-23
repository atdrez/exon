import { describe, test, expect } from 'vitest'
import { compile } from './helpers'

describe('fn.plist.encode', () => {
    test('wraps output in plist header and footer', () => {
        const result = compile(`fn.plist.encode { { name: "Alice" } }`)
        expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
        expect(result).toContain('<plist version="1.0">')
        expect(result).toContain('</plist>')
    })

    test('encodes string values', () => {
        const result = compile(`fn.plist.encode { { name: "Alice" } }`)
        expect(result).toContain('<key>name</key>')
        expect(result).toContain('<string>Alice</string>')
    })

    test('encodes integer values', () => {
        const result = compile(`fn.plist.encode { { count: 42 } }`)
        expect(result).toContain('<integer>42</integer>')
    })

    test('encodes real values', () => {
        const result = compile(`fn.plist.encode { { ratio: 3.14 } }`)
        expect(result).toContain('<real>3.14</real>')
    })

    test('encodes boolean true', () => {
        const result = compile(`fn.plist.encode { { enabled: true } }`)
        expect(result).toContain('<true/>')
    })

    test('encodes boolean false', () => {
        const result = compile(`fn.plist.encode { { enabled: false } }`)
        expect(result).toContain('<false/>')
    })

    test('encodes arrays', () => {
        const result = compile(`fn.plist.encode { { tags: [ "a", "b" ] } }`)
        expect(result).toContain('<array>')
        expect(result).toContain('<string>a</string>')
        expect(result).toContain('<string>b</string>')
        expect(result).toContain('</array>')
    })

    test('encodes nested dicts', () => {
        const result = compile(`fn.plist.encode { { config: { debug: false } } }`)
        expect(result).toContain('<dict>')
        expect(result).toContain('<key>debug</key>')
        expect(result).toContain('<false/>')
    })

    test('escapes XML special characters in strings', () => {
        const result = compile(`fn.plist.encode { { note: "a&b<c>d" } }`)
        expect(result).toContain('a&amp;b&lt;c&gt;d')
    })

    test('throws when content is not an object', () => {
        expect(() => compile(`fn.plist.encode { "not-an-object" }`)).toThrow()
    })
})
