import type { Schema } from '../types';

export function isInlineable(schema: Schema): boolean {
    if ('type' in schema) {
        switch (schema.type.charCodeAt(2)) {
            case 114:
                // @ts-expect-error Here it is a string
                return typeof schema.maxLength === 'undefined' && typeof schema.minLength === 'undefined';

            case 109:
            case 116:
                // @ts-expect-error Here it is a numeric schema
                return typeof schema.exclusiveMaximum === 'undefined' && typeof schema.exclusiveMinimum === 'undefined' && typeof schema.maximum === 'undefined' && typeof schema.minimum === 'undefined' && typeof schema.multipleOf === 'undefined';

            // Bools and null
            case 111:
            case 108:
                return true;

            // Objects and arrays
            default:
                return false;
        }
    }

    return 'enum' in schema || 'const' in schema;
}

const list = ['string', 'number', 'integer', 'boolean', 'null', 'object', 'array'];

for (let i = 0, { length } = list; i < length; ++i) console.log(`${list[i]} ${list[i].charCodeAt(2)} ${list[i].charCodeAt(3)}`);

