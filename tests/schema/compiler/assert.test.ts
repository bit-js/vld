import { compile } from '@bit-js/vld';
import { expect, test } from 'bun:test';

test('Basic object', () => {
    const f = compile.assert({
        type: 'object',
        properties: {
            name: { type: 'string', minLength: 3 },
            age: { type: 'integer', exclusiveMinimum: 0, exclusiveMaximum: 100 },
            nickname: { type: 'string', minLength: 3 }
        },
        required: ['name', 'age']
    });

    expect(f({
        name: 'abc',
        age: 25
    })).toBeTrue();

    expect(f({
        name: 'ab',
        age: -1
    })).toBeFalse();

    expect(f({
        name: 'abcd',
        age: 78,
        nickname: 'xd'
    })).toBeFalse();
});

test('Basic array', () => {
    const f = compile.assert({
        type: 'array',
        items: {
            type: 'string',
            minLength: 3
        }
    });

    expect(f([])).toBeTrue();
    expect(f(['a'])).toBeFalse();
    expect(f(['abcd', 'a'])).toBeFalse();
    expect(f(['cdba', 'xycd'])).toBeTrue();
});

test('Tuple', () => {
    const f = compile.assert({
        type: 'array',
        prefixItems: [{
            type: 'number',
            exclusiveMaximum: 10
        }],
        items: {
            type: 'string',
            minLength: 3
        }
    });

    expect(f([])).toBeFalse();
    expect(f([10])).toBeFalse();
    expect(f(['abcd', 'a'])).toBeFalse();
    expect(f([5, 'xycd'])).toBeTrue();
});
