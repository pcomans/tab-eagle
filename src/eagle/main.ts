import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/labs/segmentedbutton/outlined-segmented-button.js';
import '@material/web/labs/segmentedbuttonset/outlined-segmented-button-set.js';
import '@material/web/ripple/ripple.js';
import './styles.css';

import type { EagleState, ManagedTab, SortMode } from '../shared/types';
import { getEagleBaseUrl, isEagleUrl } from '../shared/urls';
import { ageBucketForLastAccessed, colorsForAgeBucket, isAgeSortMode } from './age-colors';
import { colorsFromImage, faviconUrlForPageUrl, loadImage, type DomainCardColors } from './domain-colors';
import { closeIconSvg, readingListIconSvg, statusIconSvg } from './icons';
import { nextSortMode, sortTabs, toManagedTab, toReadingListUrl } from './tab-model';

const SORT_STORAGE_KEY = 'sortMode';
const CLOSE_RESERVE_TIMEOUT_MS = 1800;

let state: EagleState;
let managedTabs: ManagedTab[] = [];
let orderedTabs: ManagedTab[] = [];
let refreshTimer: number | undefined;
let closeReserveSlots = 0;
let closeReserveTimer: number | undefined;
let isPointerInsideGrid = false;
let readingListUrls = new Set<string>();
let readingListPendingTabIds = new Set<number>();
const domainColorCache = new Map<string, DomainCardColors | null>();
const domainColorRequests = new Set<string>();

const grid = requiredElement<HTMLDivElement>('#tab-grid');
const tabCount = requiredElement<HTMLParagraphElement>('#tab-count');
const statusEl = requiredElement<HTMLDivElement>('#status');
const returnOriginButton = requiredElement<HTMLElement>('#return-origin');
const sortButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-sort]'));

void init();

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Tab Eagle failed to initialize: missing ${selector}.`);
  }
  return element;
}

async function init(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const currentTab = await chrome.tabs.getCurrent();
  const selfTabId = currentTab?.id;
  const sourceTabId = numberFromParam(params.get('sourceTabId'));
  const sourceWindowId = numberFromParam(params.get('sourceWindowId')) ?? currentTab?.windowId;

  if (typeof sourceWindowId !== 'number') {
    setStatus('Tab Eagle could not determine which window to manage.');
    return;
  }

  const { [SORT_STORAGE_KEY]: storedSortMode } = await chrome.storage.local.get({
    [SORT_STORAGE_KEY]: 'position'
  });

  const initialSortMode = isSortMode(storedSortMode) ? storedSortMode : 'position';

  state = {
    sourceWindowId,
    selfTabId,
    originTabId: sourceTabId === selfTabId ? undefined : sourceTabId,
    sortMode: initialSortMode,
    pendingTabIds: new Set()
  };

  bindEvents();
  syncSortControl();
  await refreshReadingList();
  await refreshTabs();
}

function bindEvents(): void {
  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const sortMode = button.dataset.sort;
      if (!isSortMode(sortMode)) return;
      void setSortMode(nextSortMode(state.sortMode, sortMode));
    });
  });

  returnOriginButton.addEventListener('click', () => {
    void returnToOrigin();
  });

  grid.addEventListener('pointerenter', () => {
    isPointerInsideGrid = true;
  });

  grid.addEventListener('pointerleave', () => {
    isPointerInsideGrid = false;
    clearGridReserveSlots();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      void returnToOrigin();
      return;
    }

    if (event.key === 'Enter' && document.activeElement?.classList.contains('tab-card')) {
      event.preventDefault();
      const tabId = Number((document.activeElement as HTMLElement).dataset.tabId);
      if (Number.isInteger(tabId)) {
        void openTab(tabId);
      }
      return;
    }

    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      const activeCard = document.activeElement?.classList.contains('tab-card');
      if (activeCard) {
        event.preventDefault();
        moveSelection(event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1);
      }
    }
  });

  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.windowId === state.sourceWindowId) scheduleRefresh();
  });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    const interestingChange =
      'url' in changeInfo ||
      'pendingUrl' in changeInfo ||
      'title' in changeInfo ||
      'favIconUrl' in changeInfo ||
      'status' in changeInfo ||
      'audible' in changeInfo ||
      'mutedInfo' in changeInfo ||
      'pinned' in changeInfo ||
      'discarded' in changeInfo ||
      'frozen' in changeInfo;

    if (tab.windowId === state.sourceWindowId && interestingChange) {
      scheduleRefresh();
    }
  });

  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (removeInfo.windowId === state.sourceWindowId) {
      if (state.originTabId === tabId) state.originTabId = undefined;
      scheduleRefresh();
    }
  });

  chrome.tabs.onMoved.addListener((_tabId, moveInfo) => {
    if (moveInfo.windowId === state.sourceWindowId) scheduleRefresh();
  });

  chrome.tabs.onAttached.addListener((_tabId, attachInfo) => {
    if (attachInfo.newWindowId === state.sourceWindowId) scheduleRefresh();
  });

  chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
    if (detachInfo.oldWindowId === state.sourceWindowId) {
      if (state.originTabId === tabId) state.originTabId = undefined;
      scheduleRefresh();
    }
  });

  chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    if (orderedTabs.some((tab) => tab.id === removedTabId)) {
      scheduleRefresh();
      return;
    }

    void chrome.tabs
      .get(addedTabId)
      .then((tab) => {
        if (tab.windowId === state.sourceWindowId) scheduleRefresh();
      })
      .catch(() => undefined);
  });

  if (chrome.readingList) {
    chrome.readingList.onEntryAdded.addListener((entry) => {
      readingListUrls.add(entry.url);
      render();
    });

    chrome.readingList.onEntryRemoved.addListener((entry) => {
      readingListUrls.delete(entry.url);
      render();
    });

    chrome.readingList.onEntryUpdated.addListener((entry) => {
      readingListUrls.add(entry.url);
      render();
    });
  }
}

function scheduleRefresh(): void {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    void refreshTabs();
  }, 80);
}

async function refreshReadingList(): Promise<void> {
  if (!chrome.readingList) return;

  try {
    const entries = await chrome.readingList.query({});
    readingListUrls = new Set(entries.map((entry) => entry.url));
  } catch {
    setStatus('Tab Eagle could not read the Chrome Reading List.');
  }
}

async function refreshTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ windowId: state.sourceWindowId });
  const eagleBaseUrl = getEagleBaseUrl();

  managedTabs = tabs
    .filter((tab) => tab.id !== state.selfTabId)
    .filter((tab) => !isEagleUrl(tab.url, eagleBaseUrl) && !isEagleUrl(tab.pendingUrl, eagleBaseUrl))
    .map(toManagedTab)
    .filter((tab): tab is ManagedTab => Boolean(tab));

  orderedTabs = sortTabs(managedTabs, state.sortMode);

  if (state.originTabId && !orderedTabs.some((tab) => tab.id === state.originTabId)) {
    state.originTabId = undefined;
  }

  render();
}

async function setSortMode(sortMode: SortMode): Promise<void> {
  state.sortMode = sortMode;
  await chrome.storage.local.set({ [SORT_STORAGE_KEY]: sortMode });
  orderedTabs = sortTabs(managedTabs, state.sortMode);
  syncSortControl();
  render();
}

function syncSortControl(): void {
  sortButtons.forEach((button) => {
    const selected =
      button.dataset.sort === state.sortMode ||
      (button.dataset.sort === 'recent' && state.sortMode === 'leastRecent');
    (button as HTMLElement & { selected: boolean }).selected = selected;
    button.toggleAttribute('selected', selected);

    if (button.dataset.sort === 'recent') {
      const label =
        state.sortMode === 'leastRecent' ? 'Recent ↑' : state.sortMode === 'recent' ? 'Recent ↓' : 'Recent';
      const ariaLabel =
        state.sortMode === 'leastRecent'
          ? 'Recent sort, oldest first'
          : state.sortMode === 'recent'
            ? 'Recent sort, newest first'
            : 'Sort by recent activity';
      (button as HTMLElement & { label: string }).label = label;
      button.setAttribute('aria-label', ariaLabel);
    }
  });
}

function isSortMode(value: unknown): value is SortMode {
  return value === 'position' || value === 'domain' || value === 'recent' || value === 'leastRecent';
}

function render(): void {
  grid.replaceChildren();
  tabCount.textContent = `${orderedTabs.length} ${orderedTabs.length === 1 ? 'tab' : 'tabs'}`;
  returnOriginButton.toggleAttribute('disabled', !state.originTabId);

  if (orderedTabs.length === 0 && closeReserveSlots === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <h2>No tabs to manage</h2>
      <p>Tab Eagle is the only tab left in this window.</p>
      <md-filled-button id="close-empty" type="button">Close Tab Eagle</md-filled-button>
    `;
    grid.append(empty);
    empty.querySelector('#close-empty')?.addEventListener('click', () => {
      void closeSelf();
    });
    return;
  }

  for (const tab of orderedTabs) {
    if (state.sortMode === 'domain') {
      void ensureDomainColor(tab);
    }

    grid.append(createTabCard(tab));
  }

  for (let index = 0; index < closeReserveSlots; index += 1) {
    grid.append(createGridReserveSlot());
  }
}

function createTabCard(tab: ManagedTab): HTMLElement {
  const card = document.createElement('article');
  const origin = tab.id === state.originTabId;
  const pending = state.pendingTabIds.has(tab.id);
  const readingListUrl = toReadingListUrl(tab);
  const readingListPending = readingListPendingTabIds.has(tab.id);
  const isInReadingList = Boolean(readingListUrl && readingListUrls.has(readingListUrl));
  const showReadingListButton = !tab.pinned;
  const canAddToReadingList = Boolean(
    showReadingListButton && chrome.readingList && readingListUrl && !isInReadingList && !readingListPending
  );
  const readingListLabel = isInReadingList ? 'In Reading List' : readingListPending ? 'Adding...' : 'Read later';

  card.className = 'tab-card';
  card.role = 'gridcell';
  card.tabIndex = 0;
  card.dataset.tabId = String(tab.id);
  card.classList.toggle('is-origin', origin);
  card.classList.toggle('is-pending', pending);
  applyDomainCardColors(card, tab);
  applyAgeCardColors(card, tab);

  const favicon = faviconMarkup(tab);

  const metadata = [
    origin ? metadataItem('origin', 'Origin') : '',
    tab.pinned ? metadataItem('pinned', 'Pinned') : '',
    tab.audible ? metadataItem('audio', 'Audio') : '',
    tab.muted ? metadataItem('muted', 'Muted') : ''
  ].join('');

  card.innerHTML = `
    <md-ripple></md-ripple>
    <md-icon-button class="close-button" type="button" aria-label="Close tab: ${escapeAttribute(tab.title)}" ${pending ? 'disabled' : ''}>
      ${closeIconSvg()}
    </md-icon-button>
    <div class="card-content">
      ${favicon}
      <div class="tab-copy">
        <div class="domain">${escapeHtml(tab.domain)}</div>
        <h2>${escapeHtml(tab.title)}</h2>
        <div class="last-accessed">${escapeHtml(formatLastAccessed(tab.lastAccessed))}</div>
      </div>
    </div>
    <div class="card-footer">
      <div class="tab-meta" aria-label="Tab status">${metadata}</div>
      ${showReadingListButton ? readingListButton(tab, readingListLabel, canAddToReadingList) : ''}
    </div>
  `;

  card.addEventListener('click', () => {
    void openTab(tab.id);
  });

  card.querySelector<HTMLElement>('.close-button')?.addEventListener('click', (event) => {
    event.stopPropagation();
    isPointerInsideGrid = true;
    void closeManagedTab(tab.id);
  });

  card.querySelector<HTMLElement>('.reading-list-button')?.addEventListener('click', (event) => {
    event.stopPropagation();
    void addTabToReadingList(tab.id);
  });

  bindFaviconFallback(card);

  return card;
}

function applyDomainCardColors(card: HTMLElement, tab: ManagedTab): void {
  if (state.sortMode !== 'domain') return;

  const colors = domainColorCache.get(tab.domain);
  if (!colors) return;

  card.classList.add('is-domain-colored');
  card.style.setProperty('--domain-card-container', colors.container);
  card.style.setProperty('--domain-card-on-container', colors.onContainer);
  card.style.setProperty('--domain-card-outline', colors.outline);
  card.style.setProperty('--domain-card-primary', colors.primary);
}

function applyAgeCardColors(card: HTMLElement, tab: ManagedTab): void {
  if (!isAgeSortMode(state.sortMode)) return;

  const bucket = ageBucketForLastAccessed(tab.lastAccessed);
  if (!bucket) return;

  const colors = colorsForAgeBucket(bucket);
  card.classList.add('is-age-colored');
  card.style.setProperty('--age-card-container', colors.container);
  card.style.setProperty('--age-card-on-container', colors.onContainer);
  card.style.setProperty('--age-card-outline', colors.outline);
  card.style.setProperty('--age-card-primary', colors.primary);
}

async function ensureDomainColor(tab: ManagedTab): Promise<void> {
  if (domainColorCache.has(tab.domain) || domainColorRequests.has(tab.domain)) return;

  const pageUrl = toReadingListUrl(tab);
  if (!pageUrl) {
    domainColorCache.set(tab.domain, null);
    return;
  }

  domainColorRequests.add(tab.domain);

  try {
    const image = await loadImage(faviconUrlForPageUrl(pageUrl));
    domainColorCache.set(tab.domain, await colorsFromImage(image));
  } catch {
    domainColorCache.set(tab.domain, null);
  } finally {
    domainColorRequests.delete(tab.domain);
  }

  if (state.sortMode === 'domain' && orderedTabs.some((item) => item.domain === tab.domain)) {
    render();
  }
}

function faviconMarkup(tab: ManagedTab): string {
  const fallback = `
    <div class="favicon fallback${tab.favIconUrl ? ' is-hidden' : ''}" aria-hidden="true">
      ${escapeHtml(tab.domain[0]?.toUpperCase() ?? '?')}
    </div>
  `;

  return `
    <div class="favicon-frame">
      ${
        tab.favIconUrl
          ? `<img class="favicon favicon-image" src="${escapeAttribute(tab.favIconUrl)}" alt="" loading="lazy" />`
          : ''
      }
      ${fallback}
    </div>
  `;
}

function bindFaviconFallback(card: HTMLElement): void {
  const image = card.querySelector<HTMLImageElement>('.favicon-image');
  const fallback = card.querySelector<HTMLElement>('.favicon.fallback');
  if (!image || !fallback) return;

  const showFallback = () => {
    image.remove();
    fallback.classList.remove('is-hidden');
  };

  image.addEventListener('error', showFallback, { once: true });

  if (image.complete && image.naturalWidth === 0) {
    showFallback();
  }
}

function readingListButton(tab: ManagedTab, label: string, enabled: boolean): string {
  const ariaLabel = label === 'Read later' ? `Add to Reading List: ${tab.title}` : `${label}: ${tab.title}`;

  return `
    <md-text-button
      class="reading-list-button"
      type="button"
      aria-label="${escapeAttribute(ariaLabel)}"
      ${enabled ? '' : 'disabled'}
    >
      ${readingListIconSvg()}
      ${escapeHtml(label)}
    </md-text-button>
  `;
}

function createGridReserveSlot(): HTMLElement {
  const reserve = document.createElement('div');
  reserve.className = 'tab-card-reserve';
  reserve.setAttribute('aria-hidden', 'true');
  return reserve;
}

function metadataItem(icon: Parameters<typeof statusIconSvg>[0], label: string): string {
  return `
    <span class="tab-meta-item">
      ${statusIconSvg(icon)}
      <span>${label}</span>
    </span>
  `;
}

function formatLastAccessed(lastAccessed: number | undefined, now = Date.now()): string {
  if (typeof lastAccessed !== 'number') {
    return 'Last used unknown';
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - lastAccessed) / 1000));

  if (elapsedSeconds < 60) {
    return 'Last used just now';
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `Last used ${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `Last used ${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) {
    return `Last used ${elapsedDays}d ago`;
  }

  if (elapsedDays < 365) {
    const elapsedMonths = Math.floor(elapsedDays / 30);
    return `Last used ${elapsedMonths}mo ago`;
  }

  const elapsedYears = Math.floor(elapsedDays / 365);
  return `Last used ${elapsedYears}y ago`;
}

function moveSelection(delta: number): void {
  if (orderedTabs.length === 0) return;

  const activeTabId = Number((document.activeElement as HTMLElement | null)?.dataset.tabId);
  const currentIndex = orderedTabs.findIndex((tab) => tab.id === activeTabId);
  const nextIndex = Math.min(Math.max((currentIndex < 0 ? 0 : currentIndex) + delta, 0), orderedTabs.length - 1);
  const nextTabId = orderedTabs[nextIndex]?.id;
  const nextCard = grid.querySelector<HTMLElement>(`.tab-card[data-tab-id="${nextTabId}"]`);
  nextCard?.focus();
}

async function addTabToReadingList(tabId: number): Promise<void> {
  if (readingListPendingTabIds.has(tabId)) return;

  const tab = managedTabs.find((item) => item.id === tabId);
  const url = tab ? toReadingListUrl(tab) : undefined;

  if (!tab || !url) {
    setStatus('Only normal web pages can be added to the Reading List.');
    return;
  }

  if (!chrome.readingList) {
    setStatus('Chrome Reading List is not available in this browser.');
    return;
  }

  readingListPendingTabIds.add(tabId);
  render();

  try {
    const existingEntries = await chrome.readingList.query({ url });

    if (existingEntries.length > 0) {
      readingListUrls.add(url);
      setStatus('That tab is already in the Reading List.');
      return;
    }

    await chrome.readingList.addEntry({
      title: tab.title,
      url,
      hasBeenRead: false
    });
    readingListUrls.add(url);
    setStatus('Added to Reading List.');
  } catch {
    setStatus('Tab Eagle could not add that tab to the Reading List.');
  } finally {
    readingListPendingTabIds.delete(tabId);
    render();
  }
}

async function closeManagedTab(tabId: number): Promise<void> {
  if (state.pendingTabIds.has(tabId)) return;

  reserveGridSlot();
  state.pendingTabIds.add(tabId);

  managedTabs = managedTabs.filter((tab) => tab.id !== tabId);
  orderedTabs = sortTabs(managedTabs, state.sortMode);

  if (state.originTabId === tabId) {
    state.originTabId = undefined;
  }

  render();

  try {
    await chrome.tabs.remove(tabId);
  } catch {
    releaseGridSlot();
    setStatus('That tab was already gone. Refreshing Tab Eagle.');
  } finally {
    state.pendingTabIds.delete(tabId);
    await refreshTabs();
  }
}

function reserveGridSlot(): void {
  closeReserveSlots += 1;
  scheduleReserveRelease();
}

function releaseGridSlot(): void {
  closeReserveSlots = Math.max(0, closeReserveSlots - 1);
  scheduleReserveRelease();
}

function scheduleReserveRelease(): void {
  window.clearTimeout(closeReserveTimer);

  if (closeReserveSlots === 0) {
    render();
    return;
  }

  closeReserveTimer = window.setTimeout(() => {
    if (isPointerInsideGrid) {
      scheduleReserveRelease();
      return;
    }

    clearGridReserveSlots();
  }, CLOSE_RESERVE_TIMEOUT_MS);
}

function clearGridReserveSlots(): void {
  window.clearTimeout(closeReserveTimer);

  if (closeReserveSlots > 0) {
    closeReserveSlots = 0;
    render();
  }
}

async function openTab(tabId: number): Promise<void> {
  if (state.pendingTabIds.has(tabId)) return;

  state.pendingTabIds.add(tabId);
  render();

  try {
    await chrome.tabs.update(tabId, { active: true });
    state.pendingTabIds.delete(tabId);
    await refreshTabs();
  } catch {
    setStatus('That tab is no longer available.');
    state.pendingTabIds.delete(tabId);
    await refreshTabs();
  }
}

async function returnToOrigin(): Promise<void> {
  if (!state.originTabId) {
    setStatus('The origin tab is no longer available.');
    return;
  }

  try {
    await chrome.tabs.update(state.originTabId, { active: true });
  } catch {
    setStatus('The origin tab is no longer available.');
    state.originTabId = undefined;
    await refreshTabs();
  }
}

async function closeSelf(): Promise<void> {
  if (state.selfTabId) {
    await chrome.tabs.remove(state.selfTabId);
  }
}

function setStatus(message: string): void {
  statusEl.textContent = message;
  if (message) {
    window.setTimeout(() => {
      if (statusEl.textContent === message) statusEl.textContent = '';
    }, 3500);
  }
}

function numberFromParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#039;';
    }
  });
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
