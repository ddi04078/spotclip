import { mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function copyOcrAssets(destination) {
  const output = path.join(root, destination, 'ocr');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await copyFile(path.join(root, 'node_modules/tesseract.js/dist/worker.min.js'), path.join(output, 'worker.min.js'));
  for (const file of await readdir(path.join(root, 'node_modules/tesseract.js-core'))) {
    if (/^tesseract-core(?:-simd)?-lstm\.wasm(?:\.js)?$/.test(file)) await copyFile(path.join(root, 'node_modules/tesseract.js-core', file), path.join(output, file));
  }
  for (const lang of ['kor','eng']) await copyFile(path.join(root, `node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`), path.join(output, `${lang}.traineddata.gz`));
  for (const [pkg, name] of [['tesseract.js','TESSERACT-LICENSE'],['tesseract.js-core','CORE-LICENSE']]) await copyFile(path.join(root, 'node_modules', pkg, pkg === 'tesseract.js' ? 'LICENSE.md' : 'LICENSE'), path.join(output,name));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await copyOcrAssets('public');
