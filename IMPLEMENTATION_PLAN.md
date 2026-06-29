# Tab Eagle Implementation Plan

Last reviewed against Chrome extension and Material Web docs: 2026-06-29.

## Product Shape

Tab Eagle is a Manifest V3 Chrome extension that opens a full-viewport extension page in a normal Chrome tab from the toolbar action. It does not force browser or OS fullscreen mode. The Tab Eagle tab is the active Chrome tab while the tool is open. Content tabs are represented as cards inside Tab Eagle, and clicking a card activates that tab while leaving the Tab Eagle tab open in the tab strip.

The Tab Eagle tab itself must be filtered out of the managed tab list. It should not appear as a card, be counted in totals, participate in sorting, or be closable from inside Tab Eagle.

## Documentation Basis

- Chrome `action` API: use a toolbar action without `default_popup` so `chrome.action.onClicked` is delivered.
- Chrome `tabs` API: use `chrome.tabs` from the service worker and extension page to query, activate, close, and observe tabs.
- Chrome `tabs` permission: required for `url`, `pendingUrl`, `title`, and `favIconUrl`; this does not require host permissions such as `<all_urls>`.
- Chrome `storage` API: use extension storage for lightweight preferences such as sort mode.
- Manifest V3 security: bundle all JavaScript with the extension package. Do not load remote code from a CDN.
- Material Web: use `@material/web` where practical, bundled locally, with Material Design 3 tokens for color, typography, shape, and controls.

References:

- https://developer.chrome.com/docs/extensions/reference/api/action
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/storage
- https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
- https://m3.material.io/develop/web
- https://material-web.dev/
- https://material-web.dev/about/quick-start/
- https://material-web.dev/theming/material-theming/

## Manifest and Permissions

Use Manifest V3.

Required MVP manifest keys:

- `manifest_version: 3`
- `name: "Tab Eagle"`
- `version`
- `description`
- `icons`
- `action.default_title: "Open Tab Eagle"`
- `background.service_worker`
- `background.type: "module"` if the bundled service worker uses ES modules
- `permissions: ["tabs", "storage"]`

Avoid in MVP:

- `host_permissions`
- `<all_urls>`
- `activeTab`
- `scripting`
- `webRequest`
- content scripts

Post-MVP optional permissions:

- `tabGroups` for group title, color, collapsed state, and group actions.
- `sessions` for recently closed tabs and restore.

## File Structure

```text
manifest.json
src/
  background/
    service-worker.ts
  eagle/
    index.html
    main.ts
    styles.css
    tab-model.ts
    tab-sort.ts
    tab-actions.ts
  shared/
    chrome-api.ts
    urls.ts
    types.ts
icons/
package.json
vite.config.ts
tsconfig.json
```

Use Vite or Rollup to bundle TypeScript and selected `@material/web` imports into local extension assets.

The production build must emit this installable `dist/` contract:

```text
dist/
  manifest.json
  service-worker.js
  eagle/
    index.html
    assets/
      *.js
      *.css
  icons/
```

Build requirements:

- No dev server, HMR client, remote module import, inline script, `eval`, or CDN dependency in `dist/`.
- The manifest paths must match emitted files exactly.
- `eagle/index.html` must load bundled local assets only.
- If code splitting is used, all chunks must be packaged and referenced locally.

## Opening Flow

1. User clicks the extension toolbar action.
2. The service worker receives `chrome.action.onClicked`.
3. The service worker captures the source tab and window:
   - `sourceTabId`
   - `sourceWindowId`
   - source tab `index`
4. If a Tab Eagle tab already exists in that window:
   - activate the existing Tab Eagle tab
   - update it to the latest Tab Eagle URL with source parameters, or write source metadata to `chrome.storage.session` before activation
5. Otherwise:
   - create a new extension tab with `chrome.tabs.create`
   - use `chrome.runtime.getURL("eagle/index.html")`
   - include `sourceTabId`, `sourceWindowId`, and an `openNonce` in the URL query string
   - place it near the source tab when possible

The URL query string is the authoritative MVP handoff from service worker to page. Runtime messages can be used after the page acknowledges readiness, but they should not be required for initial state because a message can arrive before listeners are registered and MV3 service worker globals can be lost after idle shutdown.

Existing Tab Eagle tabs must be found by querying actual Chrome tabs in the target window and matching the extension page URL. Do not rely on in-memory service worker state.

## Tab Data Model

Represent each managed tab with:

- `id`
- `windowId`
- `index`
- `url`
- `domain`
- `title`
- `favIconUrl`
- `pinned`
- `audible`
- `mutedInfo`
- `status`
- `discarded`
- optional `frozen`
- optional `lastAccessed`

MVP state model:

- `sourceWindowId`: the Chrome window being managed.
- `selfTabId`: the Tab Eagle tab, excluded from managed cards.
- `originTabId`: the tab the user came from.
- `sortMode`: `position` or `domain`.
- `pendingTabIds`: tabs with an in-flight action such as close or activate.

MVP card display:

- favicon
- domain
- title
- close button
- origin state, if the card is the tab the user came from

Post-MVP card display can expose pinned, audible, muted, loading, discarded, frozen, grouped, and last-accessed metadata.

## Filtering Rules

When querying tabs:

1. Query the source window only.
2. On page init, call `chrome.tabs.getCurrent()` and store `selfTabId`.
3. Exclude `selfTabId` from every managed tab result.
4. Also exclude tabs whose `url` or `pendingUrl` exactly matches or starts with this extension's Tab Eagle page URL.
5. Exclude tabs without an `id`.
6. Keep Chrome internal pages if Chrome exposes enough metadata, but handle missing favicon/title gracefully.

The Tab Eagle tab should be retrieved via `chrome.tabs.getCurrent()` during initialization and reused for filtering and empty-state self-close behavior.

## Navigation Model

Cards are direct navigation targets. Tab Eagle remains active only while the user is browsing, sorting, or closing tabs inside the view.

Initial state:

1. Store `sourceTabId` as `originTabId`.
2. If there are no managed tabs, show an empty state and a close Tab Eagle action.

Origin indicator:

- The origin card shows an inline `Origin` metadata item with a Material-style icon and label.
- If the origin tab is closed, remove the origin indicator rather than moving it to another tab.

Card click behavior:

- Activate the clicked content tab.
- Leave the Tab Eagle tab open in the tab strip so the user can return to it or pin it.

Leave behavior:

- Top-level action: "Return to origin" activates `originTabId` if the origin tab still exists.
- If the origin tab no longer exists, keep Tab Eagle open and show a short status message.
- Escape maps to "Return to origin".

## Closing Tabs

Card close button behavior:

1. Stop the card click event.
2. Capture the current visual order before mutating state.
3. Add the tab to `pendingTabIds` and disable its close button.
4. Optimistically remove the card from the rendered list or mark it as closing immediately.
5. Call `chrome.tabs.remove(tabId)`.
6. Keep Tab Eagle active.
7. Reconcile with the next tab query or `onRemoved` event.

Do not rely on Chrome's active-tab fallback behavior for closing managed content tabs, because Chrome's active tab is Tab Eagle while the tool is open.

All `chrome.tabs.remove`, `chrome.tabs.update`, and `chrome.tabs.get` calls must catch rejections. If a tab is stale, moved, or already closed, refresh from Chrome as the source of truth.

## Sorting

MVP sort modes:

- `By Position`: sort by `index`.
- `By Domain`: sort by normalized domain, then original tab index.

Default behavior:

- First run defaults to `By Position`.
- Persisted sort mode is used only after the user changes the control.

Domain normalization:

- parse with `new URL(tab.url)`
- use `hostname`
- strip leading `www.`
- lower-case
- fall back to a stable label for non-HTTP URLs such as `chrome:`, `file:`, or `extension`

Persist the selected sort mode in `chrome.storage.local`.

## Live Updates

The Tab Eagle page should listen to tab events and debounce refreshes:

- `chrome.tabs.onCreated`: refresh if `tab.windowId === sourceWindowId`; expect URL/title/group metadata to be incomplete until later updates.
- `chrome.tabs.onUpdated`: refresh if the tab is in `sourceWindowId` or if `changeInfo` includes `url`, `pendingUrl`, `title`, `favIconUrl`, `status`, `audible`, `mutedInfo`, `pinned`, `discarded`, or `frozen`.
- `chrome.tabs.onRemoved`: refresh if `removeInfo.windowId === sourceWindowId`; remove the origin marker if the removed tab was the origin.
- `chrome.tabs.onMoved`: refresh if `moveInfo.windowId === sourceWindowId`.
- `chrome.tabs.onAttached`: refresh if `attachInfo.newWindowId === sourceWindowId`.
- `chrome.tabs.onDetached`: refresh if `detachInfo.oldWindowId === sourceWindowId`.
- `chrome.tabs.onReplaced`: resolve the added tab with `chrome.tabs.get(addedTabId)` when possible; refresh if the added or removed tab affects the source window.

Refresh only when the event affects the source window or might affect a tab moving into or out of that window.

Debounce visual refreshes, but do not debounce user-initiated optimistic close feedback.

## UI and Material Design 3

Use Material Design 3 visual language and components where practical.

Material Web components to consider:

- `md-filled-tonal-button` or `md-filled-button` for primary actions.
- `md-icon-button` for close, pin, and future quick actions.
- Material Web outlined segmented buttons for `By Position` / `By Domain`.
- `md-ripple` for card interaction feedback.
- `md-dialog` only if a future destructive bulk action needs confirmation.

Custom UI:

- Build tab cards with CSS because Material Web does not currently provide a first-class card component in the component list.
- Use Material tokens for colors, typography, shape, and elevation.
- Use a neutral MD3 surface system with sky blue as the accent color.
- Keep card radius at 8px or less unless the Material component itself defines otherwise.
- Use Material Web icon buttons for card close actions.
- Use a responsive CSS grid with stable card dimensions.
- Place the close button in a fixed top-right card location.
- Ensure title/domain text truncates cleanly and never overlaps the close button.

Recommended layout:

- Top app bar: title, tab count, sort control, and return-to-origin action.
- Main area: responsive grid of tab cards.
- Top-right action: "Return to origin".

## Accessibility

- Every card should be keyboard focusable.
- Close buttons need labels such as `Close tab: <title>`.
- The origin card must have a distinct non-color-only indicator.
- Support keyboard navigation:
  - every card is focusable
  - arrow keys move focus between cards
  - Enter opens the focused card
  - Tab moves to card close buttons and top-level controls
  - close buttons remain separate focusable controls
  - Delete and Backspace are not MVP close shortcuts
  - Escape returns to origin

## Privacy and Security

MVP privacy posture:

- No host permissions.
- No content scripts.
- No page content inspection.
- No screenshots or thumbnails.
- No extension `fetch` or XHR requests.
- No analytics.

The extension only reads tab metadata exposed by the Tabs API and only manages tabs through Chrome extension APIs.

Favicons are displayed from `tab.favIconUrl` when Chrome provides one. This may cause browser image loading for favicon assets, so the CSP must intentionally allow favicon image sources, or the UI must fall back to a local generic icon when the favicon cannot be loaded.

Because Manifest V3 disallows remotely hosted code, all Material Web code, app icons, fonts, and app JavaScript should be packaged locally. Prefer system fonts for MVP to avoid remote font loading.

Permission expectations:

- The extension must not request host permissions or access to all site data.
- The `tabs` permission may still produce an install warning because it exposes URL, title, favicon, and pending URL metadata.
- QA must record the exact Chrome install warning text.

## Post-MVP Roadmap

Additional tab metadata:

- Add `groupId`, group title, group color, group collapsed state, and group shared state with the optional `tabGroups` permission.
- Surface `pinned`, `audible`, `muted`, `loading`, `discarded`, `frozen`, and `lastAccessed` as compact icon-and-label metadata items.
- Treat version-gated fields such as `lastAccessed` and `frozen` as optional unless a `minimum_chrome_version` is added.

Additional views and actions:

- Add sort modes for recently used, least recently used, and stale first.
- Add filters for audible, pinned, muted, unloaded, grouped, and stale tabs.
- Add card actions for pin, mute, duplicate, discard, and close.
- Add domain-level bulk actions with confirmation for destructive operations.
- Add domain clustering suggestions without automatically rearranging the actual Chrome tab strip.
- Add recently closed restore with the optional `sessions` permission.

## Testing Plan

Unit test pure logic:

- Tab Eagle tab URL filtering.
- Domain normalization.
- Position sort.
- Domain sort.
- Origin indicator persistence.
- Empty state behavior.

Manual Chrome testing:

1. Load unpacked extension from `chrome://extensions`.
2. Open several tabs across domains.
3. Click the toolbar action.
4. Confirm Tab Eagle opens as a full-viewport extension page in a Chrome tab.
5. Confirm the Tab Eagle tab is not shown as a card.
6. Confirm the source tab is marked as the origin tab.
7. Toggle `By Position` and `By Domain`.
8. Click a tab card and confirm Chrome activates that tab while leaving the Tab Eagle tab open in the tab strip.
9. Close content tabs from their card close buttons.
10. Use "Return to origin" and confirm Chrome activates the origin tab while leaving Tab Eagle open in the tab strip.
12. Confirm no host permission warning appears.
13. Record the exact `tabs` permission install warning.

Automated unpacked-extension testing:

- Load the built `dist/` extension in Chrome with Playwright or Puppeteer.
- Verify toolbar action opens `eagle/index.html`.
- Verify CSP has no inline-script, eval, CDN, or blocked asset console errors.
- Verify service-worker restart does not break existing Tab Eagle tab reuse.
- Verify duplicate toolbar clicks do not create duplicate Tab Eagle tabs for the same window.
- Verify stale tab close and card activation failures recover by refreshing from Chrome.
- Verify tabs moved between windows enter or leave the managed list correctly.

Regression cases:

- Source tab closed before Tab Eagle initializes.
- A managed tab closed externally.
- Last managed tab closed.
- Pinned tabs.
- `chrome://` tabs.
- Tabs moved between windows while Tab Eagle is open.
- Multiple Chrome windows with one Tab Eagle tab per window.

## Delivery Milestones

1. Scaffold MV3 extension, build tooling, and local Material Web bundle.
2. Implement toolbar action opening and existing-Tab-Eagle-tab reuse.
3. Implement tab query, Tab Eagle tab filtering, and source-tab origin tracking.
4. Build full-viewport M3-styled layout and tab cards.
5. Implement sort toggle and persisted preference.
6. Implement card close behavior.
7. Implement direct card open while keeping Tab Eagle open.
8. Add live tab event refresh.
9. Add unit tests for pure tab model logic.
10. Manual QA in Chrome with permission review.

## Open Product Decisions

- Should Tab Eagle open next to the source tab or at the end of the tab strip?
- Should pinned tabs appear first regardless of sort mode?
