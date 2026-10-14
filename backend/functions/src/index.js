const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getMessaging } = require("firebase-admin/messaging");
const { getStorage } = require("firebase-admin/storage");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

admin.initializeApp();

const db = getFirestore();
const auth = getAuth();
const messaging = getMessaging();
const storage = getStorage();

// ----------------------------------------------------------------------------
// PAYSTACK WEBHOOK HANDLER
// ----------------------------------------------------------------------------
// This function verifies and processes webhooks from Paystack.
// It securely retrieves the secret key from the environment variables.
//
// URL matches: https://us-central1-<project-id>.cloudfunctions.net/paystackWebhook
// ----------------------------------------------------------------------------

exports.paystackWebhook = functions.https.onRequest(async (req, res) => {
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
  // 1. Check Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // 2. Check Admin Authorization
  const adminEmail = context.auth.token.email;
  const authorizedAdmins = [
    'christianmatchghanaltd@gmail.com',
    'admin@example.com'
  ];

  let isAdmin = authorizedAdmins.includes(adminEmail);

  if (!isAdmin) {
     // Check if user has admin claim as fallback
     try {
       const userRecord = await auth.getUser(context.auth.uid);
       if (userRecord.customClaims && userRecord.customClaims.admin) {
          isAdmin = true;
       }
     } catch(e) {
       console.error("Error checking claims", e);
     }
  }

  if (!isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can delete user accounts.'
    );
  }

  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a "userId" argument.'
    );
  }

  try {
    // 3. Delete User from Auth
    await auth.deleteUser(userId);
    console.log(`Successfully deleted user ${userId} from Auth`);
    return { success: true, message: `User ${userId} deleted from Auth.` };
  } catch (error) {
    console.error('Error deleting user:', error);
    // Don't expose internal error details to client unless necessary
    throw new functions.https.HttpsError(
      'internal',
      'Unable to delete user from Auth.'
    );
  }
});

// ----------------------------------------------------------------------------
// CHAT NOTIFICATIONS (PUSH & EMAIL)
// ----------------------------------------------------------------------------

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
      const senderName = (chatData.participantDetails && chatData.participantDetails[senderId]?.name) || 'Someone';
      const receiverName = userData.name || 'User';

      // 1. Send Push Notification if tokens exist
      const fcmToken = userData.fcmToken;
      const webFcmToken = userData.webFcmToken;

      const tokens = [];
      if (fcmToken) tokens.push(fcmToken);
      if (webFcmToken) tokens.push(webFcmToken);

      if (tokens.length > 0) {
        const payload = {
          notification: {
            title: `New message from ${senderName}`,
            body: message.text || 'You have received a new message',
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            chatId: message.chatId,
            type: 'chat_message'
          }
        };

        try {
          const response = await messaging.sendEachForMulticast({
            tokens,
            notification: payload.notification,
            data: payload.data
          });
          console.log('Push notification sent for message:', response.successCount);
        } catch (pushError) {
          console.error('Error sending push notification:', pushError);
        }
      }

      // 2. Send Email Notification if email is available
      const email = userData.email;
      if (email) {
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = parseInt(process.env.SMTP_PORT || '465');
        const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const appBaseUrl = process.env.APP_BASE_URL || 'https://christianmatchghana.com';

        if (smtpUser && smtpPass) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });

          const chatLink = `${appBaseUrl}?view=CHAT&chatId=${message.chatId}`;
          const messageText = message.text || 'You have received a new message';

          const mailOptions = {
            from: `"Christian Match Ghana" <${smtpUser}>`,
            to: email,
            subject: `New message from ${senderName} on Christian Match Ghana`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Message on Christian Match Ghana</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f5f7;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #ff7e5f, #feb47b);
      padding: 30px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .message-box {
      background-color: #f8f9fa;
      border-left: 4px solid #ff7e5f;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 8px;
      font-style: italic;
      color: #555555;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0;
    }
    .cta-button {
      background-color: #ff7e5f;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 30px;
      font-weight: bold;
      border-radius: 25px;
      display: inline-block;
      box-shadow: 0 4px 8px rgba(255, 126, 95, 0.3);
      text-align: center;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #777777;
      border-top: 1px solid #eeeeee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Christian Match Ghana</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${receiverName},</div>
      <p>You have received a new message from <strong>${senderName}</strong>:</p>
      <div class="message-box">
        "${messageText}"
      </div>
      <p>Click the button below to view the chat and reply:</p>
      <div class="cta-container">
        <a href="${chatLink}" class="cta-button">Go to Chat</a>
      </div>
      <p>If you have any questions or need assistance, please feel free to reply to this email.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Christian Match Ghana Ltd. All rights reserved.</p>
      <p>You are receiving this email because you registered on Christian Match Ghana.</p>
    </div>
  </div>
</body>
</html>
            `
          };

          await transporter.sendMail(mailOptions);
          console.log(`Email notification sent to ${email} successfully`);
        } else {
          console.warn("SMTP user/pass not configured in environment variables. Email notification skipped.");
        }
      } else {
        console.warn(`No email found for receiver ${receiverId}`);
      }

      return null;
    } catch (error) {
      console.error('Error sending message notifications:', error);
      return null;
    }
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
const VERIFICATION_REMINDER_SUBJECT = process.env.CAMPAIGN_SUBJECT || 'Please verify your Christian Match Ghana email';
const VERIFICATION_REMINDER_APP_URL = process.env.APP_BASE_URL || 'https://christianmatchghana.com';

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
  .runWith({ secrets: ['SMTP_PASS'], invoker: 'public' })
  .https.onCall(async (data = {}, context) => {
  requireCampaignAdmin(context);

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
  const recipients = candidates.slice(0, limit);

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
      const displayName = escapeEmailHtml(user.displayName || 'there');

      await transporter.sendMail({
        from: `Christian Match Ghana <${VERIFICATION_REMINDER_FROM}>`,
        replyTo: VERIFICATION_REMINDER_REPLY_TO,
        to: user.email,
        subject: VERIFICATION_REMINDER_SUBJECT,
        text: `Hello ${user.displayName || 'there'},\n\nPlease verify your Christian Match Ghana email address:\n${verificationLink}\n\nIf you did not create this account, you can ignore this email.\n\nChristian Match Ghana`,
        html: `<!doctype html><html><body><p>Hello ${displayName},</p><p>Please verify your Christian Match Ghana email address.</p><p><a href="${verificationLink}">Verify my email address</a></p><p>If you did not create this account, you can ignore this email.</p><p>Thank you,<br>Christian Match Ghana</p></body></html>`
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
