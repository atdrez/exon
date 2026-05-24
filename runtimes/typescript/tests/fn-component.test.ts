import { describe, it, expect } from 'vitest'
import { compile } from './helpers'

describe('fn.component', () => {
    it('registers and calls an inline component', () => {
        const result = compile(`
            using fn.*
            {
                fn.component {
                    id: "test.addten"
                    content: wrapper {
                        value: 0
                        content: add { @root.value 10 }
                    }
                }
                result: test.addten { value: 5 }
            }
        `)
        expect(result.result).toBe(15)
    })

    it('caller values override content defaults', () => {
        const result = compile(`
            using fn.*
            {
                fn.component {
                    id: "test.double"
                    content: wrapper {
                        value: 0
                        content: add { @root.value @root.value }
                    }
                }
                a: test.double { value: 3 }
                b: test.double { value: 7 }
            }
        `)
        expect(result.a).toBe(6)
        expect(result.b).toBe(14)
    })

    it('uses default value when caller does not override', () => {
        const result = compile(`
            using fn.*
            {
                fn.component {
                    id: "test.inc"
                    content: wrapper {
                        value: 100
                        content: add { @root.value 1 }
                    }
                }
                result: test.inc {}
            }
        `)
        expect(result.result).toBe(101)
    })

    it('resolves caller binding from calling scope', () => {
        const result = compile(`
            using fn.*
            {
                fn.component {
                    id: "test.triple"
                    content: wrapper {
                        value: 0
                        content: add { add { @root.value @root.value } @root.value }
                    }
                }
                input: 4
                output: test.triple { value: @root.input }
            }
        `)
        expect(result.output).toBe(12)
    })

    it('multiple components in same block', () => {
        const result = compile(`
            using fn.*
            {
                fn.component {
                    id: "test.add1"
                    content: wrapper {
                        value: 0
                        content: add { @root.value 1 }
                    }
                }
                fn.component {
                    id: "test.mul2"
                    content: wrapper {
                        value: 0
                        content: mul { @root.value 2 }
                    }
                }
                a: test.add1 { value: 10 }
                b: test.mul2 { value: 5 }
            }
        `)
        expect(result.a).toBe(11)
        expect(result.b).toBe(10)
    })
})
