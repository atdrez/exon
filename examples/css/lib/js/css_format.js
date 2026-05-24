module.exports.isDeferred = function() { return true; };

module.exports.resolve = function(obj, context) {
    if (obj.content === undefined)
        throw new Error("content property is invalid");

    let data = context.resolve(obj.content);

    let rules = [];
    collectRules(data, rules);

    return rules.join('\n');
};

function resolveValue(val) {
    if (val !== null && typeof val === 'object' && typeof val.toJSON === 'function')
        return val.toJSON();
    return val;
}

function collectRules(node, rules) {
    if (Array.isArray(node)) {
        node.forEach(function(item) { collectRules(item, rules); });
        return;
    }

    if (node !== null && typeof node === 'object') {
        if ('__content__' in node) {
            collectRules(node.__content__, rules);
            return;
        }

        let selector = node.selector;
        if (selector) {
            let props = Object.entries(node)
                .filter(function(entry) { return entry[0] !== 'selector'; })
                .map(function(entry) { return [entry[0], resolveValue(entry[1])]; })
                .filter(function(entry) {
                    let val = entry[1];
                    return val !== null && val !== '';
                })
                .map(function(entry) {
                    return '    ' + entry[0] + ': ' + entry[1] + ';';
                });

            if (props.length > 0)
                rules.push(selector + ' {\n' + props.join('\n') + '\n}');
        }
    }
}
