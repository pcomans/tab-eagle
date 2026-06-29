# Tab Eagle QA Report

Date: 2026-06-29

Build tested: `/Users/philipp/Documents/Tab Expose/dist`

Chrome profile: current user Chrome session

## Summary

Tab Eagle loads successfully as an unpacked Manifest V3 extension. The current direct-open flow works: the toolbar action opens the full-tab Tab Eagle view, cards list the current window's tabs, the Tab Eagle tab is excluded, clicking a card activates that tab, and the Tab Eagle tab remains open in the tab strip. The separate `Open selected tab` button has been removed.

The origin marker is now a compact inline `Origin` metadata item. The prior left-edge rail was a custom visual treatment, not a Material Web component, and has been removed.

The 2026-06-29 MD3 visual refresh replaced the green palette with a sky-blue accent system, neutralized the page/card surfaces, switched sorting to Material Web outlined segmented buttons, replaced passive status pills with inline icon-and-label metadata, added stronger card hover/press affordance, and changed card close controls to Material Web `md-icon-button`.

The main remaining UX caveat is close-button stability in the grid: each card has a stable close button placement, but after a card is removed, the compacting grid reflows, so the next close button is not guaranteed to remain under the pointer.

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

Earlier exploratory screenshots are still in `qa-screenshots/`, but screenshot 20 reflects the current sky-blue MD3 revision with inline status metadata.

## Results By MVP Story

1. Open full-viewport Tab Eagle view: Pass. Loaded from the pinned Chrome toolbar extension action and opened a full-tab extension page.

2. Show all tabs from current Chrome window in tab order: Pass. In `By Position`, the disposable test tabs appeared in browser tab-strip order, excluding Tab Eagle itself.

3. Mark the tab I came from: Pass. The source `Example Domain` tab showed an inline `Origin` metadata item with no left-edge rail.

4. Refresh when tabs are opened, closed, moved, or updated: Partial. Closing a tab refreshed immediately. Moved-tab behavior between windows was not retested in this pass.

5. Do not show the Tab Eagle tab as a manageable card: Pass. The Chrome tab strip showed Tab Eagle, but the card grid excluded it and counted only content tabs.

6. Show favicon, domain, and title: Pass. Cards showed favicon or fallback, normalized domain, and title.

7. Click card to jump directly to that tab while keeping Tab Eagle open: Pass. Clicking the Wikipedia card activated that tab, and Tab Eagle remained open in the tab strip.

8. Click X to close tab: Pass. The IANA card close button closed only the disposable IANA tab.

9. Stable card sizing and close placement: Partial. Card sizes and Material icon close buttons are stable within each card. The compacting grid still reflows after close.

10. Toggle By Position / By Domain: Pass. Both sort modes worked through the Material Web outlined segmented button control.

11. Domain sorting continuous without headings: Pass. Domain-sorted cards stayed in one continuous grid.

12. Avoid all-site data access: Pass. Chrome showed `This extension has no additional site access`. The `tabs` permission still appears as `Read your browsing history`.

13. Explicit way to return to origin: Pass. `Return to origin` activated the origin tab and left Tab Eagle open.

14. Closed tabs disappear immediately: Pass. The closed IANA card disappeared promptly and the tab count changed from 4 to 3.

15. Newly opened/moved tabs appear correctly: Partial. Newly opened tabs were verified in the earlier pass; moved-tab behavior was not retested in this pass.

16. Remember chosen ordering mode: Pass. The previously chosen `By Domain` mode persisted after reloading the extension.

17. Closing a tab keeps Tab Eagle active: Pass. Closing the IANA tab from its card kept Tab Eagle active.

18. Closed tab disappears immediately: Pass. Covered by story 14.

## Verification Commands

- `npm run typecheck`
- `npm test`
- `npm run build`

All passed on 2026-06-29.
