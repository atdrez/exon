module.exports.resolve = function(obj, context) {
    // get the array of body elements
    const elements = obj.__content__

    if (obj.separator !== undefined && (typeof obj.separator !== "string"))
        throw new Error("Invalid separator property");

    if (!Array.isArray(elements) || elements.length !== 1)
        throw new Error("Invalid parameter received");

    // accepts just a single parameter
    const targetObject = elements[0];

    if (targetObject === undefined)
        throw new Error("Invalid parameter received");

    const content = context.resolve(targetObject);

    // should receive a single array
    if (!Array.isArray(content))
        throw new Error("Invalid parameter: should receive a single array element");

    return content.join(obj.separator || " ");
};