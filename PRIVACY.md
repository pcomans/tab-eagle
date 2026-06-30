# Tab Eagle Privacy Policy

Last updated: June 30, 2026

Tab Eagle is a Chrome extension that gives you a full-screen overview of the tabs in your current Chrome window so you can search, sort, open, close, and save tabs to Chrome's Reading List.

## Data Tab Eagle Handles

Tab Eagle uses Chrome extension APIs to read tab metadata needed to show the tab overview:

- Tab titles
- Tab URLs and pending URLs
- Tab favicons
- Tab domains
- Tab pinned, audible, muted, discarded, frozen, and loading status
- Tab last-accessed timestamps
- Chrome Reading List entry URLs, only to show whether an eligible tab is already saved

Tab Eagle also stores your preferred sort mode locally in Chrome extension storage.

## How Data Is Used

Tab Eagle uses this data only to provide its tab-management features:

- Showing tab cards
- Searching tabs by title and URL
- Sorting tabs by position, domain, or recent activity
- Showing favicons and local visual color treatments
- Opening or closing tabs when you request it
- Adding eligible pages to Chrome's Reading List when you click "Read later"
- Remembering your selected sort mode

## Data Sharing

Tab Eagle does not sell, rent, share, or transfer your data to third parties.

Tab Eagle does not send tab titles, URLs, favicons, browsing activity, Reading List entries, or settings to any developer-operated server.

## Remote Code

Tab Eagle does not load or execute remotely hosted code. The extension logic is packaged with the extension.

## Storage And Retention

Tab Eagle stores only your preferred sort mode using Chrome's local extension storage. You can remove this data by uninstalling the extension or clearing extension site data through Chrome.

Chrome's Reading List data is managed by Chrome. Tab Eagle only adds an entry when you explicitly click "Read later" for an eligible tab.

## Permissions

Tab Eagle requests these Chrome permissions:

- `tabs`: required to list, activate, close, and read metadata for tabs in the current Chrome window.
- `storage`: required to save your preferred sort mode locally.
- `readingList`: required to add eligible pages to Chrome's Reading List and detect whether a page is already saved.
- `favicon`: required to display tab favicons and derive local card colors from favicons.

Tab Eagle does not request host permissions and does not request access to all data on all websites.

## Limited Use

Tab Eagle's use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. Data handled by the extension is used only to provide and improve Tab Eagle's single tab-management purpose.

## Contact

For support or privacy questions, use the project's GitHub issue tracker:

https://github.com/pcomans/tab-eagle/issues
