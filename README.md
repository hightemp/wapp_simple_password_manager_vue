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
- **Vitest** — 75 unit tests (crypto, debounce, stores, FileSystemDriver, Google Drive client)
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
- **Delete** — select a row + Delete (with confirmation)
- **Save** — persist changes to the repository
- **Filter** — type in any column header to filter entries
- **Copy** — click the copy icon on login/password cells

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

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on push to `main`.

### Self-Hosted

```bash
npm run build
# Serve the `docs/` directory with any static file server
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
│   ├── ChangePasswordModal.vue    # Change master password
│   ├── EntryContextMenu.vue   # Right-click menu for table rows
│   ├── EntryEditModal.vue     # Entry editor
│   ├── EntryFormFields.vue    # Dynamic form renderer
│   ├── FormField.vue          # Individual form field
│   ├── KeyboardShortcutsModal.vue # Shortcuts help
│   ├── LoaderOverlay.vue      # Loading overlay
│   ├── NotificationToast.vue  # Toast notification system
│   ├── PasswordGenerator.vue  # Password generator panel
│   └── RepoSettingsModal.vue  # Repository settings (split-view)
├── composables/
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
│   ├── crypto.ts              # AES encryption + PBKDF2 (with legacy 3DES reading)
│   ├── debounce.ts
│   └── download.ts            # Save JSON as a file
├── styles/
│   ├── tokens.css             # Design tokens (colors, spacing, etc.)
│   ├── base.css               # Global reset + typography
│   └── main.css               # Style entry point
└── __tests__/                 # Unit tests (mirror src/ layout)
```

## License

MIT

![](https://asdertasd.site/counter/wapp_simple_password_manager_vue)