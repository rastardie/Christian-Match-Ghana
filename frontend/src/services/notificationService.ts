import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, messaging } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Native FCM registration requires an Android google-services.json or iOS
// Web VAPID Key: configure separately for web push in the Firebase Console.
const VAPID_KEY = "BMctucuZRDx-F_wcSt31cWkbytbZc7Fb9wagc2mL2O_-ub9H1J7TIAa7VQKOOPIPdqGmNYrlMBUNp-XHXGLWiJA";
// native Firebase configuration. Keep it disabled unless that configuration
// has been deliberately installed for the target build.
const nativePushEnabled = import.meta.env.VITE_NATIVE_PUSH_ENABLED === 'true';

export const setupPushNotifications = async (userId: string, onWebNotificationReceived?: (payload: any) => void) => {
  if (Capacitor.isNativePlatform()) {
    if (!nativePushEnabled) {
      console.log('Native push notifications disabled for this build; skipping FCM registration.');
      return;
    }

    // CAPACITOR (MOBILE) PUSH NOTIFICATIONS
    try {
      // Request permission
      const result = await PushNotifications.requestPermissions();
      if (result.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();
      } else {
        console.warn('Push notification permission denied on mobile.');
      }

      // Add listeners
      PushNotifications.addListener('registration', async (token) => {
        console.log('Mobile Push Registration token: ', token.value);
        // Save token to user profile
        try {
          const userRef = doc(db, 'users', userId);
          await setDoc(userRef, { fcmToken: token.value }, { merge: true });
        } catch (e) {
          console.error("Error saving native push token: ", e);
        }
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on push registration: ', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Mobile Push received: ', notification);
        if (onWebNotificationReceived) {
          onWebNotificationReceived(notification);
        }
      });
    } catch (error) {
      console.error('Error setting up native push notifications:', error);
    }
  } else {
    // WEB PUSH NOTIFICATIONS
    if (messaging) {
      try {
        console.log('Requesting Web Push permission...');
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Web Push permission granted.');
          // Get Token
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (currentToken) {
            console.log('Web Push Token received: ', currentToken);
            // Save token to user profile
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, { webFcmToken: currentToken }, { merge: true });
          } else {
            console.warn('No web registration token available. Request permission to generate one.');
          }

          // Listen to foreground messages
          onMessage(messaging, (payload) => {
            console.log('Web Push foreground message received. ', payload);
            if (onWebNotificationReceived) {
               onWebNotificationReceived(payload);
            }
          });
        } else {
          console.warn('Web Push permission denied.');
        }
      } catch (error) {
        console.error('Error setting up web push notifications:', error);
      }
    } else {
      console.log('Firebase Messaging is not supported in this browser environment.');
    }
  }
};

/** Clear native delivered notifications when the user has no unread messages. */
export async function clearNativeNotificationBadge(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.warn('Unable to clear native notification badge:', error);
  }
}
