import type { Infer, Schema } from '../../schema';
import Context from './context';

export function assert<const T extends Schema>(schema: T): (data: any) => data is Infer<T> {
    return Function(assertCode(schema))();
}

export function assertCode(schema: Schema): string {
    const ctx = new Context();
    ctx.compile(schema);
    return ctx.finalize();
}
