import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function AuthLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#18453b" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "white" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen
          name="login"
          options={{
            title: "Sign In",
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            title: "Create Account",
          }}
        />
      </Stack>
    </>
  );
}
