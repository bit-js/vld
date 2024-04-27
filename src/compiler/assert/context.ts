import type { ArraySchema, EnumSchema, NumericSchema, ObjectSchema, StringSchema } from '../../schema';
import { compileNumberLiteral, compileStringLiteral } from './basic';

function spreadEnumItem(item: any): string {
    return `${JSON.stringify(item)}:null`;
}

export default class Context {
    private readonly dependencies: string[] = [];

    public finalize(): any {
        const { dependencies } = this;
        return `${dependencies.join('')}return f${dependencies.length - 1}`;
    }

    // Add a dependency
    public push(literal: string): number {
        const { dependencies } = this;
        const { length } = dependencies;

        dependencies.push(`const f${length}=${literal};`);
        return length;
    }

    public pushFunc(conditions: string[]): number {
        return this.push(`(o)=>${conditions.join('&&')}`);
    }

    public pushSet(list: any[]): number {
        return this.push(`{${list.map(spreadEnumItem).join()}}`);
    }

    public compileString(schema: StringSchema, optional: boolean): number {
        return this.push(`(o)=>${compileStringLiteral('o', schema, optional)}`);
    }

    public compileNumber(schema: NumericSchema, checkInteger: boolean, optional: boolean): number {
        return this.push(`(o)=>${compileNumberLiteral('o', checkInteger, schema, optional)}`);
    }

    public compileEnum(schema: EnumSchema, optional: boolean): number {
        return this.push(`(o)=>${optional ? "typeof o==='undefined'||" : ''}o in f${this.pushSet(schema.enum)}`);
    }

    public compileArray(schema: ArraySchema, optional: boolean): number {
        // Array
        const { items, prefixItems } = schema;

        if (typeof items === 'undefined') {
            if (typeof prefixItems === 'undefined')
                return this.push(optional ? "(o)=>typeof o==='undefined'||Array.isArray(o)" : 'Array.isArray');

            const conditions = [`${optional ? "typeof o==='undefined'||" : ''}Array.isArray(o)`];
            for (let i = 0, { length } = prefixItems; i < length; ++i) this.compileKey(conditions, i, prefixItems[i], false);
            return this.pushFunc(conditions);
        }

        const checkItem = this.compile(items);
        if (typeof prefixItems === 'undefined')
            return this.push(`(o)=>${optional ? "typeof o==='undefined'||" : ''}Array.isArray(o)&&o.every(f${checkItem})`);

        const conditions = [`${optional ? "typeof o==='undefined'||" : ''}Array.isArray(o)`];
        const prefixItemsLen = prefixItems.length;
        for (let i = 0; i < prefixItemsLen; ++i) this.compileKey(conditions, i, prefixItems[i], false);

        return this.push(`(o)=>{if(!(${conditions.join('&&')}))return false;for(let i=${prefixItemsLen},{length}=o;i<length;++i)if(!(f${checkItem}(o[i])))return false;return true;}`);
    }

    public compileObject(schema: ObjectSchema, optional: boolean): number {
        const { properties, required = [] } = schema;
        if (typeof properties === 'undefined')
            return this.push(`(o)=>${optional ? "typeof o==='undefined'||" : ''}typeof o==='object'&&o!==null`);

        const conditions = [`${optional ? "typeof o==='undefined'||" : ''}typeof o==='object'&&o!==null`];
        for (const key in properties) this.compileKey(conditions, key, properties[key], !required.includes(key));

        return this.pushFunc(conditions);
    }

    /* eslint-disable */
    public compile(schema: any): number {
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

    public compileKey(conditions: string[], key: string | number, schema: any, optional: boolean): void {
        const val = typeof key === 'number' ? `o[${key}]` : `o.${key}`;

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
                    conditions.push(`(${optional ? `typeof ${val}==='undefined'||` : ''}typeof ${val}==='boolean')`);
                    return;
                case 108:
                    conditions.push(`(${optional ? `typeof ${val}==='undefined'||` : ''}${val}===null)`);
                    return;

                // Other type for some reason
                default: throw new Error(`Unknown schema type: ${type}`);
            }
        }

        else if ('enum' in schema)
            conditions.push(`(${optional ? `typeof ${val}==='undefined'||` : ''}${val} in f${this.pushSet(schema.enum)})`);

        else if ('const' in schema)
            conditions.push(`(${optional ? `typeof ${val}==='undefined'||` : ''}${val}===${JSON.stringify(schema.const)})`)

        else throw new Error(`Invalid schema: ${JSON.stringify(schema, null, 4)}`);
    }
}
