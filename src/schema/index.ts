import type { Schema } from './types';

export function create<const T extends Schema>(t: T): T { return t; }
export { compile } from './compiler';

export * from './types';
