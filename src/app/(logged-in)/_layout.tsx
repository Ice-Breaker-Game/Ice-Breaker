import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { OrgProvider } from "@/context/OrgContext";

export default function Layout() {
  return (
    <OrgProvider>
      <Stack screenOptions={{ headerRight: () => <HeaderLinks /> }} />
    </OrgProvider>
  );
}

// Shown on the right side of the header on every logged-in screen.
// Log out is on the Profile screen (#29).
function HeaderLinks() {
  return (
    <View style={styles.headerLinks}>
      <Link href="/organizations" style={styles.text}>
        Organizations
      </Link>
      <Link href="/profile" style={styles.text}>
        Profile
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  headerLinks: {
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
