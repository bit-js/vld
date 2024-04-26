import type { Schema } from '.';

export interface ArraySchema {
    type: 'array';

    items?: Schema;
    prefixItems?: Schema[];
}
