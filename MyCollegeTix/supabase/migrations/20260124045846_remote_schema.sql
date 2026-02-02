drop policy "Users can update own disputes" on "public"."escrow_disputes";

drop policy "notifications_insert" on "public"."notifications";

drop policy "Public can update legal agreements in profiles during registrat" on "public"."profiles";

drop policy "profiles_view_simple" on "public"."profiles";

drop policy "Service can insert rating prompts" on "public"."rating_prompts";

drop policy "Allow trust status inserts" on "public"."user_trust_status";

drop policy "Allow trust status updates" on "public"."user_trust_status";

drop policy "conversations_simple_view" on "public"."conversations";

drop policy "conversations_update_participants" on "public"."conversations";

drop policy "Admins can view all escrow payments" on "public"."escrow_payments";

drop policy "messages_mark_as_read_only" on "public"."messages";

drop policy "messages_simple_insert" on "public"."messages";

drop policy "messages_simple_view" on "public"."messages";

drop policy "notifications_delete" on "public"."notifications";

drop policy "notifications_select" on "public"."notifications";

drop policy "notifications_update" on "public"."notifications";

drop policy "Service role full access" on "public"."push_notification_queue";

drop policy "Users can delete their own push tokens" on "public"."push_tokens";

drop policy "Users can insert their own push tokens" on "public"."push_tokens";

drop policy "Users can update their own push tokens" on "public"."push_tokens";

drop policy "Users can view their own push tokens" on "public"."push_tokens";

drop policy "Admins can manage all transfers" on "public"."seller_transfers";

drop policy "Sellers can view own transfers" on "public"."seller_transfers";

drop policy "Admins can view all stripe accounts" on "public"."stripe_accounts";

drop policy "Users can update own stripe account" on "public"."stripe_accounts";

drop policy "Users can view own stripe account" on "public"."stripe_accounts";

drop policy "Admins can manage all sales" on "public"."ticket_sales";

drop policy "Sellers can insert their own sales" on "public"."ticket_sales";

drop policy "Users can view their own sales" on "public"."ticket_sales";

drop policy "Admins can manage all ticket transfers" on "public"."ticket_transfers";

drop policy "Buyers can confirm receipt" on "public"."ticket_transfers";

drop policy "Sellers can update transfer status" on "public"."ticket_transfers";

drop policy "Users can view own ticket transfers" on "public"."ticket_transfers";

revoke insert on table "public"."notifications" from "authenticated";

revoke insert on table "public"."rating_prompts" from "authenticated";

revoke delete on table "public"."user_penalties" from "anon";

revoke insert on table "public"."user_penalties" from "anon";

revoke references on table "public"."user_penalties" from "anon";

revoke select on table "public"."user_penalties" from "anon";

revoke trigger on table "public"."user_penalties" from "anon";

revoke truncate on table "public"."user_penalties" from "anon";

revoke update on table "public"."user_penalties" from "anon";

revoke delete on table "public"."user_penalties" from "authenticated";

revoke insert on table "public"."user_penalties" from "authenticated";

revoke references on table "public"."user_penalties" from "authenticated";

revoke select on table "public"."user_penalties" from "authenticated";

revoke trigger on table "public"."user_penalties" from "authenticated";

revoke truncate on table "public"."user_penalties" from "authenticated";

revoke update on table "public"."user_penalties" from "authenticated";

revoke delete on table "public"."user_penalties" from "service_role";

revoke insert on table "public"."user_penalties" from "service_role";

revoke references on table "public"."user_penalties" from "service_role";

revoke select on table "public"."user_penalties" from "service_role";

revoke trigger on table "public"."user_penalties" from "service_role";

revoke truncate on table "public"."user_penalties" from "service_role";

revoke update on table "public"."user_penalties" from "service_role";

revoke insert on table "public"."user_trust_status" from "authenticated";

revoke update on table "public"."user_trust_status" from "authenticated";

revoke delete on table "public"."user_violations" from "anon";

revoke insert on table "public"."user_violations" from "anon";

revoke references on table "public"."user_violations" from "anon";

revoke select on table "public"."user_violations" from "anon";

revoke trigger on table "public"."user_violations" from "anon";

revoke truncate on table "public"."user_violations" from "anon";

revoke update on table "public"."user_violations" from "anon";

revoke delete on table "public"."user_violations" from "authenticated";

revoke insert on table "public"."user_violations" from "authenticated";

revoke references on table "public"."user_violations" from "authenticated";

revoke select on table "public"."user_violations" from "authenticated";

revoke trigger on table "public"."user_violations" from "authenticated";

revoke truncate on table "public"."user_violations" from "authenticated";

revoke update on table "public"."user_violations" from "authenticated";

revoke delete on table "public"."user_violations" from "service_role";

revoke insert on table "public"."user_violations" from "service_role";

revoke references on table "public"."user_violations" from "service_role";

revoke select on table "public"."user_violations" from "service_role";

revoke trigger on table "public"."user_violations" from "service_role";

revoke truncate on table "public"."user_violations" from "service_role";

revoke update on table "public"."user_violations" from "service_role";


  create table "public"."rate_limits" (
    "id" uuid not null default gen_random_uuid(),
    "key" text not null,
    "endpoint" text not null,
    "request_count" integer default 1,
    "window_start" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
      );


alter table "public"."rate_limits" enable row level security;

CREATE INDEX idx_rate_limits_key_endpoint ON public.rate_limits USING btree (key, endpoint);

CREATE INDEX idx_rate_limits_window_start ON public.rate_limits USING btree (window_start);

CREATE UNIQUE INDEX rate_limits_key_endpoint_key ON public.rate_limits USING btree (key, endpoint);

CREATE UNIQUE INDEX rate_limits_pkey ON public.rate_limits USING btree (id);

alter table "public"."rate_limits" add constraint "rate_limits_pkey" PRIMARY KEY using index "rate_limits_pkey";

alter table "public"."rate_limits" add constraint "rate_limits_key_endpoint_key" UNIQUE using index "rate_limits_key_endpoint_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_endpoint text, p_max_requests integer, p_window_seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    v_record RECORD;
    v_window_start TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
    v_allowed BOOLEAN;
    v_remaining INTEGER;
    v_reset_at TIMESTAMPTZ;
  BEGIN
    v_window_start := v_now - (p_window_seconds || ' seconds')::INTERVAL;

    SELECT * INTO v_record
    FROM public.rate_limits
    WHERE key = p_key AND endpoint = p_endpoint
    FOR UPDATE;

    IF v_record IS NULL THEN
      INSERT INTO public.rate_limits (key, endpoint, request_count, window_start)
      VALUES (p_key, p_endpoint, 1, v_now);
      v_allowed := TRUE;
      v_remaining := p_max_requests - 1;
      v_reset_at := v_now + (p_window_seconds || ' seconds')::INTERVAL;
    ELSIF v_record.window_start < v_window_start THEN
      UPDATE public.rate_limits
      SET request_count = 1, window_start = v_now
      WHERE id = v_record.id;
      v_allowed := TRUE;
      v_remaining := p_max_requests - 1;
      v_reset_at := v_now + (p_window_seconds || ' seconds')::INTERVAL;
    ELSIF v_record.request_count >= p_max_requests THEN
      v_allowed := FALSE;
      v_remaining := 0;
      v_reset_at := v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL;
    ELSE
      UPDATE public.rate_limits
      SET request_count = request_count + 1
      WHERE id = v_record.id;
      v_allowed := TRUE;
      v_remaining := p_max_requests - v_record.request_count - 1;
      v_reset_at := v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL;
    END IF;

    RETURN jsonb_build_object(
      'allowed', v_allowed,
      'remaining', v_remaining,
      'reset_at', v_reset_at
    );
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    v_deleted INTEGER;
  BEGIN
    DELETE FROM public.rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.get_order_id_from_path(object_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
  DECLARE
    path_parts text[];
  BEGIN
    path_parts := string_to_array(object_name, '/');
    IF array_length(path_parts, 1) >= 1 THEN
      BEGIN
        RETURN path_parts[1]::uuid;
      EXCEPTION WHEN others THEN
        RETURN NULL;
      END;
    END IF;
    RETURN NULL;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.check_and_reinstate_user(check_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    user_record RECORD;
    calling_user_id uuid;
    is_calling_user_admin boolean;
  BEGIN
    -- Get the calling user's ID
    calling_user_id := auth.uid();

    -- Check if calling user is admin
    SELECT is_admin INTO is_calling_user_admin
    FROM public.profiles
    WHERE id = calling_user_id;

    -- Only allow users to check their own status, or admins to check anyone
    IF calling_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;

    IF calling_user_id != check_user_id AND (is_calling_user_admin IS NULL OR is_calling_user_admin = false) THEN
      RAISE EXCEPTION 'Unauthorized: Can only check own status unless admin';
    END IF;

    SELECT account_status, suspension_until
    INTO user_record
    FROM public.profiles
    WHERE id = check_user_id;

    -- If suspended and suspension has expired, reinstate
    IF user_record.account_status = 'suspended'
       AND user_record.suspension_until IS NOT NULL
       AND user_record.suspension_until < now() THEN
      UPDATE public.profiles
      SET account_status = 'active',
          suspension_until = NULL
      WHERE id = check_user_id;

      -- Deactivate the suspension penalty
      UPDATE public.user_penalties
      SET is_active = false
      WHERE user_id = check_user_id
        AND penalty_type = 'temporary_suspension'
        AND is_active = true;

      RETURN true;
    END IF;

    RETURN false;
  END;
  $function$
;

grant insert on table "public"."escrow_payments" to "service_role";

grant select on table "public"."escrow_payments" to "service_role";

grant update on table "public"."escrow_payments" to "service_role";

grant delete on table "public"."rate_limits" to "service_role";

grant insert on table "public"."rate_limits" to "service_role";

grant references on table "public"."rate_limits" to "service_role";

grant select on table "public"."rate_limits" to "service_role";

grant trigger on table "public"."rate_limits" to "service_role";

grant truncate on table "public"."rate_limits" to "service_role";

grant update on table "public"."rate_limits" to "service_role";

grant delete on table "public"."stripe_accounts" to "authenticated";

grant insert on table "public"."stripe_accounts" to "authenticated";

grant references on table "public"."stripe_accounts" to "authenticated";

grant trigger on table "public"."stripe_accounts" to "authenticated";

grant truncate on table "public"."stripe_accounts" to "authenticated";

grant delete on table "public"."stripe_accounts" to "service_role";

grant insert on table "public"."stripe_accounts" to "service_role";

grant references on table "public"."stripe_accounts" to "service_role";

grant select on table "public"."stripe_accounts" to "service_role";

grant trigger on table "public"."stripe_accounts" to "service_role";

grant truncate on table "public"."stripe_accounts" to "service_role";

grant update on table "public"."stripe_accounts" to "service_role";

grant insert on table "public"."ticket_transfers" to "service_role";

grant select on table "public"."ticket_transfers" to "service_role";

grant update on table "public"."ticket_transfers" to "service_role";


  create policy "Dispute parties can update disputes"
  on "public"."escrow_disputes"
  as permissive
  for update
  to public
using (((auth.uid() = filed_by) OR (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = escrow_disputes.order_id) AND ((orders.buyer_id = auth.uid()) OR (orders.seller_id = auth.uid())))))))
with check (((auth.uid() = filed_by) OR (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = escrow_disputes.order_id) AND ((orders.buyer_id = auth.uid()) OR (orders.seller_id = auth.uid())))))));



  create policy "Parties can update dispute evidence"
  on "public"."escrow_disputes"
  as permissive
  for update
  to public
using (((auth.uid() = filed_by) OR (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = escrow_disputes.order_id) AND (orders.buyer_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = escrow_disputes.order_id) AND (orders.seller_id = auth.uid()))))))
with check (((auth.uid() = filed_by) OR (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = escrow_disputes.order_id) AND (orders.buyer_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = escrow_disputes.order_id) AND (orders.seller_id = auth.uid()))))));



  create policy "notifications_service_insert"
  on "public"."notifications"
  as permissive
  for insert
  to public
with check (false);



  create policy "profiles_view_authenticated"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() IS NOT NULL));



  create policy "rating_prompts_service_insert"
  on "public"."rating_prompts"
  as permissive
  for insert
  to public
with check (false);



  create policy "Users can view own trust status"
  on "public"."user_trust_status"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "conversations_simple_view"
  on "public"."conversations"
  as permissive
  for select
  to public
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((participant_1_id = ( SELECT auth.uid() AS uid)) OR (participant_2_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))))));



  create policy "conversations_update_participants"
  on "public"."conversations"
  as permissive
  for update
  to public
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((participant_1_id = ( SELECT auth.uid() AS uid)) OR (participant_2_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))))))
with check (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((participant_1_id = ( SELECT auth.uid() AS uid)) OR (participant_2_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))))));



  create policy "Admins can view all escrow payments"
  on "public"."escrow_payments"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))));



  create policy "messages_mark_as_read_only"
  on "public"."messages"
  as permissive
  for update
  to public
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.participant_1_id = ( SELECT auth.uid() AS uid)) OR (conversations.participant_2_id = ( SELECT auth.uid() AS uid))) AND (messages.sender_id <> ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))))))
with check (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.participant_1_id = ( SELECT auth.uid() AS uid)) OR (conversations.participant_2_id = ( SELECT auth.uid() AS uid))) AND (messages.sender_id <> ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))))));



  create policy "messages_simple_insert"
  on "public"."messages"
  as permissive
  for insert
  to public
with check (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (sender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.participant_1_id = ( SELECT auth.uid() AS uid)) OR (conversations.participant_2_id = ( SELECT auth.uid() AS uid))))))));



  create policy "messages_simple_view"
  on "public"."messages"
  as permissive
  for select
  to public
using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((sender_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND ((conversations.participant_1_id = ( SELECT auth.uid() AS uid)) OR (conversations.participant_2_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))))));



  create policy "notifications_delete"
  on "public"."notifications"
  as permissive
  for delete
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "notifications_select"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "notifications_update"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Service role full access"
  on "public"."push_notification_queue"
  as permissive
  for all
  to public
using ((( SELECT auth.role() AS role) = 'service_role'::text));



  create policy "Users can delete their own push tokens"
  on "public"."push_tokens"
  as permissive
  for delete
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can insert their own push tokens"
  on "public"."push_tokens"
  as permissive
  for insert
  to public
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can update their own push tokens"
  on "public"."push_tokens"
  as permissive
  for update
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can view their own push tokens"
  on "public"."push_tokens"
  as permissive
  for select
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Admins can manage all transfers"
  on "public"."seller_transfers"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))));



  create policy "Sellers can view own transfers"
  on "public"."seller_transfers"
  as permissive
  for select
  to public
using ((seller_id = ( SELECT auth.uid() AS uid)));



  create policy "Admins can view all stripe accounts"
  on "public"."stripe_accounts"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))));



  create policy "Users can update own stripe account"
  on "public"."stripe_accounts"
  as permissive
  for update
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can view own stripe account"
  on "public"."stripe_accounts"
  as permissive
  for select
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Admins can manage all sales"
  on "public"."ticket_sales"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))));



  create policy "Sellers can insert their own sales"
  on "public"."ticket_sales"
  as permissive
  for insert
  to authenticated
with check ((seller_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can view their own sales"
  on "public"."ticket_sales"
  as permissive
  for select
  to authenticated
using (((seller_id = ( SELECT auth.uid() AS uid)) OR (buyer_id = ( SELECT auth.uid() AS uid))));



  create policy "Admins can manage all ticket transfers"
  on "public"."ticket_transfers"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))));



  create policy "Buyers can confirm receipt"
  on "public"."ticket_transfers"
  as permissive
  for update
  to public
using ((buyer_id = ( SELECT auth.uid() AS uid)))
with check ((buyer_id = ( SELECT auth.uid() AS uid)));



  create policy "Sellers can update transfer status"
  on "public"."ticket_transfers"
  as permissive
  for update
  to public
using ((seller_id = ( SELECT auth.uid() AS uid)))
with check ((seller_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can view own ticket transfers"
  on "public"."ticket_transfers"
  as permissive
  for select
  to public
using (((buyer_id = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid))));


drop policy "Admins can view all transfer proofs" on "storage"."objects";

drop policy "Authenticated users can delete transfer proofs" on "storage"."objects";

drop policy "Authenticated users can update transfer proofs" on "storage"."objects";

drop policy "Authenticated users can upload transfer proofs" on "storage"."objects";

drop policy "Authenticated users can view transfer proofs" on "storage"."objects";

drop policy "Buyers can view transfer proofs for their orders" on "storage"."objects";


  create policy "Order participant can upload transfer proofs"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'transfer-proofs'::text));



  create policy "Order participants can view transfer proofs"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'transfer-proofs'::text) AND (auth.role() = 'authenticated'::text) AND ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = public.get_order_id_from_path(objects.name)) AND (orders.seller_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.orders o
     JOIN public.escrow_disputes d ON ((d.order_id = o.id)))
  WHERE ((o.id = public.get_order_id_from_path(objects.name)) AND (o.buyer_id = auth.uid()) AND (d.status = ANY (ARRAY['open'::text, 'under_review'::text, 'evidence_requested'::text]))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))))));



  create policy "Order seller can delete transfer proofs"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'transfer-proofs'::text) AND (auth.role() = 'authenticated'::text) AND ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = public.get_order_id_from_path(objects.name)) AND (orders.seller_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))))));



  create policy "Order seller can update transfer proofs"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'transfer-proofs'::text) AND (auth.role() = 'authenticated'::text) AND ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = public.get_order_id_from_path(objects.name)) AND (orders.seller_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))))));



  create policy "transfer_proofs_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'transfer-proofs'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))));



  create policy "transfer_proofs_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'transfer-proofs'::text) AND (EXISTS ( SELECT 1
   FROM public.orders
  WHERE (((orders.id)::text = (storage.foldername(objects.name))[1]) AND ((orders.buyer_id = auth.uid()) OR (orders.seller_id = auth.uid())))))));



  create policy "transfer_proofs_select"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'transfer-proofs'::text) AND ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE (((orders.id)::text = (storage.foldername(objects.name))[1]) AND ((orders.buyer_id = auth.uid()) OR (orders.seller_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))))));



  create policy "transfer_proofs_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'transfer-proofs'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))))
with check (((bucket_id = 'transfer-proofs'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))));



