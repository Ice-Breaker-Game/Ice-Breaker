import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme";

type TextFieldProps = TextInputProps & {
    label?: string;
};

// A labeled text input whose border turns teal while you're typing in it.
export function TextField({ label, style, onFocus, onBlur, ...rest }: TextFieldProps) {
    const [focused, setFocused] = useState(false);

    return (
        <View style={styles.wrapper}>
            {!!label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                placeholderTextColor={colors.placeholder}
                accessibilityLabel={label}
                {...rest}
                onFocus={(event) => {
                    setFocused(true);
                    onFocus?.(event);
                }}
                onBlur={(event) => {
                    setFocused(false);
                    onBlur?.(event);
                }}
                style={[styles.input, focused && styles.focused, style]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        gap: spacing.xs,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: "600",
        color: colors.textMuted,
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        fontSize: fontSize.md,
        color: colors.text,
        // Hides the browser's own focus outline; the teal border shows focus instead.
        outlineWidth: 0,
    },
    focused: {
        borderColor: colors.primary,
    },
});
