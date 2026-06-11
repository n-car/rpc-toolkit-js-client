import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { minify } from 'terser';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);

const author =
  typeof packageJson.author === 'string'
    ? packageJson.author
    : `${packageJson.author.name} (${packageJson.author.url})`;

const banner = `/*!
 * ${packageJson.name} v${packageJson.version}
 * ${packageJson.description}
 * Author: ${author}
 * Copyright (c) 2026 Nicola Carpanese
 * SPDX-License-Identifier: ${packageJson.license}
 */`;

await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../dist', import.meta.url), { recursive: true });

await build({
  entryPoints: ['src/index.mjs'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'es2020',
  outfile: 'dist/rpc-client.cjs',
  sourcemap: true,
  legalComments: 'none',
  banner: { js: banner },
});

await build({
  entryPoints: ['src/index.mjs'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  outfile: 'dist/rpc-client.mjs',
  sourcemap: true,
  legalComments: 'none',
  banner: { js: banner },
});

await build({
  entryPoints: ['src/index.mjs'],
  bundle: true,
  format: 'iife',
  globalName: 'RpcToolkitClient',
  platform: 'browser',
  target: 'es2020',
  outfile: 'dist/rpc-client.js',
  sourcemap: true,
  legalComments: 'none',
  banner: { js: banner },
});

const browserBundle = await readFile(
  new URL('../dist/rpc-client.js', import.meta.url),
  'utf8'
);
const browserBundleMap = await readFile(
  new URL('../dist/rpc-client.js.map', import.meta.url),
  'utf8'
);
const browserMinified = await minify(browserBundle, {
  compress: true,
  mangle: true,
  ecma: 2020,
  sourceMap: {
    content: browserBundleMap,
    filename: 'rpc-client.min.js',
    url: 'rpc-client.min.js.map',
  },
  format: {
    comments: false,
    preamble: banner,
  },
});
await writeFile(
  new URL('../dist/rpc-client.min.js', import.meta.url),
  browserMinified.code
);
await writeFile(
  new URL('../dist/rpc-client.min.js.map', import.meta.url),
  browserMinified.map
);

const moduleBundle = await readFile(
  new URL('../dist/rpc-client.mjs', import.meta.url),
  'utf8'
);
const moduleBundleMap = await readFile(
  new URL('../dist/rpc-client.mjs.map', import.meta.url),
  'utf8'
);
const moduleMinified = await minify(moduleBundle, {
  compress: true,
  mangle: true,
  module: true,
  ecma: 2020,
  sourceMap: {
    content: moduleBundleMap,
    filename: 'rpc-client.min.mjs',
    url: 'rpc-client.min.mjs.map',
  },
  format: {
    comments: false,
    preamble: banner,
  },
});
await writeFile(
  new URL('../dist/rpc-client.min.mjs', import.meta.url),
  moduleMinified.code
);
await writeFile(
  new URL('../dist/rpc-client.min.mjs.map', import.meta.url),
  moduleMinified.map
);
