import type { NumericSchema, StringSchema } from '../../schema';
import { policy } from '../policy';

// String
export function compileStringLiteral(val: string, schema: StringSchema, optional: boolean): any {
    return `${optional ? `typeof ${val}==='undefined'||` : ''}typeof ${val}==='string'${typeof schema.minLength === 'number' ? `&&${val}.length>${schema.minLength - 1}` : ''}${typeof schema.maxLength === 'number' ? `&&${val}.length<${schema.maxLength + 1}` : ''}`;
}

// Number
export function compileNumberLiteral(val: string, checkInteger: boolean, schema: NumericSchema, optional: boolean): any {
    // eslint-disable-next-line
    return `${optional ? `typeof ${val}==='undefined'||` : ''}${checkInteger ? `Number.isInteger(${val})` : (policy.allowNonFiniteNumber ? `typeof ${val}==='number'` : `Number.isFinite(${val})`)}${typeof schema.maximum === 'number' ? `&&${val}<=${schema.maximum}` : ''}${typeof schema.minimum === 'number' ? `&&${val}>=${schema.minimum}` : ''}${typeof schema.exclusiveMaximum === 'number' ? `&&${val}<${schema.exclusiveMaximum}` : ''}${typeof schema.exclusiveMinimum === 'number' ? `&&${val}>${schema.exclusiveMinimum}` : ''}${typeof schema.multipleOf === 'number' ? `&&${val}%${schema.multipleOf}===0` : ''}`;
}
