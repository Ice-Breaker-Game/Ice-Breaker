import { Button, Card, Screen, StatusMessage } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { colors, fontSize, radius, spacing } from "@/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

// Same shape the home screen saves after each game.
type ScoreRecord = {
  score: number;
  totalQuestions: number;
  completedAt: string;
};

// URL params can be a string or a list of strings, so take the first one.
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ratio(record: ScoreRecord) {
  return record.totalQuestions > 0 ? record.score / record.totalQuestions : 0;
}

function messageFor(percent: number) {
  if (percent === 100) return "Perfect score! Great job!";
  if (percent >= 50) return "Nice work! Play again to beat your score.";
  return "Good try! Every round gets easier.";
}

export default function Results() {
  const router = useRouter();
  const { user } = useAuth();
  // Optional: /results?completedAt=<date> shows that game. No param = latest game.
  const completedAt = first(useLocalSearchParams().completedAt);

  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Must match the key used in (logged-in)/index.tsx.
  const storageKey = `question-challenge-scores-${
    user?.uid ?? user?.email ?? "guest"
  }`;

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
          if (active) setError("Could not load your results.");
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

  const selectedIndex = completedAt
    ? records.findIndex((r) => r.completedAt === completedAt)
    : 0;
  const selected = selectedIndex >= 0 ? records[selectedIndex] : undefined;

  if (!selected) {
    return (
      <Screen centered>
        <StatusMessage type="error" message={error} />
        <StatusMessage
          type="info"
          message={
            completedAt
              ? "We couldn't find that game."
              : "No games played yet."
          }
        />
        <Button title="Back to Home" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  const percent = Math.round(ratio(selected) * 100);
  const missed = selected.totalQuestions - selected.score;
  const previous = records[selectedIndex + 1]; // the game just before this one
  const bestPercent = Math.round(Math.max(...records.map(ratio)) * 100);
  const averagePercent = Math.round(
    (records.reduce((sum, r) => sum + ratio(r), 0) / records.length) * 100
  );
  const isPersonalBest =
    records.length > 1 && records.every((r) => ratio(r) <= ratio(selected));

  let comparison = "First game";
  if (previous) {
    const diff = percent - Math.round(ratio(previous) * 100);
    comparison =
      diff > 0
        ? `Up ${diff} points`
        : diff < 0
          ? `Down ${Math.abs(diff)} points`
          : "Same as last game";
  }

  return (
    <Screen centered>
      <Text style={styles.headline}>
        {completedAt ? "Game Results" : "Latest Result"}
      </Text>
      <Text style={styles.date}>
        {new Date(selected.completedAt).toLocaleString()}
      </Text>

      <Card style={styles.center}>
        <Text style={styles.label}>Your score</Text>
        <Text style={styles.score}>
          {selected.score} / {selected.totalQuestions}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.percent}>{percent}%</Text>
        {isPersonalBest && <Text style={styles.best}>Personal best!</Text>}
        <Text style={styles.message}>{messageFor(percent)}</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>This game</Text>
        <StatRow label="Correct" value={String(selected.score)} />
        <StatRow label="Missed" value={String(missed)} />
        <StatRow label="Compared to previous" value={comparison} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>All your games</Text>
        <StatRow label="Games played" value={String(records.length)} />
        <StatRow label="Average score" value={`${averagePercent}%`} />
        <StatRow label="Best score" value={`${bestPercent}%`} />
      </Card>

      <Button title="Play Again" onPress={() => router.replace("/")} />
      <Button
        title="View History"
        variant="outline"
        onPress={() => router.push("/history")}
      />
    </Screen>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    fontSize: fontSize.title,
    fontWeight: "bold",
    color: colors.primaryDark,
    textAlign: "center",
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  center: { alignItems: "center" },
  label: { fontSize: fontSize.md, color: colors.textMuted },
  score: { fontSize: 48, fontWeight: "bold", color: colors.primaryDark },
  track: {
    width: "100%",
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.primary },
  percent: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text },
  best: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.success,
    backgroundColor: colors.successLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  message: { fontSize: fontSize.lg, color: colors.text, textAlign: "center" },
  cardTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.primaryDark },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  statLabel: { fontSize: fontSize.md, color: colors.textMuted },
  statValue: { fontSize: fontSize.md, fontWeight: "600", color: colors.text },
});