import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/src/lib/supabase';

// Ensure auth session is properly completed
WebBrowser.maybeCompleteAuthSession();

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleAuthResult {
  user?: GoogleUser;
  error?: Error;
  cancelled?: boolean;
}

class GoogleAuthService {
  private readonly redirectUri: string;

  constructor() {
    // Create the redirect URI that will bring users back to the app
    // For production apps, this creates: mycollegetix://auth/callback
    // For Expo Go, this creates: exp://192.168.x.x:8081/--/auth/callback
    this.redirectUri = AuthSession.makeRedirectUri({
      scheme: 'mycollegetix',
      path: 'auth/callback',
    });

    console.log('📍 Google OAuth redirect URI:', this.redirectUri);
    console.log('⚠️  Make sure this EXACT URI is added to Supabase > Auth > URL Configuration > Redirect URLs');
  }

  /**
   * Initiates Google OAuth flow using Supabase
   * In production, this will:
   * 1. Open OAuth in browser/webview
   * 2. User completes Google authentication
   * 3. Supabase processes the OAuth
   * 4. User is redirected back to app with auth tokens
   * 5. App processes tokens and creates session
   */
  async signInWithGoogle(): Promise<GoogleAuthResult> {
    try {
      console.log('🔐 Starting Google OAuth flow...');

      // Start OAuth flow with Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: this.redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        console.error('❌ Supabase OAuth initialization failed:', error);
        return { error: new Error(`OAuth setup failed: ${error.message}`) };
      }

      if (!data.url) {
        console.error('❌ No OAuth URL returned from Supabase');
        return { error: new Error('OAuth URL not generated') };
      }

      console.log('🌐 Opening OAuth session...');

      // Open the OAuth session
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        this.redirectUri,
        {
          showInRecents: false,
          createTask: false,
        }
      );

      console.log('📱 OAuth session result:', result.type);

      // Handle OAuth result
      if (result.type === 'success' && result.url) {
        return await this.handleOAuthCallback(result.url);
      } else if (result.type === 'cancel') {
        console.log('ℹ️ User cancelled Google sign-in');
        return { cancelled: true };
      } else {
        console.error('❌ OAuth session failed:', result);
        return { error: new Error('Authentication session failed') };
      }

    } catch (error: any) {
      console.error('💥 Google OAuth error:', error);
      return { error: new Error(`Google sign-in failed: ${error.message}`) };
    }
  }

  /**
   * Processes the OAuth callback URL and extracts authentication data
   */
  private async handleOAuthCallback(callbackUrl: string): Promise<GoogleAuthResult> {
    try {
      console.log('🔄 Processing OAuth callback...');
      console.log('🔗 Callback URL:', callbackUrl);

      const url = new URL(callbackUrl);

      // Try both hash and query params as Supabase can use either
      // Hash fragments (#access_token=...) are common for implicit flow
      // Query params (?access_token=...) are common for PKCE flow
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const queryParams = new URLSearchParams(url.search);

      // Check hash first, then query params
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const error = hashParams.get('error') || queryParams.get('error');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

      if (error) {
        console.error('❌ OAuth callback error:', errorDescription || error);
        return { error: new Error(errorDescription || error) };
      }

      if (!accessToken) {
        console.error('❌ Missing access token in OAuth callback');
        console.log('📋 Available hash params:', Array.from(hashParams.keys()));
        console.log('📋 Available query params:', Array.from(queryParams.keys()));
        return { error: new Error('Authentication tokens not received') };
      }

      console.log('🔑 Tokens found, setting Supabase session...');

      // Set the session with the received tokens
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError) {
        console.error('❌ Failed to set session:', sessionError);
        return { error: new Error(`Session creation failed: ${sessionError.message}`) };
      }

      if (!data.session?.user) {
        console.error('❌ No user in session data');
        return { error: new Error('User session not created') };
      }

      const user = data.session.user;
      console.log('✅ Google OAuth successful for user:', user.email);

      // Extract user information
      const googleUser: GoogleUser = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        picture: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      };

      return { user: googleUser };

    } catch (error: any) {
      console.error('💥 OAuth callback processing error:', error);
      return { error: new Error(`Callback processing failed: ${error.message}`) };
    }
  }

  /**
   * Signs out the user from both Google and Supabase
   */
  async signOut(): Promise<void> {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      console.log('✅ Sign out successful');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  /**
   * Checks if user is currently signed in
   */
  async isSignedIn(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('❌ Error checking sign-in status:', error);
      return false;
    }
  }

  /**
   * Gets the current session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('❌ Error getting current session:', error);
      return null;
    }
  }
}

export const googleAuthService = new GoogleAuthService();
