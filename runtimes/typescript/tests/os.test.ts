// SPDX-License-Identifier: MIT

import * as os from 'os';
import { describe, it, expect } from 'vitest';
import { compile } from './helpers';

describe('fn.os.*', () => {
    it('fn.os.platform returns the current platform string', () => {
        expect(compile(`{ value: fn.os.platform {} }`)).toEqual({ value: os.platform() });
    });

    it('fn.os.arch returns the current arch string', () => {
        expect(compile(`{ value: fn.os.arch {} }`)).toEqual({ value: os.arch() });
    });

    it('fn.os.type returns the current OS type string', () => {
        expect(compile(`{ value: fn.os.type {} }`)).toEqual({ value: os.type() });
    });

    it('fn.os.release returns the current OS release string', () => {
        expect(compile(`{ value: fn.os.release {} }`)).toEqual({ value: os.release() });
    });
});
