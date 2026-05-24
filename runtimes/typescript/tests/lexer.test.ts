import { describe, it, expect } from 'vitest';
import { Lexer } from '../src/Lexer';
import { TokenType } from '../src/TokenType';

function lex(source: string): Lexer {
    return new Lexer(Buffer.from(source), 'test.exon');
}

function readAll(source: string): Array<{ type: TokenType; text: string }> {
    const lexer = lex(source);
    const tokens: Array<{ type: TokenType; text: string }> = [];
    while (lexer.available) {
        const t = lexer.readToken();
        if (t.tokenType === TokenType.None) break;
        tokens.push({ type: t.tokenType, text: t.toString() });
    }
    return tokens;
}

describe('Lexer', () => {
    describe('identifiers', () => {
        it('reads a simple identifier', () => {
            const [t] = readAll('hello');
            expect(t.type).toBe(TokenType.Identifier);
            expect(t.text).toBe('hello');
        });

        it('reads a dotted identifier as a single token', () => {
            const [t] = readAll('samples.movie.Movie');
            expect(t.type).toBe(TokenType.Identifier);
            expect(t.text).toBe('samples.movie.Movie');
        });

        it('reads identifier with underscores and digits', () => {
            const [t] = readAll('my_var2');
            expect(t.type).toBe(TokenType.Identifier);
            expect(t.text).toBe('my_var2');
        });

        it('reads a hyphenated identifier as a single token', () => {
            const [t] = readAll('name-and-surname');
            expect(t.type).toBe(TokenType.Identifier);
            expect(t.text).toBe('name-and-surname');
        });

        it('treats a standalone hyphen as Minus, not part of an identifier', () => {
            const tokens = readAll('a - b');
            expect(tokens).toHaveLength(3);
            expect(tokens[0]).toMatchObject({ type: TokenType.Identifier, text: 'a' });
            expect(tokens[1]).toMatchObject({ type: TokenType.Minus });
            expect(tokens[2]).toMatchObject({ type: TokenType.Identifier, text: 'b' });
        });
    });

    describe('keywords', () => {
        it('recognises true', () => {
            const [t] = readAll('true');
            expect(t.type).toBe(TokenType.True);
        });

        it('recognises false', () => {
            const [t] = readAll('false');
            expect(t.type).toBe(TokenType.False);
        });

        it('recognises null', () => {
            const [t] = readAll('null');
            expect(t.type).toBe(TokenType.Null);
        });

        it('does not confuse truely with true', () => {
            const [t] = readAll('truely');
            expect(t.type).toBe(TokenType.Identifier);
        });
    });

    describe('strings', () => {
        it('reads a quoted string without the quotes', () => {
            const [t] = readAll('"hello world"');
            expect(t.type).toBe(TokenType.String);
            expect(t.text).toBe('hello world');
        });

        it('reads an empty string', () => {
            const [t] = readAll('""');
            expect(t.type).toBe(TokenType.String);
            expect(t.text).toBe('');
        });
    });

    describe('numbers', () => {
        it('reads an integer', () => {
            const [t] = readAll('42');
            expect(t.type).toBe(TokenType.Number);
            expect(t.text).toBe('42');
        });

        it('reads a float', () => {
            const [t] = readAll('3.14');
            expect(t.type).toBe(TokenType.Number);
            expect(t.text).toBe('3.14');
        });
    });

    describe('punctuation', () => {
        it('reads all single-char tokens', () => {
            const tokens = readAll(': , ; [ ] { }');
            const types = tokens.map(t => t.type);
            expect(types).toEqual([
                TokenType.Colon,
                TokenType.Comma,
                TokenType.Semicolon,
                TokenType.LeftBracket,
                TokenType.RightBracket,
                TokenType.LeftCurlyBracket,
                TokenType.RightCurlyBracket,
            ]);
        });

        it('reads minus', () => {
            const [t] = readAll('-');
            expect(t.type).toBe(TokenType.Minus);
        });

        it('reads at sign', () => {
            const [t] = readAll('@');
            expect(t.type).toBe(TokenType.At);
        });
    });

    describe('comments', () => {
        it('skips a line comment', () => {
            const tokens = readAll('// this is a comment\nhello');
            expect(tokens).toHaveLength(1);
            expect(tokens[0].type).toBe(TokenType.Identifier);
            expect(tokens[0].text).toBe('hello');
        });

        it('skips an inline comment after a token', () => {
            const tokens = readAll('foo // comment\nbar');
            expect(tokens).toHaveLength(2);
            expect(tokens[0].text).toBe('foo');
            expect(tokens[1].text).toBe('bar');
        });
    });

    describe('whitespace', () => {
        it('skips spaces, tabs, and newlines', () => {
            const tokens = readAll('  \t\nfoo\t\n  bar');
            expect(tokens).toHaveLength(2);
        });

        it('tracks line numbers across newlines', () => {
            const lexer = lex('a\nb\nc');
            lexer.readToken(); // a -- line 1
            expect(lexer.lineIndex).toBe(1);
            lexer.readToken(); // b -- line 2
            expect(lexer.lineIndex).toBe(2);
            lexer.readToken(); // c -- line 3
            expect(lexer.lineIndex).toBe(3);
        });
    });

    describe('putTokenBack', () => {
        it('re-reads the same token after putTokenBack', () => {
            const lexer = lex('foo bar');
            const first = lexer.readToken();
            lexer.putTokenBack();
            const again = lexer.readToken();
            expect(again.toString()).toBe(first.toString());
            const second = lexer.readToken();
            expect(second.toString()).toBe('bar');
        });
    });

    describe('errors', () => {
        it('throws on an invalid character', () => {
            expect(() => readAll('!')).toThrow();
        });

        it('throws on unterminated string', () => {
            expect(() => readAll('"no closing quote')).toThrow();
        });

        it('throws on string with line break', () => {
            expect(() => readAll('"line\nbreak"')).toThrow();
        });
    });
});
