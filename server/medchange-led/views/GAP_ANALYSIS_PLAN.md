# Gap Analysis & Remediation Plan

This document outlines the discrepancies between the original React app (`_public`) and the AngularJS port (`views`), along with a task list to finalize the migration.

## Identified Gaps

1.  **Missing Feature: Currency Converter**
    *   **React:** `components/Converter.tsx` exists.
    *   **Angular:** No equivalent.
    *   *Note:* Even if not currently active in the React `App.tsx` snippet, it's a valuable asset that should be available if requested. **Decision:** Ask user if they want it, or implement as a hidden feature/toggle. *Current plan: Mark as "Optional/Pending User Request" but ready to implement.*

2.  **Missing Feature: Market Fluctuation Simulation**
    *   **React:** `App.tsx` has a `useEffect` that randomly jitters buy/sell rates every 4 seconds to make the board look "live".
    *   **Angular:** `MainController` only updates on Socket events.
    *   *Impact:* The board feels more static without real-time socket updates.

3.  **UI Polish: Config Menu Interactions**
    *   **React:** likely used specific hover states or transitions.
    *   **Angular:** Basic hover states added, but "Drag and Drop" is replaced by "Up/Down" buttons. *Verdict:* "Up/Down" buttons are more robust for touch screens (Kiosks) than drag-and-drop, so this is an acceptable (or superior) deviation.

## Remediation Plan (ToDo)

- [ ] **Task 1: Implement Market Fluctuation**
    - Add a specialized `$interval` in `MainController` to randomly jitter rates by +/- 0.02 every 4s, updating `displayedRates` immediately.
    - This brings the "Live" feel back.

- [ ] **Task 2: Verify Converter Necessity**
    - Check if the user explicitly wants the "Calculatrice Rapide". If so, create a `converter` directive. *For now, skipping unless requested to keep scope clean.*

- [ ] **Task 3: Final Polish**
    - Ensure `customFontSize` inputs in Config allow "0" (Auto).
    - Double-check Video Autoplay on the specific hardware (Android WebView can be tricky, but `muted playsinline` is present).

## Conclusion
The AngularJS port is functionally complete regarding the *Core* dashboard features. The visual style has been successfully aligned. The only functional logic missing is the "Fake Fluctuation" simulation.
