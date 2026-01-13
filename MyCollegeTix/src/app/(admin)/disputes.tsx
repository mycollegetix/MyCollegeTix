// src/app/(admin)/disputes.tsx
// Admin disputes management screen
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AdminLayout from "@/src/components/AdminLayout";
import { DisputeService, DisputeWithDetails, DisputeResolution } from "@/src/services/disputeService";
import { PenaltyService, ViolationType, Severity, PenaltyType } from "@/src/services/penaltyService";
import { supabase } from "@/src/lib/supabase";

type FilterStatus = "all" | "open" | "under_review" | "resolved" | "escalated";

export default function AdminDisputesScreen() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<DisputeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("open");

  // Detail modal state
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Penalty modal state
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyUserId, setPenaltyUserId] = useState<string | null>(null);
  const [penaltyUserName, setPenaltyUserName] = useState("");
  const [selectedViolationType, setSelectedViolationType] = useState<ViolationType>("other");
  const [selectedSeverity, setSelectedSeverity] = useState<Severity>("minor");
  const [selectedPenaltyType, setSelectedPenaltyType] = useState<PenaltyType>("warning");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState("7");
  const [applyingPenalty, setApplyingPenalty] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    open: 0,
    underReview: 0,
    resolved: 0,
    escalated: 0,
  });

  const loadDisputes = useCallback(async () => {
    try {
      let result;
      if (filterStatus === "all") {
        result = await DisputeService.getAllDisputes();
      } else if (filterStatus === "open") {
        result = await DisputeService.getOpenDisputes();
      } else if (filterStatus === "resolved") {
        result = await DisputeService.getAllDisputes({ status: "resolved_refund" });
        const payoutResult = await DisputeService.getAllDisputes({ status: "resolved_payout" });
        if (result.success && payoutResult.success) {
          result.data = [...(result.data || []), ...(payoutResult.data || [])];
        }
      } else {
        result = await DisputeService.getAllDisputes({ status: filterStatus });
      }

      if (result.success && result.data) {
        setDisputes(result.data);
      }

      // Load stats
      const statsResult = await DisputeService.getDisputeStats();
      if (statsResult.success && statsResult.data) {
        setStats({
          open: statsResult.data.openDisputes,
          underReview: 0, // Included in open
          resolved: statsResult.data.resolvedRefunds + statsResult.data.resolvedPayouts,
          escalated: statsResult.data.escalated,
        });
      }
    } catch (err) {
      console.error("Error loading disputes:", err);
      Alert.alert("Error", "Failed to load disputes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDisputes();
  }, [loadDisputes]);

  const handleViewDispute = (dispute: DisputeWithDetails) => {
    setSelectedDispute(dispute);
    setResolutionNotes("");
    setShowDetailModal(true);
  };

  const handleMarkUnderReview = async () => {
    if (!selectedDispute) return;

    try {
      setResolving(true);
      const result = await DisputeService.markUnderReview(selectedDispute.id);
      if (result.success) {
        Alert.alert("Success", "Dispute marked as under review");
        setShowDetailModal(false);
        loadDisputes();
      } else {
        throw new Error(result.error || "Failed to update");
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update dispute");
    } finally {
      setResolving(false);
    }
  };

  const handleResolve = async (resolution: DisputeResolution) => {
    if (!selectedDispute) return;

    if (!resolutionNotes.trim()) {
      Alert.alert("Required", "Please provide resolution notes");
      return;
    }

    const actionText = resolution === "resolved_refund" ? "refund the buyer" :
                       resolution === "resolved_payout" ? "pay the seller" : "escalate";

    Alert.alert(
      "Confirm Resolution",
      `Are you sure you want to ${actionText}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            try {
              setResolving(true);
              const result = await DisputeService.resolveDispute(
                selectedDispute.id,
                resolution,
                resolutionNotes.trim()
              );
              if (result.success) {
                Alert.alert("Success", "Dispute resolved successfully");
                setShowDetailModal(false);
                loadDisputes();
              } else {
                throw new Error(result.error || "Failed to resolve");
              }
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to resolve dispute");
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenPenaltyModal = (userId: string, userName: string) => {
    setPenaltyUserId(userId);
    setPenaltyUserName(userName);
    setSelectedViolationType("other");
    setSelectedSeverity("minor");
    setSelectedPenaltyType("warning");
    setPenaltyReason("");
    setSuspensionDays("7");
    setShowPenaltyModal(true);
  };

  const handleApplyPenalty = async () => {
    if (!penaltyUserId || !penaltyReason.trim()) {
      Alert.alert("Required", "Please provide a reason for the penalty");
      return;
    }

    try {
      setApplyingPenalty(true);

      // First issue the violation
      const violationResult = await PenaltyService.issueViolation(
        penaltyUserId,
        selectedViolationType,
        selectedSeverity,
        penaltyReason.trim(),
        selectedDispute?.id
      );

      if (!violationResult.success) {
        throw new Error(violationResult.error || "Failed to issue violation");
      }

      // Then apply the penalty
      const penaltyResult = await PenaltyService.applyPenalty(
        penaltyUserId,
        selectedPenaltyType,
        penaltyReason.trim(),
        violationResult.data?.id,
        {
          suspensionDays: selectedPenaltyType === "temporary_suspension" ? parseInt(suspensionDays) : undefined,
        }
      );

      if (!penaltyResult.success) {
        throw new Error(penaltyResult.error || "Failed to apply penalty");
      }

      Alert.alert("Success", `Penalty applied to ${penaltyUserName}`);
      setShowPenaltyModal(false);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to apply penalty");
    } finally {
      setApplyingPenalty(false);
    }
  };

  const getStatusInfo = (status: string) => {
    return DisputeService.getDisputeStatusInfo(status);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getReasonLabel = (value: string) => {
    const reasons = DisputeService.getDisputeReasons();
    return reasons.find((r) => r.value === value)?.label || value;
  };

  const FilterButton = ({ status, label, count }: { status: FilterStatus; label: string; count?: number }) => (
    <TouchableOpacity
      style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
      onPress={() => setFilterStatus(status)}
    >
      <Text style={[styles.filterButtonText, filterStatus === status && styles.filterButtonTextActive]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.filterBadge, filterStatus === status && styles.filterBadgeActive]}>
          <Text style={[styles.filterBadgeText, filterStatus === status && styles.filterBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <AdminLayout title="Disputes" subtitle="Manage user disputes">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Dispute Management"
      subtitle={`${stats.open} open disputes`}
      onRefresh={onRefresh}
      isRefreshing={refreshing}
    >
      <View style={styles.container}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: "#f59e0b" }]}>
            <Text style={styles.statValue}>{stats.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#10b981" }]}>
            <Text style={styles.statValue}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#ef4444" }]}>
            <Text style={styles.statValue}>{stats.escalated}</Text>
            <Text style={styles.statLabel}>Escalated</Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <FilterButton status="open" label="Open" count={stats.open} />
          <FilterButton status="under_review" label="Under Review" />
          <FilterButton status="resolved" label="Resolved" count={stats.resolved} />
          <FilterButton status="escalated" label="Escalated" count={stats.escalated} />
          <FilterButton status="all" label="All" />
        </ScrollView>

        {/* Disputes List */}
        <ScrollView
          style={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {disputes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text style={styles.emptyStateText}>No disputes to show</Text>
            </View>
          ) : (
            disputes.map((dispute) => {
              const statusInfo = getStatusInfo(dispute.status);
              return (
                <TouchableOpacity
                  key={dispute.id}
                  style={styles.disputeCard}
                  onPress={() => handleViewDispute(dispute)}
                >
                  <View style={styles.disputeHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                      <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                    </View>
                    <Text style={styles.disputeDate}>{formatDate(dispute.created_at)}</Text>
                  </View>

                  <Text style={styles.disputeTicket}>{dispute.order.ticket.title}</Text>
                  <Text style={styles.disputeReason}>{getReasonLabel(dispute.reason)}</Text>

                  <View style={styles.disputeFooter}>
                    <Text style={styles.disputeParty}>
                      Filed by: {dispute.filed_by_user.full_name} ({dispute.filed_by_role})
                    </Text>
                    <Text style={styles.disputeAmount}>${dispute.order.amount.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedDispute && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Dispute Details</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Status */}
              <View style={[styles.modalStatusCard, { borderColor: getStatusInfo(selectedDispute.status).color }]}>
                <Ionicons
                  name={getStatusInfo(selectedDispute.status).icon as any}
                  size={24}
                  color={getStatusInfo(selectedDispute.status).color}
                />
                <Text style={[styles.modalStatusText, { color: getStatusInfo(selectedDispute.status).color }]}>
                  {getStatusInfo(selectedDispute.status).label}
                </Text>
              </View>

              {/* Order Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Order</Text>
                <View style={styles.modalCard}>
                  <Text style={styles.modalCardTitle}>{selectedDispute.order.ticket.title}</Text>
                  <Text style={styles.modalCardText}>Amount: ${selectedDispute.order.amount.toFixed(2)}</Text>
                  <Text style={styles.modalCardText}>Order ID: {selectedDispute.order.id.slice(0, 8)}...</Text>
                </View>
              </View>

              {/* Parties */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Parties</Text>
                <View style={styles.partyRow}>
                  <TouchableOpacity
                    style={styles.partyCard}
                    onPress={() => handleOpenPenaltyModal(
                      selectedDispute.order.buyer_id,
                      "Buyer"
                    )}
                  >
                    <Text style={styles.partyLabel}>Buyer</Text>
                    <Text style={styles.partyName}>
                      {selectedDispute.filed_by_role === "buyer"
                        ? selectedDispute.filed_by_user.full_name
                        : "Other Party"}
                    </Text>
                    <Text style={styles.penaltyLink}>Issue Penalty</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.partyCard}
                    onPress={() => handleOpenPenaltyModal(
                      selectedDispute.order.seller_id,
                      "Seller"
                    )}
                  >
                    <Text style={styles.partyLabel}>Seller</Text>
                    <Text style={styles.partyName}>
                      {selectedDispute.filed_by_role === "seller"
                        ? selectedDispute.filed_by_user.full_name
                        : "Other Party"}
                    </Text>
                    <Text style={styles.penaltyLink}>Issue Penalty</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dispute Details */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Dispute Details</Text>
                <View style={styles.modalCard}>
                  <Text style={styles.modalCardText}>
                    <Text style={styles.modalCardLabel}>Reason: </Text>
                    {getReasonLabel(selectedDispute.reason)}
                  </Text>
                  <Text style={styles.modalCardText}>
                    <Text style={styles.modalCardLabel}>Filed by: </Text>
                    {selectedDispute.filed_by_user.full_name} ({selectedDispute.filed_by_role})
                  </Text>
                  <Text style={styles.modalCardText}>
                    <Text style={styles.modalCardLabel}>Date: </Text>
                    {formatDate(selectedDispute.created_at)}
                  </Text>
                  {selectedDispute.description && (
                    <>
                      <Text style={[styles.modalCardLabel, { marginTop: 12 }]}>Description:</Text>
                      <Text style={styles.modalCardDescription}>{selectedDispute.description}</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Resolution Actions */}
              {!selectedDispute.status.startsWith("resolved_") && selectedDispute.status !== "escalated" && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Resolution</Text>

                  <TextInput
                    style={styles.resolutionInput}
                    value={resolutionNotes}
                    onChangeText={setResolutionNotes}
                    placeholder="Enter resolution notes..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                  />

                  {selectedDispute.status === "open" && (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={handleMarkUnderReview}
                      disabled={resolving}
                    >
                      {resolving ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Ionicons name="search" size={20} color="white" />
                          <Text style={styles.reviewButtonText}>Mark Under Review</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <View style={styles.resolutionButtons}>
                    <TouchableOpacity
                      style={[styles.resolveButton, styles.refundButton]}
                      onPress={() => handleResolve("resolved_refund")}
                      disabled={resolving}
                    >
                      <Ionicons name="arrow-undo" size={20} color="white" />
                      <Text style={styles.resolveButtonText}>Refund Buyer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.resolveButton, styles.payoutButton]}
                      onPress={() => handleResolve("resolved_payout")}
                      disabled={resolving}
                    >
                      <Ionicons name="cash" size={20} color="white" />
                      <Text style={styles.resolveButtonText}>Pay Seller</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.escalateButton}
                    onPress={() => handleResolve("escalated")}
                    disabled={resolving}
                  >
                    <Ionicons name="arrow-up-circle" size={20} color="#ef4444" />
                    <Text style={styles.escalateButtonText}>Escalate</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Resolution Info (if resolved) */}
              {(selectedDispute.status.startsWith("resolved_") || selectedDispute.status === "escalated") &&
                selectedDispute.resolution && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Resolution</Text>
                    <View style={styles.modalCard}>
                      <Text style={styles.modalCardDescription}>{selectedDispute.resolution}</Text>
                      {selectedDispute.resolved_by_user && (
                        <Text style={styles.modalCardText}>
                          Resolved by: {selectedDispute.resolved_by_user.full_name}
                        </Text>
                      )}
                      {selectedDispute.resolved_at && (
                        <Text style={styles.modalCardText}>
                          Resolved on: {formatDate(selectedDispute.resolved_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Penalty Modal */}
      <Modal
        visible={showPenaltyModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowPenaltyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPenaltyModal(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Issue Penalty</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.penaltyTarget}>Issuing penalty to: {penaltyUserName}</Text>

            {/* Violation Type */}
            <View style={styles.penaltySection}>
              <Text style={styles.penaltySectionTitle}>Violation Type</Text>
              <View style={styles.optionGrid}>
                {(["non_delivery", "non_confirmation", "invalid_ticket", "fraud", "other"] as ViolationType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionButton, selectedViolationType === type && styles.optionButtonActive]}
                    onPress={() => setSelectedViolationType(type)}
                  >
                    <Text style={[styles.optionButtonText, selectedViolationType === type && styles.optionButtonTextActive]}>
                      {PenaltyService.getViolationTypeInfo(type).label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Severity */}
            <View style={styles.penaltySection}>
              <Text style={styles.penaltySectionTitle}>Severity</Text>
              <View style={styles.optionRow}>
                {(["minor", "moderate", "severe"] as Severity[]).map((sev) => (
                  <TouchableOpacity
                    key={sev}
                    style={[styles.optionButton, selectedSeverity === sev && styles.optionButtonActive]}
                    onPress={() => setSelectedSeverity(sev)}
                  >
                    <Text style={[styles.optionButtonText, selectedSeverity === sev && styles.optionButtonTextActive]}>
                      {PenaltyService.getSeverityInfo(sev).label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Penalty Type */}
            <View style={styles.penaltySection}>
              <Text style={styles.penaltySectionTitle}>Penalty</Text>
              <View style={styles.optionGrid}>
                {(["warning", "payout_deduction", "temporary_suspension", "permanent_ban"] as PenaltyType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionButton, selectedPenaltyType === type && styles.optionButtonActive]}
                    onPress={() => setSelectedPenaltyType(type)}
                  >
                    <Text style={[styles.optionButtonText, selectedPenaltyType === type && styles.optionButtonTextActive]}>
                      {PenaltyService.getPenaltyTypeInfo(type).label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Suspension Days (if applicable) */}
            {selectedPenaltyType === "temporary_suspension" && (
              <View style={styles.penaltySection}>
                <Text style={styles.penaltySectionTitle}>Suspension Duration (days)</Text>
                <TextInput
                  style={styles.penaltyInput}
                  value={suspensionDays}
                  onChangeText={setSuspensionDays}
                  keyboardType="number-pad"
                  placeholder="7"
                />
              </View>
            )}

            {/* Reason */}
            <View style={styles.penaltySection}>
              <Text style={styles.penaltySectionTitle}>Reason *</Text>
              <TextInput
                style={styles.penaltyTextArea}
                value={penaltyReason}
                onChangeText={setPenaltyReason}
                placeholder="Describe the reason for this penalty..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={[styles.applyPenaltyButton, !penaltyReason.trim() && styles.applyPenaltyButtonDisabled]}
              onPress={handleApplyPenalty}
              disabled={!penaltyReason.trim() || applyingPenalty}
            >
              {applyingPenalty ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="hammer" size={20} color="white" />
                  <Text style={styles.applyPenaltyButtonText}>Apply Penalty</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterButtonActive: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "white",
  },
  filterBadge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  filterBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterBadgeTextActive: {
    color: "white",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
  },
  disputeCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  disputeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  disputeDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  disputeTicket: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  disputeReason: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  disputeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  disputeParty: {
    fontSize: 12,
    color: "#9ca3af",
  },
  disputeAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "white",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
  },
  modalStatusText: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  modalCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  modalCardText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  modalCardLabel: {
    fontWeight: "600",
    color: "#374151",
  },
  modalCardDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  partyRow: {
    flexDirection: "row",
    gap: 12,
  },
  partyCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  partyLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 4,
  },
  partyName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  penaltyLink: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  resolutionInput: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#1e293b",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  resolutionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  resolveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  refundButton: {
    backgroundColor: "#f59e0b",
  },
  payoutButton: {
    backgroundColor: "#10b981",
  },
  resolveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  escalateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ef4444",
    backgroundColor: "white",
  },
  escalateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
  },
  // Penalty Modal Styles
  penaltyTarget: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 20,
    textAlign: "center",
  },
  penaltySection: {
    marginBottom: 20,
  },
  penaltySectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionButtonActive: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  optionButtonText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  optionButtonTextActive: {
    color: "white",
  },
  penaltyInput: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  penaltyTextArea: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#1e293b",
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  applyPenaltyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 12,
    marginBottom: 32,
  },
  applyPenaltyButtonDisabled: {
    backgroundColor: "#fca5a5",
  },
  applyPenaltyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
