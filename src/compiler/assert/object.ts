import { compileSchemaLiteral, setConditions } from './basic';
import { accessor, pushFn, pushRegex } from './utils';

const emptyList: any[] = [];
const emptyObj = {};

export default function setObjectConditions(val: string, conditions: string[], typeSet: number, decls: string[], schema: any): void {
    if ((typeSet & 8) !== 8) {
        const schemaConditions: string[] = [];
        setObjectConditions(val, schemaConditions, typeSet | 8, decls, schema);

        if (schemaConditions.length !== 0)
            conditions.push(`(typeof ${val}!=="object"||${val}===null||Array.isArray(${val})||${schemaConditions.join('&&')})`);

        return;
    }

    // I cannot optimize this as it will be confusing after adding more props
    // eslint-disable-next-line
    const {
        properties = emptyObj,
        required = emptyList,
        dependentRequired = emptyObj,
        dependentSchemas = emptyObj
    } = schema;

    for (const key in properties) {
        const propVal = accessor(val, key);

        // eslint-disable-next-line
        if (required.includes(key)) {
            const prevLen = conditions.length;
            // eslint-disable-next-line
            setConditions(propVal, conditions, 0, decls, properties[key]);
            // Check if any new conditions are added
            const lenDifference = conditions.length - prevLen;
            if (lenDifference === 0) conditions.push(`typeof ${propVal}!=='undefined'`);

            // eslint-disable-next-line
            if (key in dependentRequired) conditions.push(`typeof ${val}.${dependentRequired[key]}!!=='undefined'`);
            // eslint-disable-next-line
            if (key in dependentSchemas) setConditions(val, conditions, typeSet, decls, dependentSchemas[key]);
        } else {
            const schemaConditions: string[] = [];
            // eslint-disable-next-line
            setConditions(propVal, schemaConditions, 0, decls, properties[key]);

            // eslint-disable-next-line
            if (key in dependentRequired) schemaConditions.push(`typeof ${accessor(val, dependentRequired[key])}=='undefined'`);
            // eslint-disable-next-line
            if (key in dependentSchemas) setConditions(val, schemaConditions, 0, decls, dependentSchemas[key]);

            if (schemaConditions.length !== 0) conditions.push(`(typeof ${propVal}==='undefined'||${schemaConditions.join('&&')})`);
        }
    }

    // eslint-disable-next-line
    for (let i = 0, { length } = required; i < length; ++i) {
        // eslint-disable-next-line
        const key = required[i] as string;
        if (!(key in properties)) conditions.push(`typeof ${accessor(val, key)}!=='undefined'`);
    }

    // Compile properties that is not in properties
    for (const key in dependentRequired) {
        if (!(key in properties))
            // eslint-disable-next-line
            conditions.push(`(typeof ${accessor(val, key)}==='undefined'||typeof ${accessor(val, dependentRequired[key])}!=='undefined')`);
    }

    for (const key in dependentSchemas) {
        if (!(key in properties)) {
            // eslint-disable-next-line
            const literal = compileSchemaLiteral(val, typeSet, decls, dependentSchemas[key]);
            if (literal !== null) conditions.push(`(typeof ${accessor(val, key)}==='undefined'||${literal})`);
        }
    }

    if ('patternProperties' in schema) {
        // eslint-disable-next-line
        const literal = getPropsPatternCondition(val, decls, schema.patternProperties);
        if (literal !== null) conditions.push(literal);
    }
}

function getPropsPatternCondition(val: string, decls: string[], patternProperties: any): string | null {
    const funcConditions: string[] = [];

    for (const key in patternProperties) {
        // eslint-disable-next-line
        const literal = compileSchemaLiteral('x[i]', 0, decls, patternProperties[key]);
        if (literal !== null) funcConditions.push(`(f${pushRegex(decls, key)}.test(i)&&(!${literal}))`);
    }

    return funcConditions.length === 0 ? null : `f${pushFn(decls, `{for(const i in x)if(${funcConditions.join('||')})return false;return true;}`)}(${val})`;
}
