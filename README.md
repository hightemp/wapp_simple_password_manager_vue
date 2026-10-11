# Password Manager

A self-hosted, encrypted password manager built with Vue 3. Store your passwords securely in LocalStorage, GitHub, WebDAV, or Google Drive with zero-knowledge AES-256 encryption.

![Password Manager — Light Theme](images/screenshot-light.png)

![Password Manager — Dark Theme](images/screenshot-dark.png)

<details>
<summary>📱 Mobile View</summary>

![Password Manager — Mobile](images/screenshot-mobile.png)

</details>

## Features

- **AES-256-GCM encryption** — passwords encrypted client-side (Web Crypto API) with PBKDF2-SHA256 key derivation (600k iterations); tampering is detected
- **Multiple storage backends** — LocalStorage, GitHub repository, WebDAV server, or Google Drive (appDataFolder)
- **Multi-repo sync** — save to multiple repositories simultaneously
- **Dark theme** — automatic system detection + manual toggle
- **PWA** — install as a native app on any device
- **Auto-lock** — automatic session lock after 5 minutes of inactivity
- **Password generator** — configurable length, character sets, strength indicator
- **Password masking** — passwords hidden in table, reveal on demand with auto-hide
- **Clipboard copy** — one-click copy for logins and passwords
- **Import/Export** — backup and restore your database as JSON
- **Keyboard shortcuts** — `Ctrl+S` save, `Ctrl+N` new entry
- **Responsive design** — works on desktop, tablet, and mobile
- **URL sharing** — share repository config via URL parameters

## Tech Stack

- **Vue 3** + Composition API + `<script setup>`
- **Pinia** — state management (split stores: database + repos)
- **TypeScript** — strict mode across entire codebase
- **Vite 6** — fast builds with HMR
- **UnoCSS** — atomic CSS with custom design tokens
- **Lucide Icons** — clean, consistent icon set
- **Vitest** — 114 unit tests (crypto, debounce, stores, FileSystemDriver, Google Drive client)
- **Web Crypto API** — native browser encryption (AES-256-GCM + PBKDF2)
- **crypto-js** — only for reading legacy (v1/v2) database files

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run unit tests
npm run test

# Lint & format
npm run lint
npm run format
```

## Usage

### 1. Add a Repository

On first launch, the Repository Settings modal appears. Choose a storage backend:

| Backend | Description |
|---------|-------------|
| **LocalStorage** | Built-in, no setup needed. Data stored in browser. |
| **GitHub** | Store encrypted database in a GitHub repository. Requires a Personal Access Token with `repo` scope. |
| **WebDAV** | Store on any WebDAV server (Nextcloud, ownCloud, etc.) |
| **Google Drive** | Store in Google Drive's hidden appDataFolder. Requires an OAuth 2.0 Client ID. |

### 2. Set Master Password

Enter your master password in the Repository Settings modal. This password encrypts/decrypts your entire database. **It is never stored or transmitted.**

### 3. Connect & Manage

Click **Connect** to unlock the database. Then:

- **Add** — create new password entries
- **Edit** — double-click a row or select + Edit
- **Delete** — select rows + Delete (with confirmation)
- **Select several** — Ctrl/⌘+click toggles a row, Shift+click selects a range
- **Save** — persist changes to the repository
- **Filter** — type in any column header to filter entries
- **Copy** — click the copy icon on login/password cells (the clipboard is cleared after 30 s)

### Categories

The panel on the left shows categories as a tree with entry counts (a category's count includes its subcategories):

- **Filter** — click a category (or **All** / **Uncategorized**) to show its entries, incl. subcategories
- **Create / rename / delete** — the folder button in the panel header, or the buttons that appear on hover. Deleting a category moves its entries and subcategories one level up; no entries are deleted
- **Move entries** — drag one or several selected rows onto a category (or onto **Uncategorized**)
- **Move categories** — drag a category onto another one, or onto **All** to move it to the top level
- **In the entry form** — type a path like `Work/Email`; existing categories are suggested, a new path creates the category
- The panel can be collapsed and resized; the selected category and expanded folders are remembered in the browser

Categories are stored as paths in the `category` field of each entry, so databases from older versions keep their categories as top-level ones.

### On a phone

Below 768 px the app switches to a mobile layout:

- **Search** — one field at the top searches all fields; the button next to it picks a category
- **Entries** — a scrolling list of cards; the buttons on a card copy the login / password
- **Details** — tap a card to see all fields, reveal or copy the password, open the URL, move it to another category, **Edit** or **Delete**
- **Bottom bar** — Repository · Add · Save · **More** (export, import, change master password, theme, lock)

## Security

| Aspect | Implementation |
|--------|---------------|
| Encryption | AES-256-GCM (Web Crypto API) — authenticated: a wrong password or a modified file is always rejected |
| Key Derivation | PBKDF2-HMAC-SHA256, 600,000 iterations, random 128-bit salt, random 96-bit IV per save |
| Zero Knowledge | Master password never leaves the browser |
| Auto-lock | After 5 min inactivity unsaved changes are saved, then the master password and all decrypted data are wiped from memory |
| Legacy Support | Older files (v2: AES-256-CBC via crypto-js, v1: 3DES) are read automatically and re-encrypted as v3 on the next save |
| Google Drive | Data stored in appDataFolder — only this app can access the files |
| Repository secrets | API keys / WebDAV passwords are stored **unencrypted** in the browser's localStorage and in exported repository files |

The app must be served over **HTTPS** (or `localhost`): the Web Crypto API is not available on plain HTTP.

### Database file format

| Version | Cipher | Key derivation | Status |
|---------|--------|----------------|--------|
| v3 | AES-256-GCM (Web Crypto) | PBKDF2-SHA256, 600k iterations (stored in file) | Current — written on every save |
| v2 | AES-256-CBC, no MAC (crypto-js) | PBKDF2-SHA256 or SHA1, 100k iterations | Read-only |
| v1 | 3DES (crypto-js) | Password used as passphrase | Read-only |

> **Upgrading:** once a database is saved in v3, versions of the app released before v3 support cannot open it
> (they report "Incorrect password"). Reload the app on every device so the service worker picks up the new version.

## Google Drive Setup

To use Google Drive as a storage backend:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Drive API** in **APIs & Services → Library**
4. Go to **APIs & Services → Credentials** → **Create Credentials → OAuth Client ID**
5. Select **Web application** as the application type
6. Add your app's URL to **Authorized JavaScript origins** (e.g. `http://localhost:5173` for development, `https://yourdomain.com` for production)
7. Copy the **Client ID** (format: `123456789.apps.googleusercontent.com`)
8. In the app, create a new repository with type **Google Drive** and paste the Client ID
9. On first connect, a Google OAuth popup will appear — grant access to the app data folder

> **Note:** The app only requests the `drive.appdata` scope, which limits access to a hidden app-specific folder. Your other Google Drive files are never accessible to this app.

## Deployment

### GitHub Pages

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs lint, type-check, unit and E2E tests, then builds and deploys to GitHub Pages on every push to `main`. The build output is not committed — in the repository settings, **Pages → Source** must be set to **GitHub Actions**.

### Self-Hosted

```bash
npm run build
# Serve the `dist/` directory with any static file server (HTTPS required)
```

## Project Structure

```
src/
├── main.ts                    # App entry point
├── App.vue                    # Main layout: data table, keyboard shortcuts, auto-lock
├── components/
│   ├── AppSidebar.vue         # Desktop sidebar menu
│   ├── BottomNav.vue          # Mobile bottom navigation
│   ├── BaseModal.vue          # Reusable modal with focus trap
│   ├── CategoryInput.vue      # Category field with suggestions
│   ├── CategoryPanel.vue      # Desktop: collapsible, resizable category panel
│   ├── CategoryPickerSheet.vue    # Mobile: pick a category (filter / move)
│   ├── CategoryTree.vue       # Category tree with counts and drag & drop
│   ├── ChangePasswordModal.vue    # Change master password
│   ├── ConfirmDialog.vue      # Confirmation dialog (replaces confirm())
│   ├── EntryCardList.vue      # Mobile: list of entry cards
│   ├── EntryContextMenu.vue   # Right-click menu for table rows
│   ├── EntryDetailsSheet.vue  # Mobile: entry details / edit / delete
│   ├── EntryEditModal.vue     # Entry editor
│   ├── EntryFormFields.vue    # Dynamic form renderer
│   ├── FormField.vue          # Individual form field
│   ├── KeyboardShortcutsModal.vue # Shortcuts help
│   ├── LoaderOverlay.vue      # Loading overlay
│   ├── MobileMenuSheet.vue    # Mobile: "More" menu
│   ├── NotificationToast.vue  # Toast notification system
│   ├── PasswordGenerator.vue  # Password generator panel
│   └── RepoSettingsModal.vue  # Repository settings (split-view)
├── composables/
│   ├── useCategoryState.ts    # Selected / expanded categories, panel size (per browser)
│   ├── useConfirm.ts          # Confirmation dialog via provide/inject
│   ├── useMediaQuery.ts       # Reactive media query (mobile layout switch)
│   └── useNotify.ts           # Toast notifications via provide/inject
├── services/
│   ├── FileSystemDriver.ts    # GitHub/WebDAV/LocalStorage/Google Drive adapters
│   └── googleDrive.ts         # GIS auth + Drive REST API (no gapi/SDK)
├── stores/
│   ├── database.ts            # Database state + CRUD operations
│   └── repos.ts               # Repository management
├── types/
│   └── menu.ts                # Sidebar / bottom nav actions
├── utils/
│   ├── categories.ts          # Category paths and tree building
│   ├── clipboard.ts           # Copy secrets, auto-clear the clipboard
│   ├── crypto.ts              # AES-256-GCM encryption (reads legacy v1/v2 formats)
│   ├── debounce.ts
│   └── download.ts            # Save JSON as a file
├── styles/
│   ├── tokens.css             # Design tokens (colors, spacing, etc.)
│   ├── base.css               # Global reset + typography
│   ├── components.css         # Shared buttons, form fields, animations
│   └── main.css               # Style entry point
└── __tests__/                 # Unit tests (mirror src/ layout)
```

## License

MIT

![](https://asdertasd.site/counter/wapp_simple_password_manager_vue)