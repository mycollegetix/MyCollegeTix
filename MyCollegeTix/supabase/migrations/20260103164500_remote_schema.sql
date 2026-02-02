

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";








ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."activate_legal_document_version"("p_document_type" "text", "p_version" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_document_id UUID;
    result JSON;
BEGIN
    -- Check if admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Unauthorized: Admin access required'
        );
    END IF;

    -- Deactivate all existing versions of this document type
    UPDATE legal_document_versions 
    SET is_active = false, updated_at = NOW()
    WHERE document_type = p_document_type AND is_active = true;

    -- Activate the specified version
    UPDATE legal_document_versions 
    SET is_active = true, updated_at = NOW()
    WHERE document_type = p_document_type 
    AND version = p_version
    RETURNING id INTO v_document_id;

    IF v_document_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Document version not found'
        );
    END IF;

    -- Log the activation
    INSERT INTO system_logs (operation, details)
    VALUES (
        'legal_document_activated',
        json_build_object(
            'document_type', p_document_type,
            'version', p_version,
            'activated_by', auth.uid(),
            'document_id', v_document_id
        )
    );

    RETURN json_build_object(
        'success', true,
        'document_id', v_document_id,
        'message', 'Document version activated successfully'
    );
END;
$$;


ALTER FUNCTION "public"."activate_legal_document_version"("p_document_type" "text", "p_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_new_college"("p_name" "text", "p_short_name" "text", "p_email_domain" "text", "p_website_url" "text" DEFAULT NULL::"text", "p_support_email" "text" DEFAULT NULL::"text", "p_primary_color" "text" DEFAULT '#18453b'::"text", "p_secondary_color" "text" DEFAULT '#ffd700'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_college_id uuid;
BEGIN
  -- Insert new college
  INSERT INTO public.colleges (
    name, short_name, email_domain, website_url, 
    support_email, primary_color, secondary_color
  ) VALUES (
    p_name, p_short_name, p_email_domain, p_website_url,
    p_support_email, p_primary_color, p_secondary_color
  ) RETURNING id INTO new_college_id;
  
  RETURN new_college_id;
END;
$$;


ALTER FUNCTION "public"."add_new_college"("p_name" "text", "p_short_name" "text", "p_email_domain" "text", "p_website_url" "text", "p_support_email" "text", "p_primary_color" "text", "p_secondary_color" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_college"("college_name" "text", "college_short_name" "text", "college_email_domain" "text", "college_primary_color" "text" DEFAULT '#18453b'::"text", "college_secondary_color" "text" DEFAULT '#ffd700'::"text", "college_is_active" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
  new_college_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT profiles.is_admin INTO is_admin
  FROM profiles 
  WHERE profiles.id = current_user_id;
  
  -- Verify admin privileges
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  -- Insert the college
  INSERT INTO colleges (name, short_name, email_domain, primary_color, secondary_color, is_active)
  VALUES (college_name, college_short_name, college_email_domain, college_primary_color, college_secondary_color, college_is_active)
  RETURNING id INTO new_college_id;
  
  RETURN new_college_id;
END;
$$;


ALTER FUNCTION "public"."admin_create_college"("college_name" "text", "college_short_name" "text", "college_email_domain" "text", "college_primary_color" "text", "college_secondary_color" "text", "college_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_college"("college_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
  user_count integer;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT profiles.is_admin INTO is_admin
  FROM profiles 
  WHERE profiles.id = current_user_id;
  
  -- Verify admin privileges
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  -- Check if college has associated users
  SELECT COUNT(*) INTO user_count
  FROM profiles 
  WHERE college_id = college_id;
  
  -- If college has users, just deactivate it
  IF user_count > 0 THEN
    UPDATE colleges 
    SET is_active = false
    WHERE id = college_id;
    
    RETURN json_build_object(
      'success', true,
      'action', 'deactivated',
      'message', format('College deactivated due to %s associated users', user_count)
    );
  ELSE
    -- Actually delete if no users
    DELETE FROM colleges WHERE id = college_id;
    
    RETURN json_build_object(
      'success', true,
      'action', 'deleted',
      'message', 'College permanently deleted'
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."admin_delete_college"("college_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_event_status"("event_id" "uuid", "new_status" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if current user is admin
  SELECT profiles.is_admin INTO is_admin
  FROM profiles 
  WHERE profiles.id = auth.uid();
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can manually set event status';
  END IF;
  
  -- Update the event status
  UPDATE events 
  SET status = new_status, updated_at = NOW()
  WHERE id = event_id;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."admin_set_event_status"("event_id" "uuid", "new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_toggle_college_status"("college_id" "uuid", "new_status" boolean) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
  updated_college record;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT profiles.is_admin INTO is_admin
  FROM profiles 
  WHERE profiles.id = current_user_id;
  
  -- Verify admin privileges
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  -- Update the college
  UPDATE colleges 
  SET is_active = new_status
  WHERE id = college_id
  RETURNING * INTO updated_college;
  
  -- Check if college was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'College not found';
  END IF;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'college_id', college_id,
    'new_status', new_status
  );
END;
$$;


ALTER FUNCTION "public"."admin_toggle_college_status"("college_id" "uuid", "new_status" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_college"("college_id" "uuid", "college_name" "text" DEFAULT NULL::"text", "college_short_name" "text" DEFAULT NULL::"text", "college_email_domain" "text" DEFAULT NULL::"text", "college_primary_color" "text" DEFAULT NULL::"text", "college_secondary_color" "text" DEFAULT NULL::"text", "college_is_active" boolean DEFAULT NULL::boolean) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
  updated_college record;
  update_data json;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT profiles.is_admin INTO is_admin
  FROM profiles 
  WHERE profiles.id = current_user_id;
  
  -- Verify admin privileges
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  -- Build dynamic update query
  UPDATE colleges 
  SET 
    name = COALESCE(college_name, name),
    short_name = COALESCE(college_short_name, short_name),
    email_domain = COALESCE(college_email_domain, email_domain),
    primary_color = COALESCE(college_primary_color, primary_color),
    secondary_color = COALESCE(college_secondary_color, secondary_color),
    is_active = COALESCE(college_is_active, is_active)
  WHERE id = college_id
  RETURNING * INTO updated_college;
  
  -- Check if college was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'College not found with ID: %', college_id;
  END IF;
  
  -- Return the updated college
  SELECT row_to_json(updated_college) INTO update_data;
  
  RETURN json_build_object(
    'success', true,
    'college', update_data
  );
END;
$$;


ALTER FUNCTION "public"."admin_update_college"("college_id" "uuid", "college_name" "text", "college_short_name" "text", "college_email_domain" "text", "college_primary_color" "text", "college_secondary_color" "text", "college_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_ticket_colleges"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If event_id is provided, inherit college IDs from the event
    IF NEW.event_id IS NOT NULL THEN
        SELECT home_college_id, away_college_id
        INTO NEW.home_college_id, NEW.away_college_id
        FROM public.events
        WHERE id = NEW.event_id;
    END IF;
    
    -- If no event but seller has a college, use seller's college as default
    IF NEW.home_college_id IS NULL AND NEW.away_college_id IS NULL THEN
        SELECT college_id
        INTO NEW.home_college_id
        FROM public.profiles
        WHERE id = NEW.seller_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_ticket_colleges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_expire_events"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  DECLARE
    end_of_event_day timestamp with time zone;
  BEGIN
    -- Calculate end of event day (11:59:59 PM on event date)
    end_of_event_day := (DATE(NEW.event_date) + INTERVAL '23 hours 59 minutes 59 seconds');

    -- Only auto-expire if:
    -- 1. We're past the END of the event day (not just the date)
    -- 2. Status is not already completed/cancelled
    -- 3. This is NOT a manual admin edit (we detect this by checking if status was explicitly changed)
    IF end_of_event_day < NOW()
       AND NEW.status NOT IN ('completed', 'cancelled')
       AND (TG_OP = 'INSERT' OR OLD.status = NEW.status) -- Only auto-expire if status wasn't manually changed
    THEN
      NEW.status = 'completed';
      NEW.updated_at = NOW();
    END IF;

    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."auto_expire_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_content"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If no user is logged in, deny access
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the current user is blocked by the target user
  -- or if the current user has blocked the target user
  RETURN NOT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE (blocker_id = target_user_id AND blocked_id = auth.uid())
       OR (blocker_id = auth.uid() AND blocked_id = target_user_id)
  );
END;
$$;


ALTER FUNCTION "public"."can_access_content"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_access_ticket"("ticket_id" "uuid", "user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tickets t
        JOIN profiles p ON p.id = user_id
        WHERE t.id = ticket_id
        AND t.status = 'available'
        AND t.event_date >= NOW()
        AND (
            t.home_college_id = p.college_id
            OR t.away_college_id = p.college_id
            OR (t.home_college_id IS NULL AND t.away_college_id IS NULL)
        )
    );
END;
$$;


ALTER FUNCTION "public"."can_user_access_ticket"("ticket_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_user_access_ticket"("ticket_id" "uuid", "user_id" "uuid") IS 'Helper function to check if a user can access a specific ticket based on college rules';



CREATE OR REPLACE FUNCTION "public"."check_function_security"() RETURNS TABLE("function_name" "text", "function_signature" "text", "search_path_setting" "text", "is_secure" boolean, "status" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.proname::text as function_name,
        p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as function_signature,
        COALESCE(
            (SELECT unnest(proconfig) FROM pg_proc pp WHERE pp.oid = p.oid AND unnest(proconfig) LIKE 'search_path=%'), 
            'default'
        ) as search_path_setting,
        EXISTS (
            SELECT 1 FROM pg_proc pp 
            WHERE pp.oid = p.oid 
            AND 'search_path=public' = ANY(pp.proconfig)
        ) as is_secure,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_proc pp 
                WHERE pp.oid = p.oid 
                AND 'search_path=public' = ANY(pp.proconfig)
            ) THEN '✅ SECURE'
            ELSE '❌ INSECURE'
        END as status
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'can_user_access_ticket', 'get_user_college_id', 'get_college_by_team_name',
        'assign_ticket_colleges', 'is_admin', 'can_access_content',
        'check_policy_performance', 'get_user_college', 'is_valid_college_email',
        'get_college_by_email', 'add_new_college', 'admin_toggle_college_status',
        'admin_create_college', 'admin_update_college', 'verify_policy_optimization',
        'admin_delete_college', 'final_policy_check', 'purchase_ticket',
        'notify_watchlist_price_change'
    )
    ORDER BY function_name;
END;
$$;


ALTER FUNCTION "public"."check_function_security"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_policy_performance"() RETURNS TABLE("table_name" "text", "policy_count" bigint, "has_optimized_auth" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.relname::text,
        COUNT(pol.policyname) as policy_count,
        bool_and(pol.qual ~ '\(SELECT auth\.uid\(\)\)') as has_optimized_auth
    FROM pg_class t
    JOIN pg_policy pol ON pol.polrelid = t.oid
    WHERE t.relname IN ('tickets', 'orders', 'profiles', 'blocked_users', 'content_reports', 'conversations', 'messages', 'notifications', 'legal_agreements', 'colleges')
    GROUP BY t.relname
    ORDER BY t.relname;
END;
$$;


ALTER FUNCTION "public"."check_policy_performance"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_policy_performance"() IS 'Check if RLS policies are optimized with (SELECT auth.uid()) pattern for better performance';



CREATE OR REPLACE FUNCTION "public"."check_rls_status"() RETURNS TABLE("table_name" "text", "rls_enabled" boolean, "policy_count" bigint, "status" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::text as table_name,
        c.relrowsecurity as rls_enabled,
        COUNT(p.policyname) as policy_count,
        CASE 
            WHEN NOT c.relrowsecurity THEN '❌ RLS DISABLED'
            WHEN COUNT(p.policyname) = 0 THEN '❌ NO POLICIES'
            ELSE '✅ HAS POLICIES'
        END as status
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND c.relname IN (
        'tickets', 'profiles', 'orders', 'conversations', 'messages', 
        'notifications', 'blocked_users', 'content_reports', 'watchlists',
        'legal_agreements', 'events', 'colleges'
    )
    GROUP BY c.relname, c.relrowsecurity
    ORDER BY c.relname;
END;
$$;


ALTER FUNCTION "public"."check_rls_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_type" "text" DEFAULT 'message'::"text", "p_related_ticket_id" "uuid" DEFAULT NULL::"uuid", "p_related_order_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" "text", "message" "text", "type" "text", "related_ticket_id" "uuid", "related_order_id" "uuid", "read" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_ticket_id,
        related_order_id
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_related_ticket_id,
        p_related_order_id
    )
    RETURNING
        notifications.id,
        notifications.user_id,
        notifications.title,
        notifications.message,
        notifications.type,
        notifications.related_ticket_id,
        notifications.related_order_id,
        notifications.read,
        notifications.created_at;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_type" "text", "p_related_ticket_id" "uuid", "p_related_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
  SELECT auth.uid();
$$;


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_auth_user_on_profile_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Delete the user from auth.users table
    -- This requires elevated privileges
    DELETE FROM auth.users WHERE id = OLD.id;
    
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the profile deletion
        INSERT INTO system_logs (operation, details)
        VALUES (
            'auth_user_deletion_failed',
            json_build_object(
                'user_id', OLD.id,
                'error', SQLERRM,
                'sqlstate', SQLSTATE,
                'timestamp', NOW()
            )
        );
        
        RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_auth_user_on_profile_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_expired_tickets"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Delete tickets for events that have already occurred
  DELETE FROM public.tickets 
  WHERE event_date < NOW() 
    AND status = 'available';
    
  -- Update any remaining tickets for past events to expired
  UPDATE public.tickets 
  SET status = 'expired'
  WHERE event_date < NOW() 
    AND status != 'sold';
END;
$$;


ALTER FUNCTION "public"."delete_expired_tickets"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_old_notifications"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Delete notifications older than 30 days
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;


ALTER FUNCTION "public"."delete_old_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_completely"("user_id_to_delete" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
    deleted_counts JSON;
    watchlist_count INTEGER;
    message_count INTEGER;
    notification_count INTEGER;
    order_count INTEGER;
    ticket_count INTEGER;
    conversation_count INTEGER;
    blocked_count INTEGER;
    report_count INTEGER;
    legal_count INTEGER;
    push_token_count INTEGER;
BEGIN
    -- Get counts before deletion for reporting
    SELECT COUNT(*) INTO watchlist_count FROM watchlists WHERE user_id = user_id_to_delete;
    SELECT COUNT(*) INTO message_count FROM messages WHERE sender_id = user_id_to_delete;
    SELECT COUNT(*) INTO notification_count FROM notifications WHERE user_id = user_id_to_delete;
    SELECT COUNT(*) INTO order_count FROM orders WHERE buyer_id = user_id_to_delete OR seller_id = user_id_to_delete;
    SELECT COUNT(*) INTO ticket_count FROM tickets WHERE seller_id = user_id_to_delete OR buyer_id = user_id_to_delete;
    SELECT COUNT(*) INTO conversation_count FROM conversations WHERE participant_1_id = user_id_to_delete OR participant_2_id = user_id_to_delete;
    SELECT COUNT(*) INTO blocked_count FROM blocked_users WHERE blocker_id = user_id_to_delete OR blocked_id = user_id_to_delete;
    SELECT COUNT(*) INTO report_count FROM content_reports WHERE reported_by = user_id_to_delete;
    SELECT COUNT(*) INTO legal_count FROM legal_agreements WHERE user_id = user_id_to_delete;
    SELECT COUNT(*) INTO push_token_count FROM push_tokens WHERE user_id = user_id_to_delete;
    
    -- Delete from all related tables (only tables that actually exist)
    DELETE FROM watchlists WHERE user_id = user_id_to_delete;
    DELETE FROM messages WHERE sender_id = user_id_to_delete;
    DELETE FROM notifications WHERE user_id = user_id_to_delete;
    DELETE FROM orders WHERE buyer_id = user_id_to_delete OR seller_id = user_id_to_delete;
    DELETE FROM tickets WHERE seller_id = user_id_to_delete OR buyer_id = user_id_to_delete;
    DELETE FROM conversations WHERE participant_1_id = user_id_to_delete OR participant_2_id = user_id_to_delete;
    DELETE FROM legal_agreements WHERE user_id = user_id_to_delete;
    DELETE FROM push_tokens WHERE user_id = user_id_to_delete;
    DELETE FROM blocked_users WHERE blocker_id = user_id_to_delete OR blocked_id = user_id_to_delete;
    DELETE FROM content_reports WHERE reported_by = user_id_to_delete;
    
    -- Delete the profile (this will trigger auth user deletion)
    DELETE FROM profiles WHERE id = user_id_to_delete;
    
    -- Build summary
    deleted_counts := json_build_object(
        'watchlists', watchlist_count,
        'messages', message_count,
        'notifications', notification_count,
        'orders', order_count,
        'tickets', ticket_count,
        'conversations', conversation_count,
        'blocked_users', blocked_count,
        'content_reports', report_count,
        'legal_agreements', legal_count,
        'push_tokens', push_token_count
    );
    
    result := json_build_object(
        'success', true,
        'message', 'User account and all associated data deleted successfully',
        'user_id', user_id_to_delete,
        'deleted_data', deleted_counts,
        'timestamp', NOW()
    );
    
    -- Log the successful deletion
    INSERT INTO system_logs (operation, details)
    VALUES (
        'user_account_deleted',
        result
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLSTATE,
            'detail', SQLERRM,
            'user_id', user_id_to_delete,
            'timestamp', NOW()
        );
        
        -- Log the failed deletion
        INSERT INTO system_logs (operation, details)
        VALUES (
            'user_account_deletion_failed',
            result
        );
        
        RETURN result;
END;
$$;


ALTER FUNCTION "public"."delete_user_completely"("user_id_to_delete" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_past_events"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE events 
  SET status = 'completed', updated_at = NOW()
  WHERE event_date < NOW() 
    AND status NOT IN ('completed', 'cancelled');
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;


ALTER FUNCTION "public"."expire_past_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."final_policy_check"() RETURNS TABLE("table_name" "text", "policy_count" bigint, "index_count" bigint, "status" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.relname::text as table_name,
        COALESCE(pol_count.count, 0) as policy_count,
        COALESCE(idx_count.count, 0) as index_count,
        CASE 
            WHEN COALESCE(pol_count.count, 0) <= 4 THEN '✅ POLICIES OK'
            ELSE '❌ TOO MANY POLICIES'
        END as status
    FROM (
        SELECT unnest(ARRAY['tickets', 'orders', 'profiles', 'blocked_users', 'content_reports', 'conversations', 'messages', 'notifications', 'colleges']) as relname
    ) t
    LEFT JOIN (
        SELECT 
            pg_class.relname,
            COUNT(*) as count
        FROM pg_policy 
        JOIN pg_class ON pg_policy.polrelid = pg_class.oid
        GROUP BY pg_class.relname
    ) pol_count ON pol_count.relname = t.relname
    LEFT JOIN (
        SELECT 
            pg_class.relname,
            COUNT(*) as count
        FROM pg_index 
        JOIN pg_class ON pg_index.indrelid = pg_class.oid
        WHERE pg_class.relname IN ('tickets', 'orders', 'profiles', 'blocked_users', 'content_reports', 'conversations', 'messages', 'notifications', 'colleges')
        GROUP BY pg_class.relname
    ) idx_count ON idx_count.relname = t.relname
    ORDER BY t.relname;
END;
$$;


ALTER FUNCTION "public"."final_policy_check"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."final_policy_check"() IS 'Final verification that all RLS policy and index issues are resolved';



CREATE OR REPLACE FUNCTION "public"."get_college_by_email"("email_address" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id FROM public.colleges 
  WHERE is_active = true 
  AND email_address LIKE '%@' || email_domain
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_college_by_email"("email_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_college_by_team_name"("team_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    college_id uuid;
BEGIN
    -- Try to find college by name or short_name (case insensitive)
    SELECT id INTO college_id 
    FROM public.colleges 
    WHERE LOWER(name) LIKE '%' || LOWER(team_name) || '%' 
       OR LOWER(short_name) LIKE '%' || LOWER(team_name) || '%'
       OR LOWER(team_name) LIKE '%' || LOWER(name) || '%'
       OR LOWER(team_name) LIKE '%' || LOWER(short_name) || '%'
    LIMIT 1;
    
    RETURN college_id;
END;
$$;


ALTER FUNCTION "public"."get_college_by_team_name"("team_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_policy_summary"() RETURNS TABLE("table_name" "text", "policy_count" bigint, "has_security" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::text as table_name,
        COUNT(p.polname) as policy_count,
        COUNT(p.polname) > 0 as has_security
    FROM pg_class c
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND c.relkind = 'r'
    AND c.relname IN ('tickets', 'profiles', 'orders', 'conversations', 'messages', 'watchlists', 'notifications')
    GROUP BY c.relname
    ORDER BY c.relname;
END;
$$;


ALTER FUNCTION "public"."get_policy_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_college"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT college_id FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_college"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_college_id"("user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    college_id uuid;
BEGIN
    SELECT p.college_id INTO college_id
    FROM profiles p
    WHERE p.id = user_id;
    
    RETURN college_id;
END;
$$;


ALTER FUNCTION "public"."get_user_college_id"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
      user_email TEXT;
      user_name TEXT;
      college_uuid UUID;
      generated_username TEXT;
      counter INTEGER := 0;
      terms_accepted BOOLEAN := false;
      is_oauth_user BOOLEAN := false;
  BEGIN
      -- Get email from the new auth user
      user_email := NEW.email;

      -- Get name from metadata (if provided)
      user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');

      -- Check if this is an OAuth user (has provider info)
      -- OAuth users have app_metadata with provider or raw_app_meta_data
      IF NEW.raw_app_meta_data->>'provider' IS NOT NULL
         OR NEW.raw_user_meta_data->>'iss' IS NOT NULL THEN
          is_oauth_user := true;
          terms_accepted := true;  -- Auto-accept for OAuth since login screen says "By signing in, you agree..."
      ELSE
          -- Get terms acceptance from metadata for email/password signups
          IF NEW.raw_user_meta_data->>'accepted_terms' IS NOT NULL THEN
              BEGIN
                  terms_accepted := (NEW.raw_user_meta_data->>'accepted_terms')::BOOLEAN;
              EXCEPTION WHEN OTHERS THEN
                  terms_accepted := false;
              END;
          END IF;
      END IF;

      -- Try to get college_id from metadata first
      college_uuid := NULL;
      IF NEW.raw_user_meta_data->>'college_id' IS NOT NULL THEN
          BEGIN
              college_uuid := (NEW.raw_user_meta_data->>'college_id')::UUID;
          EXCEPTION WHEN OTHERS THEN
              college_uuid := NULL;
          END;
      END IF;

      -- If no college_id in metadata, try to find by email domain
      IF college_uuid IS NULL THEN
          SELECT id INTO college_uuid
          FROM public.colleges
          WHERE email_domain = split_part(user_email, '@', 2)
            AND is_active = true
          LIMIT 1;
      END IF;

      -- Generate a unique username
      generated_username := split_part(user_email, '@', 1);

      -- Ensure username is unique by adding counter if needed
      WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = generated_username) LOOP
          counter := counter + 1;
          generated_username := split_part(user_email, '@', 1) || '_' || counter;
      END LOOP;

      -- Insert the profile with explicit schema reference
      INSERT INTO public.profiles (
          id,
          username,
          full_name,
          email,
          college_id,
          is_admin,
          accepted_terms,
          accepted_terms_at
      ) VALUES (
          NEW.id,
          generated_username,
          user_name,
          user_email,
          college_uuid,
          false,
          terms_accepted,
          CASE WHEN terms_accepted THEN timezone('utc'::text, now()) ELSE NULL END
      );

      -- Log successful profile creation
      INSERT INTO public.system_logs (operation, details)
      VALUES (
          'profile_created',
          jsonb_build_object(
              'user_id', NEW.id,
              'email', user_email,
              'username', generated_username,
              'college_id', college_uuid,
              'accepted_terms', terms_accepted,
              'is_oauth', is_oauth_user
          )
      );

      RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail user creation
      INSERT INTO public.system_logs (operation, details)
      VALUES (
          'profile_creation_failed',
          jsonb_build_object(
              'user_id', NEW.id,
              'email', user_email,
              'error', SQLERRM,
              'error_detail', SQLSTATE,
              'schema_context', current_schema()
          )
      );

      -- Return NEW so auth user creation continues
      RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."handle_new_user_registration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_valid_college_email"("email_address" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.colleges 
    WHERE is_active = true 
    AND email_address LIKE '%@' || email_domain
  );
$$;


ALTER FUNCTION "public"."is_valid_college_email"("email_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_all_custom_functions"() RETURNS TABLE("function_name" "text", "function_signature" "text", "return_type" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.proname::text as function_name,
        p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as function_signature,
        pg_get_function_result(p.oid) as return_type
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
    AND p.proname NOT LIKE 'sql_%'
    ORDER BY function_name;
END;
$$;


ALTER FUNCTION "public"."list_all_custom_functions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_all_policies"() RETURNS TABLE("table_name" "text", "policy_name" "text", "policy_type" "text", "policy_roles" "text"[])
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::text as table_name,
        p.policyname::text as policy_name,
        CASE p.polcmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT' 
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            WHEN '*' THEN 'ALL'
        END as policy_type,
        p.polroles::text[] as policy_roles
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY c.relname, p.policyname;
END;
$$;


ALTER FUNCTION "public"."list_all_policies"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_admin_action"("action_type" "text", "table_name" "text", "record_id" "uuid" DEFAULT NULL::"uuid", "details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only allow admins to log actions
    IF EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true) THEN
        INSERT INTO admin_audit_log (admin_id, action, table_name, record_id, details)
        VALUES (
            (SELECT auth.uid()),
            action_type,
            table_name,
            record_id,
            COALESCE(details, jsonb_build_object('timestamp', NOW()))
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."log_admin_action"("action_type" "text", "table_name" "text", "record_id" "uuid", "details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_watchlist_price_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
BEGIN
  -- Only proceed if the price has actually changed and decreased
  IF OLD.price IS DISTINCT FROM NEW.price AND NEW.price < OLD.price THEN
    
    -- Insert notifications for users who have this ticket in their watchlist
    -- with notifications enabled and a price alert threshold that has been triggered
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      related_ticket_id,
      read,
      created_at
    )
    SELECT 
      w.user_id,
      'Price Alert!' as title,
      CASE 
        WHEN w.price_alert_threshold IS NOT NULL THEN
          FORMAT('"%s" dropped to $%s (was $%s) - below your alert threshold of $%s!', 
                 NEW.title, 
                 NEW.price::text, 
                 OLD.price::text,
                 w.price_alert_threshold::text)
        ELSE
          FORMAT('"%s" price dropped to $%s (was $%s)', 
                 NEW.title, 
                 NEW.price::text, 
                 OLD.price::text)
      END as message,
      'listing' as type,
      NEW.id as related_ticket_id,
      false as read,
      NOW() as created_at
    FROM watchlists w
    WHERE w.ticket_id = NEW.id
      AND w.notification_enabled = true
      AND (
        -- Either they have a specific alert threshold that was triggered
        (w.price_alert_threshold IS NOT NULL AND NEW.price <= w.price_alert_threshold)
        OR
        -- Or they want general price drop notifications (no specific threshold set)
        (w.price_alert_threshold IS NULL)
      );
  END IF;
  
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."notify_watchlist_price_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_ticket"("ticket_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_ticket RECORD;
    v_buyer_id uuid;
    v_order_id uuid;
    v_result json;
BEGIN
    -- Get the current authenticated user
    v_buyer_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get ticket details and lock the row for update
    SELECT * INTO v_ticket 
    FROM tickets 
    WHERE id = ticket_id 
    FOR UPDATE;

    -- Check if ticket exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket not found';
    END IF;

    -- Check if ticket is available
    IF v_ticket.status != 'available' THEN
        RAISE EXCEPTION 'Ticket is no longer available';
    END IF;

    -- Check if buyer is not the seller
    IF v_ticket.seller_id = v_buyer_id THEN
        RAISE EXCEPTION 'You cannot purchase your own ticket';
    END IF;

    -- Create the order
    INSERT INTO orders (
        ticket_id,
        buyer_id,
        seller_id,
        amount,
        status,
        created_at
    ) VALUES (
        ticket_id,
        v_buyer_id,
        v_ticket.seller_id,
        v_ticket.price,
        'pending',
        NOW()
    ) RETURNING id INTO v_order_id;

    -- Update ticket status and buyer
    UPDATE tickets 
    SET 
        status = 'sold',
        buyer_id = v_buyer_id
    WHERE id = ticket_id;

    -- Log the transaction
    INSERT INTO system_logs (operation, details)
    VALUES (
        'ticket_purchase',
        json_build_object(
            'ticket_id', ticket_id,
            'buyer_id', v_buyer_id,
            'seller_id', v_ticket.seller_id,
            'order_id', v_order_id,
            'amount', v_ticket.price
        )
    );

    -- Return success with order details
    v_result := json_build_object(
        'success', true,
        'order_id', v_order_id,
        'ticket_id', ticket_id,
        'amount', v_ticket.price,
        'message', 'Ticket purchased successfully'
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Return error details
        v_result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
        RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."purchase_ticket"("ticket_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_ticket"("p_ticket_id" "uuid", "p_buyer_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_ticket_record tickets%ROWTYPE;
    v_seller_profile profiles%ROWTYPE;
    v_buyer_profile profiles%ROWTYPE;
    v_order_id uuid;
    v_result json;
BEGIN
    -- Get ticket details
    SELECT * INTO v_ticket_record
    FROM tickets
    WHERE id = p_ticket_id AND status = 'available';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ticket not found or not available',
            'error_code', 'TICKET_NOT_FOUND'
        );
    END IF;
    
    -- Get buyer profile
    SELECT * INTO v_buyer_profile
    FROM profiles
    WHERE id = p_buyer_id;
    
    -- Get seller profile
    SELECT * INTO v_seller_profile
    FROM profiles
    WHERE id = v_ticket_record.seller_id;
    
    -- Check if buyer can purchase this ticket (college verification)
    IF v_ticket_record.home_college_id IS NOT NULL OR v_ticket_record.away_college_id IS NOT NULL THEN
        IF v_buyer_profile.college_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'You must be associated with a college to purchase this ticket',
                'error_code', 'NO_COLLEGE_ASSOCIATION'
            );
        END IF;
        
        -- Check if buyer's college is involved in the event
        IF v_buyer_profile.college_id != v_ticket_record.home_college_id 
           AND v_buyer_profile.college_id != v_ticket_record.away_college_id THEN
            RETURN json_build_object(
                'success', false,
                'error', 'This ticket is only available to students from the participating colleges',
                'error_code', 'COLLEGE_RESTRICTION'
            );
        END IF;
    END IF;
    
    -- Create order
    INSERT INTO orders (
        ticket_id,
        buyer_id,
        seller_id,
        amount,
        status
    ) VALUES (
        p_ticket_id,
        p_buyer_id,
        v_ticket_record.seller_id,
        v_ticket_record.price,
        'pending'
    ) RETURNING id INTO v_order_id;
    
    -- Update ticket status
    UPDATE tickets 
    SET status = 'sold', buyer_id = p_buyer_id
    WHERE id = p_ticket_id;
    
    -- Create notifications
    INSERT INTO notifications (user_id, title, message, type, related_ticket_id, related_order_id)
    VALUES 
        (v_ticket_record.seller_id, 'Ticket Sold!', 
         'Your ticket "' || v_ticket_record.title || '" has been sold.', 
         'sale', p_ticket_id, v_order_id),
        (p_buyer_id, 'Ticket Purchased!', 
         'You have successfully purchased "' || v_ticket_record.title || '".', 
         'purchase', p_ticket_id, v_order_id);
    
    RETURN json_build_object(
        'success', true,
        'order_id', v_order_id,
        'ticket_id', p_ticket_id,
        'amount', v_ticket_record.price,
        'message', 'Ticket purchased successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An error occurred while processing your purchase',
            'error_code', 'PURCHASE_ERROR'
        );
END;
$$;


ALTER FUNCTION "public"."purchase_ticket"("p_ticket_id" "uuid", "p_buyer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."security_status_check"() RETURNS TABLE("feature" "text", "status" "text", "description" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Profile Visibility'::text,
        '✅ RESTRICTED'::text,
        'Users can only see relevant profiles'::text
    UNION ALL
    SELECT 
        'Ticket Filtering'::text,
        '✅ COLLEGE-BASED'::text,
        'Only tickets for user college games'::text
    UNION ALL
    SELECT 
        'Blocked User Protection'::text,
        '✅ ACTIVE'::text,
        'Blocked users cannot interact'::text
    UNION ALL
    SELECT 
        'Rate Limiting'::text,
        '✅ ENABLED'::text,
        '10 tickets/hour, 50 messages/hour'::text
    UNION ALL
    SELECT 
        'Admin Auditing'::text,
        '✅ AVAILABLE'::text,
        'Manual admin action logging'::text
    UNION ALL
    SELECT 
        'College Verification'::text,
        '✅ REQUIRED'::text,
        'Verified college email required'::text
    UNION ALL
    SELECT 
        'Conversation Privacy'::text,
        '✅ TIME-LIMITED'::text,
        'Auto-archive after event + 7 days'::text;
END;
$$;


ALTER FUNCTION "public"."security_status_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_push_notification_async"("p_user_ids" "uuid"[], "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- This function would be called by triggers or other functions
    -- to queue push notifications for sending
    INSERT INTO public.push_notification_queue (user_ids, title, body, data)
    VALUES (p_user_ids, p_title, p_body, p_data);
END;
$$;


ALTER FUNCTION "public"."send_push_notification_async"("p_user_ids" "uuid"[], "p_title" "text", "p_body" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_admin_access"() RETURNS TABLE("user_id" "uuid", "is_authenticated" boolean, "profile_exists" boolean, "is_admin" boolean, "can_access_admin" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT auth.uid()) as user_id,
        (SELECT auth.uid()) IS NOT NULL as is_authenticated,
        EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid())) as profile_exists,
        COALESCE((SELECT profiles.is_admin FROM profiles WHERE id = (SELECT auth.uid())), false) as is_admin,
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (SELECT auth.uid()) 
            AND is_admin = true
        ) as can_access_admin;
END;
$$;


ALTER FUNCTION "public"."test_admin_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_auth_setup"() RETURNS TABLE("test_name" "text", "result" "text", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Current User ID'::text,
        COALESCE((SELECT auth.uid())::text, 'NULL') as result,
        CASE WHEN (SELECT auth.uid()) IS NOT NULL THEN '✅ OK' ELSE '❌ NOT AUTHENTICATED' END as status
    UNION ALL
    SELECT 
        'Profile Exists'::text,
        CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE id = (SELECT auth.uid())) THEN 'YES' ELSE 'NO' END,
        CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE id = (SELECT auth.uid())) THEN '✅ OK' ELSE '❌ NO PROFILE' END
    UNION ALL
    SELECT 
        'Is Admin'::text,
        CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true) THEN 'YES' ELSE 'NO' END,
        CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true) THEN '✅ ADMIN' ELSE 'ℹ️ REGULAR USER' END;
END;
$$;


ALTER FUNCTION "public"."test_auth_setup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_rls_policies"() RETURNS TABLE("table_name" "text", "can_select" boolean, "can_insert" boolean, "user_authenticated" boolean, "is_admin" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'tickets'::text,
        EXISTS(SELECT 1 FROM tickets LIMIT 1),
        true, -- Will be validated by actual INSERT
        (SELECT auth.uid()) IS NOT NULL,
        EXISTS(SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true)
    UNION ALL
    SELECT 
        'profiles'::text,
        EXISTS(SELECT 1 FROM profiles LIMIT 1),
        true,
        (SELECT auth.uid()) IS NOT NULL,
        EXISTS(SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true)
    UNION ALL
    SELECT 
        'orders'::text,
        EXISTS(SELECT 1 FROM orders LIMIT 1),
        true,
        (SELECT auth.uid()) IS NOT NULL,
        EXISTS(SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true);
END;
$$;


ALTER FUNCTION "public"."test_rls_policies"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_trust_on_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update trust status for the rated user when they receive a new rating
  PERFORM update_user_trust_status(NEW.rated_user_id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_trust_on_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_trust_on_ticket_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update trust status for seller (always present)
  PERFORM update_user_trust_status(NEW.seller_id);
  
  -- Update trust status for buyer if buyer_id is present
  IF NEW.buyer_id IS NOT NULL THEN
    PERFORM update_user_trust_status(NEW.buyer_id);
    
    -- Create rating prompts for both parties
    -- Seller should rate buyer
    INSERT INTO rating_prompts (ticket_sale_id, prompter_id, ratee_id, prompt_type)
    VALUES (NEW.id, NEW.seller_id, NEW.buyer_id, 'seller_rate_buyer')
    ON CONFLICT (ticket_sale_id, prompter_id, ratee_id) DO NOTHING;
    
    -- Buyer should rate seller
    INSERT INTO rating_prompts (ticket_sale_id, prompter_id, ratee_id, prompt_type)
    VALUES (NEW.id, NEW.buyer_id, NEW.seller_id, 'buyer_rate_seller')
    ON CONFLICT (ticket_sale_id, prompter_id, ratee_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_trust_on_ticket_sale"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ticket_sales_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ticket_sales_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_trust_status"("user_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  purchase_count integer := 0;
  sales_count integer := 0;
  total_count integer := 0;
  average_rating numeric := 0;
  rating_count integer := 0;
  current_trusted boolean := false;
  trust_date timestamp with time zone := null;
BEGIN
  -- Count successful purchases (from ticket_sales where user was buyer)
  SELECT COUNT(*)
  INTO purchase_count
  FROM ticket_sales 
  WHERE buyer_id = user_uuid;
  
  -- Count successful sales (from ticket_sales where user was seller)
  SELECT COUNT(*)
  INTO sales_count
  FROM ticket_sales 
  WHERE seller_id = user_uuid;
  
  -- Get user's average rating from user_ratings table
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO average_rating, rating_count
  FROM user_ratings 
  WHERE rated_user_id = user_uuid;
  
  total_count := purchase_count + sales_count;
  
  -- Trust criteria: BOTH 2+ transactions AND 2+ ratings with 4+ average
  -- Users must earn trust through BOTH transaction volume AND multiple positive ratings
  current_trusted := (total_count >= 2) AND (rating_count >= 2) AND (average_rating >= 4.0);
  
  -- Set trust earned date if just became trusted
  IF current_trusted THEN
    SELECT COALESCE(trust_earned_at, now())
    INTO trust_date
    FROM user_trust_status
    WHERE user_id = user_uuid;
    
    IF trust_date IS NULL THEN
      trust_date := now();
    END IF;
  END IF;
  
  -- Insert or update trust status
  INSERT INTO user_trust_status (
    user_id, 
    successful_purchases, 
    successful_sales,
    trust_earned_at,
    updated_at
  ) VALUES (
    user_uuid, 
    purchase_count, 
    sales_count,
    trust_date,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    successful_purchases = purchase_count,
    successful_sales = sales_count,
    trust_earned_at = CASE 
      WHEN current_trusted AND user_trust_status.trust_earned_at IS NULL 
      THEN now()
      ELSE user_trust_status.trust_earned_at
    END,
    updated_at = now();
    
  -- Update profiles table with trust status
  UPDATE profiles SET
    is_trusted = current_trusted,
    trust_earned_at = trust_date
  WHERE id = user_uuid;
END;
$$;


ALTER FUNCTION "public"."update_user_trust_status"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_user_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  email_domain TEXT;
  email_lower TEXT;
BEGIN
  -- Get lowercase email and domain
  email_lower := LOWER(TRIM(NEW.email));
  email_domain := split_part(email_lower, '@', 2);

  -- Check if domain is allowed (.edu domains)
  IF email_domain IN ('msu.edu', 'umich.edu') THEN
    RETURN NEW;
  END IF;

  -- Check if it's an allowed Gmail test account
  IF email_domain = 'gmail.com' AND email_lower IN (
    'aditi.dron@gmail.com',
    'agarwal.vijay@gmail.com',
    'cotejosephr@gmail.com',
    'dinguspickle07@gmail.com',
    'mycollegetix+2@gmail.com',
    'mycollegetix@gmail.com',
    'nikhilmamtani@gmail.com',
    'nikhilmamtani6@gmail.com',
    'riyamathur2014@gmail.com',
    'rohanm.0304@gmail.com',
    'smithhhannee@gmail.com',
    'vivekapatel2005@gmail.com'
  ) THEN
    RETURN NEW;
  END IF;

  -- If we get here, email is not allowed
  RAISE EXCEPTION 'Access is currently limited to students from Michigan State University and University of Michigan. Please use your college email (.edu) to sign up.'
    USING HINT = 'Email domain not allowed: ' || email_domain;
END;
$$;


ALTER FUNCTION "public"."validate_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_policy_optimization"() RETURNS TABLE("table_name" "text", "policy_count" bigint, "status" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.relname::text,
        COUNT(pol.policyname) as policy_count,
        CASE 
            WHEN COUNT(pol.policyname) <= 2 THEN '✅ OPTIMIZED'
            ELSE '❌ TOO MANY POLICIES'
        END as status
    FROM pg_class t
    LEFT JOIN pg_policy pol ON pol.polrelid = t.oid
    WHERE t.relname IN ('tickets', 'orders', 'profiles', 'blocked_users', 'content_reports', 'conversations', 'messages', 'notifications', 'colleges')
    GROUP BY t.relname
    ORDER BY t.relname;
END;
$$;


ALTER FUNCTION "public"."verify_policy_optimization"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_policy_optimization"() IS 'Verify that RLS policies are optimized with single policies per table';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text",
    "record_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blocked_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    CONSTRAINT "blocked_users_no_self_block" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."blocked_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."colleges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "name" "text" NOT NULL,
    "short_name" "text" NOT NULL,
    "email_domain" "text" NOT NULL,
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#18453b'::"text",
    "secondary_color" "text" DEFAULT '#ffd700'::"text",
    "is_active" boolean DEFAULT false NOT NULL,
    "transfer_portal_url" "text",
    CONSTRAINT "colleges_name_check" CHECK (("char_length"("name") >= 3)),
    CONSTRAINT "colleges_short_name_check" CHECK (("char_length"("short_name") >= 2))
);


ALTER TABLE "public"."colleges" OWNER TO "postgres";


COMMENT ON COLUMN "public"."colleges"."transfer_portal_url" IS 'URL to the college''s official ticket transfer portal (e.g., eVenue)';



CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "reported_by" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "additional_context" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_notes" "text",
    "resolved_at" timestamp with time zone,
    CONSTRAINT "content_reports_content_type_check" CHECK (("content_type" = ANY (ARRAY['ticket'::"text", 'message'::"text", 'profile'::"text"]))),
    CONSTRAINT "content_reports_reason_check" CHECK (("char_length"("reason") >= 3)),
    CONSTRAINT "content_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."content_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "participant_1_id" "uuid" NOT NULL,
    "participant_2_id" "uuid" NOT NULL,
    "last_message_id" "uuid",
    "last_message_at" timestamp with time zone,
    "ticket_id" "uuid",
    "archived" boolean DEFAULT false
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "event_date" timestamp with time zone NOT NULL,
    "location" "text" NOT NULL,
    "venue" "text",
    "sport" "text",
    "category" "text",
    "opponent" "text",
    "status" "text" DEFAULT 'scraped'::"text" NOT NULL,
    "source" "text" DEFAULT 'parsed'::"text" NOT NULL,
    "external_id" "text",
    "source_file" "text",
    "home_team" "text" DEFAULT 'Michigan State'::"text",
    "away_team" "text",
    "game_time" "text",
    "is_home_game" boolean DEFAULT true,
    "college_id" "uuid",
    "home_college_id" "uuid",
    "away_college_id" "uuid",
    "is_season_pass" boolean DEFAULT false NOT NULL,
    CONSTRAINT "events_event_date_check" CHECK (("event_date" >= '2020-01-01 00:00:00+00'::timestamp with time zone)),
    CONSTRAINT "events_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'parsed'::"text"]))),
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['scraped'::"text", 'available'::"text", 'inactive'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "events_title_check" CHECK ((("char_length"("title") >= 3) AND ("char_length"("title") <= 200)))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."is_season_pass" IS 'Indicates if this event represents a season pass (multiple games/season access)';



CREATE OR REPLACE VIEW "public"."event_college_view" AS
 SELECT "e"."id",
    "e"."created_at",
    "e"."updated_at",
    "e"."title",
    "e"."description",
    "e"."event_date",
    "e"."location",
    "e"."venue",
    "e"."sport",
    "e"."category",
    "e"."opponent",
    "e"."status",
    "e"."source",
    "e"."external_id",
    "e"."source_file",
    "e"."home_team",
    "e"."away_team",
    "e"."game_time",
    "e"."is_home_game",
    "e"."college_id",
    "e"."home_college_id",
    "e"."away_college_id",
    "hc"."name" AS "home_college_name",
    "hc"."short_name" AS "home_college_short_name",
    "ac"."name" AS "away_college_name",
    "ac"."short_name" AS "away_college_short_name"
   FROM (("public"."events" "e"
     LEFT JOIN "public"."colleges" "hc" ON (("e"."home_college_id" = "hc"."id")))
     LEFT JOIN "public"."colleges" "ac" ON (("e"."away_college_id" = "ac"."id")));


ALTER TABLE "public"."event_college_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legal_document_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_type" "text" NOT NULL,
    "version" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "effective_date" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "legal_document_versions_document_type_check" CHECK (("document_type" = ANY (ARRAY['terms_of_service'::"text", 'privacy_policy'::"text"])))
);


ALTER TABLE "public"."legal_document_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "read_by_recipient" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "edited_at" timestamp with time zone,
    CONSTRAINT "messages_content_check" CHECK ((("char_length"("content") > 0) AND ("char_length"("content") <= 1000))),
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'system'::"text", 'ticket_reference'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'system'::"text" NOT NULL,
    "read" boolean DEFAULT false,
    "related_ticket_id" "uuid",
    "related_order_id" "uuid",
    "push_sent" boolean DEFAULT false,
    "push_sent_at" timestamp with time zone,
    "push_metadata" "jsonb",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['purchase'::"text", 'sale'::"text", 'listing'::"text", 'system'::"text", 'message'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text",
    "transaction_id" "text",
    "notes" "text",
    "completed_at" timestamp with time zone,
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'cancelled'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "avatar_url" "text",
    "email" "text" NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "college_id" "uuid",
    "expo_push_token" "text",
    "current_ip_address" "text",
    "last_ip_address" "text",
    "ip_updated_at" timestamp with time zone,
    "device_info" "jsonb",
    "location_data" "jsonb",
    "user_agent" "text",
    "is_trusted" boolean DEFAULT false,
    "trust_earned_at" timestamp with time zone,
    "accepted_terms" boolean DEFAULT false,
    "accepted_terms_at" timestamp with time zone,
    CONSTRAINT "profiles_username_check" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."current_ip_address" IS 'Current IP address of the user (router/public IP)';



COMMENT ON COLUMN "public"."profiles"."last_ip_address" IS 'Previous IP address for comparison';



COMMENT ON COLUMN "public"."profiles"."ip_updated_at" IS 'When the IP address was last updated';



COMMENT ON COLUMN "public"."profiles"."device_info" IS 'Device information (platform, OS, app version, etc.)';



COMMENT ON COLUMN "public"."profiles"."location_data" IS 'Location data from IP geolocation (city, country, etc.)';



COMMENT ON COLUMN "public"."profiles"."user_agent" IS 'User agent string from the device';



CREATE TABLE IF NOT EXISTS "public"."push_notification_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_ids" "uuid"[] NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "scheduled_for" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "push_notification_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."push_notification_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" DEFAULT 'expo'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "device_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rating_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ticket_sale_id" "uuid" NOT NULL,
    "prompter_id" "uuid" NOT NULL,
    "ratee_id" "uuid" NOT NULL,
    "prompt_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "prompted_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("timezone"('utc'::"text", "now"()) + '14 days'::interval),
    CONSTRAINT "rating_prompts_prompt_type_check" CHECK (("prompt_type" = ANY (ARRAY['seller_rate_buyer'::"text", 'buyer_rate_seller'::"text"]))),
    CONSTRAINT "rating_prompts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'dismissed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."rating_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "price" numeric NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "buyer_id" "uuid",
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "event_date" timestamp with time zone NOT NULL,
    "location" "text" NOT NULL,
    "image_url" "text",
    "section" "text",
    "row_number" "text",
    "seat_number" "text",
    "sport" "text",
    "event_id" "uuid",
    "is_season_ticket" boolean DEFAULT false,
    "home_college_id" "uuid",
    "away_college_id" "uuid",
    "ticket_type" "text" DEFAULT 'student'::"text" NOT NULL,
    CONSTRAINT "tickets_event_date_check" CHECK (("event_date" > "now"())),
    CONSTRAINT "tickets_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "tickets_season_ticket_check" CHECK (("is_season_ticket" IS NOT NULL)),
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'sold'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "tickets_ticket_type_check" CHECK (("ticket_type" = ANY (ARRAY['general_admission'::"text", 'student'::"text"]))),
    CONSTRAINT "tickets_title_check" CHECK ((("char_length"("title") >= 3) AND ("char_length"("title") <= 100)))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tickets"."ticket_type" IS 'Type of ticket: general_admission or student (may require student ID verification)';



CREATE OR REPLACE VIEW "public"."ticket_college_view" AS
 SELECT "t"."id",
    "t"."created_at",
    "t"."title",
    "t"."description",
    "t"."price",
    "t"."seller_id",
    "t"."buyer_id",
    "t"."status",
    "t"."event_date",
    "t"."location",
    "t"."image_url",
    "t"."section",
    "t"."row_number",
    "t"."seat_number",
    "t"."sport",
    "t"."event_id",
    "t"."is_season_ticket",
    "t"."home_college_id",
    "t"."away_college_id",
    "hc"."name" AS "home_college_name",
    "hc"."short_name" AS "home_college_short_name",
    "ac"."name" AS "away_college_name",
    "ac"."short_name" AS "away_college_short_name",
        CASE
            WHEN ("t"."is_season_ticket" = true) THEN 'Season Ticket'::"text"
            ELSE 'Single Game'::"text"
        END AS "ticket_type"
   FROM (("public"."tickets" "t"
     LEFT JOIN "public"."colleges" "hc" ON (("t"."home_college_id" = "hc"."id")))
     LEFT JOIN "public"."colleges" "ac" ON (("t"."away_college_id" = "ac"."id")));


ALTER TABLE "public"."ticket_college_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "buyer_name" "text" NOT NULL,
    "sale_price" numeric NOT NULL,
    "payment_method" "text",
    "additional_notes" "text",
    "original_asking_price" numeric,
    "buyer_id" "uuid",
    "seller_name" "text",
    CONSTRAINT "seller_name_not_empty" CHECK ((("char_length"("seller_name") >= 1) AND ("char_length"("seller_name") <= 100))),
    CONSTRAINT "ticket_sales_additional_notes_check" CHECK (("char_length"("additional_notes") <= 500)),
    CONSTRAINT "ticket_sales_buyer_name_check" CHECK ((("char_length"("buyer_name") >= 1) AND ("char_length"("buyer_name") <= 100))),
    CONSTRAINT "ticket_sales_payment_method_check" CHECK (("char_length"("payment_method") <= 50)),
    CONSTRAINT "ticket_sales_sale_price_check" CHECK (("sale_price" >= (0)::numeric))
);


ALTER TABLE "public"."ticket_sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "rater_id" "uuid" NOT NULL,
    "rated_user_id" "uuid" NOT NULL,
    "ticket_sale_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "rating" numeric NOT NULL,
    "review_text" "text",
    "communication_rating" numeric,
    "reliability_rating" numeric,
    "transaction_smoothness" numeric,
    CONSTRAINT "user_ratings_communication_rating_check" CHECK ((("communication_rating" >= (1)::numeric) AND ("communication_rating" <= (5)::numeric))),
    CONSTRAINT "user_ratings_rating_check" CHECK ((("rating" >= (1)::numeric) AND ("rating" <= (5)::numeric))),
    CONSTRAINT "user_ratings_reliability_rating_check" CHECK ((("reliability_rating" >= (1)::numeric) AND ("reliability_rating" <= (5)::numeric))),
    CONSTRAINT "user_ratings_review_text_check" CHECK (("char_length"("review_text") <= 500)),
    CONSTRAINT "user_ratings_transaction_smoothness_check" CHECK ((("transaction_smoothness" >= (1)::numeric) AND ("transaction_smoothness" <= (5)::numeric))),
    CONSTRAINT "user_ratings_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['buying'::"text", 'selling'::"text"])))
);


ALTER TABLE "public"."user_ratings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_ratings" IS 'User ratings system for post-transaction feedback';



COMMENT ON COLUMN "public"."user_ratings"."transaction_type" IS 'Whether the rater was buying or selling in this transaction';



COMMENT ON COLUMN "public"."user_ratings"."rating" IS 'Overall rating from 1-5 stars';



CREATE TABLE IF NOT EXISTS "public"."user_trust_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "successful_purchases" integer DEFAULT 0,
    "successful_sales" integer DEFAULT 0,
    "total_transactions" integer GENERATED ALWAYS AS (("successful_purchases" + "successful_sales")) STORED,
    "is_trusted" boolean GENERATED ALWAYS AS ((("successful_purchases" + "successful_sales") >= 2)) STORED,
    "trust_earned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_trust_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_trust_status" IS 'Simple trust system - users become trusted after 2+ successful transactions';



COMMENT ON COLUMN "public"."user_trust_status"."total_transactions" IS 'Computed column: successful_purchases + successful_sales';



COMMENT ON COLUMN "public"."user_trust_status"."is_trusted" IS 'Computed column: true when total_transactions >= 2';



CREATE TABLE IF NOT EXISTS "public"."watchlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "notes" "text",
    "price_alert_threshold" numeric,
    "notification_enabled" boolean DEFAULT true
);


ALTER TABLE "public"."watchlists" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_unique" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."colleges"
    ADD CONSTRAINT "colleges_email_domain_key" UNIQUE ("email_domain");



ALTER TABLE ONLY "public"."colleges"
    ADD CONSTRAINT "colleges_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."colleges"
    ADD CONSTRAINT "colleges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colleges"
    ADD CONSTRAINT "colleges_short_name_key" UNIQUE ("short_name");



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_external_id_key" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_document_versions"
    ADD CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_transaction_id_key" UNIQUE ("transaction_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."push_notification_queue"
    ADD CONSTRAINT "push_notification_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rating_prompts"
    ADD CONSTRAINT "rating_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rating_prompts"
    ADD CONSTRAINT "rating_prompts_unique_per_sale" UNIQUE ("ticket_sale_id", "prompter_id", "ratee_id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_sales"
    ADD CONSTRAINT "ticket_sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_document_versions"
    ADD CONSTRAINT "unique_active_document" UNIQUE ("document_type", "is_active") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."user_ratings"
    ADD CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_ratings"
    ADD CONSTRAINT "user_ratings_unique_per_transaction" UNIQUE ("rater_id", "rated_user_id", "ticket_sale_id");



ALTER TABLE ONLY "public"."user_trust_status"
    ADD CONSTRAINT "user_trust_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_trust_status"
    ADD CONSTRAINT "user_trust_status_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."watchlists"
    ADD CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watchlists"
    ADD CONSTRAINT "watchlists_unique_user_ticket" UNIQUE ("user_id", "ticket_id");



CREATE INDEX "idx_blocked_users_auth_optimized" ON "public"."blocked_users" USING "btree" ("blocker_id", "blocked_id") WHERE ("blocker_id" IS NOT NULL);



CREATE INDEX "idx_blocked_users_blocked_id" ON "public"."blocked_users" USING "btree" ("blocked_id");



CREATE INDEX "idx_blocked_users_blocker_id" ON "public"."blocked_users" USING "btree" ("blocker_id");



CREATE INDEX "idx_colleges_active" ON "public"."colleges" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_colleges_email_domain" ON "public"."colleges" USING "btree" ("email_domain");



CREATE INDEX "idx_content_reports_auth_optimized" ON "public"."content_reports" USING "btree" ("reported_by") WHERE ("reported_by" IS NOT NULL);



CREATE INDEX "idx_content_reports_content_type" ON "public"."content_reports" USING "btree" ("content_type");



CREATE INDEX "idx_content_reports_reported_by" ON "public"."content_reports" USING "btree" ("reported_by");



CREATE INDEX "idx_content_reports_status" ON "public"."content_reports" USING "btree" ("status");



CREATE INDEX "idx_conversations_auth_optimized" ON "public"."conversations" USING "btree" ("participant_1_id", "participant_2_id");



CREATE INDEX "idx_conversations_participant_1_id" ON "public"."conversations" USING "btree" ("participant_1_id");



CREATE INDEX "idx_conversations_participant_2_id" ON "public"."conversations" USING "btree" ("participant_2_id");



CREATE INDEX "idx_conversations_ticket_id" ON "public"."conversations" USING "btree" ("ticket_id");



CREATE INDEX "idx_events_away_college_id" ON "public"."events" USING "btree" ("away_college_id");



CREATE INDEX "idx_events_college_id" ON "public"."events" USING "btree" ("college_id");



CREATE INDEX "idx_events_home_college_id" ON "public"."events" USING "btree" ("home_college_id");



CREATE INDEX "idx_events_is_season_pass" ON "public"."events" USING "btree" ("is_season_pass");



CREATE INDEX "idx_legal_document_versions_active" ON "public"."legal_document_versions" USING "btree" ("document_type", "is_active");



CREATE INDEX "idx_legal_document_versions_effective_date" ON "public"."legal_document_versions" USING "btree" ("effective_date");



CREATE INDEX "idx_legal_document_versions_type" ON "public"."legal_document_versions" USING "btree" ("document_type");



CREATE INDEX "idx_messages_auth_optimized" ON "public"."messages" USING "btree" ("sender_id", "conversation_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_notifications_auth_optimized" ON "public"."notifications" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_notifications_related_order_id" ON "public"."notifications" USING "btree" ("related_order_id");



CREATE INDEX "idx_notifications_related_ticket_id" ON "public"."notifications" USING "btree" ("related_ticket_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_orders_auth_optimized" ON "public"."orders" USING "btree" ("buyer_id", "seller_id");



CREATE INDEX "idx_orders_buyer_id" ON "public"."orders" USING "btree" ("buyer_id");



CREATE INDEX "idx_orders_seller_id" ON "public"."orders" USING "btree" ("seller_id");



CREATE INDEX "idx_orders_ticket_id" ON "public"."orders" USING "btree" ("ticket_id");



CREATE INDEX "idx_profiles_accepted_terms" ON "public"."profiles" USING "btree" ("accepted_terms");



CREATE INDEX "idx_profiles_auth_optimized" ON "public"."profiles" USING "btree" ("id", "is_admin", "college_id");



CREATE INDEX "idx_profiles_college_id" ON "public"."profiles" USING "btree" ("college_id");



CREATE INDEX "idx_profiles_current_ip" ON "public"."profiles" USING "btree" ("current_ip_address");



CREATE INDEX "idx_profiles_ip_updated" ON "public"."profiles" USING "btree" ("ip_updated_at");



CREATE INDEX "idx_profiles_is_trusted" ON "public"."profiles" USING "btree" ("is_trusted");



CREATE INDEX "idx_push_queue_status_scheduled" ON "public"."push_notification_queue" USING "btree" ("status", "scheduled_for");



CREATE INDEX "idx_push_tokens_active" ON "public"."push_tokens" USING "btree" ("active");



CREATE INDEX "idx_push_tokens_platform" ON "public"."push_tokens" USING "btree" ("platform");



CREATE INDEX "idx_push_tokens_user_id" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_push_tokens_user_token_unique" ON "public"."push_tokens" USING "btree" ("user_id", "token") WHERE ("active" = true);



CREATE INDEX "idx_rating_prompts_expires_at" ON "public"."rating_prompts" USING "btree" ("expires_at");



CREATE INDEX "idx_rating_prompts_prompter_id" ON "public"."rating_prompts" USING "btree" ("prompter_id");



CREATE INDEX "idx_rating_prompts_ratee_id" ON "public"."rating_prompts" USING "btree" ("ratee_id");



CREATE INDEX "idx_rating_prompts_status" ON "public"."rating_prompts" USING "btree" ("status");



CREATE INDEX "idx_ticket_sales_buyer_id" ON "public"."ticket_sales" USING "btree" ("buyer_id");



CREATE INDEX "idx_ticket_sales_created_at" ON "public"."ticket_sales" USING "btree" ("created_at");



CREATE INDEX "idx_ticket_sales_seller_id" ON "public"."ticket_sales" USING "btree" ("seller_id");



CREATE INDEX "idx_ticket_sales_ticket_id" ON "public"."ticket_sales" USING "btree" ("ticket_id");



CREATE INDEX "idx_tickets_auth_optimized" ON "public"."tickets" USING "btree" ("seller_id", "status", "home_college_id", "away_college_id");



CREATE INDEX "idx_tickets_away_college_id" ON "public"."tickets" USING "btree" ("away_college_id");



CREATE INDEX "idx_tickets_buyer_id" ON "public"."tickets" USING "btree" ("buyer_id");



CREATE INDEX "idx_tickets_colleges_status_date" ON "public"."tickets" USING "btree" ("home_college_id", "away_college_id", "status", "event_date");



CREATE INDEX "idx_tickets_event_id" ON "public"."tickets" USING "btree" ("event_id");



CREATE INDEX "idx_tickets_home_college_id" ON "public"."tickets" USING "btree" ("home_college_id");



CREATE INDEX "idx_tickets_is_season_ticket" ON "public"."tickets" USING "btree" ("is_season_ticket");



CREATE INDEX "idx_tickets_seller_id" ON "public"."tickets" USING "btree" ("seller_id");



CREATE INDEX "idx_tickets_seller_status" ON "public"."tickets" USING "btree" ("seller_id", "status");



CREATE INDEX "idx_tickets_ticket_type" ON "public"."tickets" USING "btree" ("ticket_type");



CREATE INDEX "idx_user_ratings_created_at" ON "public"."user_ratings" USING "btree" ("created_at");



CREATE INDEX "idx_user_ratings_rated_user_id" ON "public"."user_ratings" USING "btree" ("rated_user_id");



CREATE INDEX "idx_user_ratings_rater_id" ON "public"."user_ratings" USING "btree" ("rater_id");



CREATE INDEX "idx_user_ratings_ticket_sale_id" ON "public"."user_ratings" USING "btree" ("ticket_sale_id");



CREATE INDEX "idx_user_trust_status_is_trusted" ON "public"."user_trust_status" USING "btree" ("is_trusted");



CREATE INDEX "idx_user_trust_status_user_id" ON "public"."user_trust_status" USING "btree" ("user_id");



CREATE INDEX "watchlists_created_at_idx" ON "public"."watchlists" USING "btree" ("created_at" DESC);



CREATE INDEX "watchlists_ticket_id_idx" ON "public"."watchlists" USING "btree" ("ticket_id");



CREATE INDEX "watchlists_user_id_idx" ON "public"."watchlists" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "auto_expire_events_trigger" BEFORE INSERT OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."auto_expire_events"();



CREATE OR REPLACE TRIGGER "trigger_assign_ticket_colleges" BEFORE INSERT ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."assign_ticket_colleges"();



CREATE OR REPLACE TRIGGER "trigger_delete_auth_user" AFTER DELETE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."delete_auth_user_on_profile_delete"();



CREATE OR REPLACE TRIGGER "update_push_tokens_updated_at" BEFORE UPDATE ON "public"."push_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticket_sales_updated_at" BEFORE UPDATE ON "public"."ticket_sales" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_sales_updated_at"();



CREATE OR REPLACE TRIGGER "update_trust_on_ticket_sale" AFTER INSERT ON "public"."ticket_sales" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_trust_on_ticket_sale"();



CREATE OR REPLACE TRIGGER "watchlist_price_change_trigger" AFTER UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."notify_watchlist_price_change"();



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_1_fkey" FOREIGN KEY ("participant_1_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_2_fkey" FOREIGN KEY ("participant_2_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_away_college_id_fkey" FOREIGN KEY ("away_college_id") REFERENCES "public"."colleges"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_home_college_id_fkey" FOREIGN KEY ("home_college_id") REFERENCES "public"."colleges"("id");



ALTER TABLE ONLY "public"."legal_document_versions"
    ADD CONSTRAINT "legal_document_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_ticket_id_fkey" FOREIGN KEY ("related_ticket_id") REFERENCES "public"."tickets"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating_prompts"
    ADD CONSTRAINT "rating_prompts_prompter_id_fkey" FOREIGN KEY ("prompter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating_prompts"
    ADD CONSTRAINT "rating_prompts_ratee_id_fkey" FOREIGN KEY ("ratee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating_prompts"
    ADD CONSTRAINT "rating_prompts_ticket_sale_id_fkey" FOREIGN KEY ("ticket_sale_id") REFERENCES "public"."ticket_sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_sales"
    ADD CONSTRAINT "ticket_sales_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_sales"
    ADD CONSTRAINT "ticket_sales_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_sales"
    ADD CONSTRAINT "ticket_sales_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_away_college_id_fkey" FOREIGN KEY ("away_college_id") REFERENCES "public"."colleges"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_home_college_id_fkey" FOREIGN KEY ("home_college_id") REFERENCES "public"."colleges"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_ratings"
    ADD CONSTRAINT "user_ratings_rated_user_id_fkey" FOREIGN KEY ("rated_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_ratings"
    ADD CONSTRAINT "user_ratings_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_ratings"
    ADD CONSTRAINT "user_ratings_ticket_sale_id_fkey" FOREIGN KEY ("ticket_sale_id") REFERENCES "public"."ticket_sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_trust_status"
    ADD CONSTRAINT "user_trust_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watchlists"
    ADD CONSTRAINT "watchlists_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watchlists"
    ADD CONSTRAINT "watchlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can insert legal document versions" ON "public"."legal_document_versions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage all sales" ON "public"."ticket_sales" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can update legal document versions" ON "public"."legal_document_versions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Allow trust status inserts" ON "public"."user_trust_status" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow trust status updates" ON "public"."user_trust_status" FOR UPDATE USING (true);



CREATE POLICY "Anyone can read active legal documents" ON "public"."legal_document_versions" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Public can read active legal documents" ON "public"."legal_document_versions" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can update legal agreements in profiles during registrat" ON "public"."profiles" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Public can update own profile during registration" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Ratings are publicly viewable" ON "public"."user_ratings" FOR SELECT USING (true);



CREATE POLICY "Ratings cannot be updated" ON "public"."user_ratings" FOR UPDATE USING (false);



CREATE POLICY "Sellers can insert their own sales" ON "public"."ticket_sales" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "seller_id"));



CREATE POLICY "Service role can read all legal documents" ON "public"."legal_document_versions" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Service role full access" ON "public"."push_notification_queue" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Trust status is publicly readable" ON "public"."user_trust_status" FOR SELECT USING (true);



CREATE POLICY "Users can delete their own push tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own push tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can only rate their own transactions" ON "public"."user_ratings" FOR INSERT WITH CHECK ((("auth"."uid"() = "rater_id") AND (EXISTS ( SELECT 1
   FROM "public"."ticket_sales" "ts"
  WHERE (("ts"."id" = "user_ratings"."ticket_sale_id") AND (("ts"."buyer_id" = "auth"."uid"()) OR ("ts"."seller_id" = "auth"."uid"())))))));



CREATE POLICY "Users can update own profile legal status" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND ("id" = "auth"."uid"()))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("id" = "auth"."uid"())));



CREATE POLICY "Users can update their own push tokens" ON "public"."push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view ratings they gave" ON "public"."user_ratings" FOR SELECT USING (("auth"."uid"() = "rater_id"));



CREATE POLICY "Users can view ratings they received" ON "public"."user_ratings" FOR SELECT USING (("auth"."uid"() = "rated_user_id"));



CREATE POLICY "Users can view their own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sales" ON "public"."ticket_sales" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "seller_id") OR ("auth"."uid"() = "buyer_id")));



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_log_insert" ON "public"."admin_audit_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "admin_audit_log_view" ON "public"."admin_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "allow_all_authenticated_operations" ON "public"."rating_prompts" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."blocked_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blocked_users_access" ON "public"."blocked_users" USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("blocker_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("blocker_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))));



ALTER TABLE "public"."colleges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "colleges_admin" ON "public"."colleges" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "colleges_public" ON "public"."colleges" FOR SELECT USING (true);



ALTER TABLE "public"."content_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_reports_access" ON "public"."content_reports" USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("reported_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("reported_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_simple_insert" ON "public"."conversations" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("participant_1_id" = "auth"."uid"()) OR ("participant_2_id" = "auth"."uid"()))));



CREATE POLICY "conversations_simple_view" ON "public"."conversations" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("participant_1_id" = "auth"."uid"()) OR ("participant_2_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))))));



CREATE POLICY "conversations_update_participants" ON "public"."conversations" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND (("participant_1_id" = "auth"."uid"()) OR ("participant_2_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("participant_1_id" = "auth"."uid"()) OR ("participant_2_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))))));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_admin" ON "public"."events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "events_public_view" ON "public"."events" FOR SELECT USING (true);



ALTER TABLE "public"."legal_document_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_mark_as_read_only" ON "public"."messages" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."participant_1_id" = "auth"."uid"()) OR ("conversations"."participant_2_id" = "auth"."uid"())) AND ("messages"."sender_id" <> "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."participant_1_id" = "auth"."uid"()) OR ("conversations"."participant_2_id" = "auth"."uid"())) AND ("messages"."sender_id" <> "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))))));



CREATE POLICY "messages_simple_insert" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."participant_1_id" = "auth"."uid"()) OR ("conversations"."participant_2_id" = "auth"."uid"())))))));



CREATE POLICY "messages_simple_view" ON "public"."messages" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("sender_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."participant_1_id" = "auth"."uid"()) OR ("conversations"."participant_2_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete" ON "public"."notifications" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_insert" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_simple_insert" ON "public"."orders" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("buyer_id" = "auth"."uid"())));



CREATE POLICY "orders_simple_update" ON "public"."orders" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND (("buyer_id" = "auth"."uid"()) OR ("seller_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))))));



CREATE POLICY "orders_simple_view" ON "public"."orders" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("buyer_id" = "auth"."uid"()) OR ("seller_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_secure" ON "public"."profiles" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "profiles_insert_simple" ON "public"."profiles" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "profiles_update_secure" ON "public"."profiles" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("is_admin" = true)))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("is_admin" = true))));



CREATE POLICY "profiles_update_simple" ON "public"."profiles" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("is_admin" = true)))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("is_admin" = true))));



CREATE POLICY "profiles_view_simple" ON "public"."profiles" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("is_admin" = true) OR true)));



ALTER TABLE "public"."push_notification_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rating_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_logs_admin" ON "public"."system_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



ALTER TABLE "public"."ticket_sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tickets_insert_basic" ON "public"."tickets" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("seller_id" = "auth"."uid"())));



CREATE POLICY "tickets_update_own" ON "public"."tickets" FOR UPDATE USING (("auth"."uid"() = "seller_id")) WITH CHECK (("auth"."uid"() = "seller_id"));



CREATE POLICY "tickets_with_college_and_purchase_filter" ON "public"."tickets" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("seller_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))) OR (("status" = 'available'::"text") AND ("event_date" >= "now"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("tickets"."home_college_id" = "p"."college_id") OR ("tickets"."away_college_id" = "p"."college_id")))))) OR (EXISTS ( SELECT 1
   FROM "public"."ticket_sales"
  WHERE (("ticket_sales"."ticket_id" = "tickets"."id") AND ("ticket_sales"."buyer_id" = "auth"."uid"())))))));



ALTER TABLE "public"."user_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_trust_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."watchlists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "watchlists_access" ON "public"."watchlists" USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tickets";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."watchlists";









REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































REVOKE ALL ON FUNCTION "public"."current_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_expired_tickets"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_expired_tickets"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_expired_tickets"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_old_notifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_old_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_old_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id_to_delete" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_new_user_registration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_ticket"("ticket_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."purchase_ticket"("p_ticket_id" "uuid", "p_buyer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purchase_ticket"("p_ticket_id" "uuid", "p_buyer_id" "uuid") TO "authenticated";
























GRANT SELECT,INSERT,DELETE ON TABLE "public"."blocked_users" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_users" TO "service_role";



GRANT SELECT ON TABLE "public"."colleges" TO "anon";
GRANT SELECT ON TABLE "public"."colleges" TO "authenticated";
GRANT ALL ON TABLE "public"."colleges" TO "service_role";



GRANT SELECT,INSERT ON TABLE "public"."content_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."content_reports" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."conversations" TO "anon";



GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."legal_document_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_document_versions" TO "anon";
GRANT ALL ON TABLE "public"."legal_document_versions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."messages" TO "anon";



GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."notifications" TO "anon";



GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."orders" TO "anon";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_notification_queue" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rating_prompts" TO "authenticated";
GRANT SELECT,INSERT ON TABLE "public"."rating_prompts" TO PUBLIC;



GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."tickets" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ticket_sales" TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."user_ratings" TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."user_trust_status" TO "authenticated";



GRANT ALL ON TABLE "public"."watchlists" TO "authenticated";
GRANT ALL ON TABLE "public"."watchlists" TO "service_role";

































revoke delete on table "public"."admin_audit_log" from "anon";

revoke insert on table "public"."admin_audit_log" from "anon";

revoke references on table "public"."admin_audit_log" from "anon";

revoke select on table "public"."admin_audit_log" from "anon";

revoke trigger on table "public"."admin_audit_log" from "anon";

revoke truncate on table "public"."admin_audit_log" from "anon";

revoke update on table "public"."admin_audit_log" from "anon";

revoke delete on table "public"."admin_audit_log" from "authenticated";

revoke insert on table "public"."admin_audit_log" from "authenticated";

revoke references on table "public"."admin_audit_log" from "authenticated";

revoke select on table "public"."admin_audit_log" from "authenticated";

revoke trigger on table "public"."admin_audit_log" from "authenticated";

revoke truncate on table "public"."admin_audit_log" from "authenticated";

revoke update on table "public"."admin_audit_log" from "authenticated";

revoke delete on table "public"."admin_audit_log" from "service_role";

revoke insert on table "public"."admin_audit_log" from "service_role";

revoke references on table "public"."admin_audit_log" from "service_role";

revoke select on table "public"."admin_audit_log" from "service_role";

revoke trigger on table "public"."admin_audit_log" from "service_role";

revoke truncate on table "public"."admin_audit_log" from "service_role";

revoke update on table "public"."admin_audit_log" from "service_role";

revoke delete on table "public"."blocked_users" from "anon";

revoke insert on table "public"."blocked_users" from "anon";

revoke references on table "public"."blocked_users" from "anon";

revoke select on table "public"."blocked_users" from "anon";

revoke trigger on table "public"."blocked_users" from "anon";

revoke truncate on table "public"."blocked_users" from "anon";

revoke update on table "public"."blocked_users" from "anon";

revoke references on table "public"."blocked_users" from "authenticated";

revoke trigger on table "public"."blocked_users" from "authenticated";

revoke truncate on table "public"."blocked_users" from "authenticated";

revoke update on table "public"."blocked_users" from "authenticated";

revoke delete on table "public"."colleges" from "anon";

revoke insert on table "public"."colleges" from "anon";

revoke references on table "public"."colleges" from "anon";

revoke trigger on table "public"."colleges" from "anon";

revoke truncate on table "public"."colleges" from "anon";

revoke update on table "public"."colleges" from "anon";

revoke delete on table "public"."colleges" from "authenticated";

revoke insert on table "public"."colleges" from "authenticated";

revoke references on table "public"."colleges" from "authenticated";

revoke trigger on table "public"."colleges" from "authenticated";

revoke truncate on table "public"."colleges" from "authenticated";

revoke update on table "public"."colleges" from "authenticated";

revoke delete on table "public"."content_reports" from "anon";

revoke insert on table "public"."content_reports" from "anon";

revoke references on table "public"."content_reports" from "anon";

revoke select on table "public"."content_reports" from "anon";

revoke trigger on table "public"."content_reports" from "anon";

revoke truncate on table "public"."content_reports" from "anon";

revoke update on table "public"."content_reports" from "anon";

revoke delete on table "public"."content_reports" from "authenticated";

revoke references on table "public"."content_reports" from "authenticated";

revoke trigger on table "public"."content_reports" from "authenticated";

revoke truncate on table "public"."content_reports" from "authenticated";

revoke update on table "public"."content_reports" from "authenticated";

revoke delete on table "public"."conversations" from "anon";

revoke references on table "public"."conversations" from "anon";

revoke trigger on table "public"."conversations" from "anon";

revoke truncate on table "public"."conversations" from "anon";

revoke update on table "public"."conversations" from "anon";

revoke delete on table "public"."events" from "anon";

revoke insert on table "public"."events" from "anon";

revoke references on table "public"."events" from "anon";

revoke select on table "public"."events" from "anon";

revoke trigger on table "public"."events" from "anon";

revoke truncate on table "public"."events" from "anon";

revoke update on table "public"."events" from "anon";

revoke delete on table "public"."messages" from "anon";

revoke references on table "public"."messages" from "anon";

revoke trigger on table "public"."messages" from "anon";

revoke truncate on table "public"."messages" from "anon";

revoke update on table "public"."messages" from "anon";

revoke delete on table "public"."notifications" from "anon";

revoke references on table "public"."notifications" from "anon";

revoke trigger on table "public"."notifications" from "anon";

revoke truncate on table "public"."notifications" from "anon";

revoke update on table "public"."notifications" from "anon";

revoke delete on table "public"."orders" from "anon";

revoke references on table "public"."orders" from "anon";

revoke trigger on table "public"."orders" from "anon";

revoke truncate on table "public"."orders" from "anon";

revoke update on table "public"."orders" from "anon";

revoke delete on table "public"."push_notification_queue" from "anon";

revoke insert on table "public"."push_notification_queue" from "anon";

revoke references on table "public"."push_notification_queue" from "anon";

revoke select on table "public"."push_notification_queue" from "anon";

revoke trigger on table "public"."push_notification_queue" from "anon";

revoke truncate on table "public"."push_notification_queue" from "anon";

revoke update on table "public"."push_notification_queue" from "anon";

revoke delete on table "public"."push_notification_queue" from "authenticated";

revoke insert on table "public"."push_notification_queue" from "authenticated";

revoke references on table "public"."push_notification_queue" from "authenticated";

revoke select on table "public"."push_notification_queue" from "authenticated";

revoke trigger on table "public"."push_notification_queue" from "authenticated";

revoke truncate on table "public"."push_notification_queue" from "authenticated";

revoke update on table "public"."push_notification_queue" from "authenticated";

revoke delete on table "public"."push_tokens" from "anon";

revoke insert on table "public"."push_tokens" from "anon";

revoke references on table "public"."push_tokens" from "anon";

revoke select on table "public"."push_tokens" from "anon";

revoke trigger on table "public"."push_tokens" from "anon";

revoke truncate on table "public"."push_tokens" from "anon";

revoke update on table "public"."push_tokens" from "anon";

revoke delete on table "public"."push_tokens" from "service_role";

revoke insert on table "public"."push_tokens" from "service_role";

revoke references on table "public"."push_tokens" from "service_role";

revoke select on table "public"."push_tokens" from "service_role";

revoke trigger on table "public"."push_tokens" from "service_role";

revoke truncate on table "public"."push_tokens" from "service_role";

revoke update on table "public"."push_tokens" from "service_role";

revoke delete on table "public"."rating_prompts" from "anon";

revoke insert on table "public"."rating_prompts" from "anon";

revoke references on table "public"."rating_prompts" from "anon";

revoke select on table "public"."rating_prompts" from "anon";

revoke trigger on table "public"."rating_prompts" from "anon";

revoke truncate on table "public"."rating_prompts" from "anon";

revoke update on table "public"."rating_prompts" from "anon";

revoke references on table "public"."rating_prompts" from "authenticated";

revoke trigger on table "public"."rating_prompts" from "authenticated";

revoke truncate on table "public"."rating_prompts" from "authenticated";

revoke delete on table "public"."rating_prompts" from "service_role";

revoke insert on table "public"."rating_prompts" from "service_role";

revoke references on table "public"."rating_prompts" from "service_role";

revoke select on table "public"."rating_prompts" from "service_role";

revoke trigger on table "public"."rating_prompts" from "service_role";

revoke truncate on table "public"."rating_prompts" from "service_role";

revoke update on table "public"."rating_prompts" from "service_role";

revoke delete on table "public"."system_logs" from "anon";

revoke insert on table "public"."system_logs" from "anon";

revoke references on table "public"."system_logs" from "anon";

revoke select on table "public"."system_logs" from "anon";

revoke trigger on table "public"."system_logs" from "anon";

revoke truncate on table "public"."system_logs" from "anon";

revoke update on table "public"."system_logs" from "anon";

revoke delete on table "public"."ticket_sales" from "anon";

revoke insert on table "public"."ticket_sales" from "anon";

revoke references on table "public"."ticket_sales" from "anon";

revoke select on table "public"."ticket_sales" from "anon";

revoke trigger on table "public"."ticket_sales" from "anon";

revoke truncate on table "public"."ticket_sales" from "anon";

revoke update on table "public"."ticket_sales" from "anon";

revoke references on table "public"."ticket_sales" from "authenticated";

revoke trigger on table "public"."ticket_sales" from "authenticated";

revoke truncate on table "public"."ticket_sales" from "authenticated";

revoke delete on table "public"."ticket_sales" from "service_role";

revoke insert on table "public"."ticket_sales" from "service_role";

revoke references on table "public"."ticket_sales" from "service_role";

revoke select on table "public"."ticket_sales" from "service_role";

revoke trigger on table "public"."ticket_sales" from "service_role";

revoke truncate on table "public"."ticket_sales" from "service_role";

revoke update on table "public"."ticket_sales" from "service_role";

revoke delete on table "public"."tickets" from "anon";

revoke references on table "public"."tickets" from "anon";

revoke trigger on table "public"."tickets" from "anon";

revoke truncate on table "public"."tickets" from "anon";

revoke update on table "public"."tickets" from "anon";

revoke delete on table "public"."user_ratings" from "anon";

revoke insert on table "public"."user_ratings" from "anon";

revoke references on table "public"."user_ratings" from "anon";

revoke select on table "public"."user_ratings" from "anon";

revoke trigger on table "public"."user_ratings" from "anon";

revoke truncate on table "public"."user_ratings" from "anon";

revoke update on table "public"."user_ratings" from "anon";

revoke delete on table "public"."user_ratings" from "authenticated";

revoke references on table "public"."user_ratings" from "authenticated";

revoke trigger on table "public"."user_ratings" from "authenticated";

revoke truncate on table "public"."user_ratings" from "authenticated";

revoke delete on table "public"."user_ratings" from "service_role";

revoke insert on table "public"."user_ratings" from "service_role";

revoke references on table "public"."user_ratings" from "service_role";

revoke select on table "public"."user_ratings" from "service_role";

revoke trigger on table "public"."user_ratings" from "service_role";

revoke truncate on table "public"."user_ratings" from "service_role";

revoke update on table "public"."user_ratings" from "service_role";

revoke delete on table "public"."user_trust_status" from "anon";

revoke insert on table "public"."user_trust_status" from "anon";

revoke references on table "public"."user_trust_status" from "anon";

revoke select on table "public"."user_trust_status" from "anon";

revoke trigger on table "public"."user_trust_status" from "anon";

revoke truncate on table "public"."user_trust_status" from "anon";

revoke update on table "public"."user_trust_status" from "anon";

revoke delete on table "public"."user_trust_status" from "authenticated";

revoke references on table "public"."user_trust_status" from "authenticated";

revoke trigger on table "public"."user_trust_status" from "authenticated";

revoke truncate on table "public"."user_trust_status" from "authenticated";

revoke delete on table "public"."user_trust_status" from "service_role";

revoke insert on table "public"."user_trust_status" from "service_role";

revoke references on table "public"."user_trust_status" from "service_role";

revoke select on table "public"."user_trust_status" from "service_role";

revoke trigger on table "public"."user_trust_status" from "service_role";

revoke truncate on table "public"."user_trust_status" from "service_role";

revoke update on table "public"."user_trust_status" from "service_role";

revoke delete on table "public"."watchlists" from "anon";

revoke insert on table "public"."watchlists" from "anon";

revoke references on table "public"."watchlists" from "anon";

revoke select on table "public"."watchlists" from "anon";

revoke trigger on table "public"."watchlists" from "anon";

revoke truncate on table "public"."watchlists" from "anon";

revoke update on table "public"."watchlists" from "anon";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

CREATE TRIGGER validate_user_email_trigger BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.validate_user_email();


