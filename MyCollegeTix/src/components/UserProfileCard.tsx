import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TrustedBadge from './TrustedBadge';
import StarRating from './StarRating';
import { TrustService, UserTrustStatus } from '@/src/services/trustService';

interface UserProfileCardProps {
  userId: string;
  username: string;
  fullName: string;
  collegeName?: string;
  showFullProfile?: boolean;
  style?: any;
}

export default function UserProfileCard({
  userId,
  username,
  fullName,
  collegeName,
  showFullProfile = false,
  style
}: UserProfileCardProps) {
  const [trustStatus, setTrustStatus] = useState<UserTrustStatus | null>(null);
  const [userRating, setUserRating] = useState<{ rating: number; count: number }>({ rating: 0, count: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadUserTrustData();
    }
  }, [userId]);

  const loadUserTrustData = async () => {
    setIsLoading(true);
    try {
      // Load trust status
      const trustResult = await TrustService.getUserTrustStatus(userId);
      if (trustResult.success && trustResult.data) {
        setTrustStatus(trustResult.data);
      }

      // Load rating stats
      const ratingResult = await TrustService.getUserRatingStats(userId);
      if (ratingResult.success && ratingResult.data) {
        setUserRating({
          rating: ratingResult.data.averageRating,
          count: ratingResult.data.totalRatings
        });
      }
    } catch (error) {
      console.error('Error loading user trust data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.fullName}>{fullName}</Text>
          <Text style={styles.username}>@{username}</Text>
          {collegeName && (
            <Text style={styles.collegeName}>{collegeName}</Text>
          )}
        </View>
        
        {trustStatus?.is_trusted && (
          <TrustedBadge size="medium" />
        )}
      </View>

      {showFullProfile && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trustStatus?.total_transactions || 0}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>

          <View style={styles.statItem}>
            <StarRating 
              rating={userRating.rating} 
              size="small" 
              showCount={false}
            />
            <Text style={styles.statLabel}>
              {userRating.rating.toFixed(1)} ({userRating.count} reviews)
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trustStatus?.successful_sales || 0}</Text>
            <Text style={styles.statLabel}>Sales</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trustStatus?.successful_purchases || 0}</Text>
            <Text style={styles.statLabel}>Purchases</Text>
          </View>
        </View>
      )}

      {trustStatus?.trust_earned_at && (
        <Text style={styles.trustDate}>
          Trusted since {new Date(trustStatus.trust_earned_at).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  fullName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  collegeName: {
    fontSize: 14,
    color: '#18453b',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  trustDate: {
    fontSize: 12,
    color: '#10b981',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});