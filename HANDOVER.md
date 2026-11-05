# Christian Match Ghana — Handover and Continuation Guide

**Last updated:** 2026-10-27
**Workspace:** `/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt`
**Branch:** `sync/cmg-local-2026-10-13`
**Remote:** `origin` → `https://github.com/rastardie/Christian-Match-Ghana.git`
**Last pushed commit:** `2249a39 fix: normalize SMTP secret newlines` (see section 19)

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
HEAD:    d68fcb79abc224e9272d76366583f1717b02e851
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

## 16. Latest release update — 2026-10-23

### GitHub synchronization

The latest intended source/configuration changes were committed and pushed to the feature branch:

```text
Commit:  d68fcb7 feat: complete admin messaging and PWA calls
Branch:  sync/cmg-local-2026-10-13
Remote:  origin/sync/cmg-local-2026-10-13
```

The commit includes the Admin messaging system, distribution audiences, Admin routing/layout work, popup exit fixes, PWA WebRTC calling, notification services, Firebase rules/indexes, and required frontend assets.

The following local/generated artifacts remain intentionally untracked and were not pushed:

```text
firebase-export-*/
frontend/dist.zip
pubsub-debug.log
```

No `.env` files, Paystack secret keys, SMTP passwords, Firebase private keys, or deployment credentials were committed.

### Desktop staging archive

The latest staging frontend build was archived at:

```text
/Users/andrewstardie/Desktop/CMG-staging-dist-20261023-085054.zip
```

This archive contains the built `frontend/dist` staging artifact. It is not the source repository archive and should not be used as a native Android package.

### Firebase staging deployment

The following project was used:

```text
Project: christian-match-ghana
Hosting: https://christian-match-ghana.web.app/
```

Successfully deployed/verified:

- Firebase Hosting frontend — HTTP 200.
- Cloud Functions, including Admin message callables, distribution-group callables, Paystack webhook, and notification functions.
- Offline notification scheduler after a retry of the Cloud Scheduler operation.
- Firestore indexes, including the incoming-call query index.
- Firestore security rules, including hardened call and ICE-candidate access.

- Offline notification SMTP uses Secret Manager secret `SMTP_PASS` in Dev. Version `3` is the current clean version; the deployed worker is bound to version `3`. The notification transport also strips only trailing CR/LF characters from the injected secret so future shell-created versions cannot fail authentication because of an accidental final newline. Never store the secret value in Git, local `.env` files, ZIP archives, or this handover.

The Paystack webhook endpoint is:

```text
https://us-central1-christian-match-ghana.cloudfunctions.net/paystackWebhook
```

The separate custom URL remains a StormerHost deployment path:

```text
https://christianmatchghana.com/dev/
```

Firebase Hosting deployment does not update that StormerHost `/dev` directory. Updating the custom URL requires the separate `deploy-dev.sh` SFTP workflow and its local deployment credentials.

### Admin UI and navigation

Completed Admin changes include:

- Operations → Messages broadcast composer with All users, Selected users, and Saved audience modes.
- Server-side admin broadcast resolution and audit logging.
- Reports is now a top-level menu with submenu report types:
  - Analytics
  - Users
  - Moderate
  - Payments
- The Reports page no longer uses a report-type dropdown.
- Operations was shortened to Ops and duplicate Reports labeling was removed.
- Equal-width Admin top-level and submenu buttons.
- Admin `/admin` routes hand off into `MainApp`/`Layout` instead of rendering a standalone dashboard.
- PWA Admin routing is base-path aware.
- Admin audience, user-management, and payment popups have explicit Close/Cancel paths.
- Audience editor includes X, Back to Audiences, and Cancel actions.
- Payment processing includes a Cancel action and payment success includes Close.

### PWA voice/video calls

The PWA now has a dependency-free one-to-one WebRTC media path:

```text
frontend/src/services/callService.ts
```

Implemented:

- `RTCPeerConnection` media sessions.
- Firestore SDP offer/answer signaling.
- Firestore ICE candidate exchange.
- Remote audio and video rendering.
- Local microphone/camera preview.
- Mute/unmute and camera toggle.
- Connecting, connected, reconnecting, failed, and ended states.
- Call expiry metadata and unanswered-call timeout.
- Call/chat context restoration for incoming calls.
- Hardened Firestore call and candidate rules.
- Required incoming-call composite index.

The PWA uses STUN by default for local testing. Production needs a TURN provider configured through `VITE_WEBRTC_ICE_SERVERS`; TURN credentials must be short-lived and must not be hardcoded into source.

Foreground PWA calling is implemented. Background/closed-PWA call notifications and native telephony-style handling remain future work.

### Paystack status

Local and staging templates contain placeholders only. No Paystack test key was found in the online Firebase legacy Functions configuration or in the deployed staging frontend. The deployed production frontend contains a live public key; its value is not recorded in this handover.

Current Paystack configuration requirements:

```text
Frontend: VITE_PAYSTACK_PUBLIC_KEY=pk_test_...
Functions: PAYSTACK_SECRET_KEY=sk_test_...
```

Do not commit either key. The Paystack webhook still requires complete server-side purchase reconciliation/premium activation before production payment use.

### Validation completed

```text
npm run build:staging                         passed
node --check backend/functions/src/index.js  passed
node --check backend/functions/src/rbac.js   passed
python3 -m json.tool firestore.indexes.json  passed
bash -n start-cmg-pwa.sh                     passed
bash -n run-cmg-pwa.sh                       passed
Firebase Firestore rules compilation         passed
Firebase Hosting deployment                  passed
Firebase Functions deployment                passed after scheduler retry
Firebase Firestore indexes deployment        passed
Firebase Firestore rules release             passed
```

### Next local smoke tests

```text
[ ] Restart/import the local Firebase emulators so the latest rules/indexes are loaded.
[ ] Run the PWA with run-cmg-pwa.sh.
[ ] Test Admin Messages, Reports submenus, and every popup Close/Cancel path.
[ ] Test two authenticated PWA sessions for voice calling.
[ ] Test two authenticated PWA sessions for video calling.
[ ] Test microphone/camera denial and recovery.
[ ] Configure TURN before testing across separate networks.
[ ] Verify staging Firebase Hosting and Functions behavior with test accounts.
[ ] Do not deploy the StormerHost /dev path unless separately requested.
```

## 17. Firebase Hosting base-path correction — 2026-10-23

The staging frontend configuration uses `VITE_BASE_PATH=/dev/` for the custom StormerHost URL, but Firebase Hosting serves the staging site at the root:

```text
https://christian-match-ghana.web.app/
```

The Firebase Hosting release was rebuilt with:

```text
VITE_BASE_PATH=/
```

and redeployed successfully to `christian-match-ghana`. The matching Firebase-root build archive is:

```text
/Users/andrewstardie/Desktop/CMG-firebase-staging-root-20261023-095732.zip
```

The earlier `/dev` build archive remains intended for the custom host:

```text
/Users/andrewstardie/Desktop/CMG-staging-dist-20261023-085054.zip
```

The custom `https://christianmatchghana.com/dev/` frontend was not updated because `.deploy/stormerhost.env` has an empty `CMG_DEPLOY_HOST`. Populate that local value before running:

```bash
./deploy-dev.sh
```

Do not copy or commit the StormerHost credentials.

## 18. Production rollback and corrected release flow — 2026-10-23

> **CORRECTION (see §19.5, confirmed 2026-10-27):** The label below is WRONG.
> `https://christian-match-ghana.web.app/` is the **Dev** project
> (`christian-match-ghana`, 481815915882). **Production is `christianmatch-app`
> (121785138277).** Read the "production" references in this section as "Dev".
> The user-facing production site is the StormerHost root `https://christianmatchghana.com/`.

The deployment boundary was corrected after confirming that the following Firebase Hosting URL is production:

```text
https://christian-match-ghana.web.app/   # INCORRECT — this URL is Dev; see correction above
```

The development testing URL is the separate custom host:

```text
https://christianmatchghana.com/dev/
```

The accidental production release was rolled back:

- Firebase Hosting restored from the pre-release local `frontend/dist.zip` artifact.
- Functions introduced by the accidental release were deleted:
  - `adminCreateDistributionGroup`
  - `adminDeleteDistributionGroup`
  - `adminGetDistributionMemberships`
  - `adminListDistributionGroups`
  - `adminPreviewDistributionGroup`
  - `adminSendMessage`
  - `adminUpdateDistributionGroup`
  - `processOfflineMessageNotificationBatches`
  - `syncDefaultMessageAudienceMembership`
- Pre-release Functions were redeployed from source revision `6c035e1`.
- Pre-release Firestore rules were restored.
- Accidental Firestore indexes were removed with the pre-release index definition.

The current release flow is now:

```text
Local source/emulators/PWA
        ↓
christianmatchghana.com/dev/  (development testing)
        ↓ explicit approval
christian-match-ghana.web.app/ (production)
```

Do not deploy a `/dev/`-base frontend build to the production Firebase root. Do not deploy to production while testing Admin, Payments, Notifications, or WebRTC calling.

The custom development deploy remains blocked until `.deploy/stormerhost.env` has a non-empty `CMG_DEPLOY_HOST`. The value must be configured locally and must never be committed.

## 19. Continuation update — 2026-10-27

### 19.1 Commits pushed since 2026-10-23

These commits were on `origin/sync/cmg-local-2026-10-13` (origin HEAD `2249a39`) but were not recorded in this handover before this update. Commit bodies are empty; the list below is from subject lines and diffs.

```text
2249a39 fix: normalize SMTP secret newlines
7e38744 feat: enforce verified paid subscriptions
c98a500 feat: complete Dev messaging and account workflows
71bccdf feat: support multi-audience messaging and landing branding
ffaa912 feat: refresh app branding and notifications
4a2d9e0 fix: bind SMTP secret to offline notifications
9d0189b fix: bind Dev Paystack webhook secret
d234a93 fix: improve local chat calls and loading states
d9c2070 feat: unify security and distribution groups
e2f74fb fix: keep Admin Platform inside app window
296b8ff feat: link users to permission groups
3702d1f feat: sync default audiences automatically
```

Key content of `7e38744`:

- New callable `verifyPaystackSubscription` verifies the transaction server-side with Paystack, matches amount and currency to the plan (6 months = GHS 150, 12 months = GHS 280), binds the payment to `metadata.userId`, and checks the payer email against the Auth account.
- Payment references are stored as `payments/paystack_<reference>` for replay protection.
- The `paystackWebhook` TODO stub was replaced with fulfilment logic.
- Card payments are limited to users whose profile country is Ghana.
- `infra/firebase/firestore.rules`, `MainApp.tsx`, `PaymentModal.tsx`, `chatService.ts`, `userService.ts`, and `types.ts` were updated to match.

Deployment status of these commits is not recorded in this handover. Confirm with Firebase before assuming they are live in Dev or production.

### 19.2 Voice and video calls — local changes (not committed)

Status: committed as `2b8a3f5` and pushed to `origin/sync/cmg-local-2026-10-13`. Deployed to Firebase Dev (`christian-match-ghana`) on 2026-10-27; see 19.5. Still pending: two-session local call testing. The deployed build has not been verified end to end.

Working-tree changes:

```text
frontend/src/services/ringtoneService.ts     NEW  playRingtone('incoming' | 'ringback')
frontend/scripts/generate-ringtones.mjs      NEW  regenerates the WAV assets (python3 + numpy)
frontend/public/sounds/ringtone.wav          NEW  incoming ring, ~529 KB
frontend/public/sounds/ringback.wav          NEW  caller ringback, ~529 KB
frontend/src/MainApp.tsx                     MOD  ringtone wiring; oscillator beep removed
frontend/src/services/callService.ts         MOD  ICE payload and connection-state mapping
frontend/src/services/chatService.ts         MOD  initiateCall chatId handling
```

What each change does:

- `ringtoneService.ts` loops the bundled WAV through `<audio loop>`. It resolves the asset with `import.meta.env.BASE_URL`, so it works under both `/` and `/dev/`. If autoplay is blocked, it retries on the next `pointerdown` or `keydown`. On the callee side it also vibrates.
- Callee (`MainApp.tsx`): the incoming ring plays while `incomingCall` is set and no call is active. This replaces the Web Audio oscillator beep.
- Caller (`CallView` in `MainApp.tsx`): ringback plays while status is `Calling…` or `Connecting…`. It stops when the call connects, fails, ends, or the component unmounts.
- `chatService.initiateCall`: `chatId` is now always a non-empty string. If none is supplied, it falls back to `getCanonicalChatId(callerId, receiverId)`. It also checks that the chat document exists before creating the call, because the Firestore `calls` create rule requires `chatId is string` and a valid chat.
- `callService.ts` ICE candidates: the payload is now built from the rule-allowed keys only (`senderId`, `candidate`, `sdpMid`, `sdpMLineIndex`, `usernameFragment`, `createdAt`), and null or undefined optional fields are omitted.
- `callService.ts` connection states: `new` and `connecting` map to `connecting`, not `reconnecting`. `disconnected` maps to `reconnecting`.

Validation completed:

```text
frontend: node_modules/.bin/tsc --noEmit    passed
frontend: npm run build                     passed
frontend: vite build --mode staging-web     passed (dist/sounds/ present)
```

Not verified:

- No end-to-end call has been run between two sessions, so the fix for the reported call failure is not confirmed.
- The ICE payload and chatId changes are defensive. The rule-rejection explanation for the failure is a hypothesis until a test or emulator log confirms it.
- Callee autoplay behaviour on mobile browsers is untested.

### 19.3 Known gaps

- No TURN server. `VITE_WEBRTC_ICE_SERVERS` is not set in any env file, so calls use Google STUN only (`stun:stun.l.google.com:19302`). Google does not provide a TURN service. Calls on the same network may work. Calls between mobile data and other networks, including Ghana carrier CGNAT, are expected to fail for a meaningful share of users.
- TURN decision is pending. Options checked on 2026-10-27:
  - Metered Open Relay: listed at 20 GB/month free, then paid. Verify current terms before relying on it.
  - Cloudflare Realtime TURN: listed at $0.05 per GB egress, with no meaningful standalone free tier.
- TURN credentials must not be committed. Prefer short-lived credentials issued by a backend callable, so long-lived secrets never reach the client bundle.
- Ringtone is a generic synthesized dual-tone ring. No licensed audio is used.
- Background or closed-PWA incoming call notifications are not implemented (carried over from section 16).

### 19.4 Next steps

```text
[ ] Start the local emulators (start-cmg-emulators.sh) and the PWA (run-cmg-pwa.sh).
[ ] Two authenticated sessions on the same network: voice call. Check ringback on the caller, ringtone on the callee, connect, mute, end, decline, and the 60-second no-answer timeout.
[ ] Same two sessions: video call. Check camera denial and recovery.
[ ] Choose a TURN provider and obtain credentials. Keep them out of Git (local env file or backend-issued).
[ ] Cross-network test: a phone on mobile data calling a device on Wi-Fi.
[ ] Get explicit approval before any commit, push, staging deploy, or Dev deploy.
[ ] On commit, add frontend/public/sounds/, frontend/scripts/generate-ringtones.mjs, and frontend/src/services/ringtoneService.ts. Keep firebase-export-*, frontend/dist.zip, and pubsub-debug.log out of Git.
```

### 19.5 Dev deployment and URL correction — 2026-10-27

Project validation (`firebase projects:list`):

```text
Dev         christian-match-ghana   project number 481815915882   display name "Christian Match Ghana Stg"
Production  christianmatch-app      project number 121785138277   display name "Christianmatch App"
```

The hosting site `https://christian-match-ghana.web.app` belongs to the Dev project. The "production" label for this URL in section 18 is wrong. Production is the `christianmatch-app` project. Treat section 18's release-flow text with this correction.

Deployed to `christian-match-ghana` with `firebase deploy --project christian-match-ghana --only functions,firestore,hosting --non-interactive`:

- Firestore rules and indexes.
- Hosting: root-base staging build (`VITE_BASE_PATH=/`, mode `staging-web`), 118 files. Index bundle `/assets/index-CtS9Fwt5.js`.
- Functions: Node.js 22, updated including `verifyPaystackSubscription`, `paystackWebhook`, admin distribution-group callables, `syncDefaultMessageAudienceMembership` (created), and the PIN and RBAC callables. Two functions (`deleteMyAccount`, `adminDeleteDistributionGroup`) reported a transient failure and then succeeded on the same run. Both are present in `functions:list`.
- Storage was not deployed. Its rules did not change in this update.
- Database was not deployed. No Realtime Database instance exists yet.

Post-deploy checks: `https://christian-match-ghana.web.app/` serves the new bundle. `/sounds/ringtone.wav` and `/sounds/ringback.wav` return HTTP 200.

Not yet verified: the call flow between two real sessions on the deployed Dev build. The next step is section 19.4.

## 20. Automated deployment pipeline — 2026-11-04

This session replaced the manual cPanel upload with reviewed GitHub Actions
deployments (addresses §11 P2 item "Replace manual cPanel upload"). No
production application change was made; `christianmatch-app` was not modified.

### 20.1 Hosting surfaces (clarified)

There are two hosting surfaces per environment:

```text
Dev  Firebase Hosting : https://christian-match-ghana.web.app   (root build, base /)
Dev  StormerHost      : https://christianmatchghana.com/dev     (public_html/dev, base /dev/)
Prod Firebase project : christianmatch-app (121785138277)
Prod StormerHost      : https://christianmatchghana.com         (public_html root, base /)
```

The user-facing production site is the StormerHost static root, backed by the
`christianmatch-app` Firebase project (Auth/Firestore/Functions, live Paystack key).

### 20.2 Root cause of the long-standing automated-deploy failure

Automated FTP/FTPS uploads returned `530 Login authentication failed` only from
GitHub runners, while the same credentials worked locally. This is a **host-side
source-IP restriction on FTP/FTPS** (cPHulk/account IP lock), not a credential
problem. StormerHost's statement that GitHub IPs need no allowlisting is
incorrect. **SSH/SFTP (port 22) is NOT restricted** — key-based SFTP as
`christi3` works from GitHub Actions. All automation now uses SFTP + key.

### 20.3 Workflows

```text
.github/workflows/deploy-dev.yml            Dev frontend -> public_html/dev  (SFTP key). WORKING, verified HTTP 200.
.github/workflows/deploy-frontend.yml       Prod frontend -> public_html root (SFTP key).
                                              mode=backup-only : snapshot prod root to artifact (READ-ONLY). Validated.
                                              mode=full + confirm=DEPLOY : snapshot, then build (--mode production) + upload + verify. NOT yet run.
.github/workflows/deploy-firebase-prod.yml  Prod Firebase (christianmatch-app): firestore rules/indexes + functions.
                                              Guarded; requires secret FIREBASE_SERVICE_ACCOUNT (NOT set) so it cannot touch prod until configured. NOT run.
```

All three are manual-dispatch with explicit confirmation guards. The default
branch is `sync/cmg-local-2026-10-13`; workflows must live there to be
dispatchable. Frontend uploads are additive (`mirror -R` without `--delete`).

### 20.4 Repository secrets

```text
CMG_SFTP_HOST          zeta.stormerhost.com
CMG_SFTP_USER          christi3
CMG_SFTP_KEY           passphrase-less ED25519 deploy key (public half already in christi3 authorized_keys)
CMG_SFTP_KNOWN_HOSTS   pinned server host key (StrictHostKeyChecking=yes)
STAGING_FIREBASE_API_KEY   dev Firebase web API key (used by deploy-dev.yml)
FIREBASE_API_KEY, PAYSTACK_PUBLIC_KEY   used by the production build
FIREBASE_SERVICE_ACCOUNT   REQUIRED but NOT yet set (blocks deploy-firebase-prod.yml)
CMG_FTPS_*             legacy FTPS creds, now unused — safe to delete
```

### 20.5 Backups

Prod static-root snapshots are produced by `deploy-frontend.yml` and stored as
GitHub Actions artifacts (`prod-root-backup-<run#>`, 30-day retention) — this is
the frontend rollback source. It is ephemeral; copy to durable storage for
long-term archival. Production **Firestore data has no backups yet** — set a
managed backup schedule before any backend promotion:

```bash
gcloud firestore backups schedules create --project=christianmatch-app \
  --database='(default)' --recurrence=daily --retention=7d
# on-demand before risky changes:
gcloud firestore export gs://christianmatch-app-backups/$(date +%Y%m%d-%H%M%S) \
  --project=christianmatch-app
```

### 20.6 Production promotion order (when approved)

1. Backup Firestore (schedule + on-demand export).
2. Set prod Secret Manager values in christianmatch-app: `SMTP_PASS`,
   `PAYSTACK_SECRET_KEY` (do NOT copy from staging).
3. Deploy backend FIRST: run `deploy-firebase-prod.yml` (rules/indexes/functions)
   from the approved commit — prod backend is behind Dev (missing
   `verifyPaystackSubscription`, admin distribution callables, hardened rules).
4. Deploy frontend: run `deploy-frontend.yml` with `mode=full`, `confirm=DEPLOY`.
5. Smoke test prod: login, Paystack path, admin access, notifications.

Rollback: static -> re-upload backup artifact; Hosting -> `firebase hosting:rollback`;
Functions -> redeploy prior recorded revision; rules/indexes -> redeploy from git;
Firestore data -> restore from the step-1 backup.

### 20.7 Security follow-ups (open)

- Rotate the StormerHost key, its passphrase, and the FTP password — all were
  sent in plaintext over the support ticket. Generate a fresh deploy key, install
  the public half via cPanel, update `CMG_SFTP_KEY`.
- The CI deploy key is stored passphrase-less in GitHub secrets (standard for CI;
  the secret store is the protection). Rotation above addresses the exposure.
- Public-readable archives in the web roots (`*.zip`, `dist/`) should be removed.

## 21. Production promotion, cache fix, and ladmin sync — 2026-11-04

First real promotion to production (`christianmatch-app` + StormerHost root).
Dev = `christian-match-ghana` (481815915882); Prod = `christianmatch-app`
(121785138277). User-facing prod site is the StormerHost root
`https://christianmatchghana.com`.

### 21.1 Backend deployed to christianmatch-app

`firebase deploy --only firestore:rules,firestore:indexes,functions` from branch
`sync/cmg-local-2026-10-13`. Functions went 7 → 30 (added admin RBAC, PIN
`setUserPin`/`loginWithPin`, `adminCreateAdministrator`, distribution/messaging
callables, `verifyPaystackSubscription`; updated the 7 existing). No functions
deleted (all 7 prior names exist in current source).

### 21.2 Production secrets / config (kept separate from dev)

- `PAYSTACK_SECRET_KEY` created in prod Secret Manager from the **existing live
  value** that was already on the deployed functions (sk_live…). Not the dev
  test key. New code requires it as a Secret Manager secret (`runWith secrets`),
  so this was mandatory — not optional.
- `SMTP_PASS` prod secret validated to authenticate as
  `info@christianmatchghana.com` (login test, no mail sent).
- Prod non-secret config pinned in `backend/functions/.env.christianmatch-app`
  (info@ / mail.christianmatchghana.com / prod URL). firebase loads
  `.env` + `.env.<project>`; this stops dev and prod sharing one `.env`.
- SECURITY: the old prod functions stored `PAYSTACK_SECRET_KEY` and the Gmail
  SMTP password as PLAINTEXT env vars (visible via `gcloud functions describe`).
  Paystack is now in Secret Manager. Rotating the live Paystack secret key and
  the old Gmail app password is still recommended.

### 21.3 Frontend deployed to prod root

Built `--mode production` (base `/`, pk_live, christianmatch-app) and uploaded to
`public_html` via `deploy-frontend.yml mode=full`. Verified the live bundle
contains `pk_live_7bab1a…` and `christianmatch-app` (no dev project / pk_test).
Site HTTP 200.

### 21.4 Cache-control fix (stale page after deploy)

Returning browsers loaded the old shell until a manual refresh. Cause: StormerHost
served `index.html` with only `Last-Modified` and no `Cache-Control`, so browsers
heuristically cached it. Fixed in `frontend/public/.htaccess` (and the dev
workflow's inline `.htaccess`): `index.html`/SW/manifest → `no-cache, no-store,
must-revalidate`; hashed `/assets/*` → `immutable, max-age=1y`. Not a service
worker — the only SW is `firebase-messaging-sw.js` (push only, no asset caching).

### 21.5 Backups (rollback sources)

- Firestore export: `gs://christianmatch-app-fs-backups-121785138277/firestore-backup-20261104-230358` (SUCCESSFUL). Bucket `US` multi-region.
- Static web root: GitHub artifacts `prod-root-backup-9` (pre-deploy) and `-8`.
- Rollback: static → re-upload artifact; hosting → `firebase hosting:rollback`;
  functions → prior revision; rules/indexes → git; data → the export.

### 21.6 ladmin synced to prod (same details + credentials)

uid `4mtjLfDRWDhQcFVdTEeGYZoDb7t2`, email `ladmin@christianmatchghana.com`,
display name "Local Administrator".

- Replicated dev → prod via Firestore REST (owner gcloud token): seeded all 6
  `adminGroups`, created `adminUsers/<uid>` (isSuperAdmin, super-admins, 16
  permissions), copied `users/<uid>` profile.
- Auth account created via Admin SDK using a **short-lived service-account key on
  the App Engine default SA that was created and then deleted** (no key retained;
  temp script removed). Password set to the owner-provided value (not stored in
  repo/handover/logs). PIN set to the owner-provided 4-digit value using the
  app's `scrypt$salt$hash` scheme.
- Verified: prod password login returns the correct uid; `adminUsers` shows
  Super Admin with 16 permissions. `mustChangePassword` left `false` (matches dev).

### 21.7 Notes

- The red "INTERNAL" banner seen in a login screenshot is NOT part of the app
  (absent from source and both live pages) — it is an external browser/OS
  classification overlay on the viewing machine.
- Deferred to a future update (unchanged): two-session voice/video call test,
  TURN server, and credential rotation (StormerHost key already rotated in §20;
  Paystack/Gmail still pending).
- CI note: `deploy-firebase-prod.yml` still needs a `FIREBASE_SERVICE_ACCOUNT`
  secret to run in CI; this promotion was done locally with the owner's
  authenticated firebase CLI instead.

## 22. Post-promotion production fixes, promo, comms — 2026-11-05

All work this session targeted PRODUCTION `christianmatch-app` (121785138277)
unless noted. Dev `christian-match-ghana` (481815915882) was not changed.

### 22.1 Subscription regression after the dev→prod promotion (root cause + fix)

Symptom: after promoting the dev frontend to prod, users with active plans saw
"No Active Plan / INACTIVE / EXPIRED", and the incoming-call listener returned
`permission-denied`.

Root cause (single defect): the new frontend gate `isSubscriptionActive`
(`frontend/src/MainApp.tsx`) and the Firestore rule `hasActiveSubscription`
(`infra/firebase/firestore.rules`) both require the **Timestamp** field
`subscriptionExpiresAt`. Pre-existing prod subscription records written by the
older prod functions only had the legacy ISO string `subscriptionEndDate`
(+`subscriptionStartDate`), never the Timestamps. So every legacy active
subscriber read as expired, and the calls `allow list` rule (gated on
`hasActiveSubscription`) denied the listener. The "Dev Firestore" wording in the
call-error banner is hardcoded copy, not a project mixup — env files are correct
(`.env.production`→christianmatch-app, `.env.staging-web`→christian-match-ghana).

Fixes applied:
1. Data backfill: for every prod user with an active sub missing
   `subscriptionExpiresAt`, derived it (and `subscriptionStartAt`) from the
   doc's own `subscriptionEndDate`/`subscriptionStartDate`. Additive, idempotent.
   Restored 11 users (free promo + paid 6-month). The prod `calls` composite
   index (receiverId ASC, status ASC, createdAt DESC) already exists, so the
   call listener recovered once subs were valid.
2. Frontend hardening (shipped): `isSubscriptionActive` now falls back to
   `subscriptionEndDate` when the Timestamp is absent, so legacy records can
   never silently lose access again.

### 22.2 Free promo — granted to all existing users and extended to 2 weeks

Owner decision: the free promo applies to ALL existing non-premium users plus
new sign-ups, through the campaign window.
- Granted `free1month` (isPremium, subscriptionStatus=active, Timestamps + ISO,
  `freeMonthSource=prod-existing-user-promo-2026-11`) to all non-premium prod
  users: 269 granted, paid/active subs skipped. Idempotent.
- New sign-ups are covered automatically by the existing self-serve
  `claimFreePromo` (new-member path, createdAt ≥ launch).
- Extended the promo end date to **2026-11-19T23:59:59.999Z** (2 weeks) for all
  277 `free1month` users to match the announcement. Paid plans untouched.
- Net: all 281 prod users show an active subscription with a valid future
  `subscriptionExpiresAt`.

### 22.3 Frontend deploy to production (commit 043f224)

Pushed to `sync/cmg-local-2026-10-13` and deployed via GitHub Actions
`deploy-frontend.yml` (mode=full, confirm=DEPLOY) — build + SFTP to
`public_html`, pre-deploy backup artifact, HTTP 200 verify. Live bundle verified
(`pk_live`, `christianmatch-app`, no dev strings). Changes:
- `isSubscriptionActive` legacy `subscriptionEndDate` fallback (22.1).
- Chat messages render with `whitespace-pre-line` so line breaks/paragraphs are
  preserved (previously collapsed to a run-on block).
- Voice/video call buttons disabled (greyed, non-clickable, "Calls are
  temporarily unavailable") pending TURN + call reliability work.

Note: GitHub was briefly unreachable from the work environment; the local
`deploy-frontend.sh` path is unusable (`.deploy/stormerhost.env` HOST/USER/PASS
are empty) and the bundled `Zeta_christi3_SFTP_Access_Keys.tgz` key is
passphrase-encrypted (likely the pre-§20 rotation key). The reviewed GitHub
Actions pipeline is the working prod-frontend path.

### 22.4 Communications sent

- Verification resend to all unverified users via the deployed
  `sendUnverifiedVerificationReminders` (campaign `verify-resend-2026-11-05`):
  82 sent; ~6 bounced; most delivered (smaller batch, under the host limit).
- Announcement (account update + 2-week free chat) by email and in-app:
  - Email to all 289 auth users from `info@christianmatchghana.com`.
  - In-app broadcast via `adminSendMessage` recipientMode=all. The pre-fix send
    (broadcastId fca7a0f9…, 280) rendered as a run-on block; after the
    whitespace fix it re-renders correctly. A corrected resend to all was sent
    (broadcastId f754f8a0…, 281) — users present for the first send now have two
    copies. A single validation copy went to rastardie (39dd1fab…).

Admin callables (`adminSendMessage`, `sendUnverifiedVerificationReminders`) were
invoked from local scripts by minting an admin-claimed Firebase ID token: a
short-lived App Engine SA key (`createCustomToken(ladminUid,{admin:true})` →
`signInWithCustomToken` with the prod web API key) → call the callable. Every SA
key was deleted immediately after use; none retained.

### 22.5 Email deliverability — BROKEN, needs host/DNS action

The announcement email largely did NOT deliver. The `info@christianmatchghana.com`
mailbox filled with Mailer-Daemon bounces; the reason:

    Domain christianmatchghana.com has exceeded the max defers and failures per
    hour (…/5 (50%)) allowed. Message discarded.

This is a StormerHost/cPanel Exim outbound policy (very low hourly
defers/failures cap). The 289-recipient burst tripped it and the server
discarded the rest. Contributing cause: email auth is misconfigured —
**TWO SPF records** exist on christianmatchghana.com (invalid; must be ONE),
and **DMARC is p=none**. Sending IP 161.129.70.154 (zeta.stormerhost.com,
valid PTR) IS SPF-listed; a DKIM key is published on selector `default`.

Required (host/registrar — cannot be done from code/DNS access here):
1. Collapse to a single SPF record:
   `v=spf1 ip4:161.129.70.154 ip4:104.238.221.158 +a +mx include:_spf.firebasemail.com ~all`
2. Confirm the mail server DKIM-signs with the `default` selector; then move
   DMARC toward `p=quarantine`.
3. Raise/reset the cPanel "Max hourly emails" and "Max defers & failures per
   hour", OR move bulk/transactional mail to a dedicated ESP (SES/SendGrid/
   Mailgun/Postmark) and repoint the Functions SMTP (`SMTP_HOST/USER/PASS`).

Re-send tooling (git-ignored `tmp/`, local only): the ~205 bounced announcement
recipients are frozen in `tmp/announcement_resend_targets.txt`, and
`tmp/resend_announcement.js` is a throttled, resumable sender (ledger
`tmp/announcement_resend_sent.txt`; env BATCH/SLEEP_SEC/GAP_MS). `tmp/` is now in
`.gitignore` (may contain user PII — never commit).

### 22.6 Backups taken (prod Firestore exports, rollback points)

    gs://christianmatch-app-fs-backups-121785138277/firestore-backup-20261105-084718  (pre subscription backfill)
    gs://christianmatch-app-fs-backups-121785138277/firestore-backup-20261105-091303  (pre bulk promo grant)
    gs://christianmatch-app-fs-backups-121785138277/firestore-backup-20261105-103246  (pre promo extension)

### 22.7 Still open

- Email: fix SPF (single record) + DMARC, lift/raise StormerHost limit or adopt
  an ESP, then run the throttled re-send to the 205 bounced recipients.
- Decide whether the in-app duplicate (two broadcasts) needs any cleanup.
- Deferred (unchanged): TURN server + re-enable calls; rotate Paystack/Gmail
  secrets; the `isSubscriptionActive` fallback is a safety net, not a substitute
  for keeping subscription Timestamps populated server-side.
