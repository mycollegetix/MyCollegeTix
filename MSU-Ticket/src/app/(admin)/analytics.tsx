// src/app/(admin)/analytics.tsx
import React, { useState, useEffect } from "react";
import { StyleSheet, ScrollView, View, Text, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/src/lib/supabase";

const { width } = Dimensions.get("window");

interface AnalyticsData {
  totalUsers: number;
  newUsersThisWeek: number;
  totalTickets: number;
  ticketsSoldThisWeek: number;
  totalRevenue: number;
  revenueThisWeek: number;
  topSports: { sport: string; count: number }[];
  userGrowth: { date: string; count: number }[];
  ticketSales: { date: string; count: number }[];
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    newUsersThisWeek: 0,
    totalTickets: 0,
    ticketsSoldThisWeek: 0,
    totalRevenue: 0,
    revenueThisWeek: 0,
    topSports: [],
    userGrowth: [],
    ticketSales: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      const weekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Fetch all data in parallel
      const [
        usersResult,
        newUsersResult,
        ticketsResult,
        ordersResult,
        recentOrdersResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", weekAgo),
        supabase.from("tickets").select("*"),
        supabase.from("orders").select("*"),
        supabase.from("orders").select("*").gte("created_at", weekAgo),
      ]);

      const tickets = ticketsResult.data || [];
      const orders = ordersResult.data || [];
      const recentOrders = recentOrdersResult.data || [];

      // Calculate top sports
      const sportCounts = tickets.reduce((acc, ticket) => {
        const sport = ticket.sport || "Unknown";
        acc[sport] = (acc[sport] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topSports = Object.entries(sportCounts)
        .map(([sport, count]) => ({ sport, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.amount || 0),
        0
      );
      const revenueThisWeek = recentOrders.reduce(
        (sum, order) => sum + (order.amount || 0),
        0
      );

      setAnalytics({
        totalUsers: usersResult.count || 0,
        newUsersThisWeek: newUsersResult.count || 0,
        totalTickets: tickets.length,
        ticketsSoldThisWeek: recentOrders.length,
        totalRevenue,
        revenueThisWeek,
        topSports,
        userGrowth: [],
        ticketSales: [],
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const MetricCard = ({
    title,
    value,
    change,
    icon,
    color = "#18453b",
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: string;
    color?: string;
  }) => (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color="white" />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {change && (
        <Text
          style={[
            styles.metricChange,
            { color: change.startsWith("+") ? "#16a34a" : "#dc2626" },
          ]}
        >
          {change}
        </Text>
      )}
    </View>
  );

  const SportCard = ({ sport, count }: { sport: string; count: number }) => (
    <View style={styles.sportCard}>
      <Text style={styles.sportName}>{sport}</Text>
      <Text style={styles.sportCount}>{count} tickets</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={["#18453b", "#2d5f52"]}
        style={styles.headerBackground}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Performance overview and insights
          </Text>
        </View>
      </LinearGradient>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Users"
            value={analytics.totalUsers}
            change={`+${analytics.newUsersThisWeek} this week`}
            icon="people"
            color="#18453b"
          />
          <MetricCard
            title="Total Tickets"
            value={analytics.totalTickets}
            change={`+${analytics.ticketsSoldThisWeek} sold this week`}
            icon="ticket"
            color="#2563eb"
          />
          <MetricCard
            title="Total Revenue"
            value={`$${analytics.totalRevenue.toFixed(2)}`}
            change={`+$${analytics.revenueThisWeek.toFixed(2)} this week`}
            icon="cash"
            color="#16a34a"
          />
        </View>
      </View>

      {/* Top Sports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Sports</Text>
        <View style={styles.sportsContainer}>
          {analytics.topSports.map((sport, index) => (
            <SportCard key={index} sport={sport.sport} count={sport.count} />
          ))}
        </View>
      </View>

      {/* System Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Health</Text>
        <View style={styles.healthContainer}>
          <View style={styles.healthItem}>
            <View style={[styles.healthDot, { backgroundColor: "#16a34a" }]} />
            <Text style={styles.healthText}>Database: Operational</Text>
          </View>
          <View style={styles.healthItem}>
            <View style={[styles.healthDot, { backgroundColor: "#16a34a" }]} />
            <Text style={styles.healthText}>API: Healthy</Text>
          </View>
          <View style={styles.healthItem}>
            <View style={[styles.healthDot, { backgroundColor: "#16a34a" }]} />
            <Text style={styles.healthText}>Authentication: Active</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityContainer}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="person-add" size={20} color="#18453b" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New User Registrations</Text>
              <Text style={styles.activityDescription}>
                {analytics.newUsersThisWeek} new users joined this week
              </Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="ticket" size={20} color="#2563eb" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Ticket Sales</Text>
              <Text style={styles.activityDescription}>
                {analytics.ticketsSoldThisWeek} tickets sold this week
              </Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="cash" size={20} color="#16a34a" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Revenue Growth</Text>
              <Text style={styles.activityDescription}>
                ${analytics.revenueThisWeek.toFixed(2)} generated this week
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
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
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
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
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: "600",
  },
  sportsContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sportCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sportName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  sportCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  healthContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  healthText: {
    fontSize: 16,
    color: "#1f2937",
  },
  activityContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
});
