// src/components/SellerWalletCard.tsx
//
// Three-card seller balance display: Available / Pending / Lifetime.
// Transparency-only: shows derived numbers from the `seller_balances` view.
// Does NOT change any escrow / payout / refund behavior.
//
// Mounted in profile.tsx just above the "Payments & Payouts" Stripe Dashboard
// button so sellers immediately see where their money is.

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  WalletService,
  SellerBalances,
  formatBalance,
} from "@/src/services/walletService";

interface SellerWalletCardProps {
  /** Optional — defaults to current authenticated user. */
  userId?: string;
  /** External refresh trigger; bump to force a reload. */
  refreshKey?: number;
}

interface CardSpec {
  key: keyof SellerBalances;
  label: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string; // text + icon color
  background: string; // card background
  border: string; // card border
}

const CARDS: CardSpec[] = [
  {
    key: "pendingBalance",
    label: "Pending",
    caption: "On the way to your bank",
    icon: "time-outline",
    accent: "#d97706",
    background: "#fffbeb",
    border: "#fde68a",
  },
  {
    key: "lifetimeEarnings",
    label: "Lifetime",
    caption: "Total earned from all sales",
    icon: "trophy-outline",
    accent: "#2563eb",
    background: "#eff6ff",
    border: "#bfdbfe",
  },
];

export function SellerWalletCard({ userId, refreshKey }: SellerWalletCardProps) {
  const [balances, setBalances] = useState<SellerBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await WalletService.getSellerBalances(userId);
    if (result.success && result.data) {
      setBalances(result.data);
    } else {
      setError(result.error ?? "Could not load balances");
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your earnings</Text>
        <TouchableOpacity
          onPress={load}
          disabled={loading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Refresh balances"
        >
          <Ionicons
            name="refresh"
            size={18}
            color={loading ? "#94a3b8" : "#475569"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardRow}>
        {CARDS.map((card) => (
          <BalanceCard
            key={card.key}
            spec={card}
            value={balances?.[card.key]}
            loading={loading}
          />
        ))}
      </View>

      <Text style={styles.disclaimer}>
        Pending funds are held until the buyer confirms transfer and the
        review window closes. Once released, Stripe auto-deposits to your
        bank within ~2 business days. No Stripe fees come off — you keep
        your full listing price.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

interface BalanceCardProps {
  spec: CardSpec;
  value: number | undefined;
  loading: boolean;
}

function BalanceCard({ spec, value, loading }: BalanceCardProps) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: spec.background, borderColor: spec.border },
      ]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${spec.label} balance: ${
        value != null ? formatBalance(value) : "loading"
      }`}
    >
      <View style={styles.cardHeader}>
        <Ionicons name={spec.icon} size={16} color={spec.accent} />
        <Text style={[styles.cardLabel, { color: spec.accent }]}>
          {spec.label}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={spec.accent}
          style={styles.cardSpinner}
        />
      ) : (
        <Text style={[styles.cardAmount, { color: spec.accent }]}>
          {formatBalance(value ?? 0)}
        </Text>
      )}

      <Text style={styles.cardCaption} numberOfLines={2}>
        {spec.caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardRow: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 96,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: "800",
    marginVertical: 2,
  },
  cardSpinner: {
    marginVertical: 4,
    alignSelf: "flex-start",
  },
  cardCaption: {
    fontSize: 10,
    color: "#64748b",
    lineHeight: 13,
  },
  disclaimer: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 10,
    lineHeight: 15,
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 6,
  },
});

export default SellerWalletCard;
