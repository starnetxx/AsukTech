# 🚀 Deploy Supabase Edge Functions

## What We've Done

### ✅ **Modified Edge Functions**
1. **`create-virtual-account`** - Now reads Flutterwave settings from `admin_settings` table
2. **`flutterwave-webhook`** - Now reads Flutterwave settings from `admin_settings` table
3. **Created shared utility** - `_shared/flutterwave-config.ts` for consistent config loading

### ✅ **Added Admin Settings UI**
- Added Flutterwave configuration section to Admin Settings
- Fields for Secret Key, Public Key, Webhook Secret, and Environment
- Secure password fields for sensitive data

## 🔧 **Deployment Steps**

### **Method 1: Using Supabase CLI (Recommended)**

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref tpsdrqeosbegqodbgaxx
   ```

4. **Deploy the Edge Functions**:
   ```bash
   # Deploy both functions
   supabase functions deploy create-virtual-account
   supabase functions deploy flutterwave-webhook
   
   # Or deploy all functions at once
   supabase functions deploy
   ```

### **Method 2: Using Supabase Dashboard**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `tpsdrqeosbegqodbgaxx`
3. Navigate to **Edge Functions**
4. Click **"New Function"** or **"Deploy"**
5. Upload the function files manually

## ⚙️ **Configure Flutterwave Settings**

### **Step 1: Access Admin Settings**
1. Login to your app as admin
2. Go to **Admin Dashboard** → **Settings**
3. Scroll to **"Flutterwave Payment Settings"** section

### **Step 2: Enter Your Flutterwave Keys**

#### **For Testing (Sandbox):**
- **Environment**: Select "Test (Sandbox)"
- **Secret Key**: `FLWSECK_TEST-xxxxxxxxxxxxxxxx`
- **Public Key**: `FLWPUBK_TEST-xxxxxxxxxxxxxxxx`
- **Webhook Secret**: (Optional) Your webhook verification secret

#### **For Production (Live):**
- **Environment**: Select "Live (Production)"
- **Secret Key**: `FLWSECK-xxxxxxxxxxxxxxxx`
- **Public Key**: `FLWPUBK-xxxxxxxxxxxxxxxx`
- **Webhook Secret**: (Optional) Your webhook verification secret

### **Step 3: Save Settings**
Click **"Save Settings"** to store the configuration in the database.

## 🔗 **Update Webhook URL in Flutterwave**

1. Login to [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Go to **Settings** → **Webhooks**
3. Set webhook URL to:
   ```
   https://tpsdrqeosbegqodbgaxx.supabase.co/functions/v1/flutterwave-webhook
   ```
4. Enable events: `charge.completed`
5. Save the webhook configuration

## 🧪 **Testing the Setup**

### **Test Virtual Account Creation**
```javascript
// Test in browser console or create a test script
const response = await fetch('https://tpsdrqeosbegqodbgaxx.supabase.co/functions/v1/create-virtual-account', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_USER_JWT_TOKEN',
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

const result = await response.json();
console.log(result);
```

### **Test Webhook (Optional)**
Use the existing `test-webhook.js` file:
```bash
node test-webhook.js
```

## ✅ **Verification Checklist**

- [ ] Edge Functions deployed successfully
- [ ] Flutterwave settings configured in Admin Settings
- [ ] Webhook URL updated in Flutterwave Dashboard
- [ ] Test virtual account creation works
- [ ] Test webhook processing works
- [ ] Environment (test/live) matches your Flutterwave keys

## 🔄 **Migration Benefits**

### **Before (Environment Variables):**
- ❌ Keys stored in Supabase environment variables
- ❌ Required CLI access to change keys
- ❌ No UI for non-technical users
- ❌ Difficult to switch between test/live

### **After (Admin Settings):**
- ✅ Keys stored in database `admin_settings` table
- ✅ Easy UI for admins to change keys
- ✅ No CLI access required
- ✅ Easy environment switching
- ✅ Secure password fields for sensitive data

## 🚨 **Important Notes**

1. **Security**: Keys are stored in the database, ensure your admin access is secure
2. **Environment**: Make sure your keys match the selected environment (test/live)
3. **Backup**: Keep a backup of your keys in a secure location
4. **Testing**: Always test with sandbox keys first before using live keys

## 🆘 **Troubleshooting**

### **Function Deployment Issues**
```bash
# Check function logs
supabase functions logs create-virtual-account
supabase functions logs flutterwave-webhook

# Redeploy if needed
supabase functions deploy create-virtual-account --no-verify-jwt
supabase functions deploy flutterwave-webhook --no-verify-jwt
```

### **Configuration Issues**
- Verify keys are saved in Admin Settings
- Check that environment matches key type (test vs live)
- Ensure webhook URL is correct in Flutterwave Dashboard

### **Testing Issues**
- Use test keys for development
- Check browser console for errors
- Verify user authentication token is valid

---

**Ready to deploy!** 🚀 The Edge Functions now read from your admin settings instead of environment variables, making configuration much easier.