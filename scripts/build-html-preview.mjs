import { copyOcrAssets } from './prepare-ocr-assets.mjs';
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const local = name => path.join(root, 'scripts/html-preview', name);
const vendor = path.join(root, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons');
const glyphs = JSON.parse(await readFile(path.join(vendor, 'glyphmaps/Ionicons.json'), 'utf8'));
const font = (await readFile(path.join(vendor, 'Fonts/Ionicons.ttf'))).toString('base64');
const result = await build({
  entryPoints: [local('entry.tsx')], bundle: true, write: false, format: 'iife', platform: 'browser',
  minify: true, target: ['chrome100', 'safari15'], jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' },
  resolveExtensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
  alias: {
    'react-native': 'react-native-web', 'expo-router': local('navigation.tsx'),
    'expo-crypto': local('crypto.ts'), 'react-native-safe-area-context': local('safe-area.tsx'),
    '@react-native-async-storage/async-storage': local('storage.ts'),
  },
  plugins: [{ name: 'inline-icons', setup(builder) {
    builder.onResolve({ filter: /^@expo\/vector-icons\/Ionicons$/ }, () => ({ path: 'icons', namespace: 'spotclip' }));
    builder.onLoad({ filter: /^icons$/, namespace: 'spotclip' }, () => ({
      resolveDir: root, loader: 'js', contents: `import React from 'react';import {Text} from 'react-native-web';const glyphs=${JSON.stringify(glyphs)};export default function Icon({name,size=22,color}){return React.createElement(Text,{style:{fontFamily:'SpotClipIcons',fontSize:size,color},accessibilityElementsHidden:true},String.fromCodePoint(glyphs[name]||glyphs['location-outline']));}`,
    }));
  } }],
});
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SpotClip · HTML 체험</title><style>@font-face{font-family:SpotClipIcons;src:url(data:font/ttf;base64,${font}) format('truetype');font-display:block}html,body,#root{height:100%;width:100%;margin:0}#root{display:flex;flex-direction:column;min-height:0}body{overflow:hidden}*{box-sizing:border-box}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;
await mkdir(path.join(root, 'dist-html'), { recursive: true });
await writeFile(path.join(root, 'dist-html/SpotClip.html'), html);
console.log(`Standalone SpotClip.html generated (${Buffer.byteLength(html)} bytes). OCR assets are hosted alongside the HTML; images stay in the browser.`);

await copyOcrAssets('dist-html');
