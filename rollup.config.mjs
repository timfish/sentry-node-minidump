import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const external = Object.keys(packageJson.dependencies);

function getBuild(format, input, external = []) {
  return {
    input,
    output: {
      file: `${input.split('.')[0]}.${format === 'esm' ? 'mjs' : 'cjs'}`,
      format,
      strict: false,
      freeze: false,
      externalLiveBindings: false,
      generatedCode: {
        preset: 'es2015',
        symbols: false,
      },
    },
    treeshake: {
      preset: 'smallest',
      moduleSideEffects: false,
    },
    external: [path.resolve('./bindings.cjs'), ...external],
    plugins: [resolve(), typescript({ outDir: '.', tsconfig: './tsconfig.json' })],
  };
}

export default [
  getBuild('cjs', 'index.ts', external),
  getBuild('esm', 'index.ts', external),
  getBuild('esm', 'reporter.ts', external),
];
