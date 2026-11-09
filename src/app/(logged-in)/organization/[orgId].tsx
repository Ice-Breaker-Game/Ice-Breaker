import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams } from "expo-router";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { generateUniqueInviteCode } from "@/utils/inviteCode";

// Placeholder organization page. The real one is built in #33.
export default function OrganizationPage() {
    const { orgId } = useLocalSearchParams<{ orgId: string }>();
    const { user } = useAuth();
    const [name, setName] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [inviteCode, setInviteCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [regenerating, setRegenerating] = useState(false);

    useEffect(() => {
        const loadOrganization = async () => {
            try {
                const orgSnapshot = await getDoc(doc(db, "organizations", orgId));
                if (!orgSnapshot.exists()) {
                    setError("Organization not found");
                    return;
                }
                setName(orgSnapshot.data().name);

                // Only admins can read the invite code, so check the user's role first.
                const memberSnapshot = await getDoc(doc(db, "organizations", orgId, "members", user.uid));
                const admin = memberSnapshot.exists() && memberSnapshot.data().role === "admin";
                setIsAdmin(admin);

                if (admin) {
                    const inviteSnapshot = await getDoc(doc(db, "organizations", orgId, "private", "invite"));
                    setInviteCode(inviteSnapshot.data()?.code ?? "");
                }
            } catch {
                setError("Could not load this organization, please try again later");
            } finally {
                setLoading(false);
            }
        };

        void loadOrganization();
    }, [orgId, user]);

    const handleCopy = async () => {
        try {
            const copied = await Clipboard.setStringAsync(inviteCode);
            setMessage(copied ? "Code copied" : "Couldn't copy the code, please copy it by hand");
        } catch {
            setMessage("Couldn't copy the code, please copy it by hand");
        }
    };

    const handleShare = async () => {
        setMessage("");
        try {
            await Share.share({ message: `Join ${name} on Ice Breaker with invite code ${inviteCode}` });
        } catch {
            // Some browsers (like Firefox on desktop) can't open a share menu.
            setMessage("Sharing isn't available here. Tap the code to copy it instead.");
        }
    };

    const handleRegenerate = async () => {
        setMessage("");
        setRegenerating(true);
        try {
            const newCode = await generateUniqueInviteCode();

            // Remove the old code, add the new one, and update the admin copy, all at once.
            const batch = writeBatch(db);
            batch.delete(doc(db, "inviteCodes", inviteCode));
            batch.set(doc(db, "inviteCodes", newCode), { orgId, createdAt: serverTimestamp() });
            batch.update(doc(db, "organizations", orgId, "private", "invite"), { code: newCode });
            await batch.commit();

            setInviteCode(newCode);
            setMessage("New code created. The old code no longer works.");
        } catch {
            setMessage("Could not create a new code, please try again later");
        } finally {
            setRegenerating(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.error}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: name }} />
            <Text style={styles.header}>{name}</Text>

            {isAdmin && (
                <View style={styles.inviteSection}>
                    <Text style={styles.label}>Invite code</Text>
                    <Pressable
                        onPress={handleCopy}
                        accessibilityRole="button"
                        accessibilityLabel={`Copy invite code ${inviteCode}`}
                    >
                        <Text style={styles.code}>{inviteCode}</Text>
                        <Text style={styles.hint}>Tap to copy</Text>
                    </Pressable>


                    <Pressable onPress={handleShare} style={styles.button}>
                        <Text style={styles.buttonText}>Share</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleRegenerate}
                        style={[styles.button, styles.secondaryButton]}
                        disabled={regenerating}
                    >
                        {regenerating ? (
                            <ActivityIndicator color="#007BFF" size="small" />
                        ) : (
                            <Text style={styles.secondaryButtonText}>Regenerate code</Text>
                        )}
                    </Pressable>

                    {!!message && <Text style={styles.message}>{message}</Text>}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 12,
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#111111",
        marginBottom: 24,
        textAlign: "center",
    },
    inviteSection: {
        width: "100%",
        maxWidth: 320,
        gap: 12,
    },
    label: {
        fontSize: 14,
        color: "#666666",
        textAlign: "center",
    },
    code: {
        fontSize: 32,
        fontWeight: "bold",
        letterSpacing: 4,
        textAlign: "center",
    },

    hint: {
        fontSize: 12,
        color: "#666666",
        textAlign: "center",
    },

    button: {
        backgroundColor: "#007BFF",
        paddingVertical: 12,
        paddingHorizontal: 24,
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
    message: {
        color: "#333333",
        textAlign: "center",
    },
    error: {
        color: "#FF0000",
    },
});
