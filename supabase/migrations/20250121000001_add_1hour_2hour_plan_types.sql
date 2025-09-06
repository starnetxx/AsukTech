-- Add 1-hour and 2-hour plan types to the plans table
-- This migration updates the check constraint to include the new plan types

-- First, drop the existing constraint
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_type_check;

-- Add the new constraint with 1-hour and 2-hour options
ALTER TABLE plans ADD CONSTRAINT plans_type_check 
CHECK (type IN ('1-hour', '2-hour', '3-hour', 'daily', 'weekly', 'monthly'));

-- Update any existing plans that might need the new types
-- This is optional - you can manually update existing plans in the admin panel

-- Add a comment to document the change
COMMENT ON COLUMN plans.type IS 'Plan type: 1-hour, 2-hour, 3-hour, daily, weekly, or monthly';
