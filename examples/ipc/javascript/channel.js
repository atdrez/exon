'use strict';

module.exports.isDeferred = function() { return true; }

module.exports.resolve = function(obj, context) {
    if (process.send) {
        process.send({ __ready__: true });
    }

    process.on('message', function(msg) {
        try {
            const result = context.resolve(obj.content, { message: msg });
            if (process.send) process.send(result);
        } catch (e) {
            if (process.send) {
                process.send({ __error__: e instanceof Error ? e.message : String(e) });
            }
        }
    });

    return null;
}
