import { Capacitor } from '@capacitor/core';
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  type CheckBiometryResult,
} from '@aparajita/capacitor-biometric-auth';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const STORAGE_KEY = 'cmg_biometric_login_v1';
const WEB_CRED_KEY = 'cmg_biometric_web_v1';

export interface BiometricLoginCredentials {
  email: string;
  password: string;
}

interface WebBiometricRecord extends BiometricLoginCredentials {
  credentialId: string; // base64url of the WebAuthn credential rawId
}

/* ------------------------------------------------------------------ *
 * Platform detection
 * ------------------------------------------------------------------ */

export function isNativeBiometricPlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** True when the current web context can use the WebAuthn platform authenticator. */
function isWebAuthnPlatform(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    !!navigator.credentials &&
    (window.isSecureContext === true || location.hostname === 'localhost')
  );
}

/** Biometric is usable either in the native app or in a WebAuthn-capable browser/PWA. */
export function isBiometricCapablePlatform(): boolean {
  return isNativeBiometricPlatform() || isWebAuthnPlatform();
}

/* ------------------------------------------------------------------ *
 * Capability check (unified for native + web)
 * ------------------------------------------------------------------ */

export async function checkNativeBiometry(): Promise<CheckBiometryResult | null> {
  if (isNativeBiometricPlatform()) {
    return BiometricAuth.checkBiometry();
  }

  if (isWebAuthnPlatform()) {
    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      // Shape the result like the native plugin so the UI logic stays uniform.
      return {
        isAvailable: available,
        deviceIsSecure: available,
      } as unknown as CheckBiometryResult;
    } catch (error) {
      console.warn('WebAuthn availability check failed:', error);
      return { isAvailable: false, deviceIsSecure: false } as unknown as CheckBiometryResult;
    }
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * Encoding helpers
 * ------------------------------------------------------------------ */

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/* ------------------------------------------------------------------ *
 * Stored credential access
 * ------------------------------------------------------------------ */

export async function getStoredBiometricCredentials(): Promise<BiometricLoginCredentials | null> {
  if (isNativeBiometricPlatform()) {
    try {
      const value = await SecureStorage.get(STORAGE_KEY);
      if (!value || typeof value !== 'object') return null;
      const credentials = value as Partial<BiometricLoginCredentials>;
      if (typeof credentials.email !== 'string' || typeof credentials.password !== 'string') {
        return null;
      }
      return { email: credentials.email, password: credentials.password };
    } catch (error) {
      console.warn('Unable to read biometric credentials:', error);
      return null;
    }
  }

  if (isWebAuthnPlatform()) {
    const record = readWebRecord();
    return record ? { email: record.email, password: record.password } : null;
  }

  return null;
}

function readWebRecord(): WebBiometricRecord | null {
  try {
    const raw = localStorage.getItem(WEB_CRED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WebBiometricRecord>;
    if (
      typeof parsed.email !== 'string' ||
      typeof parsed.password !== 'string' ||
      typeof parsed.credentialId !== 'string'
    ) {
      return null;
    }
    return { email: parsed.email, password: parsed.password, credentialId: parsed.credentialId };
  } catch (error) {
    console.warn('Unable to read web biometric record:', error);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Enrolment
 * ------------------------------------------------------------------ */

export async function saveBiometricCredentials(
  credentials: BiometricLoginCredentials,
): Promise<void> {
  if (isNativeBiometricPlatform()) {
    await SecureStorage.set(STORAGE_KEY, credentials as unknown as Record<string, unknown>);
    return;
  }

  if (isWebAuthnPlatform()) {
    // Register a platform (biometric) credential, then persist the login so a
    // later biometric assertion can release it. The WebAuthn ceremony requires
    // the user's device biometric/PIN, which gates enrolment.
    const userId = randomBytes(16);
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: 'Christian Match Ghana', id: location.hostname },
        user: {
          id: userId,
          name: credentials.email,
          displayName: credentials.email,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Biometric enrolment was cancelled.');
    }

    const record: WebBiometricRecord = {
      email: credentials.email,
      password: credentials.password,
      credentialId: bufferToBase64url(credential.rawId),
    };
    localStorage.setItem(WEB_CRED_KEY, JSON.stringify(record));
    return;
  }
}

export async function clearBiometricCredentials(): Promise<void> {
  if (isNativeBiometricPlatform()) {
    await SecureStorage.remove(STORAGE_KEY);
    return;
  }
  if (isWebAuthnPlatform()) {
    localStorage.removeItem(WEB_CRED_KEY);
  }
}

/* ------------------------------------------------------------------ *
 * Authentication (biometric prompt)
 * ------------------------------------------------------------------ */

export async function authenticateWithBiometry(): Promise<void> {
  if (isNativeBiometricPlatform()) {
    try {
      await BiometricAuth.authenticate({
        reason: 'Unlock Christian Match Ghana',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use passcode',
        androidTitle: 'Sign in with biometrics',
        androidSubtitle: 'Unlock your Christian Match Ghana account',
        androidConfirmationRequired: false,
      });
    } catch (error) {
      if (error instanceof BiometryError && error.code === BiometryErrorType.userCancel) {
        throw new Error('Biometric sign-in cancelled.');
      }
      throw error;
    }
    return;
  }

  if (isWebAuthnPlatform()) {
    const record = readWebRecord();
    if (!record) {
      throw new Error('Biometric sign-in is not set up on this device.');
    }
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId: location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: base64urlToBuffer(record.credentialId),
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('Biometric authentication failed.');
    }
    return;
  }

  throw new Error('Biometric authentication is not supported on this device.');
}
