// supabase/functions/_shared/email/index.ts
// Barrel exports for email utilities

export { sendEmail, sendEmailV1, getFromEmail } from './emailClient.ts'
export type { SendEmailParams, SendEmailResult } from './emailClient.ts'

export { sendTransactionalEmail, sendEmailToUser } from './sendTransactionalEmail.ts'
export type { TransactionalEmailParams, TransactionalEmailResult } from './sendTransactionalEmail.ts'

// Templates
export { baseTemplate, highlightBox, infoRow, infoTable } from './templates/baseTemplate.ts'
export type { BaseTemplateParams } from './templates/baseTemplate.ts'

export { paymentSuccessBuyerEmail, paymentSuccessSellerEmail } from './templates/paymentSuccess.ts'
export type { PaymentSuccessBuyerParams, PaymentSuccessSellerParams } from './templates/paymentSuccess.ts'

export { transferSentEmail } from './templates/transferSent.ts'
export type { TransferSentParams } from './templates/transferSent.ts'

export { receiptConfirmedEmail } from './templates/receiptConfirmed.ts'
export type { ReceiptConfirmedParams } from './templates/receiptConfirmed.ts'

export { refundProcessedEmail } from './templates/refundProcessed.ts'
export type { RefundProcessedParams } from './templates/refundProcessed.ts'
