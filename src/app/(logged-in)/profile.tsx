import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { signOut } from "firebase/auth";
import {
    arrayRemove,
    collectionGroup,
    deleteField,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Button, Card, Screen, StatusMessage, TextField } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/firebase";
import { colors, fontSize, spacing } from "@/theme";

// Profile pictures are saved in Firestore as small JPEG data URLs, because Firebase Storage
// needs the paid plan. Shrinking the longest side to 256px keeps each one around 20-40 KB.
const AVATAR_SIZE = 256;

type Profile = {
    displayName: string;
    email: string;
    photoURL: string | null;
};

type BlockedUser = {
    uid: string;
    displayName: string;
};

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
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [unblockingUid, setUnblockingUid] = useState<string | null>(null);

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

                // Other users' docs are private, so the names are saved next to the IDs when blocking.
                const blockedIds: string[] = data?.blockedUserIds ?? [];
                const blockedNames: Record<string, string> = data?.blockedUserNames ?? {};
                setBlockedUsers(
                    blockedIds.map((uid) => ({ uid, displayName: blockedNames[uid] || "Unknown user" }))
                );
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

    const handleUnblock = async (blockedUser: BlockedUser) => {
        setError("");
        setMessage("");
        setUnblockingUid(blockedUser.uid);

        try {
            await updateDoc(doc(db, "users", user.uid), {
                blockedUserIds: arrayRemove(blockedUser.uid),
                [`blockedUserNames.${blockedUser.uid}`]: deleteField(),
            });
            setBlockedUsers((current) => current.filter((b) => b.uid !== blockedUser.uid));
            setMessage(`${blockedUser.displayName} is unblocked`);
        } catch {
            setError(`Could not unblock ${blockedUser.displayName}, please try again later`);
        } finally {
            setUnblockingUid(null);
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
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <Screen centered>
                <Stack.Screen options={{ title: "Profile" }} />
                <StatusMessage type="error" message={error} />
            </Screen>
        );
    }

    return (
        <Screen>
            <Stack.Screen options={{ title: "Profile" }} />

            <Card style={styles.profileCard}>
                <View>
                    <Avatar name={profile.displayName} photoURL={profile.photoURL} size={120} />
                    {savingPhoto && (
                        <View style={styles.avatarOverlay}>
                            <ActivityIndicator color={colors.textOnPrimary} />
                        </View>
                    )}
                </View>
                <View style={styles.photoButtons}>
                    <Pressable onPress={handleChangePhoto} disabled={savingPhoto} accessibilityRole="button" hitSlop={8}>
                        <Text style={styles.link}>{profile.photoURL ? "Change picture" : "Add picture"}</Text>
                    </Pressable>
                    {!!profile.photoURL && (
                        <Pressable
                            onPress={handleRemovePhoto}
                            disabled={savingPhoto}
                            accessibilityRole="button"
                            accessibilityLabel="Remove picture"
                            hitSlop={8}
                        >
                            <Text style={styles.removeLink}>Remove</Text>
                        </Pressable>
                    )}
                </View>
            </Card>

            <Card>
                <Text style={styles.label}>Display name</Text>
                {editingName ? (
                    <>
                        <TextField
                            value={nameInput}
                            onChangeText={setNameInput}
                            placeholder="Enter your display name"
                            accessibilityLabel="Display name"
                            autoCapitalize="words"
                            maxLength={50}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={handleSaveName}
                        />
                        <View style={styles.editButtons}>
                            <Button
                                title="Cancel"
                                variant="outline"
                                onPress={() => setEditingName(false)}
                                disabled={savingName}
                                style={styles.editButton}
                            />
                            <Button title="Save" onPress={handleSaveName} loading={savingName} style={styles.editButton} />
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

                <View style={styles.divider} />

                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{profile.email}</Text>
            </Card>

            <Card>
                <Text style={styles.label}>Blocked users</Text>
                {blockedUsers.length === 0 ? (
                    <Text style={styles.emptyText}>You haven&apos;t blocked anyone.</Text>
                ) : (
                    blockedUsers.map((blockedUser) => (
                        <View key={blockedUser.uid} style={styles.valueRow}>
                            <Text style={styles.value}>{blockedUser.displayName}</Text>
                            <Pressable
                                onPress={() => handleUnblock(blockedUser)}
                                disabled={unblockingUid !== null}
                                accessibilityRole="button"
                                accessibilityLabel={`Unblock ${blockedUser.displayName}`}
                                hitSlop={8}
                            >
                                {unblockingUid === blockedUser.uid ? (
                                    <ActivityIndicator color={colors.primary} size="small" />
                                ) : (
                                    <Text style={styles.link}>Unblock</Text>
                                )}
                            </Pressable>
                        </View>
                    ))
                )}
            </Card>

            <StatusMessage type="error" message={error} />
            <StatusMessage type="success" message={message} />

            <Button title={loggingOut ? "Logging out..." : "Log out"} variant="danger" onPress={handleLogout} disabled={loggingOut} />
        </Screen>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
    },
    profileCard: {
        alignItems: "center",
    },
    avatarOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 60,
        backgroundColor: colors.overlay,
        justifyContent: "center",
        alignItems: "center",
    },
    photoButtons: {
        flexDirection: "row",
        justifyContent: "center",
        gap: spacing.xl,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: "600",
        color: colors.textMuted,
    },
    valueRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
    },
    value: {
        fontSize: fontSize.lg,
        color: colors.text,
        flexShrink: 1,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
    },
    editButtons: {
        flexDirection: "row",
        gap: spacing.md,
    },
    editButton: {
        flex: 1,
    },
    link: {
        color: colors.primary,
        fontSize: fontSize.md,
        fontWeight: "600",
    },
    removeLink: {
        color: colors.danger,
        fontSize: fontSize.md,
        fontWeight: "600",
    },
    emptyText: {
        fontSize: fontSize.md,
        color: colors.textMuted,
    },
});
