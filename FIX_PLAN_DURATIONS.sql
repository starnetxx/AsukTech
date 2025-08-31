-- ============================================
-- FIX PLAN DURATIONS AND ENSURE DATA INTEGRITY
-- ============================================
-- This script ensures that plan durations are correctly set
-- and prevents issues like displaying "2 Hours" when user purchased "1 Day"

-- 1. First, let's check current plan configurations
SELECT 
    id,
    name,
    type,
    duration,
    duration_hours,
    CASE 
        WHEN type = '3-hour' AND duration_hours != 3 THEN 'NEEDS FIX'
        WHEN type = 'daily' AND duration_hours != 24 THEN 'NEEDS FIX'
        WHEN type = 'weekly' AND duration_hours != 168 THEN 'NEEDS FIX'
        WHEN type = 'monthly' AND duration_hours != 720 THEN 'NEEDS FIX'
        WHEN type = 'custom' AND duration_hours <= 0 THEN 'NEEDS FIX'
        ELSE 'OK'
    END as status
FROM plans
ORDER BY "order", created_at;

-- 2. Fix standard plan duration hours if they're incorrect
UPDATE plans 
SET duration_hours = 3,
    duration = '3 Hours',
    updated_at = NOW()
WHERE type = '3-hour' AND duration_hours != 3;

UPDATE plans 
SET duration_hours = 24,
    duration = '1 Day',
    updated_at = NOW()
WHERE type = 'daily' AND duration_hours != 24;

UPDATE plans 
SET duration_hours = 168,
    duration = '1 Week',
    updated_at = NOW()
WHERE type = 'weekly' AND duration_hours != 168;

UPDATE plans 
SET duration_hours = 720,
    duration = '1 Month',
    updated_at = NOW()
WHERE type = 'monthly' AND duration_hours != 720;

-- 3. Update duration descriptions to be consistent
UPDATE plans
SET duration = CASE
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
WHERE type != 'custom';  -- Don't override custom plan descriptions

-- 4. Create a function to validate plan duration consistency
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

-- 5. Create trigger to enforce plan duration validation
DROP TRIGGER IF EXISTS enforce_plan_duration ON plans;
CREATE TRIGGER enforce_plan_duration
    BEFORE INSERT OR UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION validate_plan_duration();

-- 6. Fix any existing transactions with incorrect expiry dates
UPDATE transactions t
SET expires_at = t.purchase_date + (p.duration_hours * INTERVAL '1 hour')
FROM plans p
WHERE t.plan_id = p.id
  AND t.type = 'plan_purchase'
  AND t.purchase_date IS NOT NULL
  AND p.duration_hours IS NOT NULL
  AND (
    t.expires_at IS NULL 
    OR ABS(EXTRACT(EPOCH FROM (t.expires_at - (t.purchase_date + (p.duration_hours * INTERVAL '1 hour')))) / 3600) > 1
  );

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_plan_purchase 
ON transactions(type, status, expires_at) 
WHERE type = 'plan_purchase';

CREATE INDEX IF NOT EXISTS idx_plans_active 
ON plans(is_active, type, duration_hours) 
WHERE is_active = true;

-- 8. Add constraint to prevent duplicate active plan names
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_unique_active_name 
ON plans(LOWER(name)) 
WHERE is_active = true;

-- 9. Create a view for easy monitoring of plan usage
CREATE OR REPLACE VIEW plan_usage_stats AS
SELECT 
    p.id as plan_id,
    p.name as plan_name,
    p.type as plan_type,
    p.duration_hours,
    p.price,
    COUNT(DISTINCT t.id) as total_purchases,
    COUNT(DISTINCT t.user_id) as unique_users,
    COUNT(CASE WHEN t.status = 'active' THEN 1 END) as active_purchases,
    COUNT(CASE WHEN t.status = 'expired' THEN 1 END) as expired_purchases,
    SUM(t.amount) as total_revenue,
    MAX(t.purchase_date) as last_purchase_date
FROM plans p
LEFT JOIN transactions t ON p.id = t.plan_id AND t.type = 'plan_purchase'
GROUP BY p.id, p.name, p.type, p.duration_hours, p.price;

-- 10. Create function to get correct duration display
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

-- 11. Verify the fixes
SELECT 
    'Plans with correct durations' as check_type,
    COUNT(*) as count
FROM plans
WHERE 
    (type = '3-hour' AND duration_hours = 3) OR
    (type = 'daily' AND duration_hours = 24) OR
    (type = 'weekly' AND duration_hours = 168) OR
    (type = 'monthly' AND duration_hours = 720) OR
    (type = 'custom' AND duration_hours > 0)
UNION ALL
SELECT 
    'Plans with incorrect durations' as check_type,
    COUNT(*) as count
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
    'Transactions with correct expiry' as check_type,
    COUNT(*) as count
FROM transactions t
JOIN plans p ON t.plan_id = p.id
WHERE t.type = 'plan_purchase'
  AND t.expires_at IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (t.expires_at - (t.purchase_date + (p.duration_hours * INTERVAL '1 hour')))) / 3600) <= 1
UNION ALL
SELECT 
    'Active purchases that should be expired' as check_type,
    COUNT(*) as count
FROM transactions
WHERE type = 'plan_purchase'
  AND status = 'active'
  AND expires_at < NOW();

-- 12. Show summary
SELECT 
    '✅ Plan duration fixes applied successfully!' as message,
    'Run the verification queries above to confirm all issues are resolved.' as action;