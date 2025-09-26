import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TrustedBadge from "./TrustedBadge";
import StarRating from "./StarRating";
import { TrustService, UserTrustStatus } from "@/src/services/trustService";

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
  style,
}: UserProfileCardProps) {
  const [trustStatus, setTrustStatus] = useState<UserTrustStatus | null>(null);
  const [userRating, setUserRating] = useState<{
    rating: number;
    count: number;
  }>({ rating: 0, count: 0 });
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
          count: ratingResult.data.totalRatings,
        });
      }
    } catch (error) {
      console.error("Error loading user trust data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTrustBadge = () => {
    const isTrusted = trustStatus?.is_trusted;

    if (isTrusted) {
      return <TrustedBadge size="medium" />;
    }

    // Show "not trusted yet" badge for users without trust status
    return (
      <View style={styles.notTrustedBadge}>
        <Ionicons name="shield-outline" size={14} color="#9ca3af" />
        <Text style={styles.notTrustedText}>Not verified</Text>
      </View>
    );
  };

  const getTrustStatusMessage = () => {
    if (!trustStatus) return "Building reputation...";

    const totalTransactions = trustStatus.total_transactions || 0;

    if (trustStatus.is_trusted) {
      return trustStatus.trust_earned_at
        ? `Trusted since ${new Date(
            trustStatus.trust_earned_at
          ).toLocaleDateString()}`
        : "Trusted member";
    }

    if (totalTransactions === 0) {
      return "New to the platform";
    }

    // Calculate what they need for trust (example: 2+ transactions, 4.0+ rating)
    const requiredTransactions = 2;
    const requiredRating = 4.0;

    if (totalTransactions < requiredTransactions) {
      const needed = requiredTransactions - totalTransactions;
      return `${needed} more transaction${
        needed !== 1 ? "s" : ""
      } needed for verification`;
    }

    if (userRating.rating < requiredRating) {
      return `Maintain ${requiredRating}+ rating for verification`;
    }

    return "Verification pending review";
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
          <View style={styles.nameRow}>
            <Text style={styles.fullName}>{fullName}</Text>
            {renderTrustBadge()}
          </View>
          <Text style={styles.username}>@{username}</Text>
          {collegeName && <Text style={styles.collegeName}>{collegeName}</Text>}
        </View>
      </View>

      {/* Trust Status Message */}
      <View style={styles.trustStatusContainer}>
        <Text
          style={[
            styles.trustStatusText,
            trustStatus?.is_trusted ? styles.trustedText : styles.pendingText,
          ]}
        >
          {getTrustStatusMessage()}
        </Text>
      </View>

      {showFullProfile && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {trustStatus?.total_transactions || 0}
            </Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>

          <View style={styles.statItem}>
            {userRating.count > 0 ? (
              <>
                <StarRating
                  rating={userRating.rating}
                  size="small"
                  showCount={false}
                />
                <Text style={styles.statLabel}>
                  {userRating.rating.toFixed(1)} ({userRating.count} review
                  {userRating.count !== 1 ? "s" : ""})
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.noRatingValue}>—</Text>
                <Text style={styles.statLabel}>No ratings yet</Text>
              </>
            )}
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {trustStatus?.successful_sales || 0}
            </Text>
            <Text style={styles.statLabel}>Sales</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {trustStatus?.successful_purchases || 0}
            </Text>
            <Text style={styles.statLabel}>Purchases</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    padding: 20,
  },
  header: {
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  fullName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    flex: 1,
  },
  username: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  collegeName: {
    fontSize: 14,
    color: "#18453b",
    fontWeight: "500",
  },
  notTrustedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  notTrustedText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
  },
  trustStatusContainer: {
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  trustStatusText: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  trustedText: {
    color: "#10b981",
  },
  pendingText: {
    color: "#6b7280",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  noRatingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9ca3af",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
  },
});
