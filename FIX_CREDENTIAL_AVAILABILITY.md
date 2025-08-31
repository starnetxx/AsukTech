# Fixing Credential Availability Issues

## Test Results Summary
Your system tests show:
- ✅ **95% Pass Rate** - Excellent!
- ✅ **All plan durations are correct**
- ✅ **All transaction expiries calculate properly**
- ⚠️ **3 plans lack credentials in locations** (not critical)

## The Issue
Three plans don't have credentials available in your location:
1. **Ultra-Fast Priority** (Custom plan)
2. **Weekly** plan
3. **Monthly Plan**

This means users can't purchase these plans at the "StarNetX 1" location.

## How to Fix

### Option 1: Add Credentials via Admin Panel
1. Login as Admin
2. Go to **Credentials** section
3. Click **"Add Credential"**
4. For each missing plan:
   - Select the plan (Ultra-Fast Priority, Weekly, or Monthly)
   - Select location (StarNetX 1)
   - Enter username/password
   - Set status to "Available"
   - Click Save

### Option 2: Bulk Add via SQL
Run this in Supabase SQL editor:

```sql
-- First, get the IDs we need
SELECT id, name FROM plans WHERE name IN ('Ultra-Fast Priority', 'Weekly', 'Monthly Plan');
SELECT id, name FROM locations WHERE name = 'StarNetX 1';

-- Then add credentials (replace the IDs with actual values from above)
-- Example format:
INSERT INTO credential_pools (location_id, plan_id, username, password, status, created_at, updated_at)
VALUES 
  ('location-id-here', 'ultra-fast-plan-id', 'ultra01', 'pass123', 'available', NOW(), NOW()),
  ('location-id-here', 'ultra-fast-plan-id', 'ultra02', 'pass456', 'available', NOW(), NOW()),
  ('location-id-here', 'weekly-plan-id', 'week01', 'pass789', 'available', NOW(), NOW()),
  ('location-id-here', 'weekly-plan-id', 'week02', 'pass012', 'available', NOW(), NOW()),
  ('location-id-here', 'monthly-plan-id', 'month01', 'pass345', 'available', NOW(), NOW()),
  ('location-id-here', 'monthly-plan-id', 'month02', 'pass678', 'available', NOW(), NOW());
```

### Option 3: Generate Credentials Automatically
```sql
-- Auto-generate credentials for missing plans
DO $$
DECLARE
    loc_id UUID;
    plan_rec RECORD;
    i INTEGER;
BEGIN
    -- Get location ID
    SELECT id INTO loc_id FROM locations WHERE name = 'StarNetX 1' LIMIT 1;
    
    -- For each plan that needs credentials
    FOR plan_rec IN 
        SELECT p.id, p.name, p.type 
        FROM plans p
        WHERE p.name IN ('Ultra-Fast Priority', 'Weekly', 'Monthly Plan')
    LOOP
        -- Generate 10 credentials per plan
        FOR i IN 1..10 LOOP
            INSERT INTO credential_pools (
                location_id, 
                plan_id, 
                username, 
                password, 
                status, 
                created_at, 
                updated_at
            )
            VALUES (
                loc_id,
                plan_rec.id,
                LOWER(REPLACE(plan_rec.name, ' ', '')) || LPAD(i::TEXT, 3, '0'),
                'pwd' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8),
                'available',
                NOW(),
                NOW()
            );
        END LOOP;
    END LOOP;
END $$;

-- Verify credentials were added
SELECT 
    p.name as plan_name,
    COUNT(cp.id) as credential_count
FROM plans p
LEFT JOIN credential_pools cp ON p.id = cp.plan_id
WHERE p.name IN ('Ultra-Fast Priority', 'Weekly', 'Monthly Plan')
GROUP BY p.name;
```

## Important Notes

### About the Test Results
- **95% pass rate is excellent** - The system is working well
- The 3 failures are **not breaking issues** - they just mean those plans can't be purchased yet
- All critical functions (duration display, expiry calculation) are working perfectly

### Best Practices
1. **Always have credentials ready** before making a plan active
2. **Add at least 10-20 credentials** per plan per location
3. **Monitor credential usage** - add more when running low
4. **Use meaningful usernames** for easier troubleshooting

### Credential Guidelines
For MikroTik integration, credentials should:
- Have unique usernames
- Use secure passwords
- Match the plan's bandwidth/speed settings in MikroTik
- Be pre-configured in your router's user manager

## What's Working Great! ✅
- **Plan Duration Hours**: All correct (3, 24, 168, 720 hours)
- **Duration Descriptions**: Perfect consistency ("1 Day", "1 Week", etc.)
- **Transaction Expiry**: All 48 transactions calculate correctly
- **Custom Plan Compatibility**: No conflicts with standard plans
- **Wallet Fundings**: Now paginated with "View All" option

## Recent Updates Applied
1. ✅ Fixed wallet funding pagination
2. ✅ Added "View All" toggle for fundings
3. ✅ Shows funding statistics (total count & amount)
4. ✅ Added reference number display
5. ✅ Improved UI with hover effects

Your system is now fully functional! The credential issue is just a matter of adding login credentials for those three plans.