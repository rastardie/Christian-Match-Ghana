const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getMessaging } = require("firebase-admin/messaging");
const { getStorage } = require("firebase-admin/storage");
const crypto = require("crypto");
const { promisify } = require("util");
const scryptAsync = promisify(crypto.scrypt);
const nodemailer = require("nodemailer");
const { queueOfflineMessageNotification, processOfflineMessageNotificationBatches } = require('./offlineNotificationService');
const path = require("path");
const { PERMISSIONS, DEFAULT_GROUPS, permissionsFromGroups } = require("./rbac");

admin.initializeApp();

const db = getFirestore();
const auth = getAuth();
const messaging = getMessaging();
const storage = getStorage();

const LEGACY_SUPER_ADMIN_EMAILS = new Set([
  'christianmatchghanaltd@gmail.com',
  'admin@example.com',
]);
const PIN_PATTERN = /^\d{4,6}$/;

async function hashUserPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(pin, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
}

async function verifyUserPin(pin, encoded) {
  if (typeof encoded !== 'string' || !encoded.startsWith('scrypt$')) return false;
  const [, salt, expectedHex] = encoded.split('$');
  if (!salt || !expectedHex) return false;
  const derived = await scryptAsync(pin, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(derived);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function isLegacySuperAdmin(context) {
  return Boolean(context.auth?.token?.email && LEGACY_SUPER_ADMIN_EMAILS.has(context.auth.token.email));
}

async function getAdminAccess(uid) {
  const snapshot = await db.collection('adminUsers').doc(uid).get();
  return snapshot.exists ? snapshot.data() : null;
}

async function requireAnyAdminPermission(context, requiredPermissions) {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  if (isLegacySuperAdmin(context)) return { isSuperAdmin: true, permissions: PERMISSIONS };
  const access = await getAdminAccess(context.auth.uid);
  const permissions = access?.permissions || [];
  const hasLegacyCompatiblePermission = requiredPermissions.includes('messages.groups.manage') && permissions.includes('messages.moderate');
  const hasRequiredPermission = requiredPermissions.some((permission) => permissions.includes(permission));
  if (!access || (!access.isSuperAdmin && !hasRequiredPermission && !hasLegacyCompatiblePermission)) {
    throw new functions.https.HttpsError('permission-denied', 'You do not have permission to perform this action.');
  }
  return access;
}

async function requireAdminPermission(context, permission) {
  return requireAnyAdminPermission(context, [permission]);
}

exports.setUserPin = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  const newPin = String(data?.newPin || '').trim();
  const currentCredential = data?.currentCredential == null ? '' : String(data.currentCredential).trim();
  if (!PIN_PATTERN.test(newPin)) throw new functions.https.HttpsError('invalid-argument', 'PIN must contain 4 to 6 digits.');
  const userRef = db.collection('users').doc(context.auth.uid);
  const userSnapshot = await userRef.get();
  const userData = userSnapshot.exists ? userSnapshot.data() : {};
  if (userData.pinHash && !currentCredential) throw new functions.https.HttpsError('invalid-argument', 'Enter your current PIN to change it.');
  if (userData.pinHash && !(await verifyUserPin(currentCredential, userData.pinHash))) throw new functions.https.HttpsError('permission-denied', 'Current PIN is incorrect.');
  await userRef.set({ pinHash: await hashUserPin(newPin), hasPin: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection('adminAuditLogs').add({ actorId: context.auth.uid, actorEmail: context.auth.token.email || null, action: userData.pinHash ? 'user.pin.changed' : 'user.pin.created', targetId: context.auth.uid, details: { operation: userData.pinHash ? 'change' : 'create' }, createdAt: FieldValue.serverTimestamp() });
  return { hasPin: true };
});

exports.loginWithPin = functions.https.onCall(async (data, context) => {
  const identifier = String(data?.identifier || '').trim().toLowerCase();
  const pin = String(data?.pin || '').trim();
  if (!identifier || !PIN_PATTERN.test(pin)) throw new functions.https.HttpsError('invalid-argument', 'Enter a valid email/username and a 4–6 digit PIN.');
  let uid = null;
  if (identifier.includes('@')) {
    const record = await auth.getUserByEmail(identifier).catch(() => null);
    uid = record?.uid || null;
  } else {
    const adminSnapshot = await db.collection('adminUsers').where('loginName', '==', identifier).limit(1).get();
    uid = adminSnapshot.empty ? null : adminSnapshot.docs[0].data().userId;
  }
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Invalid login credentials.');
  const [authRecord, userSnapshot] = await Promise.all([auth.getUser(uid), db.collection('users').doc(uid).get()]);
  const userData = userSnapshot.exists ? userSnapshot.data() : {};
  if (!authRecord.emailVerified || userData.isBlocked === true || userData.status === 'Blocked') throw new functions.https.HttpsError('permission-denied', 'This account cannot sign in.');
  if (!(await verifyUserPin(pin, userData.pinHash))) throw new functions.https.HttpsError('unauthenticated', 'Invalid login credentials.');
  return { token: await auth.createCustomToken(uid, { pinLogin: true }) };
});

exports.resolveLoginIdentifier = functions.https.onCall(async (data, context) => {
  const identifier = String(data?.identifier || '').trim().toLowerCase();
  if (!identifier || identifier.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'A username is required.');
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(identifier)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid username format.');
  }
  const snapshot = await db.collection('adminUsers').where('loginName', '==', identifier).limit(1).get();
  if (snapshot.empty) {
    throw new functions.https.HttpsError('not-found', 'Invalid login credentials.');
  }
  const email = snapshot.docs[0].data().email;
  if (typeof email !== 'string' || !email) {
    throw new functions.https.HttpsError('failed-precondition', 'This account has no valid login identity.');
  }
  return { email };
});

exports.completeAdminPasswordChange = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  const access = await getAdminAccess(context.auth.uid);
  if (!access) throw new functions.https.HttpsError('permission-denied', 'Administrator access is required.');
  if (access.mustChangePassword !== true) return { updated: false };
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.update(db.collection('adminUsers').doc(context.auth.uid), { mustChangePassword: false, updatedAt: now });
  batch.set(db.collection('users').doc(context.auth.uid), { mustChangePassword: false, updatedAt: now }, { merge: true });
  batch.set(db.collection('adminAuditLogs').doc(), {
    actorId: context.auth.uid,
    actorEmail: context.auth.token.email || null,
    action: 'admin.password.first_login_changed',
    targetId: context.auth.uid,
    details: {},
    createdAt: now,
  });
  await batch.commit();
  return { updated: true };
});

async function recordAdminAudit(context, action, targetId, details = {}) {
  await db.collection('adminAuditLogs').add({
    actorId: context.auth.uid,
    actorEmail: context.auth.token.email || null,
    action,
    targetId: targetId || null,
    details,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function ensureDefaultGroups() {
  const batch = db.batch();
  for (const group of DEFAULT_GROUPS) {
    const ref = db.collection('adminGroups').doc(group.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) batch.set(ref, { ...group, system: true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
}

exports.adminListAccessControl = functions.https.onCall(async (data, context) => {
  await requireAdminPermission(context, 'groups.manage');
  await ensureDefaultGroups();
  const [groupsSnapshot, usersSnapshot] = await Promise.all([
    db.collection('adminGroups').orderBy('name').get(),
    db.collection('adminUsers').get(),
  ]);
  return {
    permissions: PERMISSIONS,
    groups: groupsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    users: usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});

exports.adminUpsertGroup = functions.https.onCall(async (data, context) => {
  const access = await requireAdminPermission(context, 'groups.manage');
  const groupId = String(data?.groupId || '').trim();
  const name = String(data?.name || '').trim();
  const description = String(data?.description || '').trim();
  const permissions = Array.isArray(data?.permissions) ? data.permissions.filter((item) => PERMISSIONS.includes(item)) : [];
  if (!name || permissions.length === 0) throw new functions.https.HttpsError('invalid-argument', 'Group name and permissions are required.');
  if (!access.isSuperAdmin && permissions.some((permission) => !(access.permissions || []).includes(permission))) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot grant permissions you do not possess.');
  }
  if (name === 'Super Admin' && !access.isSuperAdmin) throw new functions.https.HttpsError('permission-denied', 'Only Super Admin can modify the Super Admin group.');
  const id = groupId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (id === 'super-admins' && !access.isSuperAdmin) throw new functions.https.HttpsError('permission-denied', 'Only Super Admin can modify the Super Admin group.');
  await db.collection('adminGroups').doc(id).set({ id, name, description, permissions, system: id === 'super-admins', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await recordAdminAudit(context, groupId ? 'admin.group.updated' : 'admin.group.created', id, { name, permissions });
  return { id, name, description, permissions };
});

exports.adminAssignUserGroups = functions.https.onCall(async (data, context) => {
  const access = await requireAdminPermission(context, 'groups.manage');
  const targetUserId = String(data?.userId || '').trim();
  const groupIds = Array.isArray(data?.groupIds) ? data.groupIds.map(String) : [];
  if (!targetUserId) throw new functions.https.HttpsError('invalid-argument', 'A user ID is required.');
  if (groupIds.includes('super-admins') && !access.isSuperAdmin) throw new functions.https.HttpsError('permission-denied', 'Only Super Admin can grant Super Admin access.');
  const groupsSnapshot = await db.collection('adminGroups').get();
  const groups = groupsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const validIds = new Set(groups.map((group) => group.id));
  if (groupIds.some((groupId) => !validIds.has(groupId))) throw new functions.https.HttpsError('invalid-argument', 'One or more groups do not exist.');

  const targetRef = db.collection('adminUsers').doc(targetUserId);
  const targetSnapshot = await targetRef.get();
  const target = targetSnapshot.exists ? targetSnapshot.data() : {};
  if (target.isSuperAdmin && !groupIds.includes('super-admins')) {
    throw new functions.https.HttpsError('failed-precondition', 'The Super Admin role cannot be removed through this operation.');
  }
  if (groupIds.includes('super-admins') && access.isSuperAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only Super Admin can grant Super Admin access.');
  }

  const permissions = permissionsFromGroups(groups, groupIds);
  if (!access.isSuperAdmin && permissions.some((permission) => !(access.permissions || []).includes(permission))) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot assign a group that grants permissions you do not possess.');
  }
  await targetRef.set({ userId: targetUserId, groupIds, permissions, isSuperAdmin: groupIds.includes('super-admins'), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await recordAdminAudit(context, 'admin.user.groups.updated', targetUserId, { groupIds, permissions });
  return { userId: targetUserId, groupIds, permissions, isSuperAdmin: groupIds.includes('super-admins') };
});

exports.adminCreateAdministrator = functions.https.onCall(async (data, context) => {
  const access = await requireAdminPermission(context, 'permissions.manage');
  if (access.isSuperAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only a Super Admin can create administrators.');
  }

  const email = String(data?.email || '').trim().toLowerCase();
  const loginName = String(data?.loginName || '').trim().toLowerCase();
  const displayName = String(data?.displayName || '').trim();
  const password = String(data?.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(loginName) || !displayName || password.length < 12) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid username, email, display name, and password of at least 12 characters are required.');
  }

  let createdUser = null;
  try {
    const existingAlias = await db.collection('adminUsers').where('loginName', '==', loginName).limit(1).get();
    if (!existingAlias.empty) throw new functions.https.HttpsError('already-exists', 'That administrator username is already in use.');
    createdUser = await auth.createUser({ email, password, displayName, emailVerified: true, disabled: false });
    await ensureDefaultGroups();
    const superAdminGroup = await db.collection('adminGroups').doc('super-admins').get();
    const permissions = superAdminGroup.exists && Array.isArray(superAdminGroup.data().permissions)
      ? superAdminGroup.data().permissions
      : PERMISSIONS;
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(db.collection('adminUsers').doc(createdUser.uid), {
      userId: createdUser.uid,
      email,
      loginName,
      displayName,
      groupIds: ['super-admins'],
      permissions,
      isSuperAdmin: true,
      mustChangePassword: true,
      createdBy: context.auth.uid,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.collection('users').doc(createdUser.uid), {
      id: createdUser.uid,
      email,
      name: displayName,
      role: 'Admin',
      status: 'Active',
      isVerified: true,
      verificationStatus: 'verified',
      isContactVerified: false,
      isPremium: false,
      subscriptionStatus: 'expired',
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      mustChangePassword: true,
      age: 0,
      gender: '',
      country: 'Ghana',
      location: '',
      bio: '',
      photos: [],
      denomination: '',
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString(),
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    batch.set(db.collection('adminAuditLogs').doc(), {
      actorId: context.auth.uid,
      actorEmail: context.auth.token.email || null,
      action: 'admin.user.created',
      targetId: createdUser.uid,
      details: { email, displayName, groupIds: ['super-admins'], mustChangePassword: true, isPremium: false },
      createdAt: now,
    });
    await batch.commit();
    return { userId: createdUser.uid, loginName, email, displayName, isSuperAdmin: true, mustChangePassword: true, isPremium: false };
  } catch (error) {
    if (createdUser) await auth.deleteUser(createdUser.uid).catch(() => undefined);
    if (error instanceof functions.https.HttpsError) throw error;
    if (error?.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'An account with this email already exists.');
    }
    console.error('Unable to create administrator:', error);
    throw new functions.https.HttpsError('internal', 'Unable to create administrator securely.');
  }
});

exports.adminListAuditLogs = functions.https.onCall(async (data, context) => {
  await requireAdminPermission(context, 'audit.view');
  const snapshot = await db.collection('adminAuditLogs').orderBy('createdAt', 'desc').limit(100).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

// ----------------------------------------------------------------------------
// PAYSTACK WEBHOOK HANDLER
// ----------------------------------------------------------------------------
// This function verifies and processes webhooks from Paystack.
// It securely retrieves the secret key from the environment variables.
//
// URL matches: https://us-central1-<project-id>.cloudfunctions.net/paystackWebhook
// ----------------------------------------------------------------------------

exports.paystackWebhook = functions
  .runWith({ secrets: ['PAYSTACK_SECRET_KEY'] })
  .https.onRequest(async (req, res) => {
  try {
    // 1. Validate Request Method
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // 2. Validate Paystack Signature
    // Ideally, use: models.config().paystack.secret_key or process.env.PAYSTACK_SECRET_KEY
    // We are using process.env here which reads from .env file during deployment
    // or runtime configuration.
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      console.error("Missing Paystack Secret Key in environment variables.");
      return res.status(500).send("Server Configuration Error");
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      console.warn("Invalid Paystack Signature detected.");
      return res.status(401).send("Invalid Signature");
    }

    // 3. Process the Event
    const event = req.body;
    console.log("Paystack Event Received:", event.event, event.data.reference);

    if (event.event === "charge.success") {
      const data = event.data;
      const { reference, amount, metadata, customer } = data;
      
      // Example: Metadata might contain userId or intended action
      // const userId = metadata?.userId;
      
      // TODO: Add your logic here to fulfill the purchase.
      // For example, finding the user by email or metadata reference
      // and unlocking the feature in Firestore.
      
      // Example:
      // if (metadata.userId) {
      //   await db.collection('users').doc(metadata.userId).update({
      //     isPremium: true
      //   });
      // }
      
      console.log(`Payment confirmed for reference: ${reference}`);
    }

    // 4. Acknowledge Receipt
    res.status(200).send("Webhook Received");
  } catch (error) {
    console.error("Error processing Paystack webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

// ----------------------------------------------------------------------------
// ADMIN: DELETE USER ACCOUNT
// ----------------------------------------------------------------------------
// Deletes a user from Firebase Authentication.
// Must be called by an authenticated admin user.
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  await requireAdminPermission(context, 'users.delete');

  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a "userId" argument.'
    );
  }

  try {
    await auth.deleteUser(userId);
    console.log(`Successfully deleted user ${userId} from Auth`);
    return { success: true, authDeleted: true, message: `User ${userId} deleted from Auth.` };
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      console.warn(`Auth user ${userId} was already absent; allowing profile cleanup.`);
      return { success: true, authDeleted: false, message: `No Auth account found for ${userId}; profile cleanup may continue.` };
    }
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError('internal', 'Unable to delete user from Auth.');
  }
});

// ----------------------------------------------------------------------------
// CHAT NOTIFICATIONS (PUSH & EMAIL)
// ----------------------------------------------------------------------------

async function getUnreadMessageCountForUser(userId) {
  const chatsSnapshot = await db
    .collection('chats')
    .where('participants', 'array-contains', userId)
    .get();
  return chatsSnapshot.docs.reduce((total, chatDoc) => {
    const unreadCount = Number(chatDoc.data()?.unreadCount?.[userId] || 0);
    return total + (Number.isFinite(unreadCount) ? Math.max(0, unreadCount) : 0);
  }, 0);
}

exports.onMessageSent = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    if (!message || !message.chatId || !message.senderId) return null;

    try {
      // Get chat details to find participants and sender name
      const chatDoc = await db.collection('chats').doc(message.chatId).get();
      if (!chatDoc.exists) {
        console.warn(`Chat document not found for chatId: ${message.chatId}`);
        return null;
      }
      const chatData = chatDoc.data();

      // Resolve recipient (the participant who is not the sender)
      const senderId = message.senderId;
      const receiverId = (chatData.participants || []).find(id => id !== senderId);
      if (!receiverId) {
        console.warn(`No receiverId found in chat participants for chatId: ${message.chatId}`);
        return null;
      }

      // Fetch receiver profile to get tokens & email
      const userDoc = await db.collection('users').doc(receiverId).get();
      if (!userDoc.exists) {
        console.warn(`Receiver user document not found for id: ${receiverId}`);
        return null;
      }

      const userData = userDoc.data();
      const notificationPreferences = {
        push: userData.notificationPreferences?.push !== false,
        email: userData.notificationPreferences?.email !== false,
        sms: userData.notificationPreferences?.sms === true && userData.smsNotificationsEnabled === true,
        newChatMessages: userData.notificationPreferences?.newChatMessages !== false,
      };
      const senderName = (chatData.participantDetails && chatData.participantDetails[senderId]?.name) || 'Someone';
      const receiverName = userData.name || 'User';

      // 1. Send Push Notification if tokens exist
      const fcmToken = userData.fcmToken;
      const webFcmToken = userData.webFcmToken;

      const tokens = [];
      if (fcmToken) tokens.push(fcmToken);
      if (webFcmToken) tokens.push(webFcmToken);

      if (notificationPreferences.push && notificationPreferences.newChatMessages && tokens.length > 0) {
        const unreadMessageCount = await getUnreadMessageCountForUser(receiverId);
        const payload = {
          notification: {
            title: `New message from ${senderName}`,
            body: message.text || 'You have received a new message',
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            chatId: message.chatId,
            type: 'chat_message',
            unreadCount: String(unreadMessageCount),
          },
          android: {
            notification: {
              notificationCount: unreadMessageCount,
            },
          },
          apns: {
            payload: {
              aps: {
                badge: unreadMessageCount,
              },
            },
          },
        };

        try {
          const response = await messaging.sendEachForMulticast({
            tokens,
            notification: payload.notification,
            data: payload.data,
            android: payload.android,
            apns: payload.apns,
          });
          console.log('Push notification sent for message:', response.successCount, 'badge:', unreadMessageCount);
        } catch (pushError) {
          console.error('Error sending push notification:', pushError);
        }
      }

      // Queue one offline digest window instead of sending email/SMS per message.
      // The scheduled worker re-checks presence, unread state, preferences, and
      // provider availability immediately before delivery.
      if (notificationPreferences.newChatMessages && (userData.email || ((notificationPreferences.sms === true || notificationPreferences.whatsapp === true) && userData.phone))) {
        await queueOfflineMessageNotification({
          db,
          recipientId: receiverId,
          chatId: message.chatId,
          messageId: context.params.messageId,
          senderId,
          senderName,
          text: message.text,
        });
      }

      return null;
    } catch (error) {
      console.error('Error sending message notifications:', error);
      return null;
    }
  });

// Process offline chat notification digests every five minutes. Each recipient
// receives at most one email/SMS digest per 15-minute window.
exports.processOfflineMessageNotificationBatches = functions
  .runWith({ secrets: ['SMTP_PASS'] })
  .pubsub.schedule('every 5 minutes')
  .timeZone('Africa/Accra')
  .onRun(async () => {
    await processOfflineMessageNotificationBatches(db);
    return null;
  });

// ----------------------------------------------------------------------------
// PRAYER WALL NOTIFICATIONS
// ----------------------------------------------------------------------------

exports.onPrayerWallPosted = functions.firestore
  .document('prayers/{prayerId}') // Adjust collection name if it's different (e.g. prayerWall or prayers)
  .onCreate(async (snap, context) => {
    const prayer = snap.data();
    if (!prayer) return null;

    try {
      // Fetch users who want to receive prayer wall notifications
      // For now, let's just fetch all users who have tokens
      const usersSnapshot = await db.collection('users').get();
      
      const tokens = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        // Skip the person who posted it
        if (userData.id === prayer.userId) return;
        
        if (userData.fcmToken) tokens.push(userData.fcmToken);
        if (userData.webFcmToken) tokens.push(userData.webFcmToken);
      });

      if (tokens.length === 0) return null;

      // Group tokens in chunks of 500 for Firebase Admin limits
      const chunkedTokens = [];
      for (let i = 0; i < tokens.length; i += 500) {
        chunkedTokens.push(tokens.slice(i, i + 500));
      }

      const payload = {
        notification: {
          title: 'New Prayer Wall Request 🙏',
          body: `${prayer.userName || 'Someone'} needs your prayers.`,
        },
        data: {
          type: 'prayer_wall'
        }
      };

      let successCount = 0;
      for (const chunk of chunkedTokens) {
        const response = await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: payload.notification,
          data: payload.data
        });
        successCount += response.successCount;
      }

      console.log(`Sent prayer wall notification to ${successCount} devices`);
      return null;
    } catch (error) {
      console.error('Error sending prayer wall push notification:', error);
      return null;
    }
  });

// ----------------------------------------------------------------------------
// USER: DELETE OWN ACCOUNT
// ----------------------------------------------------------------------------
exports.deleteMyAccount = functions.https.onCall(async (data, context) => {
  // 1. Check Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email;

  if (!email) {
     throw new functions.https.HttpsError(
      'invalid-argument',
      'User does not have an email address.'
    );
  }

  try {
    // 2. Add to deletedAccounts to enforce the 10-day block
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    // Using lowercase email as the document ID for easy lookup
    await db.collection('deletedAccounts').doc(email.toLowerCase()).set({
      email: email,
      deletedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      uid: uid
    });

    // 3. Delete from Firestore (users collection)
    await db.collection('users').doc(uid).delete();

    // 4. Delete files from Firebase Storage (photos)
    try {
       const bucket = storage.bucket();
       // Delete all files under users/{uid}/
       await bucket.deleteFiles({
          prefix: `users/${uid}/`
       });
       console.log(`Successfully deleted storage files for ${uid}`);
    } catch (storageError) {
       console.warn(`Could not delete storage files for ${uid} (may not exist or storage not configured)`, storageError);
    }

    // 5. Delete from Firebase Auth
    await auth.deleteUser(uid);
    console.log(`Successfully deleted user ${uid} and all associated data.`);

    return { success: true, message: `Account and data deleted.` };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Unable to delete account completely. ' + error.message
    );
  }
});

// ----------------------------------------------------------------------------
// USER: CHECK SIGNUP ELIGIBILITY
// ----------------------------------------------------------------------------
exports.checkSignupEligibility = functions.https.onCall(async (data, context) => {
  const { email } = data;
  
  if (!email) {
     return { allowed: false, reason: "Email is required." };
  }

  try {
     const docRef = db.collection('deletedAccounts').doc(email.toLowerCase());
     const docSnap = await docRef.get();

     if (docSnap.exists) {
        const deletedData = docSnap.data();
        const expiresAt = deletedData.expiresAt.toDate();
        const now = new Date();

        if (now < expiresAt) {
           // Calculate days remaining
           const diffTime = Math.abs(expiresAt - now);
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           
           return { 
             allowed: false, 
             reason: `You cannot create an account with this email for another ${diffDays} day(s).` 
           };
        }
     }

     return { allowed: true };
  } catch (error) {
     console.error('Error checking signup eligibility:', error);
     throw new functions.https.HttpsError(
      'internal',
      'Error checking signup eligibility.'
     );
  }
});


// ----------------------------------------------------------------------------
// ADMIN: UNVERIFIED-EMAIL VERIFICATION REMINDER CAMPAIGN
// ----------------------------------------------------------------------------
// Guarded by default: dryRun is true unless the caller explicitly supplies
// confirm = SEND_UNVERIFIED_VERIFICATION_REMINDERS and a campaignId.
// Process at most one page/batch per call and rerun with nextPageToken.
const VERIFICATION_REMINDER_CONFIRMATION = 'SEND_UNVERIFIED_VERIFICATION_REMINDERS';
const VERIFICATION_REMINDER_FROM = process.env.CAMPAIGN_FROM_EMAIL || 'info@christianmatchghana.com';
const VERIFICATION_REMINDER_REPLY_TO = process.env.CAMPAIGN_REPLY_TO || VERIFICATION_REMINDER_FROM;
const VERIFICATION_REMINDER_SUBJECT = process.env.CAMPAIGN_SUBJECT || 'Verify your email & enjoy 1 month FREE membership';
const VERIFICATION_REMINDER_APP_URL = process.env.APP_BASE_URL || 'https://christianmatchghana.com';
const VERIFICATION_REMINDER_LOGO_URL = process.env.CAMPAIGN_LOGO_URL || 'https://christianmatchghana.com/og-logo.png';
const VERIFICATION_REMINDER_LOGO_PATH = path.join(__dirname, '..', 'assets', 'email-logo.png');
const VERIFICATION_REMINDER_LOGO_CID = 'cmglogo';
// Fixed promotional end date: 30 days from campaign launch (2026-10-14).
// Everyone granted the promo shares this end date; late verifiers/registrants get the remainder.
const VERIFICATION_PROMO_END_ISO = process.env.CAMPAIGN_PROMO_END_ISO || '2026-11-13T23:59:59.999Z';
// Promo launch: users whose profile was created on/after this are "new members".
const VERIFICATION_PROMO_LAUNCH_ISO = process.env.CAMPAIGN_PROMO_LAUNCH_ISO || '2026-10-14T00:00:00.000Z';
const VERIFICATION_PROMO_CAMPAIGN_ID = process.env.CAMPAIGN_PROMO_CAMPAIGN_ID || 'verification-reminders-2026-10-14';

function escapeEmailHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function requireCampaignAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.');
  }

  const email = context.auth.token.email;
  const authorizedAdmins = [
    'christianmatchghanaltd@gmail.com',
    'admin@example.com'
  ];
  const hasAdminClaim = context.auth.token.admin === true;

  if (!hasAdminClaim && !authorizedAdmins.includes(email)) {
    throw new functions.https.HttpsError('permission-denied', 'Only administrators can run this campaign.');
  }
}

function createVerificationReminderTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number.parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Campaign SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.'
    );
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass }
  });
}

exports.sendUnverifiedVerificationReminders = functions
  .runWith({ secrets: ['SMTP_PASS'], invoker: 'public', timeoutSeconds: 540, memory: '512MB' })
  .https.onCall(async (data = {}, context) => {
  // Self-serve action (authenticated user, NOT admin): a user claims the free promo.
  // The server independently verifies email-verification and cohort/new-member eligibility,
  // so the client cannot grant premium or set its own expiry.
  if (data.action === 'claimFreePromo') {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.');
    }
    const uid = context.auth.uid;
    const now = new Date();
    const promoEnd = new Date(VERIFICATION_PROMO_END_ISO);
    const launch = new Date(VERIFICATION_PROMO_LAUNCH_ISO);

    if (now > promoEnd) {
      return { action: 'claimFreePromo', granted: false, reason: 'promo_ended' };
    }

    const userRecord = await auth.getUser(uid);
    if (!userRecord.emailVerified) {
      return { action: 'claimFreePromo', granted: false, reason: 'not_verified' };
    }

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return { action: 'claimFreePromo', granted: false, reason: 'no_profile' };
    }
    const udata = userSnap.data();
    if (udata.freeMonthGrantedAt) {
      return { action: 'claimFreePromo', granted: false, reason: 'already_granted' };
    }

    // Eligibility: in the emailed cohort OR a genuinely new registrant. No other group.
    const cohortRef = db
      .collection('verificationReminderCampaigns')
      .doc(VERIFICATION_PROMO_CAMPAIGN_ID)
      .collection('recipients')
      .doc(uid);
    const inCohort = (await cohortRef.get()).exists;

    let isNewMember = false;
    const createdAt = udata.createdAt;
    if (createdAt && typeof createdAt.toDate === 'function') {
      isNewMember = createdAt.toDate() >= launch;
    }

    if (!inCohort && !isNewMember) {
      return { action: 'claimFreePromo', granted: false, reason: 'not_eligible' };
    }

    await userRef.update({
      isPremium: true,
      subscriptionStartDate: now.toISOString(),
      subscriptionEndDate: promoEnd.toISOString(),
      subscriptionStatus: 'active',
      subscriptionType: 'free1month',
      freeMonthGrantedAt: now.toISOString(),
      freeMonthSource: inCohort ? VERIFICATION_PROMO_CAMPAIGN_ID : 'new-member-promo',
      updatedAt: FieldValue.serverTimestamp()
    });
    return {
      action: 'claimFreePromo',
      granted: true,
      eligibility: inCohort ? 'cohort' : 'new_member',
      promoEndsOn: promoEnd.toISOString()
    };
  }

  requireCampaignAdmin(context);

  // Guarded helper: grant the fixed-date free promo to verified cohort members.
  // End date is FIXED (same for everyone); late verifiers get the remaining time.
  // Access auto-expires via subscriptionEndDate (isSubscriptionActive) — no rerun needed for expiry.
  if (data.action === 'processFreeMonthPromo') {
    const promoCampaignId = typeof data.campaignId === 'string' ? data.campaignId.trim() : '';
    if (!promoCampaignId) {
      throw new functions.https.HttpsError('invalid-argument', 'processFreeMonthPromo requires a campaignId.');
    }
    const now = new Date();
    const promoEnd = new Date(VERIFICATION_PROMO_END_ISO);

    let granted = 0;
    let alreadyGranted = 0;
    let skippedUnverified = 0;
    let skippedDisabled = 0;
    const errors = [];

    const recipientsSnap = await db
      .collection('verificationReminderCampaigns')
      .doc(promoCampaignId)
      .collection('recipients')
      .get();

    for (const recipientDoc of recipientsSnap.docs) {
      const uid = recipientDoc.id;
      try {
        const userRecord = await auth.getUser(uid);
        if (userRecord.disabled) {
          skippedDisabled += 1;
          continue;
        }
        if (!userRecord.emailVerified) {
          skippedUnverified += 1;
          continue;
        }
        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
          errors.push({ uid, reason: 'no_profile' });
          continue;
        }
        if (userSnap.data().freeMonthGrantedAt) {
          alreadyGranted += 1;
          continue;
        }
        await userRef.update({
          isPremium: true,
          subscriptionStartDate: now.toISOString(),
          subscriptionEndDate: promoEnd.toISOString(),
          subscriptionStatus: 'active',
          subscriptionType: 'free1month',
          freeMonthGrantedAt: now.toISOString(),
          freeMonthSource: promoCampaignId,
          updatedAt: FieldValue.serverTimestamp()
        });
        granted += 1;
      } catch (error) {
        errors.push({ uid, reason: error.code || 'grant_failed' });
      }
    }

    return {
      action: 'processFreeMonthPromo',
      campaignId: promoCampaignId,
      granted,
      alreadyGranted,
      skippedUnverified,
      skippedDisabled,
      cohortSize: recipientsSnap.size,
      promoEndsOn: promoEnd.toISOString(),
      errors
    };
  }

  // Guarded helper: report how many recipients have been emailed for a campaign.
  if (data.action === 'campaignStatus') {
    const statusCampaignId = typeof data.campaignId === 'string' ? data.campaignId.trim() : '';
    if (!statusCampaignId) {
      throw new functions.https.HttpsError('invalid-argument', 'campaignStatus requires a campaignId.');
    }
    const recipientsSnap = await db
      .collection('verificationReminderCampaigns')
      .doc(statusCampaignId)
      .collection('recipients')
      .get();
    return { action: 'campaignStatus', campaignId: statusCampaignId, recordedRecipients: recipientsSnap.size };
  }

  // Guarded helper: correct a user's email (e.g. fix a typo domain) before the campaign.
  if (data.action === 'correctEmail') {
    const fromEmail = typeof data.fromEmail === 'string' ? data.fromEmail.trim().toLowerCase() : '';
    const toEmail = typeof data.toEmail === 'string' ? data.toEmail.trim().toLowerCase() : '';
    if (!fromEmail || !toEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'correctEmail requires fromEmail and toEmail.');
    }
    const targetUser = await auth.getUserByEmail(fromEmail);
    await auth.updateUser(targetUser.uid, { email: toEmail, emailVerified: false });
    return {
      action: 'correctEmail',
      uid: targetUser.uid,
      fromEmail,
      toEmail,
      emailVerified: false
    };
  }

  // Guarded helper: reset a single test recipient so the campaign can be re-tested.
  if (data.action === 'resetTestUser') {
    const target = typeof data.testEmail === 'string' ? data.testEmail.trim().toLowerCase() : '';
    if (!target) {
      throw new functions.https.HttpsError('invalid-argument', 'resetTestUser requires a testEmail.');
    }
    const resetUser = await auth.getUserByEmail(target);
    await auth.updateUser(resetUser.uid, { emailVerified: false });
    let recipientDocsRemoved = 0;
    const campaignDocs = await db.collection('verificationReminderCampaigns').listDocuments();
    for (const campaignDoc of campaignDocs) {
      const ref = campaignDoc.collection('recipients').doc(resetUser.uid);
      const snap = await ref.get();
      if (snap.exists) {
        await ref.delete();
        recipientDocsRemoved += 1;
      }
    }
    return {
      action: 'resetTestUser',
      email: target,
      uid: resetUser.uid,
      emailVerified: false,
      recipientDocsRemoved
    };
  }

  const dryRun = data.dryRun !== false;
  const confirmation = data.confirm;
  const campaignId = typeof data.campaignId === 'string' ? data.campaignId.trim() : '';
  const testEmail = typeof data.testEmail === 'string' ? data.testEmail.trim().toLowerCase() : '';
  const pageToken = typeof data.pageToken === 'string' ? data.pageToken : undefined;
  const requestedLimit = Number.parseInt(data.limit, 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 25;

  if (!dryRun && (confirmation !== VERIFICATION_REMINDER_CONFIRMATION || !campaignId)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Real sends require confirm=${VERIFICATION_REMINDER_CONFIRMATION} and a campaignId.`
    );
  }

  const usersPage = await auth.listUsers(1000, pageToken);
  const candidates = usersPage.users.filter((user) => {
    if (!user.email || user.disabled || user.emailVerified) return false;
    return !testEmail || user.email.toLowerCase() === testEmail;
  });

  if (dryRun) {
    return {
      dryRun: true,
      candidates: candidates.slice(0, limit).map((user) => ({ uid: user.uid, email: user.email })),
      candidateCountInPage: candidates.length,
      nextPageToken: usersPage.pageToken || null,
      message: 'No email was sent. Supply dryRun=false, the confirmation string, and a campaignId to send.'
    };
  }

  const transporter = createVerificationReminderTransporter();
  await transporter.verify();

  let sent = 0;
  let alreadySent = 0;
  let failed = 0;
  const errors = [];

  // Only process users that have not already been emailed in this campaign,
  // so batched calls advance through the list instead of re-checking the same head.
  const recipients = [];
  for (const user of candidates) {
    const ref = db
      .collection('verificationReminderCampaigns')
      .doc(campaignId)
      .collection('recipients')
      .doc(user.uid);
    const snap = await ref.get();
    if (snap.exists) {
      alreadySent += 1;
      continue;
    }
    recipients.push(user);
    if (recipients.length >= limit) break;
  }

  for (const user of recipients) {
    const recipientRef = db
      .collection('verificationReminderCampaigns')
      .doc(campaignId)
      .collection('recipients')
      .doc(user.uid);
    const previousSend = await recipientRef.get();

    if (previousSend.exists) {
      alreadySent += 1;
      continue;
    }

    try {
      const verificationLink = await auth.generateEmailVerificationLink(
        user.email,
        { url: VERIFICATION_REMINDER_APP_URL, handleCodeInApp: false }
      );
      const rawName = (user.displayName || '').trim();
      const firstNameRaw = rawName ? rawName.split(/\s+/)[0] : 'Friend';
      const firstName = escapeEmailHtml(firstNameRaw);
      const logoUrl = `cid:${VERIFICATION_REMINDER_LOGO_CID}`;

      await transporter.sendMail({
        from: `Christian Match Ghana <${VERIFICATION_REMINDER_FROM}>`,
        replyTo: VERIFICATION_REMINDER_REPLY_TO,
        to: user.email,
        subject: VERIFICATION_REMINDER_SUBJECT,
        attachments: [
          {
            filename: 'christian-match-ghana-logo.png',
            path: VERIFICATION_REMINDER_LOGO_PATH,
            cid: VERIFICATION_REMINDER_LOGO_CID
          }
        ],
        text: `Hello ${firstNameRaw},\n\n`
          + `We noticed your Christian Match Ghana email address hasn't been verified yet.\n\n`
          + `Verify your email today to unlock full access to your account — and as our gift to you, `
          + `enjoy 1 MONTH of FREE premium membership.\n\n`
          + `Verify your email now:\n${verificationLink}\n\n`
          + `Don't miss out — take advantage of this limited offer and start connecting today.\n\n`
          + `If you did not create this account, you can safely ignore this email.\n\n`
          + `With love,\nThe Christian Match Ghana Team`,
        html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>`
          + `<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">`
          + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;"><tr><td align="center">`
          + `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(15,23,42,0.08);">`
          + `<tr><td align="center" style="background-color:#0f172a;padding:28px 24px;">`
          + `<img src="${logoUrl}" alt="Christian Match Ghana" width="96" height="96" style="display:block;border:0;border-radius:12px;" />`
          + `<div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:12px;">Christian Match Ghana</div></td></tr>`
          + `<tr><td style="padding:32px 32px 8px 32px;">`
          + `<p style="font-size:18px;margin:0 0 16px 0;">Hello ${firstName},</p>`
          + `<p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">We noticed your Christian Match Ghana email address hasn't been verified yet.</p>`
          + `<p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;">Verify your email today to unlock full access to your account — and as our gift to you, <strong>enjoy 1 month of FREE premium membership.</strong></p>`
          + `<div style="background-color:#ecfdf5;border:1px solid #10b981;border-radius:10px;padding:16px;text-align:center;margin:20px 0;">`
          + `<div style="font-size:16px;font-weight:bold;color:#047857;">🎁 1 Month FREE Premium Membership</div>`
          + `<div style="font-size:13px;color:#065f46;margin-top:4px;">Verify your email to claim this limited offer</div></div></td></tr>`
          + `<tr><td align="center" style="padding:8px 32px 28px 32px;">`
          + `<a href="${verificationLink}" style="display:inline-block;background-color:#f97316;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:14px 28px;border-radius:8px;">Verify my email &amp; claim free month</a>`
          + `<p style="font-size:12px;color:#64748b;line-height:1.6;margin:20px 0 0 0;">If the button does not work, copy and paste this link into your browser:<br>`
          + `<a href="${verificationLink}" style="color:#2563eb;word-break:break-all;">${verificationLink}</a></p></td></tr>`
          + `<tr><td style="padding:0 32px 28px 32px;">`
          + `<p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 8px 0;">If you did not create this account, you can safely ignore this email.</p>`
          + `<p style="font-size:14px;margin:12px 0 0 0;">With love,<br><strong>The Christian Match Ghana Team</strong></p></td></tr>`
          + `<tr><td align="center" style="background-color:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;">`
          + `<a href="${VERIFICATION_REMINDER_APP_URL}" style="color:#64748b;font-size:12px;text-decoration:none;">christianmatchghana.com</a></td></tr>`
          + `</table></td></tr></table></body></html>`
      });

      await recipientRef.set({
        uid: user.uid,
        email: user.email,
        sentAt: FieldValue.serverTimestamp(),
        from: VERIFICATION_REMINDER_FROM
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      errors.push({ uid: user.uid, email: user.email, reason: error.code || 'send_failed' });
    }
  }

  return {
    dryRun: false,
    campaignId,
    processed: recipients.length,
    sent,
    alreadySent,
    failed,
    errors,
    nextPageToken: usersPage.pageToken || null
  };
});

// ----------------------------------------------------------------------------
// ADMIN MESSAGE DISTRIBUTION GROUPS
// ----------------------------------------------------------------------------

const DISTRIBUTION_GROUPS_COLLECTION = 'adminDistributionGroups';
const DEFAULT_DISTRIBUTION_GROUPS = [
  {
    id: 'all-cmg-users',
    name: 'ALL-CMG-USERS',
    description: 'All active Christian Match Ghana users.',
    criteria: { mode: 'criteria', userIds: [], gender: [], country: [], locations: [], accountState: 'active' },
  },
  {
    id: 'all-cmg-females',
    name: 'ALL-CMG-FEMALES',
    description: 'All active female Christian Match Ghana users.',
    criteria: { mode: 'criteria', userIds: [], gender: ['female'], country: [], locations: [], accountState: 'active' },
  },
  {
    id: 'all-cmg-males',
    name: 'ALL-CMG-MALES',
    description: 'All active male Christian Match Ghana users.',
    criteria: { mode: 'criteria', userIds: [], gender: ['male'], country: [], locations: [], accountState: 'active' },
  },
];

async function ensureDefaultDistributionGroups() {
  const refs = DEFAULT_DISTRIBUTION_GROUPS.map((group) => db.collection(DISTRIBUTION_GROUPS_COLLECTION).doc(group.id));
  const snapshots = await Promise.all(refs.map((ref) => ref.get()));
  const batch = db.batch();
  let changed = false;
  snapshots.forEach((snapshot, index) => {
    if (snapshot.exists) return;
    const group = DEFAULT_DISTRIBUTION_GROUPS[index];
    const now = FieldValue.serverTimestamp();
    batch.set(refs[index], {
      ...group,
      system: true,
      schemaVersion: 1,
      createdBy: 'system',
      createdAt: now,
      updatedBy: 'system',
      updatedAt: now,
    });
    changed = true;
  });
  if (changed) await batch.commit();
}

async function syncDefaultMembershipForUser(userId, userData = {}) {
  const batch = db.batch();
  const now = Timestamp.now();
  for (const group of DEFAULT_DISTRIBUTION_GROUPS) {
    const memberRef = db.collection(DISTRIBUTION_GROUPS_COLLECTION).doc(group.id).collection('members').doc(userId);
    if (matchesDistributionCriteria(userData, group.criteria, userId)) {
      batch.set(memberRef, {
        userId,
        groupId: group.id,
        source: 'default-criteria',
        updatedAt: now,
      }, { merge: true });
    } else {
      batch.delete(memberRef);
    }
  }
  await batch.commit();
}

async function syncAllExistingUsersToDefaultGroups() {
  const usersSnapshot = await db.collection('users').get();
  const users = usersSnapshot.docs;
  for (let index = 0; index < users.length; index += 100) {
    await Promise.all(users.slice(index, index + 100).map((userDoc) => syncDefaultMembershipForUser(userDoc.id, userDoc.data() || {})));
  }
  return users.length;
}

// Membership documents are a server-maintained index. Keep them synchronized
// for every profile creation/update, regardless of whether the profile was
// created by signup, an admin, or a retry after authentication.
const AUDIENCE_MEMBERSHIP_FIELDS = [
  'gender',
  'country',
  'location',
  'city',
  'isBlocked',
  'status',
];

function audienceMembershipFieldsChanged(beforeData = {}, afterData = {}) {
  return AUDIENCE_MEMBERSHIP_FIELDS.some((field) => !Object.is(beforeData[field], afterData[field]));
}

async function syncCurrentDefaultMembershipForUser(userId) {
  const userRef = db.collection('users').doc(userId);
  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.exists ? userSnapshot.data() || {} : null;
    const now = Timestamp.now();

    for (const group of DEFAULT_DISTRIBUTION_GROUPS) {
      const memberRef = db
        .collection(DISTRIBUTION_GROUPS_COLLECTION)
        .doc(group.id)
        .collection('members')
        .doc(userId);

      if (userData && matchesDistributionCriteria(userData, group.criteria, userId)) {
        transaction.set(memberRef, {
          userId,
          groupId: group.id,
          source: 'default-criteria',
          updatedAt: now,
        }, { merge: true });
      } else {
        transaction.delete(memberRef);
      }
    }
  });
}

async function deleteDefaultMembershipsForUser(userId) {
  const batch = db.batch();
  for (const group of DEFAULT_DISTRIBUTION_GROUPS) {
    batch.delete(
      db.collection(DISTRIBUTION_GROUPS_COLLECTION)
        .doc(group.id)
        .collection('members')
        .doc(userId)
    );
  }
  await batch.commit();
}

exports.syncUserDistributionMemberships = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const currentUserSnapshot = await db.collection('users').doc(userId).get();

    // Always use the current profile, not the event payload. Firestore may
    // deliver create/update/delete events close together; this prevents an
    // older event from recreating memberships after the profile was deleted.
    if (!currentUserSnapshot.exists) {
      await deleteDefaultMembershipsForUser(userId);
      return null;
    }

    if (change.before.exists && !audienceMembershipFieldsChanged(change.before.data() || {}, change.after.data() || {})) {
      return null;
    }

    await ensureDefaultDistributionGroups();
    await syncCurrentDefaultMembershipForUser(userId);
    return null;
  });

// Keep deletion cleanup as a dedicated trigger as well. This is intentionally
// separate from onWrite so a delete is always handled even if a burst of
// profile events is delivered in a different order.
exports.cleanupDeletedUserDistributionMemberships = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snapshot, context) => {
    await deleteDefaultMembershipsForUser(context.params.userId);
    return null;
  });


function normalizeCriteriaList(value, max = 20) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean))].slice(0, max);
}

function normalizeDistributionCriteria(input = {}) {
  const mode = input.mode === 'selected' ? 'selected' : 'criteria';
  const gender = normalizeCriteriaList(input.gender).filter((value) => ['male', 'female'].includes(value));
  const country = normalizeCriteriaList(input.country);
  const locations = normalizeCriteriaList(input.locations);
  const userIds = normalizeCriteriaList(input.userIds, 5000);
  const accountState = ['active', 'blocked', 'any'].includes(String(input.accountState || '').toLowerCase())
    ? String(input.accountState).toLowerCase()
    : 'active';
  return { mode, userIds, gender, country, locations, accountState };
}

function effectiveUserState(userData = {}) {
  return userData.isBlocked === true || String(userData.status || '').trim().toLowerCase() === 'blocked'
    ? 'blocked'
    : 'active';
}

function normalizedCity(location) {
  return String(location || '').split(',')[0].trim().toLowerCase();
}

function matchesDistributionCriteria(userData, criteria, userId = '') {
  if (criteria.mode === 'selected') return criteria.userIds.includes(userId);
  const normalizedGender = String(userData.gender || '').trim().toLowerCase();
  const normalizedCountry = String(userData.country || '').trim().toLowerCase();
  const city = normalizedCity(userData.location || userData.city);
  const state = effectiveUserState(userData);
  return (
    (criteria.gender.length === 0 || criteria.gender.includes(normalizedGender)) &&
    (criteria.country.length === 0 || criteria.country.includes(normalizedCountry)) &&
    (criteria.locations.length === 0 || criteria.locations.includes(city)) &&
    (criteria.accountState === 'any' || criteria.accountState === state)
  );
}

async function evaluateDistributionGroup(criteria, previewLimit = 100) {
  const usersSnapshot = await db.collection('users').get();
  const matches = [];
  usersSnapshot.forEach((userDoc) => {
    const userData = userDoc.data() || {};
    if (!matchesDistributionCriteria(userData, criteria, userDoc.id)) return;
    if (matches.length < previewLimit) {
      matches.push({
        id: userDoc.id,
        name: userData.name || 'Unnamed user',
        gender: userData.gender || '',
        country: userData.country || '',
        location: userData.location || userData.city || '',
        accountState: effectiveUserState(userData),
      });
    }
  });
  return { count: usersSnapshot.docs.filter((userDoc) => matchesDistributionCriteria(userDoc.data() || {}, criteria, userDoc.id)).length, preview: matches };
}

exports.adminListDistributionGroups = functions.https.onCall(async (data, context) => {
  await requireAnyAdminPermission(context, ['messages.groups.manage', 'messages.send']);
  await ensureDefaultDistributionGroups();
  await syncAllExistingUsersToDefaultGroups();
  const snapshot = await db.collection(DISTRIBUTION_GROUPS_COLLECTION).orderBy('name').get();
  const groups = await Promise.all(snapshot.docs.map(async (groupDoc) => {
    const group = groupDoc.data() || {};
    const criteria = normalizeDistributionCriteria(group.criteria);
    const evaluated = await evaluateDistributionGroup(criteria, 0);
    return { id: groupDoc.id, ...group, criteria, memberCount: evaluated.count };
  }));
  return groups;
});

exports.adminCreateDistributionGroup = functions.https.onCall(async (data, context) => {
  await requireAdminPermission(context, 'messages.groups.manage');
  const name = String(data?.name || '').trim();
  const description = String(data?.description || '').trim();
  if (name.length < 2 || name.length > 80) {
    throw new functions.https.HttpsError('invalid-argument', 'Group name must be between 2 and 80 characters.');
  }
  const criteria = normalizeDistributionCriteria(data?.criteria);
  if (criteria.mode === 'selected' && criteria.userIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Select at least one user for a custom distribution group.');
  }
  const now = FieldValue.serverTimestamp();
  const groupRef = db.collection(DISTRIBUTION_GROUPS_COLLECTION).doc();
  await groupRef.set({
    name,
    description: description.slice(0, 240),
    schemaVersion: 1,
    criteria,
    createdBy: context.auth.uid,
    createdAt: now,
    updatedBy: context.auth.uid,
    updatedAt: now,
  });
  await recordAdminAudit(context, 'admin.distribution_group.created', groupRef.id, { name, criteria });
  return { id: groupRef.id, name, description, schemaVersion: 1, criteria };
});

exports.adminUpdateDistributionGroup = functions.https.onCall(async (data, context) => {
  await requireAdminPermission(context, 'messages.groups.manage');
  const groupId = String(data?.groupId || '').trim();
  const name = String(data?.name || '').trim();
  if (!groupId || name.length < 2 || name.length > 80) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid group ID and name are required.');
  }
  const groupRef = db.collection(DISTRIBUTION_GROUPS_COLLECTION).doc(groupId);
  const existing = await groupRef.get();
  if (!existing.exists) throw new functions.https.HttpsError('not-found', 'Distribution group not found.');
  if (existing.data()?.system === true) throw new functions.https.HttpsError('failed-precondition', 'Default distribution groups are protected.');
  const criteria = normalizeDistributionCriteria(data?.criteria);
  if (criteria.mode === 'selected' && criteria.userIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Select at least one user for a custom distribution group.');
  }
  const updates = {
    name,
    description: String(data?.description || '').trim().slice(0, 240),
    criteria,
    updatedBy: context.auth.uid,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await groupRef.update(updates);
  await recordAdminAudit(context, 'admin.distribution_group.updated', groupId, { name, criteria });
  return { id: groupId, ...updates, criteria };
});

exports.adminDeleteDistributionGroup = functions.https.onCall(async (data, context) => {
  await requireAdminPermission(context, 'messages.groups.manage');
  const groupId = String(data?.groupId || '').trim();
  if (!groupId) throw new functions.https.HttpsError('invalid-argument', 'A distribution group ID is required.');
  const groupRef = db.collection(DISTRIBUTION_GROUPS_COLLECTION).doc(groupId);
  const existing = await groupRef.get();
  if (!existing.exists) throw new functions.https.HttpsError('not-found', 'Distribution group not found.');
  if (existing.data()?.system === true) throw new functions.https.HttpsError('failed-precondition', 'Default distribution groups are protected.');
  await groupRef.delete();
  await recordAdminAudit(context, 'admin.distribution_group.deleted', groupId, { name: existing.data()?.name || '' });
  return { id: groupId, deleted: true };
});

exports.adminPreviewDistributionGroup = functions.https.onCall(async (data, context) => {
  await requireAdminPermission(context, 'messages.groups.manage');
  let criteria = data?.criteria;
  if (data?.groupId) {
    const groupSnapshot = await db.collection(DISTRIBUTION_GROUPS_COLLECTION).doc(String(data.groupId)).get();
    if (!groupSnapshot.exists) throw new functions.https.HttpsError('not-found', 'Distribution group not found.');
    criteria = groupSnapshot.data()?.criteria;
  }
  const evaluated = await evaluateDistributionGroup(normalizeDistributionCriteria(criteria), 100);
  return evaluated;
});

exports.adminSendMessage = functions.https.onCall(async (data, context) => {
  await requireAnyAdminPermission(context, ['messages.send', 'messages.moderate']);
  const text = String(data?.text || '').trim();
  const recipientMode = ['all', 'selected', 'audience'].includes(data?.recipientMode)
    ? data.recipientMode
    : '';
  if (!text || text.length > 2000) {
    throw new functions.https.HttpsError('invalid-argument', 'Message text is required and must be 2,000 characters or fewer.');
  }
  if (!recipientMode) {
    throw new functions.https.HttpsError('invalid-argument', 'Choose a valid message audience.');
  }

  await ensureDefaultDistributionGroups();
  const usersSnapshot = await db.collection('users').get();
  const userRecords = usersSnapshot.docs.map((userDoc) => ({
    id: userDoc.id,
    data: userDoc.data() || {},
  }));
  const activeUsers = userRecords.filter(({ id, data: userData }) =>
    id !== context.auth.uid && effectiveUserState(userData) === 'active',
  );

  let recipients = activeUsers;
  let audienceId = null;
  let audienceIds = [];
  if (recipientMode === 'selected') {
    const userIds = Array.isArray(data?.userIds)
      ? [...new Set(data.userIds.map((value) => String(value).trim()).filter(Boolean))].slice(0, 5000)
      : [];
    if (userIds.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Select at least one active user.');
    }
    const selectedIds = new Set(userIds);
    recipients = activeUsers.filter(({ id }) => selectedIds.has(id));
  } else if (recipientMode === 'audience') {
    if (data?.audienceIds !== undefined && !Array.isArray(data.audienceIds)) {
      throw new functions.https.HttpsError('invalid-argument', 'Saved audience IDs must be provided as a list.');
    }
    if (data?.audienceIds !== undefined && data?.audienceId !== undefined) {
      throw new functions.https.HttpsError('invalid-argument', 'Provide audienceIds or audienceId, not both.');
    }
    audienceIds = data?.audienceIds !== undefined
      ? [...new Set(data.audienceIds.map((value) => String(value).trim()).filter(Boolean))]
      : data?.audienceId
        ? [String(data.audienceId).trim()]
        : [];
    if (audienceIds.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Choose at least one saved audience.');
    }
    if (audienceIds.length > 50) {
      throw new functions.https.HttpsError('resource-exhausted', 'Select no more than 50 saved audiences at once.');
    }
    const audienceSnapshots = await Promise.all(audienceIds.map((id) => db.collection(DISTRIBUTION_GROUPS_COLLECTION).doc(id).get()));
    const missingAudienceIndex = audienceSnapshots.findIndex((snapshot) => !snapshot.exists);
    if (missingAudienceIndex >= 0) {
      throw new functions.https.HttpsError('not-found', `The selected audience ${audienceIds[missingAudienceIndex]} no longer exists.`);
    }
    const criteriaList = audienceSnapshots.map((snapshot) => normalizeDistributionCriteria(snapshot.data()?.criteria));
    const matchedUserIds = new Set();
    activeUsers.forEach(({ id, data: userData }) => {
      if (criteriaList.some((criteria) => matchesDistributionCriteria(userData, criteria, id))) matchedUserIds.add(id);
    });
    recipients = activeUsers.filter(({ id }) => matchedUserIds.has(id));
    audienceId = audienceIds.length === 1 ? audienceIds[0] : null;
  }

  if (recipients.length === 0) {
    throw new functions.https.HttpsError('failed-precondition', 'The selected audience has no active recipients.');
  }
  if (recipients.length > 5000) {
    throw new functions.https.HttpsError('resource-exhausted', 'This audience is too large for one send. Use a smaller saved audience.');
  }

  const adminSnapshot = await db.collection('users').doc(context.auth.uid).get();
  const adminData = adminSnapshot.exists ? adminSnapshot.data() || {} : {};
  const adminName = adminData.name || context.auth.token.name || context.auth.token.email || 'CMG Admin';
  const adminPhoto = Array.isArray(adminData.photos) ? adminData.photos[0] || '' : adminData.photo || '';
  const broadcastId = crypto.randomUUID();
  let sentCount = 0;

  // Each recipient receives a normal two-party chat message. Bounded batches
  // keep the operation under Firestore's commit write limit while allowing the
  // existing message notification trigger to handle push and offline digests.
  for (let index = 0; index < recipients.length; index += 200) {
    const batch = db.batch();
    const chunk = recipients.slice(index, index + 200);
    chunk.forEach(({ id: recipientId, data: recipientData }) => {
      const chatId = `dm_${[context.auth.uid, recipientId].sort().map((value) => encodeURIComponent(value)).join('__')}`;
      const chatRef = db.collection('chats').doc(chatId);
      const messageRef = db.collection('messages').doc();
      const recipientName = recipientData.name || recipientData.email || 'CMG member';
      const recipientPhoto = Array.isArray(recipientData.photos) ? recipientData.photos[0] || '' : recipientData.photo || '';
      const participantDetails = {
        [context.auth.uid]: { name: adminName, photo: adminPhoto },
        [recipientId]: { name: recipientName, photo: recipientPhoto },
      };
      batch.set(chatRef, {
        participants: [context.auth.uid, recipientId].sort(),
        participantDetails,
        lastMessage: text,
        lastMessageTime: FieldValue.serverTimestamp(),
        lastMessageSenderId: context.auth.uid,
        [`unreadCount.${recipientId}`]: FieldValue.increment(1),
        [`unreadCount.${context.auth.uid}`]: FieldValue.increment(0),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      batch.set(messageRef, {
        chatId,
        senderId: context.auth.uid,
        text,
        type: 'text',
        timestamp: FieldValue.serverTimestamp(),
        status: 'sent',
        reactions: {},
        adminBroadcast: true,
        broadcastId,
        recipientMode,
        audienceId,
        audienceIds: recipientMode === 'audience' ? audienceIds : [],
      });
    });
    await batch.commit();
    sentCount += chunk.length;
  }

  await recordAdminAudit(context, 'admin.message.broadcast_sent', broadcastId, {
    recipientMode,
    audienceId,
    audienceIds,
    resolvedCount: recipients.length,
    sentCount,
    textLength: text.length,
  });

  return {
    broadcastId,
    recipientMode,
    audienceId: audienceId || undefined,
    audienceIds: recipientMode === 'audience' ? audienceIds : [],
    resolvedCount: recipients.length,
    sentCount,
    skippedCount: 0,
  };
});

exports.adminGetDistributionMemberships = functions.https.onCall(async (data, context) => {
  await requireAdminPermission(context, 'messages.groups.manage');
  await ensureDefaultDistributionGroups();
  await syncAllExistingUsersToDefaultGroups();
  const userIds = Array.isArray(data?.userIds)
    ? [...new Set(data.userIds.map((value) => String(value).trim()).filter(Boolean))].slice(0, 5000)
    : [];
  const membershipMap = Object.fromEntries(userIds.map((userId) => [userId, []]));
  const groupsSnapshot = await db.collection(DISTRIBUTION_GROUPS_COLLECTION).orderBy('name').get();
  for (const groupDoc of groupsSnapshot.docs) {
    const membersSnapshot = await groupDoc.ref.collection('members').get();
    membersSnapshot.forEach((memberDoc) => {
      if (!membershipMap[memberDoc.id]) return;
      membershipMap[memberDoc.id].push({ id: groupDoc.id, name: groupDoc.data()?.name || groupDoc.id });
    });
  }
  return membershipMap;
});


// Keep the three default audiences explicitly synchronized whenever a user is
// created, updated, blocked, unblocked, or deleted. This is membership data for
// future broadcasts only; it does not send a message.
exports.syncDefaultMessageAudienceMembership = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    await ensureDefaultDistributionGroups();
    await syncDefaultMembershipForUser(
      context.params.userId,
      change.after.exists ? (change.after.data() || {}) : {},
    );
    return null;
  });
