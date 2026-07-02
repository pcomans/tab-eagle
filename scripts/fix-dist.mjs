import { mkdir, rm, rename, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const distDir = new URL('../dist/', import.meta.url);
const generatedHtml = new URL('src/eagle/index.html', distDir);
const finalHtml = new URL('eagle/index.html', distDir);
const distPath = fileURLToPath(distDir);
const generatedHtmlPath = fileURLToPath(generatedHtml);
const finalHtmlPath = fileURLToPath(finalHtml);

try {
  await access(generatedHtmlPath);
  await mkdir(dirname(finalHtmlPath), { recursive: true });
  await rename(generatedHtmlPath, finalHtmlPath);
  await rm(join(distPath, 'src'), { recursive: true, force: true });
} catch (error) {
  throw new Error(`Unable to finalize extension dist layout: ${error instanceof Error ? error.message : String(error)}`);
}
