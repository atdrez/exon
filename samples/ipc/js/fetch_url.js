const { execFileSync } = require("child_process");

module.exports.resolve = function(obj, _context) {
    if (typeof obj.url !== "string")
        throw new Error("invalid url");

    return execFileSync("curl", ["-s", obj.url]).toString();
};
