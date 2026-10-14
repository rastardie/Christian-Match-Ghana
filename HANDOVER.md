# Christian Match Ghana — Session Handover

**Date:** 2026-10-12
**Workspace:** `/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt`
**Recommended future location:** `/Users/andrewstardie/Developer/cmg-rebuilt`

## Current architecture

```text
frontend/                 React + TypeScript + Vite + Capacitor Android
backend/functions/        Firebase Cloud Functions, Node.js 22
infra/firebase/           Firestore and Storage security rules
docs/frontend/            Existing implementation guides
firebase.json             Root Firebase deployment configuration
.firebaserc               staging and production project aliases
```

The original source archives and deployment artifacts remain outside this rebuilt workspace. The rebuilt workspace was created from:

- `/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-front.zip`
- The current local Functions source

## Firebase environments

```text
+-------------+-------------------------------+--------------------------------------+
| Environment | Firebase project              | Purpose                              |
+-------------+-------------------------------+--------------------------------------+
| staging     | christian-match-ghana         | Current testing environment          |
| production  | christianmatch-app            | Live Christian Match Ghana system    |
+-------------+-------------------------------+--------------------------------------+
```

Staging web app:

```text
Project ID:       christian-match-ghana
Project number:   481815915882
Web App ID:       1:481815915882:web:6983b79d40683343b40913
Hosting URL:      https://christian-match-ghana.web.app
Firebase Console: https://console.firebase.google.com/project/christian-match-ghana/overview
```

Production was not intentionally changed during this session.

## Completed

### Workspace rebuild

- Extracted the editable React/TypeScript frontend from `cmg-front.zip`.
- Reorganized the project into conventional `frontend`, `backend`, `infra`, and `docs` folders.
- Moved frontend source into `frontend/src`.
- Moved Firebase Functions source into `backend/functions/src/index.js`.
- Moved Firestore and Storage rules into `infra/firebase`.
- Added root `firebase.json` and `.firebaserc`.
- Added environment examples and ignored local environment files.
- Excluded real secrets from the rebuilt workspace.

### Environment separation

- Replaced hardcoded Firebase frontend configuration with Vite environment variables.
- Added staging and production Firebase aliases.
- Added `frontend/.env.local` for local staging development.
- Added `.env.staging.example` and `.env.production.example`.
- Made Firebase Auth action URLs environment-specific.
- Local staging Firebase project is `christian-match-ghana`.
- Production Firebase project remains `christianmatch-app`.

### Staging Hosting

The rebuilt frontend was deployed to staging Hosting only:

```text
https://christian-match-ghana.web.app
```

Production Hosting was not deployed from this workspace.

### Android/browser launcher

Created:

```text
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/start-android.sh
```

It now:

1. Resolves its own directory, so it can be run from anywhere.
2. Uses staging only.
3. Runs `npm ci`.
4. Builds the staging frontend.
5. Synchronizes Capacitor Android.
6. Starts a Vite browser server on a free local port.
7. Opens the staging browser URL.
8. Opens Android Studio with the Android project.
9. Refuses a `pk_live_*` Paystack key.

Run it with:

```bash
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/start-android.sh
```

The last successful run started the browser and opened Android Studio. The browser port is selected dynamically, so it may differ between runs.

Android project:

```text
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/frontend/android
```

## Validation completed

```text
Frontend npm run build:       Passed
Backend node --check:         Passed
Capacitor cap sync android:   Passed
Staging Hosting deployment:   Passed
```

The frontend has non-fatal Vite warnings about dynamic/static Firebase imports and a large main JavaScript bundle. These do not currently prevent building or launching.

## Security remediation

Non-forced dependency remediation was performed.

Current audit state:

```text
Frontend production dependencies: 0 reported vulnerabilities
Backend production dependencies:  0 reported vulnerabilities
Frontend development tooling:     Remaining findings
Backend development tooling:      Remaining findings
```

The Firebase frontend dependency tree required an explicit patched override:

```json
"overrides": {
  "@grpc/grpc-js": "1.14.6"
}
```

The following direct packages were updated where safe:

- Capacitor Android/core/CLI packages
- Capacitor plugins
- `sharp`
- `firebase-admin`
- `firebase-functions`
- `firebase-tools`
- `nodemailer`

`npm audit fix --force` was intentionally **not** used because npm proposed breaking changes or a Firebase downgrade. Review remaining development-only findings later.

## Current signup blocker

The staging signup screen can remain at:

```text
PROCESSING...
```

The signup sequence is:

```text
checkSignupEligibility callable Function
        -> Firebase Auth account creation
        -> optional Storage photo upload
        -> Firestore users/{uid} document
        -> Firebase verification email
```

The current staging project is incomplete:

```text
+----------------------+--------------------------------------+
| Component            | Status                               |
+----------------------+--------------------------------------+
| Staging Hosting      | Deployed                             |
| Staging Auth         | Must confirm Email/Password enabled |
| Staging Firestore    | Not created                          |
| Staging Storage      | Not confirmed                        |
| Staging Functions    | Not deployed                         |
| Staging email        | Not configured                       |
| Staging Paystack     | Test key not configured              |
+----------------------+--------------------------------------+
```

A staging Functions deployment was attempted and failed because the staging project must be upgraded to the Firebase Blaze plan before required APIs such as Cloud Build can be enabled.

Firebase error:

```text
Your project christian-match-ghana must be on the Blaze (pay-as-you-go) plan.
```

This is a staging billing decision and was not changed automatically.

## Next session — recommended order

### 1. Move the workspace out of Documents

macOS warned that Android Studio may have permission problems inside `Documents`. Make a safe copy first:

```bash
mkdir -p "/Users/andrewstardie/Developer"

rsync -a \
  "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/" \
  "/Users/andrewstardie/Developer/cmg-rebuilt/"
```

Do not delete the original until the copied workspace is verified.

### 2. Enable staging Firebase services

In the staging project:

```text
https://console.firebase.google.com/project/christian-match-ghana/overview
```

Complete:

1. Upgrade staging to Blaze if Cloud Functions are required.
2. Create the Firestore database.
3. Enable Storage.
4. Enable Email/Password Authentication.
5. Add authorized domains:
   - `localhost`
   - `127.0.0.1`
   - `christian-match-ghana.web.app`
6. Configure staging email templates.
7. Use a staging/test Paystack public key only.

Do not configure production secrets in staging.

### 3. Deploy staging rules and Functions

After Blaze and Firestore are ready, from the rebuilt workspace:

```bash
cd "/Users/andrewstardie/Developer/cmg-rebuilt"

backend/functions/node_modules/.bin/firebase use staging
backend/functions/node_modules/.bin/firebase deploy \
  --project staging \
  --only functions,firestore:rules,storage:rules \
  --non-interactive
```

Do not run a production deploy during staging testing.

### 4. Re-test signup

Run:

```bash
cd "/Users/andrewstardie/Developer/cmg-rebuilt"
./start-android.sh
```

Test with a staging-only account and test image. Confirm:

```text
- checkSignupEligibility returns
- Auth user is created
- Firestore users/{uid} is created
- Storage photo upload completes
- verification email is sent
- staging verification link returns to staging
- unverified login is restricted
- verified login succeeds
```

### 5. Improve error handling

Add an explicit timeout around the callable `checkSignupEligibility` request so the UI reports a service-unavailable error instead of remaining in `PROCESSING...` indefinitely.

The timeout should fail closed; do not silently bypass eligibility checks in staging or production.

## Important safety notes

- Never commit `.env`, SMTP passwords, Paystack secret keys, or service-account credentials.
- Never use a `pk_live_*` Paystack key in staging.
- Do not send bulk verification reminders until staging Functions, SMTP, and recipient filtering are tested.
- Do not deploy Functions or rules to `production` while testing staging.
- The staging and production Firebase projects are separate, but the frontend source is shared.

## Latest Android and Chrome/PWA verification

### Android

The Android launch issue was caused by the Gradle wrapper lacking its executable bit:

```text
frontend/android/gradlew: Permission denied
```

It was corrected with:

```bash
chmod +x frontend/android/gradlew
```

Verification completed successfully:

```text
Android debug build:  passed
APK install:         passed
Emulator:            emulator-5554
MainActivity:        foregrounded
Crash check:         no fatal exception found
```

The emulator currently has the package:

```text
com.cmg.christianmatch
```

### Chrome/PWA

The staging web application is available at:

```text
https://christian-match-ghana.web.app
```

The frontend already includes:

```text
frontend/public/manifest.json
```

However, the current build does not register a PWA service worker. Therefore:

- Chrome web testing works now.
- The manifest is available for inspection.
- Offline caching and the normal Chrome install prompt are not yet implemented.
- Firebase Auth, Firestore, Storage, and Functions still require network access.

For a Chrome staging test:

```bash
cd "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/frontend"
npm run dev -- --host 127.0.0.1
```

Then open the printed local URL, or use the deployed staging URL above. In Chrome, use `DevTools -> Application -> Manifest` to inspect the manifest and `DevTools -> Network` to inspect Firebase requests.

If an installable/offline PWA is required, add and test a service-worker strategy separately. Do not cache authenticated Firebase responses or user data in a broad offline cache.

## Local Firebase Emulator Suite

The frontend already supports local Firebase emulators through these environment variables in `frontend/src/firebase.ts`:

```text
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
```

This allows local Auth, Firestore, Storage, and Functions testing without Blaze billing. The local emulator ports are:

```text
Auth:      9099
Firestore: 8080
Functions: 5001
Storage:   9199
Emulator UI: 4000
```

Start the local backend from the workspace root:

```bash
cd "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt"

backend/functions/node_modules/.bin/firebase emulators:start \
  --project staging \
  --only auth,firestore,storage,functions \
  --export-on-exit=.firebase-emulator-data
```

In a second terminal, start the frontend against the emulators:

```bash
cd "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/frontend"

VITE_USE_FIREBASE_EMULATORS=true \
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1 \
VITE_PUBLIC_APP_URL=http://127.0.0.1:5173 \
npm run dev -- --host 127.0.0.1
```

Open the Vite URL in Chrome. The Emulator UI is available at:

```text
http://127.0.0.1:4000
```

Local emulator data is separate from both staging and production. Verification emails are not delivered to real inboxes while using the Auth emulator; inspect the Auth Emulator UI/logs for test users and email actions. Paystack and real push-notification delivery are not fully simulated by these Firebase emulators.

## Local emulator setup and full test result

The root `firebase.json` now explicitly configures local emulators:

```text
Auth:      127.0.0.1:9099
Firestore: 127.0.0.1:8080
Functions: 127.0.0.1:5001
Storage:   127.0.0.1:9199
UI:        127.0.0.1:4000
```

The local Functions source was updated for the installed Firebase package versions:

- Firebase Admin v14 modular APIs are used for Firestore, Auth, Messaging, and Storage.
- Existing v1 trigger definitions now import `firebase-functions/v1` for compatibility.

Start the emulators:

```bash
cd "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt"
backend/functions/node_modules/.bin/firebase emulators:start \
  --project staging \
  --only auth,firestore,storage,functions \
  --export-on-exit=.firebase-emulator-data
```

Start the emulator-mode frontend separately:

```bash
cd "/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/frontend"
VITE_USE_FIREBASE_EMULATORS=true \
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1 \
VITE_PUBLIC_APP_URL=http://127.0.0.1:3000 \
npm run dev -- --host 127.0.0.1
```

The local frontend was opened in Google Chrome at:

```text
http://127.0.0.1:3000/
```

Full local Firebase smoke test passed on 2026-10-13:

```text
Signup eligibility Function: Passed
Firebase Auth account:      Passed
Firestore profile write:    Passed
Firestore profile read:     Passed
Storage JPEG upload:        Passed
Verification email simulate:Passed
Local cleanup:              Passed
```

The test account and test data were removed after the test. No remote Firebase project was used for these operations.

## Launcher local-mode support

`start-android.sh` now supports both targets:

```bash
./start-android.sh staging
./start-android.sh local
```

The default remains `staging`.

Local mode:

- Reuses the local Firebase Emulator Suite if it is already running.
- Starts Auth, Firestore, Storage, and Functions emulators if needed.
- Starts Chrome with emulator host `127.0.0.1`.
- Builds the Android bundle with emulator host `10.0.2.2`, which is the Android Emulator route back to the Mac.
- Synchronizes Capacitor Android.
- Opens Chrome and Android Studio.

Local launcher validation completed:

```text
sh -n start-android.sh:                  Passed
./start-android.sh local:                Passed
Local Android build/install/launch:      Passed
Android MainActivity foregrounded:       Yes
```

The local launcher most recently opened Chrome at a dynamically selected local port and used the Emulator Suite rather than staging Firebase.

## Launcher backend lifecycle change

`start-android.sh local` no longer starts Firebase emulators automatically.

The local target now requires these ports to already be listening:

```text
9099  Auth
8080  Firestore
5001  Functions
9199  Storage
4000  Emulator UI
```

If any are missing, the launcher exits and prints the manual emulator start command. This gives the developer explicit start/stop control. The `staging` target remains unchanged.

## Android exit and logout controls

Added `@capacitor/app@8.1.2` and updated the authenticated app:

- Android hardware back closes overlays first.
- Back from Edit Profile returns to Profile.
- Back from an active Chat returns to the chat list.
- Back at the root view exits the Android app.
- Profile now has a visible logout icon as well as the Settings-menu logout item.
- Logout calls Firebase `signOut` and clears the local CMG session in all cases, including when the local backend is unavailable.
- Logout then returns the user to the Auth/login screen.

Validation:

```text
Frontend build:              Passed
Capacitor Android sync:      Passed
Android build:               Passed
Android install and launch:  Passed
MainActivity foregrounded:   Yes
```

Stopping the Firebase backend by itself does not automatically log a user out; backend availability and authentication state are separate. Using the logout control always returns the test user to the login screen, even if Firebase sign-out cannot reach the stopped backend.

## Complete local stack shutdown

Stopping Vite and Firebase alone does not stop the installed Android app because Capacitor copies the frontend bundle into the APK. The Android app is therefore able to keep displaying its last bundle while backend services are offline.

Added:

```text
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/stop-cmg-local.sh
```

Use this full command to stop the complete local test stack:

```bash
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/stop-cmg-local.sh
```

It stops:

- Android package `com.cmg.christianmatch` through `adb`.
- The Vite process and port started by `start-android.sh`.
- The matching local CMG tab in Google Chrome.
- Firebase emulator processes on ports `9099`, `8080`, `5001`, `9199`, and `4000`.

The launcher now records its Vite PID and port in `/tmp/cmg-local-vite.pid` and `/tmp/cmg-local-vite.port` so the stop command can identify only the CMG local frontend.

Validation:

```text
start-android.sh syntax:       Passed
stop-cmg-local.sh syntax:      Passed
Complete shutdown:             Passed
Android app after shutdown:    Stopped
Firebase emulators after stop: Stopped
```

## Android auto-launch behavior

The latest screenshot showed the Android emulator's Google account sign-in screen (`com.google.android.gms`), not CMG. The connected emulator was healthy, but the CMG package was not foregrounded.

`start-android.sh` now automatically does the following when an Android device/emulator is connected:

1. Builds `app-debug.apk`.
2. Installs it with `adb install -r`.
3. Force-stops any prior CMG process.
4. Launches `com.cmg.christianmatch`.
5. Opens Android Studio for logs/debugging.

If no device is connected, it continues to open Android Studio and reports that Android auto-launch was skipped.

The installed CMG app was manually brought to the foreground and verified:

```text
com.cmg.christianmatch/.MainActivity: foregrounded
```

## Verification-screen recovery and local email UX

The newest verification screenshots showed:

```text
auth/too-many-requests
```

and no clear cancel/logout route. The AuthView verification screen was updated:

- Local emulator mode now explains that no real email is delivered.
- It tells the tester to copy the newest verification link from the Firebase emulator Terminal.
- It documents replacing `127.0.0.1:9099` with `10.0.2.2:9099` for Android Emulator links.
- Resend requests now have a 30-second cooldown.
- `auth/too-many-requests` receives a readable wait message instead of exposing the raw Firebase error.
- `Return to Login` signs out and resets the verification flow.
- `Cancel / Log Out` is now visible and returns to login even when the emulator backend is unavailable.

The existing Firebase emulator behavior remains: verification links are printed to the Terminal; no Gmail message is sent by the local emulator.

A Gradle compatibility issue found during validation was also fixed:

```text
proguard-android.txt -> proguard-android-optimize.txt
```

Validation passed after these changes:

```text
Frontend build:             Passed
Capacitor sync:             Passed
Android debug build:        Passed
Updated APK install/launch: Passed
```

## Android local sign-in network fix

Android local sign-in was showing:

```text
Network error. Please check your connection.
```

The Firebase emulator ports were running and reachable from the Android emulator through `10.0.2.2`, but Android WebView blocks cleartext HTTP by default. Local Firebase emulators use HTTP.

`frontend/capacitor.config.ts` now enables:

```ts
server.cleartext = true
```

only when:

```text
VITE_USE_FIREBASE_EMULATORS=true
```

Staging and production remain cleartext-disabled.

Validation:

```text
Local Capacitor config sync:   Passed
Generated local config:        server.cleartext=true
Android debug build:           Passed
Android install/launch:        Passed
```

The local Android app must be rebuilt/reinstalled after this change. `start-android.sh local` now does that automatically.

## Live frontend terminal and app logs

The launcher previously started Vite with `nohup` and redirected its output to a temporary log, so the launcher Terminal returned to the shell. It now keeps Vite attached with live output using `tee` and waits while the frontend is running.

After:

```bash
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/start-android.sh local
```

the frontend Terminal remains active. Press `Control+C` there to stop the frontend only. Use the complete stop command to stop Android, Chrome, frontend, and Firebase:

```bash
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/stop-cmg-local.sh
```

Log locations:

```text
PWA/browser console:  Google Chrome -> View -> Developer -> JavaScript Console
Android app logs:     Android Studio Logcat, or adb logcat
Firebase logs:        The separate Terminal running firebase emulators:start
Vite server log:      The temporary path printed by the launcher
```

Vite terminal output is server/build output; browser `console.log` messages appear in Chrome DevTools, and Android WebView/native messages appear in Logcat.

## Close all local app windows on shutdown

The local stop behavior was expanded because stopping Firebase and Vite alone left the installed Android app/emulator screen and stale Chrome tabs visible.

`stop-cmg-local.sh` now:

- Force-stops `com.cmg.christianmatch`.
- Closes connected Android Emulator instances with `adb emu kill`.
- Stops the recorded Vite frontend.
- Closes CMG tabs on `127.0.0.1` and `localhost`, including stale tabs from previous launcher runs.
- Leaves unrelated local-project Chrome tabs open by requiring the CMG page title.
- Stops the local Firebase Emulator Suite.

Run:

```bash
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/stop-cmg-local.sh
```

The Android emulator is intentionally closed only for emulator serials (`emulator-*`); a connected physical Android device is not disconnected.

Validation:

```text
Stop script syntax:                 Passed
Android emulator window:            Stopped
Firebase emulator ports:            Stopped
CMG local app windows:              Closed
```

## Separate PWA and Android launchers

Because the combined launcher could open Chrome while Android Studio did not automatically run an AVD, standalone launchers were added:

### Chrome/PWA only

```bash
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/start-cmg-pwa.sh
```

This requires the Firebase emulators to be running manually, starts only Vite, opens Google Chrome, keeps live Vite output in the Terminal, and does not open Android Studio or Android.

### Android only

```bash
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/start-cmg-android.sh
```

This requires the Firebase emulators to be running manually, starts the `Medium_Phone` AVD if no Android emulator is connected, builds the local Android bundle with `10.0.2.2`, installs and launches CMG, and opens Android Studio. It does not start Chrome or Vite.

Use another AVD if needed:

```bash
CMG_ANDROID_AVD=Small_Phone \
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/start-cmg-android.sh
```

Both standalone launchers require the backend command to be running in a separate Terminal first. Their shell syntax and available AVD configuration were validated.

## Android local flow validation

The Android-only launcher was run successfully:

```bash
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/start-cmg-android.sh
```

Validation completed:

```text
Frontend build:             Passed
Capacitor Android sync:     Passed
Android debug APK build:    Passed
APK install:                Passed
CMG MainActivity foreground:Yes
Android -> Auth 9099:       Reachable
Android -> Firestore 8080:  Reachable
Android -> Functions 5001:  Reachable
Android -> Storage 9199:    Reachable
Fatal Android crash:        None found
```

The Android app is now independently launchable from Chrome/PWA and uses the local Firebase Emulator Suite through `10.0.2.2`.

## Android Auth network-error fix

The newest Android screenshot showed:

```text
Firebase: Error (auth/network-request-failed)
```

The local Firebase services were healthy and Android could reach `10.0.2.2:9099`, but the Capacitor WebView was using its default HTTPS scheme while local Firebase emulators use HTTP. This caused HTTPS-to-HTTP mixed-content blocking.

`frontend/capacitor.config.ts` now uses:

```text
Local emulator build:       androidScheme=http, cleartext=true
Staging/production build:   androidScheme=https, cleartext=false
```

The Android-only launcher was rerun after this change:

```bash
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/start-cmg-android.sh
```

Validation:

```text
Generated Capacitor config: androidScheme=http
Generated Capacitor config: cleartext=true
Android debug build:        Passed
APK installation:           Passed
CMG MainActivity:            Foregrounded
Startup fatal/network logs:  None
```

Retest Android signup with a new local test email. The Firebase Terminal should now show the Android eligibility request and Auth activity, just as it did for the web app.

## Android startup crash fix: native push registration

Android Studio/Logcat showed why the app exited:

```text
FATAL EXCEPTION: CapacitorPlugins
Default FirebaseApp is not initialized
PushNotificationsPlugin.register()
Force finishing activity com.cmg.christianmatch/.MainActivity
```

The local Android app had no native `google-services.json`, but it attempted to register FCM push notifications during startup. Native push registration is now opt-in through:

```text
VITE_NATIVE_PUSH_ENABLED=true
```

With the default unset/false, local Android skips native FCM registration and continues using web Firebase Auth, Firestore, Storage, and Functions. Native push can be enabled later after Android/iOS Firebase messaging configuration is installed.

Validation after the fix:

```text
Frontend build:             Passed
Capacitor sync:             Passed
Android debug build:        Passed
APK install:                Passed
CMG MainActivity:            Foregrounded
Push-registration crash:     Not present
```

## Fresh local sessions and universal escape controls

The newest Android screenshot showed the app reopening directly into a previous onboarding/session state instead of showing login. This was caused by persisted local WebView/app storage, not failed authentication.

Local launchers now start fresh by default:

- `start-cmg-pwa.sh` sets `VITE_LOCAL_TEST_FRESH_START=true` and clears the saved CMG demo session on app startup.
- `start-cmg-android.sh` clears the Android package data before installing/launching. Set `CMG_PRESERVE_ANDROID_DATA=true` only when persistence is intentionally being tested.
- The combined local launcher also sets the fresh-session environment flag.

Escape controls were added:

- Authenticated Layout screens have persistent `Back` and `Exit` controls.
- `Exit` signs out, clears the local session, and returns to login.
- `Back` closes overlays, leaves Edit Profile, leaves active Chat, or returns to Browse.
- Onboarding has visible `Back` and `Log Out` controls.
- Android hardware Back behavior remains active for overlays, nested views, and root exit.
- Verification flow already has Return to Login and Cancel/Log Out controls.

Validation:

```text
Frontend build:               Passed
Launcher syntax checks:       Passed
Fresh Android data reset:     Passed
Android MainActivity:         Foregrounded
Android startup crash:        None
```

## Professional mobile navigation controls

After reviewing `/Users/andrewstardie/Documents/TUTS/TESTS/onb/mobile`, the text `Back`, `Exit`, and `Log Out` pills were replaced.

CMG now follows the onb mobile pattern:

- Standard back arrow icon in the top-left.
- Icon-only logout action in the top-right.
- Accessible `aria-label` and `title` remain available for both icons.
- Onboarding uses the same top-left arrow and top-right logout icon.
- Authenticated Layout screens retain the escape behavior without displaying text pills.

The icon-based UI was built successfully and synchronized/relaunched on Android successfully.

## Production email templates and deployment safety record

Production Firebase project:

```text
christianmatch-app
```

Production custom application URL:

```text
https://christianmatchghana.com
```

The production Firebase Console email-template settings supplied for this project are recorded as follows:

```text
Template:       Email address verification
Language:       English
Sender name:   Christian Match Ghana
From:           info@christianmatchghana.com
Reply to:       info@christianmatchghana.com
Subject:        Verify your email for %APP_NAME%
```

The production verification message is:

```text
Hello %DISPLAY_NAME%,

Follow this link to verify your email address.

If you didn’t ask to verify this address, you can ignore this email.

Thanks,

Your %APP_NAME% team
```

Firebase generates the action URL and code for each recipient. The example URL supplied from the Console uses the production Auth domain:

```text
https://christianmatch-app.firebaseapp.com/__/auth/action?mode=action&oobCode=code
```

The source code now makes the production web return URL explicit in `frontend/.env.production.example`:

```text
VITE_PUBLIC_APP_URL=https://christianmatchghana.com
```

### No-unintended-production-change rules

- Pushing this Git branch to GitHub does not change Firebase production.
- No Firebase deployment is performed by Git synchronization.
- Do not run `firebase deploy` merely after pulling this branch.
- Before any production deploy, select and verify the target explicitly:

```bash
backend/functions/node_modules/.bin/firebase use production
backend/functions/node_modules/.bin/firebase projects:list
```

- Review the generated production build and environment values before deploying.
- Deploy production only with explicit approval and a reviewed command such as:

```bash
backend/functions/node_modules/.bin/firebase deploy \
  --project production \
  --only hosting,functions,firestore:rules,storage:rules \
  --non-interactive
```

- Never copy `frontend/.env.local` into a production build.
- Never commit SMTP passwords, Paystack secret keys, service-account files, or native Firebase messaging credentials.
- Verify the Firebase Console Auth templates, authorized domains, SMTP settings, and Paystack mode separately; GitHub sync cannot alter those settings.

## Production hosting boundary

The production frontend is hosted through **Stormer Host**. The Stormer Host client-area product reference was supplied separately and is intentionally not stored in source control.

```text
Production frontend hosting: Stormer Host
Firebase role:              Auth, Firestore, Storage, Functions
Staging frontend hosting:   Firebase Hosting
```

GitHub synchronization does not deploy to Stormer Host. A production frontend release must be handled as a separate, explicitly approved Stormer Host deployment, with the production environment values supplied securely at build/deploy time.

Do not commit Stormer Host credentials, control-panel passwords, FTP/SFTP keys, deployment tokens, or production environment files.

## Production reminder-campaign access check

Firebase CLI authentication is now active for the authorized production account:

```text
christianmatchghanaltd@gmail.com
```

A read-only production Functions inventory confirmed:

- Production project access is working.
- Existing production Functions run on Node.js 22.
- `sendUnverifiedVerificationReminders` is **not currently deployed** to production.
- Existing production Functions currently use a Gmail SMTP configuration, not the Stormer Host `info@christianmatchghana.com` mailbox.

The inventory command exposed existing production credential values in terminal output. Treat those credentials as compromised and rotate them before any campaign deployment:

- Production Paystack secret
- Existing SMTP password

Do not deploy the reminder campaign until the SMTP configuration is changed to the approved production mailbox and a single-recipient test succeeds.

## Production reminder Function deployment status

After repairing the cross-platform Functions lockfile, the guarded reminder Function was deployed by itself to production:

```text
sendUnverifiedVerificationReminders: ACTIVE
Project: christianmatch-app
Region:  us-central1
Runtime: Node.js 22
```

The deployment command targeted only:

```text
functions:sendUnverifiedVerificationReminders
```

It did not deploy Hosting, Firestore rules, Storage rules, or the frontend. SMTP credentials were intentionally removed from the deploy path because the previously shared mailbox password must be rotated.

No email has been sent. The next operation is an authenticated administrator dry-run, followed by a single-recipient test only after the new SMTP password is configured.

## Verification reminder campaign — current continuation state

### Production access and deployment

Firebase CLI authentication is working as:

```text
christianmatchghanaltd@gmail.com
```

Production project:

```text
christianmatch-app
```

The guarded Function is deployed and active:

```text
sendUnverifiedVerificationReminders
Region:  us-central1
Runtime: Node.js 22
Status:  ACTIVE
```

Only this Function was deployed for the campaign. No Hosting, frontend, Firestore rules, Storage rules, or unrelated production Functions were deployed as part of the campaign setup.

The Function is protected by:

- Firebase Auth authentication.
- Admin email allowlist including `christianmatchghanaltd@gmail.com`.
- Dry-run by default.
- Required campaign ID for real sends.
- Required confirmation string for real sends.
- Optional single-recipient filter.
- Batch limit capped at 100 recipients.
- Duplicate-recipient records in Firestore.

### Production SMTP and Secret Manager

The approved campaign mailbox is:

```text
info@christianmatchghana.com
```

The production SMTP password was placed in Firebase Secret Manager under:

```text
SMTP_PASS
```

The reminder Function uses the Secret Manager binding:

```js
functions.runWith({ secrets: ['SMTP_PASS'] })
```

The SMTP endpoint authentication was successfully tested without sending an email before deployment.

Important security action still required:

- The mailbox password was exposed in the conversation before Secret Manager setup.
- Rotate the Stormer Host mailbox password.
- Update the `SMTP_PASS` Secret Manager version after rotation.
- Do not put the new password in Git, chat, or a committed file.

The local `backend/functions/.env` is ignored and must not be used as the production source of truth after rotation. Secret Manager is the intended production storage mechanism.

### Single-recipient test status

Approved test recipient:

```text
rastardie@gmail.com
```

A temporary local runner was created:

```text
/tmp/cmg-send-one-verification-test.mjs
```

The runner signs in with Firebase Auth and invokes the deployed callable using:

```json
{
  "dryRun": false,
  "testEmail": "rastardie@gmail.com",
  "limit": 1,
  "campaignId": "verification-test-2026-10-14",
  "confirm": "SEND_UNVERIFIED_VERIFICATION_REMINDERS"
}
```

The first attempt did not send mail because the supplied admin password returned:

```text
auth/invalid-credential
```

Production Auth account check confirmed:

```text
Account:          christianmatchghanaltd@gmail.com
Exists:           Yes
Email verified:   Yes
Disabled:         No
Password account: Yes
Google provider:  No
```

No email has been sent yet.

To fix the admin authentication:

1. Open `https://christianmatchghana.com`.
2. Use the production login screen.
3. Select `Forgot password`.
4. Reset the password for `christianmatchghanaltd@gmail.com`.
5. Confirm production login with the new password.
6. Rerun the temporary runner without putting the password in chat:

```bash
read -s -p "Production admin password: " CMG_ADMIN_PASSWORD
echo
CMG_ADMIN_PASSWORD="$CMG_ADMIN_PASSWORD" \
node /tmp/cmg-send-one-verification-test.mjs
unset CMG_ADMIN_PASSWORD
```

This must remain a single-recipient test. Do not run a bulk campaign until the test email is received and its verification link is confirmed.

### Production unverified-user report

A read-only production Auth/Firestore lookup found:

```text
Enabled unverified users:          92
Firestore profiles found:          83
Complete name/email/phone first:   21
```

The protected local Excel report is:

```text
/Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/unverified-users-production.xlsx
```

It contains:

```text
#, Name, Email, Phone
```

The workbook is encrypted for file opening and worksheet editing with the password supplied by the user. It is owner-only (`0600`) and ignored by Git. It must not be uploaded to GitHub or Stormer Host.

### Final campaign sequence

```text
1. Reset the Firebase Auth admin password.
2. Rotate the exposed Stormer Host mailbox password.
3. Update Secret Manager SMTP_PASS.
4. Re-run the no-send SMTP verification.
5. Run the single-recipient test to rastardie@gmail.com.
6. Confirm sender, reply-to, delivery, spam placement, and verification link.
7. Obtain explicit final approval for bulk sending.
8. Run bounded batches using a new campaign ID.
9. Review sent/alreadySent/failed counts and preserve the campaign record.
```

No bulk email has been sent.

## Verification reminder campaign — COMPLETED 2026-10-14

The production verification-reminder campaign was sent successfully.

```text
Campaign ID:        verification-reminders-2026-10-14
Total emailed:      91 recipients
Failed (synchronous): 0
Logo:               inline CID (new branded logo, 300px)
Personalization:    first-name greeting
Offer:              1 month free premium membership
```

Delivery was confirmed earlier via a single-recipient inbox test (sender, reply-to,
rendering, and verification link all correct).

### Function capabilities added during the campaign

The guarded callable `sendUnverifiedVerificationReminders` now supports admin-only actions:

- `campaignStatus` — count recipients already emailed for a campaign ID.
- `resetTestUser` — set a test account back to unverified and clear its recipient record.
- `correctEmail` — fix a user's email (e.g. typo domain) before sending.

Runtime config: `timeoutSeconds: 540`, `memory: 512MB`, `invoker: public`
(still protected by Firebase Auth admin allowlist + confirmation string).
Non-secret SMTP config is deployed via `backend/functions/.env`; `SMTP_PASS`
comes from Secret Manager.

### Known follow-ups

- `reiama27@gamil.com` has a typo domain; the gmail correction failed because the
  gmail address already exists. This recipient will bounce and needs a manual fix.
- The exposed mailbox password still must be rotated, then the Secret Manager
  `SMTP_PASS` version updated. (Deferred by request.)
- Ensure the 1-month-free-membership fulfillment process is ready for users who verify.
- Previously exposed Paystack secret and Gmail SMTP password still need rotation.

### Repeatable scripts (local, not committed)

```text
/tmp/cmg-test-verification.mjs   reset + send one test to rastardie@gmail.com
/tmp/cmg-campaign-dryrun.mjs     dry-run review of the full recipient list
/tmp/cmg-campaign-send.mjs       batch-safe full campaign send with status
```

## Current continuation snapshot — 2026-10-14 13:10 UTC

This section supersedes earlier campaign-status paragraphs above where they say that no campaign email was sent. The campaign has now completed.

### Production campaign final state

```text
Project:             christianmatch-app
Campaign ID:         verification-reminders-2026-10-14
Recipients emailed:  91
Synchronous failures:0
Delivery test:       Inbox delivery confirmed
Verification link:   Tested successfully in the single-recipient test
```

The campaign email includes:

- First-name personalization when a display name exists.
- A fallback greeting when no name exists.
- Inline CID-branded logo from the supplied New Logo asset.
- Verification CTA button.
- Fixed promotional copy for free premium access.

The two campaign-related data issues found during processing were:

```text
One Auth UID no longer existed.
One recipient had no Firestore users/{uid} profile.
```

The email typo `reiama27@gamil.com` could not be changed to the Gmail address because the target Gmail identity already exists. Do not merge or delete either Auth identity without an explicit identity-reconciliation decision.

### Free-access promotion state

The intended rule is now:

```text
Eligible groups only:
  1. Members in the verification-reminder cohort who verify their email.
  2. New members created on/after the promotion launch who verify their email.

Not eligible:
  Existing verified users outside the campaign cohort.
  Existing unverified users outside the campaign cohort.
  Users who do not verify.

Fixed promotion end:
  2026-11-13T23:59:59.999Z
```

The deployed `sendUnverifiedVerificationReminders` Function contains a server-side `claimFreePromo` action. The client cannot set premium fields or choose an expiry date. The server checks Firebase Auth `emailVerified`, cohort membership, new-member creation time, the fixed end date, and prior grant markers.

The server-side admin `processFreeMonthPromo` action was run once. Current result:

```text
Cohort size:       91
Newly granted:     3
Promo end:         2026-11-13T23:59:59.999Z
```

The frontend calls the server claim after a verified login. The frontend still needs to be uploaded to Stormer Host before this behavior is available to live users.

The status card label was changed from the incorrect `6 Months Premium` to `Free Premium Access` for `free1month`. The production site will not show this fix until the frontend upload is completed.

### Frontend production deployment state

GitHub Actions workflow:

```text
.github/workflows/deploy-frontend.yml
```

The workflow is manual-only and requires the confirmation value `DEPLOY`. It builds the production frontend, then uploads `frontend/dist/` to Stormer Host.

Configured GitHub Actions secret names:

```text
FIREBASE_API_KEY
PAYSTACK_PUBLIC_KEY
STORMERHOST_HOST
STORMERHOST_PORT
STORMERHOST_PROTOCOL
STORMERHOST_USER
STORMERHOST_PASS
STORMERHOST_REMOTE_DIR
```

Current intended FTP settings from cPanel:

```text
Host:          ftp.christianmatchghana.com
Port:          21
Protocol:      explicit FTPS/FTP over TLS
User:          deploy@christianmatchghana.com
Remote root:   /  (the FTP account is rooted at /home/christi3/public_html)
```

GitHub Actions history:

- Build completed successfully.
- FTP connection reached the server.
- Upload failed with `530 Login authentication failed`.
- No confirmed automated frontend upload has completed.
- The workflow now forces FTPS, has fail-fast network settings, and has a ten-minute job timeout.

The cPanel browser session showed:

```text
Main web root: /home/christi3/public_html
FTP account root: /home/christi3/public_html
Nested public_html paths must not be used as the website target.
```

A production build was created locally and packaged here:

```text
/tmp/cmg-frontend-dist.zip
```

Manual upload procedure:

1. Back up `/home/christi3/public_html` outside the web root.
2. Upload `/tmp/cmg-frontend-dist.zip` through cPanel File Manager.
3. Extract directly into `/home/christi3/public_html`.
4. Overwrite `index.html` and `assets/` when prompted.
5. Preserve `.htaccess` and hidden files.
6. Verify `/`, `/admin`, and authenticated login in a private browser window.

Do not extract into `/home/christi3/public_html/public_html`.

### Credential and security follow-ups

Credentials were exposed during the troubleshooting conversation. Treat these as compromised and rotate them after the deployment is stable:

- Stormer Host/cPanel password(s).
- SMTP mailbox password and Secret Manager `SMTP_PASS` version.
- Previously exposed Paystack secret and old Gmail SMTP password.

A Firebase web API key was accidentally placed in an earlier setup-script commit. The literal was removed in commit `42550fb`, but the earlier public commit remains in Git history. The key is a browser client identifier, not a service-account secret, but it should still be restricted to the production domains and required APIs. Rotate it only after updating the production frontend and GitHub Actions secret, otherwise the live app may break.

The local setup script now prompts or sources values without printing them:

```text
setup-github-deploy.sh
```

Do not put cPanel, SMTP, Paystack secret, or Firebase service-account credentials in this repository.

## Holistic future enhancement roadmap

### Priority 0 — stabilize production operations

1. Complete the manual frontend upload and verify the live bundle contains the promo claim and `Free Premium Access` label.
2. Rotate every credential exposed during this session and verify the replacement values without printing them.
3. Resolve the dedicated FTP account and cPHulk state, or use a cPanel-supported deployment API/SSH key. Do not keep retrying failed FTP passwords.
4. Add a release manifest containing commit SHA, build timestamp, environment, and frontend asset hash. Display it in an admin-only diagnostics view.
5. Keep a dated cPanel backup before every production frontend release and document the rollback command/procedure.

### Priority 1 — make the promotion reliable and enforceable

1. Add `free1month` to the shared TypeScript subscription type union and use a central `getEffectiveMembership()` helper everywhere.
2. Move promo claiming to a server-triggered verification flow or a scheduled server-side reconciliation. The current client trigger is only a request to the server and runs after verified login; it does not execute at the exact instant a user clicks the email link.
3. Add Firestore Rules protection so clients cannot write `isPremium`, subscription dates, `subscriptionStatus`, `subscriptionType`, or promo marker fields.
4. Add an immutable promo-grant audit collection containing UID, cohort/new-member eligibility, grant time, fixed end date, and Function version.
5. Make all access checks use the fixed-date subscription end consistently, not a mixture of `isPremium` and date checks.
6. Add a safe admin report for eligible, verified, granted, unverified, missing-profile, disabled, and failed records.

### Priority 1 — deployment and release safety

1. Keep production deployment manual with GitHub Environment approval rather than deploy-on-every-push.
2. Store Stormer Host credentials in a dedicated least-privilege account rooted exactly at `public_html`; prefer SSH deploy keys if the host supports them.
3. Add an upload staging directory and atomic release switch where cPanel permits it, avoiding partially uploaded bundles.
4. Add post-deploy smoke tests for `/`, `/admin`, Firebase project ID, login, one callable request, and the promo display.
5. Add a one-click rollback workflow using the last successful artifact, not only an ad-hoc cPanel backup.
6. Pin GitHub Action SHAs, add dependency lockfile validation, and run frontend build/security checks before the approval gate.

### Priority 1 — email and campaign operations

1. Add bounce and complaint processing with a suppression list; never repeatedly send to hard-bounced addresses.
2. Add unsubscribe/preference handling appropriate for promotional mail and retain an audit trail.
3. Add template version, campaign operator, timestamp, and provider message ID to each recipient record.
4. Add per-domain rate limiting and delivery monitoring for Gmail, Yahoo, iCloud, and other providers.
5. Add a preview mode that renders the exact personalized HTML for a selected recipient without sending.
6. Add campaign pause/resume controls and a maximum daily send budget.
7. Normalize and validate email addresses at signup, but never silently change an existing Auth identity when correcting a typo.

### Priority 2 — product and platform quality

1. Replace placeholder admin analytics and charts with real metrics from Firestore/Aggregation or BigQuery.
2. Implement the Paystack webhook TODO and make payment fulfillment server-side and idempotent.
3. Add subscription lifecycle fields for paid plans, free promos, refunds, chargebacks, and manual grants.
4. Add scheduled cleanup/expiry reconciliation for stale subscription records, even though the UI date check currently expires access.
5. Add automated staging E2E tests for signup, email verification, profile creation, upload, chat, payment test mode, and promo claim.
6. Add structured Cloud Logging and alerts for Function failures, SMTP failures, verification-link failures, and unusual grant volume.
7. Add Firestore composite indexes and query performance review before the user base grows.
8. Add accessibility, mobile viewport, offline/error-state, and browser compatibility testing to the frontend release gate.

### Recommended next session entry point

```text
1. Confirm whether /tmp/cmg-frontend-dist.zip was extracted into /home/christi3/public_html.
2. Verify the live site shows the new frontend build and Free Premium Access label.
3. Test one verified cohort account and one ineligible account against claimFreePromo.
4. Verify subscriptionEndDate is exactly 2026-11-13T23:59:59.999Z for grants.
5. Rotate exposed credentials and update Secret Manager/GitHub secrets.
6. Decide whether to fix FTP/cPHulk or adopt a cPanel API/SSH-key deployment route.
7. Implement Firestore Rules protection for subscription and promo fields.
```

## Original-source comparison and frontend safety check — 2026-10-14

The original archive was compared without modifying Stormer Host:

```text
Original: /Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-front.zip
Workspace: frontend/
```

Results:

- The rebuilt project preserves the original application structure and package metadata.
- Core files such as `App.tsx`, `types.ts`, and `constants.ts` are unchanged from the original.
- Expected changes are present in `MainApp.tsx`, `firebase.ts`, `services/userService.ts`,
  `services/notificationService.ts`, and `public/firebase-messaging-sw.js`.
- The changes cover emulator support, environment-driven Firebase configuration, Android
  navigation/startup safety, gated native push registration, server-side promo claiming,
  and production safety redaction.
- The original production site has not been overwritten by an automated upload: FTP/FTPS
  attempts failed before transfer, and the live site still showed the old `6 Months Premium`
  bundle.

A comparison found that the source service worker intentionally contains placeholders,
whereas the original archive contained production client configuration. To prevent the
frontend release from breaking web push, the build now generates:

```text
frontend/dist/firebase-messaging-sw.js
```

from the selected build environment. The source template remains placeholder-only and
secret-safe; the production build output contains the public Firebase client config.
The regenerated `/tmp/cmg-frontend-dist.zip` was validated to contain the configured
service worker and no `.env`, service-account, `node_modules`, or `.git` files.

Do not upload an older copy of the ZIP. Rebuild with `npm run build -- --mode production`
and recreate the archive whenever frontend source changes.

## Frontend deployment completed via cPanel File Manager — 2026-10-14

The reviewed production frontend archive was uploaded and extracted into the correct live root:

```text
/home/christi3/public_html
```

The cPanel timestamps confirmed the new build replaced the matching frontend files:

```text
assets/:                  updated today
index.html:               updated today
firebase-messaging-sw.js: updated today
.htaccess:                updated today
```

The following backups remain outside the web root:

```text
/home/christi3/backup-before-cmg-update-2026-10-14.zip
/home/christi3/public_html.zip
```

Do not delete these until production verification and rollback confidence are complete.

Live verification after extraction:

```text
Site reachable:            yes
Frontend JS loaded:        yes
Free Premium Access:       present
claimFreePromo:            present
Configured service worker:  present
```

The string `6 Months Premium` remains in the bundle for the legitimate paid six-month plan; the free promo path now displays `Free Premium Access`.

The automated FTP/GitHub Actions deployment remains configured but unresolved because the Stormer Host FTP account returned `530 Login authentication failed`. The cPanel File Manager deployment is the successful production release path for this version.
