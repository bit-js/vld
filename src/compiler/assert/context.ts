import type { ArraySchema, EnumSchema, NumericSchema, ObjectSchema, Schema, StringSchema } from '../../schema';
import { compileNumberLiteral, compileStringLiteral } from './basic';

function spreadEnumItem(item: any): string {
    return `${JSON.stringify(item)}:null`;
}

export default class Context {
    public readonly dependencies: string[] = [];
    public readonly code: string;

    public constructor(schema: Schema) {
        const id = this.compile(schema);
        this.code = `${this.dependencies.join('')}return f${id};`;
    }

    // Add a dependency
    private push(literal: string): number {
        const { dependencies } = this;
        return dependencies.push(`const f${dependencies.length}=${literal};`) - 1;
    }

    private pushFunc(conditions: string): number {
        return this.push(`(o)=>${conditions}`);
    }

    private pushSet(list: any[]): number {
        return this.push(`{${list.map(spreadEnumItem).join()}}`);
    }

    private compileString(schema: StringSchema, optional: boolean): number {
        return this.push(`(o)=>${compileStringLiteral('o', schema, optional)}`);
    }

    private compileNumber(schema: NumericSchema, checkInteger: boolean, optional: boolean): number {
        return this.push(`(o)=>${compileNumberLiteral('o', checkInteger, schema, optional)}`);
    }

    private compileEnum(schema: EnumSchema, optional: boolean): number {
        return this.push(`(o)=>${optional ? "typeof o==='undefined'||" : ''}o in f${this.pushSet(schema.enum)}`);
    }

    private compileArray(schema: ArraySchema, optional: boolean): number {
        // Array
        const { items, prefixItems } = schema;

        if (typeof items === 'undefined') {
            if (typeof prefixItems === 'undefined')
                return this.push(optional ? "(o)=>typeof o==='undefined'||Array.isArray(o)" : 'Array.isArray');

            const conditions = [`${optional ? "typeof o==='undefined'||" : ''}Array.isArray(o)`];
            for (let i = 0, { length } = prefixItems; i < length; ++i) this.compileKey(conditions, `o[${i}]`, prefixItems[i], false);
            return this.pushFunc(conditions.join('&&'));
        }

        if (typeof prefixItems === 'undefined')
            return this.push(`(o)=>${optional ? "typeof o==='undefined'||" : ''}Array.isArray(o)&&o.every(f${this.compile(items)})`);

        const conditions = [`${optional ? "typeof o==='undefined'||" : ''}Array.isArray(o)`];
        const prefixItemsLen = prefixItems.length;
        for (let i = 0; i < prefixItemsLen; ++i) this.compileKey(conditions, `o[${i}]`, prefixItems[i], false);

        return this.push(`(o)=>{if(!(${conditions.join('&&')}))return false;for(let i=${prefixItemsLen},{length}=o;i<length;++i)if(!(f${this.compile(items)}(o[i])))return false;return true;}`);
    }

    private compileObject(schema: ObjectSchema, optional: boolean): number {
        const { properties, required = [] } = schema;
        if (typeof properties === 'undefined')
            return this.push(`(o)=>${optional ? "typeof o==='undefined'||" : ''}typeof o==='object'&&o!==null`);

        const conditions = [`${optional ? "typeof o==='undefined'||" : ''}typeof o==='object'&&o!==null`];
        for (const key in properties) this.compileKey(conditions, `o.${key}`, properties[key], !required.includes(key));

        return this.pushFunc(conditions.join('&&'));
    }

    /* eslint-disable */
    private compile(schema: any): number {
        if ('type' in schema) {
            const { type } = schema;
            const code = type.charCodeAt(2);

            switch (code) {
                // String schema
                case 114:
                    return type.charCodeAt(3) === 105 ? this.compileString(schema, false) : this.compileArray(schema, false);

                // Number schema
                case 109:
                case 116:
                    return this.compileNumber(schema, code === 116, false);

                case 106:
                    return this.compileObject(schema, false);

                case 111: return this.push("(o)=>typeof o==='boolean'");
                case 108: return this.push("(o)=>typeof o==='null'");

                // Other type for some reason
                default: throw new Error(`Unknown schema type: ${type}`);
            }
        }

        if ('enum' in schema)
            return this.compileEnum(schema, false);
        if ('const' in schema)
            return this.push(`(o)=>o===${JSON.stringify(schema.const)}`);

        throw new Error(`Invalid schema: ${JSON.stringify(schema, null, 4)}`);
    }

    private compileKey(conditions: string[], val: string, schema: any, optional: boolean): void {
        if ('type' in schema) {
            const { type } = schema;
            const code = type.charCodeAt(2);

            switch (code) {
                // String & Array
                case 114:
                    conditions.push(
                        // Array
                        type.charCodeAt(3) === 114 ? (
                            !optional && typeof schema.items === 'undefined' && typeof schema.prefixItems !== 'undefined'
                                ? `Array.isArray(${val})`
                                : `f${this.compileArray(schema, optional)}(${val})`
                        ) :
                            // String inlining
                            optional || typeof schema.minLength === 'number' || typeof schema.maxLength === 'number'
                                ? `f${this.compileString(schema, optional)}(${val})` : compileStringLiteral(val, schema, optional)
                    );

                    return;

                // Number & Integer
                case 109:
                case 116:
                    // Number inlining
                    conditions.push(
                        optional || typeof schema.multipleOf === 'number' || typeof schema.minimum === 'number' || typeof schema.exclusiveMinimum === 'number'
                            || typeof schema.maximum === 'number' || typeof schema.exclusiveMaximum === 'number'
                            ? `f${this.compileNumber(schema, code === 116, optional)}(${val})` : compileNumberLiteral(val, code === 116, schema, optional)
                    )

                    return;

                // Object
                case 106:
                    conditions.push(`f${this.compileObject(schema, optional)}(${val})`);
                    return;

                // Bool & Null
                case 111:
                    conditions.push(optional
                        ? `f${this.push(`(o)=>typeof o==='undefined'||typeof o==='boolean'`)}(${val})`
                        : `typeof ${val}==='boolean'`
                    );
                    return;
                case 108:
                    conditions.push(optional
                        ? `f${this.push(`(o)=>typeof o==='undefined'||o===null`)}(${val})`
                        : `${val}===null`
                    );
                    return;

                // Other type for some reason
                default: throw new Error(`Unknown schema type: ${type}`);
            }
        }

        else if ('enum' in schema)
            conditions.push(optional
                ? `f${this.compileEnum(schema, true)}(${val})`
                : `${val} in f${this.pushSet(schema.enum)})`
            );

        else if ('const' in schema)
            conditions.push(optional
                ? `f${this.push(`(o)=>typeof o==='undefined'||o===${JSON.stringify(schema.const)}`)}(${val})`
                : `${val}===${JSON.stringify(schema.const)}`
            );

        else throw new Error(`Invalid schema: ${JSON.stringify(schema, null, 4)}`);
    }
}
