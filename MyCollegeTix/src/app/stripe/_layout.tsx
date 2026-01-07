// src/app/stripe/_layout.tsx
import { Stack } from "expo-router";

export default function StripeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="refresh" />
    </Stack>
  );
}
