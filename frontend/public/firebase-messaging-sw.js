importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "replace-with-public-firebase-api-key",
  authDomain: "replace-with-firebase-auth-domain",
  projectId: "replace-with-firebase-project-id",
  storageBucket: "replace-with-firebase-storage-bucket",
  messagingSenderId: "replace-with-messaging-sender-id",
  appId: "replace-with-firebase-app-id",
  measurementId: "replace-with-measurement-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Keep the installed app icon badge in step with unread messages while the
  // app is closed. The server sends the total unread count in data.unreadCount.
  const badgeNavigator = self.navigator;
  const unread = Number(payload.data?.unreadCount);
  if (Number.isFinite(unread) && badgeNavigator) {
    const update = unread > 0
      ? badgeNavigator.setAppBadge && badgeNavigator.setAppBadge(unread)
      : badgeNavigator.clearAppBadge && badgeNavigator.clearAppBadge();
    Promise.resolve(update).catch((error) => console.warn('[firebase-messaging-sw.js] Badge update failed', error));
  }
  
  // Extract notification details
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/logo192.png', // Replace with your app's icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
