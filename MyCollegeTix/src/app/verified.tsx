import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function VerifiedScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Small delay to show the success message
    const timer = setTimeout(() => {
      if (user) {
        // User is logged in, go to main app
        router.replace('/(tabs)');
      } else {
        // User not logged in, show success and prompt to login
        Alert.alert(
          'Email Verified! 🎉',
          'Your email has been successfully verified! Please log in to access your account.',
          [
            {
              text: 'Login Now',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, router]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#18453b', '#2a6b5a']}
        style={styles.background}
      />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#10b981" />
        </View>
        
        <Text style={styles.title}>Email Verified!</Text>
        <Text style={styles.message}>
          Your email has been successfully verified. 
          {user ? ' Redirecting to your dashboard...' : ' Please log in to continue.'}
        </Text>
        
        <View style={styles.loadingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginHorizontal: 4,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
});