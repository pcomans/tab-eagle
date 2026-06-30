# Tab Eagle QA Report

Date: 2026-06-29

Build tested: `/Users/philipp/Documents/Tab Expose/dist`

Chrome profile: current user Chrome session

## Summary

Tab Eagle loads successfully as an unpacked Manifest V3 extension. The current direct-open flow works: the toolbar action opens the full-tab Tab Eagle view, cards list the current window's tabs, the Tab Eagle tab is excluded, clicking a card activates that tab, and the Tab Eagle tab remains open in the tab strip. The separate `Open selected tab` button has been removed.

The origin marker is now a compact inline `Origin` metadata item. The prior left-edge rail was a custom visual treatment, not a Material Web component, and has been removed.

The 2026-06-29 MD3 visual refresh replaced the green palette with a sky-blue accent system, neutralized the page/card surfaces, switched sorting to Material Web outlined segmented buttons, replaced passive status pills with inline icon-and-label metadata, added stronger card hover/press affordance, and changed card close controls to Material Web `md-icon-button`.

The multi-row close-button stability issue has been addressed with temporary hidden reserve slots. Visible cards still slide into the empty slot after a close, but the grid keeps its total height while the cursor remains inside the card grid, so removing enough tabs to eliminate a row no longer pulls the page upward under the cursor. Reserve slots release after the pointer leaves the grid.

Tab cards now reserve the same footer height across pinned and unpinned states. `Pinned`, `Origin`, and `Read later` share one left-aligned footer lane, so changing a tab between pinned and unpinned does not alter the card shape.

The attention-sorting update adds human-readable last-used ages to cards and extends the sort control to Position, Domain, and Recent. Clicking Recent again toggles between newest-first and oldest-first; Position and Domain do not toggle on repeated clicks. Local `file://` favicon URLs are filtered out before rendering so local-resource console warnings fall back to the letter tile instead of attempting a blocked load. Favicon image load failures also fall back to the same fixed-size letter tile.

The Domain sort color update uses Chrome's MV3 favicon endpoint and Material Color Utilities to derive Material role colors from favicons. Cards remain neutral in other sort modes. In Domain sort, each domain is tinted with MD3-generated `secondaryContainer` / `onSecondaryContainer` colors, with fallback to neutral cards when favicon extraction is unavailable.

The age sort color update adds Trello-inspired age buckets using Material Color Utilities instead of texture overlays. The Recent sort, in either direction, tints cards blue when used in the last 5 minutes, keeps cards neutral from 5 minutes to 1 hour, then warms cards after 1 hour, 6 hours, 1 day, 3 days, and 1 week. Age bucket colors use fixed Material HCT tones so the colored card surfaces have roughly consistent luminance across hues. Tabs with unknown access time remain neutral. Domain colors and age colors are mutually exclusive because they only apply in their respective sort modes.

The Reading List update adds an MD3 text button to each normal web tab card for saving it to Chrome's built-in Reading List. Pinned tabs keep the icon-and-label `Pinned` metadata in the footer and do not show `Read later`, since Chrome does not allow pinned tabs to be added to Reading List. The feature uses Chrome's `readingList` permission and does not add host permissions or all-site data access. After reloading the unpacked extension, Chrome showed the new `Read and change entries in the reading list` permission and still showed `This extension has no additional site access`.

The keyboard shortcut update binds the macOS suggested shortcut `Command+Shift+E` to Chrome's `_execute_action` command, which reuses the same toolbar-action path that opens Tab Eagle. When Tab Eagle is already active, the same shortcut hides it by activating the recorded source tab; if that source tab no longer exists, it falls back to another non-Eagle tab in the same window. If Chrome detects a local shortcut conflict, the user can inspect or remap the shortcut at `chrome://extensions/shortcuts`.

## Screenshots

- [12-direct-open-no-button-no-left-rail.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/12-direct-open-no-button-no-left-rail.png)
- [13-card-click-activates-tab-keeps-eagle.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/13-card-click-activates-tab-keeps-eagle.png)
- [14-close-card-refreshes-grid.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/14-close-card-refreshes-grid.png)
- [15-position-sort-after-close.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/15-position-sort-after-close.png)
- [16-sky-blue-md3-refresh.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/16-sky-blue-md3-refresh.png)
- [17-md3-close-button-after-close.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/17-md3-close-button-after-close.png)
- [18-material-segmented-control-position.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/18-material-segmented-control-position.png)
- [19-material-segmented-control-domain.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/19-material-segmented-control-domain.png)
- [20-inline-md3-status-metadata.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/20-inline-md3-status-metadata.png)
- [21-close-reserve-multi-row-before.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/21-close-reserve-multi-row-before.png)
- [22-close-reserve-multi-row-after.png](/Users/philipp/Documents/Tab Expose/qa-screenshots/22-close-reserve-multi-row-after.png)

Earlier exploratory screenshots are still in `qa-screenshots/`, but screenshots 21 and 22 reflect the current sky-blue MD3 revision with the multi-row close reserve behavior.

## Results By MVP Story

1. Open full-viewport Tab Eagle view: Pass. Loaded from the pinned Chrome toolbar extension action and opened a full-tab extension page.

2. Show all tabs from current Chrome window in tab order: Pass. In `By Position`, the disposable test tabs appeared in browser tab-strip order, excluding Tab Eagle itself.

3. Mark the tab I came from: Pass. The source `Example Domain` tab showed an inline `Origin` metadata item with no left-edge rail.

4. Refresh when tabs are opened, closed, moved, or updated: Partial. Closing a tab refreshed immediately. Moved-tab behavior between windows was not retested in this pass.

5. Do not show the Tab Eagle tab as a manageable card: Pass. The Chrome tab strip showed Tab Eagle, but the card grid excluded it and counted only content tabs.

6. Show favicon, domain, and title: Pass. Cards showed favicon or fallback, normalized domain, and title.

7. Click card to jump directly to that tab while keeping Tab Eagle open: Pass. Clicking the Wikipedia card activated that tab, and Tab Eagle remained open in the tab strip.

8. Click X to close tab: Pass. The IANA card close button closed only the disposable IANA tab.

9. Stable card sizing and close placement: Pass. Card sizes and Material icon close buttons are stable within each card. A 60-tab, five-column grid was tested by closing five cards from the same close-button coordinate; the count changed to 55 and the multi-row grid did not jump during the close burst.

10. Toggle Position / Domain / Recent: Pass by automated coverage. The Material Web outlined segmented button control exposes three visible modes. Unit tests verify that only Recent toggles on repeated clicks, switching between newest-first and oldest-first; repeated Position or Domain clicks keep the same mode.

11. Domain sorting continuous without headings: Pass. Domain-sorted cards stayed in one continuous grid.

12. Avoid all-site data access: Pass. The manifest has no host permissions. It uses `tabs`, `storage`, `readingList`, and `favicon`; the `tabs` permission still appears as `Read your browsing history`.

13. Explicit way to return to origin: Pass. `Return to origin` activated the origin tab and left Tab Eagle open.

14. Closed tabs disappear immediately: Pass. The closed IANA card disappeared promptly and the tab count changed from 4 to 3.

15. Newly opened/moved tabs appear correctly: Partial. Newly opened tabs were verified in the earlier pass; moved-tab behavior was not retested in this pass.

16. Remember chosen ordering mode: Pass. The previously chosen `By Domain` mode persisted after reloading the extension.

17. Closing a tab keeps Tab Eagle active: Pass. Closing the IANA tab from its card kept Tab Eagle active.

18. Closed tab disappears immediately: Pass. Covered by story 14.

19. Show human-readable last accessed age: Pass by automated coverage. Cards render Chrome's `lastAccessed` timestamp as compact age text such as `Last used just now`, `Last used 12m ago`, or `Last used 3d ago`; missing values show `Last used unknown`.

20. Sort by recently used or least recently used: Pass by automated coverage. Unit tests cover both timestamp sort directions, keep tabs without `lastAccessed` after tabs with known access times, and verify the Recent control toggles between the two directions when clicked repeatedly.

21. Avoid local favicon resource warnings and broken favicon UI: Pass. Unit tests verify `file://` favicon URLs are dropped before rendering, while web, data, and extension favicon URLs are preserved. Card rendering also listens for favicon image load failures and replaces the broken image with the fixed-size letter fallback.

22. Color domains from favicon in Domain sort: Pass. Unit tests verify MD3 role color generation from a source color and Chrome MV3 favicon endpoint construction. After reloading the unpacked extension and selecting Domain sort, cards were visibly tinted by domain while other sort modes remained neutral. Domain colors are requested only in Domain sort and cached per domain.

23. Color age-sorted cards with Trello-inspired age buckets: Pass by automated coverage. Unit tests verify that age coloring is enabled only for Recent sorting in either direction, with a blue bucket under 5 minutes, neutral cards from 5 minutes to 1 hour, warm buckets at 1 hour, 6 hours, 1 day, 3 days, and 1 week, and no separate 14-day bucket. The bucket colors are generated through Material Color Utilities, normalized to a shared HCT container tone, and applied through MD3 role variables.

24. Add tab to Chrome Reading List: Pass. Normal web tab cards render an icon-leading MD3 `md-text-button` in the same lower-left footer position as labels like `Pinned`; pinned tabs show only `Pinned`, making the states exclusive. The action calls `chrome.readingList.addEntry()` for normal `http` and `https` tabs, disables itself for non-web URLs, and shows a status message on success or failure. Live test used a disposable `https://example.com/?tab-eagle-test=1` tab; clicking `Read later` showed `Added to Reading List.` and changed the button to disabled `In Reading List`.

25. Toggle Tab Eagle with Command+Shift+E on macOS: Pass. The built Manifest V3 extension declares `_execute_action` with the macOS suggested key `Command+Shift+E`; after reloading the unpacked extension, pressing the shortcut from the extension details page opened Tab Eagle, and pressing it again while Tab Eagle was active returned to the recorded source tab while leaving the Tab Eagle tab open.

## Verification Commands

- `npm run typecheck`
- `npm test`
- `npm run build`

All passed on 2026-06-29.
