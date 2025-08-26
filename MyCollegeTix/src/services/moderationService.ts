// src/services/moderationService.ts - Content Moderation Service
import { supabase } from '@/src/lib/supabase';

interface ModerationResult {
  flagged: boolean;
  categories: {
    harassment: boolean;
    'harassment/threatening': boolean;
    hate: boolean;
    'hate/threatening': boolean;
    'self-harm': boolean;
    'self-harm/intent': boolean;
    'self-harm/instructions': boolean;
    sexual: boolean;
    'sexual/minors': boolean;
    violence: boolean;
    'violence/graphic': boolean;
  };
  category_scores: {
    [key: string]: number;
  };
}

interface OpenAIModerationResponse {
  id: string;
  model: string;
  results: ModerationResult[];
}

class ModerationService {
  private static instance: ModerationService;
  private openaiApiKey: string | null = null;

  private constructor() {
    // Initialize with environment variable or Supabase config
    this.openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || null;
  }

  static getInstance(): ModerationService {
    if (!ModerationService.instance) {
      ModerationService.instance = new ModerationService();
    }
    return ModerationService.instance;
  }

  // Basic profanity filter as fallback
  private basicProfanityFilter(text: string): boolean {
    const profanityWords = [
      'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
      'crap', 'piss', 'whore', 'slut', 'retard', 'fag',
      // Add more as needed
    ];
    
    const lowerText = text.toLowerCase();
    return profanityWords.some(word => lowerText.includes(word));
  }

  // Check for spam patterns
  private isSpam(text: string): boolean {
    const spamPatterns = [
      /(.)\1{4,}/g, // Repeated characters (aaaaa)
      /^[A-Z\s!]{10,}$/g, // ALL CAPS messages
      /(buy now|click here|free money|get rich|viagra)/gi,
      /(.{1,10})\1{3,}/g, // Repeated phrases
    ];

    return spamPatterns.some(pattern => pattern.test(text));
  }

  // Moderate content using OpenAI API
  async moderateContent(text: string): Promise<{
    isAllowed: boolean;
    reason?: string;
    confidence?: number;
  }> {
    try {
      // Basic checks first (faster)
      if (this.isSpam(text)) {
        await this.logModerationAction(text, 'spam', 'spam_detection');
        return {
          isAllowed: false,
          reason: 'Spam content detected',
          confidence: 0.9
        };
      }

      if (this.basicProfanityFilter(text)) {
        await this.logModerationAction(text, 'profanity', 'basic_filter');
        return {
          isAllowed: false,
          reason: 'Inappropriate language detected',
          confidence: 0.8
        };
      }

      // OpenAI moderation (if API key available)
      if (this.openaiApiKey) {
        const result = await this.openaiModeration(text);
        if (result.flagged) {
          const flaggedCategories = Object.entries(result.categories)
            .filter(([_, flagged]) => flagged)
            .map(([category]) => category);
          
          await this.logModerationAction(text, flaggedCategories.join(', '), 'openai_api');
          
          return {
            isAllowed: false,
            reason: `Content violates policy: ${flaggedCategories.join(', ')}`,
            confidence: 0.95
          };
        }
      }

      return { isAllowed: true };
    } catch (error) {
      console.error('Moderation error:', error);
      // Fail-safe: if moderation fails, allow content but log error
      await this.logModerationAction(text, 'moderation_error', 'error');
      return { isAllowed: true };
    }
  }

  // OpenAI Moderation API call
  private async openaiModeration(text: string): Promise<ModerationResult> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-moderation-latest'
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data: OpenAIModerationResponse = await response.json();
    return data.results[0];
  }

  // Log moderation actions for review
  private async logModerationAction(
    content: string,
    reason: string,
    method: string
  ): Promise<void> {
    try {
      await supabase
        .from('moderation_logs')
        .insert({
          content: content.substring(0, 500), // Limit stored content
          reason,
          method,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log moderation action:', error);
    }
  }

  // Moderate chat messages before sending
  async moderateMessage(
    userId: string,
    conversationId: string,
    content: string
  ): Promise<{ success: boolean; error?: string }> {
    const moderationResult = await this.moderateContent(content);
    
    if (!moderationResult.isAllowed) {
      // Log the violation
      await supabase
        .from('user_violations')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          violation_type: 'inappropriate_content',
          content: content.substring(0, 500),
          reason: moderationResult.reason,
          created_at: new Date().toISOString(),
        });

      return {
        success: false,
        error: moderationResult.reason || 'Content violates community guidelines'
      };
    }

    return { success: true };
  }

  // Moderate ticket listings
  async moderateTicketListing(
    userId: string,
    title: string,
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    const contentToCheck = `${title} ${description || ''}`.trim();
    const moderationResult = await this.moderateContent(contentToCheck);
    
    if (!moderationResult.isAllowed) {
      await supabase
        .from('user_violations')
        .insert({
          user_id: userId,
          violation_type: 'inappropriate_listing',
          content: contentToCheck.substring(0, 500),
          reason: moderationResult.reason,
          created_at: new Date().toISOString(),
        });

      return {
        success: false,
        error: moderationResult.reason || 'Listing violates community guidelines'
      };
    }

    return { success: true };
  }
}

export const moderationService = ModerationService.getInstance();