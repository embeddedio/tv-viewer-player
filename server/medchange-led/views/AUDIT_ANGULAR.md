# Audit: AngularJS Application (views)

## Overview
The port is an AngularJS 1.8.x application using a custom "Neon" CSS framework (no Tailwind dependency) to replicate the React design. It runs on the same Node.js backend.

## Functional Analysis

### 1. Main Controller (`main.controller.js`)
*   **Grid Layout:** Implemented. Calculates pagination correctly.
*   **Pagination & Highlight:** Implemented using `$interval`.
*   **Fluctuation:** *Missing.* The random "market activity" simulation found in React is not present in the Angular controller.
*   **Kiosk Mode:** Implemented via `window.location` check. Hides buttons.

### 2. Directives
*   **`exchange-card`:**
    *   **Visual:** Replicated exact CSS styling (Borders, Glows, Layout).
    *   **Auto-sizing:** Implemented with a simplified algorithm compared to React, but effective.
*   **`media-slider`:**
    *   **Support:** Images and Videos supported.
    *   **Logic:** Robust timer handling, auto-play fallback, deep watching of arrays. Matches React behavior.
*   **`marquee-text`:**
    *   **Logic:** Matches React's "String Concatenation" method for smooth infinite scrolling.
*   **`config-menu` (Partial):**
    *   **Layout:** Pixel-perfect replica of the React screenshot.
    *   **Functionality:** Full CRUD for Marquee/Media. Upload works.
*   **`converter`:**
    *   *Missing.* No directive or controller logic exists for the currency converter.

### 3. Data & Architecture
*   **Services:** `DataService` (HTTP) and `SocketService` (Events) are implemented and functional.
*   **Socket Version:** Downgraded to client 2.3.0 to match server 2.4.1 (Critical Fix).

## UX/UI Comparisons
*   **Visual Fidelity:** 95% match.
    *   Fonts, colors, and glow effects are identical.
    *   Layouts (Dashboard & Config) are identical.
*   **Scrolling:** Marquee scrolling is now identical (CSS translate).
