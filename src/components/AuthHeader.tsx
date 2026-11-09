import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, spacing } from "@/theme";

type AuthHeaderProps = {
    title: string;
    subtitle: string;
};

// The app name, screen title and a short subtitle at the top of the logged-out screens.
export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
    return (
        <View style={styles.wrapper}>
            <Text style={styles.appName}>Ice Breaker</Text>
            <Text style={styles.title} accessibilityRole="header">
                {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    appName: {
        fontSize: fontSize.sm,
        fontWeight: "700",
        letterSpacing: 2,
        textTransform: "uppercase",
        color: colors.primary,
    },
    title: {
        fontSize: fontSize.title,
        fontWeight: "700",
        color: colors.primaryDark,
        textAlign: "center",
    },
    subtitle: {
        fontSize: fontSize.md,
        color: colors.textMuted,
        textAlign: "center",
    },
});
