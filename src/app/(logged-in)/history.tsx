import { Card, Screen, StatusMessage } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { colors, fontSize, spacing } from "@/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

// Same shape the home screen saves after each game.
type ScoreRecord = {
  score: number;
  totalQuestions: number;
  completedAt: string;
};

export default function History() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Must match the key used in (logged-in)/index.tsx.
  const storageKey = `question-challenge-scores-${
    user?.uid ?? user?.email ?? "guest"
  }`;

  // Runs every time this screen comes into view, so new games show up.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const saved = await AsyncStorage.getItem(storageKey);
          const parsed: unknown = saved ? JSON.parse(saved) : [];
          if (active && Array.isArray(parsed)) {
            const newestFirst = [...(parsed as ScoreRecord[])].sort(
              (a, b) =>
                new Date(b.completedAt).getTime() -
                new Date(a.completedAt).getTime()
            );
            setRecords(newestFirst);
          }
        } catch {
          if (active) setError("Could not load your game history.");
        } finally {
          if (active) setLoading(false);
        }
      }

      void load();
      return () => {
        active = false;
      };
    }, [storageKey])
  );

  if (loading) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Match History</Text>
      <StatusMessage type="error" message={error} />

      <FlatList
        data={records}
        keyExtractor={(record, index) => `${record.completedAt}-${index}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No games played yet.</Text>
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View>
              <Text style={styles.score}>
                {item.score} / {item.totalQuestions}
              </Text>
              <Text style={styles.date}>
                {new Date(item.completedAt).toLocaleString()}
              </Text>
            </View>
            {item.score === item.totalQuestions && (
              <Text style={styles.perfect}>Perfect!</Text>
            )}
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.title, fontWeight: "bold", color: colors.primaryDark },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  empty: { fontSize: fontSize.lg, color: colors.textMuted, textAlign: "center", marginTop: spacing.xxl },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  score: { fontSize: fontSize.xl, fontWeight: "bold", color: colors.text },
  date: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  perfect: { fontSize: fontSize.md, fontWeight: "700", color: colors.success },
});