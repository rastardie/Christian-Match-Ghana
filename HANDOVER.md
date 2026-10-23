# Christian Match Ghana — Handover and Continuation Guide

**Last updated:** 2026-10-22
**Workspace:** `/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt`
**Branch:** `sync/cmg-local-2026-10-13`
**Remote:** `origin` → `https://github.com/rastardie/Christian-Match-Ghana.git`
**Last pushed commit:** `6c035e1 build: add explicit Firebase staging build`

## 1. Current system snapshot

Christian Match Ghana is a React/Vite/TypeScript + Firebase + Capacitor application with a Firebase Functions backend. The current work covered four major areas:

1. **Secure administration:** canonical group-based RBAC, permissions, audit logs, Super Admin protection, administrator creation, username login, and forced first-login password changes.
2. **Authentication and security:** email/password login, automatic Password-or-PIN detection, optional 4–6 digit PIN setup/change, server-side PIN hashing, biometric/passkey support, email verification, and password recovery.
3. **Product/UI:** profile and main-page redesign, safe-area-aware mobile headers, balanced top controls, compact bottom navigation, profile welcome layout, and a landing promo video.
4. **Platform reliability:** Realtime Database presence, support tickets, notification preferences, Storage photo upload, staging deployment configuration, and improved signup/onboarding recovery.

Production Firebase was not intentionally modified. The work targets the staging project unless explicitly stated otherwise.

## 1.1 Mandatory change-validation and resource-boundary requirements

These requirements apply to every future change:

1. **Local validation comes first.** Make the change in source, run the local Firebase emulators and local PWA, and give the project owner time to test the complete behavior locally.
2. **No premature release actions.** Do not commit to GitHub, push any branch, build/package a frontend archive or image, or deploy/update Firebase until the change has been fully tested and explicitly approved for release.
3. **Release only after approval.** After local testing and approval, perform the requested validation/build/package/deploy/commit/push steps and report each result separately.
4. **No unrelated resources.** Do not search, access, inspect, transmit data to, or use any resources associated with `@ecobank.com`. Use only the authorized Christian Match Ghana project/account resources.
5. **Preserve existing behavior.** Do not remove existing features, options, records, or compatibility paths while implementing a requested change. If a change may affect existing behavior, stop and obtain confirmation before applying it.

## 2. Repository architecture

```text
frontend/                 React + TypeScript + Vite + Capacitor Android app
frontend/src/             Main React application, views, Firebase services
frontend/public/          Logos, landing photos, promo video, wallpapers, manifest
backend/functions/        Firebase Cloud Functions source and dependencies
infra/firebase/           Firestore, Realtime Database, and Storage rules
firebase.json             Firebase deployment and emulator configuration
.firebaserc               Staging/production Firebase aliases
docs/                     Existing project documentation
HANDOVER.md               This continuation document
```

Important source areas:

```text
frontend/src/MainApp.tsx
frontend/src/components/Layout.tsx
frontend/src/components/Logo.tsx
frontend/src/components/admin/AdminDashboard.tsx
frontend/src/components/admin/AdminAccessControl.tsx
frontend/src/components/admin/AdminLogin.tsx
frontend/src/services/adminRbacService.ts
frontend/src/services/pinAuthService.ts
frontend/src/services/presenceService.ts
frontend/src/services/supportService.ts
backend/functions/src/index.js
backend/functions/src/rbac.js
backend/functions/src/smsService.js
infra/firebase/firestore.rules
infra/firebase/database.rules.json
```

## 3. GitHub state

The current feature branch has been pushed successfully:

```text
Branch:  sync/cmg-local-2026-10-13
Remote:  origin
HEAD:    6c035e1b05f70f63d536596a93d28440e9b27da
```

Recent commits:

```text
6c035e1 build: add explicit Firebase staging build
08edbf1 feat: refine measured admin submenu highlight
a841221 feat: finish admin controls and responsive tables
```

The working tree intentionally still contains local/generated files that were not committed:

```text
firebase-export-1792055726725kDM0Hm/
frontend/dist.zip
tmp/
```

Do not add these unless there is a deliberate reason. They may contain emulator exports, generated archives, or temporary test artifacts.

Do not push directly to `main` or `master`. Continue using a feature branch and pull request workflow.

## 4. Firebase environments

```text
staging     christian-match-ghana     development/testing
production  christianmatch-app        live production system
```

Staging:

```text
Project ID:      christian-match-ghana
Project number:  481815915882
Hosting URL:     https://christian-match-ghana.web.app
Console:         https://console.firebase.google.com/project/christian-match-ghana/overview
```

The configured Firebase CLI account is:

```text
christianmatchghanaltd@gmail.com
```

Do not use or involve the unrelated `atardie@ecobank.com` credential. Do not use an Eco-related billing account.

Always specify the project explicitly:

```bash
firebase --project christian-match-ghana <command>
```

The `.firebaserc` aliases are:

```json
{
  "staging": "christian-match-ghana",
  "production": "christianmatch-app"
}
```

## 5. Current cloud deployment state

### Successfully deployed to staging

The current staging release has been deployed to the development Firebase project:

```text
Project:       christian-match-ghana
Hosting:       https://christian-match-ghana.web.app
Dev web URL:   https://christianmatchghana.com/dev
```

Firestore rules/indexes and Hosting were deployed successfully. Firebase Functions were subsequently deployed successfully after creating the required `SMTP_PASS` Secret Manager version.

The staging Functions deployment includes the Admin RBAC callables, PIN functions, account deletion functions, notification triggers, signup eligibility, and the verification reminder function.

### Staging SMTP secret

The staging project now contains Secret Manager secret version 1 for:

```text
SMTP_PASS
```

The secret value is not stored in Git, `.env`, the frontend ZIP, or this handover. The App Engine service account has `roles/secretmanager.secretAccessor` for the secret.

Do not copy this staging secret to production. Production uses the separate Firebase project `christianmatch-app` and must be configured independently.

### Explicit staging build and deploy

The frontend must be built with the staging mode before deploying to the dev/staging project:

```bash
cd /Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/frontend
npm run build:staging
```

`build:staging` runs:

```bash
vite build --mode staging-web
node scripts/generate-messaging-sw.mjs --mode=staging-web
```

This embeds:

```text
VITE_FIREBASE_PROJECT_ID=christian-match-ghana
VITE_BASE_PATH=/dev/
```

Never use the default production build when deploying the staging frontend. The production build targets `christianmatch-app`.

### Functions deployment history

Functions deployment was previously blocked because `SMTP_PASS` did not exist. That blocker was resolved on 2026-10-20 and the full Functions deployment completed successfully. The previous blocker text in older sections of this document is historical only.
### Realtime Database blocker

The project does not yet have a Realtime Database instance. Database rules are present in:

```text
infra/firebase/database.rules.json
```

The full Firebase deploy stopped because no Realtime Database instance exists. Do not create one silently; choose and document the region first. After the instance is intentionally created:

```bash
firebase deploy --only database \
  --project christian-match-ghana \
  --non-interactive
```

Until then, Realtime Database presence is not available in the deployed staging environment.

## 6. Admin RBAC and administrator management

### Canonical authority model

Admin authority comes from canonical group membership in `adminUsers`, not from legacy `users.isAdmin` fields or frontend menu visibility.

Collections:

```text
adminUsers
adminGroups
adminAuditLogs
```

Default groups:

```text
Super Admin
Admin
Moderator
Customer Support
Finance
Notification Manager
```

Permission examples:

```text
users.view
users.create
users.edit
users.suspend
users.delete
messages.view
messages.moderate
notifications.manage
notifications.email.send
notifications.sms.send
subscriptions.manage
payments.view
groups.manage
permissions.manage
settings.manage
audit.view
```

### Backend protections

Implemented in `backend/functions/src/index.js` and `rbac.js`:

- Backend callable permission checks.
- Regular admins cannot grant Super Admin.
- Regular admins cannot modify the Super Admin group.
- Regular admins cannot grant permissions they do not possess.
- Existing Super Admin access cannot be removed through the normal assignment path.
- Group and assignment changes are audited.
- Client writes to admin access, groups, and audit logs are denied by rules.
- Legacy Super Admin email compatibility remains for the existing configured addresses.

### Administrator creation

The callable is:

```text
adminCreateAdministrator
```

It is Super Admin-only and creates:

- Firebase Auth account.
- Canonical `adminUsers` record.
- `Super Admin` group assignment.
- Full permission catalog.
- Verified email state without requiring email confirmation.
- Non-paid user profile.
- `mustChangePassword: true`.
- Audit record.

The Access Control panel also contains the administrator creation form with:

```text
Username
Full name
Email
Temporary password
```

### `ladmin` status

The requested account is intended to be:

```text
Username: ladmin
Email:    ladmin@christianmatchghana.com
Role:     Super Admin
Paid:     No
Email confirmation: Not required
First login: Forced password change
```

The staging project contains the `ladmin` Admin access record. Do not place any administrator password in source, this handover, logs, or a deployment archive. Verify the account through the protected Admin flow during staging smoke tests.

## 7. Authentication and PIN support

### Password or PIN login

The main login and Admin Portal support automatic credential detection:

- A 4–6 digit credential is treated as a PIN.
- Other credentials are treated as passwords.
- No separate Password/PIN selector is required.
- The login field is labelled `Password or PIN`.
- The identifier field supports email and administrator username.

### PIN security

PIN functionality follows the security pattern from the `onb` project:

- Optional 4–6 digit PIN during onboarding.
- PIN setup/change later from Profile → Settings.
- Existing PIN changes require the current PIN.
- PIN hashes are generated and verified server-side using `scrypt`.
- PIN hashes never enter frontend state.
- Firestore rules deny direct client writes to `pinHash` and `hasPin`.
- PIN setup and change actions are audited.
- PIN login uses a Firebase custom token generated after server-side verification.

Functions:

```text
setUserPin
loginWithPin
```

PIN login is deployed in staging and should be included in staging smoke tests.

### Forced password change

Administrator accounts created by the protected callable set:

```text
mustChangePassword: true
```

The normal app and Admin Portal route those users to a mandatory password-change screen before access. Completion is recorded by:

```text
completeAdminPasswordChange
```

## 8. Frontend and UX changes

### Shared main-page header

`frontend/src/components/Layout.tsx` now uses a balanced three-zone header:

```text
left:   Back, when applicable
center: 64px CMG logo
right:  Logout
```

Top controls use consistent 44px circular buttons and respect mobile safe-area insets.

### Main/profile pages

- Removed old top-left and bottom decorative ribbons from main app views.
- Removed the profile cover-photo rendering that could display washed-out screenshots or broken-looking images.
- Profile uses a professional rounded deep-navy cover card.
- Avatar overlaps the cover card and falls back to initials when no profile photo exists.
- Profile heading uses `Welcome back, <first name>` rather than the full bold name.
- Bottom navigation uses compact 30%-reduced sizing and safe-area-aware bottom padding.

### Landing page

The promo video is first landing slide:

```text
frontend/public/landing-media/promo-vid-1.mp4
```

Behavior:

- Muted autoplay preview.
- 15-second preview for occasional users.
- Fade begins at 12 seconds and transitions to the next photo at 15 seconds.
- Tap restarts the video from the beginning and attempts full playback.
- A visible `Tap to play full video` guide is shown.
- Logo is removed on the video slide.
- Users with more than three successful logins see the video for 5 seconds like other photos.

The video is approximately 9.6 MB. Compress it before broad mobile rollout.

### Presence, support, and notifications

Added locally:

- Realtime Database presence service with heartbeat and `onDisconnect` behavior.
- Support ticket creation and protected `supportTickets` rules.
- Notification preference model and server-side preference checks.
- Deferred SMS adapter that does not contact a provider until a provider contract and secret configuration exist.

## 9. Biometric/passkey support

`frontend/src/services/biometricAuthService.ts` supports:

- Native Capacitor biometric/device authentication.
- WebAuthn platform authenticators where available.
- Secure native credential storage.
- Browser WebAuthn credential records for the web flow.

Normal password login remains the source of truth. Biometric authentication should be tested separately on Android, iOS, and supported browsers before production enablement.

## 10. Validation already completed

The latest application changes passed:

```text
Node backend syntax check
TypeScript noEmit check
Vite staging-web build
Messaging service-worker generation
git diff --check
Firestore rules compilation during Firebase deployment
Storage rules compilation during Firebase deployment
```

Typical local validation:

```bash
cd /Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt
node --check backend/functions/src/index.js
node --check backend/functions/src/rbac.js
cd frontend
node_modules/.bin/tsc --noEmit --pretty false
node_modules/.bin/vite build --mode staging-web
node scripts/generate-messaging-sw.mjs --mode=staging-web
```

The current Desktop package from the latest staging build is expected at:

```text
/Users/andrewstardie/Desktop/cmg-dev-dist-new.zip
```

The package is a root-level deployable archive. Upload its contents to the Stormerhost `/dev/` web root; do not create a nested `dist/` directory. It contains the current staging assets and `firebase-messaging-sw.js` configured for `christian-match-ghana`.

## 11. Holistic future add-ons

### P0 — unblock and stabilize the current release

1. Completed: configured the staging `SMTP_PASS` secret and deployed Functions.
2. Create the Realtime Database instance intentionally, document its region, and deploy database rules.
3. Test password login, username login, PIN login, forced password change, Admin Portal access, and logout with staging accounts.
4. Add a staging smoke-test script that checks Auth, Firestore, Storage, Functions, Hosting, and Rules.
5. Add Firebase billing budgets and email alerts before inviting testers.

### P1 — security and trust

1. Add Firebase App Check for web and Android.
2. Add brute-force protection for PIN attempts, including per-account and per-device lockouts.
3. Add PIN reset/recovery that invalidates prior PINs and active sessions safely.
4. Enforce stronger server-side password policy and session revocation after password reset.
5. Add adversarial Firestore, Storage, Realtime Database, and callable-function rules tests.
6. Add admin step-up authentication for Super Admin actions such as granting Super Admin or changing settings.
7. Add immutable audit export/retention policy and alerting for privilege changes.
8. Add account deletion/export workflows with verified ownership and privacy retention rules.

### P1 — reliability and observability

1. Add Firebase Crashlytics for Android and browser error monitoring for the PWA.
2. Add Cloud Logging dashboards for Functions errors, Auth failures, Storage failures, rules denials, and signup spikes.
3. Add correlation IDs to authentication, upload, payment, and support-ticket flows.
4. Add upload progress, retry, cancellation, and resumable uploads.
5. Add offline/reconnect states for presence, messaging, onboarding, and profile editing.
6. Add automated backups and restore drills for Firestore and Storage with documented RPO/RTO.

### P1 — payments and communications

1. Complete Paystack server-side verification and webhook idempotency.
2. Add subscription reconciliation for delayed, failed, refunded, or disputed payments.
3. Configure verified email sending with SPF, DKIM, and DMARC.
4. Select and implement an SMS provider only after consent, sender ID, cost, and Ghana delivery rules are documented.
5. Add notification delivery history and retry/dead-letter handling.
6. Add admin templates and preview/test-send workflows for email and SMS.

### P2 — testing and delivery

1. Add Firebase Emulator Suite tests for Auth, Firestore, Storage, Realtime Database, and Functions.
2. Add Playwright tests for signup, email verification recovery, password login, PIN login, onboarding, upload, profile, support, and admin RBAC.
3. Add visual regression screenshots for landing, auth, profile, messages, connections, and admin pages.
4. Add CI checks for TypeScript, rules, backend syntax, Vite build, dependency audit, and bundle size.
5. Add preview Hosting deployments for pull requests without production data.
6. Replace manual cPanel upload with a reviewed GitHub Actions SFTP/SSH deployment using repository secrets.

### P2 — product growth and user experience

1. Add paginated discovery/search with Firestore indexes and denormalized counters.
2. Add richer match-quality signals based on faith, goals, location, and preferences.
3. Add report/moderation queues with evidence, appeal workflows, and moderator SLAs.
4. Add support-ticket admin management, assignment, internal notes, status history, and response notifications.
5. Add event/community features such as prayer groups, church/community events, and moderated discussions.
6. Add accessibility testing: keyboard navigation, focus management, contrast, reduced motion, and screen readers.
7. Add localization and regional settings for Ghanaian date, phone, currency, and future country expansion.
8. Add safe static-only service-worker caching; never broadly cache authenticated Firebase responses.

## 12. Immediate next-session checklist

```text
[ ] Verify no Ecobank credential is selected or used.
[x] Configure staging SMTP_PASS and deploy Functions.
[ ] Decide and create the Realtime Database region/instance.
[ ] Test ladmin password login, forced password change, username login, and PIN setup.
[ ] Test regular Admin boundaries and audit records.
[ ] Run staging smoke tests.
[ ] Confirm Hosting URL and Stormerhost /dev deployment after each manual upload.
[ ] Keep firebase-export-*, frontend/dist.zip, and tmp/ out of Git.
```

## 13. Continuation commands

```bash
cd "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt"
git status --short
git log -3 --oneline
git diff --check
```

Confirm GitHub branch:

```bash
git ls-remote --heads origin sync/cmg-local-2026-10-13
```

Confirm Firebase account and project:

```bash
backend/functions/node_modules/.bin/firebase login:list
backend/functions/node_modules/.bin/firebase projects:list
```

Deploy only after checking the project ID in command output:

```bash
backend/functions/node_modules/.bin/firebase deploy \
  --project christian-match-ghana \
  --only functions,firestore,hosting,storage \
  --non-interactive
```

Never use production aliases or modify `christianmatch-app` without a separate explicit production request.

## 14. Latest verified state — 2026-10-20

### Environment mapping

All current development work is first deployed to staging/dev:

```text
Local emulator/dev project: christian-match-ghana
Staging/dev web project:    christian-match-ghana
Production project:        christianmatch-app
```

The production project was not modified during the latest Admin work. Use the separate production environment configuration only for a deliberate production promotion after staging approval.

### Admin frontend work completed

The current Admin frontend includes:

- Admin menu access for users with effective `adminUsers` permissions/groups.
- Persistent selected Admin menu/submenu state across refresh.
- Dashboard, Reports, Users, Operations, Billing, and System navigation.
- Users and Groups compact adjustable tables with non-wrapping checkbox/row-number columns.
- Complete user action menus and status-aware Enable/Disable actions.
- Locked group membership controls until `Add user(s) to group` is selected.
- Admin action confirmation with password/PIN detection and biometric confirmation with a fingerprint icon.
- Admin close/cancel navigation back to the main application.
- Measured menu-to-submenu glow alignment with the outlined N-shaped bridge removed and reduced border thickness/height.

### Build/deployment verification

The latest staging ZIP was rebuilt from the current source and verified to contain:

```text
assets/index-DII-FHWl.js
assets/index-DtGmNcmH.css
Firebase target: christian-match-ghana
Base path: /dev/
```

The live dev URL was verified to reference those same assets:

```text
https://christianmatchghana.com/dev/
```

The current fresh archive is:

```text
/Users/andrewstardie/Desktop/cmg-dev-dist-new.zip
```

The local PWA is not served from the ZIP. `start-cmg-pwa.sh` runs Vite directly from `frontend/src` and overrides Firebase connections to the local emulators. The staging ZIP uses the same source build but connects to the remote dev project.

### Current release identifiers

```text
Git branch:  sync/cmg-local-2026-10-13
Git commit: 6c035e1 build: add explicit Firebase staging build
Hosting:    https://christian-match-ghana.web.app
Dev URL:    https://christianmatchghana.com/dev/
```

The current repository still has intentionally untracked generated/local files:

```text
firebase-export-*/
frontend/dist.zip
```

Do not add these to Git unless explicitly required.

## 15. Continuation update — 2026-10-22

### Local launcher behavior

The local launchers are intentionally separate:

```text
Backend:  start-cmg-emulators.sh
PWA:      run-cmg-pwa.sh → start-cmg-pwa.sh → Vite + Google Chrome only
Android:  run-cmg-android.sh → start-cmg-android.sh → Capacitor APK + Android Studio
```

`run-cmg-pwa.sh` must not be used as an Android launcher. It requires the Auth, Firestore, Functions, Storage, and Emulator UI ports to be running, then starts Vite on a free local browser port and opens Chrome. Use `clear`, not the mistyped `clar`, in the shell command:

```bash
clear && /Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/run-cmg-pwa.sh
```

### Android runner verification

The Android runner was verified after the latest source changes:

```text
Device: emulator-5554
Application ID: com.cmg.christianmatch
Result: debug APK built, installed, and launched successfully
Android Studio: project opened by the launcher
```

The Android launcher now selects the Homebrew Node 22 runtime when available. The Firebase Functions emulator launcher, PWA launcher, and Android launcher use the same Node 22 selection logic. The declared Functions runtime remains Node.js 22.

### Build and dependency fixes

The following local build issues were corrected:

- Moved the wallpaper and Roboto font source copies into `frontend/src/assets/` and updated `frontend/src/index.css` so Vite bundles them instead of leaving unresolved public-relative paths.
- Added Vite manual chunking for Firebase, application components, services, and icons.
- Removed the circular `components → admin → components` chunk split.
- Consolidated redundant runtime dynamic imports that produced Vite mixed static/dynamic import warnings.
- Added the exact `uuid` 11.1.1 npm override for the Capacitor CLI development dependency chain.
- Updated `frontend/package-lock.json`; `npm audit --offline` reports zero vulnerabilities.

Validated after these changes:

```text
frontend: npm run build                         passed
frontend: node_modules/.bin/tsc --noEmit        passed
backend:  node --check src/index.js             passed
backend:  node --check src/rbac.js               passed
Android:  run-cmg-android.sh                    passed
```

The remaining npm output is a non-security upstream deprecation notice for `node-domexception@1.0.0`, pulled through `@google/genai → google-auth-library → gaxios → node-fetch → fetch-blob`. It does not block the build or APK runner.

### Release boundary reminder

No production Firebase deployment, frontend archive release, Git commit, or GitHub push was performed for these local fixes. Production project `christianmatch-app` remains untouched. The generated emulator exports, `frontend/dist.zip`, and temporary build outputs must remain out of Git unless deliberately reviewed and requested.
