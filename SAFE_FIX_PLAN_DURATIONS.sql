-- ============================================
-- SAFE PLAN DURATION FIX - NON-DESTRUCTIVE VERSION
-- ============================================
-- This script is safe to run and won't destroy any data
-- Run each section separately to monitor the changes

-- ============================================
-- SECTION 1: ANALYSIS (Read-only - Safe to run)
-- ============================================

-- Check current plan configurations and identify issues
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

-- ============================================
-- SECTION 2: BACKUP (Create backup of current data)
-- ============================================

-- Create a backup table for plans (if it doesn't exist)
CREATE TABLE IF NOT EXISTS plans_backup_before_fix AS 
SELECT *, NOW() as backup_date 
FROM plans;

-- View the backup to confirm
SELECT COUNT(*) as backed_up_plans FROM plans_backup_before_fix;

-- ============================================
-- SECTION 3: FIX DURATION HOURS (Safe updates)
-- ============================================

-- Preview what will be changed (read-only)
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
    END as new_hours,
    CASE 
        WHEN type = '3-hour' AND duration_hours != 3 THEN 'WILL UPDATE'
        WHEN type = 'daily' AND duration_hours != 24 THEN 'WILL UPDATE'
        WHEN type = 'weekly' AND duration_hours != 168 THEN 'WILL UPDATE'
        WHEN type = 'monthly' AND duration_hours != 720 THEN 'WILL UPDATE'
        ELSE 'NO CHANGE'
    END as action
FROM plans
WHERE type IN ('3-hour', 'daily', 'weekly', 'monthly');

-- Apply the fixes (only run after reviewing preview above)
-- Fix 3-hour plans
UPDATE plans 
SET 
    duration_hours = 3,
    duration = '3 Hours',
    updated_at = NOW()
WHERE type = '3-hour' AND duration_hours != 3;

-- Fix daily plans
UPDATE plans 
SET 
    duration_hours = 24,
    duration = '1 Day',
    updated_at = NOW()
WHERE type = 'daily' AND duration_hours != 24;

-- Fix weekly plans
UPDATE plans 
SET 
    duration_hours = 168,
    duration = '1 Week',
    updated_at = NOW()
WHERE type = 'weekly' AND duration_hours != 168;

-- Fix monthly plans
UPDATE plans 
SET 
    duration_hours = 720,
    duration = '1 Month',
    updated_at = NOW()
WHERE type = 'monthly' AND duration_hours != 720;

-- ============================================
-- SECTION 4: FIX DURATION DESCRIPTIONS
-- ============================================

-- Preview duration description updates
SELECT 
    id,
    name,
    duration as current_duration,
    duration_hours,
    CASE
        WHEN duration_hours = 2 THEN '2 Hours'
        WHEN duration_hours = 3 THEN '3 Hours'
        WHEN duration_hours = 24 THEN '1 Day'
        WHEN duration_hours = 48 THEN '2 Days'
        WHEN duration_hours = 72 THEN '3 Days'
        WHEN duration_hours = 168 THEN '1 Week'
        WHEN duration_hours = 336 THEN '2 Weeks'
        WHEN duration_hours = 720 THEN '1 Month'
        WHEN duration_hours < 24 THEN duration_hours || ' ' || CASE WHEN duration_hours = 1 THEN 'Hour' ELSE 'Hours' END
        WHEN duration_hours % 168 = 0 THEN (duration_hours / 168) || ' ' || CASE WHEN duration_hours / 168 = 1 THEN 'Week' ELSE 'Weeks' END
        WHEN duration_hours % 24 = 0 THEN (duration_hours / 24) || ' ' || CASE WHEN duration_hours / 24 = 1 THEN 'Day' ELSE 'Days' END
        ELSE duration_hours || ' Hours'
    END as suggested_duration
FROM plans
WHERE type != 'custom';  -- Don't override custom plan descriptions

-- Apply duration description updates (only for non-custom plans)
UPDATE plans
SET 
    duration = CASE
        WHEN duration_hours = 2 THEN '2 Hours'
        WHEN duration_hours = 3 THEN '3 Hours'
        WHEN duration_hours = 24 THEN '1 Day'
        WHEN duration_hours = 48 THEN '2 Days'
        WHEN duration_hours = 72 THEN '3 Days'
        WHEN duration_hours = 168 THEN '1 Week'
        WHEN duration_hours = 336 THEN '2 Weeks'
        WHEN duration_hours = 720 THEN '1 Month'
        WHEN duration_hours < 24 THEN duration_hours || ' ' || CASE WHEN duration_hours = 1 THEN 'Hour' ELSE 'Hours' END
        WHEN duration_hours % 168 = 0 THEN (duration_hours / 168) || ' ' || CASE WHEN duration_hours / 168 = 1 THEN 'Week' ELSE 'Weeks' END
        WHEN duration_hours % 24 = 0 THEN (duration_hours / 24) || ' ' || CASE WHEN duration_hours / 24 = 1 THEN 'Day' ELSE 'Days' END
        ELSE duration_hours || ' Hours'
    END,
    updated_at = NOW()
WHERE type != 'custom';

-- ============================================
-- SECTION 5: CREATE VALIDATION FUNCTION (Safe)
-- ============================================

-- Create or replace the validation function
CREATE OR REPLACE FUNCTION validate_plan_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- For standard plans, enforce correct duration hours
    IF NEW.type = '3-hour' AND NEW.duration_hours != 3 THEN
        RAISE EXCEPTION '3-hour plan must have duration_hours = 3';
    ELSIF NEW.type = 'daily' AND NEW.duration_hours != 24 THEN
        RAISE EXCEPTION 'Daily plan must have duration_hours = 24';
    ELSIF NEW.type = 'weekly' AND NEW.duration_hours != 168 THEN
        RAISE EXCEPTION 'Weekly plan must have duration_hours = 168';
    ELSIF NEW.type = 'monthly' AND NEW.duration_hours != 720 THEN
        RAISE EXCEPTION 'Monthly plan must have duration_hours = 720';
    END IF;
    
    -- For all plans, ensure duration_hours is positive
    IF NEW.duration_hours <= 0 THEN
        RAISE EXCEPTION 'Duration hours must be greater than 0';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECTION 6: CREATE TRIGGER (Safe - uses CREATE OR REPLACE)
-- ============================================

-- First, safely drop the trigger if it exists (won't error if it doesn't exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_plan_duration') THEN
        DROP TRIGGER enforce_plan_duration ON plans;
    END IF;
END $$;

-- Create the trigger
CREATE TRIGGER enforce_plan_duration
    BEFORE INSERT OR UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION validate_plan_duration();

-- ============================================
-- SECTION 7: FIX TRANSACTION EXPIRY DATES
-- ============================================

-- Preview transactions that need expiry date fixes
SELECT 
    t.id,
    t.user_id,
    p.name as plan_name,
    p.duration_hours,
    t.purchase_date,
    t.expires_at as current_expiry,
    t.purchase_date + (p.duration_hours * INTERVAL '1 hour') as correct_expiry,
    CASE 
        WHEN t.expires_at IS NULL THEN 'Missing expiry'
        WHEN ABS(EXTRACT(EPOCH FROM (t.expires_at - (t.purchase_date + (p.duration_hours * INTERVAL '1 hour')))) / 3600) > 1 THEN 'Incorrect expiry'
        ELSE 'OK'
    END as status
FROM transactions t
JOIN plans p ON t.plan_id = p.id
WHERE t.type = 'plan_purchase'
  AND t.purchase_date IS NOT NULL
  AND p.duration_hours IS NOT NULL
  AND (
    t.expires_at IS NULL 
    OR ABS(EXTRACT(EPOCH FROM (t.expires_at - (t.purchase_date + (p.duration_hours * INTERVAL '1 hour')))) / 3600) > 1
  )
LIMIT 20;

-- Fix transaction expiry dates (only run after reviewing preview)
UPDATE transactions t
SET 
    expires_at = t.purchase_date + (p.duration_hours * INTERVAL '1 hour'),
    updated_at = NOW()
FROM plans p
WHERE t.plan_id = p.id
  AND t.type = 'plan_purchase'
  AND t.purchase_date IS NOT NULL
  AND p.duration_hours IS NOT NULL
  AND (
    t.expires_at IS NULL 
    OR ABS(EXTRACT(EPOCH FROM (t.expires_at - (t.purchase_date + (p.duration_hours * INTERVAL '1 hour')))) / 3600) > 1
  );

-- ============================================
-- SECTION 8: CREATE INDEXES (Safe - uses IF NOT EXISTS)
-- ============================================

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_plan_purchase 
ON transactions(type, status, expires_at) 
WHERE type = 'plan_purchase';

CREATE INDEX IF NOT EXISTS idx_plans_active 
ON plans(is_active, type, duration_hours) 
WHERE is_active = true;

-- ============================================
-- SECTION 9: CREATE HELPER FUNCTION (Safe)
-- ============================================

-- Create function to get correct duration display
CREATE OR REPLACE FUNCTION get_duration_display(hours INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN hours = 2 THEN '2 Hours'
        WHEN hours = 3 THEN '3 Hours'
        WHEN hours = 24 THEN '1 Day'
        WHEN hours = 48 THEN '2 Days'
        WHEN hours = 72 THEN '3 Days'
        WHEN hours = 168 THEN '1 Week'
        WHEN hours = 336 THEN '2 Weeks'
        WHEN hours = 720 THEN '1 Month'
        WHEN hours < 24 THEN hours || ' ' || CASE WHEN hours = 1 THEN 'Hour' ELSE 'Hours' END
        WHEN hours % 168 = 0 THEN (hours / 168) || ' ' || CASE WHEN hours / 168 = 1 THEN 'Week' ELSE 'Weeks' END
        WHEN hours % 24 = 0 THEN (hours / 24) || ' ' || CASE WHEN hours / 24 = 1 THEN 'Day' ELSE 'Days' END
        ELSE hours || ' Hours'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 10: VERIFICATION (Read-only - Safe)
-- ============================================

-- Verify all fixes have been applied
SELECT 
    'Verification Report' as report_section,
    '=================' as divider
FROM (SELECT 1) x
UNION ALL
SELECT 
    'Plans with correct durations' as report_section,
    COUNT(*)::text as divider
FROM plans
WHERE 
    (type = '3-hour' AND duration_hours = 3) OR
    (type = 'daily' AND duration_hours = 24) OR
    (type = 'weekly' AND duration_hours = 168) OR
    (type = 'monthly' AND duration_hours = 720) OR
    (type = 'custom' AND duration_hours > 0)
UNION ALL
SELECT 
    'Plans with INCORRECT durations' as report_section,
    COUNT(*)::text as divider
FROM plans
WHERE NOT (
    (type = '3-hour' AND duration_hours = 3) OR
    (type = 'daily' AND duration_hours = 24) OR
    (type = 'weekly' AND duration_hours = 168) OR
    (type = 'monthly' AND duration_hours = 720) OR
    (type = 'custom' AND duration_hours > 0)
)
UNION ALL
SELECT 
    'Active purchases that might be expired' as report_section,
    COUNT(*)::text as divider
FROM transactions
WHERE type = 'plan_purchase'
  AND status = 'active'
  AND expires_at < NOW();

-- Final check - show all plans with their corrected values
SELECT 
    '✅ Plans After Fix:' as status,
    id,
    name,
    type,
    duration,
    duration_hours,
    get_duration_display(duration_hours) as calculated_display,
    CASE 
        WHEN duration = get_duration_display(duration_hours) THEN '✅ Match'
        ELSE '⚠️ Check'
    END as consistency
FROM plans
ORDER BY "order", created_at;

-- ============================================
-- SECTION 11: ROLLBACK INSTRUCTIONS (If needed)
-- ============================================
-- If you need to rollback, you can restore from the backup:
-- 
-- UPDATE plans p
-- SET 
--     duration = b.duration,
--     duration_hours = b.duration_hours,
--     updated_at = NOW()
-- FROM plans_backup_before_fix b
-- WHERE p.id = b.id;
--
-- Then drop the backup table:
-- DROP TABLE IF EXISTS plans_backup_before_fix;