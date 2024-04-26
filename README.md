# Vld
A fast JSON schema complaint type validator.

This library implements a subset of JSON schema draft 7.

## Usage
```ts
import { schema } from '@bit-js/vld';

// Type hint for JSON schema
const Username = schema.create({
    type: 'string',
    minLength: 3,
    maxLength: 25
});

// Extract type from schema
export type Username = schema.Infer<Username>;

// Compile a schema
const isUser = schema.compile({
    type: 'object',
    properties: {
        name: Username,
        age: { type: 'integer', minimum: 1, maximum: 100 },
        nickname: Username
    },
    required: ['name', 'age']
});

// Example usage with data validation
if (isUser(user)) {
    user.name; // string
    user.age; // number
    user.nickname; // string | undefined
}
```
