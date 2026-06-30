# Tab Eagle User Stories

## Implemented

1. As a user, I want to click the extension button and open a full-viewport Tab Eagle view in a Chrome tab so I can manage my tabs in a focused workspace.

2. As a macOS user, I want to press Command+Shift+E to open Tab Eagle so it feels like the eagle equivalent of Chrome's tab search shortcut.

3. As a user, I want Command+Shift+E to hide Tab Eagle when Tab Eagle is already active so I can quickly return to the tab I came from.

4. As a user, I want to see all tabs from the current Chrome window in tab bar order so the view matches what I already see in the browser.

5. As a user, I do not want the Tab Eagle tab itself to appear as a manageable tab card so I cannot accidentally close the tool from inside itself.

6. As a user, I want each tab card to show the favicon, domain, and page title so I can quickly identify tabs.

7. As a user, I want tabs without a usable favicon to show a stable fallback icon so missing icons do not break the card layout.

8. As a user, I want the tab I came from to be marked in Tab Eagle so I always know where I started.

9. As a user, I want an explicit way to leave Tab Eagle and return to the tab I came from if I decide not to switch tabs.

10. As a user, I want to click a tab card to jump directly to that tab while keeping the Tab Eagle tab open so switching tabs is fast and I can pin Tab Eagle if I want.

11. As a user, I want to click an X on a tab card to close that tab so I can clean up tabs from Tab Eagle.

12. As a user, when I close a tab from Tab Eagle, I want Tab Eagle to stay active so I can continue managing tabs without an unexpected browser-level tab switch.

13. As a user, I want closed tabs to disappear immediately from the view so Tab Eagle reflects the current tab state.

14. As a user, I want tab cards to use stable sizing and close-button placement so I can close multiple tabs quickly without chasing the X.

15. As a user, I want Tab Eagle to refresh when tabs are opened, closed, moved, or updated so the view reflects the current Chrome window.

16. As a user, I want newly opened or moved tabs to appear in the correct place so the view stays accurate.

17. As a user, I want to search tabs by title or URL from the search field so I can quickly narrow a large tab set.

18. As a user, I want to type anywhere in Tab Eagle to search without manually focusing the search field so search feels immediate.

19. As a user, I want search to ignore URL noise such as `https://` and `www.` so the terms I naturally type match the tabs I expect.

20. As a user, I want to toggle between Position, Domain, and Recent sorting so I can view tabs by browser order, website, or attention.

21. As a user, I want to click Recent once for recently used tabs and click it again for least recently used tabs so I can manage tabs by attention without adding another sort segment.

22. As a user, I want the extension to remember my chosen ordering mode so I do not have to reset it every time I open Tab Eagle.

23. As a user, I want domain sorting to be continuous without extra section headers so Tab Eagle stays simple.

24. As a user, I want domain-sorted cards to use colors derived from each domain's favicon so sites are easier to scan visually.

25. As a user, I want tab cards to show when a tab was last accessed in human-readable age format so I can find tabs I have not used recently.

26. As a user, I want age-sorted cards to show a subtle blue tint when used in the last 5 minutes, stay neutral until 1 hour, and become progressively warmer after 1 hour, 6 hours, 1 day, 3 days, and 1 week so neglected tabs stand out without adding extra labels.

27. As a user, I want to add any normal web tab to Chrome's Reading List from its tab card so I can save it for later before closing or switching away.

28. As a user, I want pinned tabs to show their pinned state instead of a Reading List action so mutually exclusive card actions do not shift the card shape.

29. As a user, I want the extension to avoid requesting access to all site data so I can trust that it is only managing tabs, not reading page contents.

30. As a user, I want Tab Eagle to avoid sending my tab data to any developer-operated server so my tab overview stays local in Chrome.

## Upcoming

1. As a user, I want tab cards to show useful tab state such as audible, muted, loading, discarded, frozen, or grouped so I can understand which tabs need attention.

2. As a user, I want to filter tabs by state such as audible, pinned, muted, unloaded, or grouped so I can quickly find tabs with a specific behavior.

3. As a user, I want to see existing Chrome tab group information such as group title and color so Tab Eagle reflects organization I already made in Chrome.

4. As a user, I want to perform common tab actions from each card, such as pin, mute, duplicate, discard, or close, so I can manage tabs without using the tab strip.

5. As a user, I want bulk actions for a domain, such as closing all tabs from that domain or keeping one and closing the rest, so I can clean up repeated tabs quickly.

6. As a user, I want the extension to suggest domain clusters without automatically rearranging my actual Chrome tabs so I can review organization before applying changes.

7. As a user, I want to see recently closed tabs and restore them from Tab Eagle so accidental closes are easy to undo.

8. As a user, I want richer tab information to be added without requesting access to all site data so the extension remains privacy-conscious as it grows.
