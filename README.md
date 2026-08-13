# Tab Eagle

Tab Eagle is a Chrome Manifest V3 extension that turns every normal Chrome window into a stable, zoomable map. It opens focused on the window that invoked it while sharing one consistent canvas arrangement across Tab Eagle instances for the current Chrome session.

Search covers every open tab across every window and moves the camera to keep the matching tabs in view. Drag tabs within a window, between existing windows, or onto the reserved **New window** card to move a tab into its own Chrome window without unexpectedly rearranging the canvas.

## Features

- Zoom and pan across all normal Chrome windows on one canvas
- Start focused on the invoking window without changing the shared window arrangement
- Search every open tab by title, URL, or domain
- Follow search results with the keyboard while the camera frames the selection
- Drag tabs within a window, across windows, or into a new window
- Keep surviving windows in place when another window closes
- Rename windows for the current Chrome session
- Sort tabs inside each window by Chrome position, domain, newest activity, or oldest activity
- Activate and close tabs directly from the map
- Add eligible pages to Chrome's built-in Reading List

At overview scale, Tab Eagle hides secondary metadata and enlarges titles while keeping the close action available. Zoom into a window to reveal last-used details, tab status, Reading List, and window-level controls without changing card geometry.

The canvas follows wheel, trackpad, slider, and drag gestures directly. Fit, search framing, and Zoom to window use interruptible camera animations and respect the system's reduced-motion preference.

## Install For Development

```sh
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select the `dist` folder from this repo.

On macOS, `Command+Shift+E` opens Tab Eagle. If Chrome leaves the shortcut unassigned because of a local conflict, set it manually at `chrome://extensions/shortcuts`.

## Using Tab Eagle

- Scroll or use the zoom controls to zoom. Drag the canvas background to pan.
- Click **Fit** or the Tab Eagle brand to frame every window.
- Type in the search field—or start typing anywhere outside an editor—to search across all windows.
- Use the arrow keys in search to move between results; press Enter to open the selected tab.
- With Position sorting active, drag a tab onto a window, between tabs, or onto **New window**. Other sort modes drop the tab at the end of the selected Chrome window.
- Click a window title to rename it for the current Chrome session.
- Click **Recent** again to toggle between newest-first and oldest-first.
- Use **Return to origin** to return to the tab that opened Tab Eagle.

## Permissions

Tab Eagle uses only:

- `tabs`
- `storage`
- `readingList`
- `favicon`

It does not request host permissions or all-site data access.

## Scripts

```sh
npm run typecheck
npm test
npm run build
```

### Isolated performance benchmark

Run the real extension-action path without touching your normal Chrome profile:

```sh
npm run perf:eagle
```

The benchmark builds the unpacked extension, launches Chrome for Testing with a temporary profile, creates seven synthetic windows containing 90 local tabs distributed across 18 locally mapped origins, triggers Tab Eagle, and reports cold and warm painted-overview timings. The isolated browser closes when the run finishes.

Puppeteer normally installs Chrome for Testing with `npm install`. If npm's script policy suppresses that download, install it once explicitly:

```sh
npm run perf:setup
```

Use the local regression budget after changing startup or rendering code:

```sh
npm run perf:check
```

To save a Chrome performance trace under the ignored `perf-artifacts/` directory:

```sh
npm run perf:eagle -- --samples 5 --trace
```

The fixture size can be changed with `--windows`, `--tabs`, and `--origins`. Use `--cold-budget-ms`, `--warm-budget-ms`, `--settled-budget-ms`, `--warm-render-budget`, or `--noop-render-budget` to test a specific performance hypothesis.

## Releases

GitHub Actions builds, tests, and packages the extension on pull requests and pushes to `main`.

To publish a GitHub Release with a ZIP attached, make sure `package.json`, `package-lock.json`, and `public/manifest.json` have the same version, then push a matching version tag:

```sh
git tag vX.Y.Z
git push origin vX.Y.Z
```

The release workflow attaches `tab-eagle-<version>.zip`. Upload that ZIP to the Chrome Web Store.
