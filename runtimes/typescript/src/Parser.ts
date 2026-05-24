// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";

import { Lexer } from "./Lexer"
import { TokenType } from "./TokenType";
import { ParserError } from "./ParserError";
import { IScriptRepository } from "./IScriptRepository";

export class Parser {
    static #extension = ".exon";
    static #defaultObjectName = "Object"

    #paths: string[];
    #scriptManager: IScriptRepository;
    #parsingFiles: Set<string> = new Set();

    public constructor(manager: IScriptRepository, paths: string[] = []) {
        this.#paths = paths;
        this.#scriptManager = manager;
    }

    public parse(fileName: string) : any {
        const absoluteFilePath = Path.resolve(fileName);
        this.#parsingFiles.clear();
        this.#parsingFiles.add(absoluteFilePath);
        const input = FileSystem.readFileSync(absoluteFilePath);
        return this.parseFromBuffer(input, absoluteFilePath);
    }

    public parseFromBuffer(buffer: Buffer, fileName: string) : any {
        const lexer = new Lexer(buffer, fileName);

        const usingNamespaces = this.extractUsingDirectives(lexer);

        const result = this.parseObject(lexer, usingNamespaces, true);

        const extra = lexer.readToken();
        if (extra.tokenType !== TokenType.None)
            throw new ParserError(`Unexpected token found after root object declaration`, lexer);

        return result;
    }

    private resolveFileName(objectName: string, dirName: string) : string {
        let resolvedDir = dirName;
        let name = objectName;

        if (name.startsWith('..')) {
            let dotCount = 0;
            while (dotCount < name.length && name[dotCount] === '.')
                dotCount++;
            const levelsUp = dotCount - 1;
            for (let i = 0; i < levelsUp; i++) {
                resolvedDir = Path.dirname(resolvedDir);
            }
            name = name.slice(dotCount);
        }

        const basePath = name.split(".").join("/");
        const fileName = Path.join(resolvedDir, basePath + Parser.#extension);

        if (FileSystem.existsSync(fileName))
            return fileName;

        if (objectName.startsWith('..'))
            throw new Error(`File does not exists: ${fileName}`);

        const relativePath = Path.relative(dirName, fileName);

        for (const path of this.#paths) {
            const resolvedPath = Path.join(path, relativePath);

            if (FileSystem.existsSync(resolvedPath))
                return resolvedPath;
        }

        throw new Error(`File does not exists: ${relativePath}`);
    }

    private findAndParseObject(objectName: string, dirName: string) : any {
        const fileName = this.resolveFileName(objectName, dirName);

        if (this.#parsingFiles.has(fileName)) {
            const cycle = [...this.#parsingFiles, fileName].join(' -> ');
            throw new Error(`Circular import detected: ${cycle}`);
        }

        this.#parsingFiles.add(fileName);
        try {
            const input = FileSystem.readFileSync(fileName);
            const lexer = new Lexer(input, fileName);

            const usingNamespaces = this.extractUsingDirectives(lexer);

            return this.parseObject(lexer, usingNamespaces, true);
        } finally {
            this.#parsingFiles.delete(fileName);
        }
    }

    private extractUsingDirectives(lexer: Lexer): string[] {
        const namespaces: string[] = [];

        while (true) {
            const token = lexer.readToken();

            if (token.tokenType !== TokenType.Identifier || token.toString() !== 'using') {
                lexer.putTokenBack();
                return namespaces;
            }

            const nameToken = lexer.readToken();

            if (nameToken.tokenType !== TokenType.Identifier)
                throw new ParserError(`Expected namespace after 'using'`, lexer);

            namespaces.push(nameToken.toString());
        }
    }

    private resolveUsingName(objectName: string, usingNamespaces: readonly string[], dirName: string): string {
        for (const ns of usingNamespaces) {
            if (ns.endsWith('.*')) {
                const prefix = ns.slice(0, -2);
                const fullName = prefix + '.' + objectName;

                if (this.#scriptManager.contains(fullName))
                    return fullName;

                try {
                    this.resolveFileName(fullName, dirName);
                    return fullName;
                } catch {
                    // not found via this namespace, try next
                }
            } else {
                const parts = ns.split('.');
                const alias = parts[parts.length - 1];

                if (alias === objectName)
                    return ns;
            }
        }

        return objectName;
    }

    private parseObject(lexer: Lexer, usingNamespaces: string[], isRoot: boolean = false) : any {
        const token = lexer.readToken();

        if (token.tokenType === TokenType.LeftCurlyBracket) {
            lexer.putTokenBack();
            return this.parseObjectBody(Parser.#defaultObjectName, lexer, usingNamespaces, isRoot);
        }

        if (token.tokenType !== TokenType.Identifier)
            throw new ParserError(`Invalid token found '${token.toString()}', expected <identifier>`,
                                  lexer);

        return this.parseObjectBody(token.toString(), lexer, usingNamespaces, isRoot);
    }

    private parseObjectBody(objectName: string, lexer: Lexer, usingNamespaces: string[], isRoot: boolean = false) : any {
        let token = lexer.readToken();

        let objectId: string | null = null;

        if (token.tokenType === TokenType.At) {
            const idToken = lexer.readToken();

            if (idToken.tokenType !== TokenType.Identifier)
                throw new ParserError(`Invalid token found '${idToken.toString()}', expected identifier after '@'`, lexer);

            objectId = idToken.toString();

            if (objectId === 'root')
                throw new ParserError(`'root' is a reserved binding id`, lexer);

            token = lexer.readToken();
        }

        if (token.tokenType !== TokenType.LeftCurlyBracket)
            throw new ParserError(`Invalid token found ${token.toString()}, expected '{'`, lexer);

        const result: Record<string, any> = {};
        result['__line__'] = lexer.lineIndex;
        result['__file__'] = lexer.fileName;

        if (isRoot) {
            result['__name__'] = Path.basename(lexer.fileName, Parser.#extension);
        }

        if (objectId !== null) {
            result['__id__'] = objectId;
            result['__idFile__'] = lexer.fileName;
        }

        if (objectName !== Parser.#defaultObjectName) {
            if (objectName === '*') {
                result['__ref__'] = true;
            } else {
                if (this.#scriptManager.contains(objectName)) {
                    result['__native__'] = objectName;
                } else {
                    const resolvedName = this.resolveUsingName(objectName, usingNamespaces, lexer.dirName);
                    if (this.#scriptManager.contains(resolvedName))
                        result['__native__'] = resolvedName;
                    else
                        result['__base__'] = this.findAndParseObject(resolvedName, lexer.dirName);
                }
            }
        }

        const content: any[] = [];
        let componentDefCount = 0;
        token = lexer.readToken();

        while (token.tokenType !== TokenType.RightCurlyBracket) {
            if (token.tokenType !== TokenType.Identifier) {
                // bare value (string, number, bool, null, array, @ref) -> implicit content
                lexer.putTokenBack();
                content.push(this.parseValue(lexer, usingNamespaces));
                token = lexer.readToken();
                if (token.tokenType === TokenType.Semicolon)
                    token = lexer.readToken();
                continue;
            }

            const parameterName = token.toString();
            const nextToken = lexer.readToken();

            if (nextToken.tokenType === TokenType.Colon) {
                // regular key: value field
                result[parameterName] = this.parseValue(lexer, usingNamespaces);
            } else {
                // inline object as implicit content item (e.g. h1 { ... })
                lexer.putTokenBack();
                const item = this.parseObjectBody(parameterName, lexer, usingNamespaces);
                const itemScript = this.#scriptManager.find(item['__native__']);
                if (itemScript?.isComponent?.()) {
                    // store component-def objects at their source position so the
                    // resolver runs them before subsequent items that use the new script
                    result[`__componentDef_${componentDefCount++}__`] = item;
                } else {
                    content.push(item);
                }
            }

            token = lexer.readToken();

            if (token.tokenType === TokenType.Semicolon)
                token = lexer.readToken();
        }

        if (content.length > 0) {
            result['__content__'] = content;
        }

        const nativeName = result['__native__'];
        if (typeof nativeName === 'string') {
            this.#scriptManager.find(nativeName)?.onComponentParsed?.(
                result, lexer.dirName, (s) => this.#scriptManager.register(s)
            );
        }

        return result;
    }

    private parseValue(lexer: Lexer, usingNamespaces: string[]) : any {
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
        case TokenType.MultilineString:
            return token.toString();

        case TokenType.True:
            return true;

        case TokenType.False:
            return false;

        case TokenType.Null:
            return null;

        case TokenType.LeftBracket:
            lexer.putTokenBack();
            return this.parseArray(lexer, usingNamespaces);

        case TokenType.LeftCurlyBracket:
            lexer.putTokenBack();
            return this.parseObjectBody(Parser.#defaultObjectName, lexer, usingNamespaces);

        case TokenType.Identifier:
            lexer.putTokenBack();
            return this.parseObject(lexer, usingNamespaces);

        case TokenType.At: {
            const refToken = lexer.readToken();

            if (refToken.tokenType !== TokenType.Identifier)
                throw new ParserError(`Invalid token found '${refToken.toString()}', expected identifier after '@'`, lexer);

            return { __bind__: refToken.toString(), __bindFile__: lexer.fileName };
        }

        default:
            throw new ParserError(`Invalid token found '${token.toString()}', expected: <number> | <null> | <string> | <array> | <object>`, lexer);
        }
    }

    private parseArray(lexer: Lexer, usingNamespaces: string[]): any {
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
            const value = this.parseValue(lexer, usingNamespaces);

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
