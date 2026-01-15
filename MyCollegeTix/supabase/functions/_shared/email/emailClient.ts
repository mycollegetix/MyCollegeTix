// supabase/functions/_shared/email/emailClient.ts
// AWS SES client wrapper for sending transactional emails
// @ts-nocheck

import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

// AWS SES Configuration
function getAwsConfig() {
  // @ts-ignore: Deno global
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID') || Deno.env.get('AWS_SES_ACCESS_KEY_ID');
  // @ts-ignore: Deno global
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY') || Deno.env.get('AWS_SES_SECRET_ACCESS_KEY');
  // @ts-ignore: Deno global
  const region = Deno.env.get('AWS_REGION') || Deno.env.get('AWS_SES_REGION') || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS SES credentials not configured');
  }

  return { accessKeyId, secretAccessKey, region };
}

export function getFromEmail(): string {
  // @ts-ignore: Deno global
  return Deno.env.get('SES_FROM_EMAIL') || Deno.env.get('RESEND_FROM_EMAIL') || 'MyCollegeTix <noreply@mycollegetix.com>';
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// AWS Signature Version 4 signing
function sign(key: Uint8Array, msg: string): Uint8Array {
  const hmac = createHmac('sha256', key);
  hmac.update(msg);
  return new Uint8Array(hmac.digest());
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Uint8Array {
  const kDate = sign(new TextEncoder().encode('AWS4' + key), dateStamp);
  const kRegion = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  const kSigning = sign(kService, 'aws4_request');
  return kSigning;
}

function sha256(message: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = new Uint8Array(32);

  // Use Web Crypto API for SHA-256
  const crypto = globalThis.crypto;
  return crypto.subtle.digestSync ?
    Array.from(new Uint8Array(crypto.subtle.digestSync('SHA-256', data)))
      .map(b => b.toString(16).padStart(2, '0')).join('') :
    '';
}

async function sha256Async(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const { accessKeyId, secretAccessKey, region } = getAwsConfig();
    const fromEmail = getFromEmail();

    const service = 'ses';
    const host = `email.${region}.amazonaws.com`;
    const endpoint = `https://${host}/v2/email/outbound-emails`;

    // Prepare the request body
    const body = JSON.stringify({
      Content: {
        Simple: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: params.html,
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: params.subject,
          },
        },
      },
      Destination: {
        ToAddresses: [params.to],
      },
      FromEmailAddress: fromEmail,
      ...(params.replyTo && {
        ReplyToAddresses: [params.replyTo],
      }),
    });

    // Create timestamp
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // Create canonical request
    const method = 'POST';
    const canonicalUri = '/v2/email/outbound-emails';
    const canonicalQuerystring = '';

    const payloadHash = await sha256Async(body);

    const canonicalHeaders =
      `content-type:application/json\n` +
      `host:${host}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = 'content-type;host;x-amz-date';

    const canonicalRequest =
      `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Async(canonicalRequest);
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

    // Calculate signature
    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = toHex(sign(signingKey, stringToSign));

    // Create authorization header
    const authorizationHeader =
      `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Make the request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzDate,
        'Authorization': authorizationHeader,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AWS SES error:', response.status, errorText);
      return { success: false, error: `SES error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    console.log(`Email sent successfully via AWS SES: ${result.MessageId}`);

    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}

// Simpler approach using SES v1 API with query parameters (more compatible)
export async function sendEmailV1(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const { accessKeyId, secretAccessKey, region } = getAwsConfig();
    const fromEmail = getFromEmail();

    const host = `email.${region}.amazonaws.com`;
    const endpoint = `https://${host}/`;

    // Build query parameters for SES v1 SendEmail action
    const queryParams = new URLSearchParams({
      'Action': 'SendEmail',
      'Source': fromEmail,
      'Destination.ToAddresses.member.1': params.to,
      'Message.Subject.Data': params.subject,
      'Message.Subject.Charset': 'UTF-8',
      'Message.Body.Html.Data': params.html,
      'Message.Body.Html.Charset': 'UTF-8',
      'Version': '2010-12-01',
    });

    if (params.replyTo) {
      queryParams.append('ReplyToAddresses.member.1', params.replyTo);
    }

    const body = queryParams.toString();

    // Create timestamp
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // Create canonical request
    const method = 'POST';
    const canonicalUri = '/';
    const canonicalQuerystring = '';

    const payloadHash = await sha256Async(body);

    const canonicalHeaders =
      `content-type:application/x-www-form-urlencoded\n` +
      `host:${host}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = 'content-type;host;x-amz-date';

    const canonicalRequest =
      `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
    const canonicalRequestHash = await sha256Async(canonicalRequest);
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

    // Calculate signature
    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, 'ses');
    const signature = toHex(sign(signingKey, stringToSign));

    // Create authorization header
    const authorizationHeader =
      `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Make the request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Amz-Date': amzDate,
        'Authorization': authorizationHeader,
      },
      body,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('AWS SES error:', response.status, responseText);
      return { success: false, error: `SES error: ${response.status} - ${responseText}` };
    }

    // Parse XML response to get MessageId
    const messageIdMatch = responseText.match(/<MessageId>([^<]+)<\/MessageId>/);
    const messageId = messageIdMatch ? messageIdMatch[1] : undefined;

    console.log(`Email sent successfully via AWS SES: ${messageId}`);

    return { success: true, messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}
