// src/components/tickets/TicketCard.tsx
// Standalone card component for rendering a single ticket/purchase in lists

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TicketTransferButton } from "@/src/components/TicketTransferButton";
import { OrderItem, ThemeColors, formatSaleDate, getStatusConfig } from "./types";

interface TicketCardProps {
  item: OrderItem;
  activeTab: "selling" | "bought" | "watchlist";
  theme: ThemeColors;
  onEdit: (item: OrderItem) => void;
  onCancel: (id: string) => void;
  onRateSeller: (item: OrderItem) => void;
}

export function TicketCard({
  item,
  activeTab,
  theme,
  onEdit,
  onCancel,
  onRateSeller,
}: TicketCardProps) {
  const router = useRouter();
  const statusConfig = getStatusConfig(item.status, theme.secondary);

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/ticket-details/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Header with badges */}
      <View style={styles.orderHeader}>
        <View style={styles.leftBadges}>
          <View
            style={[styles.sportBadge, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.sportBadgeText}>{item.sport || "Event"}</Text>
          </View>
          {item.event?.is_season_pass && (
            <View
              style={[
                styles.seasonBadge,
                { backgroundColor: theme.secondary },
              ]}
            >
              <Text style={styles.seasonBadgeText}>SEASON</Text>
            </View>
          )}
          {item.ticket_type === "general_admission" && (
            <View
              style={[styles.generalBadge, { backgroundColor: "#10b981" }]}
            >
              <Text style={styles.generalBadgeText}>GENERAL</Text>
            </View>
          )}
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusConfig.color },
          ]}
        >
          <Ionicons name={statusConfig.icon as any} size={12} color="white" />
          <Text style={styles.statusText}>{statusConfig.text}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.orderContent}>
        <Text style={styles.orderTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.dateText}>
          {new Date(item.event_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          •{" "}
          {new Date(item.event_date).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </Text>

        <View style={styles.detailsRow}>
          <View style={styles.locationDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="location" size={14} color="#6b7280" />
              <Text style={styles.detailText}>{item.location}</Text>
            </View>
            {item.section && (
              <View style={styles.detailItem}>
                <Ionicons name="ticket" size={14} color="#6b7280" />
                <Text style={styles.detailText}>
                  Sec {item.section}, Row {item.row_number}, Seat{" "}
                  {item.seat_number}
                </Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.priceContainer,
              { backgroundColor: theme.primary },
            ]}
          >
            <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Sale Information for sold tickets */}
      {item.status === "sold" && item.sale && (
        <View style={styles.saleInfoSection}>
          <View style={styles.saleInfoHeader}>
            <Ionicons name="person" size={16} color="#16a34a" />
            <Text style={styles.saleInfoTitle}>Sold to:</Text>
          </View>
          <View style={styles.saleInfoContent}>
            <Text style={styles.buyerName}>{item.sale.buyer_name}</Text>
            <Text style={styles.saleDate}>
              Sold {formatSaleDate(item.sale.sale_date)}
            </Text>
            {item.sale.sale_price !== item.price && (
              <Text style={styles.salePrice}>
                Final price: ${item.sale.sale_price.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Dispute Banner for Seller Listings */}
      {item.type === "listing" &&
        item.escrow_status === "disputed" &&
        item.dispute_id && (
          <View style={styles.disputeBanner}>
            <View style={styles.disputeBannerContent}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <View style={styles.disputeBannerText}>
                <Text style={styles.disputeBannerTitle}>Dispute Active</Text>
                <Text style={styles.disputeBannerSubtitle}>
                  This transaction is under review. View details and add
                  evidence.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewDisputeButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/dispute/status/${item.dispute_id}` as any);
              }}
            >
              <Text style={styles.viewDisputeButtonText}>
                View Dispute Status
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

      {/* View Order button for Stripe escrow orders */}
      {item.type === "purchase" &&
        item.escrow_order_id &&
        item.escrow_status === "payment_held" && (
          <View style={styles.orderActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewOrderButton]}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/orders/${item.escrow_order_id}` as any);
              }}
            >
              <Ionicons name="eye" size={16} color="white" />
              <Text style={styles.actionButtonText}>
                View Order & Confirm
              </Text>
            </TouchableOpacity>
          </View>
        )}

      {/* Purchase Information */}
      {item.type === "purchase" && (
        <View style={styles.purchaseInfoSection}>
          <View style={styles.purchaseInfoHeader}>
            <Ionicons name="receipt" size={16} color="#3b82f6" />
            <Text style={styles.purchaseInfoTitle}>Your Purchase</Text>
          </View>
          <View style={styles.purchaseInfoContent}>
            {item.seller_name && (
              <Text style={styles.sellerName}>
                Purchased from: {item.seller_name}
              </Text>
            )}
            <Text style={styles.purchaseDate}>
              Purchased {formatSaleDate(item.created_at)}
            </Text>
            {item.payment_method && (
              <Text style={styles.paymentMethod}>
                Payment: {item.payment_method}
              </Text>
            )}
            {item.escrow_status && (
              <View style={styles.escrowStatusContainer}>
                <Ionicons
                  name={
                    item.escrow_status === "disputed"
                      ? "alert-circle"
                      : item.escrow_status === "payment_held"
                      ? "time"
                      : item.escrow_status === "completed"
                      ? "checkmark-circle"
                      : "hourglass"
                  }
                  size={14}
                  color={
                    item.escrow_status === "disputed"
                      ? "#ef4444"
                      : item.escrow_status === "payment_held"
                      ? "#f59e0b"
                      : item.escrow_status === "completed"
                      ? "#10b981"
                      : "#6b7280"
                  }
                />
                <Text
                  style={[
                    styles.escrowStatusText,
                    {
                      color:
                        item.escrow_status === "disputed"
                          ? "#ef4444"
                          : item.escrow_status === "payment_held"
                          ? "#f59e0b"
                          : item.escrow_status === "completed"
                          ? "#10b981"
                          : "#6b7280",
                    },
                  ]}
                >
                  {item.escrow_status === "disputed"
                    ? "Dispute Under Review"
                    : item.escrow_status === "payment_held"
                    ? "Awaiting ticket transfer"
                    : item.escrow_status === "completed"
                    ? "Transfer confirmed"
                    : item.escrow_status === "payout_pending"
                    ? "Processing payout"
                    : item.escrow_status}
                </Text>
              </View>
            )}

            {/* Dispute Banner and Button */}
            {item.escrow_status === "disputed" && item.dispute_id && (
              <View style={styles.disputeBanner}>
                <View style={styles.disputeBannerContent}>
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <View style={styles.disputeBannerText}>
                    <Text style={styles.disputeBannerTitle}>
                      Dispute Filed
                    </Text>
                    <Text style={styles.disputeBannerSubtitle}>
                      This transaction is under review by our team
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.viewDisputeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/dispute/status/${item.dispute_id}` as any);
                  }}
                >
                  <Text style={styles.viewDisputeButtonText}>
                    View Status
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#ef4444"
                  />
                </TouchableOpacity>
              </View>
            )}
            {item.transfer_deadline &&
              item.escrow_status === "payment_held" && (
                <Text style={styles.transferDeadline}>
                  Transfer deadline: {formatSaleDate(item.transfer_deadline)}
                </Text>
              )}

            {/* Instructions and Warning for awaiting transfer */}
            {item.escrow_status === "payment_held" && (
              <View style={styles.transferInstructions}>
                <View style={styles.instructionBox}>
                  <Ionicons
                    name="information-circle"
                    size={16}
                    color="#3b82f6"
                  />
                  <Text style={styles.instructionText}>
                    The seller has been notified to transfer your ticket. Once
                    you receive it, tap to view order and confirm receipt.
                  </Text>
                </View>
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={16} color="#dc2626" />
                  <Text style={styles.warningText}>
                    Important: You must confirm once you receive your ticket.
                    Failure to confirm after the seller provides proof may
                    result in a fine.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Rate Seller Button */}
          {item.needsSellerRating && (
            <TouchableOpacity
              style={styles.rateSellerButton}
              onPress={(e) => {
                e.stopPropagation();
                onRateSeller(item);
              }}
            >
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.rateSellerButtonText}>Rate Seller</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Actions for listings */}
      {activeTab === "selling" && item.status === "available" && (
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
          >
            <Ionicons name="pencil" size={16} color="white" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={(e) => {
              e.stopPropagation();
              onCancel(item.id);
            }}
          >
            <Ionicons name="close" size={16} color="white" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transfer Portal for available tickets */}
      {activeTab === "selling" &&
        item.status === "available" &&
        (item.home_college_id || item.away_college_id) && (
          <View style={styles.transferSection}>
            <View style={styles.transferInfo}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={theme.primary}
              />
              <Text style={styles.transferText}>
                Use official portal to transfer this ticket
              </Text>
            </View>
            <TicketTransferButton
              collegeId={item.home_college_id || item.away_college_id || ""}
              ticketInfo={{
                title: item.title,
                eventDate: new Date(item.event_date).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                ),
                section: item.section,
                row: item.row_number,
                seat: item.seat_number,
              }}
              variant="outline"
              size="small"
              style={styles.transferButton}
            />
          </View>
        )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 8,
  },
  leftBadges: {
    flexDirection: "row",
    gap: 8,
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  seasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  seasonBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  generalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  generalBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  orderContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
    lineHeight: 24,
  },
  dateText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
    fontWeight: "500",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  locationDetails: {
    flex: 1,
    marginRight: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  priceContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  orderActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    padding: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  editButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  viewOrderButton: {
    backgroundColor: "#3b82f6",
  },
  saleInfoSection: {
    borderTopWidth: 1,
    borderTopColor: "#dcfce7",
    backgroundColor: "#f0fdf4",
    padding: 12,
  },
  saleInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  saleInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  saleInfoContent: {
    gap: 4,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803d",
  },
  saleDate: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "500",
  },
  salePrice: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "500",
    fontStyle: "italic",
  },
  purchaseInfoSection: {
    borderTopWidth: 1,
    borderTopColor: "#dbeafe",
    backgroundColor: "#eff6ff",
    padding: 12,
  },
  purchaseInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  purchaseInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  purchaseInfoContent: {
    gap: 4,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
  },
  purchaseDate: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  paymentMethod: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
    fontStyle: "italic",
  },
  escrowStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  escrowStatusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  disputeBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  disputeBannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  disputeBannerText: {
    flex: 1,
  },
  disputeBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 2,
  },
  disputeBannerSubtitle: {
    fontSize: 12,
    color: "#b91c1c",
  },
  viewDisputeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "white",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  viewDisputeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ef4444",
  },
  transferDeadline: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 2,
  },
  transferInstructions: {
    marginTop: 12,
    gap: 8,
  },
  instructionBox: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 8,
    gap: 8,
    alignItems: "flex-start",
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 8,
    gap: 8,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#991b1b",
    lineHeight: 18,
    fontWeight: "500",
  },
  rateSellerButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#f59e0b",
    gap: 4,
  },
  rateSellerButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  transferSection: {
    borderTopWidth: 1,
    borderTopColor: "#e5f3ff",
    backgroundColor: "#f0f9ff",
    padding: 12,
    gap: 8,
  },
  transferInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transferText: {
    fontSize: 12,
    color: "#0369a1",
    fontWeight: "500",
    flex: 1,
  },
  transferButton: {
    alignSelf: "stretch",
  },
});

export default TicketCard;
