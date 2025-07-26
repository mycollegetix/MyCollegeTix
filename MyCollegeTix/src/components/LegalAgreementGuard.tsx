// src/components/LegalAgreementGuard.tsx - Guards app access until legal agreements are accepted
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { legalService } from '@/src/services/legalService';

interface LegalAgreementGuardProps {
  children: React.ReactNode;
}

export function LegalAgreementGuard({ children }: LegalAgreementGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [checkingAgreements, setCheckingAgreements] = useState(true);
  const [agreementsAccepted, setAgreementsAccepted] = useState(false);

  useEffect(() => {
    const checkLegalAgreements = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setCheckingAgreements(false);
        setAgreementsAccepted(false);
        return;
      }

      try {
        const hasAccepted = await legalService.hasUserAcceptedAgreements(user.id);
        setAgreementsAccepted(hasAccepted);

        // If agreements not accepted, redirect to legal onboarding
        if (!hasAccepted) {
          console.log('User has not accepted legal agreements, redirecting...');
          (router.replace as any)('/(auth)/legal-onboarding');
        }
      } catch (error) {
        console.error('Error checking legal agreements:', error);
        // On error, redirect to legal onboarding to be safe
        (router.replace as any)('/(auth)/legal-onboarding');
      } finally {
        setCheckingAgreements(false);
      }
    };

    checkLegalAgreements();
  }, [user, authLoading, router]);

  // Show loading while checking authentication or agreements
  if (authLoading || checkingAgreements) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.primary }]}>
        <ActivityIndicator size="large" color={theme.secondary} />
      </View>
    );
  }

  // If user is not authenticated, let auth flow handle it
  if (!user) {
    return <>{children}</>;
  }

  // If agreements not accepted, don't render children (redirect will happen)
  if (!agreementsAccepted) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.primary }]}>
        <ActivityIndicator size="large" color={theme.secondary} />
      </View>
    );
  }

  // User is authenticated and has accepted agreements
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});