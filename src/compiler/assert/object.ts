import { compileSchemaLiteral, setConditions } from './basic';
import { accessor, pushFn, pushRegex } from './utils';

const emptyList: any[] = [];
const emptyObj = {};

export default function setObjectConditions(val: string, conditions: string[], decls: string[], schema: any): void {
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
            setConditions(propVal, conditions, decls, properties[key]);
            // Check if any new conditions are added
            const lenDifference = conditions.length - prevLen;
            if (lenDifference === 0) conditions.push(`typeof ${propVal}!=='undefined'`);

            // eslint-disable-next-line
            if (key in dependentRequired) conditions.push(`typeof ${val}.${dependentRequired[key]}!!=='undefined'`);
            // eslint-disable-next-line
            if (key in dependentSchemas) setConditions(val, conditions, decls, dependentSchemas[key]);
        } else {
            const schemaConditions: string[] = [];
            // eslint-disable-next-line
            setConditions(propVal, schemaConditions, decls, properties[key]);

            // eslint-disable-next-line
            if (key in dependentRequired) schemaConditions.push(`typeof ${accessor(val, dependentRequired[key])}=='undefined'`);
            // eslint-disable-next-line
            if (key in dependentSchemas) setConditions(val, schemaConditions, decls, dependentSchemas[key]);

            if (schemaConditions.length !== 0) conditions.push(`(typeof ${propVal}==='undefined'||${schemaConditions.join('&&')})`);
        }
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
            const literal = compileSchemaLiteral(val, decls, dependentSchemas[key]);
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
        const literal = compileSchemaLiteral('x[i]', decls, patternProperties[key]);
        if (literal !== null) funcConditions.push(`(f${pushRegex(decls, key)}.test(i)&&(!${literal}))`);
    }

    return funcConditions.length === 0 ? null : `f${pushFn(decls, `{for(const i in x)if(${funcConditions.join('||')})return false;return true;}`)}(${val})`;
}
