import type { ArraySchema, InferArraySchema } from './array';
import type { BoolSchema, ConstSchema, EnumSchema, NullSchema, NumericSchema, StringSchema } from './basic';
import type { InferObjectSchema, ObjectSchema } from './object';

export type Schema = StringSchema | NumericSchema | BoolSchema
    | NullSchema | EnumSchema | ConstSchema | ArraySchema | ObjectSchema;

/* eslint-disable */
export type Infer<T extends Schema> =
    T extends StringSchema ? string :
    T extends NumericSchema ? number :
    T extends BoolSchema ? boolean :
    T extends NullSchema ? null :
    T extends EnumSchema ? T['enum'][number] :
    T extends ConstSchema ? T['const'] :
    T extends ArraySchema ? InferArraySchema<T> :
    T extends ObjectSchema ? InferObjectSchema<T> : any;

export * from './array';
export * from './basic';
export * from './object';
export * from './utils';

export function create<const T extends Schema>(schema: T): T { return schema; }
