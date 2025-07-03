import { StyleSheet, TouchableOpacity } from "react-native";
import { Text, View } from "@/src/components/Themed";
import { UserAvatar } from "@/src/components/UserAvatar";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";

// Mock user data - we'll replace this with real data from Supabase later
const mockUser = {
  name: "John Smith",
  email: "john.smith@msu.edu",
  studentId: "123456789",
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <UserAvatar size={80} name={mockUser.name} showName={true} />
        <Text style={styles.email}>{mockUser.email}</Text>
        <Text style={styles.studentId}>Student ID: {mockUser.studentId}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <FontAwesome name="ticket" size={20} color={colors.primary} />
          <Text style={styles.menuText}>My Tickets</Text>
          <FontAwesome
            name="chevron-right"
            size={16}
            color={colors.secondary}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <FontAwesome name="history" size={20} color={colors.primary} />
          <Text style={styles.menuText}>Purchase History</Text>
          <FontAwesome
            name="chevron-right"
            size={16}
            color={colors.secondary}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <FontAwesome name="gear" size={20} color={colors.primary} />
          <Text style={styles.menuText}>Settings</Text>
          <FontAwesome
            name="chevron-right"
            size={16}
            color={colors.secondary}
          />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logoutButton]}>
          <FontAwesome name="sign-out" size={20} color={colors.error} />
          <Text style={[styles.menuText, { color: colors.error }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  email: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  studentId: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  logoutButton: {
    marginTop: 20,
    borderBottomWidth: 0,
  },
});
