module.exports.resolve = function(obj, context) {
    if (typeof obj.value !== "number")
        throw new Error ("invalid value received: " + obj.value)

    function fib(n) {
        return n <= 1 ? n : fib(n-1) + fib(n-2);
    }

    return fib(obj.value);
};