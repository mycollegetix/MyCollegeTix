import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/src/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Production auth callback received');
        console.log('📱 Callback params:', Object.keys(params));
        
        // Complete the auth session for production
        WebBrowser.maybeCompleteAuthSession();
        
        // Get the full URL that opened this screen
        const url = await Linking.getInitialURL();
        console.log('🔗 Initial URL:', url);
        
        // Extract auth tokens from URL parameters
        const { 
          access_token, 
          refresh_token, 
          expires_in, 
          token_type, 
          type,
          error: authError,
          error_description 
        } = params;
        
        // Handle OAuth errors
        if (authError) {
          console.error('❌ OAuth error:', error_description || authError);
          setStatus(`Authentication failed: ${error_description || authError}`);
          setTimeout(() => router.replace('/(auth)/login'), 3000);
          return;
        }
        
        // Handle password recovery
        if (type === 'recovery') {
          console.log('🔄 Password recovery callback');
          setStatus('Processing password recovery...');
          router.replace('/');
          return;
        }
        
        // Handle successful OAuth with tokens
        if (access_token && refresh_token) {
          console.log('✅ OAuth tokens found in callback');
          setStatus('Creating your session...');
          
          try {
            // Set the session with the tokens from the OAuth callback
            const { data, error } = await supabase.auth.setSession({
              access_token: access_token as string,
              refresh_token: refresh_token as string,
            });
            
            if (error) {
              console.error('❌ Error setting session:', error);
              setStatus(`Session creation failed: ${error.message}`);
              setTimeout(() => router.replace('/(auth)/login'), 3000);
              return;
            }
            
            if (data.session?.user) {
              console.log('✅ Session created successfully!');
              console.log('👤 User authenticated');
              setStatus('Welcome! Redirecting to app...');
              
              // Wait a moment then navigate to main app
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 1500);
            } else {
              console.error('❌ No user in session data');
              setStatus('Session creation failed - no user data');
              setTimeout(() => router.replace('/(auth)/login'), 3000);
            }
          } catch (sessionError: any) {
            console.error('❌ Session creation error:', sessionError);
            setStatus(`Session error: ${sessionError.message}`);
            setTimeout(() => router.replace('/(auth)/login'), 3000);
          }
        } else {
          console.log('❌ No auth tokens found in callback');
          console.log('Available params:', Object.keys(params));
          setStatus('Authentication tokens not received');
          setTimeout(() => router.replace('/(auth)/login'), 3000);
        }
      } catch (error: any) {
        console.error('❌ Auth callback processing error:', error);
        setStatus(`Processing error: ${error.message}`);
        setTimeout(() => router.replace('/(auth)/login'), 3000);
      }
    };

    // Small delay to ensure all parameters are received
    const timeoutId = setTimeout(handleAuthCallback, 500);
    
    return () => clearTimeout(timeoutId);
  }, [params, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#18453b" />
      <Text style={styles.text}>{status}</Text>
      <Text style={styles.subText}>Please wait...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#18453b',
    fontWeight: '500',
  },
});