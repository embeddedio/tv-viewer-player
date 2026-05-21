# GEMINI.md — Instruction Context for tv-viewer-dev

This file provides critical context, architectural overview, and development guidelines for the `tv-viewer-dev` project.

## Project Overview
`tv-viewer-dev` is a specialized Android TV application for **currency exchange offices in Morocco**. It serves as a development and testing environment for widgets before they are exported to the production app.

### Key Features
- **Embedded Node.js Server:** Runs directly on the Android TV device to handle data scraping, media management, and configuration.
- **Server-Driven UI (SDUI):** The layout and content (widgets, playlists, tickers) are controlled via an Admin UI and served as JSON.
- **Real-time Updates:** Uses a bridge channel for communication between the Node.js server and the React Native frontend.
- **Scraping Engine:** Scrapes official exchange rates from Bank Al-Maghrib (BKAM) and local exchange offices.

---

## Tech Stack
- **Frontend:** React Native (via `react-native-tvos` fork), Expo (Development Client), TypeScript.
- **Backend:** Node.js (via `nodejs-mobile-react-native`), HTTP (port 3000).
- **Admin UI:** React, Vite, Tailwind CSS (located in `server/views`).
- **Storage:** Local file system for configuration and media (uses `expo-file-system`).

---

## Architecture & Data Flow

### 1. High-Level Structure
```
Android TV Device
├── React Native (Frontend)         ← Displays UI, fetches from localhost:3000
└── Node.js (Backend)               ← Scraping, Admin API, Media Server
```

### 2. Widget System
The application is transitioning from WebView-based widgets to a **native SDUI (Server-Driven UI)** system.
- **WebView (Legacy):** Widgets are HTML/JS folders in `server/widgets/` (fallback).
- **SDUI (Native):** Widgets are defined by a `ui.json` file in `server/widgets/{name}/`.
- **Native Renderer:** `components/sdui/NativeWidgetRenderer.tsx` parses `ui.json` and renders using native RN components (`View`, `Text`, `Image`, etc.).
- **Registry:** `components/WidgetRenderer.tsx` (for native RN widgets) or the dynamic SDUI loader.

### 3. Synchronization Workflow
The Node.js server code in `server/` must be synchronized to `nodejs-assets/` to be bundled into the Android APK.
- Modification in `server/` (including `ui.json` or Admin UI) → `yarn sync:server` → `yarn android`.

---

## Development Guidelines

### Key Files
| Path | Description |
|------|-------------|
| `App.tsx` | Entry point, starts Node.js, handles orientation and bridge. |
| `widgets/` | Custom React Native widgets. |
| `components/WidgetRenderer.tsx` | Central registry for all widgets. |
| `server/server.js` | Main Node.js API and widget data routes. |
| `server/lib/` | Core logic (scraping, bridge, auth, config). |
| `server/views/` | Source code for the web-based Admin UI. |
| `layouts.ts` | Definition of available screen layouts (1-col, 2-cols, etc.). |

### Adding a New Widget
1. **Create Component:** Add `widgets/NewWidget.tsx`.
2. **Register Frontend:** Add the widget to the `WIDGETS` object in `components/WidgetRenderer.tsx`.
3. **Register Backend:** Add the widget metadata to `REGISTERED_WIDGETS` in `server/server.js`.
4. **Data Route:** Add a `GET` route in `server/server.js` to serve data for the widget.

### Constraints
- **New Architecture:** Must remain **DISABLED** (`newArchEnabled=false`) due to `nodejs-mobile` compatibility.
- **Node.js Environment:** The embedded server cannot run `npm install` on the device. All logic must use built-in modules or be pre-bundled.
- **TV Focus:** Use `react-native-tvos` features (D-pad navigation, focus management) where applicable.

---

## Key Commands

### Setup & Build
- `yarn install`: Install all dependencies.
- `yarn prebuild:tv`: Generate/clean the `android/` directory for TV.
- `yarn android`: Build and install the APK on the connected TV device.

### Development
- `yarn start`: Start Metro bundler (for JS-only changes in React Native).
- `yarn sync:server`: Copy `server/` changes to the native assets folder (required for Node.js changes).
- `yarn build:admin`: Rebuild the Admin UI (Vite project in `server/views`).

### Export & Validation
- `yarn validate`: Run validation scripts.
- `yarn export`: Export a specific widget for production use.
- `yarn export:all`: Export all widgets.

---

## Environment Configuration
- **BASE_URL:** `http://127.0.0.1:3000` (The app always talks to itself).
- **Admin UI:** Accessible at `http://<DEVICE_IP>:3000` from any browser on the same network.
- **Default Port:** 3000.
