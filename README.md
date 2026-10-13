# Christian Match Ghana — Rebuilt Workspace

This workspace separates the editable frontend, Firebase Functions backend, Firebase rules, and documentation. It was reconstructed from `cmg-front.zip` plus the current local Functions source.

## Layout

```text
cmg-rebuilt/
├── frontend/                 # React + TypeScript + Vite + Capacitor
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.tsx
│   │   ├── MainApp.tsx
│   │   ├── firebase.ts
│   │   └── index.tsx
│   ├── public/               # Static web/PWA assets
│   ├── android/              # Capacitor Android platform source
│   ├── package.json
│   ├── vite.config.ts
│   └── capacitor.config.ts
├── backend/
│   ├── functions/
│   │   ├── src/index.js      # Firebase Cloud Functions entrypoint
│   │   ├── package.json
│   │   └── .env.example
│   └── db/                   # SQL/database reference material
├── infra/firebase/
│   ├── firestore.rules
│   └── storage.rules
├── docs/frontend/            # Existing implementation guides
├── firebase.json             # Root Firebase deployment configuration
└── .firebaserc               # christianmatch-app project selection
```

Generated directories such as `frontend/dist/`, `node_modules/`, and Android build caches are ignored and must not be committed.

## Local validation

Frontend:

```bash
cd frontend
npm ci
npm run build
```

Backend:

```bash
cd backend/functions
npm ci
node --check src/index.js
```

Local frontend development:

```bash
cd frontend
npm run dev
```

## Firebase deployment

Run Firebase CLI commands from this workspace root after reviewing the target project and environment configuration:

```bash
firebase use christianmatch-app
firebase deploy --only hosting,functions,firestore:rules,storage:rules
```

Deployment is intentionally not performed by the rebuild. Configure secrets server-side; never copy the original `.env` into this workspace or commit real Paystack, SMTP, or API credentials.

## Verification reminder campaign

`backend/functions/src/index.js` contains a guarded `sendUnverifiedVerificationReminders` callable Function. It is dry-run by default, requires administrator authorization, supports a single-recipient test, sends in bounded batches, generates fresh Firebase verification links, and records campaign recipients to prevent duplicate sends. It is not deployed or invoked by this rebuild.

## Validation status

- Frontend `npm run build`: passed.
- Backend `node --check src/index.js`: passed.
- Frontend dependency audit: existing findings reported by npm; no automatic upgrades applied.
- Backend dependency audit: existing findings reported by npm; no automatic upgrades applied.
- Firebase deployment: not performed.

## Firebase environments

The local frontend is configured through ignored `frontend/.env.local`, currently pointing at the staging project:

```text
Project ID: christian-match-ghana
```

Use the Firebase aliases from the workspace root:

```bash
firebase use staging
firebase use production
```

Do not put real credentials in Git. Copy an appropriate `frontend/.env.*.example` file to a local ignored environment file when changing targets. The Firebase web configuration values are client-side identifiers; SMTP, Paystack secret, and service-account credentials remain server-side only.

For local emulator support, set `VITE_USE_FIREBASE_EMULATORS=true` and use `VITE_FIREBASE_EMULATOR_HOST=127.0.0.1` for the browser or `10.0.2.2` for an Android emulator.
