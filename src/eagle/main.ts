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
import { getEagleBaseUrl, isEagleUrl, updateEagleSourceUrl } from '../shared/urls';
import { ageBucketForLastAccessed, colorsForAgeBucket, isAgeSortMode, type ThemeMode } from './age-colors';
import { browserSnapshotsEqual } from './browser-snapshot';
import {
  cameraForBounds,
  cameraForResize,
  detailVisibilityForZoom,
  easeOutCubic,
  interpolateCameraView,
  zoomAboutPoint,
  type CameraView,
  type WorldBounds
} from './camera';
import { colorsFromImage, faviconUrlForTab, loadImage, type DomainCardColors } from './domain-colors';
import { closeIconSvg, readingListIconSvg, statusIconSvg } from './icons';
import { navigationColumnCount, nextSelectedTabId, reconcileSelectedTabId, type SearchNavigationKey } from './search-selection';
import { filterTabsBySearch, nextSortMode, remapTabId, sortTabs, toManagedTab, toReadingListUrl } from './tab-model';
import {
  layoutWindows,
  moveIndexBefore,
  reconcileWindowLayout,
  replaceWindowIdInLayout,
  sortWindowsById,
  windowLayoutsEqual,
  type WindowLayout,
  type WindowLayoutItem
} from './window-layout';

const SORT_STORAGE_KEY = 'sortMode';
const WINDOW_NAMES_STORAGE_KEY = 'windowNames';
const WINDOW_LAYOUT_STORAGE_KEY = 'windowLayout';
const MIN_ZOOM = 0.22;
const MAX_ZOOM = 1.45;
const DETAIL_FADE_IN_ZOOM = 0.72;
const DETAIL_FADE_OUT_ZOOM = 0.62;
const SEARCH_FIT_PADDING = 72;
const CAMERA_ANIMATION_DURATION_MS = 420;
const NEW_WINDOW_PREVIEW_ID = -1;

type WindowNames = Record<string, string>;

interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PanAnchor {
  clientX: number;
  clientY: number;
  panX: number;
  panY: number;
}

interface DragState {
  tabId: number;
}

let state: EagleState;
let managedWindows: ManagedWindow[] = [];
let managedTabs: ManagedTab[] = [];
let orderedTabs: ManagedTab[] = [];
let windowNames: WindowNames = {};
let currentLayout: WindowLayout = layoutWindows([]);
let searchQuery = '';
let refreshTimer: number | undefined;
let refreshRequestId = 0;
let selectedTabId: number | undefined;
let readingListUrls = new Set<string>();
let readingListPendingTabIds = new Set<number>();
let view: CameraView = { zoom: 0.6, panX: 0, panY: 0 };
let panAnchor: PanAnchor | undefined;
let dragState: DragState | undefined;
let dragPreviewLayout: WindowLayout | undefined;
let renamingWindowId: number | undefined;
let renderPending = false;
let hasInitialView = false;
let windowDetailsVisible = false;
let searchFitFrame: number | undefined;
let cameraAnimationFrame: number | undefined;
let cameraHudFrame: number | undefined;
let viewportBounds: ViewportBounds = { left: 0, top: 0, width: 0, height: 0 };
const domainColorCache = new Map<string, DomainCardColors | null>();
const domainColorRequests = new Set<string>();
const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

performance.mark('tab-eagle:module-ready');

const viewport = requiredElement<HTMLElement>('#viewport');
const world = requiredElement<HTMLElement>('#world');
const windowMap = requiredElement<HTMLElement>('#window-map');
const statusEl = requiredElement<HTMLElement>('#status');
const overviewStats = requiredElement<HTMLElement>('#overview-stats');
const returnOriginButton = requiredElement<HTMLElement>('#return-origin');
const searchInput = requiredElement<HTMLElement & { value: string }>('#tab-search');
const searchResults = requiredElement<HTMLElement>('#search-results');
const zoomSlider = requiredElement<HTMLElement & { value: number }>('#zoom-slider');
const zoomLabel = requiredElement<HTMLElement>('#zoom-label');
const dragBanner = requiredElement<HTMLElement>('#drag-banner');
const dragTitle = requiredElement<HTMLElement>('#drag-title');
const dragInstruction = requiredElement<HTMLElement>('#drag-instruction');
const skyHint = requiredElement<HTMLElement>('#sky-hint');
const searchAnnouncement = requiredElement<HTMLElement>('#search-announcement');
const sortButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-sort]'));
const viewportResizeObserver = new ResizeObserver(handleViewportResize);

void init();

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Tab Eagle failed to initialize: missing ${selector}.`);
  return element;
}

async function init(): Promise<void> {
  performance.mark('tab-eagle:init-start');
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
    chrome.storage.session.get({ [WINDOW_NAMES_STORAGE_KEY]: {}, [WINDOW_LAYOUT_STORAGE_KEY]: undefined })
  ]);
  performance.mark('tab-eagle:storage-ready');
  const storedSortMode = stored[SORT_STORAGE_KEY];

  state = {
    sourceWindowId,
    selfTabId,
    originTabId: sourceTabId === selfTabId ? undefined : sourceTabId,
    sortMode: isSortMode(storedSortMode) ? storedSortMode : 'position',
    pendingTabIds: new Set()
  };
  windowNames = toWindowNames(storedSession[WINDOW_NAMES_STORAGE_KEY]);
  currentLayout = (storedSession[WINDOW_LAYOUT_STORAGE_KEY] as WindowLayout | undefined) ?? currentLayout;

  readViewportBounds();
  viewportResizeObserver.observe(viewport);
  bindEvents();
  renderCamera();
  syncSortControl();
  performance.mark('tab-eagle:reading-list-start');
  await refreshReadingList();
  performance.mark('tab-eagle:tabs-start');
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
    searchInput.setAttribute('aria-expanded', 'false');
  });

  viewport.addEventListener('wheel', handleWheel, { passive: false });
  viewport.addEventListener('pointerdown', beginPan);
  viewport.addEventListener('pointermove', movePan);
  viewport.addEventListener('pointerup', endPan);
  viewport.addEventListener('pointercancel', endPan);

  document.addEventListener('keydown', handleKeydown);

  chrome.tabs.onCreated.addListener(scheduleRefresh);
  chrome.tabs.onActivated.addListener((activeInfo) => {
    scheduleRefresh();
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === state.selfTabId) return;
    const interestingChange =
      'url' in changeInfo ||
      'pendingUrl' in changeInfo ||
      'title' in changeInfo ||
      'favIconUrl' in changeInfo ||
      'audible' in changeInfo ||
      'mutedInfo' in changeInfo ||
      'pinned' in changeInfo;
    if (interestingChange) scheduleRefresh();
  });
  chrome.tabs.onRemoved.addListener((tabId) => {
    if (state.originTabId === tabId) setOriginTabId(undefined);
    scheduleRefresh();
  });
  chrome.tabs.onMoved.addListener(scheduleRefresh);
  chrome.tabs.onAttached.addListener(scheduleRefresh);
  chrome.tabs.onDetached.addListener(scheduleRefresh);
  chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    const nextOriginTabId = remapTabId(state.originTabId, addedTabId, removedTabId);
    if (nextOriginTabId !== state.originTabId) setOriginTabId(nextOriginTabId);
    scheduleRefresh();
  });
  chrome.windows.onCreated.addListener(scheduleRefresh);
  chrome.windows.onRemoved.addListener(scheduleRefresh);
  chrome.windows.onFocusChanged.addListener(scheduleRefresh);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'session') return;
    const sharedLayout = changes[WINDOW_LAYOUT_STORAGE_KEY]?.newValue as WindowLayout | undefined;
    if (!sharedLayout || managedWindows.length === 0) return;
    const nextLayout = reconcileWindowLayout(managedWindows, sharedLayout);
    if (windowLayoutsEqual(currentLayout, nextLayout)) return;
    currentLayout = nextLayout;
    render();
  });

  colorSchemeQuery.addEventListener('change', () => {
    domainColorCache.clear();
    domainColorRequests.clear();
    render();
  });

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isReopenMessage(message) || message.sourceWindowId !== state.sourceWindowId) return;
    cancelScheduledRefresh();
    setOriginTabId(message.sourceTabId === state.selfTabId ? undefined : message.sourceTabId);
    updateSearchQuery('');
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
  if (isSearchNavigationKey(event.key)) {
    const fromSearchField = event.target === searchInput;
    const columnCount = navigationColumnCount(event.key, fromSearchField, hasNavigationModifier(event));
    const hasVisibleSearchResults = fromSearchField && Boolean(searchQuery);
    if (typeof columnCount === 'number' && (hasVisibleSearchResults || (!fromSearchField && !isCommandTarget(event.target)))) {
      event.preventDefault();
      moveSelection(event.key, columnCount);
      return;
    }
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
  cancelScheduledRefresh();
  refreshTimer = window.setTimeout(() => {
    refreshTimer = undefined;
    void refreshTabs({ renderUnchanged: false });
  }, 80);
}

function cancelScheduledRefresh(): void {
  window.clearTimeout(refreshTimer);
  refreshTimer = undefined;
}

async function refreshReadingList(): Promise<void> {
  if (!chrome.readingList) return;
  try {
    const entries = await chrome.readingList.query({});
    readingListUrls = new Set(entries.map((entry) => entry.url));
    performance.mark('tab-eagle:reading-list-ready');
  } catch {
    setStatus('Tab Eagle could not read the Chrome Reading List.');
  }
}

async function refreshTabs({ renderUnchanged = true }: { renderUnchanged?: boolean } = {}): Promise<void> {
  const requestId = ++refreshRequestId;
  const chromeWindows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  if (requestId !== refreshRequestId) return;
  if (!hasInitialView) performance.mark('tab-eagle:tabs-ready');
  const eagleBaseUrl = getEagleBaseUrl();

  const nextManagedWindows = sortWindowsById(chromeWindows
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
    })));
  const snapshotUnchanged = browserSnapshotsEqual(managedWindows, nextManagedWindows);
  managedWindows = nextManagedWindows;

  managedTabs = managedWindows.flatMap((windowItem) => windowItem.tabs);
  rebuildOrderedTabs();
  if (!renderUnchanged && snapshotUnchanged) return;
  await recalculateLayout();

  if (state.originTabId && !managedTabs.some((tab) => tab.id === state.originTabId)) setOriginTabId(undefined);
  const initialView = !hasInitialView;
  if (initialView) {
    hasInitialView = true;
    setCameraView(viewForWindow(state.sourceWindowId) ?? view);
  }
  render();

  if (initialView) {
    performance.mark('tab-eagle:overview-ready');
  }
}

function rebuildOrderedTabs(): void {
  orderedTabs = managedWindows.flatMap((windowItem) => sortTabs(windowItem.tabs, state.sortMode));
}

async function recalculateLayout(): Promise<void> {
  const nextLayout = reconcileWindowLayout(managedWindows, currentLayout);
  if (windowLayoutsEqual(currentLayout, nextLayout)) return;
  currentLayout = nextLayout;
  await persistWindowLayout();
}

async function persistWindowLayout(): Promise<void> {
  await chrome.storage.session.set({ [WINDOW_LAYOUT_STORAGE_KEY]: currentLayout });
}

async function setSortMode(sortMode: SortMode): Promise<void> {
  state.sortMode = sortMode;
  await chrome.storage.local.set({ [SORT_STORAGE_KEY]: sortMode });
  rebuildOrderedTabs();
  syncSortControl();
  render();
  scheduleCurrentSearchResultFit();
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
  if (dragState || typeof renamingWindowId === 'number') {
    renderPending = true;
    return;
  }
  renderPending = false;
  const focusKey = focusedRenderKey();
  const matchingTabs = filterTabsBySearch(orderedTabs, searchQuery);
  const matchingIds = new Set(matchingTabs.map((tab) => tab.id));
  selectedTabId = reconcileSelectedTabId(matchingTabs, selectedTabId);

  setWorldSize(currentLayout);
  windowMap.replaceChildren();
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
  syncDetailInteractionState();
  restoreRenderedFocus(focusKey);
}

function setWorldSize(layout: WindowLayout): void {
  world.style.width = `${layout.width}px`;
  world.style.height = `${layout.height}px`;
}

function focusedRenderKey(): string | undefined {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement) || !windowMap.contains(activeElement)) return undefined;
  return activeElement.dataset.focusKey;
}

function restoreRenderedFocus(focusKey: string | undefined): void {
  if (!focusKey) return;
  const replacement = [...windowMap.querySelectorAll<HTMLElement>('[data-focus-key]')]
    .find((element) => element.dataset.focusKey === focusKey);
  replacement?.focus();
}

function syncDetailInteractionState(): void {
  const hidden = !windowDetailsVisible;
  windowMap.querySelectorAll<HTMLElement>('.reading-list-button, .window-footer').forEach((element) => {
    element.toggleAttribute('inert', hidden);
    element.setAttribute('aria-hidden', String(hidden));
  });
}

function scheduleCurrentSearchResultFit(): void {
  const matchingTabs = filterTabsBySearch(orderedTabs, searchQuery);
  scheduleSearchResultFit(new Set(matchingTabs.map((tab) => tab.id)));
}

function cancelScheduledSearchFit(): void {
  window.cancelAnimationFrame(searchFitFrame ?? 0);
  searchFitFrame = undefined;
}

function scheduleSearchResultFit(matchingIds: Set<number>): void {
  cancelScheduledSearchFit();
  if (!searchQuery || matchingIds.size === 0) return;

  const scheduledQuery = searchQuery;
  searchFitFrame = window.requestAnimationFrame(() => {
    searchFitFrame = undefined;
    if (searchQuery !== scheduledQuery) return;

    const matchingCards = [...windowMap.querySelectorAll<HTMLElement>('.tab-card')].filter((card) =>
      matchingIds.has(Number(card.dataset.tabId))
    );
    const windowHeaders = new Set(
      matchingCards
        .map((card) => card.closest<HTMLElement>('.browser-window')?.querySelector<HTMLElement>('.window-chrome'))
        .filter((header): header is HTMLElement => Boolean(header))
    );
    frameElementsInCamera([...matchingCards, ...windowHeaders]);
  });
}

function scheduleSelectedTabFit(tabId: number): void {
  cancelScheduledSearchFit();
  searchFitFrame = window.requestAnimationFrame(() => {
    searchFitFrame = undefined;
    if (!searchQuery || selectedTabId !== tabId) return;

    const card = windowMap.querySelector<HTMLElement>(`.tab-card[data-tab-id="${tabId}"]`);
    if (!card) return;
    const header = card.closest<HTMLElement>('.browser-window')?.querySelector<HTMLElement>('.window-chrome');
    frameElementsInCamera(header ? [card, header] : [card]);
  });
}

function frameElementsInCamera(elements: HTMLElement[]): void {
  const bounds = worldBoundsForElements(elements);
  if (!bounds) return;

  const viewportRect = currentViewportBounds();
  animateCameraTo(cameraForBounds(
    bounds,
    viewportRect.width,
    viewportRect.height,
    SEARCH_FIT_PADDING,
    MIN_ZOOM,
    MAX_ZOOM
  ));
}

function worldBoundsForElements(elements: HTMLElement[]): WorldBounds | undefined {
  const elementBounds = elements
    .map(boundsWithinWorld)
    .filter((bounds): bounds is WorldBounds => Boolean(bounds));
  if (elementBounds.length === 0) return undefined;

  return {
    left: Math.min(...elementBounds.map((bounds) => bounds.left)),
    top: Math.min(...elementBounds.map((bounds) => bounds.top)),
    right: Math.max(...elementBounds.map((bounds) => bounds.right)),
    bottom: Math.max(...elementBounds.map((bounds) => bounds.bottom))
  };
}

function boundsWithinWorld(element: HTMLElement): WorldBounds | undefined {
  let left = 0;
  let top = 0;
  let current: HTMLElement | null = element;

  while (current && current !== world) {
    left += current.offsetLeft;
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  if (current !== world) return undefined;

  return { left, top, right: left + element.offsetWidth, bottom: top + element.offsetHeight };
}

function createWindowCard(
  windowItem: ManagedWindow,
  windowIndex: number,
  layoutItem: WindowLayout['items'][number],
  matchingIds: Set<number>
): HTMLElement {
  const orderedWindowTabs = sortTabs(windowItem.tabs, state.sortMode);
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
        <md-text-button class="window-title-button" data-focus-key="rename-window-${windowItem.id}" type="button" aria-label="Rename ${escapeAttribute(title)}">${escapeHtml(title)} <span class="rename-glyph">✎</span></md-text-button>
        ${windowItem.id === state.sourceWindowId ? '<em class="current-window-badge">Current</em>' : ''}
      </div>
      <span class="window-count">${searchQuery ? `${matchCount} of ${windowItem.tabs.length}` : `${windowItem.tabs.length} tabs`}</span>
    </div>
    <div class="window-tab-grid" role="list" aria-label="Tabs in ${escapeAttribute(title)}"></div>
    <div class="window-footer">
      <span>${sortModeLabel(state.sortMode)}</span>
      <md-text-button class="zoom-window-button" data-focus-key="zoom-window-${windowItem.id}" type="button">Zoom to window</md-text-button>
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
  card.role = 'listitem';
  card.tabIndex = 0;
  card.draggable = !pending;
  card.dataset.tabId = String(tab.id);
  card.dataset.windowId = String(tab.windowId);
  card.dataset.focusKey = `tab-${tab.id}`;
  card.classList.toggle('is-origin', origin);
  card.classList.toggle('is-pending', pending);
  card.classList.toggle('is-selected', selected);
  card.classList.toggle('is-search-dimmed', Boolean(searchQuery) && !matchingIds.has(tab.id));
  card.setAttribute('aria-current', selected ? 'true' : 'false');
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
      <md-icon-button class="reading-list-button${tab.pinned || !readingListUrl ? ' is-unavailable' : ''}" data-focus-key="read-later-${tab.id}" type="button" aria-label="${escapeAttribute(`${readLaterLabel}: ${tab.title}`)}" ${canReadLater ? '' : 'disabled'}>${readingListIconSvg()}</md-icon-button>
      <md-icon-button class="close-button" data-focus-key="close-${tab.id}" type="button" aria-label="Close tab: ${escapeAttribute(tab.title)}" ${pending ? 'disabled' : ''}>${closeIconSvg()}</md-icon-button>
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
    markDropTarget(tab.windowId, state.sortMode === 'position' ? tab.id : undefined);
  });
  card.addEventListener('drop', (event) => {
    if (!dragState || dragState.tabId === tab.id) return;
    event.preventDefault();
    event.stopPropagation();
    void moveDraggedTab(tab.windowId, state.sortMode === 'position' ? tab.id : undefined);
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
    searchInput.setAttribute('aria-expanded', 'false');
    searchResults.replaceChildren();
    return;
  }

  const matches = filterTabsBySearch(orderedTabs, searchQuery);
  searchResults.replaceChildren();
  searchResults.hidden = false;
  searchInput.setAttribute('aria-expanded', 'true');
  const heading = document.createElement('div');
  heading.className = 'result-heading';
  heading.textContent = `${matches.length} open ${matches.length === 1 ? 'tab' : 'tabs'} across all windows`;
  searchResults.append(heading);

  matches.forEach((tab) => {
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
  dragState = { tabId: tab.id };
  document.body.classList.add('is-dragging');
  event.currentTarget instanceof HTMLElement && event.currentTarget.classList.add('is-drag-source');
  dragTitle.textContent = `Moving ${tab.title}`;
  dragInstruction.textContent = dragDropInstruction();
  dragBanner.hidden = false;
  skyHint.textContent = `Arrange · ${dragDropInstruction()}`;
  showNewWindowDropTarget(tab);
  fitAll();
}

function showNewWindowDropTarget(tab: ManagedTab): void {
  const sourceWindow = managedWindows.find((windowItem) => windowItem.id === tab.windowId);
  const previewWindow: ManagedWindow = {
    id: NEW_WINDOW_PREVIEW_ID,
    focused: false,
    incognito: sourceWindow?.incognito ?? false,
    tabs: [tab]
  };
  dragPreviewLayout = reconcileWindowLayout([...managedWindows, previewWindow], currentLayout);
  const previewItem = dragPreviewLayout.items.find((item) => item.windowId === NEW_WINDOW_PREVIEW_ID);
  if (!previewItem) return;

  setWorldSize(dragPreviewLayout);
  const target = createNewWindowDropTarget(previewItem);
  windowMap.append(target);
}

function createNewWindowDropTarget(layoutItem: WindowLayoutItem): HTMLElement {
  const target = document.createElement('article');
  target.className = 'browser-window new-window-drop-target';
  target.setAttribute('aria-label', 'Drop to move this tab into a new Chrome window');
  target.style.left = `${layoutItem.x}px`;
  target.style.top = `${layoutItem.y}px`;
  target.style.width = `${layoutItem.width}px`;
  target.style.height = `${layoutItem.height}px`;
  target.innerHTML = `
    <div class="window-chrome">
      <div class="window-dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="window-title-area"><strong>New window</strong></div>
      <span class="window-count">1 tab</span>
    </div>
    <div class="new-window-drop-body">
      <span aria-hidden="true">＋</span>
      <strong>Drop here</strong>
      <small>Move this tab into its own window</small>
    </div>
    <div class="window-footer"><span>Reserved position</span></div>
  `;
  target.addEventListener('dragover', (event) => {
    if (!dragState) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    markNewWindowDropTarget();
  });
  target.addEventListener('drop', (event) => {
    if (!dragState) return;
    event.preventDefault();
    event.stopPropagation();
    void moveDraggedTabToNewWindow();
  });
  return target;
}

function markDropTarget(windowId: number, beforeTabId?: number): void {
  if (!dragState) return;
  windowMap.querySelectorAll('.is-drop-target, .drop-before').forEach((element) => element.classList.remove('is-drop-target', 'drop-before'));
  if (typeof beforeTabId === 'number') {
    windowMap.querySelector<HTMLElement>(`.tab-card[data-tab-id="${beforeTabId}"]`)?.classList.add('drop-before');
  } else {
    windowMap.querySelector<HTMLElement>(`.browser-window[data-window-id="${windowId}"]`)?.classList.add('is-drop-target');
  }
}

function markNewWindowDropTarget(): void {
  if (!dragState) return;
  windowMap.querySelectorAll('.is-drop-target, .drop-before').forEach((element) => element.classList.remove('is-drop-target', 'drop-before'));
  windowMap.querySelector<HTMLElement>('.new-window-drop-target')?.classList.add('is-drop-target');
}

function dragDropInstruction(): string {
  return state.sortMode === 'position'
    ? 'Drop onto a window, between tabs, or into New window'
    : 'Drop into a window or into New window';
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

async function moveDraggedTabToNewWindow(): Promise<void> {
  if (!dragState) return;
  const sourceTab = managedTabs.find((tab) => tab.id === dragState?.tabId);
  const previewLayout = dragPreviewLayout;
  if (!sourceTab || !previewLayout) {
    clearDragState();
    return;
  }

  clearDragState();
  try {
    const createdWindow = await chrome.windows.create({ tabId: sourceTab.id, focused: false });
    if (typeof createdWindow?.id === 'number') {
      currentLayout = replaceWindowIdInLayout(previewLayout, NEW_WINDOW_PREVIEW_ID, createdWindow.id);
      await persistWindowLayout();
    }
    setStatus(`Moved “${sourceTab.title}” to a new window.`);
  } catch {
    setStatus('Chrome could not move that tab into a new window.');
  } finally {
    await refreshTabs();
  }
}

function clearDragState(): void {
  const shouldRender = renderPending;
  dragState = undefined;
  dragPreviewLayout = undefined;
  document.body.classList.remove('is-dragging');
  dragBanner.hidden = true;
  skyHint.textContent = 'Scroll to zoom · drag the background to pan';
  windowMap.querySelector('.new-window-drop-target')?.remove();
  windowMap.querySelectorAll('.is-drop-target, .drop-before, .is-drag-source').forEach((element) => element.classList.remove('is-drop-target', 'drop-before', 'is-drag-source'));
  setWorldSize(currentLayout);
  if (shouldRender) render();
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
  renamingWindowId = windowItem.id;
  titleButton.replaceWith(field);

  const finish = async (): Promise<void> => {
    if (finished) return;
    finished = true;
    const nextTitle = field.value.trim();
    renamingWindowId = undefined;
    try {
      if (!cancelled && nextTitle && nextTitle !== originalTitle) {
        windowNames[String(windowItem.id)] = nextTitle;
        await chrome.storage.session.set({ [WINDOW_NAMES_STORAGE_KEY]: windowNames });
        setStatus(`Renamed window to “${nextTitle}”.`);
      }
    } finally {
      render();
    }
  };

  field.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') cancelled = true;
    field.blur();
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
  if (event.button !== 0) return;
  if (!(event.target instanceof Element) || event.target.closest('.browser-window, .zoom-control, .overview-stats, .status')) return;
  cancelScheduledSearchFit();
  stopCameraAnimation();
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add('is-panning');
  panAnchor = { clientX: event.clientX, clientY: event.clientY, panX: view.panX, panY: view.panY };
}

function movePan(event: PointerEvent): void {
  if (!panAnchor) return;
  setCameraView({
    zoom: view.zoom,
    panX: panAnchor.panX + event.clientX - panAnchor.clientX,
    panY: panAnchor.panY + event.clientY - panAnchor.clientY
  });
}

function endPan(): void {
  panAnchor = undefined;
  viewport.classList.remove('is-panning');
}

function fitAll(): void {
  cancelScheduledSearchFit();
  const rect = currentViewportBounds();
  const layout = dragPreviewLayout ?? currentLayout;
  const nextZoom = clamp(
    Math.min((rect.width - 72) / layout.width, (rect.height - 72) / layout.height),
    MIN_ZOOM,
    0.82
  );
  animateCameraTo({
    zoom: nextZoom,
    panX: (rect.width - layout.width * nextZoom) / 2,
    panY: (rect.height - layout.height * nextZoom) / 2
  });
}

function zoomToWindow(windowId: number): void {
  cancelScheduledSearchFit();
  const targetView = viewForWindow(windowId);
  if (targetView) animateCameraTo(targetView);
}

function viewForWindow(windowId: number): CameraView | undefined {
  const item = currentLayout.items.find((candidate) => candidate.windowId === windowId);
  if (!item) return undefined;
  const rect = currentViewportBounds();
  const targetZoom = clamp(Math.min((rect.width - 120) / item.width, (rect.height - 110) / item.height), 0.76, 1.12);
  return {
    zoom: targetZoom,
    panX: rect.width / 2 - (item.x + item.width / 2) * targetZoom,
    panY: rect.height / 2 - (item.y + item.height / 2) * targetZoom
  };
}

function zoomAt(nextZoom: number, clientX?: number, clientY?: number): void {
  cancelScheduledSearchFit();
  const rect = currentViewportBounds();
  const anchorX = (clientX ?? rect.left + rect.width / 2) - rect.left;
  const anchorY = (clientY ?? rect.top + rect.height / 2) - rect.top;
  setCameraView(zoomAboutPoint(view, nextZoom, anchorX, anchorY, MIN_ZOOM, MAX_ZOOM));
}

function setCameraView(nextView: CameraView): void {
  stopCameraAnimation();
  view = nextView;
  renderCamera();
}

function animateCameraTo(targetView: CameraView): void {
  stopCameraAnimation();
  if (reducedMotionQuery.matches || cameraViewsNearlyEqual(view, targetView)) {
    view = targetView;
    renderCamera();
    return;
  }

  const fromView = { ...view };
  const { width, height } = currentViewportBounds();
  const startedAt = performance.now();

  const animate = (now: number): void => {
    const progress = Math.min(1, (now - startedAt) / CAMERA_ANIMATION_DURATION_MS);
    view = interpolateCameraView(fromView, targetView, easeOutCubic(progress), width, height);
    renderCamera();
    if (progress < 1) {
      cameraAnimationFrame = window.requestAnimationFrame(animate);
    } else {
      cameraAnimationFrame = undefined;
    }
  };

  cameraAnimationFrame = window.requestAnimationFrame(animate);
}

function stopCameraAnimation(): void {
  if (typeof cameraAnimationFrame !== 'number') return;
  window.cancelAnimationFrame(cameraAnimationFrame);
  cameraAnimationFrame = undefined;
}

function renderCamera(): void {
  world.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
  scheduleCameraHudSync();
}

function scheduleCameraHudSync(): void {
  if (typeof cameraHudFrame === 'number') return;
  cameraHudFrame = window.requestAnimationFrame(() => {
    cameraHudFrame = undefined;
    if (Math.abs(Number(zoomSlider.value) - view.zoom) > 0.001) zoomSlider.value = view.zoom;
    zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`;
    updateDetailLevel();
  });
}

function updateDetailLevel(): void {
  const nextDetailsVisible = detailVisibilityForZoom(
    windowDetailsVisible,
    view.zoom,
    DETAIL_FADE_IN_ZOOM,
    DETAIL_FADE_OUT_ZOOM
  );
  if (nextDetailsVisible === windowDetailsVisible) return;
  windowDetailsVisible = nextDetailsVisible;
  document.documentElement.dataset.detailLevel = windowDetailsVisible ? 'window' : 'overview';
  syncDetailInteractionState();
}

function handleViewportResize(): void {
  const previousBounds = viewportBounds;
  const nextBounds = readViewportBounds();
  if (previousBounds.width <= 0 || previousBounds.height <= 0) return;
  if (
    Math.abs(previousBounds.width - nextBounds.width) < 0.5 &&
    Math.abs(previousBounds.height - nextBounds.height) < 0.5
  ) return;

  setCameraView(cameraForResize(
    view,
    previousBounds.width,
    previousBounds.height,
    nextBounds.width,
    nextBounds.height
  ));
}

function readViewportBounds(): ViewportBounds {
  const rect = viewport.getBoundingClientRect();
  viewportBounds = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  return viewportBounds;
}

function currentViewportBounds(): ViewportBounds {
  if (viewportBounds.width <= 0 || viewportBounds.height <= 0) return readViewportBounds();
  return viewportBounds;
}

function cameraViewsNearlyEqual(left: CameraView, right: CameraView): boolean {
  return (
    Math.abs(left.zoom - right.zoom) < 0.0001 &&
    Math.abs(left.panX - right.panX) < 0.1 &&
    Math.abs(left.panY - right.panY) < 0.1
  );
}

function moveSelection(key: SearchNavigationKey, columnCount: number): void {
  const visibleTabs = filterTabsBySearch(orderedTabs, searchQuery);
  if (visibleTabs.length === 0) return;
  const nextTabId = nextSelectedTabId(visibleTabs, selectedTabId, key, columnCount);
  if (typeof nextTabId !== 'number' || nextTabId === selectedTabId) return;
  selectedTabId = nextTabId;
  updateSelectedCardAttributes();
  updateSelectedSearchResultAttributes();
  scrollSelectedSearchResultIntoView();
  scheduleSelectedTabFit(nextTabId);
  announceSearchSelection(visibleTabs);
}

function setSearchQuery(query: string): void {
  updateSearchQuery(query);
  render();
  scheduleCurrentSearchResultFit();
  announceSearchSelection();
}

function updateSearchQuery(query: string): void {
  searchQuery = query;
  searchInput.value = query;
  selectedTabId = reconcileSelectedTabId(filterTabsBySearch(orderedTabs, searchQuery), selectedTabId, { resetToFirst: true });
  if (!query) {
    cancelScheduledSearchFit();
    searchAnnouncement.textContent = '';
  }
}

function announceSearchSelection(matches = filterTabsBySearch(orderedTabs, searchQuery)): void {
  if (!searchQuery) {
    searchAnnouncement.textContent = '';
    return;
  }
  if (matches.length === 0) {
    searchAnnouncement.textContent = 'No open tabs match.';
    return;
  }

  const selectedIndex = Math.max(0, matches.findIndex((tab) => tab.id === selectedTabId));
  const selectedTab = matches[selectedIndex];
  const selectedWindow = managedWindows.find((windowItem) => windowItem.id === selectedTab?.windowId);
  const windowIndex = selectedWindow ? managedWindows.indexOf(selectedWindow) : -1;
  const selectedWindowTitle = selectedWindow ? windowTitle(selectedWindow, windowIndex) : 'Chrome window';
  searchAnnouncement.textContent = `${selectedTab?.title ?? 'Tab'}, ${selectedWindowTitle}, result ${selectedIndex + 1} of ${matches.length}.`;
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
    card.setAttribute('aria-current', selected ? 'true' : 'false');
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

  state.pendingTabIds.add(tabId);
  render();
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    setStatus('That tab was already gone. Refreshing Tab Eagle.');
  } finally {
    state.pendingTabIds.delete(tabId);
    await refreshTabs();
  }
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
    setOriginTabId(undefined);
    await refreshTabs();
  }
}

function setOriginTabId(originTabId: number | undefined): void {
  state.originTabId = originTabId;
  history.replaceState(null, '', updateEagleSourceUrl(location.href, originTabId, state.sourceWindowId));
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
  const faviconUrl = faviconUrlForTab(tab);
  if (!faviconUrl) {
    domainColorCache.set(cacheKey, null);
    return;
  }
  domainColorRequests.add(cacheKey);
  try {
    const image = await loadImage(faviconUrl);
    domainColorCache.set(cacheKey, await colorsFromImage(image, currentThemeMode()));
  } catch {
    domainColorCache.set(cacheKey, null);
  } finally {
    domainColorRequests.delete(cacheKey);
  }
  if (state.sortMode === 'domain') applyResolvedDomainColors(tab.domain);
}

function applyResolvedDomainColors(domain: string): void {
  const tabsById = new Map(
    managedTabs.filter((tab) => tab.domain === domain).map((tab) => [tab.id, tab])
  );
  windowMap.querySelectorAll<HTMLElement>('.tab-card').forEach((card) => {
    const tab = tabsById.get(Number(card.dataset.tabId));
    if (tab) applyDomainCardColors(card, tab);
  });
}

function currentThemeMode(): ThemeMode {
  return colorSchemeQuery.matches ? 'dark' : 'light';
}

function domainColorCacheKey(domain: string): string {
  return `${currentThemeMode()}:${domain}`;
}

function faviconMarkup(tab: ManagedTab): string {
  const faviconUrl = faviconUrlForTab(tab);
  const fallback = `<div class="favicon fallback${faviconUrl ? ' is-hidden' : ''}" aria-hidden="true">${escapeHtml(tab.domain[0]?.toUpperCase() ?? '?')}</div>`;
  return `<div class="favicon-frame">${faviconUrl ? `<img class="favicon favicon-image" src="${escapeAttribute(faviconUrl)}" alt="" loading="lazy" />` : ''}${fallback}</div>`;
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

function sortModeLabel(sortMode: SortMode): string {
  if (sortMode === 'domain') return 'Sorted by domain';
  if (sortMode === 'recent' || sortMode === 'leastRecent') return 'Sorted by tab age';
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

function hasNavigationModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target === searchInput || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable || target.tagName.toLowerCase().includes('text-field');
}

function isCommandTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target === searchInput) return false;
  return Boolean(target.closest('button, md-icon-button, md-text-button, md-outlined-button, md-filled-button, md-outlined-segmented-button, md-outlined-text-field, md-slider'));
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
