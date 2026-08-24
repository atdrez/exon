import { describe, it, expect } from 'vitest';
import { Lexer } from '../src/Lexer';
import { TokenType } from '../src/TokenType';

function lex(source: string): Lexer {
    return new Lexer(Buffer.from(source), 'test.exon');
}

function readAll(source: string): Array<{ type: TokenType; text: string }> {
    const lexer = lex(source);
    const tokens: Array<{ type: TokenType; text: string }> = [];
    while (lexer.isAvailable()) {
        const type = lexer.readToken();
        if (type === TokenType.None) break;
        tokens.push({ type, text: lexer.getTokenString() });
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

        it('reads a scoped package identifier with a leading plus as a single token', () => {
            const [t] = readAll('+google.apis');
            expect(t.type).toBe(TokenType.Identifier);
            expect(t.text).toBe('+google.apis');
        });

        it('does not accept a plus in the middle of an identifier', () => {
            const tokens = readAll('foo+bar');
            expect(tokens).toHaveLength(2);
            expect(tokens[0]).toMatchObject({ type: TokenType.Identifier, text: 'foo' });
            expect(tokens[1]).toMatchObject({ type: TokenType.Identifier, text: '+bar' });
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
            expect(t.type).toBe(TokenType.Integer);
            expect(t.text).toBe('42');
        });

        it('reads a float', () => {
            const [t] = readAll('3.14');
            expect(t.type).toBe(TokenType.Float);
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
            expect(lexer.getLineIndex()).toBe(1);
            lexer.readToken(); // b -- line 2
            expect(lexer.getLineIndex()).toBe(2);
            lexer.readToken(); // c -- line 3
            expect(lexer.getLineIndex()).toBe(3);
        });
    });

    describe('putTokenBack', () => {
        it('re-reads the same token after putTokenBack', () => {
            const lexer = lex('foo bar');
            lexer.readToken();
            const first = lexer.getTokenString();
            lexer.putTokenBack();
            lexer.readToken();
            expect(lexer.getTokenString()).toBe(first);
            lexer.readToken();
            expect(lexer.getTokenString()).toBe('bar');
        });

        it('is idempotent when called twice in a row', () => {
            const lexer = lex('foo bar');
            lexer.readToken();
            lexer.putTokenBack();
            lexer.putTokenBack();
            expect(lexer.readToken()).toBe(TokenType.Identifier);
            expect(lexer.getTokenString()).toBe('foo');
            lexer.readToken();
            expect(lexer.getTokenString()).toBe('bar');
        });

        it('replays the token type without re-scanning the buffer', () => {
            const lexer = lex('"hello" 42');
            expect(lexer.readToken()).toBe(TokenType.String);
            lexer.putTokenBack();
            expect(lexer.readToken()).toBe(TokenType.String);
            expect(lexer.getTokenString()).toBe('hello');
            expect(lexer.readToken()).toBe(TokenType.Integer);
            expect(lexer.getTokenNumber()).toBe(42);
        });

        // A re-scan would count the token's newlines a second time, so a token spanning
        // lines used to leave lineIndex too high for every error reported after it.
        it('keeps lineIndex correct after putting back a multiline token', () => {
            const lexer = lex('"""\na\nb\n""" tail');
            expect(lexer.readToken()).toBe(TokenType.MultilineString);
            const lineAfterRead = lexer.getLineIndex();
            lexer.putTokenBack();
            expect(lexer.readToken()).toBe(TokenType.MultilineString);
            expect(lexer.getLineIndex()).toBe(lineAfterRead);
            lexer.readToken();
            expect(lexer.getTokenString()).toBe('tail');
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
