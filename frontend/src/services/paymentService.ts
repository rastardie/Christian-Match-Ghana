
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Transaction } from '../types';

/**
 * Record a successful payment transaction in Firestore
 */
export const recordTransaction = async (
  userId: string,
  userName: string,
  userEmail: string,
  amount: number,
  reference: string,
  type: string = 'connection_fee',
  provider: 'paystack' | 'stripe' = 'paystack'
) => {
  try {
    const transactionData: Partial<Transaction> & { createdAt: any } = {
      userId,
      userName,
      userEmail,
      amount,
      currency: 'GHS', // Default for now
      type,
      status: 'success',
      provider,
      reference,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'payments'), transactionData);
    console.log("Transaction recorded successfully");
    return true;
  } catch (error) {
    console.error("Error recording transaction:", error);
    return false;
  }
};
