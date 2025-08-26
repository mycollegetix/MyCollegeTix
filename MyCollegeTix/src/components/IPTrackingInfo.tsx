// src/components/IPTrackingInfo.tsx - Display IP tracking information for admins
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/providers/ThemeProvider";
import { ipTrackingService } from "@/src/services/ipTrackingService";

interface IPTrackingInfoProps {
  userId: string;
  isAdmin?: boolean;
}

export function IPTrackingInfo({ userId, isAdmin = false }: IPTrackingInfoProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [ipInfo, setIpInfo] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadIPInfo();
    }
  }, [userId, isAdmin]);

  const loadIPInfo = async () => {
    try {
      setLoading(true);
      const info = await ipTrackingService.getUserIPInfo(userId);
      setIpInfo(info);
    } catch (error) {
      console.error("Error loading IP info:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading IP info...
        </Text>
      </View>
    );
  }

  if (!ipInfo) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
          No IP tracking data available
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <Ionicons name="location-outline" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>IP Tracking Info</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current IP */}
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Current IP:
            </Text>
            <Text style={[styles.value, { color: theme.text, fontFamily: "monospace" }]}>
              {ipInfo.current_ip || "Unknown"}
            </Text>
          </View>

          {/* Previous IP */}
          {ipInfo.last_ip && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Previous IP:
              </Text>
              <Text style={[styles.value, { color: theme.text, fontFamily: "monospace" }]}>
                {ipInfo.last_ip}
              </Text>
            </View>
          )}

          {/* Last Updated */}
          {ipInfo.updated_at && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Last Updated:
              </Text>
              <Text style={[styles.value, { color: theme.text }]}>
                {formatDate(ipInfo.updated_at)}
              </Text>
            </View>
          )}

          {/* Location */}
          {ipInfo.location && (
            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
              <Text style={[styles.locationText, { color: theme.textSecondary }]}>
                {[
                  ipInfo.location.city,
                  ipInfo.location.regionName,
                  ipInfo.location.country
                ].filter(Boolean).join(", ")}
              </Text>
              {ipInfo.location.isp && (
                <Text style={[styles.ispText, { color: theme.textSecondary }]}>
                  ISP: {ipInfo.location.isp}
                </Text>
              )}
            </View>
          )}

          {/* Device Info */}
          {ipInfo.device && (
            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Device</Text>
              <Text style={[styles.deviceText, { color: theme.textSecondary }]}>
                {ipInfo.device.platform} {ipInfo.device.osVersion}
              </Text>
              <Text style={[styles.deviceText, { color: theme.textSecondary }]}>
                {ipInfo.device.modelName || "Unknown device"}
              </Text>
              <Text style={[styles.deviceText, { color: theme.textSecondary }]}>
                App v{ipInfo.device.appVersion}
              </Text>
            </View>
          )}

          {/* Refresh Button */}
          <TouchableOpacity style={styles.refreshButton} onPress={loadIPInfo}>
            <Ionicons name="refresh" size={16} color={theme.primary} />
            <Text style={[styles.refreshText, { color: theme.primary }]}>
              Refresh
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  content: {
    marginTop: 16,
    maxHeight: 300,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  value: {
    fontSize: 14,
    flex: 2,
    textAlign: "right",
  },
  infoSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 2,
  },
  ispText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  deviceText: {
    fontSize: 14,
    marginBottom: 2,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
    marginLeft: 8,
  },
  noDataText: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
});