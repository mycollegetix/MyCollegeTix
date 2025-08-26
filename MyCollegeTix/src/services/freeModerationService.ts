// src/services/freeModerationService.ts - FREE Content Moderation Service (No API costs)
import { supabase } from '@/src/lib/supabase';

interface ModerationResult {
  isAllowed: boolean;
  reason?: string;
  confidence?: number;
}

class FreeModerationService {
  private static instance: FreeModerationService;

  private constructor() {}

  static getInstance(): FreeModerationService {
    if (!FreeModerationService.instance) {
      FreeModerationService.instance = new FreeModerationService();
    }
    return FreeModerationService.instance;
  }

  // Comprehensive profanity and offensive content filter
  private offensiveWords = [
    // Basic profanity
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap', 'piss',
    'whore', 'slut', 'fag', 'nigger', 'nigga', 'retard', 'faggot',
    
    // Harassment terms
    'kill yourself', 'kys', 'die', 'suicide', 'hang yourself', 'jump off',
    'worthless', 'loser', 'pathetic', 'idiot', 'moron', 'stupid',
    
    // Sexual content
    'porn', 'sex', 'nude', 'naked', 'boobs', 'tits', 'ass', 'pussy', 'dick',
    'cock', 'penis', 'vagina', 'masturbate', 'orgasm', 'cum',
    
    // Hate speech
    'nazi', 'hitler', 'terrorist', 'bomb', 'shooting', 'murder', 'rape',
    
    // Drug references
    'weed', 'marijuana', 'cocaine', 'heroin', 'meth', 'drugs', 'dealer',
    
    // Scam indicators  
    'venmo me first', 'cashapp first', 'payment first', 'send money',
    'western union', 'wire transfer', 'gift card', 'bitcoin',
  ];

  // Spam detection patterns
  private spamPatterns = [
    /(.)\1{4,}/g, // Repeated characters (aaaaa)
    /^[A-Z\s!]{15,}$/g, // ALL CAPS messages
    /(buy now|click here|free money|get rich|viagra|casino|lottery|winner)/gi,
    /(.{1,10})\1{3,}/g, // Repeated phrases
    /(visit|check|go to|click).*(\.com|\.net|\.org|http)/gi, // URLs
    /(\$\d+|\d+\$).*(guaranteed|easy|fast|quick)/gi, // Money promises
  ];

  // Suspicious price patterns (potential scams)
  private suspiciousPricePatterns = [
    /\$[1-9]\d{3,}/g, // Very high prices ($1000+)
    /free|0\$|\$0/gi, // Free tickets (often scams)
  ];

  // Check for offensive language
  private containsOffensiveContent(text: string): boolean {
    const lowerText = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Check for exact matches and variations
    return this.offensiveWords.some(word => {
      // Direct match
      if (lowerText.includes(word)) return true;
      
      // Check for variations with numbers/symbols (e.g., "f*ck", "sh1t")
      const wordPattern = word.split('').map(char => {
        if (char === 'a') return '[a@4]';
        if (char === 'e') return '[e3]';
        if (char === 'i') return '[i1!]';
        if (char === 'o') return '[o0]';
        if (char === 's') return '[s$5]';
        return `[${char}*]`;
      }).join('');
      
      const regex = new RegExp(wordPattern, 'gi');
      return regex.test(lowerText);
    });
  }

  // Check for spam patterns
  private isSpam(text: string): boolean {
    return this.spamPatterns.some(pattern => pattern.test(text));
  }

  // Check for suspicious pricing (scam indicators)
  private hasSuspiciousPricing(text: string): boolean {
    return this.suspiciousPricePatterns.some(pattern => pattern.test(text));
  }

  // Check for excessive caps (shouting/aggressive)
  private isExcessiveCaps(text: string): boolean {
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const totalLetters = (text.match(/[A-Za-z]/g) || []).length;
    
    if (totalLetters < 10) return false; // Too short to judge
    return capsCount / totalLetters > 0.7; // More than 70% caps
  }

  // Check for repeated characters/words (spam indicator)
  private hasExcessiveRepetition(text: string): boolean {
    // Check for repeated characters
    if (/(.)\1{5,}/.test(text)) return true;
    
    // Check for repeated words
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 2) { // Ignore short words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });
    
    // If any word appears more than 3 times, it's likely spam
    return Array.from(wordCounts.values()).some(count => count > 3);
  }

  // Main moderation function
  async moderateContent(text: string): Promise<ModerationResult> {
    try {
      // Check for offensive content
      if (this.containsOffensiveContent(text)) {
        await this.logModerationAction(text, 'offensive_language', 'keyword_filter');
        return {
          isAllowed: false,
          reason: 'Content contains inappropriate language',
          confidence: 0.9
        };
      }

      // Check for spam
      if (this.isSpam(text)) {
        await this.logModerationAction(text, 'spam_detected', 'pattern_matching');
        return {
          isAllowed: false,
          reason: 'Content appears to be spam',
          confidence: 0.8
        };
      }

      // Check for suspicious pricing
      if (this.hasSuspiciousPricing(text)) {
        await this.logModerationAction(text, 'suspicious_pricing', 'price_analysis');
        return {
          isAllowed: false,
          reason: 'Suspicious pricing detected - please verify legitimacy',
          confidence: 0.7
        };
      }

      // Check for excessive caps
      if (this.isExcessiveCaps(text)) {
        await this.logModerationAction(text, 'excessive_caps', 'text_analysis');
        return {
          isAllowed: false,
          reason: 'Please avoid using excessive capital letters',
          confidence: 0.6
        };
      }

      // Check for excessive repetition
      if (this.hasExcessiveRepetition(text)) {
        await this.logModerationAction(text, 'excessive_repetition', 'text_analysis');
        return {
          isAllowed: false,
          reason: 'Excessive repetition detected',
          confidence: 0.7
        };
      }

      return { isAllowed: true };
    } catch (error) {
      console.error('Moderation error:', error);
      // Fail-safe: if moderation fails, allow content but log error
      await this.logModerationAction(text, 'moderation_error', 'error');
      return { isAllowed: true };
    }
  }

  // Log moderation actions
  private async logModerationAction(
    content: string,
    reason: string,
    method: string
  ): Promise<void> {
    try {
      // Use existing content_reports table structure
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('content_reports')
        .insert({
          content_type: 'message',
          content_id: 'auto-moderation', // Placeholder for auto-detected content
          reported_by: user.id, // System user
          reason: `Auto-moderation: ${reason}`,
          description: `Method: ${method}. Content: ${content.substring(0, 100)}...`,
          additional_context: {
            method,
            auto_detected: true,
            content_preview: content.substring(0, 200),
            timestamp: new Date().toISOString()
          }
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
      // Log the violation in content_reports
      try {
        await supabase
          .from('content_reports')
          .insert({
            content_type: 'message',
            content_id: conversationId,
            reported_by: userId, // Self-report for auto-moderation
            reason: 'Auto-moderation violation',
            description: moderationResult.reason,
            additional_context: {
              auto_moderated: true,
              confidence: moderationResult.confidence,
              content_preview: content.substring(0, 100)
            }
          });
      } catch (error) {
        console.error('Failed to log moderation violation:', error);
      }

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
      try {
        await supabase
          .from('content_reports')
          .insert({
            content_type: 'ticket',
            content_id: 'pending-ticket',
            reported_by: userId,
            reason: 'Auto-moderation violation',
            description: moderationResult.reason,
            additional_context: {
              auto_moderated: true,
              confidence: moderationResult.confidence,
              title,
              description_preview: description?.substring(0, 100)
            }
          });
      } catch (error) {
        console.error('Failed to log ticket moderation:', error);
      }

      return {
        success: false,
        error: moderationResult.reason || 'Listing violates community guidelines'
      };
    }

    return { success: true };
  }

  // Get moderation stats for admin dashboard
  async getModerationStats(): Promise<{
    totalReports: number;
    pendingReports: number;
    autoDetectedViolations: number;
    todayViolations: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: allReports } = await supabase
        .from('content_reports')
        .select('id, status, created_at, additional_context');

      if (!allReports) return { totalReports: 0, pendingReports: 0, autoDetectedViolations: 0, todayViolations: 0 };

      const totalReports = allReports.length;
      const pendingReports = allReports.filter(r => r.status === 'pending').length;
      const autoDetectedViolations = allReports.filter(r => 
        r.additional_context && 
        typeof r.additional_context === 'object' && 
        'auto_moderated' in r.additional_context
      ).length;
      const todayViolations = allReports.filter(r => 
        new Date(r.created_at) >= today
      ).length;

      return {
        totalReports,
        pendingReports,
        autoDetectedViolations,
        todayViolations
      };
    } catch (error) {
      console.error('Failed to get moderation stats:', error);
      return { totalReports: 0, pendingReports: 0, autoDetectedViolations: 0, todayViolations: 0 };
    }
  }
}

export const freeModerationService = FreeModerationService.getInstance();