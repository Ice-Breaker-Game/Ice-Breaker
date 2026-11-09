import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radius, shadow, spacing } from "@/theme";

// A white rounded panel with a soft shadow, for grouping content.
export function Card({ style, ...rest }: ViewProps) {
    return <View {...rest} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.md,
        ...shadow,
    },
});
