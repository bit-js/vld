import type { Schema } from './types';

export function schema<const T extends Schema>(t: T): T {
    return t;
}
