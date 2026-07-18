'use strict';

const http = require('http');
const { URL } = require('url');

function sendJson(res, status, body) {
    const isObject = typeof body === 'object' && body !== null;

    if (!isObject) {
        res.writeHead(status);
        res.end(body);
    }
    else {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body, null, 4).replace(/\\\\/g, '\\'));
    }
}

module.exports.isDeferred = function() {
    return true;
}

module.exports.resolve = function(obj, context) {
    const port = typeof obj.port === 'number' ? obj.port : 8080;
    const content = obj.content;

    const server = http.createServer((req, res) => {
        if (req.method !== 'GET') {
            sendJson(res, 405, { error: 'method not allowed' });
            return;
        }

        const url = new URL(req.url || '/', 'http://localhost');
        const segments = url.pathname.split('/').filter(Boolean);
        const queryParams = {};
        url.searchParams.forEach((v, k) => { queryParams[k] = v; });

        try {
            const options = {
                args: queryParams,
                route: segments
            };
            sendJson(res, 200, context.resolve(content, {}, options));
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            sendJson(res, msg.startsWith('not found:') ? 404 : 500, { error: msg });
        }
    });

    server.listen(port, () => {
        process.stderr.write('Exon HTTP server listening on http://localhost:' + port + '\n');
    });

    return null;
}
