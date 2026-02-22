import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import StarRating from "./StarRating";
import { supabase } from "@/src/lib/supabase";

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
  const [userRating, setUserRating] = useState<{
    rating: number;
    count: number;
  }>({ rating: 0, count: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const [ratingsResult, profileResult] = await Promise.all([
        supabase
          .from("user_ratings")
          .select("rating")
          .eq("rated_user_id", userId),
        supabase
          .from("profiles")
          .select("seller_rating_adjustment")
          .eq("id", userId)
          .single(),
      ]);

      if (!ratingsResult.error) {
        const ratings = ratingsResult.data || [];
        const totalRatings = ratings.length;
        const baseRating =
          totalRatings > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
            : 0;
        const ratingAdjustment =
          profileResult.data?.seller_rating_adjustment || 0;
        const adjustedRating = Math.max(
          0,
          Math.min(5, baseRating + ratingAdjustment)
        );

        setUserRating({
          rating: Math.round(adjustedRating * 10) / 10,
          count: totalRatings,
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
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
          <View style={styles.nameRow}>
            <Text style={styles.fullName}>{fullName}</Text>
          </View>
          <Text style={styles.username}>@{username}</Text>
          {collegeName && <Text style={styles.collegeName}>{collegeName}</Text>}
        </View>
      </View>

      {showFullProfile && (
        <View style={styles.statsContainer}>
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
