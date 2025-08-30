// src/app/(admin)/index.tsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { CollegeService } from "@/src/services/collegeService";
import { AdminService } from "@/src/services/adminService";

const { width } = Dimensions.get("window");

interface AdminStats {
  totalUsers: number;
  totalTickets: number;
  totalEvents: number;
  totalOrders: number;
  activeTickets: number;
  soldTickets: number;
  totalRevenue: number;
  recentSignups: number;
  totalColleges: number;
}

import AdminLayout from "@/src/components/AdminLayout";

interface AdminStats {
  totalUsers: number;
  totalTickets: number;
  totalEvents: number;
  totalOrders: number;
  activeTickets: number;
  soldTickets: number;
  totalRevenue: number;
  recentSignups: number;
  totalColleges: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTickets: 0,
    totalEvents: 0,
    totalOrders: 0,
    activeTickets: 0,
    soldTickets: 0,
    totalRevenue: 0,
    recentSignups: 0,
    totalColleges: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  // In your fetchAdminStats function, update the Promise.all to include colleges:

  const fetchAdminStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Fetch all stats in parallel
      const [
        usersResult,
        ticketsResult,
        eventsResult,
        ordersResult,
        collegesResult, // ← Add this line
        recentSignupsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tickets").select("*"),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*"),
        supabase.from("colleges").select("*", { count: "exact", head: true }), // ← Add this line
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          ),
      ]);

      // Process tickets data
      const tickets = ticketsResult.data || [];
      const orders = ordersResult.data || [];

      const activeTickets = tickets.filter(
        (t) => t.status === "available"
      ).length;
      const soldTickets = tickets.filter((t) => t.status === "sold").length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.amount || 0),
        0
      );

      setStats({
        totalUsers: usersResult.count || 0,
        totalTickets: tickets.length,
        totalEvents: eventsResult.count || 0,
        totalOrders: orders.length,
        activeTickets,
        soldTickets,
        totalRevenue,
        recentSignups: recentSignupsResult.count || 0,
        totalColleges: collegesResult.count || 0, // ← Add this line
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      Alert.alert("Error", "Failed to load admin statistics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    AdminService.showRefreshConfirmation(() => {
      AdminService.refreshAllData().then(() => {
        fetchAdminStats(true);
      });
    });
  };


  const StatCard = ({
    title,
    value,
    icon,
    color = "#18453b",
    onPress,
  }: {
    title: string;
    value: string | number;
    icon: string;
    color?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color="white" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const QuickActionCard = ({
    title,
    description,
    icon,
    color = "#18453b",
    onPress,
  }: {
    title: string;
    description: string;
    icon: string;
    color?: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={28} color="white" />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle={`Welcome back, ${user?.email}`}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      <ScrollView style={styles.container}>
        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon="people"
              color="#18453b"
              onPress={() => router.push("/(admin)/users")}
            />
            <StatCard
              title="Total Colleges"
              value={stats.totalColleges}
              icon="school"
              color="#8b5cf6"
              onPress={() => router.push("/(admin)/colleges")}
            />
            <StatCard
              title="Active Tickets"
              value={stats.activeTickets}
              icon="ticket"
              color="#2563eb"
              onPress={() => router.push("/(admin)/tickets")}
            />
            <StatCard
              title="Total Events"
              value={stats.totalEvents}
              icon="calendar"
              color="#7c3aed"
              onPress={() => router.push("/(admin)/events")}
            />
            {/* <StatCard
              title="Orders"
              value={stats.totalOrders}
              icon="receipt"
              color="#dc2626"
              onPress={() => router.push("/(admin)/orders")}
            /> */}
            {/* <StatCard
              title="Revenue"
              value={`${stats.totalRevenue.toFixed(2)}`}
              icon="cash"
              color="#16a34a"
            /> */}
            <StatCard
              title="Recent Signups"
              value={stats.recentSignups}
              icon="person-add"
              color="#ea580c"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickActionCard
              title="User Management"
              description="View, edit, and manage user accounts"
              icon="people"
              color="#18453b"
              onPress={() => router.push("/(admin)/users")}
            />
            <QuickActionCard
              title="Ticket Management"
              description="Monitor and manage ticket listings"
              icon="ticket"
              color="#2563eb"
              onPress={() => router.push("/(admin)/tickets")}
            />
            <QuickActionCard
              title="Event Management"
              description="Create, edit, and manage events"
              icon="calendar"
              color="#7c3aed"
              onPress={() => router.push("/(admin)/events")}
            />
            <QuickActionCard
              title="College Management"
              description="Add, edit, and manage colleges and universities"
              icon="school"
              color="#8b5cf6"
              onPress={() => (router.push as any)("/(admin)/colleges")}
            />
            <QuickActionCard
              title="Analytics"
              description="View detailed analytics and reports"
              icon="analytics"
              color="#16a34a"
              onPress={() => router.push("/(admin)/analytics")}
            />
          </View>
        </View>

        {/* System Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.systemStatus}>
            <View style={styles.statusItem}>
              <View
                style={[styles.statusDot, { backgroundColor: "#16a34a" }]}
              />
              <Text style={styles.statusText}>Database: Online</Text>
            </View>
            <View style={styles.statusItem}>
              <View
                style={[styles.statusDot, { backgroundColor: "#16a34a" }]}
              />
              <Text style={styles.statusText}>Authentication: Active</Text>
            </View>
            <View style={styles.statusItem}>
              <View
                style={[styles.statusDot, { backgroundColor: "#16a34a" }]}
              />
              <Text style={styles.statusText}>Notifications: Running</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerBackground: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    width: (width - 60) / 2,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  quickActions: {
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  systemStatus: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    color: "#1f2937",
  },
});
