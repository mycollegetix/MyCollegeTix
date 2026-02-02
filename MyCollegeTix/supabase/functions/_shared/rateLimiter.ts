// _shared/rateLimiter.ts
// Database-backed rate limiting utility for edge functions
// Uses PostgreSQL function for atomic rate limit checks

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Rate limit configurations by endpoint type
export const RATE_LIMIT_CONFIGS = {
  // Financial operations - strict limits
  financial: { maxRequests: 10, windowSeconds: 60, keyType: 'both' as const },

  // Authentication operations - prevent brute force
  auth: { maxRequests: 5, windowSeconds: 900, keyType: 'ip' as const },

  // General operations - reasonable limits
  general: { maxRequests: 30, windowSeconds: 60, keyType: 'user' as const },

  // Webhooks - high volume from trusted source
  webhook: { maxRequests: 100, windowSeconds: 1, keyType: 'ip' as const },

  // Account creation - prevent spam
  accountCreation: { maxRequests: 3, windowSeconds: 3600, keyType: 'both' as const },

  // Notifications - prevent spam
  notification: { maxRequests: 20, windowSeconds: 60, keyType: 'user' as const },
} as const

export type RateLimitConfig = {
  maxRequests: number
  windowSeconds: number
  keyType: 'ip' | 'user' | 'both'
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Extract client IP from request headers
 * Handles various proxy scenarios (Cloudflare, AWS ALB, etc.)
 */
export function getClientIp(req: Request): string {
  // Try various headers in order of preference
  const headers = [
    'cf-connecting-ip',      // Cloudflare
    'x-real-ip',             // Nginx
    'x-forwarded-for',       // Standard proxy header
    'x-client-ip',           // Apache
  ]

  for (const header of headers) {
    const value = req.headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0]?.trim()
      if (ip) return ip
    }
  }

  return 'unknown'
}

/**
 * Generate rate limit key based on configuration
 */
export function generateRateLimitKey(
  req: Request,
  userId: string | null,
  keyType: 'ip' | 'user' | 'both'
): string {
  const ip = getClientIp(req)

  switch (keyType) {
    case 'ip':
      return `ip:${ip}`
    case 'user':
      return userId ? `user:${userId}` : `ip:${ip}`
    case 'both':
      return userId ? `both:${userId}:${ip}` : `ip:${ip}`
    default:
      return `ip:${ip}`
  }
}

/**
 * Check rate limit using database function
 * Returns whether the request is allowed and rate limit info
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  req: Request,
  endpoint: string,
  config: RateLimitConfig,
  userId: string | null = null
): Promise<RateLimitResult> {
  const key = generateRateLimitKey(req, userId, config.keyType)

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_endpoint: endpoint,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    })

    if (error) {
      console.error('Rate limit check error:', error)
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + config.windowSeconds * 1000),
      }
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      resetAt: new Date(data.reset_at),
    }
  } catch (err) {
    console.error('Rate limit exception:', err)
    // On exception, allow the request but log it
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowSeconds * 1000),
    }
  }
}

/**
 * Create a rate limit exceeded response with proper headers
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toISOString(),
      },
    }
  )
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult,
  config: RateLimitConfig
): Response {
  const newHeaders = new Headers(response.headers)
  newHeaders.set('X-RateLimit-Limit', config.maxRequests.toString())
  newHeaders.set('X-RateLimit-Remaining', result.remaining.toString())
  newHeaders.set('X-RateLimit-Reset', result.resetAt.toISOString())

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

/**
 * Middleware-style rate limiter that can be used at the start of any edge function
 * Returns null if allowed, or a Response if rate limited
 */
export async function rateLimitMiddleware(
  supabase: SupabaseClient,
  req: Request,
  endpoint: string,
  configName: keyof typeof RATE_LIMIT_CONFIGS,
  userId: string | null = null,
  corsHeaders: Record<string, string> = {}
): Promise<{ response: Response | null; result: RateLimitResult }> {
  const config = RATE_LIMIT_CONFIGS[configName]
  const result = await checkRateLimit(supabase, req, endpoint, config, userId)

  if (!result.allowed) {
    return {
      response: rateLimitExceededResponse(result, corsHeaders),
      result,
    }
  }

  return { response: null, result }
}
