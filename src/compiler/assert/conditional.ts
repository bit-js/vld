import { compileSchemaLiteral, setConditions } from './basic';

export default function setConditionalProps(val: string, conditions: string[], typeSet: number, decls: string[], schema: any): void {
    if ('if' in schema && 'then' in schema) {
        // eslint-disable-next-line
        const ifStatement = compileSchemaLiteral(val, typeSet, decls, schema.if);
        if (ifStatement !== null) {
            // eslint-disable-next-line
            const thenStatement = compileSchemaLiteral(val, typeSet, decls, schema.then);

            if ('else' in schema) {
                // eslint-disable-next-line
                const elseStatement = compileSchemaLiteral(val, typeSet, decls, schema.else);

                if (elseStatement !== null || thenStatement !== null)
                    conditions.push(`(!(${ifStatement})${thenStatement !== null ? `||(${thenStatement})` : ''}${elseStatement !== null ? `||(${elseStatement})` : ''})`);
            } else if (thenStatement !== null) conditions.push(`(!(${ifStatement})||${thenStatement})`);
        }
    }

    if ('allOf' in schema) {
        // eslint-disable-next-line
        const { allOf } = schema;

        // eslint-disable-next-line
        for (let i = 0, { length } = allOf; i < length; ++i)
            // eslint-disable-next-line
            setConditions(val, conditions, typeSet, decls, allOf[i]);
    }

    if ('anyOf' in schema) {
        // eslint-disable-next-line
        const { anyOf } = schema;
        // eslint-disable-next-line
        const { length } = anyOf;

        const schemaConditions: string[] = [];
        for (let i = 0; i < length; ++i) {
            // eslint-disable-next-line
            const literal = compileSchemaLiteral(val, typeSet, decls, anyOf[i]);
            if (literal !== null) schemaConditions.push(literal);
        }

        if (schemaConditions.length !== 0) conditions.push(`(${schemaConditions.join('||')})`);
    }

    if ('not' in schema) {
        // eslint-disable-next-line
        const literal = compileSchemaLiteral(val, typeSet, decls, schema.not);
        conditions.push(literal === null ? 'false' : `!(${literal})`);
    }
}
