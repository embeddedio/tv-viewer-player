# Repository Guidelines

## Project Structure & Module Organization
- `server.js` hosts the Express/Socket.IO API and the background scraper.
- `database.json` is the local data store (settings and rates).
- `uploads/` stores user-uploaded files served via `/uploads`.
- `public/` contains the React + Vite client:
  - `public/App.tsx`, `public/components/`, `public/assets/`
  - `public/dist/` is the built client output served by the server.

## Build, Test, and Development Commands
Root (server):
- `npm install` installs server dependencies.
- `npm run dev` starts the server with nodemon for local development.
- `npm start` runs the server with Node (production-style).

Client (from `public/`):
- `npm install` installs client dependencies.
- `npm run dev` runs the Vite dev server.
- `npm run build` builds the client into `public/dist`.
- `npm run preview` serves the production build locally.

## Coding Style & Naming Conventions
- Indentation: 2 spaces (match `server.js` and existing TSX files).
- JavaScript/TypeScript: use `camelCase` for variables/functions and `PascalCase` for React components.
- Files: React components live in `public/components/` and follow `PascalCase` (e.g., `RateCard.tsx`).
- Keep API route names consistent with existing `/api/*` patterns.

## Testing Guidelines
- No automated test framework is currently configured.
- If you add tests, document the framework and add scripts to both root `package.json` and `public/package.json` as needed.

## Commit & Pull Request Guidelines
- No Git history is available in this workspace, so there are no established commit conventions.
- Use clear, imperative commit messages (e.g., "Add rate refresh endpoint").
- PRs should include: a short summary, testing notes (commands run), and UI screenshots for client changes.

## Configuration & Data Safety
- Do not commit secrets; use environment files (e.g., `.env.local`) for API keys.
- `database.json` and `uploads/` are runtime data; avoid manual edits unless debugging.
