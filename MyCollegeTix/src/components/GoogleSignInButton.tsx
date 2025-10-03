import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/providers/AuthProvider';

interface GoogleSignInButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
  showErrorAlert?: boolean;
}

export function GoogleSignInButton({ 
  onPress, 
  disabled = false, 
  loading = false,
  style,
  showErrorAlert = true
}: GoogleSignInButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = loading || internalLoading;

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    // Handle internal Google sign-in with error handling
    setInternalLoading(true);
    try {
      console.log('🔄 Google Sign-In button pressed');
      const result = await signInWithGoogle();
      
      if (result.error && showErrorAlert) {
        console.error('❌ Google sign-in error:', result.error.message);
        
        // Show user-friendly error messages
        let errorMessage = 'An unexpected error occurred during Google sign-in.';
        
        if (result.error.message.includes('cancelled')) {
          // Don't show error for user cancellation
          console.log('ℹ️ User cancelled Google sign-in');
          return;
        } else if (result.error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (result.error.message.includes('OAuth')) {
          errorMessage = 'Authentication service temporarily unavailable. Please try again.';
        }
        
        Alert.alert(
          'Google Sign-In Error',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error: any) {
      console.error('💥 Unexpected Google sign-in error:', error);
      
      if (showErrorAlert) {
        Alert.alert(
          'Sign-In Error',
          'An unexpected error occurred. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled, isLoading && styles.loading, style]}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#757575" style={styles.icon} />
        ) : (
          <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.icon} />
        )}
        <Text style={[styles.text, isLoading && styles.loadingText]}>
          {isLoading ? 'Signing in with Google...' : 'Continue with Google'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabled: {
    opacity: 0.6,
    backgroundColor: '#F8F9FA',
  },
  loading: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C4043',
    textAlign: 'center',
    letterSpacing: 0.25,
  },
  loadingText: {
    color: '#5F6368',
  },
});