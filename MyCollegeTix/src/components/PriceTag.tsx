import React from "react";
import { StyleSheet } from "react-native";
import { Text } from "./Themed";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "./useColorScheme";

interface PriceTagProps {
  price: number;
  size?: "small" | "medium" | "large";
  showDollarSign?: boolean;
}

export function PriceTag({
  price,
  size = "medium",
  showDollarSign = true,
}: PriceTagProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const styles = StyleSheet.create({
    text: {
      color: colors.primary,
      fontWeight: "700",
      fontSize: size === "small" ? 16 : size === "medium" ? 20 : 24,
    },
  });

  return (
    <Text style={styles.text}>
      {showDollarSign ? "$" : ""}
      {price.toFixed(2)}
    </Text>
  );
}
