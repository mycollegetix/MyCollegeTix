import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useAuth } from '@/src/providers/AuthProvider';

interface MicrosoftSignInButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
  showErrorAlert?: boolean;
}

export function MicrosoftSignInButton({
  onPress,
  disabled = false,
  loading = false,
  style,
  showErrorAlert = true
}: MicrosoftSignInButtonProps) {
  const { signInWithMicrosoft } = useAuth();
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = loading || internalLoading;

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    // Handle internal Microsoft sign-in with error handling
    setInternalLoading(true);
    try {
      console.log('🔄 Microsoft Sign-In button pressed');
      const result = await signInWithMicrosoft();

      if (result.error && showErrorAlert) {
        console.error('❌ Microsoft sign-in error:', result.error.message);

        // Show user-friendly error messages
        let errorMessage = 'An unexpected error occurred during Microsoft sign-in.';

        if (result.error.message.includes('cancelled')) {
          // Don't show error for user cancellation
          console.log('ℹ️ User cancelled Microsoft sign-in');
          return;
        } else if (result.error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (result.error.message.includes('OAuth')) {
          errorMessage = 'Authentication service temporarily unavailable. Please try again.';
        }

        Alert.alert(
          'Microsoft Sign-In Error',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error: any) {
      console.error('💥 Unexpected Microsoft sign-in error:', error);

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
          <ActivityIndicator size="small" color="#737373" style={styles.icon} />
        ) : (
          <View style={styles.iconContainer}>
            <Svg width="21" height="21" viewBox="0 0 21 21">
              <Rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <Rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <Rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <Rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </Svg>
          </View>
        )}
        <Text style={[styles.text, isLoading && styles.loadingText]}>
          {isLoading ? 'Signing in with Microsoft...' : 'Sign in with Microsoft'}
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
  iconContainer: {
    marginRight: 12,
    width: 21,
    height: 21,
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
