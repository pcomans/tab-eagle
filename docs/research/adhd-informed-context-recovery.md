# ADHD-informed constraints for context recovery

Research brief for [GitHub issue #8](https://github.com/pcomans/tab-eagle/issues/8), prepared 2026-08-13.

## Bottom line

Tab Eagle should help Philipp reconstruct a **work context**—the coherent activity and tabs needed to pursue it—without first requiring him to classify, rename, or reorganize everything. The strongest evidence supports four constraints:

1. **Externalize the work context, not just the tab list.** Adult ADHD is associated with difficulties in planning and organization, but neither ADHD nor context recovery can be reduced to a universal working-memory deficit. In one controlled study, adults with ADHD formed less elaborate plans while recalling a formed plan about as accurately as controls; another study found working-memory impairment in only a subset of adults with ADHD. ([Fuermaier et al., 2013](https://doi.org/10.1371/journal.pone.0058338); [Mattfeld et al., 2016](https://doi.org/10.1016/j.nicl.2015.12.003))
2. **Give a salient cue for where to resume.** Interruption studies show that longer and more demanding interruptions delay resumption, and that obvious cues to the prior action can outperform subtle or absent cues. ([Monk, Trafton, & Boehm-Davis, 2008](https://doi.org/10.1037/a0014402); [Trafton, Altmann, & Brock, 2005](https://doi.org/10.1177/154193120504900354))
3. **Preserve meaningful spatial and multi-window structure.** People use environmental and approximate spatial information when resuming computer tasks; browser research also shows that one activity can span several web sessions and depend on a bundle of pages. A work context therefore cannot be equated with one Chrome window. ([Brudzinski, Ratwani, & Trafton, 2007](https://gregtrafton.com/papers/a480060.pdf); [Wang & Chang, 2010](https://doi.org/10.1145/1753326.1753343))
4. **Make consequential management actions easy to understand and recover from.** Reversibility is established usability guidance, although not an ADHD-specific result. Tab Eagle can move or close tabs without excessive warnings when it can show the effect and reliably undo it; otherwise it should ask for confirmation. ([NIST, 2015, recommendations 131–132](https://nvlpubs.nist.gov/nistpubs/gcr/2015/NIST.GCR.15-996.pdf))

The research does **not** establish that people with ADHD have an “object permanence” problem, that fewer visible choices are always better, that generic reminders solve follow-through, or that an AI model is needed. Those are hypotheses or folklore, not requirements.

## Evidence boundaries

The evidence falls into three tiers:

- **Direct ADHD evidence:** official descriptions of adult ADHD and studies involving adults with ADHD. This supports designing for planning, organization, attention, and delayed-intention difficulties, while preserving individual variation. ([NIMH, “ADHD in Adults”](https://www.nimh.nih.gov/health/publications/adhd-what-you-need-to-know); [Fuermaier et al., 2013](https://doi.org/10.1371/journal.pone.0058338); [Mattfeld et al., 2016](https://doi.org/10.1016/j.nicl.2015.12.003))
- **General cognitive and HCI evidence:** studies of interruption, reminders, programming, and browser multitasking in participants not selected for ADHD. This can justify testable interface hypotheses, but not claims about ADHD specifically.
- **Usability guidance:** standards-oriented recommendations about error recovery and undo. These are product-safety principles, not clinical evidence.

This brief translates all three into constraints for a personal product whose target user is Philipp. It does not make clinical claims about every person with ADHD.

## Findings and constraints

### 1. Support plan formation; do not presume global memory failure

The US National Institute of Mental Health describes adult ADHD as potentially involving difficulty staying organized, planning, remembering daily tasks, completing large projects, and managing attention. These are possible symptoms and functional impacts, not a statement that every adult with ADHD has each difficulty. ([NIMH](https://www.nimh.nih.gov/health/publications/adhd-what-you-need-to-know))

In a laboratory study of 45 unmedicated adults with ADHD and 45 matched controls, the ADHD group produced substantially less elaborate plans for a complex delayed-intention task. However, the groups recalled their plans at nearly identical rates after about 40 minutes, and the study found no group difference on its working-memory measure. The authors concluded that the main prospective-memory impairment in that paradigm arose during planning, not from a global failure to encode, retain, initiate, or execute a well-formed plan. The study used one structured, short-term laboratory task, so it cannot establish how a browser intervention will behave over days. ([Fuermaier et al., 2013](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0058338))

A separate longitudinal neuroimaging study found adults with a childhood ADHD diagnosis who had impaired working memory and others whose working memory was indistinguishable from controls. Working-memory status was separable from whether ADHD persisted in adulthood. The sample and fMRI task do not directly model tab use, but the result is an important guardrail against designing around a universal ADHD working-memory deficit. ([Mattfeld et al., 2016](https://doi.org/10.1016/j.nicl.2015.12.003))

**Constraints for Tab Eagle**

- A useful work context must not depend on Philipp first producing an elaborate categorization scheme. Tab Eagle should allow him to begin from a remembered clue—such as a document, dashboard, pull request, domain, or fragment of a title—and progressively assemble the relevant tabs.
- Treat **forming the set and arrangement** as the supportable problem. Show the proposed members and destination so Philipp can correct the plan before Tab Eagle applies it.
- Naming a work context may help recall, but it should be optional or suggested after useful tabs have been assembled. Requiring a name, status, deadline, and taxonomy before recovery would recreate the planning burden the tool is meant to reduce.
- Do not describe the product as an “external working memory” or assume every difficulty follows from working memory. “External representation of the work context” is both more precise and better supported.

### 2. External offloading can help, but the cue has to be available at the right moment

In four online experiments involving 1,196 general-population participants, people created external reminders more often when they had more intentions to remember or were interrupted. Creating perceptual reminders improved accuracy in the laboratory task. The study also found only weak external validity for predicting a naturalistic delayed intention over a week, and its authors caution that the short laboratory task may not map cleanly onto conventional prospective memory. ([Gilbert, 2015](https://doi.org/10.1080/17470218.2014.972963))

Adults with ADHD also report using compensatory approaches. In an exploratory study of 49 adults with ADHD symptoms, most reported at least one compensatory strategy; organization and external support were reported more often for inattentive than hyperactive/impulsive symptoms. Because this was a small self-report study, it shows strategy use, not that any particular digital aid is effective. ([Kysow, Park, & Johnston, 2017](https://doi.org/10.1007/s12402-016-0205-6))

**Constraints for Tab Eagle**

- Persist the minimum information needed to recognize and resume a work context: its tabs, intentional multi-window partition, a human-readable cue, and—if later experiments show value—a brief “where I left off” note or automatically derived recent-activity cue.
- Make the cue appear when the context is being recovered. A saved structure hidden behind a separate management inbox is not an effective external cue merely because it exists.
- Capture should be low-ceremony. Gathering tabs should already create a recoverable representation; extra metadata should earn its place through real-use experiments.
- Do not infer that persistent reminders or more notifications will solve context recovery. The relevant offloading action is preserving and re-presenting the work context itself.

### 3. Resume from a recognizable prior state, not an abstract inventory

Three controlled experiments found that longer and more cognitively demanding interruptions increased the time required to resume a hierarchical computer task. The authors interpreted the results through goal-memory decay and reduced opportunity to rehearse the suspended goal; their tasks lasted seconds to under a minute, so the exact timing cannot be generalized to returning to work days later. ([Monk, Trafton, & Boehm-Davis, 2008](https://interruptions.net/literature/Monk-JEPA08.pdf))

An experiment comparing interruption cues found that an obvious red arrow indicating the prior action produced faster resumption than either a subtle cursor-position cue or no cue; the subtle cue was no better than no cue. This was a simple laboratory task, but it directly cautions against assuming that any visible remnant is a useful resumption cue. ([Trafton, Altmann, & Brock, 2005](https://doi.org/10.1177/154193120504900354))

In programming specifically, a CHI study first surveyed 371 programmers, then compared automated resumption cues with participant-authored notes in a controlled study. Both automated cue designs doubled task-completion success relative to notes alone, and participants strongly preferred the cue that presented recent activity chronologically as code snippets. The domain is close to Philipp’s motivating example, but the intervention exposed code activity that a browser extension may not be able to observe. ([Parnin & DeLine, 2010](https://www.microsoft.com/en-us/research/publication/evaluating-cues-for-resuming-interrupted-programming-tasks/))

**Constraints for Tab Eagle**

- Recovery should lead with **recognition**: titles, favicons, domain, window/context label, and recent relationship to other tabs. A semantic summary is optional; recognizable source material is the baseline.
- When opening a recovered work context, emphasize a concrete resumption point—such as the last active relevant tab or a short recent-activity sequence—rather than presenting every member with equal visual weight.
- Keep global search available, but let a result become the seed of a recovery set. Once a remembered document is found, the interface should make nearby likely context visible without forcing another search from scratch.
- A cue should be conspicuous enough to guide the next action but should not obscure the tabs being recognized. Whether a “last active” marker, chronological strip, or short note works best is an experiment, not a settled requirement.

### 4. Preserve spatial continuity and intentional multi-window structure

In a 19-participant eye-tracking experiment, participants used both the prior-action cue and approximate spatial information when resuming a simple interrupted computer task; they returned within two display cells of the interruption point in more than 60% of trials. The task was artificial and the sample small, so this supports spatial stability as an HCI hypothesis rather than an ADHD-specific law. ([Brudzinski, Ratwani, & Trafton, 2007](https://gregtrafton.com/papers/a480060.pdf))

A browser-focused CHI study distinguished multiple simultaneous activities from one activity spanning multiple web sessions. Its prototype grouped related pages, saved and restored them as a unit, and supported switching among units. In a two-session controlled study with 48 experienced Firefox users, participants with the task-oriented browser support opened fewer pages and performed fewer navigation actions; support for simultaneous and cross-session work both improved measured performance and reported experience. The study was small, simulated, and conducted in a much older browser environment, so it validates the problem shape more than Tab Eagle’s eventual representation. ([Wang & Chang, 2010](https://www.sysu-hcp.net/userfiles/files/2021/02/28/fe10b4e611a8cdec.pdf))

**Constraints for Tab Eagle**

- A work context may span multiple Chrome windows. Saving or recovering one must preserve intentional partitions such as two side-by-side windows rather than automatically consolidating everything into one window.
- Preserve stable window positions while Philipp reviews, moves, or closes tabs. If a window becomes empty, retain a temporary placeholder or otherwise delay reflow until the management action is complete. Immediate compaction may erase a spatial cue before the user has incorporated the change.
- Separate “reduce accidental scatter” from “minimize window count.” A deliberate two-window arrangement is structure, not tab and window sprawl.
- Record tab membership independently from current Chrome window IDs so a work context can survive window recreation, while separately recording the preferred partition and arrangement as a restorable hint.

### 5. Keep management actions direct when they are truly reversible

NIST’s technical basis for health-IT interface design recommends giving users mechanisms to recover from use errors and enabling undo so they can explore without fear of irreversible steps. The document is for safety-critical health software, not tab management, but its recovery principle is applicable and does not depend on an ADHD diagnosis. ([NIST, 2015, recommendations 131–132](https://nvlpubs.nist.gov/nistpubs/gcr/2015/NIST.GCR.15-996.pdf))

**Constraints for Tab Eagle**

- Moving tabs between existing or new windows can be immediate when Tab Eagle can provide reliable undo and keep the resulting layout understandable.
- Closing tabs can be immediate only when restoration is reliable enough for the actual scope of the action. A batch close with uncertain recovery should show a preview and require confirmation.
- Undo feedback must say what changed and remain available long enough to use. A generic transient “Done” message is not recovery support.
- Avoid confirmation dialogs for every operation. The decision rule is recoverability and consequence, not a blanket assumption that an ADHD user needs protection from all actions.

### 6. Notifications and choice reduction are not established solutions

In a multiple-randomized trial with 109 adults reporting an ADHD diagnosis, additional generic SMS reminders did not consistently improve logins and did not improve module completion or practice of coping strategies in a self-guided intervention. The study concerns treatment adherence, not browser recovery, but it is direct evidence against treating reminders as a sufficient intervention. ([Nordby et al., 2022](https://doi.org/10.3389/fdgth.2022.821031))

The familiar claim that “more choices cause choice overload” is also not a reliable universal law. A meta-analysis of 50 published and unpublished experiments found an overall effect near zero with substantial unexplained variation between studies. This is evidence synthesis rather than a primary study, included because it directly tests the broad folklore claim. ([Scheibehenne, Greifeneder, & Todd, 2010](https://doi.org/10.1086/651235))

**Constraints for Tab Eagle**

- Do not add a persistent management inbox, reminder stream, or recurring “you have tabs to organize” prompt without evidence from Philipp’s use that it helps him return to focus.
- Do not hide legitimate alternatives merely because “ADHD needs fewer choices.” Instead, establish one clear primary recovery path and keep secondary controls available without competing for attention.
- Management suggestions should be attached to the tabs and windows they affect, shown when relevant, and dismissible. They should not become a separate backlog that Philipp must manage.
- Measure whether an intervention shortens the path back to focus. Engagement with Tab Eagle itself is not success.

## Claims to avoid

| Claim | Assessment |
| --- | --- |
| “ADHD means poor working memory.” | Overgeneralized. Working-memory difficulties occur in ADHD research, but adult ADHD and working-memory impairment are dissociable, with substantial individual variation. ([Mattfeld et al., 2016](https://doi.org/10.1016/j.nicl.2015.12.003)) |
| “Out of sight, out of mind is an ADHD object-permanence deficit.” | Not supported by the reviewed clinical sources. Official descriptions discuss inattention, organization, distractibility, and forgetfulness—not loss of object permanence. Visibility can still be tested as an environmental cue, but the object-permanence explanation should not be used. ([NIMH](https://www.nimh.nih.gov/health/publications/adhd-what-you-need-to-know)) |
| “Always show everything so nothing is forgotten.” | Unsupported. Obvious, relevant cues can help resumption, but subtle cues can be ineffective, and exhaustive visibility may compete with the intended cue. ([Trafton, Altmann, & Brock, 2005](https://doi.org/10.1177/154193120504900354)) |
| “Fewer choices always reduce ADHD decision burden.” | Unsupported. The general choice-overload literature does not yield a universal effect, and the reviewed sources do not establish an ADHD-specific rule. ([Scheibehenne, Greifeneder, & Todd, 2010](https://doi.org/10.1086/651235)) |
| “A reminder will make the user follow through.” | Unsupported. Generic SMS reminders had limited and inconsistent effects in one adult-ADHD trial. ([Nordby et al., 2022](https://doi.org/10.3389/fdgth.2022.821031)) |
| “One window is one work context.” | Contradicted by the product definition and unsupported by browser research, which treats an activity as a bundle of pages that may persist across sessions. ([Wang & Chang, 2010](https://doi.org/10.1145/1753326.1753343)) |
| “AI is necessary to identify a work context.” | No supporting evidence found. The reviewed studies validate external representation, task bundles, and resumption cues; none establishes a need for an LLM. Deterministic signals should be tested first. |

## Product requirements derived from the evidence

These are design inferences, not results directly tested by the cited studies:

1. **Recover before organizing.** A normal invocation should first help Philipp locate a remembered clue and assemble the tabs needed to resume the intended activity. Management support must not block that path.
2. **Let one tab seed a work context.** From a search result or visible tab, offer a provisional set of related open tabs across every Chrome window. The set must remain editable before any move or close.
3. **Represent a work context independently of windows.** Preserve its current one- or multi-window partition, but do not define identity solely by Chrome window IDs.
4. **Expose a resumption cue.** Test last-active tab, chronological recent tabs, and an optional short “where I left off” note as alternatives. Do not assume a generated summary is better than recognizable source cues.
5. **Preserve the map during action.** Do not immediately reorder windows, collapse empty windows, or change the camera framing while the user is interpreting a move or close.
6. **Use preview, direct manipulation, and undo.** Show source and destination for gathering; apply immediately when recovery is reliable; confirm when it is not.
7. **Keep assistance contextual.** Exact duplicates, likely related tabs, and possible destinations should appear on the affected objects, not in a separate management feed.
8. **Personalize through observation, not diagnosis.** Because the target user is Philipp and ADHD-related executive profiles vary, retain only the constraints that improve his repeated real use.

## First experiments

### Experiment A: recover an open work context

**Question:** Can Philipp start from one remembered clue and assemble the tabs for a real activity scattered across windows faster and with less mental reconstruction than with global tab search alone?

**Prototype:** A search result can become the seed of a provisional recovery set. Tab Eagle shows likely related tabs in their current spatial locations, lets Philipp add or remove members, and then gathers the confirmed set into one or more chosen windows without reflowing the overview mid-operation.

**Evidence to record over several days:** what Philipp remembered; which relevant tabs were found or missed; manual corrections; whether the final arrangement preserved a useful two-window structure; whether he returned to the intended activity instead of continuing to organize; and what became disorienting. The experiment should not be judged by tab count alone.

### Experiment B: preserve and resume a work context

**Question:** Which external cue is sufficient for Philipp to resume after switching away for hours or days?

**Variants to compare:** saved tab membership and layout only; the same plus last-active/recent sequence; the same plus an optional one-line “where I left off” note. Test recognition and actual return to focus, not whether the saved item is opened.

### Experiment C: contextual management assistance

**Question:** Which deterministic signals reduce accidental scatter without creating a new queue of decisions?

Start with exact duplicates, current tab already open elsewhere, obvious blank tabs, and explicit user-selected gather operations. Add semantic or AI assistance only when a concrete failure remains that these signals cannot address.

## Source notes and limitations

- [Fuermaier et al. (2013), *Complex Prospective Memory in Adults with Attention Deficit Hyperactivity Disorder*](https://doi.org/10.1371/journal.pone.0058338): direct adult-ADHD study; useful distinction between plan formation, recall, initiation, and execution; short structured laboratory setting and modest sample.
- [Mattfeld et al. (2016), *Dissociation of Working Memory Impairments and ADHD in the Brain*](https://doi.org/10.1016/j.nicl.2015.12.003): direct adult longitudinal/neuroimaging evidence for heterogeneity; does not study everyday browser behavior.
- [Gilbert (2015), *Strategic Offloading of Delayed Intentions into the External Environment*](https://doi.org/10.1080/17470218.2014.972963): large original study of external reminders; general population and mainly short laboratory intentions, with weak naturalistic association.
- [Monk, Trafton, and Boehm-Davis (2008), *The Effect of Interruption Duration and Demand on Resuming Suspended Goals*](https://doi.org/10.1037/a0014402): controlled interruption experiments; general population and short time scales.
- [Trafton, Altmann, and Brock (2005), *Huh, What Was I Doing? How People Use Environmental Cues after an Interruption*](https://doi.org/10.1177/154193120504900354): controlled cue-salience comparison; simple artificial task.
- [Brudzinski, Ratwani, and Trafton (2007), *Goal and Spatial Memory Following Interruption*](https://gregtrafton.com/papers/a480060.pdf): eye-tracking evidence for spatial information in task resumption; 19 undergraduates performing a simple task.
- [Parnin and DeLine (2010), *Evaluating Cues for Resuming Interrupted Programming Tasks*](https://doi.org/10.1145/1753326.1753342): first-party HCI study closely related to Philipp’s programming example; the useful cues contained IDE activity unavailable to a browser-only tool.
- [Wang and Chang (2010), *Multitasking Bar: Prototype and Evaluation of Introducing the Task Concept into a Browser*](https://doi.org/10.1145/1753326.1753343): browser-specific controlled study of page bundles across simultaneous and repeated activity; 48 experienced Firefox users in simulated tasks, using 2010-era browsing behavior.
- [Kysow, Park, and Johnston (2017), *The Use of Compensatory Strategies in Adults with ADHD Symptoms*](https://doi.org/10.1007/s12402-016-0205-6): direct adult-ADHD exploratory evidence; small sample and self-reported strategies, not an intervention trial.
- [Nordby et al. (2022), *The Effect of SMS Reminders on Adherence in a Self-Guided Internet-Delivered Intervention for Adults with ADHD*](https://doi.org/10.3389/fdgth.2022.821031): randomized reminder opportunities in adults with self-reported ADHD; outcome was treatment engagement, not work-context recovery.
- [Scheibehenne, Greifeneder, and Todd (2010), *Can There Ever Be Too Many Options?*](https://doi.org/10.1086/651235): meta-analysis included only to assess the broad choice-overload claim; not ADHD-specific.
- [NIST (2015), *Technical Basis for User Interface Design of Health IT*](https://nvlpubs.nist.gov/nistpubs/gcr/2015/NIST.GCR.15-996.pdf): official, standards-oriented usability guidance; safety-critical health context is stricter than tab management.

## Remaining uncertainty

No reviewed study tests the exact Tab Eagle loop: remembering a work activity, locating related tabs scattered across Chrome windows and macOS Spaces, arranging them into a usable multi-window structure, switching away, and recovering that structure days later. The evidence supports the constraints above, but the decisive evidence must come from longitudinal use by Philipp. In particular, the best work-context cue, the value of explicit saving, and the appropriate amount of contextual assistance remain empirical product questions.
