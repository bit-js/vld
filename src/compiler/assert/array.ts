import { compileSchemaLiteral, setConditions } from './basic';
import { createFn, pushFn } from './utils';

function setArrayItemsConditions(val: string, conditions: string[], decls: string[], items: any, prefixItems: any): void {
    if (typeof items === 'undefined') {
        if (typeof prefixItems !== 'undefined')
            // eslint-disable-next-line
            for (let i = 0, { length } = prefixItems; i < length; ++i) setConditions(`${val}[${i}]`, conditions, decls, prefixItems[i]);
    } else if (typeof prefixItems === 'undefined')
        conditions.push(`${val}.every(f${createFn(decls, items)})`);
    else {
        // Check whether item condition is any
        const itemLiteral = compileSchemaLiteral('x[i]', decls, items);
        if (itemLiteral === null) {
            // eslint-disable-next-line
            for (let i = 0, { length } = prefixItems; i < length; ++i) setConditions(`${val}[${i}]`, conditions, decls, prefixItems[i]);
            return;
        }

        const tupleConditions: string[] = [];

        // eslint-disable-next-line
        const { length } = prefixItems;
        // eslint-disable-next-line
        for (let i = 0; i < length; ++i) setConditions(`x[${i}]`, tupleConditions, decls, prefixItems[i]);

        conditions.push(tupleConditions.length === 0
            ? `${val}.every(f${createFn(decls, items)})`
            : `f${pushFn(decls, `{if(!(${tupleConditions.join('&&')}))return false;for(let i=${length},{length}=x;i<length;++i)if(!(${itemLiteral}))return false;return true;}`)}(${val})`);
    }
}

export default function setArrayConditions(val: string, conditions: string[], decls: string[], schema: any): void {
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
            // eslint-disable-next-line
            const literal = compileSchemaLiteral('x[i]', decls, schema.contains);

            conditions.push(literal === null
                // eslint-disable-next-line
                ? `${hasMaxContain ? `${val}.length<${schema.maxContains + 1}` : ''}${hasMaxContain && hasMinContain ? '&&' : ''}${hasMinContain ? `${val}.length>${schema.minContains - 1}` : ''}`
                : `f${pushFn(
                    decls,
                    // eslint-disable-next-line
                    `{let c=0;for(let i=0,{length}=x;i<length;++i)c+=${literal}?1:0;return ${hasMaxContain ? `c<${schema.maxContains + 1}` : ''}${hasMaxContain && hasMinContain ? '&&' : ''}${hasMinContain ? `c>${schema.minContains - 1}` : ''};}`
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
