# Christian Match Ghana — Handover and Continuation Guide

**Last updated:** 2026-10-16
**Workspace:** `/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt`
**Branch:** `sync/cmg-local-2026-10-13`
**Remote:** `origin` → `https://github.com/rastardie/Christian-Match-Ghana.git`
**Last pushed commit:** `c5a60b2 chore: add Vite client typings`

## 1. Current system snapshot

Christian Match Ghana is a React/Vite/TypeScript + Firebase + Capacitor application with a Firebase Functions backend. The current work covered four major areas:

1. **Secure administration:** canonical group-based RBAC, permissions, audit logs, Super Admin protection, administrator creation, username login, and forced first-login password changes.
2. **Authentication and security:** email/password login, automatic Password-or-PIN detection, optional 4–6 digit PIN setup/change, server-side PIN hashing, biometric/passkey support, email verification, and password recovery.
3. **Product/UI:** profile and main-page redesign, safe-area-aware mobile headers, balanced top controls, compact bottom navigation, profile welcome layout, and a landing promo video.
4. **Platform reliability:** Realtime Database presence, support tickets, notification preferences, Storage photo upload, staging deployment configuration, and improved signup/onboarding recovery.

Production Firebase was not intentionally modified. The work targets the staging project unless explicitly stated otherwise.

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
HEAD:    c5a60b2d7d971fcd119b5a88d9f9da244dcb9e1e
```

Recent commits:

```text
c5a60b2 chore: add Vite client typings
05f47e1 feat: complete CMG admin, auth, and UI enhancements
7006c81 feat: update staging app UX and landing experience
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

The following deployment completed successfully on 2026-10-16:

```text
Firestore rules and indexes
Storage rules
Firebase Hosting
```

Hosting found the current `frontend/dist` build and released it at:

```text
https://christian-match-ghana.web.app
```

### Functions deployment blocker

Functions deployment was attempted but stopped during secret validation because the staging project is missing a version of:

```text
SMTP_PASS
```

The Functions code was not bypassed or partially forced into deployment. Until the secret is configured, the newer backend features are not live:

- Admin RBAC callables
- Administrator creation
- Username resolver
- PIN setup/change/login
- Forced administrator password-change completion
- Notification changes

After the correct staging SMTP password is available, configure it without recording it in Git:

```bash
firebase functions:secrets:set SMTP_PASS \
  --project christian-match-ghana
```

Then deploy Functions:

```bash
firebase deploy --only functions \
  --project christian-match-ghana \
  --non-interactive
```

Review all existing Functions secrets before deployment. Never copy production secrets into staging.

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

The live account has **not yet been created**, because Functions deployment is blocked by the missing `SMTP_PASS` secret. Do not place the initial password in source, this handover, logs, or a deployment archive. After Functions deployment, create it from the existing Super Admin Access Control panel or through the protected callable.

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

PIN login will remain unavailable in staging until the Functions deployment blocker is resolved.

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

The current Desktop package from the latest build is expected at:

```text
/Users/andrewstardie/Desktop/cmg-dev-dist.zip
```

The package is large because it includes the promo video. Do not commit `frontend/dist.zip` unless explicitly required.

## 11. Holistic future add-ons

### P0 — unblock and stabilize the current release

1. Configure the staging `SMTP_PASS` secret and deploy Functions.
2. Create the Realtime Database instance intentionally, document its region, and deploy database rules.
3. Create `ladmin` only after the protected Functions are deployed.
4. Test password login, username login, PIN login, forced password change, Admin Portal access, and logout with staging accounts.
5. Add a staging smoke-test script that checks Auth, Firestore, Storage, Functions, Hosting, and Rules.
6. Add Firebase billing budgets and email alerts before inviting testers.

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
[ ] Configure staging SMTP_PASS without committing it.
[ ] Deploy Functions to christian-match-ghana.
[ ] Decide and create the Realtime Database region/instance.
[ ] Deploy database rules.
[ ] Create ladmin through the protected Super Admin flow.
[ ] Test ladmin password login, forced password change, username login, and PIN setup.
[ ] Test regular Admin boundaries and audit records.
[ ] Run staging smoke tests.
[ ] Confirm Hosting URL and, separately, cPanel /dev deployment if needed.
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
