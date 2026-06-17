# Audit: React Application (_public)

## Overview
The original application is a React-based Digital Signage dashboard built with Vite and Tailwind CSS. It features real-time socket updates, a dynamic grid of currency rates, a media slider (image/video), and a scrolling marquee.

## Functional Analysis

### 1. Main Dashboard (`App.tsx`)
*   **Grid Layout:** Dynamic `gridColumns` x `gridRows`.
*   **Pagination:** Rotates through pages of rates based on `rotationInterval`.
*   **Highlight:** Sequentially highlights individual cards (`highlightInterval`).
*   **Fluctuation:** Simulates market activity with random small variances (visual only).
*   **Kiosk Mode:** `/play` route hides all UI controls.

### 2. Components
*   **`ExchangeCard`:** 
    *   Displays Flag, Code, Buy, Sell.
    *   **Auto-sizing:** Uses a layout effect to calculate font size dynamically based on container width.
    *   **Styling:** "Neon/Dark" theme.
*   **`MediaSlider`:**
    *   Supports Images and Videos.
    *   **Auto-play:** Videos play automatically (muted). Images rotate on timer.
    *   **Transitions:** Fade-in/out.
*   **`Marquee`:**
    *   Infinite scrolling text.
    *   Constructs a long string by repeating items to fill width.
*   **`ConfigMenu`:**
    *   **Overlay:** Covers the screen.
    *   **Settings:** Inputs for grid size, intervals, font sizes.
    *   **Lists:** Manage Media and Marquee items (Add, Remove, Reorder).
    *   **Upload:** Multi-file upload support.
*   **`Converter`:**
    *   **Feature:** A calculator widget to convert amounts between currencies.
    *   **State:** Local state for `amount` and `selectedCurrency`.
    *   **Visual:** Floating or integrated panel (Logic exists in file, but usage in `App.tsx` needs verification - *Note: It appears unused in the main `App.tsx` render loop in the provided snippet, possibly a hidden or planned feature.*).

### 3. Data & State
*   **Source:** HTTP `/api/data` for initial load.
*   **Updates:** Socket.io for real-time rates and setting changes.
*   **Persistence:** Server-side `database.json`.

## UX/UI Signature
*   **Theme:** "Cyberpunk/Neon" (Slate 900, Cyan-400, Yellow-400, Pink-500).
*   **Interactions:** Hover effects on config items, smooth transitions on dashboard.
*   **Typography:** 'Orbitron' for numbers, 'Roboto' for text.
