# Chrome Web Store Submission

This file contains copy and checklist items for publishing Tab Eagle to the Chrome Web Store.

## Package

Build and zip the extension from the `dist` folder. The `manifest.json` file must be at the root of the ZIP.

GitHub Actions builds and packages the extension automatically. Push a matching version tag such as `v0.1.0` to create or update a GitHub Release with `tab-eagle-0.1.0.zip` attached.

```sh
npm run typecheck
npm test
npm run build
cd dist
zip -r ../tab-eagle-0.1.0.zip .
```

## Store Listing

### Name

Tab Eagle

### Short Description

A zoomable bird's-eye view of tabs across your Chrome windows.

### Detailed Description

Tab Eagle gives you a fast full-screen map of the tabs across all your normal Chrome windows. It opens centered on the window you came from, then lets you zoom out to see the complete browser.

Search across windows by title or URL, drag tabs between windows, sort each window by position, domain, or recent activity, jump directly to a tab, close tabs from the map, and add eligible pages to Chrome's built-in Reading List.

Tab Eagle is built for people who keep many tabs open and need a calmer way to find, triage, and clean them up. It does not request access to all data on all websites, does not use host permissions, and does not send your tab data to any developer-operated server.

Key features:

- Zoomable multi-window tab map
- Cross-window type-to-search by tab title or URL
- Drag and drop tabs within or between windows
- Sorting inside each window by tab position, domain, newest used, or oldest used
- Visual color treatments for domain and recent-activity sorting
- Click a tab card to activate that tab
- Close tabs directly from the overview
- Add eligible pages to Chrome Reading List
- Keyboard shortcut support with Command+Shift+E on macOS

### Category

Productivity

### Language

English

### Homepage URL

https://github.com/pcomans/tab-eagle

### Support URL

https://github.com/pcomans/tab-eagle/issues

### Privacy Policy URL

Use the hosted version of `PRIVACY.md`, for example:

https://github.com/pcomans/tab-eagle/blob/main/PRIVACY.md

## Privacy Tab

### Single Purpose

Tab Eagle provides a full-screen multi-window map for searching, sorting, moving, opening, closing, and saving Chrome tabs.

### Permission Justifications

`tabs`

Required to list, move, activate, close, and read metadata for tabs across the user's Chrome windows.

`storage`

Required to save the user's preferred sort mode locally and session window labels in extension session storage.

`readingList`

Required to add eligible pages to Chrome's built-in Reading List and detect whether a page is already saved.

`favicon`

Required to display tab favicons and derive local card colors from favicons.

### Remote Code

No. Tab Eagle does not load or execute remotely hosted code. The extension logic is packaged with the extension.

### User Data Disclosure

Tab Eagle processes tab titles, URLs, pending URLs, favicons, tab metadata, last-accessed timestamps, and Reading List URLs locally in the browser to provide tab search, sorting, display, opening, closing, and Reading List actions.

Tab Eagle does not sell, rent, share, transfer, or transmit this data to any developer-operated server.

Tab Eagle stores the user's preferred sort mode in local Chrome extension storage and user-created window labels in session storage. Session labels clear when Chrome restarts.

### Limited Use Certification

Tab Eagle's use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. The developer does not collect user data. Information handled by the extension stays local in Chrome and is used only by the extension to provide Tab Eagle's single tab-management purpose.

## Distribution

Recommended first release visibility: Unlisted.

Reason: this allows testing the Chrome Web Store install flow before making the listing publicly discoverable. Chrome applies the same review requirements to public, unlisted, and private listings.

Recommended region setting: All regions.

No in-app purchases.

## Reviewer Test Instructions

Click the extension action or press Command+Shift+E. Tab Eagle opens a full-screen map centered on the current Chrome window.

Test flow:

1. Scroll or use the zoom controls to move between the invoking window and the all-window overview.
2. Type in the search field or type directly on the page to highlight matching tabs across windows.
3. Drag a tab onto another window or between two tabs.
4. Click a window title to save a session label.
5. Click Position, Domain, or Recent to change the ordering inside every window.
6. Click Recent again to toggle newest-first and oldest-first.
7. Zoom into a window, then click a tab card to activate it or use its close and Reading List actions.
8. Click Return to origin to return to the tab that opened Tab Eagle.

Expected behavior:

- Tab Eagle does not request host permissions.
- Tab Eagle does not request access to all data on all websites.
- Tab Eagle works using Chrome's tab, storage, Reading List, and favicon APIs.

## Required Assets

Already in the repo:

- `public/icons/icon16.png`
- `public/icons/icon32.png`
- `public/icons/icon48.png`
- `public/icons/icon128.png`
- `store-assets/icons/tab-eagle-store-icon-128.png`
- `store-assets/icons/tab-eagle-store-icon-512.png`
- `store-assets/icons/tab-eagle-store-icon-1024.png`
- `store-assets/screenshots/01-overview.png`
- `store-assets/screenshots/02-type-to-search.png`
- `store-assets/screenshots/03-domain-sort.png`
- `store-assets/screenshots/04-recent-sort.png`
- `store-assets/promo/small-promo-tile-440x280.png`
- `store-assets/promo/marquee-promo-tile-1400x560.png`
- `store-assets/social/github-social-preview.png`

Chrome Web Store screenshots:

- `store-assets/screenshots/01-overview.png`: default overview
- `store-assets/screenshots/02-type-to-search.png`: type-to-search filtering
- `store-assets/screenshots/03-domain-sort.png`: domain sorting with card colors
- `store-assets/screenshots/04-recent-sort.png`: recent sorting with age colors

All screenshots are 1280x800.

Optional:

- 920x680 marquee promotional tile

## Pre-Submission Checklist

- Build passes: `npm run build`
- Typecheck passes: `npm run typecheck`
- Tests pass: `npm test`
- ZIP contains `manifest.json` at the root
- No remote JavaScript
- No host permissions
- Privacy policy URL is public
- Screenshots are current and show the new Tab Eagle logo
- Store description clearly states the single tab-management purpose
