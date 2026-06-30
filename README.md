# Tab Eagle

Tab Eagle is a Chrome Manifest V3 extension that opens a full-tab view of the tabs in the current Chrome window. It lets you sort tabs by position, domain, or recent activity, save tabs to Chrome's Reading List, click a card to activate a tab, and close tabs from the grid. Clicking Recent again toggles between newest-first and oldest-first.

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
