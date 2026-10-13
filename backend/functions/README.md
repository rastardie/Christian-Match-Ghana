# Firebase Cloud Functions

This directory contains the backend logic for CMG, specifically for handling secure operations like payment webhooks.

## Paystack Webhook Setup

We have implemented a secure `paystackWebhook` function that verifies payments using your Live Secret Key.

### 1. Security (Environment Variables)

The **Secret Key** (`sk_live_...`) is **NOT** hardcoded in the `index.js` file. Instead, it is stored in the `.env` file within this directory.

**File:** `functions/.env`

```env
PAYSTACK_SECRET_KEY=sk_live_...
```

Firebase Cloud Functions automatically reads from this `.env` file during deployment and execution.

### 2. Deployment

To deploy these functions to your live Firebase project, you need the Firebase CLI installed.

1.  **Install Dependencies**:

    ```bash
    cd functions
    npm install
    ```

2.  **Deploy**:
    ```bash
    firebase deploy --only functions
    ```

### 3. Webhook URL

After deployment, Firebase will provide a URL for your function. It typically looks like:
`https://us-central1-christianmatch-app.cloudfunctions.net/paystackWebhook`

You must copy this URL and paste it into your **Paystack Dashboard** under **Settings > API & Webhooks > Webhook URL**.

### 4. Verification Logic

The function in `index.js`:

- Checks for the `POST` method.
- Calculates the HMAC SHA512 signature of the request body using your Secret Key.
- Compares it with the `x-paystack-signature` header sent by Paystack.
- Only processes the event if the signatures match.
