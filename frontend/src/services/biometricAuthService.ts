import { Capacitor } from '@capacitor/core';
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  type CheckBiometryResult,
} from '@aparajita/capacitor-biometric-auth';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const STORAGE_KEY = 'cmg_biometric_login_v1';

export interface BiometricLoginCredentials {
  email: string;
  password: string;
}

export function isNativeBiometricPlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function checkNativeBiometry(): Promise<CheckBiometryResult | null> {
  if (!isNativeBiometricPlatform()) return null;
  return BiometricAuth.checkBiometry();
}

export async function getStoredBiometricCredentials(): Promise<BiometricLoginCredentials | null> {
  if (!isNativeBiometricPlatform()) return null;

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

export async function saveBiometricCredentials(
  credentials: BiometricLoginCredentials,
): Promise<void> {
  if (!isNativeBiometricPlatform()) return;
  await SecureStorage.set(STORAGE_KEY, credentials);
}

export async function clearBiometricCredentials(): Promise<void> {
  if (!isNativeBiometricPlatform()) return;
  await SecureStorage.remove(STORAGE_KEY);
}

export async function authenticateWithBiometry(): Promise<void> {
  if (!isNativeBiometricPlatform()) {
    throw new Error('Biometric authentication is available in the Android/iOS app only.');
  }

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
}
