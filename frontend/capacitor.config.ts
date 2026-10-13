import type { CapacitorConfig } from '@capacitor/cli';

const useFirebaseEmulators = process.env.VITE_USE_FIREBASE_EMULATORS === 'true';

const config: CapacitorConfig = {
  appId: 'com.cmg.christianmatch',
  appName: 'cmg-christian-match',
  webDir: 'dist',
  server: {
    // Local Firebase emulators use HTTP on 10.0.2.2 from Android. The local
    // WebView must also use HTTP to avoid HTTPS-to-HTTP mixed-content blocking.
    androidScheme: useFirebaseEmulators ? 'http' : 'https',
    cleartext: useFirebaseEmulators,
  },
};

export default config;
