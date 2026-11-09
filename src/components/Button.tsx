import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    type PressableProps,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme";

type Variant = "primary" | "outline" | "danger";

type ButtonProps = Omit<PressableProps, "style" | "children"> & {
    title: string;
    // primary: filled teal. outline: teal border. danger: red border, for Remove, Block, Report and Log out.
    variant?: Variant;
    // "sm" is for buttons inside list rows.
    size?: "md" | "sm";
    // Shows a spinner instead of the title and disables the button.
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
};

const textColors: Record<Variant, string> = {
    primary: colors.textOnPrimary,
    outline: colors.primary,
    danger: colors.danger,
};

// Works inside <Link asChild> too, because it passes press props through to the Pressable.
export function Button({
    title,
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    style,
    ...rest
}: ButtonProps) {
    const isDisabled = !!disabled || loading;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            {...rest}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.base,
                size === "sm" && styles.small,
                variantStyles[variant],
                pressed && styles.pressed,
                !!disabled && !loading && styles.disabled,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={textColors[variant]} />
            ) : (
                <Text style={[styles.text, size === "sm" && styles.smallText, { color: textColors[variant] }]}>
                    {title}
                </Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        minHeight: 48,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
    },
    small: {
        minHeight: 36,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.sm,
    },
    pressed: {
        opacity: 0.8,
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontSize: fontSize.md,
        fontWeight: "600",
    },
    smallText: {
        fontSize: fontSize.sm,
    },
});

const variantStyles = StyleSheet.create({
    primary: {
        backgroundColor: colors.primary,
    },
    outline: {
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    danger: {
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.danger,
    },
});
