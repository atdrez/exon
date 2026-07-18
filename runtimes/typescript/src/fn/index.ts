// SPDX-License-Identifier: MIT

import JsEval from "./js/eval";
import JsonEncode from "./json/encode";
import JsonDecode from "./json/decode";
import CsvEncode from "./csv/encode";
import CsvDecode from "./csv/decode";
import FileLoad from "./file/load";
import FileSave from "./file/save";
import Map from "./map";
import Merge from "./merge";
import Assert from "./assert";
import ForEach from "./foreach";
import ProcessEnv from "./process/env";
import ProcessArgv from "./process/argv";
import ProcessExec from "./process/exec";
import ProcessExit from "./process/exit";
import XmlEncode from "./xml/encode";
import YamlEncode from "./yaml/encode";
import PlistEncode from "./plist/encode";
import StringIs from "./string/is";
import StringJoin from "./string/join";
import StringSplit from "./string/split";
import StringTrim from "./string/trim";
import StringTrimStart from "./string/trimStart";
import StringTrimEnd from "./string/trimEnd";
import StringEndsWith from "./string/endsWith";
import StringStartsWith from "./string/startsWith";
import StringIncludes from "./string/includes";
import StringIsEmpty from "./string/isEmpty";
import StringLength from "./string/length";
import StringParseInt from "./string/parseInt";
import StringParseFloat from "./string/parseFloat";
import StringReplace from "./string/replace";
import StringReplaceAll from "./string/replaceAll";
import StringToUpperCase from "./string/toUpperCase";
import StringToLowerCase from "./string/toLowerCase";
import StringSlice from "./string/slice";
import StringPadStart from "./string/padStart";
import StringPadEnd from "./string/padEnd";
import StringRepeat from "./string/stringRepeat";
import StringIndexOf from "./string/indexOf";
import StringCharAt from "./string/charAt";
import StringConcat from "./string/concat";
import NumberIs from "./number/is";
import MathMin from "./math/min";
import MathMax from "./math/max";
import MathClamp from "./math/clamp";
import Property from "./property";
import Parameter from "./parameter";
import Sequence from "./sequence";
import NativeLoader from "./native";
import ComponentLoader from "./component";
import ImportLoader from "./import";
import Raise from "./raise";
import Try from "./try";
import Pass from "./pass";
import Count from "./count";
import Switch from "./switch";
import PrintLn from "./println";
import Wrapper from "./wrapper";
import Reverse from "./reverse";
import While from "./while";
import Repeat from "./repeat";
import PropertyGet from "./get";
import PropertySet from "./set";
import Del from "./del";
import RegexTest from "./regex/test";
import PathDirName from "./path/dirname";
import PathBaseName from "./path/basename";
import PathExtension from "./path/extension";
import PathIsFile from "./path/isfile";
import PathIsDirectory from "./path/isdir";
import PathAbsolute from "./path/absolute";
import LangOr from "./lang/or";
import LangAnd from "./lang/and";
import LangIf from "./lang/if";
import LangEq from "./lang/eq";
import LangNe from "./lang/ne";
import LangLt from "./lang/lt";
import LangGt from "./lang/gt";
import LangLe from "./lang/le";
import LangGe from "./lang/ge";
import LangAdd from "./lang/add";
import LangSub from "./lang/sub";
import LangMul from "./lang/mul";
import LangDiv from "./lang/div";
import LangNot from "./lang/not";
import LangMod from "./lang/mod";
import LangPow from "./lang/pow";
import LangXor from "./lang/xor";
import LangNeg from "./lang/neg";
import LangLazy from "./lang/lazy";
import LangClosure from "./lang/closure";
import LangCall from "./lang/call";
import LangDefined from "./lang/defined";
import LangTypeof from "./lang/typeof";
import LangClassname from "./lang/classname";
import LangInstanceof from "./lang/instanceof";
import LangIn from "./lang/in";
import LangCoalesce from "./lang/coalesce";
import LangCond from "./lang/cond";
import Preprocess from "./preprocess";
import OsPlatform from "./os/platform";
import OsArch from "./os/arch";
import OsType from "./os/type";
import OsRelease from "./os/release";

export function components(): any {
    return [
        JsEval,
        FileLoad, FileSave,
        JsonEncode,
        JsonDecode,
        CsvEncode,
        CsvDecode,
        Assert,
        ForEach,

        // XML
        XmlEncode,

        // YAML
        YamlEncode,

        // plist
        PlistEncode,

        // collection
        Map, Merge,

        // process
        ProcessEnv, ProcessExec, ProcessArgv, ProcessExit,

        // path
        PathIsFile, PathIsDirectory, PathDirName, PathBaseName, PathExtension, PathAbsolute,

        // math
        MathMin, MathMax, MathClamp,

        NativeLoader, ComponentLoader, ImportLoader,
        Parameter, Try, Raise, Switch, Sequence, Wrapper, PrintLn, Count, Pass, Reverse, While, Repeat,

        // property
        Property, PropertyGet, PropertySet, Del,

        // number
        NumberIs,

        // regex
        RegexTest,

        // string
        StringIs, StringJoin, StringSplit, StringConcat,
        StringParseInt, StringParseFloat, StringIsEmpty,
        StringLength, StringTrim, StringTrimStart, StringTrimEnd,
        StringEndsWith, StringStartsWith, StringIncludes, StringIndexOf,
        StringReplace, StringReplaceAll,
        StringToUpperCase, StringToLowerCase,
        StringSlice, StringPadStart, StringPadEnd,
        StringRepeat, StringCharAt,

        // lang
        LangOr, LangAnd, LangIf, LangEq, LangNe, LangLt, LangGt, LangLe, LangGe,
        LangAdd, LangSub, LangMul, LangDiv, LangMod, LangPow,
        LangNot, LangXor, LangNeg,
        LangDefined, LangTypeof, LangClassname, LangInstanceof, LangIn,
        LangCoalesce, LangCond, LangLazy, LangClosure, LangCall,

        // preprocessor
        Preprocess,

        // os
        OsPlatform, OsArch, OsType, OsRelease
    ];
}
