// SPDX-License-Identifier: MIT

import * as path from "path";
import { Base } from "../base";
import { Context } from "../../IScript";
import { Worker, MessageChannel, MessagePort, receiveMessageOnPort } from "worker_threads";

const WORKER_PATH = path.resolve(__dirname, 'fetch-worker.js');

let worker: Worker | null = null;

// Runs the request on a worker thread so it can be awaited there while this
// component's own resolve() stays synchronous.
function getWorker(): Worker {
    if (worker === null) {
        worker = new Worker(WORKER_PATH);
        worker.unref();
    }

    return worker;
}

export default class Component extends Base {
    constructor() { super("http.fetch"); }

    public resolve(obj: any, _context: Context) : any {
        if (typeof obj.url !== "string" || obj.url.length === 0) {
            throw new Error(`${this.name()}.url: invalid type (expected non-empty string)`);
        }

        const method = obj.method !== undefined ? obj.method : "GET";

        if (typeof method !== "string") {
            throw new Error(`${this.name()}.method: invalid type (expected string)`);
        }

        const headers = obj.headers !== undefined ? obj.headers : {};

        if (!(headers instanceof Object) || Array.isArray(headers)) {
            throw new Error(`${this.name()}.headers: invalid type (expected object)`);
        }

        if (obj.body !== undefined && obj.body !== null && typeof obj.body !== "string") {
            throw new Error(`${this.name()}.body: invalid type (expected string)`);
        }

        const request = {
            url: obj.url,
            method: method.toUpperCase(),
            headers,
            body: obj.body ?? null
        };

        const sync = new SharedArrayBuffer(4);
        const flag = new Int32Array(sync);
        const { port1, port2 }: { port1: MessagePort; port2: MessagePort } = new MessageChannel();

        try {
            getWorker().postMessage({ sync, port: port2, request }, [port2]);

            Atomics.wait(flag, 0, 0);

            const received = receiveMessageOnPort(port1);

            if (received === undefined) {
                throw new Error("worker closed without responding");
            }

            const { result, error } = received.message;

            if (error !== undefined) {
                throw new Error(error);
            }

            return result;
        } catch (error: any) {
            throw new Error(`${this.name()} request failed: ${error.message}`);
        } finally {
            port1.close();
        }
    }
}
