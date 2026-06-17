# Project Overview

This is the **Global Exchange Dashboard** project, a web application designed to display currency exchange rates. It functions as a self-contained server with a React frontend, capable of scraping real-time data and serving a dashboard.

This directory (`/data/projects/deviceAffichage/android/medchange_led_app/v1/web2`) contains the **embedded server** component, which is likely intended to be bundled or synchronized with a mobile application (as per previous context about an Android persistent service).

## Architecture

*   **Backend (Node.js/Express):**
    *   **Entry Point:** `server.js`
    *   **Database:** `database.json` (Local JSON file for persistence of settings and rates).
    *   **Real-time:** Uses `socket.io` (v2.x) to broadcast rate updates and setting changes to connected clients.
    *   **Scraping:** A scheduled task (every 30 mins) scrapes "bestchangetanger.com" using `axios` and `cheerio` to update rates automatically.
    *   **File Uploads:** Uses `multer` to handle file uploads to `uploads/`.
*   **Frontend (React/Vite):**
    *   Located in `public/`.
    *   Built with TypeScript and Vite.
    *   Consumes the backend API and Socket.io events.
    *   Build artifacts are output to `public/dist/` and served statically by the backend.

## Building and Running

### Prerequisites
*   Node.js (v18+ recommended given Vite/React versions).

### Backend (Root)
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Development Mode (Nodemon):**
    ```bash
    npm run dev
    ```
3.  **Production Start:**
    ```bash
    npm start
    ```

### Frontend (Client)
The frontend code resides in the `public/` directory.

1.  **Navigate to directory:**
    ```bash
    cd public
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Development Server (Vite):**
    ```bash
    npm run dev
    ```
4.  **Build for Production:**
    ```bash
    npm run build
    ```
    *   This generates files in `public/dist/`, which `server.js` is configured to serve.

## Development Conventions

*   **Language:**
    *   Backend: JavaScript (CommonJS).
    *   Frontend: TypeScript (`.tsx`, `.ts`).
*   **Formatting:** 2-space indentation is standard across the project.
*   **Component Structure:** React components are located in `public/components/` and use PascalCase (e.g., `ExchangeCard.tsx`).
*   **API Pattern:**
    *   API routes are prefixed with `/api/`.
    *   Static assets are served from `/uploads` or root (for the SPA).
    *   Socket.io events: `ratesUpdated`, `settingsUpdated`.
*   **Data Handling:**
    *   `database.json` should not be manually edited while the server is running if possible, as it is overwritten by the server.
    *   Scraping logic is embedded in `server.js`.

## Key Files
*   `server.js`: Main application logic, server setup, API routes, and scraping job.
*   `database.json`: storage for rates and configuration.
*   `public/vite.config.ts`: Frontend build configuration.
*   `public/App.tsx`: Main frontend component.
