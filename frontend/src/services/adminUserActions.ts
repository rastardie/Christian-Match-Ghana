import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/**
 * Callable wrappers for administrator user-management actions.
 * Each callable checks its own permission on the server; the console only
 * decides what to show. Errors are thrown with the server's message.
 */

export interface AdminProfileFields {
  name?: string;
  phone?: string;
  dob?: string;
  age?: number;
  gender?: string;
  country?: string;
  location?: string;
  bio?: string;
  height?: number;
  maritalStatus?: string;
  hasChildren?: string;
  wantChildren?: string;
  bodyType?: string;
  complexion?: string;
  languages?: string;
  smoking?: boolean;
  alcohol?: string;
  drinking?: boolean;
  healthCondition?: string;
  lifestyleInfo?: string;
  denomination?: string;
  churchName?: string;
  churchAttendance?: string;
  churchInvolvement?: string;
  bibleReadingFreq?: string;
  prayerFreq?: string;
  faithMaturity?: string;
  favoriteVerse?: string;
  spiritualLesson?: string;
  faithStatement?: string;
  education?: string;
  profession?: string;
  occupation?: string;
  incomeRange?: string;
  intentions?: string;
  lookingFor?: string;
  intendToMarry?: string;
  willingToRelocate?: string;
  acceptsLongDistance?: boolean;
  preferredAgeMin?: number;
  preferredAgeMax?: number;
  preferredLocation?: string;
  preferredDenomination?: string;
  preferredEthnicGroup?: string;
  dealBreakers?: string;
}

export type SubscriptionAction = 'grant' | 'extend' | 'revoke';

export async function createUserAsAdmin(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<{ userId: string; verificationEmailSent: boolean }> {
  const call = httpsCallable(functions, 'adminCreateUser');
  return (await call(input)).data as { userId: string; verificationEmailSent: boolean };
}

export async function updateUserProfileAsAdmin(userId: string, fields: AdminProfileFields): Promise<void> {
  const call = httpsCallable(functions, 'adminUpdateUserProfile');
  await call({ userId, fields });
}

export async function setUserBlockedAsAdmin(userId: string, blocked: boolean): Promise<void> {
  const call = httpsCallable(functions, 'adminSetUserBlocked');
  await call({ userId, blocked });
}

export async function resetUserPinAsAdmin(userId: string, mode: 'clear' | 'set', newPin?: string): Promise<void> {
  const call = httpsCallable(functions, 'adminResetUserPin');
  await call({ userId, mode, newPin });
}

export async function setSubscriptionAsAdmin(
  userId: string,
  input: { action: SubscriptionAction; plan?: '6months' | '12months'; days?: number }
): Promise<{ action: SubscriptionAction; subscriptionStatus: string; expiresAt: string | null }> {
  const call = httpsCallable(functions, 'adminSetSubscription');
  return (await call({ userId, ...input })).data as { action: SubscriptionAction; subscriptionStatus: string; expiresAt: string | null };
}

export async function setMustChangePasswordAsAdmin(userId: string, value: boolean): Promise<void> {
  const call = httpsCallable(functions, 'adminSetMustChangePassword');
  await call({ userId, value });
}
