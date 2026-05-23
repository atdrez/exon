module.exports.resolve = function(obj, context) {
    function inner(index) {
        const content = obj.__content__

        if (content.length !== 1 || typeof content[0] !== "string")
            throw new Error("Should receive a string argument");

        const lines = content[0].split("\n").map(l => l.trim());
        return lines.join("\n");
    }

    return inner(obj.index);
};