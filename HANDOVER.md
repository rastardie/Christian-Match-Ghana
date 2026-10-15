# Christian Match Ghana — Handover and Continuation Guide

**Last updated:** 2026-10-15
**Workspace:** `/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt`
**Branch:** `sync/cmg-local-2026-10-13`
**Remote:** `origin/sync/cmg-local-2026-10-13`

## 1. Current objective and outcome

The current objective was to host a Firebase-staging development build of Christian Match Ghana at:

```text
https://christianmatchghana.com/dev/
```

The development frontend is hosted manually on StormerHost/cPanel/LiteSpeed under:

```text
/home/christi3/public_html/dev/
```

The frontend uses the Firebase staging project, not production. Authentication, Firestore, Storage, signup, login, email verification, onboarding, and stage-4 photo upload are now working end-to-end. The user confirmed the latest stage-4 flow is working.

Production remains a separate Firebase project and was not intentionally modified during this work.

## 2. Repository architecture

```text
frontend/                 React + TypeScript + Vite + Capacitor Android app
frontend/src/             Main React application and services
frontend/public/          Static assets, logos, wallpapers, manifest
frontend/scripts/         Build-time service-worker generation
backend/functions/        Firebase Cloud Functions source and CLI dependencies
infra/firebase/           Firestore and Storage security rules
firebase.json             Firebase deployment and emulator configuration
.firebaserc               staging/production aliases
deploy-dev.sh             Manual/optional StormerHost deployment helper
docs/                     Existing implementation and deployment guides
HANDOVER.md               This continuation guide
```

The recommended future workspace location is outside macOS Documents, because Android Studio and Gradle can encounter permissions issues there:

```bash
mkdir -p "/Users/andrewstardie/Developer"
rsync -a \
  "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/" \
  "/Users/andrewstardie/Developer/cmg-rebuilt/"
```

Do not delete the original until the copied workspace has been verified.

## 3. Firebase environments

```text
staging     christian-match-ghana     development/testing
production  christianmatch-app        live production system
```

Staging:

```text
Project name:    Christian Match Ghana Stg
Project ID:      christian-match-ghana
Project number:  481815915882
Web app ID:      1:481815915882:web:6983b79d40683343b40913
Hosting URL:     https://christian-match-ghana.web.app
Console:         https://console.firebase.google.com/project/christian-match-ghana/overview
```

Production was not intentionally changed. Always verify the selected Firebase project before deploying or changing billing, rules, users, or data.

## 4. Current staging cloud state

### Authentication

- Email/password provider is enabled.
- Authorized domains include:
  - `localhost`
  - `christian-match-ghana.firebaseapp.com`
  - `christian-match-ghana.web.app`
  - `christianmatchghana.com`
  - `www.christianmatchghana.com`
- The hosted action URL is:
  - `https://christianmatchghana.com/dev`
- The staging API key was corrected to the official Firebase web-app value.
- A previous `auth/unauthorized-continue-uri` error was caused by the old action URL using `christianmatch.com`; the bundle now uses `christianmatchghana.com`.

### Billing

The staging project is linked to the open billing account named `Firebase Payment`. This was required for Firebase Storage provisioning and may incur charges beyond free quotas. Do not link or use an Eco-related billing account.

### Firestore

The missing staging Firestore database was the root cause of the earlier login `PROCESSING...` problem.

```text
Database: (default)
Location: nam5
Type:     FIRESTORE_NATIVE
Rules:    infra/firebase/firestore.rules
Status:   created and rules deployed
```

The production Firestore database uses `nam5`; staging was created in the same location for parity.

### Storage

The missing staging Storage bucket was the root cause of the earlier onboarding stage-4 hang. Firebase Storage was initialized in the Firebase Console after billing was enabled.

```text
Bucket:       christian-match-ghana.firebasestorage.app
Location:     US-CENTRAL1
Class:        REGIONAL
Rules:        infra/firebase/storage.rules
Status:       bucket created and rules deployed
```

`firebase.json` explicitly targets this bucket and assigns the `staging` Storage target. The matching `.firebaserc` target mapping is required by the Firebase Emulator Suite:

```json
"target": "staging"
```

This target mapping lets the same rules configuration work for both the cloud staging bucket and the local Storage emulator.

`firebase.json` explicitly targets this bucket because the Firebase CLI default-bucket lookup endpoint was unreliable:

```json
"storage": [
  {
    "bucket": "christian-match-ghana.firebasestorage.app",
    "rules": "infra/firebase/storage.rules"
  }
]
```

### Functions

The repository contains Cloud Functions and the frontend calls functions such as `checkSignupEligibility`. Functions should be reviewed and deployed to staging after the current cloud setup is stabilized. Earlier deployment attempts were blocked by the staging billing/Blaze requirement; billing is now enabled, but a complete staging Functions deployment has not been recorded in this session.

Recommended later command:

```bash
backend/functions/node_modules/.bin/firebase deploy \
  --project staging \
  --only functions \
  --non-interactive
```

Review the Functions environment and secrets before deploying. Never copy production secrets into staging.

## 5. StormerHost `/dev` deployment

The required cPanel structure is:

```text
public_html/dev/
├── index.html
├── .htaccess
├── assets/
├── brand-reference/
├── cmg-logo-circle.png
├── firebase-messaging-sw.js
└── manifest.json
```

Do not leave files nested under `public_html/dev/dist/`.

The latest locally packaged frontend archive is:

```text
/Users/andrewstardie/Desktop/cmg-dev-dist.zip
```

The latest locally built JavaScript bundle at the time of this handover is:

```text
assets/index-BpMfTgjo.js
```

If the latest visual changes have not yet been uploaded, upload the Desktop archive and extract it directly into:

```text
/home/christi3/public_html/dev
```

Choose **Overwrite**. Then use a fresh private window or add a cache-busting query string:

```text
https://christianmatchghana.com/dev/?fresh=1
```

The archive includes an `.htaccess` that:

- Disables caching for HTML entry points.
- Allows long caching for content-hashed JS/CSS/image assets.
- Preserves SPA fallback routing under `/dev/`.

Automatic FTP/SFTP deployment was not reliable. Manual cPanel upload remains the known-good deployment method until valid credentials and a tested deployment route are available. Never print or commit `.deploy/stormerhost.env`.

## 6. Frontend fixes completed

### Firebase and auth

- Firebase configuration is environment-driven through Vite.
- `VITE_BASE_PATH=/dev/` is supported.
- Logo, favicon, manifest, wallpapers, and messaging-worker paths are subpath-safe.
- Staging Firebase configuration uses `VITE_USE_FIREBASE_EMULATORS=false`.
- Verification links use the real hosted domain.
- Verification resend has a cooldown and readable rate-limit messaging.
- Verification screens include Return to Login and Cancel / Log Out.

### Signup and login resilience

Signup/login previously stayed at `PROCESSING...` when a Firebase call stalled. The auth flow now has:

- Duplicate-submit protection.
- A timeout around Firebase sign-in.
- Timeouts around Firestore profile reads/writes.
- A timeout around the optional premium-access check.
- Timeouts around signup eligibility and verification-email calls.
- Guaranteed loading-state cleanup.
- Signup continuation to the verification screen after account creation even when email delivery is delayed.

The timeout is a UI recovery mechanism, not a substitute for fixing Firebase services. The staging Firestore and Storage initialization resolved the underlying cloud failures.

### Signup visual layout

- The auth card is fixed to `100dvh` on mobile and `90vh` on larger screens.
- Signup content scrolls inside the auth card.
- The top wallpaper has reserved space for the logo and heading.
- The bottom wallpaper/ribbon/heart has reserved layout space instead of covering form fields.
- Signup uses a dedicated `cmg-auth-signup-panel` scroll class.
- The card owns the fixed wallpaper; the scrolling panel no longer duplicates the decorative pseudo-artwork.

### Onboarding stage 4

Stage 4 uploads profile, cover, and gallery photos to Firebase Storage before saving the Firestore profile. This now works after Storage initialization and rules deployment.

The current stage-4 flow is:

```text
image selection/cropping
  -> client compression
  -> Firebase Storage upload
  -> download URLs
  -> Firestore users/{uid} update
  -> Browse view
```

## 7. Current source status

The current branch contains local, uncommitted work. Check before committing:

```bash
git status --short
git diff --check
```

Known modified/untracked items include the recent hosting/auth/layout changes and:

```text
firebase.json
frontend/index.html
frontend/scripts/generate-messaging-sw.mjs
frontend/src/MainApp.tsx
frontend/src/components/Logo.tsx
frontend/src/index.css
frontend/vite.config.ts
deploy-dev.sh
```

There may also be local Firebase export folders and `frontend/dist.zip` artifacts. Review them before staging; do not commit emulator exports, test data, secrets, or deployment archives unless deliberately required.

No commit was created during this session. Before committing, review the diff and use a conventional commit message. Do not push directly to `main` or `master`.

## 8. Validation commands

### Frontend staging build

Dependencies are installed with the frontend lockfile:

```bash
npm ci --prefix frontend --no-audit --no-fund
```

Correct staging build sequence:

```bash
cd frontend
node_modules/.bin/vite build --mode staging-web
node scripts/generate-messaging-sw.mjs --mode=staging-web
```

`npm run build -- --mode staging-web` is not the reliable command for this project because the extra mode argument can be consumed by the service-worker generator instead of Vite.

### Firebase rules

```bash
backend/functions/node_modules/.bin/firebase deploy \
  --project staging \
  --only firestore:rules,storage:rules \
  --non-interactive
```

### Static checks

```bash
bash -n deploy-dev.sh start-cmg-emulators.sh run-cmg-pwa.sh run-cmg-android.sh
node --check backend/functions/src/index.js
cd frontend && npm run build
```

The build has known non-fatal Vite warnings about dynamic/static Firebase imports, unresolved runtime wallpaper URLs, and a large main JavaScript chunk.

### Hosted smoke checks

Verify that the hosted HTML references the expected current hash:

```bash
curl -ksS 'https://christianmatchghana.com/dev/?fresh=1' \
  | grep -oE 'assets/index-[^" ]+\.js'
```

Test manually in a fresh private window:

```text
- Login with a verified staging account.
- Create a staging-only account.
- Confirm verification screen appears.
- Complete onboarding stages 1–4.
- Upload profile and cover photos.
- Confirm photos appear after save.
- Log out and log in again.
```

Do not test with production credentials or production data unless explicitly intended.

## 9. Local emulator environment

Local emulators remain separate from staging and production:

```text
Auth:        9099
Firestore:   8080
Functions:   5001
Storage:     9199
Emulator UI: 4000
```

Start from the repository root:

```bash
backend/functions/node_modules/.bin/firebase emulators:start \
  --project staging \
  --only auth,firestore,storage,functions \
  --export-on-exit=.firebase-emulator-data
```

Start the frontend in emulator mode:

```bash
cd frontend
VITE_USE_FIREBASE_EMULATORS=true \
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1 \
VITE_PUBLIC_APP_URL=http://127.0.0.1:3000 \
npm run dev -- --host 127.0.0.1
```

The hosted `/dev` build uses cloud Firebase because:

```env
VITE_USE_FIREBASE_EMULATORS=false
```

The local emulator does not deliver real verification email. Inspect the Auth Emulator UI or terminal output for verification links.

Useful launchers:

```text
start-cmg-emulators.sh
run-cmg-pwa.sh
run-cmg-android.sh
start-android.sh
stop-cmg-local.sh
```

The Android package is:

```text
com.cmg.christianmatch
```

The Android Gradle wrapper executable bit was fixed previously. Local Android build/install/launch validation passed.

## 10. Security and operations notes

- Never commit `.env`, `.env.production`, `.env.staging-web`, backend `.env`, SMTP credentials, Paystack secret keys, OAuth credentials, or service-account keys.
- Firebase web API keys are client identifiers, but environment files still should not be committed casually because they expose environment configuration.
- Never use `pk_live_*` Paystack keys in staging.
- Keep production and staging rules, users, Storage, billing, and Functions separate.
- Firebase Storage now has billing enabled; configure budget alerts before real user testing.
- Do not send bulk verification reminders until email templates, quotas, SMTP/delivery, and recipient filtering are tested.
- Review Firestore and Storage rules for least privilege before inviting testers.
- Add App Check and abuse/rate-limit controls before public launch.
- Do not broadly cache authenticated Firebase responses in a PWA service worker.

## 11. Prioritized future add-ons

### P0 — stabilize and release safely

1. **Commit and PR the current work.** Review `firebase.json`, auth fixes, subpath-safe assets, timeout handling, and signup layout changes. Add a release note describing the cloud staging initialization.
2. **Create a repeatable staging deployment.** Replace manual cPanel zip upload with a reviewed GitHub Actions or SFTP/SSH deployment. Keep credentials in GitHub Actions secrets or a secret manager, never in the repository.
3. **Add a staging smoke-test script.** Check HTML hash, Firebase project ID, Auth sign-in, Firestore profile read/write, Storage upload/delete, and verification action URL.
4. **Add Cloud Billing budgets and alerts.** Set a low staging budget, email alerts, and a review process before adding testers.
5. **Deploy and verify staging Functions.** Confirm callable functions, region, runtime configuration, and staging-only secrets.

### P1 — reliability and observability

1. **Upload progress, cancellation, retry, and timeout UI.** Stage 4 should show which photo is uploading and recover cleanly from a failed upload.
2. **Centralized Firebase error handling.** Map Auth, Firestore, Storage, Functions, quota, and network errors to actionable messages with correlation IDs.
3. **Crash and performance monitoring.** Add Firebase Crashlytics for Android and a browser error-monitoring solution for PWA/web, with staging and production separated.
4. **Cloud Logging dashboards and alerts.** Monitor callable-function errors, Storage failures, Auth rate limits, Firestore permission errors, and unusual signup volume.
5. **Resume-safe onboarding.** Save non-sensitive onboarding progress to Firestore and restore it after refresh or interrupted uploads.

### P1 — security, trust, and moderation

1. **Firebase App Check** for web and Android after validating that it does not block legitimate testers.
2. **Rate limits and abuse controls** for signup, verification resend, password reset, messages, likes, reports, and photo uploads.
3. **Moderation workflow** for reports, blocked users, suspicious accounts, image review, admin audit history, and appeal handling.
4. **Review Firestore/Storage rules** with adversarial tests for cross-user reads/writes and unauthenticated access.
5. **Privacy and retention controls**: account deletion, export, consent history, image deletion, and retention schedules.

### P1 — email and communication quality

1. Configure a verified custom email sender with SPF, DKIM, and DMARC.
2. Separate staging and production email templates and sender identities.
3. Add email delivery diagnostics and a resend cooldown persisted across reloads.
4. Test verification, password reset, change-email, and deep links on desktop, mobile browser, and Android.

### P2 — test automation and delivery

1. Add Firebase Emulator Suite integration tests for Auth, Firestore, Storage, and callable Functions.
2. Add Playwright end-to-end tests for signup, verification-screen recovery, login, onboarding, photo upload, logout, and profile editing.
3. Add visual regression screenshots for login, signup, stage 4, profile, and mobile/desktop breakpoints.
4. Add TypeScript checks, linting, dependency audit, rules tests, and build validation to CI.
5. Add preview deployments for pull requests without exposing production data.

### P2 — product and platform enhancements

1. **PWA service worker** with safe static-asset caching only; never cache private Firebase responses broadly.
2. **Push notifications** with permission UX, token lifecycle management, and server-side notification preferences.
3. **Search and discovery quality** with Firestore indexes, pagination, denormalized counters, and tested filters.
4. **Payments hardening**: Paystack server-side verification, webhook signature validation, idempotency, subscription reconciliation, and test/live environment separation.
5. **Accessibility**: keyboard navigation, focus management, semantic labels, contrast checks, reduced-motion support, and screen-reader testing.
6. **Internationalization and regional settings** for Ghanaian locales, phone formats, date/time, and future country expansion.
7. **Backups and disaster recovery** for Firestore and Storage, with restore drills and documented RPO/RTO.

## 12. Immediate next session checklist

```text
[ ] Confirm the latest Desktop zip was uploaded to public_html/dev.
[ ] Confirm hosted HTML references the expected current JS hash.
[ ] Retest signup/login in a fresh private window.
[ ] Confirm stage-4 photo uploads and profile save.
[ ] Deploy/verify staging Functions after billing is enabled.
[ ] Add Firebase budget alerts.
[ ] Review git diff and remove local export/archive artifacts.
[ ] Commit current source/config changes on the feature branch.
[ ] Create a PR; do not push directly to main/master.
```

## 13. Session continuation commands

```bash
cd "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt"
git status --short
git diff --check
```

Inspect the staging Firebase project before cloud changes:

```bash
backend/functions/node_modules/.bin/firebase projects:list
backend/functions/node_modules/.bin/firebase use staging
```

Never assume the active Firebase project is safe. Confirm the project ID in command output before deploying rules, Functions, Storage, or hosting.

## 14. Biometric authentication implementation

The `onb` reference is Flutter, while CMG is React/Vite/Capacitor. CMG now uses the equivalent Capacitor-native approach rather than copying Dart code.

Pinned dependencies:

```text
@aparajita/capacitor-biometric-auth: 10.0.0
@aparajita/capacitor-secure-storage:    8.0.1
```

Implementation:

```text
frontend/src/services/biometricAuthService.ts
frontend/src/MainApp.tsx
```

Behavior:

1. The normal email/password login remains the source of truth.
2. On native Android/iOS only, the app checks for enrolled biometry/device security.
3. The user opts in with `Enable biometric sign-in on this device`.
4. After a successful normal login, the email/password pair is stored in the plugin’s encrypted native storage.
5. The `SIGN IN WITH BIOMETRICS` button prompts for fingerprint/Face ID/device credentials.
6. After successful biometric authentication, the existing Firebase login flow runs with the securely stored credentials.
7. Disabling the checkbox removes the stored credentials.
8. Web/PWA builds do not display or use the native biometric credential flow.

Security boundary:

- Credentials are stored only on the native device through `@aparajita/capacitor-secure-storage`.
- The web implementation is intentionally disabled; the secure-storage plugin’s web fallback must not be treated as production credential storage.
- The biometric prompt gates access to the stored credentials; it does not replace Firebase Auth.
- A future WebAuthn/passkey implementation would be preferable for browser biometric login because it avoids storing passwords and requires a server-side challenge/credential model. CMG does not currently have that backend implementation.

Android validation:

```text
Capacitor sync:       Passed
Biometric plugin:     Registered in Android project
Secure storage plugin:Registered in Android project
Android debug APK:    Produced successfully (approximately 17 MB)
```

The outer Gradle timeout wrapper reported after the build completed, but the Gradle output itself ended with `BUILD SUCCESSFUL` and the APK was verified at:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Native test checklist:

```text
[ ] Install the new debug APK on a biometric-capable Android device/emulator.
[ ] Enroll a fingerprint or compatible device credential.
[ ] Sign in normally and enable biometric sign-in.
[ ] Log out and confirm SIGN IN WITH BIOMETRICS appears.
[ ] Authenticate successfully and confirm Firebase login completes.
[ ] Cancel/fail biometric authentication and confirm the user remains logged out.
[ ] Disable the option and confirm the biometric button disappears.
[ ] Test a changed Firebase password; clear/re-enable stored biometric credentials.
```

The `onb` landing-style translation uses locally bundled Roboto files copied into:

```text
frontend/public/fonts/Roboto-Regular.ttf
frontend/public/fonts/Roboto-Medium.ttf
frontend/public/fonts/Roboto-Bold.ttf
frontend/public/fonts/Roboto-Black.ttf
```

CMG keeps its existing cream/navy/orange/gold brand, logo, and wallpapers. The adopted `onb` patterns are the heavy Roboto typography, compact CTA rhythm, high-contrast navy/orange structure, and local/offline font loading. The unrelated `onb` logo and background assets were not copied.
