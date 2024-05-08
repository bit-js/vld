import { compileSchemaLiteral } from './basic';

function isIdentifier(str: string): boolean {
    const firstCode = str.charCodeAt(0);

    // If first character is invalid (fuck eslint)
    // eslint-disable-next-line
    if (firstCode !== 95 && ((firstCode < 97 && firstCode > 90) || firstCode > 122 || firstCode < 65)) return false;

    // Traverse the string for the rest of the characters
    for (let i = 1, { length } = str; i < length; i++) {
        const code = str.charCodeAt(i);
        // eslint-disable-next-line
        if (code !== 95 && ((code < 97 && code > 90) || (code < 65 && code > 57) || code > 122 || code < 48)) return false;
    }

    // String is a valid identifier
    return true;
}

export function accessor(source: string, prop: string): string {
    return isIdentifier(prop) ? `${source}.${prop}` : `${source}[${JSON.stringify(prop)}]`;
}

// Push schema item
export function pushFn(decls: string[], body: string): number {
    const { length } = decls;
    decls.push(`const f${length}=(x)=>${body}`);
    return length;
}

export function createFn(decls: string[], schema: any): number {
    return pushFn(decls, compileSchemaLiteral('x', decls, schema) ?? 'true');
}

export function pushRegex(decls: string[], pattern: string): number {
    return push(decls, `new RegExp(${JSON.stringify(pattern)})`);
}

export function push(decls: string[], body: string): number {
    const { length } = decls;
    decls.push(`const f${length}=${body}`);
    return length;
}
