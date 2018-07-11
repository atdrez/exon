/*
 * Copyright (c) 2017 Adriano Tinoco d'Oliveira Rezende
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
 * KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as Path from "path";
import * as FileSystem from "fs";

import { Lexer } from "./Lexer"
import { Token } from "./Token";
import { TokenType } from "./TokenType";
import { ParserError } from "./ParserError";
import { ScriptManager } from "./ScriptManager";

export class Parser {
    private static extension = ".exon";

    private m_Paths: string[];
    private m_ScriptManager: ScriptManager;

    public constructor(manager: ScriptManager, paths: string[] = []) {
        this.m_Paths = paths;
        this.m_ScriptManager = manager;
    }

    public parse(fileName: string) : any {
        const absoluteFilePath = Path.resolve(fileName);

        const input = FileSystem.readFileSync(absoluteFilePath);
        const lexer = new Lexer(input, absoluteFilePath);

        return  this.parseObject(lexer, true);
    }

    private resolveFileName(objectName: string, dirName: string) : string {
        const basePath = objectName.split(".").join("/");
        const fileName = Path.join(dirName, basePath + Parser.extension);

        if (FileSystem.existsSync(fileName))
            return fileName;

        const relativePath = Path.relative(dirName, fileName);

        for (let path of this.m_Paths) {
            const resolvedPath = Path.join(path, relativePath);

            if (FileSystem.existsSync(resolvedPath))
                return resolvedPath;
        }

        throw new Error(`File does not exists: ${relativePath}`);
    }

    private findAndParseObject(objectName: string, dirName: string) : any {
        const fileName = this.resolveFileName(objectName, dirName);

        const input = FileSystem.readFileSync(fileName);
        const lexer = new Lexer(input, fileName);

        return this.parseObject(lexer, true);
    }

    private parseObject(lexer: Lexer, isRoot: boolean = false) : any {
        let token = lexer.readToken();

        if (token.tokenType !== TokenType.Identifier)
            throw new ParserError(`Invalid token found '${token.toString()}', expected <identifier>`,
                                  lexer);

        const objectName = token.toString();

        token = lexer.readToken();

        if (token.tokenType !== TokenType.LeftCurlyBracket)
            throw new ParserError(`Invalid token found ${token.toString()}, expected '{'`, lexer);

        const result = {};

        if (isRoot) {
            result['__name__'] = Path.basename(lexer.fileName, Parser.extension);
            result['__file__'] = lexer.fileName;
        }

        if (objectName !== 'Object') {
            if (objectName === '_') {
                result['__ref__'] = true;
            } else {
                if (this.m_ScriptManager.contains(objectName))
                    result['__native__'] = objectName;
                else
                    result['__base__'] = this.findAndParseObject(objectName, lexer.dirName);
            }
        }

        token = lexer.readToken();

        while (token.tokenType !== TokenType.RightCurlyBracket) {
            if (token.tokenType !== TokenType.Identifier)
                throw new ParserError(`Invalid token found '${token.toString()}', expected: <identifier> | }`, lexer);

            const parameterName = token.toString();

            token = lexer.readToken();

            if (token.tokenType !== TokenType.Colon)
                throw new ParserError(`Invalid token found '${token.toString()}', expected: ':'`,
                                      lexer);

            result[parameterName] = this.parseValue(lexer);

            token = lexer.readToken();

            if (token.tokenType === TokenType.Semicolon)
                token = lexer.readToken();
        }

        return result;
    }

    private static unescape(value: string) {
        return value.replace(/\\"/g, '"');
    }

    private parseValue(lexer: Lexer) : any {
        let token = lexer.readToken();

        switch (token.tokenType) {
        case TokenType.Minus: {
            token = lexer.readToken();

            if (token.tokenType !== TokenType.Number)
                throw new ParserError(`Invalid token found '${token.toString()}', expected a number`,  lexer);

            return -parseFloat(token.toString());
        }

        case TokenType.Number:
            return parseFloat(token.toString());

        case TokenType.String:
            return Parser.unescape(token.toString());

        case TokenType.True:
            return true;

        case TokenType.False:
            return false;

        case TokenType.Null:
            return null;

        case TokenType.LeftBracket:
            lexer.putTokenBack();
            return this.parseArray(lexer);

        case TokenType.Identifier:
            lexer.putTokenBack();
            return this.parseObject(lexer);

        default:
            throw new ParserError(`Invalid token found '${token.toString()}', expected: <number> | <null> | <string> | <array> | <object>`, lexer);
        }
    }

    private parseArray(lexer: Lexer): any {
        let token = lexer.readToken();

        if (token.tokenType !== TokenType.LeftBracket)
            throw new ParserError(`Invalid token found '${token.toString()}', expected: '['`,
                                  lexer);

        const result = new Array<any>();

        token = lexer.readToken();

        if (token.tokenType === TokenType.RightBracket)
            return result;

        lexer.putTokenBack();

        while (true) {
            const value = this.parseValue(lexer);

            result.push(value);

            token = lexer.readToken();

            // finish
            if (token.tokenType === TokenType.RightBracket)
                break;

            if (token.tokenType !== TokenType.Comma)
                throw new ParserError(`Invalid token found '${token.toString()}', expected: ','`,
                                      lexer);
        }

        return result;
    }
}
