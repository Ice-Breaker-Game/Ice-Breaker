import { Stack } from "expo-router";
import { useAuth, AuthProvider } from '../context/AuthContext'
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  return <AuthProvider>
    <RootNavigator />
  </AuthProvider>
}

function RootNavigator() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(logged-in)"></Stack.Screen>
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(logged-out)"></Stack.Screen>
      </Stack.Protected>
    </Stack>
  )
}
