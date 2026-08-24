// SPDX-License-Identifier: MIT

import * as Path from "path";
import * as FileSystem from "fs";

import { Lexer } from "./Lexer"
import { TokenType } from "./TokenType";
import { ParserError } from "./ParserError";
import { IScriptRepository } from "./IScriptRepository";
import { PathResolver } from "./PathResolver";

type UsingEntry = { namespace: string; alias: string; isWildcard: boolean };

export class Parser {
    private static _extension = ".exon";
    private static _defaultObjectName = "Object"

    private _paths: string[];
    private _scriptManager: IScriptRepository;
    private _parsingFiles: Set<string> = new Set();
    private _parseCache: Map<string, any> = new Map();
    private _existsCache: Map<string, boolean> = new Map();
    private _resolvedFileCache: Map<string, string | null> = new Map();

    public constructor(manager: IScriptRepository, paths: string[] = []) {
        this._paths = paths;
        this._scriptManager = manager;
    }

    public parse(fileName: string) : any {
        const absoluteFilePath = Path.resolve(fileName);
        this._parsingFiles.clear();
        this._parsingFiles.add(absoluteFilePath);
        const input = FileSystem.readFileSync(absoluteFilePath);
        return this.parseFromBuffer(input, absoluteFilePath);
    }

    public parseFromBuffer(buffer: Buffer, fileName: string) : any {
        const lexer = new Lexer(buffer, fileName);

        const usingNamespaces = this.extractUsingDirectives(lexer);

        const result = this.parseObject(lexer, usingNamespaces, true);

        const extraTokenType = lexer.readToken();
        if (extraTokenType !== TokenType.None)
            throw new ParserError(`Unexpected token found after root object declaration`, lexer);

        return result;
    }

    private fileExists(filePath: string): boolean {
        let result = this._existsCache.get(filePath);
        if (result === undefined) {
            result = FileSystem.existsSync(filePath);
            this._existsCache.set(filePath, result);
        }
        return result;
    }

    private findFileName(objectName: string, dirName: string) : string | null {
        const cacheKey = objectName + '\0' + dirName;
        const cached = this._resolvedFileCache.get(cacheKey);

        if (cached !== undefined)
            return cached;

        const result = this.searchFileName(objectName, dirName);
        this._resolvedFileCache.set(cacheKey, result);
        return result;
    }

    private searchFileName(objectName: string, dirName: string) : string | null {
        const fileName = PathResolver.resolveDottedPath(objectName, dirName);

        if (objectName.startsWith('.'))
            return this.fileExists(fileName) ? fileName : null;

        const relativePath = Path.relative(dirName, fileName);

        for (const path of this._paths) {
            const resolvedPath = Path.join(path, relativePath);

            if (this.fileExists(resolvedPath))
                return resolvedPath;
        }

        return this.fileExists(fileName) ? fileName : null;
    }

    private resolveFileName(objectName: string, dirName: string) : string {
        const fileName = this.findFileName(objectName, dirName);

        if (fileName !== null)
            return fileName;

        const missingPath = PathResolver.resolveDottedPath(objectName, dirName);

        if (objectName.startsWith('.'))
            throw new Error(`File does not exists: ${missingPath}`);

        throw new Error(`File does not exists: ${Path.relative(dirName, missingPath)}`);
    }

    private findAndParseObject(objectName: string, dirName: string) : any {
        const fileName = this.resolveFileName(objectName, dirName);

        const cached = this._parseCache.get(fileName);
        if (cached !== undefined) {
            return cached;
        }

        if (this._parsingFiles.has(fileName)) {
            const cycle = [...this._parsingFiles, fileName].join(' -> ');
            throw new Error(`Circular import detected: ${cycle}`);
        }

        this._parsingFiles.add(fileName);
        try {
            const input = FileSystem.readFileSync(fileName);
            const lexer = new Lexer(input, fileName);

            const usingNamespaces = this.extractUsingDirectives(lexer);

            const result = this.parseObject(lexer, usingNamespaces, true, objectName);
            this._parseCache.set(fileName, result);
            return result;
        } finally {
            this._parsingFiles.delete(fileName);
        }
    }

    private extractUsingDirectives(lexer: Lexer): UsingEntry[] {
        const entries: UsingEntry[] = [];

        while (true) {
            const tokenType = lexer.readToken();

            if (tokenType !== TokenType.Using) {
                lexer.putTokenBack();
                return entries;
            }

            const nameTokenType = lexer.readToken();

            if (nameTokenType !== TokenType.Identifier)
                throw new ParserError(`Expected namespace after 'using'`, lexer);

            const namespace = lexer.getTokenString();
            const parts = namespace.split('.');
            const starIndex = parts.indexOf('*');

            if (starIndex !== -1 && starIndex < parts.length - 1)
                throw new ParserError(`'*' can only appear as the last segment of a namespace`, lexer);

            if (parts.length === 1 && parts[0] === '*')
                throw new ParserError(`'*' alone is not a valid namespace`, lexer);

            const isWildcard = parts[parts.length - 1] === '*';
            const asTokenType = lexer.readToken();

            if (asTokenType === TokenType.As) {
                const aliasTokenType = lexer.readToken();

                if (aliasTokenType !== TokenType.Identifier)
                    throw new ParserError(`Expected alias identifier after 'as'`, lexer);

                const alias = lexer.getTokenString();

                if (alias === '*')
                    throw new ParserError(`'*' is not a valid alias`, lexer);

                entries.push({ namespace, alias, isWildcard });
            } else {
                lexer.putTokenBack();
                const lastName = parts[parts.length - 1];
                entries.push({ namespace, alias: lastName, isWildcard });
            }
        }
    }

    private resolveUsingName(objectName: string, usingNamespaces: readonly UsingEntry[], dirName: string): string {
        for (const entry of usingNamespaces) {
            if (!entry.isWildcard) {
                if (entry.alias === objectName) {
                    // using fn.json.encode -> encode -> fn.json.encode
                    return entry.namespace;
                }

                if (objectName.startsWith(entry.alias + '.')) {
                    // using fn.json as myjson -> myjson.encode -> fn.json.encode
                    return entry.namespace + '.' + objectName.slice(entry.alias.length + 1);
                }

                continue;
            }

            const prefix = entry.namespace.slice(0, -2);
            let fullName : string | undefined = undefined;

            if (entry.alias === '*') {
                // using fn.* -> try fn.<objectName>
                fullName = prefix + '.' + objectName;
            } else if (objectName.startsWith(entry.alias + '.')) {
                // using fn.json.* as myjson -> myjson.encode -> fn.json.encode
                const suffix = objectName.slice(entry.alias.length + 1);
                fullName = prefix + '.' + suffix;
            }

            if (fullName !== undefined) {
                if (this._scriptManager.contains(fullName))
                    return fullName;

                // probing each candidate namespace in turn, so a miss is expected control
                // flow here and must not pay for building and throwing an Error
                if (this.findFileName(fullName, dirName) !== null)
                    return fullName;
            }
        }

        return objectName;
    }

    private parseObject(lexer: Lexer, usingNamespaces: UsingEntry[], isRoot: boolean = false, defaultId?: string) : any {
        const tokenType = lexer.readToken();

        if (tokenType === TokenType.LeftCurlyBracket) {
            lexer.putTokenBack();
            return this.parseObjectBody(Parser._defaultObjectName, lexer, usingNamespaces, isRoot, defaultId);
        }

        if (tokenType !== TokenType.Identifier)
            throw new ParserError(`Invalid token found '${lexer.getTokenString()}', expected <identifier>`,
                                  lexer);

        return this.parseObjectBody(lexer.getTokenString(), lexer, usingNamespaces, isRoot, defaultId);
    }

    private parseObjectBody(objectName: string, lexer: Lexer, usingNamespaces: UsingEntry[], isRoot: boolean = false, defaultId?: string) : any {
        let tokenType = lexer.readToken();

        let objectId: string | null = null;

        if (tokenType === TokenType.At) {
            const idTokenType = lexer.readToken();

            if (idTokenType !== TokenType.Identifier)
                throw new ParserError(`Invalid token found '${lexer.getTokenString()}', expected identifier after '@'`, lexer);

            objectId = lexer.getTokenString();

            if (objectId === 'root')
                throw new ParserError(`'root' is a reserved binding id`, lexer);

            tokenType = lexer.readToken();
        }

        if (tokenType !== TokenType.LeftCurlyBracket)
            throw new ParserError(`Invalid token found ${lexer.getTokenString()}, expected '{'`, lexer);

        const result: Record<string, any> = {};
        result['__line__'] = lexer.getLineIndex();
        result['__file__'] = lexer.getFileName();

        if (isRoot) {
            result['__name__'] = Path.basename(lexer.getFileName(), Parser._extension);
        }

        if (objectId !== null) {
            result['__id__'] = objectId;
            result['__idFile__'] = lexer.getFileName();
        }

        if (objectName !== Parser._defaultObjectName) {
            if (objectName === '*') {
                result['__ref__'] = true;
            } else {
                if (this._scriptManager.contains(objectName)) {
                    result['__native__'] = objectName;
                } else {
                    const resolvedName = this.resolveUsingName(objectName, usingNamespaces, lexer.getDirectoryName());
                    if (this._scriptManager.contains(resolvedName)) {
                        result['__native__'] = resolvedName;
                    } else {
                        const parsedBase = this.findAndParseObject(resolvedName, lexer.getDirectoryName());
                        result['__base__'] = parsedBase;

                        // Base file may have self-registered as a script under an id different from resolvedName.
                        const selfRegisteredId: string | undefined = parsedBase['__nativeId__'];
                        if (selfRegisteredId) {
                            result['__native__'] = selfRegisteredId;
                            delete result['__base__'];
                        } else if (this._scriptManager.contains(resolvedName)) {
                            result['__native__'] = resolvedName;
                            delete result['__base__'];
                        }
                    }
                }
            }
        }

        const content: any[] = [];
        let componentDefCount = 0;
        tokenType = lexer.readToken();

        while (tokenType !== TokenType.RightCurlyBracket) {
            if (tokenType !== TokenType.Identifier) {
                // bare value (string, number, bool, null, array, @ref) -> implicit content
                lexer.putTokenBack();
                content.push(this.parseValue(lexer, usingNamespaces));
                tokenType = lexer.readToken();
                if (tokenType === TokenType.Semicolon)
                    tokenType = lexer.readToken();
                continue;
            }

            const parameterName = lexer.getTokenString();
            const nextTokenType = lexer.readToken();

            if (nextTokenType === TokenType.Colon) {
                // regular key: value field
                result[parameterName] = this.parseValue(lexer, usingNamespaces);
            } else {
                // inline object as implicit content item (e.g. h1 { ... })
                lexer.putTokenBack();
                const item = this.parseObjectBody(parameterName, lexer, usingNamespaces);
                const itemScript = this._scriptManager.find(item['__native__']);
                if (itemScript?.isComponent?.()) {
                    // store component-def objects at their source position so the
                    // resolver runs them before subsequent items that use the new script
                    result[`__componentDef_${componentDefCount++}__`] = item;
                } else {
                    content.push(item);
                }
            }

            tokenType = lexer.readToken();

            if (tokenType === TokenType.Semicolon)
                tokenType = lexer.readToken();
        }

        if (content.length > 0) {
            result['__content__'] = content;
        }

        const nativeName = result['__native__'];
        if (typeof nativeName === 'string') {
            this._scriptManager.find(nativeName)?.onComponentParsed?.(
                result, lexer.getDirectoryName(), (s) => this._scriptManager.register(s), defaultId
            );
        }

        return result;
    }

    private parseValue(lexer: Lexer, usingNamespaces: UsingEntry[]) : any {
        let tokenType = lexer.readToken();

        switch (tokenType) {
        case TokenType.Minus: {
            tokenType = lexer.readToken();

            if (tokenType !== TokenType.Float && tokenType !== TokenType.Integer) {
                throw new ParserError(`Invalid token found '${lexer.getTokenString()}', expected a number`,  lexer);
            }

            return -lexer.getTokenNumber();
        }

        case TokenType.Float:
        case TokenType.Integer:
            return lexer.getTokenNumber();

        case TokenType.String:
        case TokenType.MultilineString:
            return lexer.getTokenString();

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
            return this.parseObjectBody(Parser._defaultObjectName, lexer, usingNamespaces);

        case TokenType.Identifier:
            lexer.putTokenBack();
            return this.parseObject(lexer, usingNamespaces);

        case TokenType.At: {
            const refTokenType = lexer.readToken();

            if (refTokenType !== TokenType.Identifier)
                throw new ParserError(`Invalid token found '${lexer.getTokenString()}', expected identifier after '@'`, lexer);

            return { __bind__: lexer.getTokenString(), __bindFile__: lexer.getFileName() };
        }

        default:
            throw new ParserError(`Invalid token found '${lexer.getTokenString()}', expected: <number> | <null> | <string> | <array> | <object>`, lexer);
        }
    }

    private parseArray(lexer: Lexer, usingNamespaces: UsingEntry[]): any {
        let tokenType = lexer.readToken();

        if (tokenType !== TokenType.LeftBracket)
            throw new ParserError(`Invalid token found '${lexer.getTokenString()}', expected: '['`,
                                  lexer);

        const result = new Array<any>();

        tokenType = lexer.readToken();

        if (tokenType === TokenType.RightBracket)
            return result;

        lexer.putTokenBack();

        while (true) {
            const value = this.parseValue(lexer, usingNamespaces);

            result.push(value);

            tokenType = lexer.readToken();

            if (tokenType === TokenType.RightBracket)
                break;

            if (tokenType !== TokenType.Comma)
                throw new ParserError(`Invalid token found '${lexer.getTokenString()}', expected: ','`,
                                      lexer);

            // allow trailing comma: peek ahead and stop if the array is closed
            tokenType = lexer.readToken();
            if (tokenType === TokenType.RightBracket)
                break;
            lexer.putTokenBack();
        }

        return result;
    }
}
