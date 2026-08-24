import { describe, it, expect } from 'vitest';
import { compile } from './helpers';

describe('number literals in exon files', () => {
    it('parses a plain integer as a number', () => {
        const result = compile(`{ x: 42 }`);
        expect(result).toEqual({ x: 42 });
        expect(typeof result.x).toBe('number');
    });

    it('parses a float', () => {
        const result = compile(`{ x: 3.14 }`);
        expect(result).toEqual({ x: 3.14 });
    });

    it('parses a negative integer', () => {
        const result = compile(`{ x: -5 }`);
        expect(result).toEqual({ x: -5 });
    });

    it('parses a negative float', () => {
        const result = compile(`{ x: -3.14 }`);
        expect(result).toEqual({ x: -3.14 });
    });

    it('parses zero', () => {
        const result = compile(`{ x: 0 }`);
        expect(result).toEqual({ x: 0 });
    });

    it('parses a number with a trailing dot', () => {
        const result = compile(`{ x: 5. }`);
        expect(result).toEqual({ x: 5 });
    });

    it('parses a large integer that still fits exactly in a double', () => {
        // 15 digits: the widest value that stays below 2^53 at every
        // accumulation step, so it stays exact.
        const result = compile(`{ x: 999999999999999 }`);
        expect(result).toEqual({ x: 999999999999999 });
    });

    it('parses an integer beyond safe precision the same way Number() would', () => {
        const source = `{ x: 123456789012345678 }`;
        const result = compile(source);
        expect(result.x).toBe(Number('123456789012345678'));
    });

    it('parses numbers inside an array', () => {
        const result = compile(`{ list: [1, 2.5, -3] }`);
        expect(result).toEqual({ list: [1, 2.5, -3] });
    });

    it('parses numbers used as bare content items', () => {
        const result = compile(`{ 1 2 3 }`);
        expect(result.__content__).toEqual([1, 2, 3]);
    });
});
