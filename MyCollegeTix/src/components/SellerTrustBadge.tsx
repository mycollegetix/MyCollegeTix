
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrustService, UserTrustStatus } from '@/src/services/trustService';
import TrustedBadge from './TrustedBadge';

interface SellerTrustBadgeProps {
  sellerId: string;
}

export default function SellerTrustBadge({ sellerId }: SellerTrustBadgeProps) {
  const [trustStatus, setTrustStatus] = useState<UserTrustStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sellerId) {
      loadUserTrustData();
    }
  }, [sellerId]);

  const loadUserTrustData = async () => {
    setIsLoading(true);
    try {
      const trustResult = await TrustService.getUserTrustStatus(sellerId);
      if (trustResult.success && trustResult.data) {
        setTrustStatus(trustResult.data);
      }
    } catch (error) {
      console.error('Error loading user trust data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (trustStatus?.is_trusted) {
    return <TrustedBadge size="small" />;
  }

  return (
    <View style={styles.notTrustedBadge}>
      <Ionicons name="shield-outline" size={12} color="#9ca3af" />
      <Text style={styles.notTrustedText}>Not Verified</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notTrustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notTrustedText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
});
