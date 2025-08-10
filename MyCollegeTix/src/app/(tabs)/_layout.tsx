// app/(tabs)/_layout.tsx - FIXED to remove duplicate chat route
import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "@/src/providers/ThemeProvider";
import { NotificationBadge } from "@/src/components/NotificationBadge";
import { KeyboardDismiss } from "@/src/components/KeyboardDismiss";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

function ChatTabIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <NotificationBadge
        iconName="chatbubbles-outline"
        iconSize={24}
        iconColor={color}
        showChatBadge={true}
      />
    </View>
  );
}

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemeProvider>
      <KeyboardDismiss>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: theme.primary,
            tabBarInactiveTintColor: "#A9A9A9",
            tabBarStyle: {
              borderTopColor: "#E5E7EB",
              borderTopWidth: 1,
              backgroundColor: "#ffffff",
              paddingBottom: Platform.OS === "android" ? insets.bottom + 4 : insets.bottom,
              paddingTop: 8,
              height: Platform.OS === "android" ? 60 + insets.bottom : 60 + insets.bottom,
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: -2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 3.84,
            },
            headerShown: false,
          }}
        >
        <Tabs.Screen
          name="index"
          options={{
            title: "Browse",
            tabBarIcon: ({ color }) => <TabBarIcon name="ticket" color={color} />,
          }}
        />
        <Tabs.Screen
          name="sell"
          options={{
            title: "Sell",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="plus-circle" color={color} />
            ),
          }}
        />
        {/* ✅ FIXED: Points to chat folder, not chat.tsx */}
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarIcon: ({ color }) => <ChatTabIcon color={color} />,
          }}
          initialParams={{ primary: theme.primary, secondary: theme.secondary }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="list-alt" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          }}
        />
        </Tabs>
      </KeyboardDismiss>
    </ThemeProvider>
  );
}
