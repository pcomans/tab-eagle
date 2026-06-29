import { mkdir, rm, rename, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const distDir = new URL('../dist/', import.meta.url);
const generatedHtml = new URL('src/eagle/index.html', distDir);
const finalHtml = new URL('eagle/index.html', distDir);

try {
  await access(generatedHtml);
  await mkdir(dirname(finalHtml.pathname), { recursive: true });
  await rename(generatedHtml, finalHtml);
  await rm(join(distDir.pathname, 'src'), { recursive: true, force: true });
} catch (error) {
  throw new Error(`Unable to finalize extension dist layout: ${error instanceof Error ? error.message : String(error)}`);
}
