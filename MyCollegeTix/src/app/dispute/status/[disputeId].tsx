// src/app/dispute/status/[disputeId].tsx
// View dispute status and details
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/providers/AuthProvider";
import { DisputeService, DisputeWithDetails } from "@/src/services/disputeService";

export default function DisputeStatusScreen() {
  const { disputeId } = useLocalSearchParams<{ disputeId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [dispute, setDispute] = useState<DisputeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDispute = useCallback(async () => {
    if (!disputeId) return;

    try {
      const result = await DisputeService.getDisputeById(disputeId);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Dispute not found");
      }

      setDispute(result.data);
    } catch (err) {
      console.error("Error loading dispute:", err);
      Alert.alert("Error", "Failed to load dispute details");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [disputeId]);

  useEffect(() => {
    loadDispute();
  }, [loadDispute]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDispute();
  }, [loadDispute]);

  const getStatusInfo = (status: string) => {
    return DisputeService.getDisputeStatusInfo(status);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getReasonLabel = (value: string) => {
    const reasons = DisputeService.getDisputeReasons();
    return reasons.find((r) => r.value === value)?.label || value;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#f59e0b", "#d97706", "#b45309"]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading dispute...</Text>
        </View>
      </View>
    );
  }

  if (!dispute || !user) {
    return null;
  }

  const statusInfo = getStatusInfo(dispute.status);
  const isResolved = dispute.status.startsWith("resolved_") || dispute.status === "escalated";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[statusInfo.color, `${statusInfo.color}CC`, `${statusInfo.color}99`]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Status</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
      >
        <View style={styles.contentCard}>
          {/* Status Card */}
          <View style={[styles.statusCard, { borderColor: statusInfo.color }]}>
            <View
              style={[styles.statusIconCircle, { backgroundColor: statusInfo.color }]}
            >
              <Ionicons name={statusInfo.icon as any} size={32} color="white" />
            </View>
            <Text style={styles.statusLabel}>{statusInfo.label}</Text>
            <Text style={styles.statusDescription}>{statusInfo.description}</Text>
          </View>

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Dispute Filed</Text>
                  <Text style={styles.timelineDate}>{formatDate(dispute.created_at)}</Text>
                  <Text style={styles.timelineDetail}>
                    Filed by {dispute.filed_by_user.full_name} ({dispute.filed_by_role})
                  </Text>
                </View>
              </View>

              {dispute.status === "under_review" && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, styles.timelineDotActive]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Under Review</Text>
                    <Text style={styles.timelineDetail}>
                      Our team is investigating this dispute
                    </Text>
                  </View>
                </View>
              )}

              {isResolved && dispute.resolved_at && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, styles.timelineDotActive]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Resolved</Text>
                    <Text style={styles.timelineDate}>{formatDate(dispute.resolved_at)}</Text>
                    {dispute.resolved_by_user && (
                      <Text style={styles.timelineDetail}>
                        By {dispute.resolved_by_user.full_name}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {!isResolved && (
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitlePending}>Pending Resolution</Text>
                    <Text style={styles.timelineDetail}>
                      We'll notify you when a decision is made
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Dispute Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dispute Details</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reason</Text>
                <Text style={styles.detailValue}>{getReasonLabel(dispute.reason)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
              </View>
              <Text style={styles.descriptionText}>
                {dispute.description || "No description provided"}
              </Text>
            </View>
          </View>

          {/* Resolution (if resolved) */}
          {isResolved && dispute.resolution && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resolution</Text>
              <View style={[styles.resolutionCard, { borderColor: statusInfo.color }]}>
                <Text style={styles.resolutionText}>{dispute.resolution}</Text>
              </View>
            </View>
          )}

          {/* Order Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Information</Text>
            <View style={styles.orderCard}>
              <Text style={styles.ticketTitle}>{dispute.order.ticket.title}</Text>
              <View style={styles.orderDetail}>
                <Text style={styles.orderLabel}>Amount</Text>
                <Text style={styles.orderValue}>${dispute.order.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.orderDetail}>
                <Text style={styles.orderLabel}>Order ID</Text>
                <Text style={styles.orderValue}>{dispute.order.id.slice(0, 8)}...</Text>
              </View>
            </View>
          </View>

          {/* Evidence Section */}
          {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Evidence Submitted</Text>
              <View style={styles.evidenceCard}>
                <Ionicons name="images-outline" size={24} color="#6b7280" />
                <Text style={styles.evidenceText}>
                  {dispute.evidence_urls.length} file(s) submitted
                </Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <TouchableOpacity
            style={styles.viewOrderButton}
            onPress={() => router.push(`/orders/${dispute.order.id}`)}
          >
            <Ionicons name="receipt-outline" size={20} color="#3b82f6" />
            <Text style={styles.viewOrderButtonText}>View Order Details</Text>
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpCard}>
            <Ionicons name="help-circle-outline" size={20} color="#6b7280" />
            <Text style={styles.helpText}>
              Need help? Contact support at support@mycollegetix.com
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  contentCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 20,
    paddingBottom: 100,
  },
  statusCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 24,
    backgroundColor: "#f8fafc",
  },
  statusIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
    marginTop: 4,
    marginRight: 16,
  },
  timelineDotActive: {
    backgroundColor: "#10b981",
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  timelineTitlePending: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  timelineDetail: {
    fontSize: 13,
    color: "#9ca3af",
  },
  detailsCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  descriptionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginTop: 8,
  },
  resolutionCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  resolutionText: {
    fontSize: 14,
    color: "#065f46",
    lineHeight: 22,
  },
  orderCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  orderDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  orderLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  orderValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  evidenceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  evidenceText: {
    fontSize: 14,
    color: "#6b7280",
  },
  viewOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 16,
  },
  viewOrderButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3b82f6",
  },
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: "#6b7280",
  },
});
