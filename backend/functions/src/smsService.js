/**
 * Deferred SMS gateway adapter.
 *
 * No provider is selected or contacted until the SMS gateway, credentials,
 * sender ID, consent rules, and country-specific delivery settings are supplied.
 */

function isSmsGatewayConfigured() {
  return Boolean(
    process.env.SMS_GATEWAY_PROVIDER &&
    process.env.SMS_GATEWAY_API_URL &&
    process.env.SMS_GATEWAY_API_KEY &&
    process.env.SMS_GATEWAY_SENDER_ID
  );
}

async function sendSmsNotification({ to, message }) {
  if (!isSmsGatewayConfigured()) {
    console.info('SMS notification deferred: no SMS gateway has been configured.', {
      toPresent: Boolean(to),
      messageLength: typeof message === 'string' ? message.length : 0,
    });
    return { status: 'deferred', reason: 'sms-gateway-not-configured' };
  }

  // Deliberately disabled until the provider contract is supplied. This avoids
  // sending credentials or user data to an unknown endpoint.
  console.warn('SMS gateway configuration detected, but the provider adapter is not enabled yet.');
  return { status: 'deferred', reason: 'provider-adapter-pending' };
}

module.exports = {
  isSmsGatewayConfigured,
  sendSmsNotification,
};
