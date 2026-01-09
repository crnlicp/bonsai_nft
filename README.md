# Bonsai (Motoko Fullstack)

This repository contains the Bonsai NFT/round-based application implemented with Motoko canisters on the Internet Computer and a React + Vite frontend. The app manages Bonsai NFTs, rounds, payments, and a leaderboard; backend logic is in Motoko and frontend UI is in TypeScript + React.

## What this project is

- Backend: Motoko canister(s) implementing Bonsai auction/round logic, NFT management, payments, and storage.
- Frontend: A Vite + React SPA that interacts with the canisters using generated TypeScript declarations and an agent.
- Tests: Motoko unit tests for backend logic in the `tests/` folder.

## Repository Layout

- `backend/` — Motoko source files and canister logic (e.g., `main.mo`, `NFTManager.mo`, `RoundManager.mo`).
- `frontend/` — Vite + React frontend application and components.
- `src/declarations/` — Generated TypeScript declarations for canisters and ledgers.
- `tests/` — Motoko unit tests for backend modules.
- `dfx.json` — DFX configuration (canister names and build info).

## Canisters (from dfx.json)

- `backend` — main Motoko canister (`backend/main.mo`).
- `icp_ledger_canister` — the ledger canister used for token transfers (remote/custom ledger in `dfx.json`).
- `internet_identity` — Internet Identity canister (remote).

## Prerequisites

- Node.js (16+)
- pnpm (recommended) or npm
- DFINITY SDK (`dfx`) installed and on PATH

Install pnpm:

```bash
npm install -g pnpm
```

Verify:

```bash
node -v
pnpm -v

```

## Local development

1) Install frontend dependencies

```bash
cd frontend
pnpm install
cd ..
```

2) Start local dfx and deploy canisters

```bash
dfx start --background
dfx deploy
```

3) Run the frontend dev server

```bash
cd frontend
pnpm run dev
```

Open the dev URL printed by Vite (usually `http://localhost:5173`).

Notes:
- If you want to run the frontend without realtime canisters, `frontend/stubs` contains identity/ledger stubs used for local UI testing.
- Generated TypeScript declarations appear in `src/declarations`. Regenerate them after changing canister candid files.

## Running tests

To run Motoko unit tests (backend):

```bash
dfx test
```

Frontend tests (if available):

```bash
cd frontend
pnpm test
```

## Build & production deploy

Build the frontend for production:

```bash
cd frontend
pnpm run build
```

Use the provided `deploy.sh` or your CI to build and deploy canisters and frontend assets. Inspect `deploy.sh` and `dfx.json` for project-specific deployment details.

## Developer notes

- Key Motoko modules: `NFTManager.mo`, `RoundManager.mo`, `PaymentManager.mo`, `StorageManager.mo`, `LeaderBoardHelper.mo`.
- Frontend components live in `frontend/src/components` and pages in `frontend/src/pages`.
- If you change canister interfaces, re-run dfx build and regenerate TypeScript declarations for the frontend. The project stores generated declarations in `src/declarations`.

## Contributing

Please open issues or PRs. Add Motoko unit tests in `tests/` for backend logic changes and keep frontend components well-tested.

## License

No license file is included in the repository. Add a `LICENSE` if you plan to open-source this project.
