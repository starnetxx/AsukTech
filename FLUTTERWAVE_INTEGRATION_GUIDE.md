# Flutterwave Integration Guide for StarNetX

## Overview
Your app uses Flutterwave for payment processing and virtual account creation. Here's a comprehensive guide on how it works and how to manage it.

## 🔑 API Keys Configuration

### Where Keys Are Stored
The Flutterwave keys are stored as **Supabase Edge Function environment variables**, not in your local `.env` file.

### Current Configuration Location
- **Supabase Dashboard** → **Edge Functions** → **Settings**
- Environment variables:
  - `FLUTTERWAVE_SECRET_KEY` - Your secret API key
  - `FLUTTERWAVE_PUBLIC_KEY` - Your public key (if used in frontend)
  - `FLUTTERWAVE_WEBHOOK_SECRET` - For webhook verification

### How to Change API Keys

#### Method 1: Via Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions** → **Settings**
4. Find the Flutterwave environment variables
5. Update the values with your new keys
6. Save changes

#### Method 2: Via Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Set new secret key
supabase secrets set FLUTTERWAVE_SECRET_KEY="your-new-secret-key"

# Set new public key (if needed)
supabase secrets set FLUTTERWAVE_PUBLIC_KEY="your-new-public-key"

# List all secrets to verify
supabase secrets list
```

## 🏦 Virtual Account Bank Configuration

### Current Setup
Your app currently uses **WEMA BANK** as the default virtual account provider. This is hardcoded in several places:

1. **create-virtual-account/index.ts** (Line 95, 209):
   ```typescript
   account_bank_name: existingAccount.virtual_account_bank_name || 'WEMA BANK'
   ```

### Can You Change the Bank?

**Short Answer:** Not directly through API configuration.

**Detailed Explanation:**
- Flutterwave automatically assigns banks for virtual accounts based on availability
- The bank (usually WEMA or Sterling Bank) is determined by Flutterwave, not configurable per request
- The API response includes the actual bank assigned in `account_bank_name` field

### What Banks Are Available?
Flutterwave typically provides virtual accounts through:
- **WEMA BANK** (Most common)
- **Sterling Bank**
- **9PSB (9 Payment Service Bank)**

The availability depends on:
- Your Flutterwave account type
- Your business verification status
- Current bank partnerships

## 📝 How the Integration Works

### 1. Virtual Account Creation Flow
```
User Request → Edge Function → Flutterwave API → Virtual Account Created
                     ↓
              Store in Database
```

**Key Files:**
- `/supabase/functions/create-virtual-account/index.ts`

**Process:**
1. User requests virtual account
2. Edge function validates user authentication
3. Checks if user already has an account
4. Calls Flutterwave API endpoint: `https://api.flutterwave.com/v3/virtual-account-numbers`
5. Stores account details in user profile

### 2. Payment Processing Flow
```
User Makes Transfer → Flutterwave Receives → Webhook Triggered → Wallet Updated
```

**Key Files:**
- `/supabase/functions/flutterwave-webhook/index.ts`

**Process:**
1. User transfers money to virtual account
2. Flutterwave processes the payment
3. Webhook endpoint receives notification
4. System credits user's wallet
5. Transaction record created

## 🔧 Configuration Changes

### To Use Test/Sandbox Mode
```typescript
// In create-virtual-account/index.ts
const flutterwaveUrl = 'https://api.flutterwave.com/v3/virtual-account-numbers'
// Both production and sandbox use the same URL
// The mode is determined by your API keys (test vs live)
```

### To Change Service Charges
Currently, the system credits the **full amount** without deductions:

```typescript
// In flutterwave-webhook/index.ts (Line 145-147)
const originalAmount = parseFloat(amount);
const currentBalance = parseFloat(userProfile.wallet_balance || '0');
const newBalance = currentBalance + originalAmount; // No charges
```

To add service charges:
```typescript
const serviceChargePercent = 1.5; // 1.5% charge
const serviceCharge = originalAmount * (serviceChargePercent / 100);
const amountAfterCharges = originalAmount - serviceCharge;
const newBalance = currentBalance + amountAfterCharges;
```

## 🚀 Deployment Checklist

When changing Flutterwave configuration:

1. **Update Environment Variables**
   ```bash
   # Production keys
   supabase secrets set FLUTTERWAVE_SECRET_KEY="FLWSECK-xxxxx"
   
   # Test keys (start with FLWSECK_TEST-)
   supabase secrets set FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-xxxxx"
   ```

2. **Deploy Edge Functions**
   ```bash
   supabase functions deploy create-virtual-account
   supabase functions deploy flutterwave-webhook
   ```

3. **Update Webhook URL in Flutterwave Dashboard**
   - Login to [Flutterwave Dashboard](https://dashboard.flutterwave.com)
   - Go to Settings → Webhooks
   - Set URL to: `https://[your-project-id].supabase.co/functions/v1/flutterwave-webhook`
   - Enable events: `charge.completed`

## 🔍 Testing

### Test Virtual Account Creation
```javascript
// Test script
const response = await fetch('https://[your-project].supabase.co/functions/v1/create-virtual-account', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer [user-token]',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    account_type: 'dynamic',
    amount: 1000,
    currency: 'NGN'
  })
});
```

### Test Webhook
```bash
# Use the test-webhook.js file
node test-webhook.js
```

## ⚠️ Important Security Notes

1. **Never commit API keys to Git**
   - Keys should only be in Supabase environment variables
   - `.env` files should be in `.gitignore`

2. **Use Test Keys for Development**
   - Test keys start with `FLWSECK_TEST-`
   - Production keys start with `FLWSECK-`

3. **Webhook Verification**
   - Always verify webhook signatures
   - Check the `verif-hash` header

4. **Rate Limiting**
   - Implement rate limiting for virtual account creation
   - Prevent duplicate webhook processing

## 🆘 Troubleshooting

### Virtual Account Not Created
1. Check API key validity
2. Verify BVN for permanent accounts
3. Check Flutterwave account status
4. Review Edge Function logs in Supabase

### Webhook Not Working
1. Verify webhook URL in Flutterwave dashboard
2. Check Edge Function logs
3. Ensure `verif-hash` validation is correct
4. Test with `test-webhook.js`

### Wrong Bank Displayed
The bank is assigned by Flutterwave. To handle this:
1. Always use the `account_bank_name` from API response
2. Don't hardcode bank names
3. Display the actual bank returned by Flutterwave

## 📚 Additional Resources

- [Flutterwave API Documentation](https://developer.flutterwave.com/docs)
- [Virtual Account API](https://developer.flutterwave.com/v3.0/docs/virtual-account-numbers)
- [Webhook Documentation](https://developer.flutterwave.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## 🔄 Migration Guide (If Changing Payment Provider)

If you need to switch from Flutterwave to another provider:

1. **Update Edge Functions**
   - Create new functions for the new provider
   - Update API endpoints and authentication

2. **Database Changes**
   - Add new columns for new provider references
   - Migrate existing virtual account data

3. **Frontend Updates**
   - Update payment flow components
   - Change API calls to new endpoints

4. **Testing**
   - Run parallel systems during transition
   - Gradually migrate users
   - Ensure backward compatibility