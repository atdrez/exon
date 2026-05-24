module.exports.resolve = function(obj, context) {
    const content = obj.__content__

    if (content === undefined || content.length === 0)
        return process.argv; // return argv array

    const index = content[0]

    // if an index is given, return the argv at index
    if (typeof index === "number")
        return process.argv[index];

    throw new Error("Invalid index value");
};