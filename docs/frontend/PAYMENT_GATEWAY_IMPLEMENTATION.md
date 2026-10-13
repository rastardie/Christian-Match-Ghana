# Payment Gateway Implementation - Browse Connect Feature

## Overview

The Browse view now requires users to pay **50 Ghana Cedis (GHS)** before they can connect and chat with another user. This ensures serious and intentional interactions.

## Payment Flow

### 1. User Clicks "Connect" on Browse Page

- User browses profiles and finds someone they want to connect with
- They click the "Connect" or message button
- **Payment modal immediately appears**

### 2. Payment Modal Shows

- **Amount**: ₵50.00 for Ghana users, $7.00 for international users
- **Payment Options**:
  - **Ghana Users**: Paystack (Mobile Money, Cards, Bank Transfer)
  - **International Users**: Stripe (simulated for now)
- **Security**: Shows secure payment badge
- Modal explains: "One-time payment. No monthly subscription."

### 3. User Makes Payment

- For Ghana users:
  - Paystack integration opens
  - Accepts: MTN Mobile Money, Vodafone Cash, AirtelTigo Money, Cards
  - Amount: 5000 pesewas (50 GHS)
  - Real-time payment processing
- For International users:
  - Simulated payment (ready for Stripe integration)
  - Amount converted to USD ($7.00)

### 4. After Successful Payment

- ✅ Payment confirmed
- ✅ Chat automatically created in Firestore
- ✅ User redirected to chat with the connected person
- ✅ Success notification shown
- ✅ Can now message freely with that person

## Technical Implementation

### Changes Made

#### 1. `handleConnectRequest` (App.tsx)

**Before:**

```typescript
// Created chat directly without payment
const chatId = await createOrGetChat(...);
setCurrentView("CHAT");
```

**After:**

```typescript
// Opens payment modal first
setPendingConnectId(profileId);
setShowPaymentModal(true);
```

#### 2. `handlePaymentSuccess` (App.tsx)

**Before:**

```typescript
// Used MOCK_PROFILES and MOCK_CHATS
const connectedProfile = MOCK_PROFILES.find(...);
MOCK_CHATS.unshift(newChat);
```

**After:**

```typescript
// Uses real Firestore data
const partnerData = await getUserDocument(pendingConnectId);
const chatId = await createOrGetChat(...);
setActiveChatId(chatId);
setCurrentView("CHAT");
```

#### 3. PaymentModal Props

- Added `email={user?.email}` for Paystack
- Ensures payment receipt is sent to user's email

## Payment Gateway Configuration

### Paystack (Ghana Users)

- **Key**: configure only through a protected production environment; never commit it
- **Amount**: 5000 kobo (50 GHS)
- **Currency**: GHS
- **Methods**: Mobile Money, Cards, Bank Transfer
- **Receipt**: Sent to user's email

### Stripe (International Users)

- Currently simulated for testing
- Ready for production Stripe integration
- Amount: $7.00 USD

## Testing the Payment Flow

### Test with Paystack (Ghana)

1. Sign up/Login as a Ghana-based user
2. Go to Browse view
3. Click "Connect" on any profile
4. Payment modal appears showing ₵50.00
5. Click "Pay with Paystack"
6. Use Paystack test cards or Mobile Money
7. Upon success, chat opens automatically

### Test Cards (Paystack Test Mode)

- **Success**: 4084084084084081
- **Insufficient Funds**: 4084080000000408
- **Decline**: 4084081111111112

## User Experience

### Before Payment

- ❌ Cannot send messages
- ❌ Cannot chat with user
- ✅ Can view profile
- ✅ Can browse other profiles

### After Payment (for that specific user)

- ✅ Chat created in Firestore
- ✅ Can send unlimited messages
- ✅ Real-time messaging enabled
- ✅ Connection persists (no repeat payment needed)

## Important Notes

1. **One-time Payment**: Users only pay ONCE per connection
2. **No Subscription**: Not a monthly recurring charge
3. **Per-Connection**: Each new connection requires payment
4. **Secure**: All payments processed through secure gateways
5. **Receipt**: Email receipt sent automatically
6. **Real-time**: Chat appears immediately after payment

## Revenue Model

- **Price**: ₵50 per connection (Ghana) / $7 (International)
- **Gateway**: Paystack for Ghana, Stripe for International
- **Fees**: Paystack charges ~1.95% + ₵0.10 per transaction
- **Net Revenue**: ~₵49 per connection after gateway fees

## Production Checklist

Before going live:

- [x] Replace Paystack test key with live key
- [ ] Set up Stripe account and add live keys
- [ ] Configure webhook endpoints for payment verification
- [ ] Add payment logging/tracking
- [ ] Set up fraud prevention
- [ ] Test with real payment methods
- [ ] Add terms & conditions for payments
- [ ] Set up receipt/invoice generation
- [ ] Configure refund policy

## Related Files

- `App.tsx` - Payment flow logic
- `components/PaymentModal.tsx` - Payment UI
- `services/chatService.ts` - Chat creation after payment
- `services/userService.ts` - User data retrieval

## Future Enhancements

- Add payment history for users
- Implement subscription model option
- Add promotional codes/discounts
- Multi-connection packages (e.g., 5 connections for ₵200)
- Premium membership tier
