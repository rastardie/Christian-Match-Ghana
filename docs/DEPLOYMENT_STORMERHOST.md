# Stormer Host production frontend deployment

## Hosting boundary

The production frontend is served as static files by Stormer Host/cPanel at:

```text
https://christianmatchghana.com
```

Firebase remains the backend for Auth, Firestore, Storage, Functions, and related services. Firebase Hosting is used for staging in this rebuilt workspace and is not the production frontend host.

## Files already included for cPanel hosting

```text
frontend/public/.htaccess   # Apache/React Router fallback
frontend/public/_redirects  # Netlify-compatible fallback; harmless on cPanel
```

The `.htaccess` rule sends non-file/non-directory routes to `/index.html`, allowing routes such as `/admin` to load the React application.

## Automated deployment (SFTP/FTP)

An automated deploy script mirrors the backend workflow: it builds the production
frontend and uploads `frontend/dist/` to cPanel in one command.

One-time setup:

```bash
cp .deploy/stormerhost.env.example .deploy/stormerhost.env
# edit .deploy/stormerhost.env with your cPanel SFTP/FTP host, user, password, remote dir
cp frontend/.env.production.example frontend/.env.production
# edit frontend/.env.production with real production values
```

`.deploy/stormerhost.env` and `frontend/.env.production` are git-ignored and must never be committed.

Deploy:

```bash
./deploy-frontend.sh
```

The script:

1. Verifies credentials and that `.env.production` targets `christianmatch-app`.
2. Temporarily sets aside `frontend/.env.local` so the production build does not use it.
3. Builds with `vite build --mode production`.
4. Optionally backs up the current remote document root to `.deploy/backups/<timestamp>` (`CMG_DEPLOY_BACKUP=true`).
5. Uploads `frontend/dist/` to the remote document root via `lftp` (SFTP by default).
6. Verifies `https://christianmatchghana.com` responds.

Safety switches in `.deploy/stormerhost.env`:

- `CMG_DEPLOY_BACKUP=true` — back up remote before upload (recommended).
- `CMG_DEPLOY_DELETE=false` — keep remote files not present locally. Only set `true`
  if `public_html` contains ONLY this app, or unrelated files will be removed.

Requires `lftp` (`brew install lftp`). The password is passed to `lftp` via stdin,
not the process arguments.

## Safe production deployment procedure (manual)

Production deployment is intentionally manual and must be explicitly approved.

1. Build using reviewed production environment values. Do not use `frontend/.env.local`.
2. Confirm `VITE_APP_ENV=production`.
3. Confirm `VITE_FIREBASE_PROJECT_ID=christianmatch-app`.
4. Confirm `VITE_PUBLIC_APP_URL=https://christianmatchghana.com`.
5. Confirm Paystack is configured only through the protected production environment.
6. Build the frontend:

```bash
cd frontend
npm ci
npm run build
```

7. Review `frontend/dist/` before upload.
8. Upload the **contents** of `frontend/dist/` to the production cPanel document root, normally `public_html/`.
9. Ensure `.htaccess` is uploaded and visible; enable “show hidden files” in cPanel File Manager if necessary.
10. Do not upload `node_modules`, source files, `.env` files, emulator exports, or debug logs.
11. Open `https://christianmatchghana.com`, `/admin`, and the Auth action links in a private browser session.
12. Verify the browser is using the `christianmatch-app` Firebase project before accepting the release.

## What GitHub synchronization does not do

Pushing this repository branch does not upload files to Stormer Host and does not change Firebase production. A separate authenticated cPanel/File Manager or approved SFTP deployment is required.

Never commit or store in this repository:

- cPanel username/password
- FTP/SFTP host credentials or private keys
- Production `.env` files
- Paystack secret keys
- SMTP passwords
- Firebase service-account JSON files

## Rollback

Before uploading a release, create a dated backup of the current production document-root contents. Roll back by restoring that backup through cPanel/File Manager or the approved SFTP process.
