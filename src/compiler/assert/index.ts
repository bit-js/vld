import type { Infer, Schema } from '../../schema';
import { inspectCompile } from './basic';

export function assert<const T extends Schema>(schema: T): (data: any) => data is Infer<T> {
    return Function(inspectAssert(schema))();
}

export function inspectAssert(schema: Schema): string {
    return inspectCompile(schema);
}
