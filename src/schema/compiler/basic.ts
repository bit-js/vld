import { compile } from '.';

import type { ArraySchema, ConstSchema, EnumSchema, NumericSchema, ObjectSchema, StringSchema } from '../types';
import { ObjectCompileContext } from './object';

export function compileStringLiteral(val: string, schema: StringSchema, optional: boolean): any {
    return `${optional ? `typeof ${val}==='undefined'||` : ''}typeof ${val}==='string'${typeof schema.minLength === 'number' ? `&&${val}.length>${schema.minLength - 1}` : ''}${typeof schema.maxLength === 'number' ? `&&${val}.length<${schema.maxLength + 1}` : ''}`;
}

export function compileString(schema: StringSchema, optional: boolean): any {
    return Function(`return (o)=>${compileStringLiteral('o', schema, optional)}`)();
}

export function compileArray(schema: ArraySchema, optional: boolean): any {
    // Array
    const { items, prefixItems } = schema;

    if (typeof items === 'undefined') {
        if (typeof prefixItems === 'undefined')
            return optional ? (o: any) => typeof o === 'undefined' || Array.isArray(o) : Array.isArray;

        const ctx = new ObjectCompileContext([`${optional ? "typeof o==='undefined'||" : ''}Array.isArray(o)`]);
        for (let i = 0, { length } = prefixItems; i < length; ++i) ctx.compileKey(i, prefixItems[i], false);

        return ctx.build();
    }

    const checkItem = compile(items);

    if (typeof prefixItems === 'undefined')
        return Function('f', `return (o)=>${optional ? "typeof o==='undefined'||" : ''}Array.isArray(o)&&o.every(f);`)(checkItem);

    const ctx = new ObjectCompileContext([`${optional ? "typeof o==='undefined'||" : ''}Array.isArray(o)`]);
    const key = ctx.put(checkItem);

    const prefixItemsLen = prefixItems.length;
    for (let i = 0; i < prefixItemsLen; ++i) ctx.compileKey(i, prefixItems[i], false);

    return ctx.inject(`return (o)=>{if(!(${ctx.condition()}))return false;for(let i=${prefixItemsLen},{length}=o;i<length;++i)if(!(${key}(o[i])))return false;return true;}`);
}

export function compileNumberLiteral(val: string, checkInteger: boolean, schema: NumericSchema, optional: boolean): any {
    // eslint-disable-next-line
    return `${optional ? `typeof ${val}==='undefined'||` : ''}Number.is${checkInteger ? 'Integer' : 'Finite'}(${val})${typeof schema.maximum === 'number' ? `&&${val}<=${schema.maximum}` : ''}${typeof schema.minimum === 'number' ? `&&${val}>=${schema.minimum}` : ''}${typeof schema.exclusiveMaximum === 'number' ? `&&${val}<${schema.exclusiveMaximum}` : ''}${typeof schema.exclusiveMinimum === 'number' ? `&&${val}>${schema.exclusiveMinimum}` : ''}${typeof schema.multipleOf === 'number' ? `&&${val}%${schema.multipleOf}===0` : ''}`;
}

export function compileNumber(schema: NumericSchema, optional: boolean): any {
    return Function(`return (o)=>${compileNumberLiteral('o', false, schema, optional)}`)();
}

export function compileInt(schema: NumericSchema, optional: boolean): any {
    return Function(`return (o)=>${compileNumberLiteral('o', true, schema, optional)}`)();
}

export function compileObj(schema: ObjectSchema, optional: boolean): any {
    const { properties, required = [] } = schema;
    if (typeof properties === 'undefined') return (o: any) => typeof o === 'object' && o !== null;

    const ctx = new ObjectCompileContext([`${optional ? "typeof o==='undefined'||" : ''}typeof o==='object'&&o!==null`]);

    for (const key in properties) ctx.compileKey(key, properties[key], !required.includes(key));

    return ctx.build();
}

export function compileEnum(schema: EnumSchema, optional: boolean): any {
    const values = schema.enum;

    const set: Record<any, null> = {};

    // @ts-expect-error ...
    for (let i = 0, { length } = values; i < length; ++i) set[values[i]] = null;
    return optional ? (o: any) => typeof o === 'undefined' || o in set : (o: any) => o in set;
}

export function compileConst(schema: ConstSchema, optional: boolean): any {
    return Function(`return (o)=>${optional ? "typeof o==='undefined'||" : ''}o===${JSON.stringify(schema.const)};`)();
}

export function validateBool(obj: any): boolean {
    return typeof obj === 'boolean';
}

export function validateBoolOptional(obj: any): boolean {
    return typeof obj === 'undefined' || typeof obj === 'boolean';
}

export function validateNil(obj: any): boolean {
    return obj === null;
}

export function validateNilOptional(obj: any): boolean {
    return typeof obj === 'undefined' || obj === null;
}
