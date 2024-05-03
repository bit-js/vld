import { policy } from '../policy';

export function pushFn(decls: string[], body: string): number {
    const { length } = decls;
    decls.push(`const f${length}=(x)=>${body}`);
    return length;
}

export function createFn(decls: string[], schema: any): number {
    return pushFn(decls, compileLiteral('x', decls, schema));
}

export function pushRegex(decls: string[], pattern: string): number {
    return push(decls, `new RegExp(${JSON.stringify(pattern)})`);
}

export function push(decls: string[], body: string): number {
    const { length } = decls;
    decls.push(`const f${length}=${body}`);
    return length;
}

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

export function setArrayItemsConditions(val: string, conditions: string[], decls: string[], items: any, prefixItems: any): void {
    if (typeof items === 'undefined') {
        if (typeof prefixItems !== 'undefined')
            // eslint-disable-next-line
            for (let i = 0, { length } = prefixItems; i < length; ++i) setConditions(`${val}[${i}]`, conditions, decls, prefixItems[i]);
    } else if (typeof prefixItems === 'undefined')
        conditions.push(`${val}.every(f${createFn(decls, items)})`);
    else {
        const tupleConditions: string[] = [];

        // eslint-disable-next-line
        const { length } = prefixItems;
        // eslint-disable-next-line
        for (let i = 0; i < length; ++i) setConditions(`x[${i}]`, tupleConditions, decls, prefixItems[i]);

        conditions.push(`f${pushFn(
            decls,
            `{if(!(${tupleConditions.join('&&')}))return false;for(let i=${length},{length}=x;i<length;++i)if(!(${compileLiteral('x[i]', decls, items)}))return false;return true;}`
        )}(${val})`);
    }
}

export function setArrayConditions(val: string, conditions: string[], decls: string[], schema: any): void {
    /* Items */
    if ('minItems' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}.length>${schema.minItems - 1}`);

    if ('maxItems' in schema)
        // eslint-disable-next-line
        conditions.push(`${val}.length<${schema.maxItems + 1}`);

    // eslint-disable-next-line
    if (Array.isArray(schema.items)) setArrayItemsConditions(val, conditions, decls, schema.additionalItems, schema.items);
    // eslint-disable-next-line
    else setArrayItemsConditions(val, conditions, decls, schema.items ?? schema.additionalItems, schema.prefixItems);

    /* Unique items */
    // eslint-disable-next-line
    if (schema.uniqueItems === true)
        conditions.push(`new Set(${val}).length===${val}.length`);

    /* Contain */
    if ('contains' in schema) {
        // eslint-disable-next-line
        const hasMinContain = typeof schema.minContains === 'number';
        // eslint-disable-next-line
        const hasMaxContain = typeof schema.maxContains === 'number';

        if (hasMinContain || hasMaxContain) {
            conditions.push(`f${pushFn(
                decls,
                // eslint-disable-next-line
                `{let c=0;for(let i=0,{length}=x;i<length;++i)c+=${compileLiteral('x[i]', decls, schema.contains)}?1:0;return ${hasMaxContain ? `c<${schema.maxContains + 1}` : ''}${hasMaxContain && hasMinContain ? '&&' : ''}${hasMinContain ? `c>${schema.minContains - 1}` : ''};}`
            )}(${val})`);
            // eslint-disable-next-line
        } else conditions.push(`${val}.some(f${createFn(decls, schema.contains)})`);
    } else {
        if ('minContains' in schema)
            // eslint-disable-next-line
            conditions.push(`${val}.length>${schema.minContains - 1}`);

        if ('maxContains' in schema)
            // eslint-disable-next-line
            conditions.push(`${val}.length<${schema.maxContains + 1}`);
    }
}

export function setPropsCondition(val: string, conditions: string[], decls: string[], schema: any): void {
    // eslint-disable-next-line
    const { properties } = schema;

    if ('required' in schema) {
        // eslint-disable-next-line
        const { required } = schema;

        for (const key in properties) {
            // eslint-disable-next-line
            if (required.includes(key)) setConditions(`${val}.${key}`, conditions, decls, properties[key]);

            else {
                const propVal = `${val}.${key}`;
                // eslint-disable-next-line
                conditions.push(`(typeof ${propVal}==='undefined'||${compileLiteral(propVal, decls, properties[key])})`);
            }
        }
        // eslint-disable-next-line
    } else for (const key in properties) {
        const propVal = `${val}.${key}`;
        // eslint-disable-next-line
        conditions.push(`(typeof ${propVal}==='undefined'||${compileLiteral(propVal, decls, properties[key])})`);
    }
}

export function getPropsPatternCondition(val: string, decls: string[], patternProperties: any): string {
    const funcConditions: string[] = [];

    for (const key in patternProperties)
        // eslint-disable-next-line
        funcConditions.push(`(f${pushRegex(decls, key)}.test(i)&&!(${compileLiteral('x[i]', decls, patternProperties[key])}))`);

    return `f${pushFn(decls, `{for(const i in x)if(${funcConditions.join('||')})return false;return true;}`)}(${val})`;
}

export function getEnumCondition(val: string, enumList: any[], decls: string[]): string {
    return `f${push(decls, JSON.stringify(enumList))}.includes(${val})`;
}

export function getConstCondition(val: string, constant: any): string {
    return `${val}===${JSON.stringify(constant)}`;
}

export function setConditions(val: string, conditions: string[], decls: string[], schema: any): void {
    if ('type' in schema)
        // eslint-disable-next-line
        conditions.push(getTypeCondition(val, schema.type));

    // Enum & const
    if ('enum' in schema)
        // eslint-disable-next-line
        conditions.push(getEnumCondition(val, schema.enum, decls));

    if ('const' in schema)
        // eslint-disable-next-line
        conditions.push(getConstCondition(val, schema.const));

    // Objects
    if ('properties' in schema)
        setPropsCondition(val, conditions, decls, schema);

    if ('patternProperties' in schema)
        // eslint-disable-next-line
        conditions.push(getPropsPatternCondition(val, decls, schema.patternProperties));

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

    setArrayConditions(val, conditions, decls, schema);
}

export function compileLiteral(val: string, decls: string[], schema: any): string {
    const conditions: string[] = [];
    setConditions(val, conditions, decls, schema);
    return conditions.length === 0 ? 'true' : conditions.join('&&');
}

export function inspectCompile(schema: any): string {
    const decls: string[] = [];
    decls.push(`return (x)=>${compileLiteral('x', decls, schema)}`);
    return decls.join(';');
}
