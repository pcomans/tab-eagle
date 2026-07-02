import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const assetsDir = path.join(root, 'dist/eagle/assets');
const previewDir = path.join(root, 'tmp-sky-preview');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const cssFile = (await readdir(assetsDir)).find((name) => name.endsWith('.css'));

if (!cssFile) {
  throw new Error('No built Eagle CSS asset found. Run npm run build first.');
}

await mkdir(previewDir, { recursive: true });

const css = await readFile(path.join(assetsDir, cssFile), 'utf8');
const iconPath = path.join(root, 'public/icons/icon128.png');

const cards = Array.from({ length: 15 }, (_, index) => {
  const domains = ['mail.google.com', 'linkedin.com', 'app.notion.com', 'github.com', 'docs.google.com'];
  const titles = [
    'Inbox - Gmail',
    'Notifications | LinkedIn',
    'Applications | Notion',
    'hapi/docs at main',
    'JD Feedback - Google Docs'
  ];
  const age = index < 3 ? '10m' : index < 8 ? '2h' : '1d';

  return `
    <article class="tab-card${index === 0 ? ' is-selected' : ''}" role="gridcell">
      <div class="card-content">
        <div class="favicon fallback">${domains[index % domains.length][0].toUpperCase()}</div>
        <div class="tab-copy">
          <div class="domain">${domains[index % domains.length]}</div>
          <h2>${titles[index % titles.length]}</h2>
          <div class="last-accessed">Last used ${age} ago</div>
        </div>
      </div>
      <div class="card-footer">
        <div class="tab-meta"><span class="tab-meta-item">Read later</span></div>
      </div>
    </article>
  `;
}).join('');

function previewHtml(colorScheme) {
  return `<!doctype html>
<html data-color-scheme="${colorScheme}">
  <head>
    <meta charset="utf-8" />
    <style>${css}</style>
    <style>
      .preview-control {
        height: 48px;
        border: 1px solid var(--md-sys-color-outline);
        border-radius: 8px;
        display: grid;
        align-items: center;
        padding: 0 16px;
        color: var(--md-sys-color-on-surface-variant);
        background: color-mix(in srgb, var(--md-sys-color-surface) 62%, transparent);
      }
      .preview-sort {
        height: 40px;
        border: 1px solid var(--md-sys-color-outline);
        border-radius: 999px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        overflow: hidden;
        color: var(--md-sys-color-on-surface);
        font-size: 13px;
        font-weight: 600;
      }
      .preview-sort > div {
        display: grid;
        place-items: center;
      }
      .preview-sort > div + div {
        border-left: 1px solid var(--md-sys-color-outline);
      }
      .preview-sort > div:last-child {
        background: var(--md-sys-color-secondary-container);
        color: var(--md-sys-color-on-secondary-container);
      }
    </style>
  </head>
  <body>
    <main class="app-shell">
      <div class="sky-background" aria-hidden="true">
        <span class="cloud cloud-one"></span>
        <span class="cloud cloud-two"></span>
        <span class="cloud cloud-three"></span>
      </div>

      <header class="top-bar">
        <div class="title-block">
          <h1><span>Tab Eagle</span><img class="title-logo" src="file://${iconPath}" alt="" /></h1>
          <p>41 tabs</p>
        </div>
        <div class="tab-search preview-control">Search</div>
        <div class="toolbar">
          <div class="sort-control preview-sort">
            <div>Position</div>
            <div>Domain</div>
            <div>Recent ↓</div>
          </div>
        </div>
      </header>

      <section class="status"></section>
      <section class="tab-grid" role="grid" aria-label="Tabs">${cards}</section>
    </main>
  </body>
</html>`;
}

for (const colorScheme of ['light', 'dark']) {
  const htmlPath = path.join(previewDir, `${colorScheme}.html`);
  const screenshotPath = path.join(previewDir, `${colorScheme}.png`);

  await writeFile(htmlPath, previewHtml(colorScheme));
  await execFileAsync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1440,900',
    `--screenshot=${screenshotPath}`,
    `file://${htmlPath}`
  ]);
}

console.log(`Rendered sky previews from ${cssFile}`);
console.log(path.join(previewDir, 'light.png'));
console.log(path.join(previewDir, 'dark.png'));
