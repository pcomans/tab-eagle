import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/labs/segmentedbutton/outlined-segmented-button.js';
import '@material/web/labs/segmentedbuttonset/outlined-segmented-button-set.js';
import '@material/web/ripple/ripple.js';
import './styles.css';

import type { EagleState, ManagedTab, SortMode } from '../shared/types';
import { getEagleBaseUrl, isEagleUrl } from '../shared/urls';
import { closeIconSvg, statusIconSvg } from './icons';
import { sortTabs, toManagedTab } from './tab-model';

const SORT_STORAGE_KEY = 'sortMode';

let state: EagleState;
let managedTabs: ManagedTab[] = [];
let orderedTabs: ManagedTab[] = [];
let refreshTimer: number | undefined;

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

  const initialSortMode = storedSortMode === 'domain' ? 'domain' : 'position';

  state = {
    sourceWindowId,
    selfTabId,
    originTabId: sourceTabId === selfTabId ? undefined : sourceTabId,
    sortMode: initialSortMode,
    pendingTabIds: new Set()
  };

  bindEvents();
  syncSortControl();
  await refreshTabs();
}

function bindEvents(): void {
  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const sortMode = button.dataset.sort === 'domain' ? 'domain' : 'position';
      void setSortMode(sortMode);
    });
  });

  returnOriginButton.addEventListener('click', () => {
    void returnToOrigin();
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
}

function scheduleRefresh(): void {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    void refreshTabs();
  }, 80);
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
    const selected = button.dataset.sort === state.sortMode;
    (button as HTMLElement & { selected: boolean }).selected = selected;
    button.toggleAttribute('selected', selected);
  });
}

function render(): void {
  grid.replaceChildren();
  tabCount.textContent = `${orderedTabs.length} ${orderedTabs.length === 1 ? 'tab' : 'tabs'}`;
  returnOriginButton.toggleAttribute('disabled', !state.originTabId);

  if (orderedTabs.length === 0) {
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
    grid.append(createTabCard(tab));
  }
}

function createTabCard(tab: ManagedTab): HTMLElement {
  const card = document.createElement('article');
  const origin = tab.id === state.originTabId;
  const pending = state.pendingTabIds.has(tab.id);

  card.className = 'tab-card';
  card.role = 'gridcell';
  card.tabIndex = 0;
  card.dataset.tabId = String(tab.id);
  card.classList.toggle('is-origin', origin);
  card.classList.toggle('is-pending', pending);

  const favicon = tab.favIconUrl
    ? `<img class="favicon" src="${escapeAttribute(tab.favIconUrl)}" alt="" loading="lazy" />`
    : `<div class="favicon fallback" aria-hidden="true">${escapeHtml(tab.domain[0]?.toUpperCase() ?? '?')}</div>`;

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
      </div>
    </div>
    <div class="tab-meta" aria-label="Tab status">${metadata}</div>
  `;

  card.addEventListener('click', () => {
    void openTab(tab.id);
  });

  card.querySelector<HTMLElement>('.close-button')?.addEventListener('click', (event) => {
    event.stopPropagation();
    void closeManagedTab(tab.id);
  });

  return card;
}

function metadataItem(icon: Parameters<typeof statusIconSvg>[0], label: string): string {
  return `
    <span class="tab-meta-item">
      ${statusIconSvg(icon)}
      <span>${label}</span>
    </span>
  `;
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

async function closeManagedTab(tabId: number): Promise<void> {
  if (state.pendingTabIds.has(tabId)) return;

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
    setStatus('That tab was already gone. Refreshing Tab Eagle.');
  } finally {
    state.pendingTabIds.delete(tabId);
    await refreshTabs();
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
