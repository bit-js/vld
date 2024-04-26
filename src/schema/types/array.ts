import type { InferSchema, Schema } from '.';

export interface ArraySchema {
    type: 'array';

    items?: Schema;
    prefixItems?: Schema[];
}

type InferPrefixItems<T extends Schema[]> = T extends [infer Item extends Schema, ... infer Items extends Schema[]] ? [InferSchema<Item>, ...InferPrefixItems<Items>] : [];

export type InferArraySchema<T extends ArraySchema> = T['items'] extends Schema ? (
    T['prefixItems'] extends Schema[] ? [...InferPrefixItems<T['prefixItems']>, ...InferSchema<T['items']>[]] : InferSchema<T['items']>[]
) : T['prefixItems'] extends Schema[] ? InferPrefixItems<T['prefixItems']> : any[];

