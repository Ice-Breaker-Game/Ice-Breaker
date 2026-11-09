import { StyleSheet, Text } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme";

type StatusMessageProps = {
    type: "error" | "success" | "info";
    message: string;
};

// A tinted box for error and success messages. Shows nothing when the message is empty.
export function StatusMessage({ type, message }: StatusMessageProps) {
    if (!message) {
        return null;
    }
    return (
        <Text style={[styles.base, styles[type]]} accessibilityLiveRegion="polite">
            {message}
        </Text>
    );
}

const styles = StyleSheet.create({
    base: {
        fontSize: fontSize.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.sm,
        overflow: "hidden",
    },
    error: {
        color: colors.danger,
        backgroundColor: colors.dangerLight,
    },
    success: {
        color: colors.success,
        backgroundColor: colors.successLight,
    },
    info: {
        color: colors.primaryDark,
        backgroundColor: colors.primaryLight,
    },
});
