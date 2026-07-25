// SPDX-License-Identifier: MIT

import { parentPort, MessagePort } from "worker_threads";

interface Request {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | null;
}

parentPort!.on("message", async ({ sync, port, request }: { sync: SharedArrayBuffer; port: MessagePort; request: Request }) => {
    const flag = new Int32Array(sync);

    try {
        const init: RequestInit = { method: request.method, headers: request.headers };

        if (request.body !== null) {
            init.body = request.body;
        }

        const response = await fetch(request.url, init);
        const bodyText = await response.text();
        const headers: Record<string, string> = {};

        response.headers.forEach((value, key) => {
            headers[key] = value;
        });

        port.postMessage({
            result: {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                redirected: response.redirected,
                type: response.type,
                headers,
                body: bodyText.length > 0 ? bodyText : null,
                bodyUsed: response.bodyUsed
            }
        });
    } catch (error: any) {
        port.postMessage({ error: error && error.message ? error.message : String(error) });
    } finally {
        port.close();
        Atomics.store(flag, 0, 1);
        Atomics.notify(flag, 0);
    }
});
