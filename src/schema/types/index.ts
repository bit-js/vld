import type { ArraySchema } from './array';
import type { BasicSchema } from './basic';
import type { ObjectSchema } from './object';

export type Schema = BasicSchema | ObjectSchema | ArraySchema;

export * from './array';
export * from './basic';
export * from './object';
export * from './utils';
