import type { Infer, Schema } from '../../schema';
import Context from './context';

export function assert<const T extends Schema>(schema: T): (data: any) => data is Infer<T> {
    return Function(inspectAssert(schema).code)();
}

export function inspectAssert(schema: Schema): Context {
    return new Context(schema);
}
