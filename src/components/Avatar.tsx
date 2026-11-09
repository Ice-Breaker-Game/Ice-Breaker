import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";
import { getInitials } from "@/utils/initials";

type AvatarProps = {
    name: string;
    photoURL?: string | null;
    size?: number;
};

// A round profile picture, or the person's initials if they don't have one.
export function Avatar({ name, photoURL, size = 48 }: AvatarProps) {
    const circle = { width: size, height: size, borderRadius: size / 2 };

    if (photoURL) {
        return (
            <Image
                source={{ uri: photoURL }}
                style={circle}
                contentFit="cover"
                accessibilityLabel={`${name}'s profile picture`}
            />
        );
    }

    return (
        <View style={[styles.initialsCircle, circle]}>
            <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    initialsCircle: {
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    initials: {
        color: colors.textOnPrimary,
        fontWeight: "700",
    },
});
