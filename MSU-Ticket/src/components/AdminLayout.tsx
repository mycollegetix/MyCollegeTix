// src/components/admin/AdminLayout.tsx
import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export default function AdminLayout({
  children,
  title,
  subtitle,
  showBackButton = true,
}: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const navigationItems = [
    {
      key: "dashboard",
      title: "Dashboard",
      icon: "grid-outline",
      route: "/(admin)",
    },
    {
      key: "events",
      title: "Events",
      icon: "calendar-outline",
      route: "/(admin)/events",
    },
    {
      key: "tickets",
      title: "Tickets",
      icon: "ticket-outline",
      route: "/(admin)/tickets",
    },
    {
      key: "users",
      title: "Users",
      icon: "people-outline",
      route: "/(admin)/users",
    },
    {
      key: "colleges",
      title: "Colleges",
      icon: "school-outline",
      route: "/(admin)/colleges",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#18453b", "#2d5a4f"]} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {showBackButton && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            )}
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle && (
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.route ||
              (item.route === "/(admin)" && pathname === "/admin");

            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, isActive && styles.activeNavItem]}
                onPress={() => router.push(item.route as any)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isActive ? "#18453b" : "rgba(255,255,255,0.7)"}
                />
                <Text
                  style={[styles.navText, isActive && styles.activeNavText]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
  },
  profileButton: {
    padding: 8,
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  navItem: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 60,
  },
  activeNavItem: {
    backgroundColor: "white",
  },
  navText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
    fontWeight: "500",
  },
  activeNavText: {
    color: "#18453b",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
});
