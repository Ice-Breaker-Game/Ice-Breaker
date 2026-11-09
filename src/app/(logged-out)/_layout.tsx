import { Stack } from "expo-router";
import { colors } from "@/theme";

// The logged-out screens show their own app title instead of a header.
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
