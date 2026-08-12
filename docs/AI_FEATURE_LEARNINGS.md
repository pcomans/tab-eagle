# AI feature learnings

This note records what we learned while prototyping AI-assisted organization for Tab Eagle. The implementation is intentionally deferred. The multi-window canvas should first prove that visibility, search, zoom, and direct manipulation solve the underlying problem.

## Product goal

The useful question is not “How can AI organize every tab?” It is:

> What was I doing, where did it spread, and how can I resume it without opening another copy?

For people whose tabs naturally sprawl across windows, a good system should reduce the executive-function cost of recovering context. It should not create a second inbox of suggestions that itself needs management.

## What worked in the prototype

### Treat windows as stable spatial clusters

The multi-window map was useful before AI was added. Windows give tabs a stable, user-created context. Keeping their positions stable across zoom levels helps people recognize where work lives without having to parse a list again.

### Use AI as a workstream lens

The strongest AI concept was “Pick up a thread.” A workstream lens can temporarily highlight related tabs across their existing windows while leaving the rest of the map visible. This supports resumption without destroying spatial memory.

A useful workstream view should answer:

- What is this thread?
- Which tabs and windows are involved?
- What is the clearest place to resume?
- Which tabs could be gathered if the user chooses?

### Gather and group was understandable

Gathering related tabs into a reviewed destination window and creating a named Chrome tab group felt concrete and useful. It converts an inferred relationship into a normal Chrome structure the user already understands.

The review must show:

- The actual current name of the destination window.
- Why that destination was selected, such as “four related tabs are already here.”
- Every tab that will move, grouped by its current window.
- The resulting Chrome group name.
- A way to exclude tabs and change the destination.
- Persistent undo after the move.

The prototype briefly showed a suggested destination name instead of the window’s real current name. That ambiguity made the action hard to trust.

### Corrections must be easy

Every inferred relationship should support “Not related” and explain why the tab was included. User labels and corrections should be authoritative inputs to later suggestions.

## What did not work

### A suggestion inbox

A large set of moves, renames, groups, parking suggestions, and cleanup tasks creates more work. Even good individual suggestions become overwhelming when presented as a queue.

### Always-visible arrows and action cards

Arrows between windows obscured the map and implied that organization was the primary task. Suggestions should appear only after the user chooses a workstream or cleanup mode.

### Mixing resumption with global hygiene

An exact-duplicate warning did not belong inside an Event Catalog workstream screen. Resuming a project and cleaning the browser are different intentions.

Deduplication should be a separate, factual browser-hygiene feature. It should distinguish:

- Exact URL matches.
- Likely duplicate content or intent.

Only exact matches should be presented as facts. A keep recommendation should depend on real signals such as active state, pinned state, or last-used time. When those signals are unavailable, Tab Eagle should ask rather than invent a preference.

### Autonomous cleanup

AI should not move, close, rename, reorder, archive, or group tabs without a reviewed action. Numeric confidence scores would not make an opaque or destructive suggestion safer.

## Interaction principles for a later version

1. **Resumption before organization.** Start with a small set of inferred workstreams, not a cleanup backlog.
2. **Preserve the map.** Highlight and dim; do not relocate windows merely to explain an inference.
3. **Progressive disclosure.** Show a workstream name and starting point first, related tabs second, and structural actions only on request.
4. **Review before mutation.** Show the complete effect of gather, group, move, or close operations.
5. **Persistent undo.** Undo should remain available until the next meaningful mutation, not disappear in a short toast.
6. **Explain and correct.** Provide “Why included?” and “Not related” on inferred membership.
7. **Keep factual cleanup separate.** Dedupe and stale-tab review should live outside workstream resumption.
8. **Use real state.** Never claim recency, activity, or confidence that Chrome did not provide.
9. **Keep the user’s labels.** Manual window names and Chrome tab groups should outweigh model-generated names.

## ADHD-related design stance

Tab Eagle should not claim to treat ADHD. The relevant product principles are more modest:

- Reduce the number of decisions required to resume interrupted work.
- Keep objects visible and spatially stable rather than relying on memory.
- Prefer one reversible action over many recommendations.
- Preserve a clear starting cue.
- Avoid notification-like suggestion counts that create obligation.
- Make “find before opening another tab” fast and dependable.

Evidence about digital interventions for ADHD is mixed, and we did not find research validating an AI tab organizer specifically. Any later AI feature should be evaluated through observed task recovery and reduced duplicate opening, not through clinical claims.

## Privacy and implementation constraints

A future on-device model could infer workstreams from tab titles, URLs, window membership, tab groups, pinned state, and real last-used metadata. Page contents should not be required for the first version.

Chrome’s on-device model APIs may be useful, but availability, model download state, device requirements, and API stability need to be treated as capability checks. The non-AI multi-window experience must remain complete when the model is unavailable.

## A focused future experiment

Prototype one end-to-end workstream journey rather than a general AI organizer:

1. Offer three likely workstreams.
2. Select one and highlight its tabs across the unchanged map.
3. Offer one clear starting tab.
4. Let the user inspect, exclude, and understand related tabs.
5. Preview gathering selected tabs into an explicit destination window and Chrome group.
6. Apply only after confirmation, animate the move, and provide persistent undo.

Success would mean a user can recover an interrupted thread and consolidate it without first understanding every open window.
