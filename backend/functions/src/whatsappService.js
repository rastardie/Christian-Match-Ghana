/**
 * Deferred WhatsApp Business adapter.
 *
 * WhatsApp is intentionally not contacted until an approved provider, sender,
 * template/consent policy, and server-side credentials are configured.
 */

function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_GATEWAY_PROVIDER &&
    process.env.WHATSAPP_GATEWAY_API_URL &&
    process.env.WHATSAPP_GATEWAY_API_KEY &&
    process.env.WHATSAPP_GATEWAY_SENDER_ID
  );
}

async function sendWhatsAppNotification({ to, message }) {
  if (!isWhatsAppConfigured()) {
    console.info('WhatsApp notification deferred: no WhatsApp gateway has been configured.', {
      toPresent: Boolean(to),
      messageLength: typeof message === 'string' ? message.length : 0,
    });
    return { status: 'deferred', reason: 'whatsapp-gateway-not-configured' };
  }

  // Deliberately disabled until the provider contract and approved WhatsApp
  // template are supplied. This prevents accidental unapproved outbound sends.
  console.warn('WhatsApp gateway configuration detected, but the provider adapter is not enabled yet.');
  return { status: 'deferred', reason: 'provider-adapter-pending' };
}

module.exports = {
  isWhatsAppConfigured,
  sendWhatsAppNotification,
};
