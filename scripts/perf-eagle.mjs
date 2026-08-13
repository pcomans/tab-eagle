import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import puppeteer from 'puppeteer';

const DEFAULT_WINDOW_COUNT = 7;
const DEFAULT_TAB_COUNT = 90;
const DEFAULT_SAMPLE_COUNT = 3;
const READY_TIMEOUT_MS = 15_000;

const options = parseOptions(process.argv.slice(2));
const extensionPath = resolve('dist');
const outputDir = resolve(options.outputDir);

await mkdir(outputDir, { recursive: true });
const fixtureServer = await startFixtureServer();

try {
  const samples = [];
  for (let sampleIndex = 0; sampleIndex < options.samples; sampleIndex += 1) {
    samples.push(await runSample({
      sampleIndex,
      extensionPath,
      fixtureOrigin: fixtureServer.origin,
      tracePath: options.trace && sampleIndex === 0
        ? resolve(outputDir, 'eagle-cold.trace.json')
        : undefined
    }));
  }

  const result = summarize(samples);
  const resultPath = resolve(outputDir, 'eagle-perf.json');
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  printResult(result, resultPath);
  enforceBudgets(result);
} finally {
  await fixtureServer.close();
}

async function runSample({ sampleIndex, extensionPath: unpackedExtensionPath, fixtureOrigin, tracePath }) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      enableExtensions: [unpackedExtensionPath],
      dumpio: process.env.TAB_EAGLE_PERF_BROWSER_LOGS === '1',
      defaultViewport: { width: 1440, height: 900 }
    });
  } catch (error) {
    if (error instanceof Error && /Could not find Chrome|browser.*not found/i.test(error.message)) {
      throw new Error('Chrome for Testing is not installed. Run `npm run perf:setup` once, then retry.', { cause: error });
    }
    throw error;
  }

  try {
    const extension = await findTabEagleExtension(browser);
    const sourcePage = (await browser.pages())[0] ?? await browser.newPage();
    const seed = await seedBrowser({
      extension,
      sourcePage,
      fixtureOrigin,
      windowCount: options.windows,
      tabCount: options.tabs
    });

    if (tracePath) {
      await sourcePage.tracing.start({
        path: tracePath,
        screenshots: true,
        categories: [
          'blink.user_timing',
          'devtools.timeline',
          'disabled-by-default-devtools.timeline',
          'disabled-by-default-devtools.timeline.frame',
          'loading',
          'toplevel'
        ]
      });
    }

    const cold = await measureColdOpen({ browser, extension, sourcePage });
    if (tracePath) await sourcePage.tracing.stop();
    const warm = await measureWarmReopen({ extension, sourcePage, eaglePage: cold.page });

    return {
      sample: sampleIndex + 1,
      chromeVersion: await browser.version(),
      syntheticWindows: seed.windowCount,
      syntheticTabs: seed.tabCount,
      coldOverviewMs: round(cold.overviewMs),
      coldCameraSettledMs: round(cold.cameraSettledMs),
      coldNavigationToOverviewMs: round(cold.navigationToOverviewMs),
      coldNavigationToPaintedOverviewMs: round(cold.navigationToPaintedOverviewMs),
      coldFirstContentfulPaintMs: round(cold.firstContentfulPaintMs),
      coldAppPhasesMs: phaseDurations(cold.appTimings),
      warmOverviewMs: round(warm.overviewMs),
      warmPaintedOverviewMs: round(warm.paintedOverviewMs)
    };
  } finally {
    await browser.close();
  }
}

async function findTabEagleExtension(browser) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const extensions = await browser.extensions();
    const extension = [...extensions.values()].find((candidate) => candidate.name === 'Tab Eagle');
    if (extension) return extension;
    await delay(25);
  }
  throw new Error('Chrome for Testing did not load the Tab Eagle extension.');
}

async function seedBrowser({ extension, sourcePage, fixtureOrigin, windowCount, tabCount }) {
  const urlsByWindow = distributeFixtureUrls(fixtureOrigin, windowCount, tabCount);
  await sourcePage.goto(urlsByWindow[0][0], { waitUntil: 'domcontentloaded' });
  const worker = await waitForExtensionWorker(extension);

  const seed = await worker.evaluate(async (windows) => {
    const sourceUrl = windows[0][0];
    const [sourceTab] = await chrome.tabs.query({ url: sourceUrl });
    if (typeof sourceTab?.id !== 'number' || typeof sourceTab.windowId !== 'number') {
      throw new Error('Could not identify the synthetic source tab.');
    }

    for (const url of windows[0].slice(1)) {
      await chrome.tabs.create({ windowId: sourceTab.windowId, url, active: false });
    }
    for (const urls of windows.slice(1)) {
      await chrome.windows.create({ url: urls, focused: false });
    }

    const expectedTabCount = windows.flat().length;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const normalWindows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
      const fixtureTabs = normalWindows
        .flatMap((windowItem) => windowItem.tabs ?? [])
        .filter((tab) => tab.url?.includes('/fixture/'));
      if (normalWindows.length === windows.length &&
          fixtureTabs.length === expectedTabCount &&
          fixtureTabs.every((tab) => tab.status === 'complete')) {
        await chrome.windows.update(sourceTab.windowId, { focused: true });
        await chrome.tabs.update(sourceTab.id, { active: true });
        return { windowCount: normalWindows.length, tabCount: fixtureTabs.length };
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
    }

    throw new Error('Synthetic Chrome windows did not finish loading.');
  }, urlsByWindow);

  await sourcePage.bringToFront();
  return seed;
}

async function waitForExtensionWorker(extension) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const [worker] = await extension.workers();
    if (worker) return worker;
    await delay(25);
  }
  throw new Error('Tab Eagle service worker did not start.');
}

async function measureColdOpen({ browser, extension, sourcePage }) {
  const eagleTargetPromise = browser.waitForTarget(
    (target) => target.type() === 'page' && target.url().startsWith(`chrome-extension://${extension.id}/eagle/index.html`),
    { timeout: READY_TIMEOUT_MS }
  );
  const invokedAt = performance.now();
  await sourcePage.triggerExtensionAction(extension);
  const eagleTarget = await eagleTargetPromise;
  const eaglePage = await eagleTarget.asPage();
  if (!eaglePage) throw new Error('Tab Eagle opened without a page target.');

  await waitForOverview(eaglePage);
  const overviewAt = performance.now();
  const appTimings = await eaglePage.evaluate(() => Object.fromEntries(
    performance.getEntriesByType('mark')
      .filter((entry) => entry.name.startsWith('tab-eagle:'))
      .map((entry) => [entry.name.slice('tab-eagle:'.length), entry.startTime])
  ));
  const painted = await waitForOverviewPaint(eaglePage);
  await waitForCameraToSettle(eaglePage);

  return {
    page: eaglePage,
    overviewMs: overviewAt - invokedAt,
    cameraSettledMs: performance.now() - invokedAt,
    navigationToOverviewMs: appTimings['overview-ready'],
    navigationToPaintedOverviewMs: painted.paintedAt,
    firstContentfulPaintMs: painted.firstContentfulPaint,
    appTimings
  };
}

async function measureWarmReopen({ extension, sourcePage, eaglePage }) {
  await eaglePage.keyboard.press('Escape');
  await sourcePage.bringToFront();

  await eaglePage.evaluate(({ expectedWindows, expectedTabs }) => {
    window.__tabEaglePerfWarmReady = false;
    const map = document.querySelector('#window-map');
    if (!map) throw new Error('Tab Eagle window map is missing.');
    const observer = new MutationObserver(() => {
      if (document.querySelectorAll('.browser-window').length === expectedWindows &&
          document.querySelectorAll('.tab-card').length === expectedTabs) {
        window.__tabEaglePerfWarmReady = true;
        observer.disconnect();
      }
    });
    observer.observe(map, { childList: true, subtree: true });
  }, { expectedWindows: options.windows, expectedTabs: options.tabs });

  const invokedAt = performance.now();
  await sourcePage.triggerExtensionAction(extension);
  await eaglePage.waitForFunction(() => window.__tabEaglePerfWarmReady === true, { timeout: READY_TIMEOUT_MS });
  const overviewAt = performance.now();
  await waitForOverviewPaint(eaglePage);
  return {
    overviewMs: overviewAt - invokedAt,
    paintedOverviewMs: performance.now() - invokedAt
  };
}

async function waitForOverviewPaint(page) {
  return page.evaluate(() => new Promise((resolvePromise) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const firstContentfulPaint = performance
        .getEntriesByType('paint')
        .find((entry) => entry.name === 'first-contentful-paint')?.startTime;
      resolvePromise({
        paintedAt: performance.now(),
        firstContentfulPaint: firstContentfulPaint ?? performance.now()
      });
    }));
  }));
}

async function waitForOverview(page) {
  await page.waitForFunction(
    ({ expectedWindows, expectedTabs }) =>
      document.querySelectorAll('.browser-window').length === expectedWindows &&
      document.querySelectorAll('.tab-card').length === expectedTabs,
    { timeout: READY_TIMEOUT_MS },
    { expectedWindows: options.windows, expectedTabs: options.tabs }
  );
}

async function waitForCameraToSettle(page) {
  await page.evaluate(() => new Promise((resolvePromise) => {
    const world = document.querySelector('#world');
    if (!(world instanceof HTMLElement)) throw new Error('Tab Eagle world is missing.');
    let previousTransform = '';
    let stableFrames = 0;
    const sample = () => {
      const transform = world.style.transform;
      stableFrames = transform === previousTransform ? stableFrames + 1 : 0;
      previousTransform = transform;
      if (stableFrames >= 3) resolvePromise();
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
}

function distributeFixtureUrls(origin, windowCount, tabCount) {
  const baseCount = Math.floor(tabCount / windowCount);
  const remainder = tabCount % windowCount;
  let tabNumber = 0;
  return Array.from({ length: windowCount }, (_, windowIndex) => {
    const count = baseCount + (windowIndex < remainder ? 1 : 0);
    return Array.from({ length: count }, (_, tabIndex) => {
      const url = new URL(`/fixture/window-${windowIndex + 1}/tab-${tabIndex + 1}`, origin);
      url.searchParams.set('n', String(++tabNumber));
      return url.toString();
    });
  });
}

async function startFixtureServer() {
  const server = createServer((request, response) => {
    if (request.url === '/favicon.ico') {
      response.writeHead(204).end();
      return;
    }

    const url = new URL(request.url ?? '/', 'http://fixture.local');
    const parts = url.pathname.split('/').filter(Boolean);
    const windowName = parts.at(-2)?.replace('-', ' ') ?? 'window';
    const tabName = parts.at(-1)?.replace('-', ' ') ?? 'tab';
    const title = `${capitalize(windowName)} · ${capitalize(tabName)} · Tab Eagle performance fixture`;
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    });
    response.end(`<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1></body></html>`);
  });

  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server did not expose a port.');

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolvePromise, reject) => {
      server.close((error) => error ? reject(error) : resolvePromise());
    })
  };
}

function summarize(samples) {
  return {
    generatedAt: new Date().toISOString(),
    chromeVersion: samples[0]?.chromeVersion,
    scenario: { windows: options.windows, tabs: options.tabs, samples: samples.length },
    median: {
      coldOverviewMs: median(samples.map((sample) => sample.coldOverviewMs)),
      coldCameraSettledMs: median(samples.map((sample) => sample.coldCameraSettledMs)),
      coldNavigationToOverviewMs: median(samples.map((sample) => sample.coldNavigationToOverviewMs)),
      coldNavigationToPaintedOverviewMs: median(samples.map((sample) => sample.coldNavigationToPaintedOverviewMs)),
      coldFirstContentfulPaintMs: median(samples.map((sample) => sample.coldFirstContentfulPaintMs)),
      warmOverviewMs: median(samples.map((sample) => sample.warmOverviewMs)),
      warmPaintedOverviewMs: median(samples.map((sample) => sample.warmPaintedOverviewMs))
    },
    samples
  };
}

function phaseDurations(timings) {
  return {
    moduleReady: round(timings['module-ready']),
    storage: duration(timings, 'init-start', 'storage-ready'),
    readingList: duration(timings, 'reading-list-start', 'reading-list-ready'),
    tabsQuery: duration(timings, 'tabs-start', 'tabs-ready'),
    modelAndRender: duration(timings, 'tabs-ready', 'overview-ready')
  };
}

function duration(timings, from, to) {
  const start = timings[from];
  const end = timings[to];
  return typeof start === 'number' && typeof end === 'number' ? round(end - start) : undefined;
}

function printResult(result, resultPath) {
  const { median: values, scenario } = result;
  console.log(`Tab Eagle performance · ${scenario.windows} windows · ${scenario.tabs} tabs · ${scenario.samples} sample${scenario.samples === 1 ? '' : 's'}`);
  console.log(`Cold invocation → overview:       ${formatMs(values.coldOverviewMs)}`);
  console.log(`Cold navigation → overview:       ${formatMs(values.coldNavigationToOverviewMs)}`);
  console.log(`Cold navigation → painted view:   ${formatMs(values.coldNavigationToPaintedOverviewMs)}`);
  console.log(`Cold first contentful paint:      ${formatMs(values.coldFirstContentfulPaintMs)}`);
  console.log(`Cold invocation → camera settled: ${formatMs(values.coldCameraSettledMs)}`);
  console.log(`Warm invocation → overview:       ${formatMs(values.warmOverviewMs)}`);
  console.log(`Warm invocation → painted view:   ${formatMs(values.warmPaintedOverviewMs)}`);
  console.log(`Results: ${resultPath}`);
  if (options.trace) console.log(`Trace:   ${resolve(outputDir, 'eagle-cold.trace.json')}`);
}

function enforceBudgets(result) {
  const failures = [];
  if (options.coldBudgetMs && result.median.coldOverviewMs > options.coldBudgetMs) {
    failures.push(`cold overview ${formatMs(result.median.coldOverviewMs)} exceeded ${formatMs(options.coldBudgetMs)}`);
  }
  if (options.warmBudgetMs && result.median.warmOverviewMs > options.warmBudgetMs) {
    failures.push(`warm overview ${formatMs(result.median.warmOverviewMs)} exceeded ${formatMs(options.warmBudgetMs)}`);
  }
  if (options.settledBudgetMs && result.median.coldCameraSettledMs > options.settledBudgetMs) {
    failures.push(`camera settled ${formatMs(result.median.coldCameraSettledMs)} exceeded ${formatMs(options.settledBudgetMs)}`);
  }
  if (failures.length > 0) throw new Error(`Performance budget failed: ${failures.join('; ')}.`);
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--trace') values.set('trace', true);
    else if (arg.startsWith('--')) values.set(arg.slice(2), args[++index]);
  }

  return {
    windows: positiveInteger(values.get('windows'), DEFAULT_WINDOW_COUNT, 'windows'),
    tabs: positiveInteger(values.get('tabs'), DEFAULT_TAB_COUNT, 'tabs'),
    samples: positiveInteger(values.get('samples'), DEFAULT_SAMPLE_COUNT, 'samples'),
    coldBudgetMs: optionalPositiveNumber(values.get('cold-budget-ms'), 'cold-budget-ms'),
    warmBudgetMs: optionalPositiveNumber(values.get('warm-budget-ms'), 'warm-budget-ms'),
    settledBudgetMs: optionalPositiveNumber(values.get('settled-budget-ms'), 'settled-budget-ms'),
    outputDir: values.get('output-dir') || 'perf-artifacts',
    trace: values.get('trace') === true
  };
}

function positiveInteger(value, fallback, name) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`--${name} must be a positive integer.`);
  return number;
}

function optionalPositiveNumber(value, name) {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`--${name} must be a positive number.`);
  return number;
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : round((ordered[middle - 1] + ordered[middle]) / 2);
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function formatMs(value) {
  return `${value.toFixed(1)} ms`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}
