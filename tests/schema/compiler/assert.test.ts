import { compile } from '@bit-js/vld';
// @ts-expect-error
import suite from '@json-schema-org/tests';
import { expect, test, describe } from 'bun:test';

const tests = suite.loadSync();

const ignoredSuites = ['refRemote', 'minProperties', 'maxProperties', 'contains'];

for (let i = 0, { length } = tests; i < length; ++i) {
    const item = tests[i];
    const { schemas } = item;

    if (ignoredSuites.includes(item.name)) continue;

    describe(item.name, () => {
        for (let i = 0, { length } = schemas; i < length; ++i) {
            const item = schemas[i];

            describe(`${item.description}: ${JSON.stringify(item.schema, null, 4)}`, () => {
                const f = compile.assert(item.schema);
                const fn = (e: any) => f(e) ? e : null;

                const { tests } = item;
                for (let i = 0, { length } = tests; i < length; ++i) {
                    const item = tests[i];

                    test(`${item.description}: ${JSON.stringify(item.data, null, 4)}`, () => {
                        expect(fn(item.data)).toEqual(item.valid ? item.data : null);
                    });
                }
            });
        }
    });
}

