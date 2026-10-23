const nodemailer = require('nodemailer');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { sendSmsNotification } = require('./smsService');
const { sendWhatsAppNotification } = require('./whatsappService');

const BATCH_WINDOW_MS = 15 * 60 * 1000;
const PRESENCE_STALE_MS = 65 * 1000;
const LEASE_MS = 5 * 60 * 1000;
const RETRY_LIMIT = 5;
const PROCESS_LIMIT = 25;

function truncate(value, maxLength = 240) {
  const text = typeof value === 'string' && value.trim() ? value.trim() : 'You have a new message waiting in Christian Match Ghana.';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value._seconds === 'number') return value._seconds * 1000;
  return null;
}

function isRecipientOnline(presence) {
  const lastSeen = toMillis(presence?.lastSeen);
  return presence?.state === 'online' && lastSeen !== null && Date.now() - lastSeen <= PRESENCE_STALE_MS;
}

function batchWindowStart(now = Date.now()) {
  return Math.floor(now / BATCH_WINDOW_MS) * BATCH_WINDOW_MS;
}

function batchIdFor(recipientId, windowStart) {
  return `${encodeURIComponent(recipientId)}_${windowStart}`;
}

function getDueAt(data) {
  return toMillis(data?.dueAt) || 0;
}

function buildChatLink(appBaseUrl, chatId) {
  const base = String(appBaseUrl || 'https://christianmatchghana.com').replace(/\/$/, '');
  return `${base}?view=CHAT&chatId=${encodeURIComponent(chatId)}`;
}

function renderDigestEmail({ recipientName, items, totalCount, appBaseUrl }) {
  const visibleItems = items.slice(0, 8);
  const conversationCount = new Set(visibleItems.map((item) => item.chatId)).size;
  const messageLabel = totalCount === 1 ? 'new message' : 'new messages';
  const previewRows = visibleItems.map((item) => `
    <div class="message-row">
      <div class="sender">${escapeHtml(item.senderName || 'Someone')}</div>
      <div class="snippet">${escapeHtml(item.text)}</div>
      <a href="${escapeHtml(buildChatLink(appBaseUrl, item.chatId))}" class="reply-link">Open conversation</a>
    </div>
  `).join('');
  const moreText = totalCount > visibleItems.length
    ? `<p class="more">${totalCount - visibleItems.length} more ${totalCount - visibleItems.length === 1 ? 'message is' : 'messages are'} waiting in the app.</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${totalCount} ${messageLabel} waiting</title>
  <style>
    body { margin:0; padding:0; background:#fffaf1; color:#17253a; font-family:Arial,Helvetica,sans-serif; }
    .wrap { max-width:620px; margin:32px auto; background:#fff; border:1px solid #f1e7d5; border-radius:20px; overflow:hidden; box-shadow:0 10px 30px rgba(9,40,71,.08); }
    .header { padding:30px 28px; background:linear-gradient(135deg,#092847,#1b4b76); color:#fff; }
    .brand { margin:0 0 8px; color:#f0b938; font-size:12px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
    h1 { margin:0; font-size:26px; line-height:1.2; }
    .content { padding:30px 28px; line-height:1.6; }
    .intro { margin-top:0; font-size:16px; }
    .message-row { margin:18px 0; padding:16px 18px; background:#fffaf1; border-left:4px solid #ff5b16; border-radius:10px; }
    .sender { font-weight:800; color:#092847; }
    .snippet { margin:4px 0 8px; color:#4b5563; font-style:italic; }
    .reply-link { color:#d9470e; font-size:13px; font-weight:800; text-decoration:none; }
    .more { color:#6b7280; font-size:13px; }
    .cta { display:inline-block; margin:18px 0 4px; padding:13px 24px; border-radius:999px; background:#ff5b16; color:#fff!important; font-weight:800; text-decoration:none; }
    .footer { padding:20px 28px; background:#f8efdf; color:#6b7280; font-size:12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header"><p class="brand">Christian Match Ghana</p><h1>Your conversations are waiting</h1></div>
    <div class="content">
      <p class="intro">Hello ${escapeHtml(recipientName || 'there')},</p>
      <p>You have <strong>${totalCount} ${messageLabel}</strong> from ${conversationCount || 1} ${conversationCount === 1 ? 'conversation' : 'conversations'} waiting for you. Take a moment to reconnect and continue the conversation.</p>
      ${previewRows}
      ${moreText}
      <a href="${escapeHtml(String(appBaseUrl || 'https://christianmatchghana.com'))}" class="cta">Open Christian Match Ghana</a>
    </div>
    <div class="footer">You are receiving this message because email alerts for new chat messages are enabled in your Christian Match Ghana preferences. You can update your notification settings at any time.</div>
  </div>
</body>
</html>`;
}

function renderDigestText({ recipientName, items, totalCount, appBaseUrl }) {
  const lines = items.slice(0, 8).map((item) => `- ${item.senderName || 'Someone'}: ${item.text}`);
  return [
    `Hello ${recipientName || 'there'},`,
    '',
    `You have ${totalCount} new message${totalCount === 1 ? '' : 's'} waiting on Christian Match Ghana.`,
    ...lines,
    '',
    `Open your conversations: ${appBaseUrl || 'https://christianmatchghana.com'}`,
  ].join('\n');
}

function createTransporter() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number.parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) return null;
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

async function queueOfflineMessageNotification({ db, recipientId, chatId, messageId, senderId, senderName, text }) {
  let windowStart = batchWindowStart();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const batchRef = db.collection('notificationBatches').doc(batchIdFor(recipientId, windowStart));
    const itemRef = batchRef.collection('items').doc(messageId);
    const now = Timestamp.now();
    const dueAt = Timestamp.fromMillis(windowStart + BATCH_WINDOW_MS);

    try {
      await db.runTransaction(async (transaction) => {
        const batchSnapshot = await transaction.get(batchRef);
        const itemSnapshot = await transaction.get(itemRef);
        if (itemSnapshot.exists) return;

        if (!batchSnapshot.exists) {
          transaction.set(batchRef, {
            recipientId,
            status: 'pending',
            messageCount: 1,
            windowStart: Timestamp.fromMillis(windowStart),
            dueAt,
            attempts: 0,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          const batchData = batchSnapshot.data() || {};
          if (batchData.status !== 'pending') {
            throw new Error(`Notification batch ${batchRef.id} is already ${batchData.status}`);
          }
          transaction.update(batchRef, {
            messageCount: FieldValue.increment(1),
            updatedAt: now,
          });
        }

        transaction.set(itemRef, {
          messageId,
          chatId,
          senderId,
          senderName: truncate(senderName || 'Someone', 100),
          text: truncate(text),
          createdAt: now,
        });
      });
      return;
    } catch (error) {
      if (!String(error?.message || error).includes('is already')) throw error;
      // The scheduled worker closed this window while the trigger was adding a
      // message. Put the event into the next window instead of losing it.
      windowStart += BATCH_WINDOW_MS;
    }
  }

  throw new Error(`Unable to queue offline notification for message ${messageId}`);
}

async function claimBatch(db, batchRef, now) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(batchRef);
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    const due = getDueAt(data);
    const leaseExpired = data.status === 'processing' && getDueAt({ dueAt: data.leaseUntil }) <= now;
    const claimable = data.status === 'pending' && due <= now || leaseExpired;
    if (!claimable) return null;

    transaction.update(batchRef, {
      status: 'processing',
      leaseUntil: Timestamp.fromMillis(now + LEASE_MS),
      updatedAt: Timestamp.fromMillis(now),
    });
    return { id: snapshot.id, ...data };
  });
}

async function loadUnreadItems(db, batchRef) {
  const itemSnapshot = await batchRef.collection('items').get();
  if (itemSnapshot.empty) return [];
  const messageSnapshots = await db.getAll(
    ...itemSnapshot.docs.map((item) => db.collection('messages').doc(item.id)),
  );
  const messageState = new Map(messageSnapshots.map((message) => [message.id, message.exists ? message.data() : null]));
  return itemSnapshot.docs
    .map((item) => ({ ...item.data(), message: messageState.get(item.id) }))
    .filter((item) => item.message && ['sent', 'delivered'].includes(item.message.status));
}

async function processBatch(db, batchRef, claimed) {
  const batchData = claimed;
  const recipientRef = db.collection('users').doc(batchData.recipientId);
  const presenceRef = db.collection('presence').doc(batchData.recipientId);
  const [userSnapshot, presenceSnapshot] = await Promise.all([recipientRef.get(), presenceRef.get()]);
  if (!userSnapshot.exists) {
    await batchRef.update({ status: 'suppressed', reason: 'recipient-not-found', updatedAt: Timestamp.now() });
    return;
  }

  const userData = userSnapshot.data() || {};
  if (isRecipientOnline(presenceSnapshot.exists ? presenceSnapshot.data() : null)) {
    await batchRef.update({
      status: 'pending',
      dueAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
      leaseUntil: FieldValue.delete(),
      updatedAt: Timestamp.now(),
    });
    return;
  }

  const items = await loadUnreadItems(db, batchRef);
  if (items.length === 0) {
    await batchRef.update({ status: 'suppressed', reason: 'messages-already-read', updatedAt: Timestamp.now() });
    return;
  }

  const preferences = userData.notificationPreferences || {};
  const emailEnabled = preferences.email !== false && preferences.newChatMessages !== false && Boolean(userData.email);
  const smsEnabled = preferences.sms === true && preferences.newChatMessages !== false && Boolean(userData.phone);
  const whatsappEnabled = preferences.whatsapp === true && preferences.newChatMessages !== false && Boolean(userData.phone);
  const appBaseUrl = process.env.APP_BASE_URL || 'https://christianmatchghana.com';
  const updates = {
    attempts: FieldValue.increment(1),
    updatedAt: Timestamp.now(),
  };
  let retryNeeded = false;

  if (emailEnabled && batchData.emailStatus !== 'sent') {
    const transporter = createTransporter();
    if (!transporter) {
      retryNeeded = true;
      updates.emailStatus = 'pending';
      updates.lastError = 'SMTP is not configured';
    } else {
      try {
        const totalCount = items.length;
        await transporter.sendMail({
          from: `"Christian Match Ghana" <${process.env.SMTP_USER}>`,
          to: userData.email,
          subject: `You have ${totalCount} new message${totalCount === 1 ? '' : 's'} waiting`,
          text: renderDigestText({ recipientName: userData.name, items, totalCount, appBaseUrl }),
          html: renderDigestEmail({ recipientName: userData.name, items, totalCount, appBaseUrl }),
        });
        updates.emailStatus = 'sent';
      } catch (error) {
        retryNeeded = true;
        updates.emailStatus = 'pending';
        updates.lastError = `email: ${error.message || 'delivery failed'}`.slice(0, 500);
        console.error(`Offline email digest failed for batch ${batchRef.id}:`, error);
      }
    }
  } else if (!emailEnabled) {
    updates.emailStatus = 'skipped';
  }

  if (smsEnabled && batchData.smsStatus !== 'sent') {
    try {
      const smsResult = await sendSmsNotification({
        to: userData.phone,
        message: `Christian Match Ghana: you have ${items.length} new message${items.length === 1 ? '' : 's'} waiting. Open the app to reply.`,
      });
      updates.smsStatus = smsResult.status === 'deferred' ? 'deferred' : smsResult.status === 'sent' ? 'sent' : 'pending';
      if (updates.smsStatus === 'pending') retryNeeded = true;
    } catch (error) {
      retryNeeded = true;
      updates.smsStatus = 'pending';
      updates.lastError = `sms: ${error.message || 'delivery failed'}`.slice(0, 500);
      console.error(`Offline SMS digest failed for batch ${batchRef.id}:`, error);
    }
  } else if (!smsEnabled) {
    updates.smsStatus = 'skipped';
  }

  if (whatsappEnabled && batchData.whatsappStatus !== 'sent') {
    try {
      const whatsappResult = await sendWhatsAppNotification({
        to: userData.phone,
        message: `Christian Match Ghana: you have ${items.length} new message${items.length === 1 ? '' : 's'} waiting. Open the app to reply.`,
      });
      updates.whatsappStatus = whatsappResult.status === 'deferred'
        ? 'deferred'
        : whatsappResult.status === 'sent' ? 'sent' : 'pending';
      if (updates.whatsappStatus === 'pending') retryNeeded = true;
    } catch (error) {
      retryNeeded = true;
      updates.whatsappStatus = 'pending';
      updates.lastError = `whatsapp: ${error.message || 'delivery failed'}`.slice(0, 500);
      console.error(`Offline WhatsApp digest failed for batch ${batchRef.id}:`, error);
    }
  } else if (!whatsappEnabled) {
    updates.whatsappStatus = 'skipped';
  }

  const attemptCount = Number(batchData.attempts || 0) + 1;
  const exhausted = retryNeeded && attemptCount >= RETRY_LIMIT;
  if (exhausted) {
    updates.status = 'failed';
    updates.failureReason = 'delivery-retry-limit-reached';
  } else if (retryNeeded) {
    updates.status = 'pending';
    updates.dueAt = Timestamp.fromMillis(Date.now() + Math.min(60 * 60 * 1000, 5 * 60 * 1000 * 2 ** Math.max(0, attemptCount - 1)));
  } else {
    updates.status = 'sent';
    updates.sentAt = Timestamp.now();
  }
  updates.leaseUntil = FieldValue.delete();
  await batchRef.update(updates);
}

async function processOfflineMessageNotificationBatches(db) {
  const now = Date.now();
  const nowTimestamp = Timestamp.fromMillis(now);
  const [pendingSnapshot, expiredSnapshot] = await Promise.all([
    db.collection('notificationBatches').where('status', '==', 'pending').where('dueAt', '<=', nowTimestamp).limit(PROCESS_LIMIT).get(),
    db.collection('notificationBatches').where('status', '==', 'processing').where('leaseUntil', '<=', nowTimestamp).limit(PROCESS_LIMIT).get(),
  ]);
  const batchRefs = new Map();
  [...pendingSnapshot.docs, ...expiredSnapshot.docs].forEach((snapshot) => batchRefs.set(snapshot.id, snapshot.ref));

  for (const batchRef of batchRefs.values()) {
    const claimed = await claimBatch(db, batchRef, now);
    if (!claimed) continue;
    try {
      await processBatch(db, batchRef, claimed);
    } catch (error) {
      const attempts = Number(claimed.attempts || 0) + 1;
      await batchRef.update({
        status: attempts >= RETRY_LIMIT ? 'failed' : 'pending',
        dueAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
        attempts,
        lastError: String(error?.message || error).slice(0, 500),
        leaseUntil: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      }).catch((updateError) => console.error(`Unable to release batch ${batchRef.id}:`, updateError));
      console.error(`Offline notification batch ${batchRef.id} failed:`, error);
    }
  }
}

module.exports = {
  BATCH_WINDOW_MS,
  queueOfflineMessageNotification,
  processOfflineMessageNotificationBatches,
};
