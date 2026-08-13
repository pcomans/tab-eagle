# Deterministic signals for a scattered work context

Research for [issue #9](https://github.com/pcomans/tab-eagle/issues/9), 2026-08-13.

## Decision summary

No Chrome field deterministically says that two tabs belong to the same work context. Tab Eagle should not try to cluster every open tab globally. The promising deterministic design is a **seeded, explainable evidence graph**:

1. Start with a tab the user remembers, selects, or finds through search.
2. Retrieve candidates connected by explicit user structure, browser provenance, or resource similarity.
3. Use recency and window position only to rank those candidates.
4. Show the strongest concrete reasons for each candidate and let the user correct the set.
5. Persist only user-confirmed associations and exclusions as durable evidence.

The first experiment does **not** need an LLM, page-content access, browser history, or navigation monitoring. [Tab Eagle's existing manifest](../../public/manifest.json) already grants `tabs` and `storage`, which expose enough to test whether deterministic support helps: title, URL, window and position, `lastAccessed`, live `openerTabId`, group membership, and Tab Eagle's own confirmed actions. Chrome tab-group titles would require the additional `tabGroups` permission. [Chrome documents the sensitive tab fields exposed by the `tabs` permission](https://developer.chrome.com/docs/extensions/reference/api/tabs#permissions), and [the `tabGroups` API requires its own permission](https://developer.chrome.com/docs/extensions/reference/api/tabGroups#permissions).

## What Chrome exposes now

The `chrome.tabs.Tab` object provides the last committed URL, title, parent window, tab-strip index, group ID, whether the tab is active, its last activation time, and—in some cases—the ID of the tab that opened it. `lastAccessed` means the last time a tab became active **in its window**; `active` does not imply that the window itself is focused. `openerTabId` disappears when the opener no longer exists. Tab, window, and group IDs are only unique within a browser session. [Chrome Tabs API: `Tab`](https://developer.chrome.com/docs/extensions/reference/api/tabs#type-Tab), [Chrome Windows API: `Window`](https://developer.chrome.com/docs/extensions/reference/api/windows#type-Window), [Chrome Tab Groups API: `TabGroup`](https://developer.chrome.com/docs/extensions/reference/api/tabGroups#type-TabGroup).

This creates three important boundaries:

- The currently active tab in every window is observable, but only one Chrome window is focused. A background window's active tab is not proof that it is part of the user's present focus.
- Chrome exposes window bounds and focus but no macOS Space identifier. Therefore, Tab Eagle cannot know from the extension API whether two windows are visible side by side in one Space or isolated in different Spaces. This is an inference from the complete documented `Window` property set, which includes bounds, state, focus, and tabs but no virtual-desktop/Space field. [Chrome Windows API: `Window`](https://developer.chrome.com/docs/extensions/reference/api/windows#type-Window).
- Chrome's extension-facing `Window` also has no user-visible name/title field and the API does not specify a semantic ordering for the array returned by `windows.getAll()`. Tab Eagle can maintain its own names and stable visual order, but neither is evidence supplied by Chrome.
- Session-scoped IDs are useful for live evidence but cannot be durable work-context identity. Durable memory needs resource keys derived from URLs plus user-confirmed state in `chrome.storage`. Chrome describes extension storage as persistent across cache and browsing-history clearing; `storage.local` is removed only with the extension. [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage#concepts_and_usage), [storage areas](https://developer.chrome.com/docs/extensions/reference/api/storage#storage-areas).

## Signal evaluation

The ratings below describe evidence that a tab belongs to a **seeded** work context, not evidence that two resources are duplicates.

| Signal | Value | Likely false positives or missing evidence | Explanation Tab Eagle can show |
| --- | --- | --- | --- |
| **User-confirmed Tab Eagle action**—gathered with, moved into the same confirmed arrangement, saved/set aside together, or explicitly excluded | **Very strong** | A context can evolve; a tab may have navigated since confirmation. A move performed outside Tab Eagle cannot safely be attributed to the user because Chrome move events do not identify the actor. | “You gathered this with the TDD work context.” / “You previously removed this from this context.” |
| **Chrome tab-group membership** | **Strong when the group was deliberately created; otherwise medium** | Groups may be broad holding areas, stale, unnamed, or contain several activities. Group IDs last only for the browser session. Color has no intrinsic semantics. | “In the Chrome group ‘TDD’ with this tab.” |
| **Live opener relationship** | **Strong provenance, medium context evidence** | Link exploration can cross topics; `openerTabId` is present only while the opener still exists. The relationship should be captured when observed if it is to survive opener closure. | “Opened from this PR.” |
| **Exact normalized resource URL** | **Very strong evidence of the same resource; only medium context evidence** | One resource—Gmail, Calendar, a dashboard—may support several work contexts. Fragments and query parameters can encode real application state, so generic stripping can merge different resources. | “The same PR is already open in another window.” |
| **Application-specific resource key in the URL**—for example GitHub owner/repo and PR number, a document ID, or a dashboard ID | **Strong when the parser is trustworthy** | Generic path-token matching confuses common routes such as `/settings`, `/issues`, or account home pages. IDs can be opaque and unrelated across different services. | “Same GitHub repository and pull request.” / “Same Datadog dashboard.” |
| **Title token overlap** after removing site boilerplate | **Medium as a supporting signal** | Titles are mutable, truncated, localized, full of generic terms (“Dashboard”, “Docs”), and can contain unread counts or account names. Similar wording across different domains may be coincidental. | “Both titles mention ‘TDD architecture’.” |
| **Same registrable domain/origin** | **Weak** | High false-positive rate for broad tools such as GitHub, Google Docs, Gmail, Datadog, and localhost. Subdomains can represent tenants; one origin can hold unrelated activities. | “Also on github.com.” Never present this alone as a recommendation. |
| **Activation recency and temporal proximity** | **Weak ranking evidence** | `lastAccessed` measures becoming active, not reading, editing, or duration. Incidental checks and always-open utility tabs look recent. Tabs used in the same activity may be hours or days apart. | “Used 12 minutes after the seed tab.” |
| **Same Chrome window** | **Weak prior** | A window may contain several work contexts, while one work context commonly spans two side-by-side windows. Sprawl itself makes window membership unreliable. | “Currently in the same window.” Do not equate a window with a work context. |
| **Adjacent tab-strip position** | **Very weak tie-breaker** | New tabs often appear near their opener, but manual movement, sorting, pinned tabs, and accumulated sprawl quickly destroy this signal. | “Next to the seed tab in Chrome.” Usually omit from user-facing evidence unless combined with a stronger reason. |
| **Active, pinned, audible, discarded** | **Status, not membership** | Pinned tabs are often evergreen utilities; audibility indicates media, not subject; discarded means unloaded; one active tab exists in every window even when that window is not focused. | Useful filters such as “currently active” or “playing audio,” not context claims. |
| **Highlighted tabs** | **Strong only when used as an explicit selection gesture** | Highlighting is temporary and uncommon in normal browsing. It says the tabs were selected together, not why. | “You selected these tabs together.” |

The underlying fields and limitations above come from the [Tabs API `Tab` definition](https://developer.chrome.com/docs/extensions/reference/api/tabs#type-Tab). Chrome also exposes `onActivated`, `onAttached`, `onDetached`, `onMoved`, `onHighlighted`, and `onUpdated` events, so Tab Eagle can maintain live evidence without polling. Move events report what moved but not which extension or person caused it; Tab Eagle should separately record operations it initiates. [Chrome Tabs API events](https://developer.chrome.com/docs/extensions/reference/api/tabs#events).

### Important distinctions

**Same resource is not the same work context.** Exact URLs are excellent for deduplication and for finding another view of a known resource. They do not prove that an evergreen Gmail, Calendar, or dashboard tab belongs in the recovered context.

**A Chrome group is explicit organization, not a universal context boundary.** A named group should rank highly, but Tab Eagle should not silently import an entire group when the seed points to only part of it. Chrome exposes a group's title, color, collapsed state, and containing window; only the title and membership provide plausible semantic evidence. Group IDs are session-scoped. [Chrome Tab Groups API](https://developer.chrome.com/docs/extensions/reference/api/tabGroups#type-TabGroup).

**Window geometry cannot substitute for macOS Space awareness.** Two windows with complementary bounds may be side by side, on different displays, or in different Spaces with identical coordinates. Use geometry to preserve visual layout, not to infer work-context membership.

## Recommended deterministic retrieval design

### 1. Require a seed

The strongest seed is the tab selected from a remembered search (“the TDD doc”), followed by the tab from which Tab Eagle was invoked. A free-text query can also seed URL/title token extraction. This avoids the much harder and less useful problem of globally clustering every open tab before the user expresses intent.

### 2. Build an evidence graph, not one opaque score

Represent each live tab as a node. Store typed edges such as:

- `confirmed-with` / `confirmed-not-with`
- `same-chrome-group`
- `opened-from`
- `same-exact-resource`
- `same-resource-entity`
- `shared-title-token`
- `same-window`
- `used-nearby-in-time`

Keep the reasons, not just a confidence number. A candidate can then be explained by its two or three strongest independent edges. This also makes errors diagnosable during the experiment.

### 3. Apply evidence tiers

- **Include as a high-confidence candidate:** user-confirmed association, or a named Chrome group containing the seed.
- **Promote strongly:** live opener relation, exact resource, or a trustworthy application-specific resource key.
- **Require combination:** title similarity, recency, and window membership. Two independent weak signals may rank a tab; no single weak signal should create a recommendation.
- **Use only as tie-breakers:** domain, adjacency, pinned/audible/discarded state.
- **Suppress:** explicit user exclusion. A rejected candidate should remain excluded for that remembered work context until its resource identity materially changes or the user reverses the decision.

This is intentionally a rule system rather than a learned model. The first experiment needs understandable failures more than optimal weights.

### 4. Make evidence visible at the point of choice

Good explanations are concrete and resource-specific:

- “Opened from **PR #412**.”
- “Same Chrome group: **TDD**.”
- “Same GitHub repo, used 18 minutes later.”
- “You gathered this with these tabs last Tuesday.”

Avoid generic labels such as “related,” “AI suggestion,” or a bare percentage. They make correction harder and do not teach which deterministic signal failed.

### 5. Learn only from unambiguous Tab Eagle actions initially

Persist these locally:

- user confirms a proposed recovery set;
- user adds or removes a tab before gathering;
- user gathers/moves tabs together through Tab Eagle;
- user deliberately saves or sets aside a work context;
- user reverses one of those operations.

Do not initially infer durable association merely because the user activates a search result, because tabs happen to coexist in a window, or because Chrome fires a move event. Those actions have plausible non-context explanations.

Because tab and window IDs expire with the browser session, persist a conservative resource fingerprint: origin plus a service-specific entity key where available, otherwise the full normalized URL. Store the observed title only as supporting display data, not identity.

## Signals available only with broader permissions

These are technically possible but should not be in the first experiment.

### Browser history

The `history` permission exposes visit time, visit count, typed count, transition type, and `referringVisitId`. A referrer graph can recover provenance after the opener tab closes, and transition types distinguish link clicks from typed or generated navigation. However, it grants access to the user's browser-wide history, can include synced visits, and maps browsing provenance rather than work-context intent. It also creates many false links through search results, documentation hubs, and authentication redirects. [Chrome History API](https://developer.chrome.com/docs/extensions/reference/api/history), [`VisitItem`](https://developer.chrome.com/docs/extensions/reference/api/history#type-VisitItem).

Recommendation: add history only if the opener graph proves materially valuable but too incomplete in real use. Evaluate it as a separate permission and product decision.

### Live navigation monitoring

The `webNavigation` permission emits in-flight navigation events and records transition types/qualifiers such as link, typed, reload, redirects, back/forward, and address-bar navigation. It could preserve per-tab navigation provenance from the time the extension begins observing, but it does not reconstruct older relationships and still does not express work-context intent. [Chrome Web Navigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation), [transition types and qualifiers](https://developer.chrome.com/docs/extensions/reference/api/webNavigation#transition-types-and-qualifiers).

Recommendation: do not add it for the first context-recovery experiment. Capture `openerTabId` plus Tab Eagle actions first.

### Recently closed tabs and windows

The `sessions` permission can return and restore recently closed tabs/windows, including a `lastModified` time. Chrome caps a returned list at 25 sessions. This is useful for later work-context persistence and undo, not for classifying currently scattered tabs. [Chrome Sessions API](https://developer.chrome.com/docs/extensions/reference/api/sessions), [`getRecentlyClosed`](https://developer.chrome.com/docs/extensions/reference/api/sessions#method-getRecentlyClosed).

Recommendation: treat sessions as a separate persistence experiment after recovery of still-open tabs works.

## First experiment

Build a local, deterministic “recover around this tab” prototype using only existing permissions, optionally adding `tabGroups` if group titles materially improve explanations.

For each real invocation over several days:

1. The user finds or selects one remembered tab.
2. Tab Eagle proposes at most a small first set, ordered by evidence tier.
3. Every candidate shows one or two reasons.
4. The user adds/removes candidates and confirms the gather operation.
5. Record locally which proposed tabs were accepted, rejected, or manually added and which evidence produced each candidate.

The experiment should answer:

- Do deterministic candidates recover enough of the work context to resume focus?
- Which evidence types repeatedly earn acceptance?
- Which false positives create cognitive effort?
- Are relevant tabs primarily missed because their titles/URLs differ, because opener evidence disappeared, or because the work context was never explicitly represented?
- Does user-confirmed memory improve the next recovery without creating stale associations?

Only if the misses are genuinely semantic after this experiment should Tab Eagle investigate an LLM. The deterministic layer would remain useful even then: it supplies candidate generation, explainable evidence, negative constraints, and a way to evaluate whether semantic assistance adds value.

## Conclusion

The most useful deterministic signal is not domain similarity or recency; it is **remembered user intent captured by Tab Eagle**, supported by Chrome's explicit structure and provenance. A practical priority order is:

1. user-confirmed association or exclusion;
2. named Chrome group;
3. live opener relationship;
4. exact or application-specific resource identity;
5. title similarity combined with recency or structure;
6. domain, window, position, and status only as ranking hints.

This should be enough to test work-context recovery without AI and without requesting broad new access. It also produces explanations the user can verify quickly, which is essential when the goal is to get back to focus rather than manage another suggestion inbox.
