import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/labs/segmentedbutton/outlined-segmented-button.js';
import '@material/web/labs/segmentedbuttonset/outlined-segmented-button-set.js';
import '@material/web/ripple/ripple.js';
import '@material/web/slider/slider.js';
import '@material/web/textfield/outlined-text-field.js';
import './styles.css';

import type { EagleReopenMessage, EagleState, ManagedTab, ManagedWindow, SortMode } from '../shared/types';
import { getEagleBaseUrl, isEagleUrl } from '../shared/urls';
import { ageBucketForLastAccessed, colorsForAgeBucket, isAgeSortMode, type ThemeMode } from './age-colors';
import { colorsFromImage, faviconUrlForPageUrl, loadImage, type DomainCardColors } from './domain-colors';
import { closeIconSvg, readingListIconSvg, statusIconSvg } from './icons';
import { nextSelectedTabId, reconcileSelectedTabId, type SearchNavigationKey } from './search-selection';
import { filterTabsBySearch, nextSortMode, sortTabs, toManagedTab, toReadingListUrl } from './tab-model';
import { layoutWindows, moveIndexBefore, reconcileWindowLayout, type WindowLayout } from './window-layout';

const SORT_STORAGE_KEY = 'sortMode';
const WINDOW_NAMES_STORAGE_KEY = 'windowNames';
const MIN_ZOOM = 0.22;
const MAX_ZOOM = 1.45;
const DETAIL_FADE_IN_ZOOM = 0.72;
const DETAIL_FADE_OUT_ZOOM = 0.62;
const CLOSE_PLACEHOLDER_TIMEOUT_MS = 2200;

type WindowNames = Record<string, string>;

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

interface PanAnchor {
  clientX: number;
  clientY: number;
  panX: number;
  panY: number;
}

interface DragState {
  tabId: number;
  sourceWindowId: number;
  overWindowId?: number;
  beforeTabId?: number;
}

let state: EagleState;
let managedWindows: ManagedWindow[] = [];
let managedTabs: ManagedTab[] = [];
let orderedTabs: ManagedTab[] = [];
let windowNames: WindowNames = {};
let currentLayout: WindowLayout = layoutWindows([]);
let searchQuery = '';
let refreshTimer: number | undefined;
let selectedTabId: number | undefined;
let readingListUrls = new Set<string>();
let readingListPendingTabIds = new Set<number>();
let view: ViewState = { zoom: 0.6, panX: 0, panY: 0 };
let panAnchor: PanAnchor | undefined;
let dragState: DragState | undefined;
let hasInitialView = false;
let windowDetailsVisible = false;
const closingTabPlaceholders = new Map<number, ManagedTab>();
const closingTabTimers = new Map<number, number>();
const domainColorCache = new Map<string, DomainCardColors | null>();
const domainColorRequests = new Set<string>();
const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

const viewport = requiredElement<HTMLElement>('#viewport');
const world = requiredElement<HTMLElement>('#world');
const windowMap = requiredElement<HTMLElement>('#window-map');
const tabCount = requiredElement<HTMLElement>('#tab-count');
const statusEl = requiredElement<HTMLElement>('#status');
const overviewStats = requiredElement<HTMLElement>('#overview-stats');
const returnOriginButton = requiredElement<HTMLElement>('#return-origin');
const searchInput = requiredElement<HTMLElement & { value: string }>('#tab-search');
const searchResults = requiredElement<HTMLElement>('#search-results');
const zoomSlider = requiredElement<HTMLElement & { value: number }>('#zoom-slider');
const zoomLabel = requiredElement<HTMLElement>('#zoom-label');
const dragBanner = requiredElement<HTMLElement>('#drag-banner');
const dragTitle = requiredElement<HTMLElement>('#drag-title');
const skyHint = requiredElement<HTMLElement>('#sky-hint');
const sortButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-sort]'));

void init();

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Tab Eagle failed to initialize: missing ${selector}.`);
  return element;
}

async function init(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const currentTab = await chrome.tabs.getCurrent();
  const selfTabId = currentTab?.id;
  const sourceTabId = numberFromParam(params.get('sourceTabId'));
  const sourceWindowId = numberFromParam(params.get('sourceWindowId')) ?? currentTab?.windowId;

  if (typeof sourceWindowId !== 'number') {
    setStatus('Tab Eagle could not determine which window opened it.');
    return;
  }

  const [stored, storedSession] = await Promise.all([
    chrome.storage.local.get({ [SORT_STORAGE_KEY]: 'position' }),
    chrome.storage.session.get({ [WINDOW_NAMES_STORAGE_KEY]: {} })
  ]);
  const storedSortMode = stored[SORT_STORAGE_KEY];

  state = {
    sourceWindowId,
    selfTabId,
    originTabId: sourceTabId === selfTabId ? undefined : sourceTabId,
    sortMode: isSortMode(storedSortMode) ? storedSortMode : 'position',
    pendingTabIds: new Set()
  };
  windowNames = toWindowNames(storedSession[WINDOW_NAMES_STORAGE_KEY]);

  bindEvents();
  syncSortControl();
  await refreshReadingList();
  await refreshTabs();
}

function bindEvents(): void {
  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const requested = button.dataset.sort;
      if (isSortMode(requested)) void setSortMode(nextSortMode(state.sortMode, requested));
    });
  });

  requiredElement<HTMLElement>('#fit-brand').addEventListener('click', fitAll);
  requiredElement<HTMLElement>('#fit-all').addEventListener('click', fitAll);
  requiredElement<HTMLElement>('#zoom-out').addEventListener('click', () => zoomAt(view.zoom - 0.14));
  requiredElement<HTMLElement>('#zoom-in').addEventListener('click', () => zoomAt(view.zoom + 0.14));
  zoomSlider.addEventListener('input', () => zoomAt(Number(zoomSlider.value)));
  returnOriginButton.addEventListener('click', () => void returnToOrigin());

  searchInput.addEventListener('input', () => setSearchQuery(searchInput.value));
  searchInput.addEventListener('focus', () => renderSearchResults());
  document.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof Node) || searchInput.contains(event.target) || searchResults.contains(event.target)) return;
    searchResults.hidden = true;
  });

  viewport.addEventListener('wheel', handleWheel, { passive: false });
  viewport.addEventListener('pointerdown', beginPan);
  viewport.addEventListener('pointermove', movePan);
  viewport.addEventListener('pointerup', endPan);
  viewport.addEventListener('pointercancel', endPan);
  window.addEventListener('resize', applyView);

  document.addEventListener('keydown', handleKeydown);

  chrome.tabs.onCreated.addListener(scheduleRefresh);
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
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
    if (interestingChange) scheduleRefresh();
  });
  chrome.tabs.onRemoved.addListener((tabId) => {
    if (state.originTabId === tabId) state.originTabId = undefined;
    scheduleRefresh();
  });
  chrome.tabs.onMoved.addListener(scheduleRefresh);
  chrome.tabs.onAttached.addListener(scheduleRefresh);
  chrome.tabs.onDetached.addListener((tabId) => {
    if (state.originTabId === tabId) state.originTabId = undefined;
    scheduleRefresh();
  });
  chrome.tabs.onReplaced.addListener(scheduleRefresh);
  chrome.windows.onCreated.addListener(scheduleRefresh);
  chrome.windows.onRemoved.addListener(scheduleRefresh);
  chrome.windows.onFocusChanged.addListener(scheduleRefresh);

  colorSchemeQuery.addEventListener('change', () => {
    domainColorCache.clear();
    domainColorRequests.clear();
    render();
  });

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isReopenMessage(message) || message.sourceWindowId !== state.sourceWindowId) return;
    state.originTabId = message.sourceTabId === state.selfTabId ? undefined : message.sourceTabId;
    setSearchQuery('');
    void refreshTabs().then(() => zoomToWindow(state.sourceWindowId));
    sendResponse(true);
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

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && dragState) {
    event.preventDefault();
    clearDragState();
    return;
  }
  if (event.key === 'Escape' && searchQuery) {
    event.preventDefault();
    setSearchQuery('');
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    void returnToOrigin();
    return;
  }
  if (event.key === 'Enter' && !isCommandTarget(event.target)) {
    event.preventDefault();
    if (typeof selectedTabId === 'number') void openTab(selectedTabId);
    return;
  }
  if (isSearchNavigationKey(event.key) && !isCommandTarget(event.target)) {
    event.preventDefault();
    moveSelection(event.key);
    return;
  }
  if (isSearchKeystroke(event)) {
    event.preventDefault();
    setSearchQuery(searchQuery + event.key);
    focusSearchInput();
    return;
  }
  if (event.key === 'Backspace' && searchQuery && !isEditableTarget(event.target)) {
    event.preventDefault();
    setSearchQuery(searchQuery.slice(0, -1));
    focusSearchInput();
  }
}

function scheduleRefresh(): void {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => void refreshTabs(), 80);
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
  const chromeWindows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  const eagleBaseUrl = getEagleBaseUrl();

  managedWindows = chromeWindows
    .filter((windowItem): windowItem is chrome.windows.Window & { id: number } => typeof windowItem.id === 'number')
    .map((windowItem) => ({
      id: windowItem.id,
      focused: Boolean(windowItem.focused),
      incognito: Boolean(windowItem.incognito),
      tabs: (windowItem.tabs ?? [])
        .filter((tab) => tab.id !== state.selfTabId)
        .filter((tab) => !isEagleUrl(tab.url, eagleBaseUrl) && !isEagleUrl(tab.pendingUrl, eagleBaseUrl))
        .map(toManagedTab)
        .filter((tab): tab is ManagedTab => Boolean(tab))
    }))
    .sort((left, right) => {
      if (left.id === state.sourceWindowId) return -1;
      if (right.id === state.sourceWindowId) return 1;
      if (left.focused !== right.focused) return Number(right.focused) - Number(left.focused);
      return left.id - right.id;
    });

  managedTabs = managedWindows.flatMap((windowItem) => windowItem.tabs);
  rebuildOrderedTabs();
  recalculateLayout();

  if (state.originTabId && !managedTabs.some((tab) => tab.id === state.originTabId)) state.originTabId = undefined;
  render();

  if (!hasInitialView) {
    hasInitialView = true;
    window.requestAnimationFrame(() => zoomToWindow(state.sourceWindowId));
  }
}

function rebuildOrderedTabs(): void {
  orderedTabs = managedWindows.flatMap((windowItem) => sortTabs(windowItem.tabs, state.sortMode));
}

function recalculateLayout(): void {
  currentLayout = reconcileWindowLayout(
    managedWindows.map((windowItem) => ({ ...windowItem, tabs: displayedTabsForWindow(windowItem) })),
    currentLayout
  );
}

function displayedTabsForWindow(windowItem: ManagedWindow): ManagedTab[] {
  const existingIds = new Set(windowItem.tabs.map((tab) => tab.id));
  const placeholders = [...closingTabPlaceholders.values()].filter(
    (tab) => tab.windowId === windowItem.id && !existingIds.has(tab.id)
  );
  return [...windowItem.tabs, ...placeholders];
}

async function setSortMode(sortMode: SortMode): Promise<void> {
  state.sortMode = sortMode;
  await chrome.storage.local.set({ [SORT_STORAGE_KEY]: sortMode });
  rebuildOrderedTabs();
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
      const label = state.sortMode === 'leastRecent' ? 'Recent ↑' : state.sortMode === 'recent' ? 'Recent ↓' : 'Recent';
      (button as HTMLElement & { label: string }).label = label;
    }
  });
}

function render(): void {
  const matchingTabs = filterTabsBySearch(orderedTabs, searchQuery);
  const matchingIds = new Set(matchingTabs.map((tab) => tab.id));
  selectedTabId = reconcileSelectedTabId(matchingTabs, selectedTabId);

  world.style.width = `${currentLayout.width}px`;
  world.style.height = `${currentLayout.height}px`;
  windowMap.replaceChildren();
  tabCount.textContent = countLabel(matchingTabs.length, managedTabs.length, managedWindows.length);
  returnOriginButton.toggleAttribute('disabled', !state.originTabId);
  returnOriginButton.toggleAttribute('hidden', !state.originTabId);
  overviewStats.innerHTML = `<span><i class="live-dot"></i>${managedWindows.length} ${managedWindows.length === 1 ? 'window' : 'windows'}</span><span>${managedTabs.length} tabs</span>`;

  if (managedWindows.length === 0 || managedTabs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<h2>No tabs to manage</h2><p>Tab Eagle could not find another open tab.</p><md-filled-button id="close-empty" type="button">Close Tab Eagle</md-filled-button>`;
    empty.querySelector('#close-empty')?.addEventListener('click', () => void closeSelf());
    windowMap.append(empty);
  } else {
    managedWindows.forEach((windowItem, index) => {
      const layoutItem = currentLayout.items.find((item) => item.windowId === windowItem.id);
      if (layoutItem) windowMap.append(createWindowCard(windowItem, index, layoutItem, matchingIds));
    });
  }

  renderSearchResults();
}

function createWindowCard(
  windowItem: ManagedWindow,
  windowIndex: number,
  layoutItem: WindowLayout['items'][number],
  matchingIds: Set<number>
): HTMLElement {
  const orderedWindowTabs = sortTabs(displayedTabsForWindow(windowItem), state.sortMode);
  const matchCount = windowItem.tabs.filter((tab) => matchingIds.has(tab.id)).length;
  const title = windowTitle(windowItem, windowIndex);
  const card = document.createElement('article');
  card.className = 'browser-window';
  card.dataset.windowId = String(windowItem.id);
  card.classList.toggle('is-source-window', windowItem.id === state.sourceWindowId);
  card.classList.toggle('is-focused-window', windowItem.focused);
  card.classList.toggle('is-search-dimmed', Boolean(searchQuery) && matchCount === 0);
  card.style.left = `${layoutItem.x}px`;
  card.style.top = `${layoutItem.y}px`;
  card.style.width = `${layoutItem.width}px`;
  card.style.height = `${layoutItem.height}px`;
  card.innerHTML = `
    <div class="window-chrome">
      <div class="window-dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="window-title-area">
        <md-text-button class="window-title-button" type="button" aria-label="Rename ${escapeAttribute(title)}">${escapeHtml(title)} <span class="rename-glyph">✎</span></md-text-button>
        ${windowItem.id === state.sourceWindowId ? '<em class="current-window-badge">Current</em>' : ''}
      </div>
      <span class="window-count">${searchQuery ? `${matchCount} of ${windowItem.tabs.length}` : `${windowItem.tabs.length} tabs`}</span>
    </div>
    <div class="window-tab-grid" role="grid" aria-label="Tabs in ${escapeAttribute(title)}"></div>
    <div class="window-footer">
      <span>${sortModeLabel(state.sortMode)}</span>
      <md-text-button class="zoom-window-button" type="button">Zoom to window</md-text-button>
    </div>
    <div class="window-drop-hint">Drop at end of ${escapeHtml(title)}</div>
  `;

  const tabGrid = requiredChild<HTMLElement>(card, '.window-tab-grid');
  orderedWindowTabs.forEach((tab) => {
    if (state.sortMode === 'domain') void ensureDomainColor(tab);
    tabGrid.append(createTabCard(tab, matchingIds));
  });

  requiredChild<HTMLElement>(card, '.window-title-button').addEventListener('click', (event) => {
    event.stopPropagation();
    beginWindowRename(windowItem, windowIndex, card);
  });
  requiredChild<HTMLElement>(card, '.zoom-window-button').addEventListener('click', () => zoomToWindow(windowItem.id));
  card.addEventListener('dblclick', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('md-icon-button, md-text-button, md-outlined-text-field')) {
      zoomToWindow(windowItem.id);
    }
  });
  card.addEventListener('dragover', (event) => {
    if (!dragState || (event.target instanceof Element && event.target.closest('.tab-card'))) return;
    event.preventDefault();
    markDropTarget(windowItem.id);
  });
  card.addEventListener('drop', (event) => {
    if (!dragState || (event.target instanceof Element && event.target.closest('.tab-card'))) return;
    event.preventDefault();
    void moveDraggedTab(windowItem.id);
  });
  card.addEventListener('pointerleave', () => releaseClosingPlaceholders(windowItem.id));

  return card;
}

function createTabCard(tab: ManagedTab, matchingIds: Set<number>): HTMLElement {
  const card = document.createElement('article');
  const origin = tab.id === state.originTabId;
  const pending = state.pendingTabIds.has(tab.id);
  const selected = tab.id === selectedTabId;
  const readingListUrl = toReadingListUrl(tab);
  const readingListPending = readingListPendingTabIds.has(tab.id);
  const isInReadingList = Boolean(readingListUrl && readingListUrls.has(readingListUrl));
  const canReadLater = Boolean(!tab.pinned && chrome.readingList && readingListUrl && !isInReadingList && !readingListPending);
  const readLaterLabel = isInReadingList ? 'In Reading List' : readingListPending ? 'Adding to Reading List' : 'Add to Reading List';
  const statuses = [
    origin ? metadataItem('origin', 'Origin') : '',
    tab.pinned ? metadataItem('pinned', 'Pinned') : '',
    tab.audible ? metadataItem('audio', 'Audio') : '',
    tab.muted ? metadataItem('muted', 'Muted') : ''
  ].join('');

  card.className = 'tab-card';
  card.role = 'gridcell';
  card.tabIndex = 0;
  card.draggable = !pending;
  card.dataset.tabId = String(tab.id);
  card.dataset.windowId = String(tab.windowId);
  card.classList.toggle('is-origin', origin);
  card.classList.toggle('is-pending', pending);
  card.classList.toggle('is-selected', selected);
  card.classList.toggle('is-search-dimmed', Boolean(searchQuery) && !matchingIds.has(tab.id));
  card.setAttribute('aria-selected', String(selected));
  applyDomainCardColors(card, tab);
  applyAgeCardColors(card, tab);
  card.innerHTML = `
    <md-ripple></md-ripple>
    ${faviconMarkup(tab)}
    <div class="tab-copy">
      <h2>${escapeHtml(tab.title)}</h2>
      <div class="domain">${escapeHtml(tab.domain)}</div>
      <div class="tab-detail-line"><span>${escapeHtml(formatLastAccessed(tab.lastAccessed))}</span><span class="tab-statuses">${statuses}</span></div>
    </div>
    <div class="tab-card-actions">
      <md-icon-button class="reading-list-button${tab.pinned || !readingListUrl ? ' is-unavailable' : ''}" type="button" aria-label="${escapeAttribute(`${readLaterLabel}: ${tab.title}`)}" ${canReadLater ? '' : 'disabled'}>${readingListIconSvg()}</md-icon-button>
      <md-icon-button class="close-button" type="button" aria-label="Close tab: ${escapeAttribute(tab.title)}" ${pending ? 'disabled' : ''}>${closeIconSvg()}</md-icon-button>
    </div>
  `;

  card.addEventListener('click', () => {
    if (dragState) return;
    selectedTabId = tab.id;
    void openTab(tab.id);
  });
  card.addEventListener('focus', () => selectTabCard(tab.id));
  card.addEventListener('dragstart', (event) => beginTabDrag(event, tab));
  card.addEventListener('dragend', clearDragState);
  card.addEventListener('dragover', (event) => {
    if (!dragState || dragState.tabId === tab.id) return;
    event.preventDefault();
    event.stopPropagation();
    markDropTarget(tab.windowId, tab.id);
  });
  card.addEventListener('drop', (event) => {
    if (!dragState || dragState.tabId === tab.id) return;
    event.preventDefault();
    event.stopPropagation();
    void moveDraggedTab(tab.windowId, tab.id);
  });
  requiredChild<HTMLElement>(card, '.close-button').addEventListener('click', (event) => {
    event.stopPropagation();
    void closeManagedTab(tab.id);
  });
  requiredChild<HTMLElement>(card, '.reading-list-button').addEventListener('click', (event) => {
    event.stopPropagation();
    void addTabToReadingList(tab.id);
  });
  bindFaviconFallback(card);
  return card;
}

function requiredChild<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Tab Eagle failed to render: missing ${selector}.`);
  return element;
}

function renderSearchResults(): void {
  if (!searchQuery) {
    searchResults.hidden = true;
    searchResults.replaceChildren();
    return;
  }

  const matches = filterTabsBySearch(orderedTabs, searchQuery);
  searchResults.replaceChildren();
  searchResults.hidden = false;
  const heading = document.createElement('div');
  heading.className = 'result-heading';
  heading.textContent = `${matches.length} open ${matches.length === 1 ? 'tab' : 'tabs'} across all windows`;
  searchResults.append(heading);

  matches.slice(0, 8).forEach((tab) => {
    const button = document.createElement('button');
    const windowItem = managedWindows.find((item) => item.id === tab.windowId);
    const windowIndex = Math.max(0, managedWindows.findIndex((item) => item.id === tab.windowId));
    button.type = 'button';
    button.className = 'search-result';
    button.classList.toggle('is-selected', tab.id === selectedTabId);
    button.dataset.tabId = String(tab.id);
    button.setAttribute('aria-current', tab.id === selectedTabId ? 'true' : 'false');
    button.innerHTML = `${faviconMarkup(tab)}<span><strong>${escapeHtml(tab.title)}</strong><small>${escapeHtml(tab.domain)} · ${escapeHtml(windowItem ? windowTitle(windowItem, windowIndex) : 'Chrome window')}</small></span><i>↗</i>`;
    button.addEventListener('click', () => void openTab(tab.id));
    bindFaviconFallback(button);
    searchResults.append(button);
  });

  if (matches.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No open tab matches. Try a domain or a shorter phrase.';
    searchResults.append(empty);
  }
}

function beginTabDrag(event: DragEvent, tab: ManagedTab): void {
  if (!event.dataTransfer) return;
  event.stopPropagation();
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', tab.title);
  dragState = { tabId: tab.id, sourceWindowId: tab.windowId };
  document.body.classList.add('is-dragging');
  event.currentTarget instanceof HTMLElement && event.currentTarget.classList.add('is-drag-source');
  dragTitle.textContent = `Moving ${tab.title}`;
  dragBanner.hidden = false;
  skyHint.textContent = 'Arrange · drop onto a window or between tabs';
  fitAll();
}

function markDropTarget(windowId: number, beforeTabId?: number): void {
  if (!dragState) return;
  dragState.overWindowId = windowId;
  dragState.beforeTabId = beforeTabId;
  windowMap.querySelectorAll('.is-drop-target, .drop-before').forEach((element) => element.classList.remove('is-drop-target', 'drop-before'));
  windowMap.querySelector<HTMLElement>(`.browser-window[data-window-id="${windowId}"]`)?.classList.add('is-drop-target');
  if (typeof beforeTabId === 'number') {
    windowMap.querySelector<HTMLElement>(`.tab-card[data-tab-id="${beforeTabId}"]`)?.classList.add('drop-before');
  }
}

async function moveDraggedTab(targetWindowId: number, beforeTabId?: number): Promise<void> {
  if (!dragState) return;
  const sourceTab = managedTabs.find((tab) => tab.id === dragState?.tabId);
  const beforeTab = typeof beforeTabId === 'number' ? managedTabs.find((tab) => tab.id === beforeTabId) : undefined;
  if (!sourceTab || sourceTab.id === beforeTab?.id) {
    clearDragState();
    return;
  }

  const targetIndex = beforeTab
    ? moveIndexBefore(sourceTab.windowId, sourceTab.index, targetWindowId, beforeTab.index)
    : -1;
  const targetTitle = managedWindows.find((item) => item.id === targetWindowId);
  const targetWindowIndex = managedWindows.findIndex((item) => item.id === targetWindowId);
  clearDragState();

  try {
    await chrome.tabs.move(sourceTab.id, { windowId: targetWindowId, index: targetIndex });
    setStatus(`Moved “${sourceTab.title}” to ${targetTitle ? windowTitle(targetTitle, targetWindowIndex) : 'another window'}.`);
  } catch {
    setStatus('Chrome could not move that tab to the selected position.');
  } finally {
    await refreshTabs();
  }
}

function clearDragState(): void {
  dragState = undefined;
  document.body.classList.remove('is-dragging');
  dragBanner.hidden = true;
  skyHint.textContent = 'Same windows and tabs at every scale · scroll to zoom';
  windowMap.querySelectorAll('.is-drop-target, .drop-before, .is-drag-source').forEach((element) => element.classList.remove('is-drop-target', 'drop-before', 'is-drag-source'));
}

function beginWindowRename(windowItem: ManagedWindow, windowIndex: number, card: HTMLElement): void {
  const titleArea = requiredChild<HTMLElement>(card, '.window-title-area');
  const titleButton = requiredChild<HTMLElement>(titleArea, '.window-title-button');
  const field = document.createElement('md-outlined-text-field') as HTMLElement & { value: string };
  const originalTitle = windowTitle(windowItem, windowIndex);
  let cancelled = false;
  let finished = false;
  field.className = 'window-title-input';
  field.setAttribute('aria-label', `Rename ${originalTitle}`);
  field.setAttribute('maxlength', '48');
  field.value = originalTitle;
  titleButton.replaceWith(field);

  const finish = async (): Promise<void> => {
    if (finished) return;
    finished = true;
    const nextTitle = field.value.trim();
    if (!cancelled && nextTitle && nextTitle !== originalTitle) {
      windowNames[String(windowItem.id)] = nextTitle;
      await chrome.storage.session.set({ [WINDOW_NAMES_STORAGE_KEY]: windowNames });
      setStatus(`Renamed window to “${nextTitle}”.`);
    }
    render();
  };

  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') field.blur();
    if (event.key === 'Escape') {
      cancelled = true;
      field.blur();
    }
  });
  field.addEventListener('blur', () => void finish(), { once: true });
  window.requestAnimationFrame(() => field.focus());
}

function windowTitle(windowItem: ManagedWindow, windowIndex: number): string {
  const savedTitle = windowNames[String(windowItem.id)]?.trim();
  if (savedTitle) return savedTitle;
  const originTab = windowItem.tabs.find((tab) => tab.id === state.originTabId);
  const anchorTab = originTab ?? windowItem.tabs.find((tab) => tab.active) ?? windowItem.tabs[0];
  return anchorTab?.title ?? `Window ${windowIndex + 1}`;
}

function handleWheel(event: WheelEvent): void {
  if (event.target instanceof Element && event.target.closest('.zoom-control')) return;
  event.preventDefault();
  zoomAt(view.zoom * Math.exp(-event.deltaY * 0.0012), event.clientX, event.clientY);
}

function beginPan(event: PointerEvent): void {
  if (!(event.target instanceof Element) || event.target.closest('.browser-window, .zoom-control, .overview-stats, .status')) return;
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add('is-panning');
  panAnchor = { clientX: event.clientX, clientY: event.clientY, panX: view.panX, panY: view.panY };
}

function movePan(event: PointerEvent): void {
  if (!panAnchor) return;
  view.panX = panAnchor.panX + event.clientX - panAnchor.clientX;
  view.panY = panAnchor.panY + event.clientY - panAnchor.clientY;
  applyView();
}

function endPan(): void {
  panAnchor = undefined;
  viewport.classList.remove('is-panning');
}

function fitAll(): void {
  const rect = viewport.getBoundingClientRect();
  const nextZoom = clamp(
    Math.min((rect.width - 72) / currentLayout.width, (rect.height - 72) / currentLayout.height),
    MIN_ZOOM,
    0.82
  );
  view = {
    zoom: nextZoom,
    panX: (rect.width - currentLayout.width * nextZoom) / 2,
    panY: (rect.height - currentLayout.height * nextZoom) / 2
  };
  applyView();
}

function zoomToWindow(windowId: number): void {
  const item = currentLayout.items.find((candidate) => candidate.windowId === windowId);
  if (!item) return;
  const rect = viewport.getBoundingClientRect();
  const targetZoom = clamp(Math.min((rect.width - 120) / item.width, (rect.height - 110) / item.height), 0.76, 1.12);
  view = {
    zoom: targetZoom,
    panX: rect.width / 2 - (item.x + item.width / 2) * targetZoom,
    panY: rect.height / 2 - (item.y + item.height / 2) * targetZoom
  };
  applyView();
}

function zoomAt(nextZoom: number, clientX?: number, clientY?: number): void {
  const rect = viewport.getBoundingClientRect();
  const anchorX = (clientX ?? rect.left + rect.width / 2) - rect.left;
  const anchorY = (clientY ?? rect.top + rect.height / 2) - rect.top;
  const bounded = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  view.panX = anchorX - ((anchorX - view.panX) / view.zoom) * bounded;
  view.panY = anchorY - ((anchorY - view.panY) / view.zoom) * bounded;
  view.zoom = bounded;
  applyView();
}

function applyView(): void {
  world.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
  zoomSlider.value = view.zoom;
  zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`;
  updateDetailLevel();
}

function updateDetailLevel(): void {
  if (!windowDetailsVisible && view.zoom >= DETAIL_FADE_IN_ZOOM) windowDetailsVisible = true;
  if (windowDetailsVisible && view.zoom <= DETAIL_FADE_OUT_ZOOM) windowDetailsVisible = false;
  document.documentElement.dataset.detailLevel = windowDetailsVisible ? 'window' : 'overview';
}

function moveSelection(key: SearchNavigationKey): void {
  const visibleTabs = filterTabsBySearch(orderedTabs, searchQuery);
  if (visibleTabs.length === 0) return;
  const nextTabId = nextSelectedTabId(visibleTabs, selectedTabId, key, 1);
  if (typeof nextTabId !== 'number' || nextTabId === selectedTabId) return;
  selectedTabId = nextTabId;
  updateSelectedCardAttributes();
  updateSelectedSearchResultAttributes();
  scrollSelectedSearchResultIntoView();
}

function setSearchQuery(query: string): void {
  searchQuery = query;
  searchInput.value = query;
  selectedTabId = reconcileSelectedTabId(filterTabsBySearch(orderedTabs, searchQuery), selectedTabId, { resetToFirst: true });
  render();
}

function selectTabCard(tabId: number): void {
  if (selectedTabId === tabId) return;
  selectedTabId = tabId;
  updateSelectedCardAttributes();
}

function updateSelectedCardAttributes(): void {
  windowMap.querySelectorAll<HTMLElement>('.tab-card').forEach((card) => {
    const selected = Number(card.dataset.tabId) === selectedTabId;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-selected', String(selected));
  });
}

function updateSelectedSearchResultAttributes(): void {
  searchResults.querySelectorAll<HTMLElement>('.search-result').forEach((result) => {
    const selected = Number(result.dataset.tabId) === selectedTabId;
    result.classList.toggle('is-selected', selected);
    result.setAttribute('aria-current', selected ? 'true' : 'false');
  });
}

function scrollSelectedSearchResultIntoView(): void {
  window.requestAnimationFrame(() => {
    searchResults
      .querySelector<HTMLElement>(`.search-result[data-tab-id="${selectedTabId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  });
}

function focusSearchInput(): void {
  searchInput.focus();
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
    await chrome.readingList.addEntry({ title: tab.title, url, hasBeenRead: false });
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
  const tab = managedTabs.find((item) => item.id === tabId);
  if (!tab) return;

  closingTabPlaceholders.set(tabId, tab);
  state.pendingTabIds.add(tabId);
  render();
  try {
    await chrome.tabs.remove(tabId);
    scheduleClosingPlaceholderRelease(tab);
  } catch {
    releaseClosingPlaceholder(tabId);
    setStatus('That tab was already gone. Refreshing Tab Eagle.');
  } finally {
    await refreshTabs();
  }
}

function scheduleClosingPlaceholderRelease(tab: ManagedTab): void {
  window.clearTimeout(closingTabTimers.get(tab.id));
  closingTabTimers.set(
    tab.id,
    window.setTimeout(() => releaseClosingPlaceholder(tab.id), CLOSE_PLACEHOLDER_TIMEOUT_MS)
  );
}

function releaseClosingPlaceholders(windowId: number): void {
  const tabIds = [...closingTabPlaceholders.values()]
    .filter((tab) => tab.windowId === windowId)
    .map((tab) => tab.id);
  tabIds.forEach(releaseClosingPlaceholder);
}

function releaseClosingPlaceholder(tabId: number): void {
  window.clearTimeout(closingTabTimers.get(tabId));
  closingTabTimers.delete(tabId);
  if (!closingTabPlaceholders.delete(tabId)) return;
  state.pendingTabIds.delete(tabId);
  recalculateLayout();
  render();
}

async function openTab(tabId: number): Promise<void> {
  if (state.pendingTabIds.has(tabId)) return;
  const tab = managedTabs.find((item) => item.id === tabId);
  if (!tab) return;
  state.pendingTabIds.add(tabId);
  render();
  try {
    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } catch {
    setStatus('That tab is no longer available.');
  } finally {
    state.pendingTabIds.delete(tabId);
    await refreshTabs();
  }
}

async function returnToOrigin(): Promise<void> {
  if (!state.originTabId) {
    setStatus('The origin tab is no longer available.');
    return;
  }
  const origin = managedTabs.find((tab) => tab.id === state.originTabId);
  try {
    await chrome.tabs.update(state.originTabId, { active: true });
    if (origin) await chrome.windows.update(origin.windowId, { focused: true });
  } catch {
    setStatus('The origin tab is no longer available.');
    state.originTabId = undefined;
    await refreshTabs();
  }
}

async function closeSelf(): Promise<void> {
  if (state.selfTabId) await chrome.tabs.remove(state.selfTabId);
}

function applyDomainCardColors(card: HTMLElement, tab: ManagedTab): void {
  if (state.sortMode !== 'domain') return;
  const colors = domainColorCache.get(domainColorCacheKey(tab.domain));
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
  const colors = colorsForAgeBucket(bucket, currentThemeMode());
  card.classList.add('is-age-colored');
  card.style.setProperty('--age-card-container', colors.container);
  card.style.setProperty('--age-card-on-container', colors.onContainer);
  card.style.setProperty('--age-card-outline', colors.outline);
  card.style.setProperty('--age-card-primary', colors.primary);
}

async function ensureDomainColor(tab: ManagedTab): Promise<void> {
  const cacheKey = domainColorCacheKey(tab.domain);
  if (domainColorCache.has(cacheKey) || domainColorRequests.has(cacheKey)) return;
  const pageUrl = toReadingListUrl(tab);
  if (!pageUrl) {
    domainColorCache.set(cacheKey, null);
    return;
  }
  domainColorRequests.add(cacheKey);
  try {
    const image = await loadImage(faviconUrlForPageUrl(pageUrl));
    domainColorCache.set(cacheKey, await colorsFromImage(image, currentThemeMode()));
  } catch {
    domainColorCache.set(cacheKey, null);
  } finally {
    domainColorRequests.delete(cacheKey);
  }
  if (state.sortMode === 'domain' && managedTabs.some((item) => item.domain === tab.domain) && !dragState) render();
}

function currentThemeMode(): ThemeMode {
  return colorSchemeQuery.matches ? 'dark' : 'light';
}

function domainColorCacheKey(domain: string): string {
  return `${currentThemeMode()}:${domain}`;
}

function faviconMarkup(tab: ManagedTab): string {
  const fallback = `<div class="favicon fallback${tab.favIconUrl ? ' is-hidden' : ''}" aria-hidden="true">${escapeHtml(tab.domain[0]?.toUpperCase() ?? '?')}</div>`;
  return `<div class="favicon-frame">${tab.favIconUrl ? `<img class="favicon favicon-image" src="${escapeAttribute(tab.favIconUrl)}" alt="" loading="lazy" />` : ''}${fallback}</div>`;
}

function bindFaviconFallback(parent: ParentNode): void {
  parent.querySelectorAll<HTMLElement>('.favicon-frame').forEach((frame) => {
    const image = frame.querySelector<HTMLImageElement>('.favicon-image');
    const fallback = frame.querySelector<HTMLElement>('.favicon.fallback');
    if (!image || !fallback) return;
    const showFallback = () => {
      image.remove();
      fallback.classList.remove('is-hidden');
    };
    image.addEventListener('error', showFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) showFallback();
  });
}

function metadataItem(icon: Parameters<typeof statusIconSvg>[0], label: string): string {
  return `<span class="tab-meta-item" title="${escapeAttribute(label)}">${statusIconSvg(icon)}<span>${escapeHtml(label)}</span></span>`;
}

function formatLastAccessed(lastAccessed: number | undefined, now = Date.now()): string {
  if (typeof lastAccessed !== 'number') return 'Last used unknown';
  const minutes = Math.floor(Math.max(0, now - lastAccessed) / 60_000);
  if (minutes < 1) return 'Last used just now';
  if (minutes < 60) return `Last used ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last used ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Last used ${days}d ago`;
  const months = Math.floor(days / 30);
  if (days < 365) return `Last used ${months}mo ago`;
  return `Last used ${Math.floor(days / 365)}y ago`;
}

function setStatus(message: string): void {
  statusEl.textContent = message;
  statusEl.classList.toggle('is-visible', Boolean(message));
  if (message) {
    window.setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.textContent = '';
        statusEl.classList.remove('is-visible');
      }
    }, 4200);
  }
}

function countLabel(visibleCount: number, totalCount: number, windowCount: number): string {
  if (searchQuery) return `${visibleCount} of ${totalCount} tabs`;
  return `${totalCount} tabs · ${windowCount} ${windowCount === 1 ? 'window' : 'windows'}`;
}

function sortModeLabel(sortMode: SortMode): string {
  if (sortMode === 'domain') return 'Sorted by domain';
  if (sortMode === 'recent') return 'Newest activity first';
  if (sortMode === 'leastRecent') return 'Oldest activity first';
  return 'Chrome tab order';
}

function isReopenMessage(message: unknown): message is EagleReopenMessage {
  if (typeof message !== 'object' || message === null) return false;
  const candidate = message as Partial<EagleReopenMessage>;
  return candidate.type === 'tab-eagle-reopen' && typeof candidate.sourceTabId === 'number' && typeof candidate.sourceWindowId === 'number';
}

function isSortMode(value: unknown): value is SortMode {
  return value === 'position' || value === 'domain' || value === 'recent' || value === 'leastRecent';
}

function toWindowNames(value: unknown): WindowNames {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, title]) => [key, title.trim()])
      .filter(([, title]) => Boolean(title))
  );
}

function isSearchKeystroke(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditableTarget(event.target);
}

function isSearchNavigationKey(key: string): key is SearchNavigationKey {
  return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown';
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target === searchInput || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable || target.tagName.toLowerCase().includes('text-field');
}

function isCommandTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target === searchInput) return false;
  return Boolean(target.closest('button, md-icon-button, md-text-button, md-outlined-button, md-filled-button, md-outlined-segmented-button, md-slider'));
}

function numberFromParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#039;';
    }
  });
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
