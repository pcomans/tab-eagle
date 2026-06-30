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

1. As a user, I want a collapsed tab group to appear as one regular-size grid card so closed groups fit naturally beside normal tab cards.

2. As a user, I want each collapsed group card to show the Chrome tab group title, color, and tab count so I can recognize it quickly.

3. As a user, I want a collapsed group card to include a compact preview of its contents, such as favicon stack or representative titles, so it still feels like a folder.

4. As a user, I want ungrouped tabs to remain visible outside group cards and expanded group areas so every tab still has an obvious place in the overview.

5. As a user, I want to open and close group folders in Tab Eagle so I can expand a group when I need detail and collapse it when I want a cleaner overview.

6. As a user, I want opening a group to expand it inline in the current grid rather than in a modal or pop-up so the overview stays in one workspace.

7. As a user, I want an expanded group to start on a new grid row and end before the next ungrouped tab or group so the group reads as one coherent folder-like block.

8. As a user, I want tabs inside an expanded group to remain regular tab cards so they keep the same click, close, Reading List, and metadata behavior as ungrouped tabs.

9. As a user, I want expanded group tabs to sit on a subtle unifying background or boundary so I can see which cards belong to the group without changing card shape.

10. As a user, I want an expanded group to have one clear collapse affordance in its group header so the group can be closed without adding repeated controls to every card.

11. As a user, I want Tab Eagle to respect Chrome's collapsed or expanded group state when possible so the overview matches the browser's organization.

12. As a user, I want to click a collapsed group card to open it in Tab Eagle without activating a content tab so inspecting a group does not interrupt my current tab.

13. As a user, I want to click a tab card inside an expanded group to activate that tab while leaving Tab Eagle open so grouped tabs behave like regular tabs.

14. As a user, I want to drag a tab card into a group card or expanded group area so I can add that tab to the existing Chrome tab group.

15. As a user, I want to drag a tab card out of an expanded group into the ungrouped area so I can remove it from the Chrome tab group.

16. As a user, I want to drag a tab card from one group into another group so I can move tabs between Chrome tab groups.

17. As a user, I want a collapsed group card or expanded group area to show a clear drop target while I drag over it so I know where the tab will land before I release it.

18. As a user, I want dropping onto a collapsed group card to be enough to add the tab to that group so I do not have to expand a group before using it as a drop target.

19. As a user, I want a collapsed group card to auto-expand after a short drag hover so I can choose a more precise position inside the group when needed.

20. As a user, I want Tab Eagle to update the actual Chrome tab group when I drag a tab in or out of a group so the browser tab strip and Tab Eagle stay in sync.

21. As a user, I want dragging tabs between groups to preserve a predictable tab order so groups do not become disorganized after a drop.

22. As a user, I want failed drag-and-drop group changes to revert visually and show a short error state so I am not left with a misleading view.

23. As a keyboard user, I want an accessible non-drag way to move a tab into or out of a group so tab grouping is not mouse-only.

24. As a user, I want search to auto-expand groups with matching tabs while search is active so collapsed groups do not hide useful results.

25. As a user, I want groups that were auto-expanded for search to return to their previous open or closed state when search is cleared so search does not permanently rearrange my view.

26. As a user, I want sorting by Position to preserve Chrome's tab group boundaries so grouped tabs do not get visually scattered.

27. As a user, I want sorting by Domain or Recent to sort tabs inside each group while keeping group membership visible so sorting does not visually pull tabs out of their folder.

28. As a user, I want empty groups to disappear when their last tab is removed so Tab Eagle stays aligned with Chrome's tab-backed group model.

29. As a user, I want tab cards to show useful tab state such as audible, muted, loading, discarded, frozen, or grouped so I can understand which tabs need attention.

30. As a user, I want to filter tabs by state such as audible, pinned, muted, unloaded, or grouped so I can quickly find tabs with a specific behavior.

31. As a user, I want to perform common tab actions from each card, such as pin, mute, duplicate, discard, or close, so I can manage tabs without using the tab strip.

32. As a user, I want bulk actions for a domain, such as closing all tabs from that domain or keeping one and closing the rest, so I can clean up repeated tabs quickly.

33. As a user, I want the extension to suggest domain clusters without automatically rearranging my actual Chrome tabs so I can review organization before applying changes.

34. As a user, I want to see recently closed tabs and restore them from Tab Eagle so accidental closes are easy to undo.

35. As a user, I want richer tab information to be added without requesting access to all site data so the extension remains privacy-conscious as it grows.
