import type { Schema } from '.';

export interface ObjectSchema {
    type: 'object';

    properties?: Record<string, Schema>;
    required?: string[];
}
