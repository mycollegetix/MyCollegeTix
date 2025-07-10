// src/app/chat/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function ChatLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#18453b" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#f8fafc" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Messages",
          }}
        />
        <Stack.Screen
          name="[id]"
          options={{
            title: "Chat",
          }}
        />
      </Stack>
    </>
  );
}
