import {
    compileArray, compileConst, compileEnum, compileInt, compileNumber,
    compileNumberLiteral, compileObj, compileString, compileStringLiteral,
    validateBoolOptional,
    validateNilOptional
} from './basic';

export class ObjectCompileContext {
    private readonly keys: string[] = [];
    private readonly values: any[] = [];
    private idx: number = 0;

    private readonly conditions: string[];

    public constructor(conditions: string[]) {
        this.conditions = conditions;
    }

    public put(value: any): string {
        const key = `x${this.idx++}`;

        this.keys.push(key);
        this.values.push(value);

        return key;
    }

    public condition(): string {
        return this.conditions.join('&&');
    }

    public build(): any {
        return this.inject(`return (o)=>${this.condition()};`);
    }

    public inject(body: string): any {
        // eslint-disable-next-line
        return Function(...this.keys, body)(...this.values);
    }

    private addCheck(val: string, f: any): void {
        this.conditions.push(`${this.put(f)}(${val})`);
    }

    /* eslint-disable */
    public compileKey(key: string | number, schema: any, optional: boolean): void {
        const { conditions } = this;
        const val = typeof key === 'number' ? `o[${key}]` : `o.${key}`;

        if ('type' in schema) {
            const { type } = schema;

            const code = type.charCodeAt(2);
            switch (code) {
                // String & Array
                case 114:
                    if (type.charCodeAt(3) === 114) return this.addCheck(val, compileArray(schema, optional));

                    // Check for inlining possibilities
                    if (optional || typeof schema.minLength === 'number' || typeof schema.maxLength === 'number')
                        return this.addCheck(val, compileString(schema, optional));

                    conditions.push(compileStringLiteral(val, schema, optional));
                    return;

                // Number & Integer
                case 109:
                case 116:
                    if (optional || typeof schema.multipleOf === 'number' || typeof schema.minimum === 'number' || typeof schema.exclusiveMinimum === 'number' || typeof schema.maximum === 'number' || typeof schema.exclusiveMaximum === 'number')
                        return this.addCheck(val, code === 109 ? compileNumber(schema, optional) : compileInt(schema, optional));

                    conditions.push(compileNumberLiteral(val, code === 116, schema, optional));
                    return;

                // Object
                case 106: return this.addCheck(val, compileObj(schema, optional));

                // Bool & Null
                case 111:
                    if (optional) return this.addCheck(val, validateBoolOptional);

                    conditions.push(`(${optional ? `typeof ${val}==='undefined'||` : ''}typeof ${val}==='boolean')`);
                    return;
                case 108:
                    if (optional) return this.addCheck(val, validateNilOptional);

                    conditions.push(`(${optional ? `typeof ${val}==='undefined'||` : ''}${val}===null)`);
                    return;

                // Other type for some reason
                default: throw new Error(`Unknown schema type: ${type}`);
            }
        }

        if ('enum' in schema) {
            if (optional) return this.addCheck(val, compileEnum(schema, true));

            const values = schema.enum;

            const set: Record<any, null> = {};
            for (let i = 0, { length } = values; i < length; ++i) set[values[i]] = null;

            const key = this.put(set);
            conditions.push(`${val} in ${key}`);

            return;
        }

        if ('const' in schema) {
            if (optional) return this.addCheck(val, compileConst(schema, true));

            conditions.push(`(${optional ? `typeof ${val}==='undefined'||` : ''}${val}===${JSON.stringify(schema.const)})`);
            return;
        }

        throw new Error(`Invalid schema: ${JSON.stringify(schema, null, 4)}`);
    }
}
