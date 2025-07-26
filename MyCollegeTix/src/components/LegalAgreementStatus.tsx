// src/components/LegalAgreementStatus.tsx - Shows user's legal agreement status
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { legalService } from '@/src/services/legalService';

export function LegalAgreementStatus() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agreementsAccepted, setAgreementsAccepted] = useState(false);
  const [version, setVersion] = useState<string>('');
  const [acceptedAt, setAcceptedAt] = useState<string>('');

  useEffect(() => {
    const loadAgreementStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const hasAccepted = await legalService.hasUserAcceptedAgreements(user.id);
        setAgreementsAccepted(hasAccepted);
        setVersion(legalService.getCurrentVersion());

        // Get detailed history if needed
        const history = await legalService.getUserAgreementHistory(user.id);
        if (history.length > 0) {
          setAcceptedAt(history[0].accepted_at);
        }
      } catch (error) {
        console.error('Error loading agreement status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAgreementStatus();
  }, [user]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons 
            name={agreementsAccepted ? "shield-checkmark" : "shield-outline"} 
            size={20} 
            color={agreementsAccepted ? "#10b981" : "#f59e0b"} 
          />
          <Text style={styles.title}>Legal Agreements</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: agreementsAccepted ? "#dcfce7" : "#fef3c7" }
        ]}>
          <Text style={[
            styles.statusText,
            { color: agreementsAccepted ? "#166534" : "#92400e" }
          ]}>
            {agreementsAccepted ? "Accepted" : "Pending"}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {agreementsAccepted ? (
          <>
            <Text style={styles.description}>
              You have accepted our Terms of Service and Privacy Policy.
            </Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Version:</Text>
                <Text style={styles.detailValue}>v{version}</Text>
              </View>
              {acceptedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Accepted:</Text>
                  <Text style={styles.detailValue}>{formatDate(acceptedAt)}</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <Text style={styles.description}>
            Please accept our legal agreements to continue using the app.
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/legal/terms')}
        >
          <Text style={[styles.linkText, { color: theme.primary }]}>
            View Terms
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/legal/privacy')}
        >
          <Text style={[styles.linkText, { color: theme.primary }]}>
            View Privacy
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsContainer: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  linkButton: {
    flex: 1,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});