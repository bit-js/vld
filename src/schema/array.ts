import type { Infer, Schema } from '.';

export interface ArraySchema {
    type: 'array';

    prefixItems?: Schema[];
    additionalItems?: Schema;

    items?: Schema;
    minItems?: number;
    maxItems?: number;

    contains?: Schema;
    minContains?: number;
    maxContains?: number;

    uniqueItems?: boolean;
}

type InferPrefixItems<T extends Schema[]> = T extends [infer Item extends Schema, ... infer Items extends Schema[]] ? [Infer<Item>, ...InferPrefixItems<Items>] : [];

export type InferArraySchema<T extends ArraySchema> = T['items'] extends Schema ? (
    T['prefixItems'] extends Schema[] ? [...InferPrefixItems<T['prefixItems']>, ...Infer<T['items']>[]] : Infer<T['items']>[]
) : T['prefixItems'] extends Schema[] ? InferPrefixItems<T['prefixItems']> : any[];

// TODO: Infer additionalItems and items
