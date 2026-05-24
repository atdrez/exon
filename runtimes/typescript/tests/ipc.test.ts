import { describe, test, expect, vi } from 'vitest'
import { compile } from './helpers'
import { setMessage, getMessage } from '../src/ipc'

describe('IPC', () => {
    test('getMessage returns null before any message is set', () => {
        setMessage(null);
        expect(getMessage()).toBeNull();
    });

    test('fn.ipc.getmessage returns current string message', () => {
        setMessage('hello ipc');
        const result = compile('using fn.*\n{ msg: ipc.getmessage {} }');
        expect(result.msg).toBe('hello ipc');
    });

    test('fn.ipc.getmessage returns current number message', () => {
        setMessage(42);
        const result = compile('using fn.*\n{ val: ipc.getmessage {} }');
        expect(result.val).toBe(42);
    });

    test('fn.ipc.getmessage returns current object message', () => {
        setMessage({ x: 10, y: 20 });
        const result = compile('using fn.*\n{ data: ipc.getmessage {} }');
        expect(result.data).toEqual({ x: 10, y: 20 });
    });

    test('fn.ipc.getmessage returns null when no message set', () => {
        setMessage(null);
        const result = compile('using fn.*\n{ msg: ipc.getmessage {} }');
        expect(result.msg).toBeNull();
    });

    test('fn.ipc.sendmessage calls process.send with the given value', () => {
        setMessage(5);
        const mockSend = vi.fn();
        (process as any).send = mockSend;
        try {
            compile('using fn.*\n{ _: ipc.sendmessage { "sent-value" } }');
            expect(mockSend).toHaveBeenCalledWith('sent-value');
        } finally {
            (process as any).send = undefined;
        }
    });

    test('fn.ipc.sendmessage returns the sent value', () => {
        setMessage(null);
        const mockSend = vi.fn();
        (process as any).send = mockSend;
        try {
            const result = compile('using fn.*\n{ out: ipc.sendmessage { "my-result" } }');
            expect(result.out).toBe('my-result');
        } finally {
            (process as any).send = undefined;
        }
    });

    test('fn.ipc.sendmessage is a no-op when process.send is unavailable', () => {
        setMessage(null);
        const origSend = (process as any).send;
        (process as any).send = undefined;
        try {
            expect(() => {
                compile('using fn.*\n{ _: ipc.sendmessage { "test" } }');
            }).not.toThrow();
        } finally {
            (process as any).send = origSend;
        }
    });

    test('fn.ipc.sendmessage passes computed value to process.send', () => {
        setMessage(7);
        const mockSend = vi.fn();
        (process as any).send = mockSend;
        try {
            compile('using fn.*\n{ _: ipc.sendmessage { mul { ipc.getmessage {} ipc.getmessage {} } } }');
            expect(mockSend).toHaveBeenCalledWith(49);
        } finally {
            (process as any).send = undefined;
        }
    });
});
