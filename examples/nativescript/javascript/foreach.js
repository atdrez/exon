module.exports.isDeferred = function() { return true; };

module.exports.resolve = function(obj, context) {
    if (obj.data === undefined)
        throw new Error("foreach.data property is invalid");

    let data = context.resolve(obj.data);

    if (!Array.isArray(data))
        data = context.resolve(obj.data);

    if (!Array.isArray(data))
        throw new Error("foreach.data is not an array");

    if (obj.do === undefined)
        throw new Error("foreach.do property is invalid");

    const statement = obj.do;
    const includeNull = (obj.includeNull === true);
    const result = [];

    for (const rawItem of data) {
        const value = context.resolve(rawItem);
        const response = context.resolve(statement, { value });

        if (includeNull || (response !== null && response !== undefined))
            result.push(response);
    }

    return result;
};
