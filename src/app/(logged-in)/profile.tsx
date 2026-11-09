import { Image } from "expo-image";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { signOut } from "firebase/auth";
import { collectionGroup, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/firebase";

// Profile pictures are saved in Firestore as small JPEG data URLs, because Firebase Storage
// needs the paid plan. Shrinking the longest side to 256px keeps each one around 20-40 KB.
const AVATAR_SIZE = 256;

type Profile = {
    displayName: string;
    email: string;
    photoURL: string | null;
};

// "Jane Doe" -> "JD", shown when the user has no profile picture.
function getInitials(name: string) {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");
    return initials || "?";
}

export default function ProfileScreen() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [savingName, setSavingName] = useState(false);
    const [savingPhoto, setSavingPhoto] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const snapshot = await getDoc(doc(db, "users", user.uid));
                const data = snapshot.data();
                setProfile({
                    displayName: data?.displayName ?? "",
                    email: data?.email ?? user.email ?? "",
                    photoURL: data?.photoURL ?? null,
                });
            } catch {
                setError("Could not load your profile, please try again later");
            } finally {
                setLoading(false);
            }
        };

        void loadProfile();
    }, [user]);

    const startEditingName = () => {
        if (!profile) {
            return;
        }
        setNameInput(profile.displayName);
        setError("");
        setMessage("");
        setEditingName(true);
    };

    const handleSaveName = async () => {
        if (!profile) {
            return;
        }
        const trimmedName = nameInput.trim();
        if (!trimmedName) {
            setError("Please enter a display name");
            return;
        }

        setError("");
        setMessage("");
        setSavingName(true);

        try {
            // Every member doc keeps a copy of the display name (Firestore has no joins),
            // so update the user doc and all of those copies together.
            const memberships = await getDocs(query(collectionGroup(db, "members"), where("uid", "==", user.uid)));
            const batch = writeBatch(db);
            batch.update(doc(db, "users", user.uid), { displayName: trimmedName });
            memberships.docs.forEach((memberDoc) => {
                batch.update(memberDoc.ref, { displayName: trimmedName });
            });
            await batch.commit();

            setProfile({ ...profile, displayName: trimmedName });
            setEditingName(false);
            setMessage("Display name saved");
        } catch {
            setError("Could not save your display name, please try again later");
        } finally {
            setSavingName(false);
        }
    };

    const handleChangePhoto = async () => {
        if (!profile) {
            return;
        }
        setError("");
        setMessage("");

        try {
            // Browsers only open the file picker when this runs straight from a button press.
            // allowsEditing and aspect give a square crop on phones; they're ignored on web.
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [1, 1],
            });
            if (result.canceled) {
                return;
            }

            setSavingPhoto(true);
            const asset = result.assets[0];

            // Shrink the longest side to AVATAR_SIZE. The other side is scaled to keep the shape.
            const context = ImageManipulator.manipulate(asset.uri);
            context.resize(asset.width >= asset.height ? { width: AVATAR_SIZE } : { height: AVATAR_SIZE });
            const rendered = await context.renderAsync();
            const saved = await rendered.saveAsync({
                format: SaveFormat.JPEG,
                compress: 0.7,
                base64: true,
            });
            if (!saved.base64) {
                throw new Error("The resized image has no base64 data");
            }

            const photoURL = `data:image/jpeg;base64,${saved.base64}`;
            await updateDoc(doc(db, "users", user.uid), { photoURL });
            setProfile({ ...profile, photoURL });
            setMessage("Profile picture saved");
        } catch {
            setError("Could not save your profile picture, please try again later");
        } finally {
            setSavingPhoto(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (!profile) {
            return;
        }
        setError("");
        setMessage("");
        setSavingPhoto(true);

        try {
            await updateDoc(doc(db, "users", user.uid), { photoURL: null });
            setProfile({ ...profile, photoURL: null });
            setMessage("Profile picture removed");
        } catch {
            setError("Could not remove your profile picture, please try again later");
        } finally {
            setSavingPhoto(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            // AuthContext sees the user is gone, and the root layout switches to the Login screen.
            await signOut(auth);
        } catch {
            setLoggingOut(false);
            setError("Could not log out, please try again");
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centered}>
                <Stack.Screen options={{ title: "Profile" }} />
                <Text style={styles.error}>{error}</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Stack.Screen options={{ title: "Profile" }} />

            <View style={styles.avatarWrapper}>
                {profile.photoURL ? (
                    <Image
                        source={{ uri: profile.photoURL }}
                        style={styles.avatar}
                        contentFit="cover"
                        accessibilityLabel="Your profile picture"
                    />
                ) : (
                    <View style={[styles.avatar, styles.initialsAvatar]}>
                        <Text style={styles.initials}>{getInitials(profile.displayName)}</Text>
                    </View>
                )}
                {savingPhoto && (
                    <View style={[styles.avatar, styles.avatarOverlay]}>
                        <ActivityIndicator color="#fff" />
                    </View>
                )}
            </View>

            <View style={styles.photoButtons}>
                <Pressable onPress={handleChangePhoto} disabled={savingPhoto} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.link}>{profile.photoURL ? "Change picture" : "Add picture"}</Text>
                </Pressable>
                {!!profile.photoURL && (
                    <Pressable onPress={handleRemovePhoto} disabled={savingPhoto} accessibilityRole="button" hitSlop={8}>
                        <Text style={styles.removeLink}>Remove</Text>
                    </Pressable>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Display name</Text>
                {editingName ? (
                    <>
                        <TextInput
                            style={styles.input}
                            value={nameInput}
                            onChangeText={setNameInput}
                            placeholder="Enter your display name"
                            autoCapitalize="words"
                            maxLength={50}
                            autoFocus
                        />
                        <View style={styles.editButtons}>
                            <Pressable
                                onPress={() => setEditingName(false)}
                                disabled={savingName}
                                style={[styles.button, styles.secondaryButton]}
                            >
                                <Text style={styles.secondaryButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={handleSaveName} disabled={savingName} style={styles.button}>
                                {savingName ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.buttonText}>Save</Text>
                                )}
                            </Pressable>
                        </View>
                    </>
                ) : (
                    <View style={styles.valueRow}>
                        <Text style={styles.value}>{profile.displayName || "No display name"}</Text>
                        <Pressable onPress={startEditingName} accessibilityRole="button" hitSlop={8}>
                            <Text style={styles.link}>Edit</Text>
                        </Pressable>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{profile.email}</Text>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!message && <Text style={styles.message}>{message}</Text>}

            <Pressable
                onPress={handleLogout}
                disabled={loggingOut}
                style={styles.logoutButton}
                accessibilityRole="button"
            >
                <Text style={styles.logoutText}>{loggingOut ? "Logging out..." : "Log out"}</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 12,
    },
    container: {
        padding: 16,
        gap: 16,
        width: "100%",
        maxWidth: 480,
        alignSelf: "center",
    },
    avatarWrapper: {
        alignSelf: "center",
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    initialsAvatar: {
        backgroundColor: "#007BFF",
        justifyContent: "center",
        alignItems: "center",
    },
    initials: {
        color: "#fff",
        fontSize: 40,
        fontWeight: "bold",
    },
    avatarOverlay: {
        position: "absolute",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    photoButtons: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
    },
    section: {
        gap: 6,
    },
    label: {
        fontSize: 14,
        color: "#666666",
    },
    valueRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    value: {
        fontSize: 17,
        color: "#111111",
        flexShrink: 1,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
    },
    editButtons: {
        flexDirection: "row",
        gap: 12,
    },
    button: {
        flex: 1,
        backgroundColor: "#007BFF",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 15,
    },
    secondaryButton: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "#007BFF",
    },
    secondaryButtonText: {
        color: "#007BFF",
        fontSize: 15,
    },
    link: {
        color: "#007BFF",
        fontSize: 15,
    },
    removeLink: {
        color: "#FF0000",
        fontSize: 15,
    },
    logoutButton: {
        marginTop: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FF0000",
        alignItems: "center",
    },
    logoutText: {
        color: "#FF0000",
        fontSize: 15,
    },
    error: {
        color: "#FF0000",
    },
    message: {
        color: "#333333",
    },
});
