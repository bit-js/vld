/// <reference types='bun-types' />
import { existsSync, rmSync } from 'fs';
import pkg from './package.json';
import { $ } from 'bun';

// Generating types
const dir = './lib';
if (existsSync(dir)) rmSync(dir, { recursive: true });

// Build source files
Bun.build({
    format: 'esm',
    target: 'bun',
    outdir: './lib',
    entrypoints: ['./src/index.ts'],
    minify: {
        whitespace: true
    },
    external: Object.keys(pkg.dependencies)
});

await $`bun x tsc`;
