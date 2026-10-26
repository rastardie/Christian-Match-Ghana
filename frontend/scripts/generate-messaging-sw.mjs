import fs from 'node:fs';
import path from 'node:path';

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.slice('--mode='.length) : 'production';
const envFiles = [`.env.${mode}`, '.env.local', '.env'];
const values = {};

for (const file of envFiles) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) continue;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(match[1] in values)) values[match[1]] = value;
  }
}

const keys = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
  measurementId: 'VITE_FIREBASE_MEASUREMENT_ID'
};
const missing = Object.values(keys).filter((key) => !values[key]);
if (missing.length) {
  throw new Error(`Missing Firebase config for messaging service worker: ${missing.join(', ')}`);
}

const config = Object.fromEntries(
  Object.entries(keys).map(([name, envKey]) => [name, values[envKey]])
);
const basePath = values.VITE_BASE_PATH || '/';
const iconPath = `${basePath.replace(/\/$/, '')}/icon-192x192.png`;
const output = `importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = ${JSON.stringify(config, null, 2)};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const unreadCount = Math.max(0, Number(payload.data?.unreadCount || 0));
  try {
    if (unreadCount > 0 && typeof self.registration.setAppBadge === 'function') {
      await self.registration.setAppBadge(unreadCount);
    } else if (unreadCount === 0 && typeof self.registration.clearAppBadge === 'function') {
      await self.registration.clearAppBadge();
    }
  } catch (error) {
    console.warn('[firebase-messaging-sw.js] Unable to update app badge', error);
  }
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '${iconPath}',
    badge: '${iconPath}'
  };
  await self.registration.showNotification(notificationTitle, notificationOptions);
});
`;

const destination = path.resolve('dist/firebase-messaging-sw.js');
fs.writeFileSync(destination, output);
console.log(`Generated ${destination} for ${mode} without modifying the source service worker.`);
