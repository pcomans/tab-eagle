# Tab Eagle

Tab Eagle is a Chrome Manifest V3 extension that opens a zoomable map of the tabs in every normal Chrome window. It opens focused on the window that invoked it, then lets you zoom out to the full browser, search across windows, drag tabs between windows, and save session window labels. Position, domain, and recent-activity sorting apply independently inside each window.

At overview scale, Tab Eagle keeps the map visually quiet. Zoom into a window to reveal last-used details, tab status, Reading List, and close controls without changing card geometry. Clicking Recent again toggles between newest-first and oldest-first.

<img width="1066" height="925" alt="Screenshot 2026-07-07 at 9 21 26 AM" src="https://github.com/user-attachments/assets/3c3456ff-1547-4363-b594-2bf73758ece6" />


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

## Releases

GitHub Actions builds, tests, and packages the extension on pull requests and pushes to `main`.

To publish a GitHub Release with a ZIP attached, make sure `package.json` and `public/manifest.json` have the same version, then push a matching version tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The release workflow attaches `tab-eagle-<version>.zip`. Upload that ZIP to the Chrome Web Store.
