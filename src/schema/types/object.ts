import type { Infer, Schema } from '.';

type SchemaRecord = Record<string, Schema>;
type BaseRecord = Record<string, any>;

export interface ObjectSchema {
    type: 'object';

    properties?: SchemaRecord;
    required?: string[];
}

type Split<T extends BaseRecord, RequiredKeys extends string> = {
    [K in keyof T & RequiredKeys]?: T[K];
} & {
        [K in Exclude<keyof T, RequiredKeys>]?: T[K];
    } & BaseRecord;

export type InferObjectSchema<T extends ObjectSchema> = T['properties'] extends SchemaRecord ? Split<{
    [K in keyof T['properties']]: Infer<T['properties'][K]>
}, T['required'] extends string[] ? T['required'][number] : any> : BaseRecord;
