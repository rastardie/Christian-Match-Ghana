const { FieldValue } = require('firebase-admin/firestore');

// Telephone numbers live in a private subcollection document, not on the public
// users/{uid} profile. Firestore rules let only the owner and authorized admins read it.
const CONTACT_DOC_ID = 'contact';

function contactRef(db, uid) {
  return db.collection('users').doc(uid).collection('private').doc(CONTACT_DOC_ID);
}

async function getContactPhone(db, uid) {
  if (!uid) return '';
  const snapshot = await contactRef(db, uid).get();
  return snapshot.exists ? String(snapshot.data()?.phone || '') : '';
}

async function setContactPhone(db, uid, phone) {
  await contactRef(db, uid).set(
    { phone: String(phone || '').trim(), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

async function deleteContactPhone(db, uid) {
  await contactRef(db, uid).delete().catch(() => undefined);
}

module.exports = {
  CONTACT_DOC_ID,
  getContactPhone,
  setContactPhone,
  deleteContactPhone,
};
