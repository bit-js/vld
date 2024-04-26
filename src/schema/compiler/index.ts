import type { Infer, Schema } from '../types';
import {
    compileArray, compileConst, compileEnum, compileInt,
    compileNumber, compileObj, compileString,
    validateBool, validateNil
} from './basic';

/* eslint-disable */
export function compile<const T extends Schema>(schema: T): (data: any) => data is Infer<T> {
    if ('type' in schema) {
        const { type } = schema;

        switch (type.charCodeAt(2)) {
            // @ts-expect-error
            case 114: return type.charCodeAt(3) === 105 ? compileString(schema, false) : compileArray(schema, false);
            // @ts-expect-error
            case 109: return compileNumber(schema, false);
            // @ts-expect-error
            case 116: return compileInt(schema, false);
            // @ts-expect-error
            case 106: return compileObj(schema, false);
            // @ts-expect-error
            case 111: return validateBool;
            // @ts-expect-error
            case 108: return validateNil;

            // Other type for some reason
            default: throw new Error(`Unknown schema type: ${type}`);
        }
    }

    if ('enum' in schema) return compileEnum(schema, false);
    if ('const' in schema) return compileConst(schema, false);

    throw new Error(`Invalid schema: ${JSON.stringify(schema, null, 4)}`);
}
