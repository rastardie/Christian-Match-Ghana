import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type SupportCategory = 'Account access' | 'Email verification' | 'Password reset' | 'Profile' | 'Messages' | 'Payments' | 'Other';
export type SupportContactPreference = 'Email' | 'Phone/WhatsApp' | 'Either';

export interface CreateSupportTicketInput {
  userId: string;
  userName: string;
  email: string;
  phone?: string;
  category: SupportCategory;
  subject: string;
  description: string;
  preferredContact: SupportContactPreference;
}

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<{ id: string; reference: string }> {
  const reference = `CMG-${Date.now().toString(36).toUpperCase()}`;
  const ticketRef = await addDoc(collection(db, 'supportTickets'), {
    ...input,
    reference,
    status: 'open',
    priority: 'normal',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ticketRef.id, reference };
}
