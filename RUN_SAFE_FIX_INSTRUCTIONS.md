# Instructions for Running the Safe Fix SQL Script

## Why the Warning Appears
Supabase shows this warning because the script contains:
- `DROP TRIGGER` statements (removes and recreates triggers)
- `UPDATE` statements (modifies data)
- `CREATE OR REPLACE` statements (replaces existing functions)

This is a safety feature to prevent accidental data loss.

## How to Run the Safe Version

I've created `SAFE_FIX_PLAN_DURATIONS.sql` which is safer to run. Follow these steps:

### Step 1: Run Analysis First (100% Safe)
Copy and run only **SECTION 1** from the script:
```sql
-- This is read-only and won't change anything
SELECT 
    id,
    name,
    type,
    duration,
    duration_hours,
    CASE 
        WHEN type = '3-hour' AND duration_hours != 3 THEN 'NEEDS FIX: Should be 3 hours'
        WHEN type = 'daily' AND duration_hours != 24 THEN 'NEEDS FIX: Should be 24 hours'
        WHEN type = 'weekly' AND duration_hours != 168 THEN 'NEEDS FIX: Should be 168 hours'
        WHEN type = 'monthly' AND duration_hours != 720 THEN 'NEEDS FIX: Should be 720 hours'
        WHEN type = 'custom' AND duration_hours <= 0 THEN 'NEEDS FIX: Invalid duration'
        ELSE 'OK'
    END as status,
    is_active,
    created_at
FROM plans
ORDER BY "order", created_at;
```

### Step 2: Create Backup (Recommended)
Run **SECTION 2** to create a backup:
```sql
-- Creates a backup of your plans table
CREATE TABLE IF NOT EXISTS plans_backup_before_fix AS 
SELECT *, NOW() as backup_date 
FROM plans;

-- Verify backup was created
SELECT COUNT(*) as backed_up_plans FROM plans_backup_before_fix;
```

### Step 3: Preview Changes
Before applying fixes, run the preview queries in **SECTION 3** to see what will change:
```sql
-- Shows what will be updated without making changes
SELECT 
    id,
    name,
    type,
    duration_hours as current_hours,
    CASE 
        WHEN type = '3-hour' THEN 3
        WHEN type = 'daily' THEN 24
        WHEN type = 'weekly' THEN 168
        WHEN type = 'monthly' THEN 720
        ELSE duration_hours
    END as new_hours
FROM plans
WHERE type IN ('3-hour', 'daily', 'weekly', 'monthly');
```

### Step 4: Apply Fixes
If the preview looks correct, run the UPDATE statements one at a time:

```sql
-- Fix 3-hour plans
UPDATE plans 
SET duration_hours = 3, duration = '3 Hours', updated_at = NOW()
WHERE type = '3-hour' AND duration_hours != 3;

-- Fix daily plans
UPDATE plans 
SET duration_hours = 24, duration = '1 Day', updated_at = NOW()
WHERE type = 'daily' AND duration_hours != 24;

-- Fix weekly plans
UPDATE plans 
SET duration_hours = 168, duration = '1 Week', updated_at = NOW()
WHERE type = 'weekly' AND duration_hours != 168;

-- Fix monthly plans
UPDATE plans 
SET duration_hours = 720, duration = '1 Month', updated_at = NOW()
WHERE type = 'monthly' AND duration_hours != 720;
```

### Step 5: Verify Results
Run the verification query at the end:
```sql
SELECT 
    id,
    name,
    type,
    duration,
    duration_hours,
    CASE 
        WHEN type = '3-hour' AND duration_hours = 3 THEN '✅ Correct'
        WHEN type = 'daily' AND duration_hours = 24 THEN '✅ Correct'
        WHEN type = 'weekly' AND duration_hours = 168 THEN '✅ Correct'
        WHEN type = 'monthly' AND duration_hours = 720 THEN '✅ Correct'
        WHEN type = 'custom' AND duration_hours > 0 THEN '✅ Correct'
        ELSE '❌ Still needs fix'
    END as status
FROM plans
ORDER BY "order", created_at;
```

## Alternative: Accept the Warning

If you're confident and have a backup, you can:
1. Click "**Review**" when the warning appears
2. Check that the operations are correct
3. Click "**Confirm**" to execute the original script

The warning is just a safety precaution - the script won't delete any data, it only:
- Updates incorrect duration values
- Creates helpful functions and indexes
- Adds validation triggers

## If Something Goes Wrong

To restore from backup:
```sql
-- Restore plans from backup
UPDATE plans p
SET 
    duration = b.duration,
    duration_hours = b.duration_hours,
    updated_at = NOW()
FROM plans_backup_before_fix b
WHERE p.id = b.id;
```

## Quick Checks After Running

1. **Check a 1-day plan:**
   ```sql
   SELECT name, duration, duration_hours 
   FROM plans 
   WHERE type = 'daily';
   -- Should show: duration = '1 Day', duration_hours = 24
   ```

2. **Check a weekly plan:**
   ```sql
   SELECT name, duration, duration_hours 
   FROM plans 
   WHERE type = 'weekly';
   -- Should show: duration = '1 Week', duration_hours = 168
   ```

3. **Test in your app:**
   - Create a test purchase of a "1 Day" plan
   - Verify it displays as "1 Day" not "2 Hours"
   - Check the expiry is set to 24 hours from purchase

## Summary

The warning is normal and expected. The script is safe to run as it:
- ✅ Creates backups before changes
- ✅ Only updates incorrect values
- ✅ Doesn't delete any data
- ✅ Adds validation to prevent future issues

Run it section by section if you want to be extra careful, or accept the warning and run it all at once if you're comfortable with the changes.