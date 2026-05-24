// SPDX-License-Identifier: MIT

export enum TokenType {
    None = 0,
    Identifier = 1,
    String = 2,
    MultilineString = 7,
    Number = 3,
    True = 4,
    False = 5,
    Null = 6,

    Colon = 10,
    Comma = 11,
    Semicolon = 12,
    LeftBracket = 13,
    RightBracket = 14,
    LeftCurlyBracket = 15,
    RightCurlyBracket = 16,
    Minus = 17,
    At = 18,
}
