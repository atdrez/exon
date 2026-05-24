import { describe, it, expect } from 'vitest';
import { Lexer } from '../src/Lexer';
import { TokenType } from '../src/TokenType';
import { compileAt } from './helpers';

function readTokens(source: string) {
    const lexer = new Lexer(Buffer.from(source), 'test.exon');
    const tokens: Array<{ type: TokenType; text: string }> = [];
    while (lexer.available) {
        const t = lexer.readToken();
        if (t.tokenType === TokenType.None) break;
        tokens.push({ type: t.tokenType, text: t.toString() });
    }
    return tokens;
}

// ---------------------------------------------------------------------------
// Lexer: leading-dot identifiers
// ---------------------------------------------------------------------------

describe('lexer: leading-dot identifiers', () => {
    it('tokenizes ..foo as a single identifier', () => {
        const [t] = readTokens('..foo');
        expect(t.type).toBe(TokenType.Identifier);
        expect(t.text).toBe('..foo');
    });

    it('tokenizes ...foo as a single identifier', () => {
        const [t] = readTokens('...foo');
        expect(t.type).toBe(TokenType.Identifier);
        expect(t.text).toBe('...foo');
    });

    it('tokenizes ....foo as a single identifier', () => {
        const [t] = readTokens('....foo');
        expect(t.type).toBe(TokenType.Identifier);
        expect(t.text).toBe('....foo');
    });

    it('tokenizes ..dir.Sub as a single identifier', () => {
        const [t] = readTokens('..dir.Sub');
        expect(t.type).toBe(TokenType.Identifier);
        expect(t.text).toBe('..dir.Sub');
    });

    it('tokenizes ....ns.* as a single identifier', () => {
        const [t] = readTokens('....ns.*');
        expect(t.type).toBe(TokenType.Identifier);
        expect(t.text).toBe('....ns.*');
    });
});

// ---------------------------------------------------------------------------
// Parser: .. (one level up)
// ---------------------------------------------------------------------------

describe('.. (one level up)', () => {
    it('inherits from a file one level up', () => {
        const result = compileAt(
            'sub',
            `..Base { }`,
            { 'Base.exon': `{ color: "red" }` }
        );
        expect(result).toEqual({ color: 'red' });
    });

    it('overrides a property from the parent file', () => {
        const result = compileAt(
            'sub',
            `..Base { color: "blue" }`,
            { 'Base.exon': `{ color: "red" size: 10 }` }
        );
        expect(result).toEqual({ color: 'blue', size: 10 });
    });

    it('resolves a dotted name one level up', () => {
        const result = compileAt(
            'sub',
            `..dir.Widget { }`,
            { 'dir/Widget.exon': `{ w: 1 }` }
        );
        expect(result).toEqual({ w: 1 });
    });
});

// ---------------------------------------------------------------------------
// Parser: ... (two levels up)
// ---------------------------------------------------------------------------

describe('... (two levels up)', () => {
    it('inherits from a file two levels up', () => {
        const result = compileAt(
            'a/b',
            `...Root { }`,
            { 'Root.exon': `{ x: 99 }` }
        );
        expect(result).toEqual({ x: 99 });
    });

    it('overrides a property from two levels up', () => {
        const result = compileAt(
            'a/b',
            `...Root { x: 1 }`,
            { 'Root.exon': `{ x: 0 y: 2 }` }
        );
        expect(result).toEqual({ x: 1, y: 2 });
    });
});

// ---------------------------------------------------------------------------
// Parser: .... (three levels up)
// ---------------------------------------------------------------------------

describe('.... (three levels up)', () => {
    it('inherits from a file three levels up', () => {
        const result = compileAt(
            'a/b/c',
            `....Top { }`,
            { 'Top.exon': `{ deep: true }` }
        );
        expect(result).toEqual({ deep: true });
    });
});

// ---------------------------------------------------------------------------
// using alias with leading dots
// ---------------------------------------------------------------------------

describe('using alias with leading dots', () => {
    it('resolves a type via using alias', () => {
        const result = compileAt(
            'sub',
            `using ..Base\n{ b: Base { } }`,
            { 'Base.exon': `{ val: 7 }` }
        );
        expect(result).toEqual({ b: { val: 7 } });
    });

    it('resolves an alias two levels up', () => {
        const result = compileAt(
            'a/b',
            `using ...Config\n{ cfg: Config { } }`,
            { 'Config.exon': `{ debug: false }` }
        );
        expect(result).toEqual({ cfg: { debug: false } });
    });
});

// ---------------------------------------------------------------------------
// using wildcard with leading dots
// ---------------------------------------------------------------------------

describe('using wildcard with leading dots', () => {
    it('resolves a type via wildcard one level up', () => {
        const result = compileAt(
            'sub',
            `using ..types.*\n{ w: Widget { } }`,
            { 'types/Widget.exon': `{ kind: "widget" }` }
        );
        expect(result).toEqual({ w: { kind: 'widget' } });
    });

    it('resolves a type via wildcard three levels up', () => {
        const result = compileAt(
            'a/b/c',
            `using ....shared.*\n{ item: Thing { } }`,
            { 'shared/Thing.exon': `{ ok: true }` }
        );
        expect(result).toEqual({ item: { ok: true } });
    });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('errors', () => {
    it('throws when the referenced file does not exist', () => {
        expect(() =>
            compileAt('sub', `..Missing { }`)
        ).toThrow();
    });

    it('throws on a wildcard that matches nothing', () => {
        expect(() =>
            compileAt('sub', `using ..empty.*\n{ x: Ghost { } }`)
        ).toThrow();
    });
});
