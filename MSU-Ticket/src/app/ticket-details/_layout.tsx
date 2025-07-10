
import { Stack } from 'expo-router';

export default function TicketDetailsLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
