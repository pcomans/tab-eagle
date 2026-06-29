# Tab Eagle

Tab Eagle is a Chrome Manifest V3 extension that opens a full-tab view of the tabs in the current Chrome window. It lets you sort tabs by position or domain, click a card to activate a tab, and close tabs from the grid.

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

## Permissions

Tab Eagle uses only:

- `tabs`
- `storage`

It does not request host permissions or all-site data access.

## Scripts

```sh
npm run typecheck
npm test
npm run build
```
