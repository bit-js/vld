import { policy } from '../policy';
import { push, pushRegex } from './utils';
import setArrayConditions from './array';
import setConditionalProps from './conditional';
import setObjectConditions from './object';

// Array: 1, String: 2, Numeric: 4
function getTypeCode(val: string, conditions: string[], type: string): number {
    switch (type.charCodeAt(2)) {
        // String & Array schema
        case 114:
            if (type.charCodeAt(3) === 105) {
                conditions.push(`typeof ${val}==="string"`);
                return 1;
            }

            conditions.push(`Array.isArray(${val})`);
            return 2;

        // Number schema
        case 109:
            conditions.push(policy.allowNonFiniteNumber ? `typeof ${val}==="number"` : `Number.isFinite(${val})`);
            return 4;

        // Integer schema
        case 116:
            conditions.push(`Number.isInteger(${val})`);
            return 4;

        // Object schema
        case 106:
            conditions.push(`typeof ${val}==="object"&&${val}!==null`);
            return 8;

        // Bool schema
        case 111:
            conditions.push(`typeof ${val}==="boolean"`);
            return 0;

        // Nil schema
        case 108:
            conditions.push(`${val}===null`);
            return 0;

        // Other type for some reason
        default: throw new Error(`Unknown schema type: ${type}`);
    }
}

function getEnumCondition(val: string, enumList: any[], decls: string[]): string {
    return `f${push(decls, JSON.stringify(enumList))}.includes(${val})`;
}

function getConstCondition(val: string, constant: any): string {
    return `${val}===${JSON.stringify(constant)}`;
}

function setNumberConditions(val: string, conditions: string[], typeSet: number, decls: string[], schema: any): void {
    if ((typeSet & 4) !== 4) {
        const schemaConditions: string[] = [];
        setNumberConditions(val, schemaConditions, typeSet | 4, decls, schema);

        if (schemaConditions.length !== 0)
            conditions.push(`(${policy.allowNonFiniteNumber ? `typeof ${val}!=="number"` : `!Number.isFinite(${val})`}||${schemaConditions.join('&&')})`);

        return;
    }

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
}

function setStringConditions(val: string, conditions: string[], typeSet: number, decls: string[], schema: any): void {
    if ((typeSet & 2) !== 2) {
        const schemaConditions: string[] = [];
        setStringConditions(val, schemaConditions, typeSet | 2, decls, schema);

        if (schemaConditions.length !== 0)
            conditions.push(`(typeof ${val}!=="string"||${schemaConditions.join('&&')})`);

        return;
    }

    if ('minLength' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}.length>${schema.minLength - 1}`);

    if ('maxLength' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}.length<${schema.maxLength + 1}`);

    if ('pattern' in schema)
        // eslint-disable-next-line
        conditions.push(`f${pushRegex(decls, schema.pattern)}.test(${val})`);
}

/**
 * @param val - The current value literal
 * @param conditions - The list of conditions to add
 * @param typeSet - A bitset to mark whether each types are represented in the original schema
 * @param decls - Global declarations
 * @param schema - The target schema to compile
 */
export function setConditions(val: string, conditions: string[], typeSet: number, decls: string[], schema: any): void {
    if (typeof schema !== 'object' || schema === null) {
        if (schema === false) conditions.push('false');
        return;
    }

    if ('type' in schema) {
        // eslint-disable-next-line
        const { type } = schema;

        if (Array.isArray(type)) {
            const typeConditions: string[] = [];
            for (let i = 0, { length } = type; i < length; ++i)
                // eslint-disable-next-line
                typeSet |= getTypeCode(val, typeConditions, type[i]);

            if (typeConditions.length !== 0)
                conditions.push(`(${typeConditions.join('||')})`);

            // eslint-disable-next-line
        } else typeSet |= getTypeCode(val, conditions, type);
    }

    // Enum & const
    if ('enum' in schema)
        // eslint-disable-next-line
        conditions.push(getEnumCondition(val, schema.enum, decls));

    if ('const' in schema)
        // eslint-disable-next-line
        conditions.push(getConstCondition(val, schema.const));

    setStringConditions(val, conditions, typeSet, decls, schema);
    setNumberConditions(val, conditions, typeSet, decls, schema);
    setConditionalProps(val, conditions, typeSet, decls, schema);
    setArrayConditions(val, conditions, typeSet, decls, schema);
    setObjectConditions(val, conditions, typeSet, decls, schema);
}

export function compileSchemaLiteral(val: string, typeSet: number, decls: string[], schema: any): string | null {
    const conditions: string[] = [];
    setConditions(val, conditions, typeSet, decls, schema);
    return conditions.length === 0 ? null : conditions.join('&&');
}

export function inspectCompile(schema: any): string {
    const decls: string[] = [];
    decls.push(`return (x)=>${compileSchemaLiteral('x', 0, decls, schema) ?? 'true'}`);
    return decls.join(';');
}
