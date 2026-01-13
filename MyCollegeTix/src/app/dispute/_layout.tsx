// src/app/dispute/_layout.tsx
import { Stack } from "expo-router";

export default function DisputeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[orderId]" />
      <Stack.Screen name="status/[disputeId]" />
    </Stack>
  );
}
