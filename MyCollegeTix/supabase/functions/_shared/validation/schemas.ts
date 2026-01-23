// _shared/validation/schemas.ts
// Zod schemas for input validation in edge functions
// Provides type-safe validation with clear error messages

import { z } from 'https://esm.sh/zod@3.22.4'

// ============================================
// COMMON SCHEMAS
// ============================================

// UUID validation
export const UUIDSchema = z.string().uuid('Invalid UUID format')

// URL validation with reasonable limits
export const URLSchema = z.string().url('Invalid URL').max(2048, 'URL too long')

// Optional URL
export const OptionalURLSchema = URLSchema.optional().nullable()

// Amount in cents (for Stripe)
export const AmountSchema = z.number()
  .int('Amount must be an integer')
  .positive('Amount must be positive')
  .max(1000000, 'Amount exceeds maximum ($10,000)')

// Text fields with length limits
export const ShortTextSchema = z.string()
  .min(1, 'Text is required')
  .max(100, 'Text too long (max 100 chars)')
  .trim()

export const MediumTextSchema = z.string()
  .min(1, 'Text is required')
  .max(500, 'Text too long (max 500 chars)')
  .trim()

export const LongTextSchema = z.string()
  .min(1, 'Text is required')
  .max(2000, 'Text too long (max 2000 chars)')
  .trim()

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const CreatePaymentIntentSchema = z.object({
  ticketId: UUIDSchema,
})

export const ConfirmReceiptSchema = z.object({
  orderId: UUIDSchema,
})

export const MarkTransferSentSchema = z.object({
  orderId: UUIDSchema,
  proofUrl: OptionalURLSchema,
})

export const ProcessRefundSchema = z.object({
  orderId: UUIDSchema,
  reason: LongTextSchema,
  disputeId: UUIDSchema.optional(),
})

export const ProcessPayoutSchema = z.object({
  orderId: UUIDSchema,
})

// ============================================
// ACCOUNT SCHEMAS
// ============================================

export const CreateConnectAccountSchema = z.object({
  userId: UUIDSchema,
})

export const CheckAccountStatusSchema = z.object({
  userId: UUIDSchema.optional(),
})

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

export const SendPushNotificationSchema = z.object({
  userIds: z.array(UUIDSchema)
    .min(1, 'At least one user ID required')
    .max(100, 'Maximum 100 recipients per request'),
  title: ShortTextSchema,
  body: MediumTextSchema,
  data: z.record(z.unknown()).optional(),
})

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate input and return typed result or error response
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  corsHeaders: Record<string, string>
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }))

    console.error('Validation failed:', errors)

    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: errors,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      ),
    }
  }

  return { success: true, data: result.data }
}
