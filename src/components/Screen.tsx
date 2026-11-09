import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, maxContentWidth, spacing } from "@/theme";

type ScreenProps = {
    children: ReactNode;
    // Vertically centers short screens, like the login form.
    centered?: boolean;
    // Use false when the screen has its own FlatList, which scrolls by itself.
    scroll?: boolean;
    // Use true on screens without a header, so content doesn't go under the phone's notch.
    safeArea?: boolean;
    contentStyle?: StyleProp<ViewStyle>;
};

// The background, padding and max width every screen shares.
export function Screen({ children, centered = false, scroll = true, safeArea = false, contentStyle }: ScreenProps) {
    const body = scroll ? (
        <ScrollView
            style={styles.background}
            contentContainerStyle={[styles.scrollContent, centered && styles.centered]}
            keyboardShouldPersistTaps="handled"
        >
            <View style={[styles.content, contentStyle]}>{children}</View>
        </ScrollView>
    ) : (
        <View style={[styles.background, styles.fixedContent]}>
            <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
        </View>
    );

    if (!safeArea) {
        return body;
    }
    return (
        <SafeAreaView style={styles.background} edges={["top", "bottom"]}>
            {body}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.lg,
    },
    fixedContent: {
        padding: spacing.lg,
    },
    centered: {
        justifyContent: "center",
    },
    content: {
        width: "100%",
        maxWidth: maxContentWidth,
        alignSelf: "center",
        gap: spacing.md,
    },
    fill: {
        flex: 1,
    },
});
