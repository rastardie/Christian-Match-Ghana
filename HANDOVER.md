# Christian Match Ghana — Handover and Continuation Guide

**Last updated:** 2026-11-10 (see section 24 for the current state; sections 1–23 are historical)
**Workspace:** `/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt`
**Branch:** `sync/cmg-local-2026-10-13`
**Remote:** `origin` → `https://github.com/rastardie/Christian-Match-Ghana.git`
**Last pushed commit:** `1d1492d feat: left-hand sub-menus for every admin section` on `origin/sync/cmg-local-2026-10-13`. Local-only commit `3bc269c fix: close admin security gaps` is NOT pushed yet (GitHub unreachable). See section 24.

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
HEAD:    superseded — see section 23 for the current commit
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

### 22.8 Auto-logout + dev brought to parity — 2026-11-05 (later)

- Added 60-minute inactivity auto-logout (frontend). An idle timer in the main
  authenticated component (`MainApp.tsx`) signs the user out via `handleLogout`
  after 60 min with no pointer/keyboard/touch/scroll activity; any interaction
  resets it. Commit `d11097c`.
- Deployed the full current frontend to BOTH environments from
  `sync/cmg-local-2026-10-13`:
  - PROD (`christianmatch-app`) via `deploy-frontend.yml` (mode=full) →
    `christianmatchghana.com`. Verified: auto-logout + disabled-calls live,
    `christianmatch-app` + `pk_live`.
  - DEV (`christian-match-ghana`) via `deploy-dev.yml` (DEPLOY-DEV) →
    `christianmatchghana.com/dev/`. Verified: auto-logout + disabled-calls live,
    dev project, no live Paystack key.
  Dev now carries every frontend change made for prod this session
  (subscription fallback, message line-break fix, disabled call buttons,
  auto-logout).
- Dev subscription data brought to parity: all 6 dev `free1month` users extended
  to `2026-11-19T23:59:59.999Z` with the `subscriptionExpiresAt` Timestamp
  backfilled where missing. Dev has no non-premium users, so no grant was
  needed. Before-state saved to git-ignored `tmp/dev_sub_backup.json`.
  (No dev emails/announcements were sent — comms were prod-only.)

## 23. Current state snapshot — 2026-11-07

This section supersedes the open-item statements in sections 19.3 and 19.4 where they conflict. Section 19.3 says the TURN decision is pending. That is no longer true.

### 23.1 Repository

```text
Branch:       sync/cmg-local-2026-10-13
HEAD:         c2a90e0 (equals origin/sync/cmg-local-2026-10-13)
Tracked tree: clean
Untracked (keep out of Git): firebase-export-*/, frontend/dist.zip, pubsub-debug.log
```

Commits from 2026-10-27 to 2026-11-06, oldest first: `2b8a3f5` call ringtones and call signaling, `8539b9a` Dev deploy record, then the Nov 4–6 series from sections 20–22 (CI, production promotion, subscription fixes, auto-logout), `9bb233f` brand refresh, `22e66a4`, `12e655b`, and `57bf7b0` call enablement on Dev, `49be590` Metered TURN, and `c2a90e0` badge update.

### 23.2 Environments and what each serves

```text
Dev         christian-match-ghana  (481815915882)  https://christianmatchghana.com/dev/   calls ON (VITE_CALLS_ENABLED=true, deploy-dev.yml)
Prod        christianmatch-app     (121785138277)  https://christianmatchghana.com        calls OFF (VITE_CALLS_ENABLED not set)
Firebase    christian-match-ghana.web.app  (Dev project hosting)
```

Firebase Dev hosting (`christian-match-ghana.web.app`) was last deployed from `2b8a3f5` (section 19.5). It does not include the Nov 4–6 frontend or call commits. Redeploy it before using it for call tests.

The StormerHost `/dev` site was last deployed on 2026-11-05 (section 22.8). It does not include the Nov 6 call fixes or the TURN change. Redeploy it before testing calls there.

Prod has not been redeployed since 2026-11-05. Commits `9bb233f` (brand and boot splash) and `c2a90e0` (badge update) are not in prod. Confirm before any production promotion.

### 23.3 Calls and TURN

- Voice and video are gated per environment by `VITE_CALLS_ENABLED`. Dev enables them. Prod disables them and shows "Calls are temporarily unavailable".
- TURN is implemented. The `getCallIceServers` callable (`backend/functions/src/index.js`, ~line 1934) mints short-lived Metered credentials. The client calls it from `callService.ts` and falls back to Google STUN if the callable fails.
- Dev has `getCallIceServers` deployed (Node.js 22). The Secret Manager secret `METERED_SECRET_KEY` exists in `christian-match-ghana`. `METERED_DOMAIN` is set in `backend/functions/.env.christian-match-ghana`.
- Prod does not have `getCallIceServers` deployed. Do not enable calls in prod until it is deployed and the Metered secret is set in `christianmatch-app`.
- Ringtone and ringback (section 19.2) are on this branch.

Not verified: an end-to-end call between two real sessions, with and without TURN, on any deployed environment. The Metered account, quota, and credential behaviour have not been checked in this session.

### 23.4 Security checks (2026-11-07)

- No tracked file in Git matched common secret patterns (`.tgz`, `.pem`, `.key`, service-account, `.env`, credentials, SFTP). Re-check before each commit.
- No Metered key or long hex secret is hardcoded in `backend/functions/src/index.js`.
- The `ladmin` password and PIN in section 21.6 are placeholders. Keep them that way.
- Still open from section 22.7: rotate Paystack and Gmail secrets, and fix the email SPF (single record) and DMARC records.

### 23.5 Tooling note

On this machine the agent shell flagged `VITE_BASE_PATH=/ npm run build:staging` as an interactive editor. Use the form `env VITE_BASE_PATH=/ npm run build:staging` instead. The root-base build is needed for Firebase Hosting (section 19.5). The `/dev/` build is needed for StormerHost.

### 23.6 Local artifacts

- `/Users/andrewstardie/Desktop/CMG-staging-dist-20261027-082941.zip` is the `/dev/`-base build from `2b8a3f5`. Use it only for a StormerHost upload, and rebuild first, because it lacks the Nov 4–6 changes.

### 23.7 Next steps

```text
[ ] Two-session call test on christianmatchghana.com/dev/ with TURN enabled (cross-network: mobile data to Wi-Fi).
[ ] Confirm the Metered free-tier quota and the account owner. Do not commit the key.
[ ] Redeploy Firebase Dev hosting and the StormerHost /dev site from c2a90e0, then re-run the call test.
[ ] Before enabling calls in prod: deploy getCallIceServers to christianmatch-app, set METERED_SECRET_KEY there, run the call test on Dev, and get explicit approval.
[ ] Email: SPF, DMARC, and the throttled resend (section 22.5).
[ ] Rotate Paystack and Gmail secrets (section 22.7).
```

### 23.8 Test status — reported 2026-11-07

- Voice and video calls work between two sessions on the same Wi-Fi network. The build and URL used for this test are not recorded here. Confirm before the next test.
- Cross-network calls (mobile data to Wi-Fi, or two different carriers) are not yet tested. This is the test that exercises TURN. Same-network success does not prove the TURN relay works.
- Recommended check before the cross-network test: in Chrome `chrome://webrtc-internals`, the selected candidate pair during a call should show `relay` on at least one side when the devices are on different networks. A `host` or `srflx` pair on the same network does not prove TURN is used.

### 23.9 Environment model (authoritative) and icon fix — 2026-11-07

Use "dev" only for `christian-match-ghana` (481815915882) and "production" only for `christianmatch-app` (121785138277). Each environment has two surfaces: a Firebase Hosting site and a StormerHost static site.

```text
                    Dev                                              Production
Firebase project    christian-match-ghana (481815915882)             christianmatch-app (121785138277)
Firebase Hosting    christian-match-ghana.web.app (root)             christianmatch-app (Hosting)
StormerHost site    https://christianmatchghana.com/dev              https://christianmatchghana.com
StormerHost path    public_html/dev/                                 public_html/ (site root)
Frontend build      npm run build:staging (--mode staging-web,       vite build --mode production (base /, live Paystack key)
                    base /dev/ for StormerHost)
Deploy workflow     deploy-dev.yml (confirm DEPLOY-DEV), SFTP key   deploy-frontend.yml (mode full, confirm DEPLOY), currently blocked
                    working                                          (FTPS password IP-blocked) + firebase deploy
```

All StormerHost targets use the SFTP account `christi3` on `zeta.stormerhost.com`, port 22.

Discrepancy to resolve: section 22.8 records a production frontend deploy via `deploy-frontend.yml` on 2026-11-05. The environment table above lists that workflow as blocked. Confirm which mechanism is currently reliable before the next production frontend deploy.

Correction to section 18: `christian-match-ghana.web.app` is the Dev Firebase Hosting site, not production.

Icon fix (installed-app logo):

- Problem: the black logo ring touched the image edges. The rounded-square home-screen mask clipped it at the corners.
- Change: `frontend/public/icon-512x512-v3.png`, `icon-192x192-v3.png`, and `apple-touch-icon-v3.png` were regenerated from `landing-logo-circle.png`. The ring now spans about 12% to 88% of the icon, inside the 80% maskable safe zone, on a white background.
- Not changed: the Android native launcher icons in `frontend/android/app/src/main/res/mipmap-*`. If the phone app is the native Capacitor build, those need regenerating too.
- Deployment: the icons take effect on the phone only after a Dev or production frontend deploy, and after the installed app is reinstalled or its icon is refreshed.

### 23.10 Deploys and logout-on-close — 2026-11-08

Deployed (icon fix, commit `a96c576`, pushed to `origin/sync/cmg-local-2026-10-13`):

- Firebase Dev hosting (`christian-match-ghana.web.app`): root-base build from `a96c576`, hosting only. Verified: the live icon hash matches the fixed icon.
- StormerHost Dev (`christianmatchghana.com/dev`): `deploy-dev.yml` run 42457104089 on `sync/cmg-local-2026-10-13`, completed with success. Verified: the live icon hash matches the fixed icon.
- Production: not deployed.

Correction to 23.2: the Dev hosting and `/dev` bundles were both replaced today, so both now include the Nov 6 call commits. The `getCallIceServers` string is in the lazy `services-*.js` chunk, so a grep on the index bundle alone returns 0. This is not evidence the TURN code is missing.

Logout when the app closes (local, not committed, not deployed):

- Before: the sign-in form had a "Keep me signed in" checkbox. When it was ticked, Firebase used local persistence and the session survived app restarts. Persistence was set only at sign-in time.
- Change: `frontend/src/firebase.ts` sets `browserSessionPersistence` at startup. `frontend/src/MainApp.tsx` always uses session persistence for password, PIN, and social sign-in. The "Keep me signed in" checkbox and its state are removed. The biometric hint text no longer mentions the checkbox.
- Expected result: closing the app or tab ends the session. The next launch shows the sign-in screen.
- Verified: `tsc --noEmit` passes and the staging build succeeds.
- Not verified: the behaviour in a browser or on the Android app. Test before release.

Open decision: biometric quick login (`handleBiometricLogin`) reuses credentials saved at a previous password sign-in. It is user-triggered, not automatic, but a fingerprint unlock is not typed credentials. Confirm whether biometric login is acceptable under the "must sign in with credentials" rule, or disable it.

Users who previously ticked "Keep me signed in" keep their existing local session until its next sign-in. Firebase moves the current session into session storage at startup, so it ends the next time the app closes.

Test plan before release:

```text
[ ] run-cmg-pwa.sh with the emulators: sign in with password, reload (should stay signed in), close the tab, reopen (should show sign-in).
[ ] Repeat for PIN sign-in and Google/Apple sign-in.
[ ] Android: sign in, swipe the app away from recents, reopen (should show sign-in).
[ ] Confirm the "Forgot password" link still sits on the right of the sign-in form.
```

### 23.11 Inactivity sign-out changed to 30 minutes — 2026-11-08

Supersedes the 60-minute limit in section 22.8.

- Change: `frontend/src/MainApp.tsx`, the inactivity effect. `INACTIVITY_LIMIT_MS` is now 30 minutes. The sign-out message now says 30 minutes.
- Mobile fix: browsers pause timers while the app is backgrounded or the phone is locked. The effect now also records the last interaction time and checks elapsed time when the app regains focus or becomes visible. A 30-minute idle session therefore signs out on return, not later.
- Interactions that reset the timer are unchanged: mouse move and down, key down, touch start, scroll, and click.
- Local only. Not committed and not deployed.
- Verified: `tsc --noEmit` passes and the staging build succeeds.
- Not verified: the timer in a browser or on Android. Test before release:

```text
[ ] Sign in, leave the app idle for 30 minutes: expect sign-out and the message.
[ ] Sign in, interact every few minutes: expect no sign-out.
[ ] Android: sign in, lock the phone for more than 30 minutes, unlock: expect sign-out on return.
```

### 23.12 Message bell on every page; notification settings only from Profile — 2026-11-08

Problem:
- The header bell opened the notification settings page when there were no unread messages.
- The Profile header bell also opened notification settings.
- The bell was not available on Profile, Admin, or Edit Profile, which hide the shared header.
- The Admin header bell opened the prayers tab, not messages.

Change (local only, not committed or deployed):
- New shared component `frontend/src/components/MessageNotificationBell.tsx`. It shows the unread-message count and a panel with:
  - unread conversations (tap to open the chat);
  - "Mark all as read" when there are unread messages;
  - "Manage messages" (opens the Messages list);
  - an empty state, "No unread messages.", when there are none.
- The bell never navigates to settings.
- `frontend/src/components/Layout.tsx`: uses the shared bell in the header. The old `onNotifications` prop is removed and `onOpenMessages` is added. A floating bell appears on pages without the shared header (Edit Profile).
- `frontend/src/MainApp.tsx`: Profile header uses the shared bell (`onOpenSettings` is no longer wired to the bell). The Admin view receives the message props.
- `frontend/src/components/admin/AdminDashboard.tsx`: the header bell is the shared message bell. The old prayers-tab shortcut is removed.
- Notification settings: reachable only through Profile → Settings → Notifications.

Verified: `tsc --noEmit` passes and the staging build succeeds.

Not verified: rendering and behaviour in a browser or on Android. Test:

```text
[ ] Discover, Likes, Messages, Profile, Admin, Edit Profile: the bell is visible on each page.
[ ] With unread messages: the badge shows the count, and the panel lists conversations. Tapping one opens that chat.
[ ] "Mark all as read" clears the badge. "Manage messages" opens the Messages list.
[ ] With no unread messages: the panel shows "No unread messages." and the bell does not open settings.
[ ] Profile → Settings → Notifications still opens notification settings.
```

Open point: the Call screen is a full-screen overlay and does not show the bell. Confirm whether that is acceptable.

### 23.13 Prayers shortcut restored; bell on the call screen — 2026-11-08

- Admin header: restored the Prayers shortcut (heart icon, "Prayer requests") next to the message bell. The Prayers entry is also still in the Admin side menu.
- Call screen (`CallView` in `MainApp.tsx`): the message bell now sits in the top bar, next to the local video preview.
- During a call, opening a conversation or "Manage messages" would unmount the call, so both show "End the call to open messages." Mark-all-read still works during a call.
- Pre-login screens (sign-in, onboarding) have no messages and do not show the bell.
- Incoming-call overlay (full screen, above everything) does not show the bell until it is answered or declined.

Verified: `tsc --noEmit` passes and the staging build succeeds. Not verified in a browser or on Android.

### 23.14 Installed-app unread badge — 2026-11-08

What already existed:
- The app sets the installed-app badge with the Badging API (`navigator.setAppBadge`) from the total unread count (`syncAppBadge` in `notificationService.ts`).
- The server sends `data.unreadCount` in every chat-message push (`backend/functions/src/index.js`, ~line 734). The deployed service worker uses it to update the badge while the app is closed.

Platform support (checked 2026-11-08):
- iPhone/iPad, Home Screen web app (iOS 16.4+): numeric red badge through the Badging API. Needs notification permission.
- Desktop Chrome/Edge: numeric badge through the Badging API.
- Android Chrome (installed PWA): the Badging API is not supported. Android shows a badge only while notifications are active, not a numeric count set by the web app.
- Native Capacitor Android: native push is disabled unless `VITE_NATIVE_PUSH_ENABLED=true`, so this build gets no push badge.

Changes (local only, not committed or deployed):
- `frontend/scripts/generate-messaging-sw.mjs` (the deployed service worker):
  - notifications use `icon-192x192-v3.png`, not the old `icon-192x192.png`;
  - each notification stores `data.chatId`;
  - the icon path honours a shell `VITE_BASE_PATH`, as Vite does. Before, root-base builds pointed at `/dev/`.
- `frontend/public/firebase-messaging-sw.js`: the same notification changes, kept in sync with the generator.
- `frontend/src/services/notificationService.ts`: new `closeDeliveredWebNotifications(chatId?)`. It closes this app's delivered notifications, optionally only one chat's.
- `frontend/src/MainApp.tsx`:
  - the badge sync waits for chats to load. Before, every launch cleared the badge briefly;
  - when unread reaches 0, delivered notifications are closed;
  - opening a chat closes that chat's notifications;
  - "Mark all as read" closes all delivered notifications.

Verified: `tsc --noEmit` passes. The generated service worker passes `node --check` and has the chat id data and the v3 icon. The root build uses `/icon-192x192-v3.png` and the dev build uses `/dev/icon-192x192-v3.png`.

Not verified: a real iPhone, iPad, or Android device.

Still open:
- Android Chrome PWAs cannot show a numeric red count from the web app. A numeric count on Android needs the native app with push enabled (`VITE_NATIVE_PUSH_ENABLED`) and native badge handling.
- Confirm the device model and that notification permission was granted.
- The Dev hosting build from `a96c576` has the old service worker (`/dev/icon-192x192.png`). Redeploy Dev hosting and the `/dev` site before testing badges there.

### 23.15 Dev release — 2026-11-08

Pushed to `origin/sync/cmg-local-2026-10-13`:
- `3b0ac55` session-only sign-in, 30-minute inactivity sign-out, message bell and app badge.
- `bf0aa31` handover update.

Deployed to Dev (these changes are frontend only; no functions or rules changed):
- Firebase Dev hosting (`christian-match-ghana.web.app`): root-base build, hosting only. Live bundle `assets/index-hB5Jhi7i.js`.
- StormerHost Dev (`christianmatchghana.com/dev`): `deploy-dev.yml` run 42460874989, completed with success. Live bundle `assets/index-EnedH55A.js`. Its service worker uses `/dev/icon-192x192-v3.png`.
- Production (`christianmatch-app`, `christianmatchghana.com` root): not deployed. Live bundle `assets/index-BnfUBPhK.js`, unchanged.

Not yet tested on a device. The test checklists are in sections 23.11, 23.12, and 23.14. Test on Dev before any production release.

### 23.16 Notification panel above all pages — 2026-11-08

Problem (screenshot, 2026-11-08 14:30): the bell panel was cut off at the header and drawn underneath the page content. The app frame clips and stacks its children, so a panel rendered in place could not sit above them.

Fix (local only, not committed or deployed): `frontend/src/components/MessageNotificationBell.tsx` now renders the panel and its backdrop into `document.body` with fixed positioning, placed under the bell's on-screen position.
- Panel z-index `z-[1200]`, backdrop `z-[1199]`. This is above the page content, the header, the navigation bar, and the call overlay (`z-[600]`). It is below the sign-out dialog (`z-[2000]`) and the incoming-call overlay (`z-[700]`), which shows the call prompt first.
- Closes on Escape, on page scroll (scrolling inside the panel is allowed), and on a tap outside it. Follows window resize.

Verified: `tsc --noEmit` passes and the staging build succeeds. Not verified in a browser or on a device.

Test:
```text
[ ] Open the bell on Discover, Likes, Messages, Profile, Admin, Edit Profile, and during a call: the panel is fully visible above the content.
[ ] Scroll the page with the panel open: the panel closes.
[ ] Tap outside the panel: it closes. Escape closes it on desktop.
```

### 23.17 Admin > Users layout — 2026-11-08

Changes to the Users tab (`frontend/src/components/admin/AdminDashboard.tsx`), local only:
1. The separate toolbar above the list (search, Filter, Add User, Export CSV) is removed. This gives the list more space.
2. The search box is now in the Users card header, between the "Users" heading and the "N users" count. It fills the space between them.
3. Filter, Add User, and Export CSV are icon-only buttons (Filter, UserPlus, Download), on the same line as the description, aligned right. Each has a title and aria-label.
- The Filter popover is positioned under its button. The Users card no longer hides overflow, so the popover is not clipped.

Verified: `tsc --noEmit` passes and the staging build succeeds. Not verified in a browser or on a phone.

### 23.18 Dev release — 2026-11-08 (Users layout and message panel)

- GitHub: `origin/sync/cmg-local-2026-10-13` at `eeff21f`.
- Firebase Dev hosting (`christian-match-ghana.web.app`): root-base build, hosting only. Live bundle `assets/index-CT-NhZL6.js`.
- StormerHost Dev (`christianmatchghana.com/dev`): `deploy-dev.yml` run 42491555540, success. Live bundle `assets/index-axvhuKfM.js`.
- Production (`christianmatch-app`, `christianmatchghana.com` root): not deployed. Live bundle `assets/index-BnfUBPhK.js`, unchanged.
- GitLab: no GitLab remote is configured for this repository, so nothing was pushed there. A GitLab project URL is needed to add the remote.

### 23.19 Profile page cleanup — 2026-11-08 (local, not committed or deployed)

Changes in `frontend/src/MainApp.tsx` (ProfileView and helpers):
- "Spiritually Solid / Your profile is 100% complete!" card: removed. It shows only while the profile is incomplete ("Complete Your Profile"). The blue verified check beside the name already marks a complete profile.
- Subscription card (Free Premium Access / paid plans): shown only in the last `SUBSCRIPTION_ALERT_DAYS` (14) days before expiry, as a shorter card. It is hidden the rest of the time. Helpers: `SUBSCRIPTION_ALERT_DAYS` and `subscriptionDaysLeft()` (exported beside `isSubscriptionActive`).
- The "Inactive / Expired" Subscribe card is unchanged, so users without a plan are still prompted.
- Cover photo and avatar: a photo that fails to load is hidden, so no broken image or alt text shows. The avatar falls back to initials. Before, a broken cover showed "Andrews's cover", and a broken avatar showed "Profile" over the photo area.

Verified: `tsc --noEmit` passes and the staging build succeeds. Not verified in a browser.

Open: the cover and avatar images failed to load on the test account. Check the stored photo URLs in Firestore and Storage access for that profile, since the fallback only hides the symptom.

Test:
```text
[ ] Profile with 100% completion: no "Spiritually Solid" card; the blue check beside the name shows.
[ ] Incomplete profile: "Complete Your Profile" card shows.
[ ] Free promo with more than 14 days left: no subscription card. Within 14 days: the shorter card with Renew shows.
[ ] Expired or no plan: the Subscribe card shows.
[ ] Broken or missing cover/avatar: no alt text; avatar shows initials.
```

### 23.20 Pencil edit button per profile section — 2026-11-08 (local, not committed or deployed)

- Profile (`ProfileView` in `frontend/src/MainApp.tsx`): a pencil button in each section header:
  - A. Basic Information → Edit Profile, "Basic Details"
  - B. Personal & Lifestyle → "Personal & Lifestyle"
  - C. Education & Work → "Education & Work"
  - D. Relationship Intentions → "Relationship Intentions"
  - Walk with Christ → "Faith Statement"
- Each pencil opens the existing Edit Profile form and scrolls to the matching section. The form has anchor ids `edit-section-basic`, `-faith`, `-personal`, `-work`, `-intentions`. Opening Edit Profile from anywhere else clears the focus target.
- Validation: unchanged. Save runs the existing `getMissingFields` checks in `EditProfileView.saveProfile`, so a section edit is rejected for the same reasons a full edit is. Consequence: a section cannot be saved on its own while another required field is still empty. A per-section save with its own validation would be a separate change.

Verified: `tsc --noEmit` passes and the staging build succeeds. Not verified in a browser.

Test:
```text
[ ] Each pencil opens Edit Profile scrolled to the matching section.
[ ] Edit a field, Save with all required fields filled: saved and back on Profile.
[ ] Save with a required field empty: the existing "Please fill in: ..." message appears and nothing is saved.
[ ] Edit Profile opened from the settings menu starts at the top.
```

### 23.21 Profile settings menu reorganized — 2026-11-08

- The Profile settings dropdown (`ProfileView`, `frontend/src/MainApp.tsx`) is rebuilt:
  - width 256px, so every label fits on one line; items use `whitespace-nowrap`;
  - tighter item padding (`py-2.5`) and no extra group gaps;
  - a divider between every item.
- Items, in order: Edit Profile, Security & login, Notifications, Daily Word & Prayer Wall, Dark Mode, Report a Problem, Log Out, Delete Account. Every action is unchanged.

Verified: `tsc --noEmit` passes and the staging build succeeds. Not verified in a browser.

### 23.22 Dev release — 2026-11-08 (profile pencils, settings menu, photo fallbacks)

- GitHub: `origin/sync/cmg-local-2026-10-13` at `8200d1e`, plus this record.
- Firebase Dev hosting (`christian-match-ghana.web.app`): root-base build, hosting only. Live bundle `assets/index-BFUkjodd.js`.
- StormerHost Dev (`christianmatchghana.com/dev`): `deploy-dev.yml` run 42501752100, success. Live bundle `assets/index-D-nYw6sx.js`.
- Production (`christianmatch-app`, `christianmatchghana.com` root): not deployed. Live bundle `assets/index-BnfUBPhK.js`, unchanged.
- GitLab: no GitLab remote is configured for this repository.

### 23.23 Incoming-call listener denial banner — 2026-11-08 (local, not committed or deployed)

Cause (confirmed in code): the app started the incoming-call listener for every signed-in user. The Firestore `calls` list rule (`hasActiveSubscription`) denies users who lack an active plan with a Timestamp expiry in the future. Each denial showed the banner "Dev Firestore denied the call listener".

Change (`frontend/src/MainApp.tsx`):
- `hasCallEntitlement(user)` mirrors the rule: `subscriptionStatus == 'active'` and `subscriptionExpiresAt` is a Timestamp in the future.
- The listener starts only for entitled users, and re-runs when entitlement changes.
- A permission-denied error is logged and no longer shown as a banner. Other errors still show.

Not confirmed: why an entitled user is denied after a refresh. The Dev profile tested passes the rule. Confirm by capturing `Incoming call listener failed` from the console on the affected device, with the user's entitlement state.

Verified: `tsc --noEmit` passes and the staging build succeeds. Not verified in a browser.


## 24. Session update — 2026-11-09 to 2026-11-10 (landing, Dev identity, prod sync, admin console, security fixes)

### 24.1 Current release state

```text
Branch:                  sync/cmg-local-2026-10-13
origin (pushed):         1d1492d feat: left-hand sub-menus for every admin section
local only (NOT pushed): 3bc269c fix: close admin security gaps
Production (christianmatch-app / christianmatchghana.com root): frontend 1d1492d, admin console live at /adm/
                         rules and 24 admin functions still from before 3bc269c (see 24.6)
Dev (christian-match-ghana / christianmatchghana.com/dev): rules and 24 admin functions from 3bc269c; frontend from 1d1492d
```

GitHub was unreachable from the workstation (TLS handshake timeouts and connection resets) during the last steps. Retry `git push -u origin sync/cmg-local-2026-10-13` before the next Dev frontend deploy.

### 24.2 Landing page, install row, branding

- Landing install row: App Store, Google Play, and Install Web App buttons. The row stays visible when the web app is installed; only Install Web App is disabled. Native Capacitor builds hide the row. Installed detection works only in standalone mode.
- Store badges: Google Play uses Google's official `google-play-badge-en.png`. The App Store badge in `frontend/public/store-badges/app-store-badge-en.png` is a cut-out from a stock JPG and MUST be replaced with Apple's official badge before public release. Apple's artwork license requires developer-account acceptance.
- Store buttons enable only on their own platform and only when `VITE_IOS_APP_STORE_URL` / `VITE_PLAY_STORE_URL` are set (both empty in `frontend/.env.example`).
- Service worker: a network-only `fetch` handler was added in `generate-messaging-sw.mjs` (Chrome needs it for the install prompt).
- Logo: `frontend/public/landing-logo-circle-v4.png` (outer white removed by flood fill, transparent background, 512 px). `Logo.tsx` and the landing page use v4 everywhere.
- Dev-only install identity (commit `e8d9b6f`): `frontend/scripts/dev-install-identity.mjs` runs only in `build:staging` and refuses other modes. It writes the "CMG Dev" manifest name and short name and DEV-badged icons from `frontend/scripts/dev-icons/`. Production builds are unaffected.

### 24.3 Firebase export and log housekeeping

- Export folders moved out of the repo root to `cm/exports/firebase-exports/` using the name pattern `firebase-export_YYYY-MM-DD_HHMMSS_<id>`. Emulator debug logs moved to `cm/exports/firebase-logs/`.
- Known gap: Firestore data is not exported on a schedule and no November export exists. Export-on-exit from the emulator writes temp folders, which is why no November export appeared.

### 24.4 Production sync on 2026-11-09 (before the admin console)

- Backup first: `cm/backups/prod-20261109-102724/` holds the StormerHost snapshot `prod-root-backup-13/prod-root-backup.tgz`, `prod-functions-before.txt` (32 functions), and `prod-firestore-rules-before.rules`.
- Firestore rules released to `christianmatch-app`, functions updated (added `getCallIceServers`), and the frontend deployed via `deploy-frontend.yml` run `42609884792` (built `e8d9b6f`). Live manifest shows "CMG" with no Dev project references.
- `METERED_SECRET_KEY` was copied from Dev to production Secret Manager (version 1). The value was never printed or stored. Production Firebase deploy from the local CLI was used because `FIREBASE_SERVICE_ACCOUNT` is not set in GitHub, so `deploy-firebase-prod.yml` cannot run.

### 24.5 Desktop admin console (`/adm`)

Route and build:

- `christianmatchghana.com/adm/` (production) and `christianmatchghana.com/dev/adm/` (Dev). `christianmatch.com` was rejected because it has no DNS records.
- Separate Vite entry: `frontend/admin.html` → `frontend/src/admin/main.tsx`. The public bundle excludes it. `frontend/scripts/place-admin-entry.mjs` moves `dist/admin.html` to `dist/adm/index.html`.
- Sign-in accepts a login name or email. A 4–6 digit credential uses `loginWithPin`; anything else uses password. Non-admins are signed out at once. `mustChangePassword` blocks access until changed.
- Auth-hang fallback: a 6-second timer shows the sign-in form if `onAuthStateChanged` never fires (headless Chrome never fires it).

Commits and where they were deployed:

```text
1db8333  Phase 1 shell, sign-in gate, Vite entry          Dev
abbfbe5  login name / PIN / password sign-in fix          Dev
e2b7ac0  Phase 2 Overview, Users, Prayers, Moderation     Dev
e365de2  Phase 3 Payments, Audit, Access, Groups, Messages Dev
7666808  Payments: Subscriptions section, load errors     Dev (run 42675671785)
78a16a9  parity: users, audiences, messaging, access, analytics + six user callables   Dev (run 42697804180)
1d1492d  left-hand sub-menus for every admin section     Dev (run 42699404263); prod (run 42700674573)
```

Panels now present (sidebar sub-menus from `frontend/src/admin/adminNav.ts`, passed to panels as `view`):

```text
Overview:        Dashboard, Analytics & reports (print)
Users:           All users, Add user, Subscribers, Blocked users
Prayers:         Prayer requests, Export (CSV)
Moderation:      Reports (shows "not connected" state), Blocked accounts (Unblock)
Messages:        Compose (All / Selected / Audiences), Conversations
Payments:        Payment records, Subscriptions
Audiences:       All audiences, New audience (preview, members, delete)
Audit log:       All activity, Account changes, Admin changes
Access control:  Groups & permissions, Administrators, Create administrator (Super Admin only)
```

Users panel actions (all sensitive actions go through `AdminActionDialog`, which requires the admin's password):

- Add user (via `adminCreateUser`), edit profile (`adminUpdateUserProfile`), block/unblock (`adminSetUserBlocked`), delete (`deleteUserAccount`), set password and force change (`adminSetUserPassword`, `adminSetMustChangePassword`), password reset email (`adminSendPasswordResetEmail`), PIN clear/set (`adminResetUserPin`), subscription grant/extend/revoke (`adminSetSubscription`), group membership (`adminAssignUserGroups`), CSV export. Bulk actions where legacy had them.

Callables added (in `backend/functions/src/index.js`, appended after `adminSetUserPassword`): `adminCreateUser`, `adminUpdateUserProfile`, `adminSetUserBlocked`, `adminResetUserPin`, `adminSetSubscription`, `adminSetMustChangePassword`. Frontend wrappers: `frontend/src/services/adminUserActions.ts`, `adminAccessActions.ts`.

Production state for the admin console:

- Backup before the production deploy: StormerHost artifact `prod-root-backup-15` (GitHub run `42700036303`, 25 MB). Function list recorded in `cm/backups/prod-20261109-211251-pre-admin-parity/`.
- Production functions deployed with `--only` for the six new callables only (32 → 38). No Paystack function touched. Rules unchanged. `SMTP_PASS` access granted to the production App Engine service account (same as Dev).
- Verified: `/adm/` returns 200, public site 200, admin bundle has no Dev project references, new sub-menu strings present.
- NOT verified: sign-in and actions with a real production admin. Production admins still need `adminUsers` records; until then only the legacy Super Admin account (`christianmatchghanaltd@gmail.com`) and the `ladmin@` account can sign in.

Admin accounts (no secrets recorded):

```text
Dev  adminUsers: 3 records. ladmin@christianmatchghana.com is super-admin. Two group-assigned records.
Prod adminUsers: 2 records. ladmin@christianmatchghana.com is super-admin. One group-assigned record.
Auth: ladmin@christianmatchghana.com exists in both projects. christianmatchghanaltd@gmail.com exists in prod only.
Auth: admin@example.com does NOT exist in either project.
```

### 24.6 Security fixes — committed locally, partly deployed (`3bc269c`)

Found by a read-only review of the admin callables and rules:

1. The placeholder super-admin email `admin@example.com` was hard-coded in rules, callables (`LEGACY_SUPER_ADMIN_EMAILS`, campaign admin list), and the client (`App.tsx`, `AdminLogin.tsx`, `adminRbacService.ts`). Because it grants rule-level super-admin access, anyone who could register that address could become a super admin. It was removed everywhere. Only `christianmatchghanaltd@gmail.com` keeps built-in rights.
2. Blocked accounts kept admin access. `hasAdminPermission` in rules now requires `users/{uid}.isBlocked != true`. `requireAnyAdminPermission` refuses blocked callers (including the legacy super admin). The console and legacy admin login sign blocked accounts out with "This account is blocked."
3. Any `groups.manage` admin could make a regular member an administrator by adding groups (this creates an `adminUsers` record). `adminAssignUserGroups` now refuses this unless the caller is a Super Admin.
4. `deleteUserAccount` checked only `users.delete`. Now: self-delete refused; administrator accounts deletable only by Super Admin (their `adminUsers` record is removed too); the organisation account can't be deleted; a `user.deleted` audit entry is written.
5. `adminSetUserBlocked`: only Super Admin can block an administrator.

Deployment status for 3bc269c:

- Dev: rules released; 24 functions deployed with `--only` (the admin callables, `deleteUserAccount`, `checkSignupEligibility`, `sendUnverifiedVerificationReminders`, `completeForcedPasswordChange`). `verifyPaystackSubscription` and `paystackWebhook` were deliberately NOT deployed.
- Dev frontend: NOT deployed (needs the push).
- Production: NOT deployed. Production still has the `admin@example.com` bypass until rules and functions are deployed. Required steps: backup-only snapshot (`deploy-frontend.yml` mode `backup-only`), then rules and the same 24 functions to `christianmatch-app` with `--only`, then the frontend full deploy (`deploy-frontend.yml` mode `full`, confirm `DEPLOY`) from the pushed commit.
- Not verified by a test: blocked-account sign-in, the delete protections, and the group-assignment refusal. Needs a non-admin test account on Dev.

Note: the Dev rules compile check and `node --check` passed; `tsc --noEmit` passed for the frontend.

### 24.7 Paystack and payments findings (no code change)

- Production Paystack is working. Production `payments` has 5 successful records (May–June 2026, GHS 50 each). The owner has confirmed production Paystack must not be changed, and no Dev Paystack change is to be synced to production.
- Dev `payments` has 0 records. Dev's `verifyPaystackSubscription` shows no invocation logs in the last 60 days. The 25 Oct Dev webhook event (reference `cmg-dev-key-test`, processed with status 200) left no payment record; the function code at that time may have differed. The owner says the settings test used a Paystack test key on Dev; the server-side record is still missing and is unexplained.
- Dev's 3 active subscriptions are `free1month` grants from 20 Oct, not Paystack payments.
- Admin Payments panel now shows a Subscriptions section and surfaces load errors instead of an empty table.

### 24.8 Known open issues (ordered by priority)

1. Push blocked: GitHub unreachable from the workstation. Commit `3bc269c` is local only.
2. Production security fix not deployed (24.6). Highest priority.
3. PIN-only admins cannot confirm sensitive actions: `AdminActionDialog` requires the admin's password. Decide whether to accept the admin PIN too (the server has `loginWithPin`).
4. Moderation Resolve, Dismiss, and Ban are not implemented. Reports need a Firestore rule for `reports` (admin read/write) and the `reports` collection must exist. Rules change needs approval.
5. `loginWithPin` returned `iam.serviceAccounts.signBlob denied` on Dev on 18 Oct (custom token minting). Check production PIN login before admins rely on it.
6. Admin "Add to group" for regular members (now refused for non-Super Admins) must be communicated to operators.
7. `getAdminUsers`, `getAdminPayments`, `getAdminPrayers` swallow errors and return `[]`, so a failed load looks like "No records". Blocked accounts view, dashboard widgets, and reports are affected. `loadAdminPayments` and `loadAdminSubscriptions` are the throwing versions.
8. Audit log "Details" column shows `[object Object]` for object details.
9. Audit counts cover only the newest 100 entries (`adminListAuditLogs`).
10. Prayers list has no error handling on load (pre-existing).
11. App Store badge must be replaced with Apple's official artwork (24.2).
12. Conversations list has no message counts (chat document doesn't store them).
13. Legacy `admin@` placeholder text remains in `AdminLogin.tsx` input placeholders (cosmetic).
14. Upload/hosting: `frontend/dist.zip`, `.firebase/`, `.firebase-emulator-data/` remain in the repo folder and must stay out of Git.

### 24.9 Next-session checklist

```text
[ ] git push -u origin sync/cmg-local-2026-10-13 (retry until GitHub responds)
[ ] Dev frontend: deploy-dev.yml, confirm DEPLOY-DEV, from the pushed commit
[ ] Dev smoke test with a non-admin test account: blocked sign-in, delete protections, group-assignment refusal
[ ] Get explicit owner approval, then production: backup-only → rules + 24 functions (--only) → frontend full (DEPLOY)
[ ] Production verification: /adm/ sign-in, one admin action per sub-menu, prod admin records
[ ] Decide item 24.8.3 (PIN confirmation) and 24.8.4 (moderation rules)
[ ] Replace the App Store badge when Apple's artwork is available
```

Commands that were used (for reference; check the project ID in output before any deploy):

```bash
gh workflow run deploy-dev.yml --repo rastardie/Christian-Match-Ghana --ref sync/cmg-local-2026-10-13 -f confirm=DEPLOY-DEV
gh workflow run deploy-frontend.yml --repo rastardie/Christian-Match-Ghana --ref sync/cmg-local-2026-10-13 -f mode=backup-only
gh workflow run deploy-frontend.yml --repo rastardie/Christian-Match-Ghana --ref sync/cmg-local-2026-10-13 -f mode=full -f confirm=DEPLOY
./backend/functions/node_modules/.bin/firebase deploy --project christianmatch-app --only "firestore:rules,functions:<names>" --non-interactive
```

Never deploy `verifyPaystackSubscription` or `paystackWebhook` as part of an admin change.


## 25. Current continuation snapshot — 2026-11-12

This section is authoritative for the current CMG work. Older sections remain historical unless explicitly superseded here.

### 25.1 Repository state

```text
Workspace: /Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt
Branch:    sync/cmg-local-2026-10-13
HEAD:      93fb20b feat(admin): add # row-number column to all admin record tables
Origin:    origin/sync/cmg-local-2026-10-13 (same commit)
Tracked changes: none
Untracked: frontend/dist.zip (generated artifact; keep out of Git)
```

Latest relevant commits, newest first:

```text
93fb20b feat(admin): add # row-number column to all admin record tables
62fed8c feat: Connect starts chat immediately for subscribed members; acceptance flow paused
045beed feat: Discover shows matches as a horizontal tile row
c4c34b9 feat: in-app password reset page and sortable admin users table
```

The Onboard project at `/Users/andrewstardie/Documents/TUTS/TESTS/onb` is out of scope for this continuation and must not be modified unless explicitly requested.

### 25.2 Release boundary and deployment state

All new CMG changes continue to follow Dev-first testing. Do not promote to production without a separate explicit owner request and a fresh pre-production backup.

```text
Dev Firebase:       christian-match-ghana
Dev StormerHost:    https://christianmatchghana.com/dev/
Production Firebase: christianmatch-app
Production website: https://christianmatchghana.com/
```

Dev currently includes the latest `93fb20b` frontend/admin table changes. Production includes the earlier approved reset, Discover, and instant-connect changes through `62fed8c`, but does not yet include the `#` row-number-column change from `93fb20b`.

Production backup set from the last approved promotion:

```text
backups/pre-prod-deploy-20261112-185604/
  - Firestore export: pre-prod-20261112-185604
  - StormerHost snapshot: prod-root-live.tgz (785 files)
  - rules, storage rules, and function-list manifests
```

Do not use the existing backup as a substitute for a fresh backup before a future production promotion.

### 25.3 Latest product changes

- Admin record tables now show a `#` column immediately after the selection checkbox where a checkbox exists, numbered according to the displayed row order. The change is Dev-only pending approval.
- Discover now presents matching profiles as a horizontal tile row, ordered recent-first with session anchor support. Matching is opposite-gender only; unknown viewer gender returns no matches; admin-blocked profiles are excluded.
- Connect creates a chat immediately through the server callable when both members have active subscriptions. The former request/accept/cancel flow remains commented out rather than deleted. Chat rules still require active subscriptions for both participants.
- Password reset uses the in-app `/reset-password` page with a confirmation field. The SMTP/admin-generated reset path remains the intended path; links sent before this page existed may still open Firebase’s one-field hosted page and should be resent.
- Structured connection logging and notification helpers remain in the codebase; logs must contain identifiers and operational metadata only, not message contents or secrets.

### 25.4 Open items

```text
[ ] Test the # column across every Dev admin record table, including pagination/filtering if applicable.
[ ] Get explicit approval before promoting 93fb20b to Production.
[ ] Before production promotion: take a fresh Firestore export, rules/function snapshot, and StormerHost root backup.
[ ] Re-send any password-reset links created before the in-app reset page was deployed.
[ ] Test instant Connect with two subscribed Dev accounts.
[ ] Confirm an unsubscribed account cannot start or access chat.
[ ] Capture the Dev /adm/ Actions-menu screenshot and browser console output if the ladmin menu still differs from Production.
[ ] Verify connection logs in Cloud Logging using jsonPayload.component="connections".
[ ] Resolve the remaining email deliverability/SPF/DMARC and secret-rotation items from sections 22.5 and 22.7.
```

### 25.5 Safe continuation commands

```bash
cd "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt"
git status --short --branch
git log -5 --oneline
git diff --check
```

Never commit `frontend/dist.zip`, emulator exports, temporary logs, credentials, keys, or secret values. Never deploy Production while a change is still being tested in Dev.


## 26. Admin client profile editing expanded — 2026-11-12 (local only)

### 26.1 Problem and root cause

The `/adm/` Users → Edit profile modal and the `adminUpdateUserProfile` callable previously allowed only eight fields: name, phone, age, gender, location, country, bio, and denomination. The normal client profile contains substantially more details, so Admin users could edit only a limited portion of client accounts.

### 26.2 Local implementation

The permission-checked admin edit path was expanded without opening arbitrary Firestore writes:

```text
frontend/src/admin/panels/users/UserFormModals.tsx
frontend/src/services/adminUserActions.ts
backend/functions/src/index.js
```

The Admin edit modal now groups editable client fields into:

- Identity and contact
- Personal and lifestyle
- Faith and church
- Education and work
- Relationship intentions and preferences

The callable allowlist now covers the client profile details represented by the normal profile editor, including date of birth, height, marital/children fields, lifestyle, church and faith fields, education/work, intentions, relocation, and partner preferences. Numeric and boolean fields receive type/range validation and text fields receive length limits.

These remain protected and are intentionally not editable through the general profile modal:

```text
passwords and PINs
subscription and premium state
verification state
roles, admin flags, and permissions
blocked state
profile photos/media
server timestamps and audit metadata
```

Those areas continue to use their dedicated administrative workflows where applicable.

### 26.3 Validation

Passed locally:

```text
frontend: node_modules/.bin/tsc --noEmit --pretty false
backend:  node --check src/index.js
repo:     git diff --check
```

Status:

```text
[ ] Test the expanded form in the local emulator/PWA or Dev console with a real admin.
[ ] Verify editing one field and all profile sections preserves unchanged data.
[ ] Verify invalid numeric/boolean values are rejected.
[ ] Verify protected fields remain unavailable and unchanged.
[ ] Commit only after owner confirms the Dev behavior.
[ ] Deploy to Dev only after explicit release approval.
[ ] Do not promote to Production until Dev testing is complete and a fresh backup is taken.
```

No commit, push, frontend build archive, Firebase deployment, or Production change was performed for this update.


## 27. Full client profile edit deployed to Dev — 2026-11-12

The approved profile-edit implementation from application commit `d9b463e` was released to Dev only.

```text
Dev Firebase project: christian-match-ghana
Dev Firebase Hosting: https://christian-match-ghana.web.app/
Dev StormerHost:     https://christianmatchghana.com/dev/
Admin routes:         /adm/ and /dev/adm/
Dev Functions:        adminUpdateUserProfile updated successfully
StormerHost workflow: 43615448983 (successful)
```

Firebase deployment included the Dev frontend and Functions. The deployed Admin bundles on both Dev hosting surfaces contain the expanded profile sections, including Faith and church and relationship preference fields. HTTP verification returned 200 for both app and Admin routes on both surfaces.

Production was not changed.

The StormerHost workflow emitted only GitHub's runner deprecation annotations for Node.js 20 actions; the deployment itself completed successfully.


## 28. Full chat transcript review deployed to Dev — 2026-11-12

The full read-only Admin conversation viewer was committed and deployed to Dev.

```text
Application commit:   f7d5f70 feat(admin): add full chat transcript review
Dev Firebase:         christian-match-ghana
Dev Firebase Hosting: https://christian-match-ghana.web.app/adm/
Dev StormerHost:      https://christianmatchghana.com/dev/adm/
Dev workflow:          43618342248 (successful)
Dev callable:          adminListConversationMessages (deployed)
```

The Admin → Messages → Conversations screen now has a `View full chat` action for admins with `messages.content.view`. The transcript is read-only and each transcript load records `admin.chat.transcript.viewed` in the admin audit log. Built-in Admin-group members receive the permission through their group identity; Moderators and Customer Support do not receive it automatically.

HTTP verification returned 200 for both Dev Admin routes and the deployed Admin bundles contain the transcript viewer. Production was not changed. The existing generated `frontend/dist.zip` remains untracked.


## 29. Deleted-message retention and Admin transcript highlighting deployed to Dev — 2026-11-14

The archive-preserving chat deletion update was committed and released to Dev only.

```text
Application commit:   0af4599 feat(chat): retain deleted messages for admin review
Dev Firebase project: christian-match-ghana
Dev Firebase Admin:   https://christian-match-ghana.web.app/adm/
Dev StormerHost Admin: https://christianmatchghana.com/dev/adm/
Dev workflow:          43620257595 (successful)
```

Deployed Functions:

```text
adminListConversations
adminListConversationMessages
deleteUserChat
deleteUserMessage
```

Firestore rules now block direct client deletion of chats and messages. User deletion goes through server callables that archive records before removing them from the live collections. Admin transcripts merge retained deleted-message records with live messages, order them by the original timestamp, and highlight deleted entries.

Both Dev Admin routes returned HTTP 200 and the deployed bundles contain the deleted-message viewer. Production was not changed. The generated `frontend/dist.zip` remains untracked.
