import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";

import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].primary,
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
        tabBarStyle: {
          borderTopColor: Colors[colorScheme ?? "light"].border,
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
  );
}
