import React from "react";
import { StyleSheet, Image, View } from "react-native";
import { Text } from "./Themed";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "./useColorScheme";

interface UserAvatarProps {
  size?: number;
  imageUrl?: string;
  name: string;
  showName?: boolean;
}

export function UserAvatar({
  size = 40,
  imageUrl,
  name,
  showName = false,
}: UserAvatarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    image: {
      width: size,
      height: size,
    },
    initials: {
      color: "#fff",
      fontSize: size * 0.4,
      fontWeight: "600",
    },
    name: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: "500",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.initials}>{getInitials(name)}</Text>
        )}
      </View>
      {showName && <Text style={styles.name}>{name}</Text>}
    </View>
  );
}
