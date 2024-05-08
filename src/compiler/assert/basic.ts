import { policy } from '../policy';
import { push, pushRegex } from './utils';
import setArrayConditions from './array';
import setConditionalProps from './conditional';
import setObjectConditions from './object';

export function getTypeCondition(val: string, type: string): string {
    switch (type.charCodeAt(2)) {
        // String & Array schema
        case 114: return type.charCodeAt(3) === 105 ? `typeof ${val}==="string"` : `Array.isArray(${val})`;

        // Number schema
        case 109: return policy.allowNonFiniteNumber ? `typeof ${val}==="number"` : `Number.isFinite(${val})`;

        // Integer schema
        case 116: return `Number.isInteger(${val})`;

        // Object schema
        case 106: return `typeof ${val}==="object"&&${val}!==null`;

        // Bool schema
        case 111: return `typeof ${val}==="boolean"`;

        // Nil schema
        case 108: return `${val}===null`;

        // Other type for some reason
        default: throw new Error(`Unknown schema type: ${type}`);
    }
}

export function getEnumCondition(val: string, enumList: any[], decls: string[]): string {
    return `f${push(decls, JSON.stringify(enumList))}.includes(${val})`;
}

export function getConstCondition(val: string, constant: any): string {
    return `${val}===${JSON.stringify(constant)}`;
}

export function setConditions(val: string, conditions: string[], decls: string[], schema: any): void {
    if (typeof schema !== 'object' || schema === null) {
        if (schema === false) conditions.push('false');
        return;
    }

    if ('type' in schema) {
        // eslint-disable-next-line
        const { type } = schema;

        if (Array.isArray(type)) {
            const typeConditions = [];
            for (let i = 0, { length } = type; i < length; ++i)
                // eslint-disable-next-line
                typeConditions.push(getTypeCondition(val, type[i]));

            if (typeConditions.length !== 0)
                conditions.push(`(${typeConditions.join('||')})`);

            // eslint-disable-next-line
        } else conditions.push(getTypeCondition(val, type));
    }

    // Enum & const
    if ('enum' in schema)
        // eslint-disable-next-line
        conditions.push(getEnumCondition(val, schema.enum, decls));

    if ('const' in schema)
        // eslint-disable-next-line
        conditions.push(getConstCondition(val, schema.const));

    // String
    if ('minLength' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}.length>${schema.minLength - 1}`);

    if ('maxLength' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}.length<${schema.maxLength + 1}`);

    if ('pattern' in schema)
        // eslint-disable-next-line
        conditions.push(`f${pushRegex(decls, schema.pattern)}.test(${val})`);

    // Number
    if ('minimum' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}>=${schema.minimum}`);

    if ('maximum' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}<=${schema.maximum}`);

    if ('exclusiveMinimum' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}>${schema.exclusiveMinimum}`);

    if ('exclusiveMaximum' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}<${schema.exclusiveMaximum}`);

    setConditionalProps(val, conditions, decls, schema);
    setArrayConditions(val, conditions, decls, schema);
    setObjectConditions(val, conditions, decls, schema);
}

export function compileSchemaLiteral(val: string, decls: string[], schema: any): string | null {
    const conditions: string[] = [];
    setConditions(val, conditions, decls, schema);
    return conditions.length === 0 ? null : conditions.join('&&');
}

export function inspectCompile(schema: any): string {
    const decls: string[] = [];
    decls.push(`return (x)=>${compileSchemaLiteral('x', decls, schema) ?? 'true'}`);
    return decls.join(';');
}
