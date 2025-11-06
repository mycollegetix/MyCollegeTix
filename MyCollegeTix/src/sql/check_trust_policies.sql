-- SQL Query to Check Trust Policies and Current Status
-- This script will help verify the trusted user system is working with 2 transaction threshold

-- 1. Check the current table structure and constraints for user_trust_status
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_trust_status' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check current trust status distribution
SELECT 
    is_trusted,
    COUNT(*) as user_count,
    AVG(total_transactions) as avg_transactions,
    MIN(total_transactions) as min_transactions,
    MAX(total_transactions) as max_transactions
FROM user_trust_status 
GROUP BY is_trusted
ORDER BY is_trusted;

-- 3. Show users with transaction counts and their trust status
SELECT 
    p.username,
    p.full_name,
    uts.successful_purchases,
    uts.successful_sales,
    uts.total_transactions,
    uts.is_trusted,
    uts.trust_earned_at,
    CASE 
        WHEN uts.total_transactions >= 2 THEN 'Should be trusted'
        ELSE 'Not enough transactions'
    END as expected_status
FROM user_trust_status uts
JOIN profiles p ON uts.user_id = p.id
ORDER BY uts.total_transactions DESC, p.username;

-- 4. Check for any discrepancies where trust status doesn't match the 2+ transaction rule
SELECT 
    p.username,
    uts.total_transactions,
    uts.is_trusted,
    'Trust status inconsistent' as issue
FROM user_trust_status uts
JOIN profiles p ON uts.user_id = p.id
WHERE (uts.total_transactions >= 2 AND uts.is_trusted = false)
   OR (uts.total_transactions < 2 AND uts.is_trusted = true);

-- 5. Check if there are any database triggers or functions that might affect trust status
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_trust_status' 
   OR event_object_table = 'ticket_sales'
   OR action_statement LIKE '%trust%'
   OR action_statement LIKE '%is_trusted%';

-- 6. Check for any database functions related to trust
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_definition LIKE '%trust%' OR routine_definition LIKE '%is_trusted%');

-- 7. Show recent ticket sales to understand transaction flow
SELECT 
    ts.id,
    ts.created_at,
    p_seller.username as seller,
    p_buyer.username as buyer,
    ts.sale_price
FROM ticket_sales ts
JOIN profiles p_seller ON ts.seller_id = p_seller.id
LEFT JOIN profiles p_buyer ON ts.buyer_id = p_buyer.id
ORDER BY ts.created_at DESC
LIMIT 10;

-- 8. Show current trust earned dates to see if they align with 2+ transactions
SELECT 
    p.username,
    uts.total_transactions,
    uts.is_trusted,
    uts.trust_earned_at,
    uts.created_at,
    uts.updated_at
FROM user_trust_status uts
JOIN profiles p ON uts.user_id = p.id
WHERE uts.is_trusted = true
ORDER BY uts.trust_earned_at DESC;