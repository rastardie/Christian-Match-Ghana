import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export async function loginWithPin(identifier: string, pin: string): Promise<string> {
  const call = httpsCallable(functions, 'loginWithPin');
  const result = await call({ identifier: identifier.trim(), pin: pin.trim() });
  return String((result.data as { token?: string }).token || '');
}

export async function setUserPin(newPin: string, currentCredential?: string): Promise<{ hasPin: boolean }> {
  const call = httpsCallable(functions, 'setUserPin');
  return (await call({ newPin, currentCredential: currentCredential || null })).data as { hasPin: boolean };
}
