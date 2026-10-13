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
  
  // Extract notification details
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/logo192.png', // Replace with your app's icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
