# MyCollegeTix QA Playbook: Payments, Disputes & Money Movement

> **Version:** 1.0
> **Last Updated:** 2026-02-02
> **Stripe Mode:** Test
> **Platform:** React Native (Expo) + Supabase Edge Functions + Stripe Connect (Express)

---

## Table of Contents

1. [Testing Philosophy & Scope](#1-testing-philosophy--scope)
2. [Environment & Stripe Test Setup](#2-environment--stripe-test-setup)
3. [Test Cases](#3-test-cases)
   - [TC-1xx: Seller Onboarding & Eligibility Gate](#tc-1xx-seller-onboarding--eligibility-gate)
   - [TC-2xx: Buyer Purchase Flow](#tc-2xx-buyer-purchase-flow)
   - [TC-3xx: Ticket Transfer & Payout Flow](#tc-3xx-ticket-transfer--payout-flow)
   - [TC-4xx: Refund Flow](#tc-4xx-refund-flow)
   - [TC-5xx: Buyer-Initiated In-App Dispute](#tc-5xx-buyer-initiated-in-app-dispute)
   - [TC-6xx: Seller-Initiated In-App Dispute](#tc-6xx-seller-initiated-in-app-dispute)
   - [TC-7xx: Edge Cases & Conflict Scenarios](#tc-7xx-edge-cases--conflict-scenarios)
   - [TC-8xx: Penalty & Trust System](#tc-8xx-penalty--trust-system)
4. [Money Flow Diagrams](#4-money-flow-diagrams)
5. [Stripe Dashboard Verification Steps](#5-stripe-dashboard-verification-steps)
6. [Tester Money-Tracking Log](#6-tester-money-tracking-log)
7. [Database Verification Queries](#7-database-verification-queries)
8. [Webhook Event Verification](#8-webhook-event-verification)
9. [Chargeback Awareness Appendix](#9-chargeback-awareness-appendix)
10. [Final Validation Checklist](#10-final-validation-checklist)

---

## 1. Testing Philosophy & Scope

### How Money Moves in MyCollegeTix

MyCollegeTix uses an **escrow model** with Stripe Connect Express accounts:

```
Buyer pays $X  -->  Platform Stripe account holds $X (escrow)
                         |
              Buyer confirms receipt
                         |
                    stripe.transfers.create()
                         |
                    Seller's Connect account receives $X
                         |
                    Seller withdraws to bank (Stripe standard schedule, ~2-3 days)
```

**Key facts:**
- **No platform fees.** The full ticket price flows from buyer to seller. No `application_fee_amount` is used.
- **No direct charges.** PaymentIntents are created on the platform account with NO `transfer_data` or `on_behalf_of`. Funds land in the platform balance.
- **Transfers, not payouts.** When the buyer confirms receipt (or admin resolves a dispute), `stripe.transfers.create()` moves funds from platform to seller's Connect account.
- **Admin-controlled resolution.** Disputes are resolved by an admin who triggers either `process-refund` (money back to buyer) or `process-payout` (money to seller).

### What This Playbook Covers

- Seller onboarding and eligibility gating
- Buyer purchase flow (PaymentIntent lifecycle)
- Ticket transfer and seller payout
- Full refunds (admin-initiated)
- In-app disputes (buyer-initiated and seller-initiated)
- Edge cases and conflict scenarios
- Penalty and trust system

### What This Playbook Does NOT Cover

- Partial refunds (not implemented)
- Stripe bank chargebacks (see [Appendix](#9-chargeback-awareness-appendix))
- Push notification delivery testing
- UI/UX testing beyond payment flows
- Load/stress testing

---

## 2. Environment & Stripe Test Setup

### 2.1 Prerequisites

| Item | How to Access |
|------|---------------|
| MyCollegeTix app | Install on test device or simulator, running against Supabase test project |
| Platform Stripe Dashboard | https://dashboard.stripe.com/test (logged in as platform owner) |
| Seller Express Dashboard | In-app via "Stripe Dashboard" button (calls `get-stripe-dashboard-link`) |
| Supabase Dashboard | https://supabase.com/dashboard → project → Table Editor |
| Admin account | A user with `profiles.is_admin = true` |

### 2.2 Stripe Test Card Numbers

| Card Number | Behavior |
|-------------|----------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined (generic) |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0069` | Declined (expired card) |
| `4000 0000 0000 0127` | Declined (incorrect CVC) |
| `4000 0000 0000 3220` | Requires 3D Secure authentication |

**For all test cards:** Use any future expiration (e.g., `12/30`), any 3-digit CVC, any ZIP code.

### 2.3 Test User Accounts Needed

Create these before testing:

| Role | Description | Setup Required |
|------|-------------|----------------|
| **Buyer A** | Primary buyer | Standard account, no Stripe Connect needed |
| **Buyer B** | Secondary buyer (for edge cases) | Standard account |
| **Seller A** | Fully onboarded seller | Stripe Connect Express account, `charges_enabled=true`, `payouts_enabled=true` |
| **Seller B** | Incomplete onboarding seller | Stripe Connect account created but `details_submitted=false` |
| **Seller C** | No Stripe account | Regular user, never started Stripe onboarding |
| **Admin** | Platform administrator | `profiles.is_admin = true` |

### 2.4 Key Environment Variables to Verify

Confirm these are set in the Supabase Edge Function environment:

```
STRIPE_SECRET_KEY          = sk_test_...
STRIPE_WEBHOOK_SECRET      = whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET = whsec_... (may be same or different)
SUPABASE_URL               = https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY  = eyJ...
SUPABASE_ANON_KEY          = eyJ...
TEAM_DISPUTE_EMAILS        = admin1@example.com,admin2@example.com
```

### 2.5 Stripe Webhook Configuration

Verify these events are configured in Stripe Dashboard > Developers > Webhooks:

**Platform events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`

**Connect events:**
- `account.updated`
- `account.application.deauthorized`
- `transfer.created`
- `transfer.failed`
- `transfer.reversed`

**Webhook endpoint:** `https://<your-supabase-project>.supabase.co/functions/v1/stripe-webhook`

---

## 3. Test Cases

Each test case follows this format:
- **Action**: What the tester does
- **Expected**: What should happen
- **Verify**: Where and how to confirm

---

### TC-1xx: Seller Onboarding & Eligibility Gate

#### TC-101: Seller with No Stripe Account Tries to List

**Precondition:** Seller C (no Stripe account)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as Seller C | Successful login |
| 2 | Navigate to "Sell a Ticket" | StripeEligibilityBanner appears |
| 3 | Attempt to list a ticket | Blocked. Message: "To sell tickets, you need to set up payments" |
| 4 | Verify `check-selling-eligibility` response | `canSell: false`, `reason: "no_account"`, `actionRequired: "create_account"` |

**Verify DB:**
```sql
SELECT * FROM stripe_accounts WHERE user_id = '<seller_c_id>';
-- Should return 0 rows
```

---

#### TC-102: Seller Creates Connect Account and Starts Onboarding

**Precondition:** Seller C (no Stripe account)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Tap "Set Up Payments" button | `create-connect-account` Edge Function called |
| 2 | Observe redirect | Redirected to Stripe-hosted onboarding page |
| 3 | Check DB immediately | New row in `stripe_accounts`: `account_status='pending'`, `charges_enabled=false`, `payouts_enabled=false` |
| 4 | Abandon onboarding (close browser) | Account exists but incomplete |
| 5 | Call `check-selling-eligibility` | `canSell: false`, `reason: "incomplete_onboarding"` |

**Verify Stripe Dashboard:**
- Go to **Connect > Accounts**
- Find the new account
- Status should show "Incomplete" or "Restricted"

**Verify DB:**
```sql
SELECT stripe_account_id, account_status, charges_enabled, payouts_enabled, details_submitted, onboarding_completed
FROM stripe_accounts WHERE user_id = '<seller_c_id>';
-- account_status='pending' or 'onboarding'
-- charges_enabled=false, payouts_enabled=false, details_submitted=false
```

---

#### TC-103: Seller with Incomplete Onboarding Blocked from Selling

**Precondition:** Seller B (`details_submitted=false`)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as Seller B | Successful login |
| 2 | Navigate to sell screen | StripeEligibilityBanner shows incomplete status |
| 3 | Attempt to list ticket | Blocked. Message: "Please complete your payment setup to start selling tickets" |
| 4 | Verify response includes `onboardingUrl` | A valid Stripe Account Link URL is returned |
| 5 | Tap "Complete Setup" | Redirected to Stripe onboarding |

**Verify:** `details` array in response contains specific requirement messages like "Bank account required for payouts" or "Date of birth required".

---

#### TC-104: Seller with Restricted Account (Currently Due Requirements)

**Precondition:** Seller with `details_submitted=true` but `currently_due` requirements exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Call `check-selling-eligibility` | `canSell: false`, `reason: "restricted"` |
| 2 | Verify `details` array | Contains user-friendly messages mapped from Stripe requirements |
| 3 | Verify `actionRequired` | `"update_info"` |
| 4 | Verify `onboardingUrl` | Valid Stripe Account Link URL for updating info |

**Requirement → Message mapping examples:**
| Stripe Requirement | User-Friendly Message |
|----|---|
| `individual.verification.document` | "Identity document verification required" |
| `individual.ssn_last_4` | "Last 4 digits of SSN required" |
| `external_account` | "Bank account required for payouts" |

---

#### TC-105: Fully Enabled Seller Can List and Sell

**Precondition:** Seller A (fully onboarded)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Call `check-selling-eligibility` | `canSell: true`, `reason: "eligible"` |
| 2 | List a ticket | Ticket created with `status='available'` |
| 3 | Verify no eligibility banner blocking | Sell flow proceeds normally |

**Verify DB:**
```sql
SELECT account_status, charges_enabled, payouts_enabled, onboarding_completed
FROM stripe_accounts WHERE user_id = '<seller_a_id>';
-- account_status='enabled', all true
```

**Verify Stripe Dashboard:**
- Connect > Accounts > Seller A's account
- Status: "Complete" or "Enabled"
- `charges_enabled: true`, `payouts_enabled: true`

---

#### TC-106: Seller Account Becomes Disabled Mid-Lifecycle

**Precondition:** Seller A has an active listing

| Step | Action | Expected |
|------|--------|----------|
| 1 | In Stripe Dashboard, simulate account restriction (add requirement or reject) | `account.updated` webhook fires |
| 2 | Verify `stripe_accounts` row | `account_status` changes to `restricted` or `disabled` |
| 3 | Seller tries to list new ticket | Blocked with appropriate message |
| 4 | Buyer tries to purchase existing listing | Blocked at PaymentIntent creation with: "The seller's payment account is not fully verified yet" |

**Verify DB:**
```sql
SELECT account_status, charges_enabled, payouts_enabled FROM stripe_accounts
WHERE user_id = '<seller_a_id>';
-- Should reflect the disabled/restricted state
```

---

#### TC-107: Webhook `account.updated` Handling

**Precondition:** Seller A's Connect account

| Step | Action | Expected |
|------|--------|----------|
| 1 | Trigger an `account.updated` event (via Stripe CLI or Dashboard) | Webhook received by `stripe-webhook` function |
| 2 | Check `stripe_accounts` table | `charges_enabled`, `payouts_enabled`, `details_submitted` updated to match Stripe |
| 3 | If now enabled: check `profiles` | `stripe_onboarding_complete = true` |
| 4 | If now restricted: check `account_status` | Updated to `restricted` |

---

#### TC-108: Account Deauthorization

| Step | Action | Expected |
|------|--------|----------|
| 1 | Simulate `account.application.deauthorized` event | Webhook fires |
| 2 | Verify `stripe_accounts` | `account_status='disabled'`, `charges_enabled=false`, `payouts_enabled=false` |
| 3 | Verify `profiles` | `stripe_onboarding_complete=false` |
| 4 | Seller tries to list or sell | Completely blocked |

---

### TC-2xx: Buyer Purchase Flow

#### TC-201: Successful Ticket Purchase (Happy Path)

**Precondition:** Seller A has listed a ticket ($50.00). Event is > 24 hours away. Buyer A is logged in.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Buyer A navigates to ticket detail | Ticket displayed with price $50.00 |
| 2 | Buyer A taps "Buy Now" | Checkout screen displayed |
| 3 | App calls `create-payment-intent` | Returns `clientSecret`, `orderId`, `paymentIntentId` |
| 4 | Verify order created in DB | `orders`: `status='pending'`, `escrow_status='payment_pending'`, `amount=50.00`, `transfer_deadline` = now + 24h |
| 5 | Verify escrow_payments created | `status='pending'`, `amount_cents=5000`, `stripe_payment_intent_id` populated |
| 6 | Verify ticket_transfers created | `status='pending'`, `transfer_deadline` matches order |
| 7 | Buyer enters card `4242 4242 4242 4242` | Stripe payment sheet filled |
| 8 | Buyer confirms payment | Payment processes |
| 9 | Wait for `payment_intent.succeeded` webhook | Webhook fires within seconds |
| 10 | Verify `escrow_payments` | `status='payment_held'`, `stripe_charge_id` populated |
| 11 | Verify `orders` | `status='completed'`, `escrow_status='payment_held'` |
| 12 | Verify `tickets` | `status='sold'`, `buyer_id` = Buyer A's ID |
| 13 | Verify `ticket_transfers` | `status='pending'` (awaiting seller transfer) |
| 14 | Verify buyer notification | "Purchase Confirmed!" notification in-app |
| 15 | Verify seller notification | "Ticket Sold!" notification in-app |
| 16 | Verify buyer email | "Purchase Confirmed: [Ticket Title]" email sent |
| 17 | Verify seller email | "Ticket Sold: [Ticket Title]" email sent |

**Verify Platform Stripe Dashboard:**
- Go to **Payments** tab
- Find the PaymentIntent (search by ID or amount)
- Status: "Succeeded"
- Amount: $50.00
- Metadata should show: `order_id`, `ticket_id`, `buyer_id`, `seller_id`, `seller_stripe_account`

**Money Location:** $50.00 is now in the **platform's Stripe balance** (available or pending depending on timing).

---

#### TC-202: Failed Payment (Declined Card)

**Precondition:** Seller A has a listed ticket. Buyer A is logged in.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Start purchase flow | `create-payment-intent` succeeds, returns `clientSecret` |
| 2 | Enter card `4000 0000 0000 0002` | Card number entered |
| 3 | Confirm payment | Payment fails |
| 4 | Verify `payment_intent.payment_failed` webhook fires | Webhook received |
| 5 | Verify `escrow_payments` | `status='pending'` (kept for retry) |
| 6 | Verify `orders` | `status='pending'`, `escrow_status='payment_pending'`, `notes` contains failure message |
| 7 | Verify `tickets` | `status` still `available` (not changed to sold) |
| 8 | Buyer can retry with different card | Payment sheet allows retry |

**Verify Platform Stripe Dashboard:**
- PaymentIntent shows status "Failed" or "Requires Payment Method"
- No charge created

**Money Location:** No money moved. $0 everywhere.

---

#### TC-203: Purchase Blocked When Event < 1 Hour Away

**Precondition:** Ticket with `event_date` less than 1 hour from now.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Buyer attempts purchase | `create-payment-intent` throws error |
| 2 | Error message | "Cannot purchase tickets within 1 hour of event start" |
| 3 | Verify no order created | No new row in `orders` |
| 4 | Verify no PaymentIntent created | No new PI in Stripe |

---

#### TC-204: Transfer Deadline Calculation Verification

Test each window by creating tickets with different event dates:

| Hours Until Event | Expected Transfer Window | Expected Deadline |
|---|---|---|
| 2 hours (between 1-4) | 1 hour | purchase_time + 1h |
| 6 hours (between 4-12) | 2 hours | purchase_time + 2h |
| 18 hours (between 12-24) | 4 hours | purchase_time + 4h |
| 48 hours (> 24) | 24 hours | purchase_time + 24h |

For each: verify `orders.transfer_deadline` and `ticket_transfers.transfer_deadline` match the expected deadline.

---

### TC-3xx: Ticket Transfer & Payout Flow

#### TC-301: Seller Marks Transfer Sent

**Precondition:** TC-201 completed. Order exists with `escrow_status='payment_held'`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as Seller A | See order in "My Sales" |
| 2 | Navigate to order | Order shows "Awaiting Your Transfer" |
| 3 | Seller taps "Mark as Sent" (optionally uploads proof image) | `mark-transfer-sent` Edge Function called |
| 4 | Verify `orders` | `escrow_status='transfer_pending'` |
| 5 | Verify `ticket_transfers` | `status='sent'`, `transfer_initiated_at` populated |
| 6 | If proof uploaded: verify `transfer_proof_url` | URL points to valid image in Supabase storage |
| 7 | Verify buyer notification | "Ticket Transferred!" notification sent |
| 8 | Verify buyer email | "Ticket Transferred: [Title]" email sent |

**Money Location:** Still $50.00 in platform balance. No money has moved to seller yet.

---

#### TC-302: Buyer Confirms Receipt (Triggers Payout)

**Precondition:** TC-301 completed. Order `escrow_status='transfer_pending'`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as Buyer A | See order showing "Confirm Receipt" button |
| 2 | Buyer taps "Confirm Receipt" | `confirm-receipt` Edge Function called |
| 3 | Verify `ticket_transfers` | `status='confirmed'`, `confirmed_at` set, `confirmed_by='buyer'` |
| 4 | Verify `orders` first update | `escrow_status='payout_pending'` (intermediate) |
| 5 | Verify `stripe.transfers.create()` called | Transfer created to Seller A's Connect account |
| 6 | Verify transfer params | `amount=5000` (cents), `currency='usd'`, `destination=<seller_stripe_account_id>` |
| 7 | Verify `seller_transfers` record | `status='paid'`, `stripe_transfer_id` set, `amount_cents=5000`, `transferred_at` set |
| 8 | Verify `orders` final state | `escrow_status='completed'` |
| 9 | Verify `escrow_payments` | `status='paid_out'` |
| 10 | Verify seller notification | "Payment Released!" with amount |
| 11 | Verify seller email | "Payment Released: $50.00" |
| 12 | Verify `rating_prompts` | Two records created: `seller_rate_buyer` and `buyer_rate_seller` |

**Verify Platform Stripe Dashboard:**
- Go to **Payments** > find original payment
- Go to **Transfers** tab (or **Connect > Transfers**)
- Transfer should show: $50.00 to Seller A's account
- Metadata: `order_id`, `escrow_payment_id`, `seller_id`, `buyer_id`

**Verify Seller Express Dashboard:**
- Log in as Seller A, open Stripe Dashboard
- Balance should show incoming $50.00 (may be pending 2-3 days)
- Transfer visible in transactions list

**Money Location:** $50.00 has left platform balance and is now in Seller A's Connect account balance.

---

#### TC-303: Auto-Confirm After Transfer Deadline

**Precondition:** Seller marked transfer sent, buyer has NOT confirmed, deadline has passed.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Wait for transfer deadline to pass (or adjust deadline in DB for testing) | `auto-confirm-transfers` function should run |
| 2 | Verify `ticket_transfers` | `status='auto_confirmed'` |
| 3 | Verify payout triggered | Same as TC-302 steps 5-9 |

**Note:** The `auto-confirm-transfers` function may run on a cron schedule. Check Supabase cron configuration.

---

#### TC-304: Payout Fails When Seller Account Restricted

**Precondition:** Order at `escrow_status='transfer_pending'`. Seller's `payouts_enabled=false`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Buyer confirms receipt | `confirm-receipt` called |
| 2 | Function checks `sellerAccount.payouts_enabled` | `false` |
| 3 | Error returned | "The seller's payment account is not fully verified" |
| 4 | Verify order status | Remains `transfer_pending` (not changed to completed) |
| 5 | Verify no transfer created in Stripe | No `stripe.transfers.create()` call |

**Money Location:** $50.00 still in platform balance. No money moved.

---

#### TC-305: Payout Amount Matches Escrow Amount Exactly

**Precondition:** Ticket priced at $37.50. Order completed through TC-302 flow.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Verify `escrow_payments.amount_cents` | `3750` |
| 2 | Verify `stripe.transfers.create()` amount | `3750` |
| 3 | Verify `seller_transfers.amount_cents` | `3750` |
| 4 | In Stripe Dashboard: original payment | $37.50 |
| 5 | In Stripe Dashboard: transfer to seller | $37.50 |

**Fee verification:** No application fee deducted. Full amount transferred. Platform net on this transaction: $0.00 (minus Stripe processing fees which are platform-absorbed).

---

### TC-4xx: Refund Flow

#### TC-401: Refund While Funds in Escrow (payment_held)

**Precondition:** Completed purchase (TC-201). `escrow_status='payment_held'`. Seller has NOT marked transfer sent.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as Admin | Admin panel accessible |
| 2 | Navigate to order in admin panel | Order visible with details |
| 3 | Admin triggers refund via `process-refund` | Edge Function called with `orderId`, `reason` |
| 4 | Verify admin auth check | Function verifies `profiles.is_admin = true` |
| 5 | Verify status check | `payment_held` is in refundable statuses list |
| 6 | Verify `stripe.refunds.create()` called | Refund created on the PaymentIntent |
| 7 | Verify refund params | `payment_intent: <PI_ID>`, `reason: 'requested_by_customer'` |
| 8 | Verify refund metadata | `order_id`, `admin_id`, `refund_reason`, `dispute_id` (null if no dispute) |
| 9 | Verify `escrow_payments` | `status='refunded'` |
| 10 | Verify `orders` | `status='refunded'`, `escrow_status='refunded'`, `notes='Refunded by admin: <reason>'` |
| 11 | Verify `tickets` | `status='available'`, `buyer_id=null` (returned to marketplace) |
| 12 | Verify `ticket_transfers` | `status='cancelled'` |
| 13 | Verify buyer notification | "Refund Processed" notification |
| 14 | Verify buyer email | "Refund Processed: $50.00" email |

**Verify Platform Stripe Dashboard:**
- Go to **Payments** > find the payment
- Status should show "Refunded"
- Refund object visible with metadata
- Amount refunded: $50.00 (full)

**Money Location:** $50.00 returned to buyer's original payment method. Timeline: 5-10 business days for card refunds. Platform balance decreased by $50.00. Stripe processing fees on original charge are NOT returned to platform.

---

#### TC-402: Refund While Transfer Pending

**Precondition:** Seller has marked transfer sent. `escrow_status='transfer_pending'`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin triggers refund | `process-refund` called |
| 2 | Status check passes | `transfer_pending` is in refundable statuses |
| 3 | Refund processes | Same as TC-401 steps 6-14 |

**Note:** The seller marked the ticket as sent, but the admin is overriding by refunding. The ticket returns to `available`.

---

#### TC-403: Refund While Disputed

**Precondition:** A dispute has been filed. `escrow_status='disputed'`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin triggers refund | `process-refund` called |
| 2 | Status check passes | `disputed` is in refundable statuses |
| 3 | If `disputeId` provided: dispute updated | `status='resolved_refund'`, `resolution='Refunded to buyer: <reason>'` |
| 4 | Refund processes | Same as TC-401 steps 6-14 |

---

#### TC-404: Refund Blocked After Payout Completed

**Precondition:** Order fully completed. `escrow_status='completed'`. Funds already transferred to seller.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin attempts refund | `process-refund` called |
| 2 | Status check fails | `completed` is NOT in refundable statuses |
| 3 | Error returned | "This order has already been completed and payment released. A refund is no longer possible." |
| 4 | No Stripe refund created | No API call to `stripe.refunds.create()` |

**Money Location:** $50.00 is in seller's Connect account. Cannot be clawed back via this endpoint.

---

#### TC-405: Double Refund Prevention

**Precondition:** Order already refunded. `escrow_status='refunded'`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin attempts second refund | `process-refund` called |
| 2 | Status check fails (first check) | "This order has already been refunded." |
| 3 | OR: `escrow_payments.status` check | "This order has already been refunded." |

---

### TC-5xx: Buyer-Initiated In-App Dispute

#### TC-501: Buyer Files Dispute (Ticket Not Received)

**Precondition:** Purchase completed (TC-201). Seller marked transfer sent (TC-301). Buyer has NOT confirmed receipt.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Buyer A navigates to order | Order detail screen |
| 2 | Buyer taps "Report a Problem" | Dispute filing screen opens (`/dispute/[orderId]`) |
| 3 | Buyer selects reason: "Ticket not received" | `reason='ticket_not_received'` |
| 4 | Buyer enters description (min 20 chars, max 1000) | Description validated |
| 5 | Buyer uploads evidence (up to 5 images) | Images compressed and uploaded to Supabase storage ("transfer-proofs" bucket) |
| 6 | Buyer submits dispute | `DisputeService.openDispute()` called |
| 7 | Verify existing dispute check | No existing open/under_review dispute for this order |
| 8 | Verify `escrow_disputes` record | `status='open'`, `filed_by_role='buyer'`, `reason='ticket_not_received'`, `evidence_urls` populated |
| 9 | Verify `orders` | `escrow_status='disputed'` |
| 10 | Verify `ticket_transfers` | `status='disputed'` |
| 11 | Verify `escrow_payments` | `status='disputed'` |
| 12 | Verify admin email notification | `notify-dispute` Edge Function sends email to `TEAM_DISPUTE_EMAILS` |
| 13 | Email subject | `[DISPUTE] New dispute filed for "[Ticket Title]"` |
| 14 | Email contains | Dispute ID, Order ID, ticket title, amount, filed by role, buyer/seller names, reason, description |

**Money Location:** $50.00 still in platform balance. Funds frozen — cannot be released to seller or refunded without admin action.

---

#### TC-502: Admin Resolves Buyer Dispute with Refund

**Precondition:** TC-501 completed. Dispute is `open`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin opens admin disputes panel (`/(admin)/disputes`) | Dispute visible in "Open" filter |
| 2 | Admin reviews dispute details | Evidence images visible, reason displayed |
| 3 | Admin optionally marks "Under Review" | `DisputeService.markUnderReview()` → `status='under_review'` |
| 4 | Admin clicks "Refund Buyer" with resolution notes | `DisputeService.resolveDispute(id, 'resolved_refund', notes)` |
| 5 | Verify `escrow_disputes` | `status='resolved_refund'`, `resolved_by=admin_id`, `resolved_at` set, `resolution` contains notes |
| 6 | Verify `process-refund` invoked | Edge Function called with `orderId` and `reason` |
| 7 | Verify Stripe refund created | Full refund on PaymentIntent |
| 8 | Verify all status updates | Same as TC-401 steps 9-14 |

**Money Flow:**
```
Platform Balance: $50.00 → $0.00 (refunded to buyer)
Buyer: $0.00 → +$50.00 (returned to card, 5-10 business days)
Seller: $0.00 (never received anything)
```

---

#### TC-503: Admin Resolves Buyer Dispute in Seller's Favor

**Precondition:** TC-501 completed. Dispute is `open`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin reviews evidence (seller had valid transfer proof) | Admin determines seller is correct |
| 2 | Admin clicks "Pay Seller" with resolution notes | `DisputeService.resolveDispute(id, 'resolved_payout', notes)` |
| 3 | Verify `escrow_disputes` | `status='resolved_payout'`, resolution info set |
| 4 | Verify `process-payout` invoked | Edge Function called |
| 5 | Verify transfer created | `stripe.transfers.create()` to seller's Connect account |
| 6 | Verify `seller_transfers` record | `status='pending'` (or `paid` after webhook) |
| 7 | Verify `escrow_payments` | `status='payout_pending'` |
| 8 | Verify `orders` | `escrow_status='payout_pending'` |
| 9 | Verify `ticket_transfers` | `status='confirmed'`, `confirmed_by='admin'` |

**Money Flow:**
```
Platform Balance: $50.00 → $0.00 (transferred to seller)
Buyer: -$50.00 (no refund)
Seller: $0.00 → +$50.00 (in Connect account)
```

**Verify Platform Stripe Dashboard:**
- Transfer visible under Connect > Transfers
- Metadata includes `dispute_id`, `admin_id`, `reason`

---

#### TC-504: Admin Escalates Dispute

**Precondition:** TC-501 completed. Dispute is `open` or `under_review`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin clicks "Escalate" | `DisputeService.resolveDispute(id, 'escalated', notes)` |
| 2 | Verify `escrow_disputes` | `status='escalated'` |
| 3 | Verify NO money movement | No refund, no payout, no transfer |
| 4 | Verify `orders.escrow_status` | Remains `disputed` |

**Money Location:** $50.00 still frozen in platform balance.

---

#### TC-505: Buyer Adds Additional Evidence After Filing

**Precondition:** TC-501 completed. Dispute `status='open'`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Buyer navigates to dispute status (`/dispute/status/[disputeId]`) | Dispute details and existing evidence visible |
| 2 | Buyer uploads additional evidence | New images compressed and uploaded |
| 3 | `DisputeService.addEvidence()` called | Merges new URLs with existing `evidence_urls` array |
| 4 | Verify `escrow_disputes.evidence_urls` | Array now contains both old and new URLs |

**Boundary test:** Upload image #6 → should be blocked (max 5 total evidence images).

---

#### TC-506: Buyer Dispute with Various Reason Types

For each reason, file a dispute and verify the `reason` field is stored correctly:

| Reason Value | Label |
|---|---|
| `ticket_not_received` | Ticket not received |
| `ticket_invalid` | Ticket is invalid or doesn't work |
| `wrong_ticket` | Received wrong ticket |
| `duplicate_ticket` | Ticket was already used |
| `seller_unresponsive` | Seller not responding |
| `payment_issue` | Payment issue |
| `other` | Other |

---

### TC-6xx: Seller-Initiated In-App Dispute

#### TC-601: Seller Files Dispute (Buyer Unresponsive)

**Precondition:** Seller A marked transfer sent (TC-301). Buyer A has NOT confirmed receipt. Transfer deadline approaching or passed.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as Seller A | See order in "My Sales" |
| 2 | Navigate to order detail | Shows "Awaiting Buyer Confirmation" |
| 3 | Seller taps "Report a Problem" | Dispute filing screen opens |
| 4 | Seller selects reason: "Buyer not responding" | `reason='buyer_unresponsive'` |
| 5 | Seller enters description: "I transferred the ticket via email on [date]. Buyer has not confirmed after 24 hours." | Min 20 chars validated |
| 6 | Seller uploads evidence: screenshot of transfer confirmation | Images uploaded to storage |
| 7 | Seller submits dispute | `DisputeService.openDispute()` called |
| 8 | Verify `escrow_disputes` | `filed_by_role='seller'`, `reason='buyer_unresponsive'`, evidence_urls populated |
| 9 | Verify `orders` | `escrow_status='disputed'` |
| 10 | Verify `ticket_transfers` | `status='disputed'` |
| 11 | Verify `escrow_payments` | `status='disputed'` |
| 12 | Verify admin email notification | Team notified with `filedByRole='seller'` |

**Money Location:** $50.00 in platform balance, frozen pending admin resolution.

---

#### TC-602: Seller Dispute Resolved in Seller's Favor (Payout)

**Precondition:** TC-601 completed. Admin reviews seller's transfer proof.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin views dispute | Sees seller filed, evidence shows valid transfer |
| 2 | Admin clicks "Pay Seller" | Same as TC-503 steps 2-9 |
| 3 | Verify `escrow_disputes` | `status='resolved_payout'` |
| 4 | Verify transfer to seller | $50.00 transferred to seller's Connect account |

**Money Flow:**
```
Platform: $50.00 → $0.00
Seller: $0.00 → +$50.00
Buyer: -$50.00 (keeps ticket, no refund)
```

---

#### TC-603: Seller Dispute Resolved in Buyer's Favor (Refund)

**Precondition:** TC-601 completed. Admin finds seller's evidence insufficient.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin reviews dispute | Seller's evidence doesn't prove transfer |
| 2 | Admin clicks "Refund Buyer" | Same as TC-502 steps 4-8 |
| 3 | Verify `escrow_disputes` | `status='resolved_refund'` |
| 4 | Verify refund to buyer | $50.00 returned to buyer's card |
| 5 | Verify ticket returned | `tickets.status='available'`, `buyer_id=null` |

---

#### TC-604: Seller Files Dispute After Marking Transfer Sent

**Precondition:** Seller marked transfer sent. `escrow_status='transfer_pending'`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Seller files dispute | Dispute created normally |
| 2 | Verify `escrow_status` changes to `disputed` | Overrides `transfer_pending` |
| 3 | Buyer can no longer confirm receipt while disputed | `confirm-receipt` checks for `disputed` status and blocks |

---

#### TC-605: Seller Provides Transfer Proof via DisputeProofModal

**Precondition:** Dispute exists and is `open` or `under_review`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Seller opens dispute status screen | DisputeProofModal available |
| 2 | Seller uploads: screenshot of transfer confirmation email | Image compressed, uploaded |
| 3 | Seller uploads: ticket transfer receipt | Additional evidence |
| 4 | `DisputeService.addEvidence()` called | URLs merged into `evidence_urls` |
| 5 | Admin can view all evidence in admin panel | Evidence images visible in gallery |

---

### TC-7xx: Edge Cases & Conflict Scenarios

#### TC-701: Seller Disputes After Payout Already Occurred

**Precondition:** Order `escrow_status='completed'`. Seller already received payout.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Seller attempts to file dispute | `DisputeService.openDispute()` called |
| 2 | Dispute created | Should succeed (dispute can be filed on any order where user is buyer/seller) |
| 3 | `orders.escrow_status` updated to `disputed` | Overrides `completed` |
| 4 | Admin reviews | Sees that payout already occurred |
| 5 | Admin tries "Pay Seller" | `process-payout` checks `escrow_payments.status='paid_out'` → "Order has already been paid out" |
| 6 | Admin tries "Refund Buyer" | `process-refund` checks `escrow_status` → likely blocked since original status was `completed` |
| 7 | No double-payout possible | `seller_transfers` already has `status='paid'` record → "Transfer already completed" |

**Critical Verification:** Confirm that NO additional money can be moved after a completed payout.

---

#### TC-702: Buyer Disputes While Seller Dispute is Already Pending

**Precondition:** Seller has filed a dispute (TC-601). `escrow_disputes` has `status='open'`.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Buyer attempts to file dispute on same order | `DisputeService.openDispute()` called |
| 2 | Existing dispute check triggers | Query finds existing dispute with `status IN ('open', 'under_review')` |
| 3 | Error returned | "A dispute is already open for this order" |
| 4 | Buyer cannot create duplicate dispute | Only one active dispute per order |

**Workaround for buyer:** Buyer can add evidence to the existing dispute via `DisputeService.addEvidence()` (both parties can add evidence).

---

#### TC-703: Conflicting Claims — Seller Says Transferred, Buyer Says Not Received

**Precondition:** Seller marked transfer sent. Buyer has not confirmed.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Seller files dispute with reason `buyer_unresponsive`, uploads transfer proof | Dispute created, `filed_by_role='seller'` |
| 2 | Buyer adds counter-evidence (screenshots showing no ticket received) | `addEvidence()` merges buyer's evidence into same dispute |
| 3 | Admin reviews dispute | Sees evidence from BOTH parties in same dispute record |
| 4 | Admin sees `filed_by_role='seller'` | Knows seller initiated |
| 5 | Admin sees all evidence_urls | Reviews both seller's transfer proof and buyer's counter-evidence |
| 6 | Admin decides based on evidence | Resolves as `resolved_payout` or `resolved_refund` |

**Key insight:** The system has ONE dispute per order. Both parties contribute evidence to the same dispute. The admin sees the full picture.

---

#### TC-704: Dispute Filed Near Transfer Deadline

**Precondition:** Transfer deadline is in 10 minutes. Seller has NOT marked transfer sent.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Buyer files dispute (seller_unresponsive) | Dispute created normally |
| 2 | `escrow_status` changes to `disputed` | Prevents auto-confirm from running |
| 3 | Transfer deadline passes | `auto-confirm-transfers` should NOT auto-confirm a disputed order |
| 4 | Admin resolves manually | Standard resolution flow |

---

#### TC-705: Seller Account Restricted Mid-Dispute

**Precondition:** Dispute is `open`. Seller's account becomes `restricted` (payouts_enabled=false).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin resolves in seller's favor | `process-payout` called |
| 2 | Function checks `sellerAccount.payouts_enabled` | `false` |
| 3 | Error returned | "Seller account is not ready to receive payouts" |
| 4 | Payout fails | Dispute status already updated to `resolved_payout` but transfer didn't complete |
| 5 | Manual intervention needed | Admin must re-investigate once seller's account is restored |

**Verify:** `seller_transfers` record may have `status='failed'` or may not exist at all.

---

#### TC-706: Refund + Dispute Overlap

**Precondition:** Order is at `escrow_status='payment_held'`. Admin processes refund. Then dispute filed.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin refunds order | `escrow_status='refunded'`, `escrow_payments.status='refunded'` |
| 2 | Buyer or seller files dispute on refunded order | Dispute may be created (no status block on dispute creation) |
| 3 | `orders.escrow_status` changes to `disputed` | Overrides `refunded` |
| 4 | Admin tries to refund again | Blocked: "This order has already been refunded" (escrow_payments.status check) |
| 5 | Admin tries to pay seller | `process-payout` checks `escrow_payments.status='refunded'` → "Order has been refunded, cannot payout" |

**Critical Verification:** No money can move after a refund, even if a dispute is filed.

---

#### TC-707: Multiple Disputes from Same Buyer on Different Orders

**Precondition:** Buyer A has purchased from multiple sellers.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Buyer files dispute on Order 1 | Dispute 1 created |
| 2 | Buyer files dispute on Order 2 | Dispute 2 created (different order, different dispute) |
| 3 | Both disputes visible in admin panel | Admin sees two separate disputes |
| 4 | Each resolves independently | Resolution of one does not affect the other |

---

#### TC-708: Webhook Delay Simulation

**Precondition:** Buyer makes payment, but `payment_intent.succeeded` webhook is delayed.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Buyer completes payment in Stripe | PaymentIntent status = `succeeded` in Stripe |
| 2 | Webhook NOT yet received | `escrow_payments.status` remains `pending` |
| 3 | Verify order state | `orders.escrow_status='payment_pending'` |
| 4 | Seller cannot mark transfer sent | `mark-transfer-sent` requires `escrow_status='payment_held'` → blocked |
| 5 | Webhook finally arrives | All statuses update correctly |
| 6 | After webhook: seller can proceed | Normal flow resumes |

**How to simulate:** Temporarily disable the webhook endpoint in Stripe Dashboard, make a payment, then re-enable and manually replay the event via Stripe CLI or Dashboard.

---

#### TC-709: Evidence Submission Boundaries

| Test | Action | Expected |
|------|--------|----------|
| Upload 0 images | Submit dispute with no evidence | Dispute created, `evidence_urls=[]` |
| Upload 5 images | Submit dispute with max evidence | Dispute created, all 5 URLs stored |
| Upload oversized image | Submit very large image | Image compressed to max 1200px width, 70% JPEG quality before upload |
| Description at 20 chars | Enter exactly 20 characters | Accepted (minimum boundary) |
| Description at 19 chars | Enter 19 characters | Rejected (below minimum) |
| Description at 1000 chars | Enter exactly 1000 characters | Accepted (maximum boundary) |
| Description at 1001 chars | Enter 1001 characters | Rejected (above maximum) |

---

#### TC-710: Dispute on Order with Missing Escrow Payment Record

**Precondition:** Edge case where `escrow_payments` lookup fails (RLS or data inconsistency).

| Step | Action | Expected |
|------|--------|----------|
| 1 | File dispute on order where escrow payment can't be found | `DisputeService.openDispute()` handles gracefully |
| 2 | `escrow_payment_id` set to null | Dispute created without escrow_payment_id (column is nullable) |
| 3 | Fallback update by `order_id` | `escrow_payments.status` updated via `order_id` instead of `id` |

---

### TC-8xx: Penalty & Trust System

#### TC-801: Admin Applies Warning Penalty

**Precondition:** Dispute resolved. Admin determines one party acted in bad faith.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin opens dispute resolution | Penalty options visible |
| 2 | Admin selects "Warning" penalty for the bad-faith user | Penalty created in `user_penalties` |
| 3 | Verify `user_penalties` | `penalty_type='warning'`, `is_active=true` |
| 4 | Verify user can still buy/sell | Warning does not block activity |

---

#### TC-802: Admin Applies Temporary Suspension

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin selects "Temporary Suspension" for N days | Penalty created |
| 2 | Verify `user_penalties` | `penalty_type='temporary_suspension'`, `suspension_until` set |
| 3 | Suspended user tries to list ticket | Blocked |
| 4 | Suspended user tries to purchase | Blocked |
| 5 | After suspension expires | User can transact again |

---

#### TC-803: Admin Applies Permanent Ban

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin selects "Permanent Ban" | Penalty created |
| 2 | Verify `user_penalties` | `penalty_type='permanent_ban'`, `is_active=true` |
| 3 | Banned user cannot access marketplace | All transactional actions blocked |

---

#### TC-804: Trust Score Updates After Successful Transaction

| Step | Action | Expected |
|------|--------|----------|
| 1 | Complete a full happy-path transaction (TC-201 → TC-302) | Transaction completes |
| 2 | Verify `user_trust_status` for seller | `successful_sales` incremented, `total_transactions` incremented |
| 3 | Verify `user_trust_status` for buyer | `successful_purchases` incremented, `total_transactions` incremented |

---

## 4. Money Flow Diagrams

### 4.1 Happy Path: Purchase → Transfer → Payout

```
Buyer pays $50.00
    │
    ▼
[Platform Stripe Balance: +$50.00]  ← PaymentIntent.succeeded
    │
    │  Seller marks transfer sent (no money movement)
    │
    │  Buyer confirms receipt
    │
    ▼
stripe.transfers.create($50.00 → Seller Connect Account)
    │
    ▼
[Platform Stripe Balance: $0.00]
[Seller Connect Balance: +$50.00]
    │
    │  Stripe standard payout schedule (2-3 business days)
    │
    ▼
[Seller Bank Account: +$50.00]
```

### 4.2 Refund Path: Purchase → Refund

```
Buyer pays $50.00
    │
    ▼
[Platform Stripe Balance: +$50.00]
    │
    │  Admin triggers refund
    │
    ▼
stripe.refunds.create() → $50.00 back to buyer's card
    │
    ▼
[Platform Stripe Balance: $0.00]
[Buyer Card: +$50.00 refund (5-10 business days)]
[Seller: $0.00 (never received anything)]

Note: Stripe processing fees (~2.9% + $0.30) are absorbed by platform.
      On a $50 ticket, platform loses approximately $1.75 in Stripe fees.
```

### 4.3 Buyer Dispute → Refund Resolution

```
Buyer pays $50.00
    │
    ▼
[Platform Balance: +$50.00]  escrow_status='payment_held'
    │
    │  Dispute filed → escrow_status='disputed'
    │  Funds FROZEN in platform balance
    │
    │  Admin reviews evidence
    │  Admin resolves: "resolved_refund"
    │
    ▼
process-refund → stripe.refunds.create()
    │
    ▼
[Platform Balance: $0.00]
[Buyer Card: +$50.00]
[Seller: $0.00]
```

### 4.4 Buyer Dispute → Payout Resolution (Seller Wins)

```
Buyer pays $50.00
    │
    ▼
[Platform Balance: +$50.00]  escrow_status='payment_held'
    │
    │  Dispute filed → escrow_status='disputed'
    │
    │  Admin reviews evidence, rules for seller
    │  Admin resolves: "resolved_payout"
    │
    ▼
process-payout → stripe.transfers.create()
    │
    ▼
[Platform Balance: $0.00]
[Seller Connect: +$50.00]
[Buyer: -$50.00 (no refund)]
```

### 4.5 Seller Dispute → Payout Resolution

```
Buyer pays $50.00
    │
    ▼
[Platform Balance: +$50.00]
    │
    │  Seller marks transfer sent
    │  Buyer does NOT confirm
    │  Seller files dispute → escrow_status='disputed'
    │
    │  Admin reviews seller's transfer proof
    │  Admin resolves: "resolved_payout"
    │
    ▼
process-payout → stripe.transfers.create()
    │
    ▼
[Platform Balance: $0.00]
[Seller Connect: +$50.00]
```

### 4.6 Seller Dispute → Refund Resolution (Buyer Wins)

```
Buyer pays $50.00
    │
    ▼
[Platform Balance: +$50.00]
    │
    │  Seller claims transfer, files dispute
    │  Admin finds seller's evidence insufficient
    │  Admin resolves: "resolved_refund"
    │
    ▼
process-refund → stripe.refunds.create()
    │
    ▼
[Platform Balance: $0.00]
[Buyer Card: +$50.00]
[Seller: $0.00]
```

---

## 5. Stripe Dashboard Verification Steps

### 5.1 Platform Dashboard Checklist

**After a purchase (TC-201):**

- [ ] Go to **Payments** → search by PaymentIntent ID or filter by amount
- [ ] Confirm status = "Succeeded"
- [ ] Click into payment → verify metadata: `order_id`, `ticket_id`, `buyer_id`, `seller_id`, `seller_stripe_account`
- [ ] Verify amount matches ticket price
- [ ] Check **Balance** → payment amount reflected in available/pending balance

**After a transfer to seller (TC-302):**

- [ ] Go to **Connect** → **Transfers** (or search by Transfer ID)
- [ ] Confirm transfer amount matches escrow amount
- [ ] Confirm destination = seller's Connect account ID
- [ ] Verify metadata: `order_id`, `escrow_payment_id`, `seller_id`
- [ ] Check **Balance** → platform balance decreased by transfer amount

**After a refund (TC-401):**

- [ ] Go to **Payments** → find original payment
- [ ] Status should show "Refunded"
- [ ] Click into payment → refund section shows the refund object
- [ ] Verify refund metadata: `order_id`, `admin_id`, `refund_reason`, `dispute_id`
- [ ] Check **Balance** → platform balance decreased by refund amount

**Connected Accounts:**

- [ ] Go to **Connect** → **Accounts**
- [ ] Find seller's account by ID
- [ ] Verify `charges_enabled` and `payouts_enabled` status
- [ ] Check for any outstanding requirements

### 5.2 Seller Express Dashboard Checklist

**After receiving a transfer:**

- [ ] Open seller's Stripe Express Dashboard (via `get-stripe-dashboard-link` in-app)
- [ ] Check **Balance** → incoming transfer visible
- [ ] Check **Payouts** → funds may be pending (standard 2-3 day schedule)
- [ ] Verify transfer amount matches expected payout

### 5.3 How to Find a Specific PaymentIntent by Metadata

In Platform Stripe Dashboard:
1. Go to **Payments**
2. Click **Filter** → search by metadata key/value
3. Or use Stripe CLI: `stripe payment_intents list --limit 10`
4. Or search by PaymentIntent ID directly if you have it from your test log

### 5.4 How to Verify Transfer Amounts

1. Record the `escrow_payments.amount_cents` from the database
2. In Stripe Dashboard, find the Transfer object
3. Verify Transfer amount = `amount_cents` (both in cents)
4. Since there are no platform fees: Transfer amount = original payment amount

---

## 6. Tester Money-Tracking Log

### 6.1 Log Template

Copy this table for each test session:

| Test Case | Buyer ID | Seller ID | Seller Stripe Acct | PaymentIntent ID | Charge ID | Amount ($) | Dispute ID | Refund ID | Transfer ID | Final: Platform | Final: Seller | Final: Buyer | Pass/Fail | Notes |
|-----------|----------|-----------|---------------------|------------------|-----------|------------|------------|-----------|-------------|-----------------|---------------|--------------|-----------|-------|
| TC-201 | uuid... | uuid... | acct_... | pi_... | ch_... | $50.00 | — | — | — | +$50.00 (held) | $0.00 | -$50.00 | | |
| TC-302 | uuid... | uuid... | acct_... | pi_... | ch_... | $50.00 | — | — | tr_... | $0.00 | +$50.00 | -$50.00 | | |
| TC-401 | uuid... | uuid... | acct_... | pi_... | ch_... | $50.00 | — | re_... | — | $0.00 | $0.00 | $0.00 | | |
| TC-501 | uuid... | uuid... | acct_... | pi_... | ch_... | $50.00 | uuid... | — | — | +$50.00 (frozen) | $0.00 | -$50.00 | | |

### 6.2 How to Fill the Log

| Column | Where to Find It |
|--------|------------------|
| Buyer ID | `orders.buyer_id` or `profiles.id` |
| Seller ID | `orders.seller_id` or `profiles.id` |
| Seller Stripe Acct | `stripe_accounts.stripe_account_id` |
| PaymentIntent ID | `escrow_payments.stripe_payment_intent_id` (starts with `pi_`) |
| Charge ID | `escrow_payments.stripe_charge_id` (starts with `ch_`) |
| Amount | `orders.amount` (dollars) or `escrow_payments.amount_cents / 100` |
| Dispute ID | `escrow_disputes.id` (UUID) |
| Refund ID | Stripe refund ID from `process-refund` response (starts with `re_`) |
| Transfer ID | `seller_transfers.stripe_transfer_id` (starts with `tr_`) |

### 6.3 Reconciliation Checklist

After each test case, confirm:

- [ ] **DB amount matches Stripe amount:** `escrow_payments.amount_cents` = PaymentIntent amount in Stripe Dashboard
- [ ] **Transfer matches escrow:** If payout occurred, `seller_transfers.amount_cents` = `escrow_payments.amount_cents`
- [ ] **Status consistency:** `orders.escrow_status` matches `escrow_payments.status` (both reflect same state)
- [ ] **No orphaned records:** Every `escrow_payments` row has a matching `orders` row
- [ ] **No double-pay:** For a given order, at most ONE `seller_transfers` row with `status='paid'`
- [ ] **No double-refund:** For a given PaymentIntent, at most ONE successful refund in Stripe
- [ ] **Ticket state correct:** If refunded, ticket is `available` with `buyer_id=null`. If completed, ticket is `sold` with buyer.

---

## 7. Database Verification Queries

Run these in Supabase Dashboard > SQL Editor:

### 7.1 Full Order + Payment Status for a Specific Order

```sql
SELECT
  o.id AS order_id,
  o.status AS order_status,
  o.escrow_status,
  o.amount,
  o.transfer_deadline,
  o.notes,
  ep.id AS escrow_payment_id,
  ep.stripe_payment_intent_id,
  ep.stripe_charge_id,
  ep.amount_cents,
  ep.status AS payment_status,
  tt.status AS transfer_status,
  tt.transfer_proof_url,
  tt.confirmed_at,
  tt.confirmed_by
FROM orders o
LEFT JOIN escrow_payments ep ON ep.order_id = o.id
LEFT JOIN ticket_transfers tt ON tt.order_id = o.id
WHERE o.id = '<ORDER_ID>';
```

### 7.2 Seller Transfer Details

```sql
SELECT
  st.id,
  st.stripe_transfer_id,
  st.stripe_account_id,
  st.amount_cents,
  st.status,
  st.failure_reason,
  st.transferred_at,
  ep.stripe_payment_intent_id,
  o.id AS order_id,
  o.escrow_status
FROM seller_transfers st
JOIN escrow_payments ep ON ep.id = st.escrow_payment_id
JOIN orders o ON o.id = ep.order_id
WHERE st.seller_id = '<SELLER_ID>'
ORDER BY st.created_at DESC;
```

### 7.3 Dispute Details with Full Context

```sql
SELECT
  d.id AS dispute_id,
  d.status AS dispute_status,
  d.reason,
  d.description,
  d.filed_by_role,
  d.evidence_urls,
  d.resolution,
  d.resolved_at,
  o.id AS order_id,
  o.escrow_status,
  o.amount,
  ep.status AS payment_status,
  ep.stripe_payment_intent_id,
  filer.full_name AS filed_by_name,
  filer.email AS filed_by_email,
  resolver.full_name AS resolved_by_name
FROM escrow_disputes d
JOIN orders o ON o.id = d.order_id
LEFT JOIN escrow_payments ep ON ep.id = d.escrow_payment_id
JOIN profiles filer ON filer.id = d.filed_by
LEFT JOIN profiles resolver ON resolver.id = d.resolved_by
WHERE d.id = '<DISPUTE_ID>';
```

### 7.4 All Open Disputes (Admin View)

```sql
SELECT
  d.id,
  d.reason,
  d.filed_by_role,
  d.status,
  d.created_at,
  o.amount,
  o.escrow_status,
  t.title AS ticket_title,
  filer.full_name AS filed_by
FROM escrow_disputes d
JOIN orders o ON o.id = d.order_id
JOIN tickets t ON t.id = o.ticket_id
JOIN profiles filer ON filer.id = d.filed_by
WHERE d.status IN ('open', 'under_review')
ORDER BY d.created_at ASC;
```

### 7.5 Reconciliation: Orders with Mismatched Statuses

```sql
-- Find orders where escrow_status and payment status are inconsistent
SELECT
  o.id,
  o.escrow_status,
  ep.status AS payment_status,
  CASE
    WHEN o.escrow_status = 'payment_held' AND ep.status != 'payment_held' THEN 'MISMATCH'
    WHEN o.escrow_status = 'refunded' AND ep.status != 'refunded' THEN 'MISMATCH'
    WHEN o.escrow_status = 'completed' AND ep.status != 'paid_out' THEN 'MISMATCH'
    WHEN o.escrow_status = 'disputed' AND ep.status != 'disputed' THEN 'MISMATCH'
    ELSE 'OK'
  END AS status_check
FROM orders o
JOIN escrow_payments ep ON ep.order_id = o.id
WHERE o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC;
```

### 7.6 Double-Payout Detection

```sql
-- Find orders with more than one successful transfer
SELECT
  ep.order_id,
  COUNT(*) AS transfer_count,
  SUM(st.amount_cents) AS total_transferred_cents
FROM seller_transfers st
JOIN escrow_payments ep ON ep.id = st.escrow_payment_id
WHERE st.status = 'paid'
GROUP BY ep.order_id
HAVING COUNT(*) > 1;
-- Should return 0 rows. Any results = critical bug.
```

---

## 8. Webhook Event Verification

### 8.1 How to Check Webhook Logs

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click on the webhook endpoint
3. View **Recent Events** tab
4. Each event shows: type, status (succeeded/failed), timestamp, response code

**Alternatively, use Stripe CLI:**
```bash
stripe listen --forward-to https://<project>.supabase.co/functions/v1/stripe-webhook
stripe trigger payment_intent.succeeded
```

### 8.2 Expected Webhook Events per Flow

#### Purchase Flow:
| Event | When | What it updates |
|-------|------|-----------------|
| `payment_intent.succeeded` | After buyer pays | `escrow_payments.status → payment_held`, `orders.escrow_status → payment_held`, `tickets.status → sold` |

#### Failed Payment:
| Event | When | What it updates |
|-------|------|-----------------|
| `payment_intent.payment_failed` | Card declined | `orders.escrow_status → payment_pending`, `orders.notes` updated with failure reason |

#### Refund:
| Event | When | What it updates |
|-------|------|-----------------|
| `charge.refunded` | After admin refund | `escrow_payments.status → refunded`, `orders.escrow_status → refunded`, `tickets.status → available` |

#### Transfer (Payout):
| Event | When | What it updates |
|-------|------|-----------------|
| `transfer.created` | After confirm-receipt or admin payout | `seller_transfers.status → paid` |
| `transfer.failed` | If transfer fails | `seller_transfers.status → failed`, `failure_reason` set |
| `transfer.reversed` | If transfer reversed | `seller_transfers.status → reversed` |

#### Connect Account:
| Event | When | What it updates |
|-------|------|-----------------|
| `account.updated` | Seller updates info/verification completes | `stripe_accounts` fields updated |
| `account.application.deauthorized` | Seller disconnects | `stripe_accounts.account_status → disabled` |

### 8.3 What to Do When Webhooks Fail

1. **Check Stripe Dashboard** → Webhooks → Failed events
2. **Retry manually:** Click "Resend" on the failed event
3. **Check Edge Function logs:** Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
4. **Common failures:**
   - Signature verification failed → check `STRIPE_WEBHOOK_SECRET` env var
   - Function timeout → check for slow DB queries
   - Missing environment variables → check Edge Function config

---

## 9. Chargeback Awareness Appendix

### What Is a Stripe Chargeback?

A **chargeback** occurs when a buyer contacts their **bank or card issuer** (not your app) to dispute a charge. This is different from an in-app dispute.

| | In-App Dispute | Stripe Chargeback |
|---|---|---|
| **Who initiates** | Buyer/seller inside MyCollegeTix | Buyer via their bank/card issuer |
| **Where it happens** | Your `escrow_disputes` table | Stripe's dispute system |
| **Who decides outcome** | Your admin | The buyer's bank |
| **Cost to platform** | Free | $15 dispute fee charged by Stripe |
| **Timeline** | You control the pace | 7-21 day bank deadline |
| **Can you prevent it?** | N/A | Yes — by resolving refunds quickly through in-app disputes |

### Why Chargebacks Matter

Even though your app handles disputes internally, a buyer can ALWAYS go to their bank. If you don't resolve a legitimate refund request quickly enough, the buyer might file a chargeback, which:

1. **Costs $15** per dispute (win or lose, in many cases)
2. **Freezes the disputed amount** from your platform balance
3. **Requires evidence submission** within 7-21 days
4. **Bank decides** the outcome (not you)
5. **High chargeback rates** can get your Stripe account suspended

### Current Implementation Status

The `stripe-webhook` function DOES handle `charge.dispute.created`:
- Creates an `escrow_disputes` record with `reason='Stripe chargeback: <reason>'`
- Updates `escrow_payments.status → 'disputed'`
- Updates `orders.escrow_status → 'disputed'`

This is a reasonable safety net. It blocks further money movement when a chargeback is filed.

### Best Practice: Prevent Chargebacks

The best defense against chargebacks is proactive in-app dispute resolution:
1. Buyer reports problem in-app
2. Admin reviews within 24-48 hours
3. If legitimate, refund the buyer immediately
4. A refunded buyer has no reason to file a bank chargeback

### Future Testing Consideration

If you want to test chargebacks in the future, Stripe provides test card numbers that trigger disputes:
- `4000 0000 0000 0259` — Creates a dispute with reason "fraudulent"
- `4000 0000 0000 1976` — Creates a dispute with reason "product_not_received"

These would trigger the `charge.dispute.created` webhook and test your handler.

---

## 10. Final Validation Checklist

### Master Test Execution Checklist

**Seller Onboarding (TC-1xx):**
- [ ] TC-101: No Stripe account → blocked from selling
- [ ] TC-102: Account creation and onboarding flow
- [ ] TC-103: Incomplete onboarding → blocked
- [ ] TC-104: Restricted account → blocked with details
- [ ] TC-105: Fully enabled → can sell
- [ ] TC-106: Account disabled mid-lifecycle → blocked
- [ ] TC-107: `account.updated` webhook updates DB
- [ ] TC-108: Account deauthorization handling

**Buyer Purchase (TC-2xx):**
- [ ] TC-201: Full happy path purchase
- [ ] TC-202: Declined card handling
- [ ] TC-203: Purchase blocked < 1 hour before event
- [ ] TC-204: Transfer deadline calculation for all windows

**Transfer & Payout (TC-3xx):**
- [ ] TC-301: Seller marks transfer sent
- [ ] TC-302: Buyer confirms receipt → payout to seller
- [ ] TC-303: Auto-confirm after deadline
- [ ] TC-304: Payout fails with restricted seller
- [ ] TC-305: Payout amount matches escrow exactly

**Refund (TC-4xx):**
- [ ] TC-401: Refund from payment_held
- [ ] TC-402: Refund from transfer_pending
- [ ] TC-403: Refund from disputed
- [ ] TC-404: Refund blocked after completed payout
- [ ] TC-405: Double refund prevention

**Buyer Disputes (TC-5xx):**
- [ ] TC-501: Buyer files dispute
- [ ] TC-502: Admin resolves with refund
- [ ] TC-503: Admin resolves with payout (seller wins)
- [ ] TC-504: Admin escalates
- [ ] TC-505: Additional evidence submission
- [ ] TC-506: All dispute reason types

**Seller Disputes (TC-6xx):**
- [ ] TC-601: Seller files dispute
- [ ] TC-602: Resolved in seller's favor
- [ ] TC-603: Resolved in buyer's favor
- [ ] TC-604: Dispute after marking transfer sent
- [ ] TC-605: Seller provides transfer proof

**Edge Cases (TC-7xx):**
- [ ] TC-701: Dispute after payout completed
- [ ] TC-702: Duplicate dispute on same order blocked
- [ ] TC-703: Conflicting claims, both parties add evidence
- [ ] TC-704: Dispute near transfer deadline
- [ ] TC-705: Seller account restricted mid-dispute
- [ ] TC-706: Refund + dispute overlap
- [ ] TC-707: Multiple disputes from same buyer (different orders)
- [ ] TC-708: Webhook delay simulation
- [ ] TC-709: Evidence submission boundaries
- [ ] TC-710: Dispute with missing escrow payment

**Penalties & Trust (TC-8xx):**
- [ ] TC-801: Warning penalty
- [ ] TC-802: Temporary suspension
- [ ] TC-803: Permanent ban
- [ ] TC-804: Trust score updates

### Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Tester | | | |
| Developer | | | |
| Product Owner | | | |

---

## Key Source Files Reference

| File | Purpose |
|------|---------|
| `supabase/functions/create-payment-intent/index.ts` | PaymentIntent creation, escrow initiation |
| `supabase/functions/create-connect-account/index.ts` | Seller Express account creation |
| `supabase/functions/check-selling-eligibility/index.ts` | Seller eligibility verification |
| `supabase/functions/mark-transfer-sent/index.ts` | Seller confirms ticket transfer |
| `supabase/functions/confirm-receipt/index.ts` | Buyer confirms receipt, triggers payout |
| `supabase/functions/process-refund/index.ts` | Admin-initiated refund |
| `supabase/functions/process-payout/index.ts` | Admin-initiated payout |
| `supabase/functions/stripe-webhook/index.ts` | Stripe event handling |
| `supabase/functions/notify-dispute/index.ts` | Dispute email notifications |
| `src/services/disputeService.ts` | Dispute CRUD and resolution logic |
| `src/services/escrowService.ts` | Escrow lifecycle management |
| `src/services/penaltyService.ts` | User penalty management |
| `src/app/dispute/[orderId].tsx` | Dispute filing screen |
| `src/app/dispute/status/[disputeId].tsx` | Dispute status screen |
| `src/app/(admin)/disputes.tsx` | Admin dispute dashboard |
