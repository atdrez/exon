/*
Exon preprocessor example.

Preprocessing regions let you embed exon logic directly in source files. When the
preprocessor runs, it evaluates the exon block and writes the output as live code,
leaving the original exon logic in the comment so it can be re-run later.

Region syntax:

    //#exon
    /*
        <exon expression that produces a code string>
    * /
    <previously generated output, or empty>
    //#endexon

The preprocessor replaces only the lines between the closing comment and //#endexon.
The exon block stays commented so you can rerun it with different inputs (e.g. ENV vars).

Two examples follow:
*/

//#exon
/*
fn.cond {

    fn.eq{fn.process.env{"ENV"} "production"}
"""
function say_hello() {
    return "Hello World from PROD"
}
"""

    fn.eq{fn.process.env{"ENV"} "development"}
"""
function say_hello() {
    return "Hello World from DEV"
}
"""

    // default say hello
"""
function say_hello() {
    return "Hello World"
}
"""
}
*/

function say_hello() {
    return "Hello World"
}
//#endexon

console.log(say_hello());

function add(a, b) {
    return a + b;
}

//#exon
/*
fn.if {
    condition:
        fn.eq{fn.process.env{"ENV"} "development"}
    then:
"""
const x = 10, y = 30;
console.log(`${x} + ${y} = ${add(x, y)}`);
"""
    // default to no code, or a comment
    else: fn.string.join {
        "// This is a reserved area that would print ("
        fn.add { 10 30 }
        ") in development mode"
    }
}
*/
// This is a reserved area that would print (40) in development mode
//#endexon