-- Add transfer support to transactions table
-- This migration adds support for user-to-user transfers

-- Add transfer transaction types
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add the new constraint with transfer types included
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('wallet_topup', 'plan_purchase', 'wallet_funding', 'transfer_sent', 'transfer_received'));

-- Add transfer-specific columns
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS transfer_to_user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS transfer_from_user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS transfer_charge DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfer_reference TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_to_user ON transactions (transfer_to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_from_user ON transactions (transfer_from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_reference ON transactions (transfer_reference);

-- Create a function to handle user-to-user transfers atomically
CREATE OR REPLACE FUNCTION transfer_funds(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount DECIMAL(10,2),
  p_charge DECIMAL(10,2) DEFAULT 0,
  p_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_balance DECIMAL(10,2);
  v_to_balance DECIMAL(10,2);
  v_total_deduction DECIMAL(10,2);
  v_transfer_id UUID;
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Lock both user profile rows to prevent concurrent balance updates
    SELECT wallet_balance INTO v_from_balance
    FROM profiles
    WHERE id = p_from_user_id
    FOR UPDATE;
    
    SELECT wallet_balance INTO v_to_balance
    FROM profiles
    WHERE id = p_to_user_id
    FOR UPDATE;
    
    -- Check if both users exist
    IF v_from_balance IS NULL THEN
      RAISE EXCEPTION 'Sender user not found';
    END IF;
    
    IF v_to_balance IS NULL THEN
      RAISE EXCEPTION 'Recipient user not found';
    END IF;
    
    -- Check if sender has sufficient balance
    v_total_deduction := p_amount + p_charge;
    IF v_from_balance < v_total_deduction THEN
      RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', v_total_deduction, v_from_balance;
    END IF;
    
    -- Prevent self-transfer
    IF p_from_user_id = p_to_user_id THEN
      RAISE EXCEPTION 'Cannot transfer to yourself';
    END IF;
    
    -- Deduct amount + charge from sender
    UPDATE profiles
    SET wallet_balance = wallet_balance - v_total_deduction
    WHERE id = p_from_user_id;
    
    -- Add amount to recipient
    UPDATE profiles
    SET wallet_balance = wallet_balance + p_amount
    WHERE id = p_to_user_id;
    
    -- Generate transfer reference if not provided
    IF p_reference IS NULL THEN
      p_reference := 'TRF-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(p_from_user_id::TEXT, 1, 8);
    END IF;
    
    -- Create transaction record for sender (debit)
    INSERT INTO transactions (
      user_id,
      type,
      amount,
      status,
      reference,
      transfer_to_user_id,
      transfer_charge,
      transfer_reference,
      details,
      created_at,
      updated_at
    ) VALUES (
      p_from_user_id,
      'transfer_sent',
      v_total_deduction,
      'success',
      p_reference,
      p_to_user_id,
      p_charge,
      p_reference,
      jsonb_build_object(
        'transfer_amount', p_amount,
        'transfer_charge', p_charge,
        'recipient_id', p_to_user_id,
        'transfer_type', 'user_to_user'
      ),
      NOW(),
      NOW()
    ) RETURNING id INTO v_transfer_id;
    
    -- Create transaction record for recipient (credit)
    INSERT INTO transactions (
      user_id,
      type,
      amount,
      status,
      reference,
      transfer_from_user_id,
      transfer_reference,
      details,
      created_at,
      updated_at
    ) VALUES (
      p_to_user_id,
      'transfer_received',
      p_amount,
      'success',
      p_reference,
      p_from_user_id,
      p_reference,
      jsonb_build_object(
        'transfer_amount', p_amount,
        'sender_id', p_from_user_id,
        'transfer_type', 'user_to_user'
      ),
      NOW(),
      NOW()
    );
    
    -- Return success result
    v_result := jsonb_build_object(
      'success', true,
      'transfer_id', v_transfer_id,
      'reference', p_reference,
      'amount_transferred', p_amount,
      'charge_deducted', p_charge,
      'total_deducted', v_total_deduction,
      'sender_new_balance', v_from_balance - v_total_deduction,
      'recipient_new_balance', v_to_balance + p_amount
    );
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Return error result
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION transfer_funds TO authenticated;

-- Create a function to get transfer settings
CREATE OR REPLACE FUNCTION get_transfer_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
BEGIN
  SELECT jsonb_object_agg(key, value) INTO v_settings
  FROM admin_settings
  WHERE key IN (
    'transfer_enabled',
    'transfer_min_amount',
    'transfer_max_amount',
    'transfer_charge_enabled',
    'transfer_charge_type',
    'transfer_charge_value'
  );
  
  RETURN COALESCE(v_settings, '{}'::jsonb);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_transfer_settings TO authenticated;
