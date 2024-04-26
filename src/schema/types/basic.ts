import type { PrimitiveValue } from './utils';

export interface StringSchema {
    type: 'string';

    minLength?: number;
    maxLength?: number;
}

export interface NumericSchema {
    type: 'integer' | 'number';

    multipleOf?: number;

    minimum?: number;
    exclusiveMinimum?: number;

    maximum?: number;
    exclusiveMaximum?: number;
}

export interface BoolSchema {
    type: 'boolean';
}

export interface NullSchema {
    type: 'null';
}

export interface EnumSchema {
    enum: PrimitiveValue[];
}

export interface ConstSchema {
    const: PrimitiveValue;
}

export type BasicSchema = StringSchema | NumericSchema | BoolSchema
    | NullSchema | EnumSchema | ConstSchema;
