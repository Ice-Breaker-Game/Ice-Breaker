import { Alert, Platform } from "react-native";

// Asks the user to confirm before doing something that can't be undone.
// Alert.alert doesn't show anything on web, so the browser's own confirm box is used there.
export function confirmAction(title: string, message: string, confirmText: string): Promise<boolean> {
    if (Platform.OS === "web") {
        return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
        Alert.alert(
            title,
            message,
            [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: confirmText, style: "destructive", onPress: () => resolve(true) },
            ],
            // Android: tapping outside the popup counts as Cancel.
            { cancelable: true, onDismiss: () => resolve(false) }
        );
    });
}