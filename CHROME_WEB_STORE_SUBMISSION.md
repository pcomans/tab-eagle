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

A bird's-eye view of your Chrome tabs.

### Detailed Description

Tab Eagle gives you a fast full-screen overview of the tabs in your current Chrome window.

Search by title or URL, sort tabs by position, domain, or recent activity, jump directly to a tab, close tabs from the grid, and add eligible pages to Chrome's built-in Reading List.

Tab Eagle is built for people who keep many tabs open and need a calmer way to find, triage, and clean them up. It does not request access to all data on all websites, does not use host permissions, and does not send your tab data to any developer-operated server.

Key features:

- Full-screen tab overview
- Type-to-search by tab title or URL
- Sorting by tab position, domain, newest used, or oldest used
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

Tab Eagle provides a full-screen overview for searching, sorting, opening, closing, and saving Chrome tabs.

### Permission Justifications

`tabs`

Required to list, activate, close, and read metadata for tabs in the current Chrome window.

`storage`

Required to save the user's preferred sort mode locally.

`readingList`

Required to add eligible pages to Chrome's built-in Reading List and detect whether a page is already saved.

`favicon`

Required to display tab favicons and derive local card colors from favicons.

### Remote Code

No. Tab Eagle does not load or execute remotely hosted code. The extension logic is packaged with the extension.

### User Data Disclosure

Tab Eagle processes tab titles, URLs, pending URLs, favicons, tab metadata, last-accessed timestamps, and Reading List URLs locally in the browser to provide tab search, sorting, display, opening, closing, and Reading List actions.

Tab Eagle does not sell, rent, share, transfer, or transmit this data to any developer-operated server.

Tab Eagle stores only the user's preferred sort mode in local Chrome extension storage.

### Limited Use Certification

Tab Eagle's use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. The developer does not collect user data. Information handled by the extension stays local in Chrome and is used only by the extension to provide Tab Eagle's single tab-management purpose.

## Distribution

Recommended first release visibility: Unlisted.

Reason: this allows testing the Chrome Web Store install flow before making the listing publicly discoverable. Chrome applies the same review requirements to public, unlisted, and private listings.

Recommended region setting: All regions.

No in-app purchases.

## Reviewer Test Instructions

Click the extension action or press Command+Shift+E. Tab Eagle opens a full-screen tab overview for the current Chrome window.

Test flow:

1. Type in the search field or type directly on the page to filter tabs by title or URL.
2. Click Position, Domain, or Recent to change the sort order.
3. Click Recent again to toggle newest-first and oldest-first.
4. Click a tab card to activate that tab.
5. Click X on a tab card to close that tab.
6. Click Read later on an eligible tab to add it to Chrome Reading List.
7. Click Return to origin to return to the tab that opened Tab Eagle.

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
- `store-assets/redrawn/redrawn-master-16.png`
- `store-assets/screenshots/01-overview.png`
- `store-assets/screenshots/02-type-to-search.png`
- `store-assets/screenshots/03-domain-sort.png`
- `store-assets/screenshots/04-recent-sort.png`
- `store-assets/promo/small-promo-tile-440x280.png`
- `store-assets/promo/marquee-promo-tile-1400x560.png`

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
