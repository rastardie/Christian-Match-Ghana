# Admin Panel Access Configuration

## Overview

Your app is now configured to allow admin access at:
**https://christianmatchghana.com/admin**

## How It Works

### 1. Routing Configuration

- **App.tsx** uses React Router with the following routes:
  - `/` - Main user app
  - `/admin` - Protected admin dashboard
  - `/admin/login` - Admin login page
  - `/admin/*` - All admin sub-routes

### 2. Admin Access Control

- Only the email `christianmatchghanaltd@gmail.com` can access the admin dashboard
- Non-admin users are redirected to the main app
- Unauthenticated users are redirected to `/admin/login`

### 3. Hosting Configuration

The following files ensure proper routing on different hosting providers:

#### Firebase Hosting (`firebase.json`)

```json
"hosting": {
  "public": "dist",
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

#### Apache Servers (`.htaccess`)

Located in `dist/.htaccess` - handles URL rewriting for Apache servers

#### Netlify/Static Hosts (`_redirects`)

Located in `dist/_redirects` - handles SPA routing for Netlify and similar hosts

## Deployment Instructions

### Option 1: Firebase Hosting (Recommended)

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy everything (hosting + firestore rules)
firebase deploy
```

After deployment, your app will be available at your Firebase hosting URL.

### Option 2: Custom Domain (Apache/cPanel)

1. Build the app: `npm run build`
2. Upload the entire `dist/` folder to your server's public_html directory
3. The `.htaccess` file will handle all routing automatically
4. Access admin at: `https://christianmatchghana.com/admin`

### Option 3: Netlify

1. Build the app: `npm run build`
2. Drag and drop the `dist/` folder to Netlify
3. The `_redirects` file will handle routing
4. Set your custom domain in Netlify settings

## Testing Admin Access

### Local Testing

```bash
npm run dev
# Then visit: http://localhost:3000/admin
```

### After Deployment

1. Visit: `https://christianmatchghana.com/admin`
2. You'll be redirected to `/admin/login` if not authenticated
3. Login with: `christianmatchghanaltd@gmail.com`
4. After successful login, you'll access the admin dashboard

## Admin Routes

Once logged in as admin, you can access:

- `/admin` - Dashboard overview
- `/admin/users` - User management
- `/admin/prayers` - Prayer requests moderation
- `/admin/reports` - Reported content

## Important Files

- `App.tsx` - Main routing configuration
- `components/admin/AdminDashboard.tsx` - Admin panel
- `components/admin/AdminLogin.tsx` - Admin login
- `firebase.json` - Firebase hosting configuration
- `public/.htaccess` - Apache server routing
- `public/_redirects` - Netlify/static hosting routing

## Security Notes

- Admin access is restricted to one email: `christianmatchghanaltd@gmail.com`
- All admin routes require authentication
- Firebase security rules should be properly configured
- Always use HTTPS in production

## Troubleshooting

### Issue: 404 on /admin after deployment

**Solution**: Ensure your hosting provider supports SPA routing:

- Firebase: Configured in `firebase.json`
- Apache: Ensure `.htaccess` is in the root directory
- Netlify: Ensure `_redirects` file exists in dist/

### Issue: Admin login doesn't redirect

**Check**:

1. Firebase Auth is properly configured
2. The admin email is exact: `christianmatchghanaltd@gmail.com`
3. Browser console for any errors

### Issue: Routes work locally but not in production

**Solution**:

- For Apache: Make sure `mod_rewrite` is enabled
- For other hosts: Check hosting provider's SPA configuration docs
