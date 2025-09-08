-- Check RLS policies on tickets table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY policyname;

-- Check if RLS is enabled on tickets table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'tickets';

-- Check RLS policies on ticket_sales table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ticket_sales'
ORDER BY policyname;

-- Check if RLS is enabled on ticket_sales table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'ticket_sales';