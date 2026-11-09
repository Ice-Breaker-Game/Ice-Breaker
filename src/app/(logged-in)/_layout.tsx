import { Link, Stack } from "expo-router";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OrgProvider } from "@/context/OrgContext";
import { auth } from "@/firebase";

export default function Layout() {
  return (
    <OrgProvider>
      <Stack screenOptions={{ headerRight: () => <HeaderButtons /> }} />
    </OrgProvider>
  );
}

// Shown on the right side of the header on every logged-in screen.
function HeaderButtons() {
  return (
    <View style={styles.headerButtons}>
      <Link href="/organizations" style={styles.text}>
        Organizations
      </Link>
      <LogoutButton />
    </View>
  );
}

// Moves to the Profile screen once #29 is built.
function LogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // AuthContext sees the user is gone, and the root layout switches to the Login screen.
      await signOut(auth);
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <Pressable
      onPress={handleLogout}
      disabled={loggingOut}
      accessibilityRole="button"
      hitSlop={8}
    >
      <Text style={styles.text}>{loggingOut ? "Logging out..." : "Log out"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 12,
  },
  text: {
    color: "#007BFF",
    fontSize: 15,
  },
});