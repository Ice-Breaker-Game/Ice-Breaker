import { Stack, useLocalSearchParams } from "expo-router";
import { collection, deleteDoc, doc, getDoc, getDocs, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { confirmAction } from "@/utils/confirm";

type Member = {
    uid: string;
    displayName: string;
    role: string;
    joinedAt: Timestamp | null;
};

export default function ManageMembers() {
    const { orgId } = useLocalSearchParams<{ orgId: string }>();
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingUid, setRemovingUid] = useState<string | null>(null);

    useEffect(() => {
        const loadMembers = async () => {
            try {
                // Only admins can use this screen, so check the user's role first.
                const mySnapshot = await getDoc(doc(db, "organizations", orgId, "members", user.uid));
                if (!mySnapshot.exists() || mySnapshot.data().role !== "admin") {
                    return;
                }
                setIsAdmin(true);

                const snapshot = await getDocs(collection(db, "organizations", orgId, "members"));
                const results = snapshot.docs.map((memberDoc) => {
                    const data = memberDoc.data();
                    return {
                        uid: memberDoc.id,
                        displayName: data.displayName || "Unnamed user",
                        role: data.role,
                        joinedAt: data.joinedAt ?? null,
                    };
                });

                // Admins first, then everyone else by name.
                results.sort((a, b) => {
                    if (a.role !== b.role) {
                        return a.role === "admin" ? -1 : 1;
                    }
                    return a.displayName.localeCompare(b.displayName);
                });
                setMembers(results);
            } catch {
                setError("Could not load members, please try again later");
            } finally {
                setLoading(false);
            }
        };

        void loadMembers();
    }, [orgId, user]);

    const handleRemove = async (member: Member) => {
        const confirmed = await confirmAction(
            "Remove member?",
            `${member.displayName} will be removed from this organization.`,
            "Remove"
        );
        if (!confirmed) {
            return;
        }

        setError("");
        setRemovingUid(member.uid);
        try {
            await deleteDoc(doc(db, "organizations", orgId, "members", member.uid));
            setMembers((current) => current.filter((m) => m.uid !== member.uid));
        } catch {
            setError(`Could not remove ${member.displayName}, please try again later`);
        } finally {
            setRemovingUid(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!isAdmin) {
        return (
            <View style={styles.centered}>
                <Stack.Screen options={{ title: "Members" }} />
                <Text style={styles.error}>{error || "Only admins can manage members."}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Members" }} />
            {!!error && <Text style={styles.error}>{error}</Text>}

            <FlatList
                data={members}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                    const isMe = item.uid === user.uid;
                    return (
                        <View style={styles.row}>
                            <View style={styles.rowText}>
                                <Text style={styles.name}>
                                    {item.displayName}
                                    {isMe ? " (you)" : ""}
                                </Text>
                                <Text style={styles.details}>
                                    {item.role === "admin" ? "Admin" : "Member"}
                                    {item.joinedAt ? ` · Joined ${item.joinedAt.toDate().toLocaleDateString()}` : ""}
                                </Text>
                            </View>

                            {!isMe && (
                                <Pressable
                                    onPress={() => handleRemove(item)}
                                    disabled={removingUid !== null}
                                    style={styles.removeButton}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Remove ${item.displayName}`}
                                >
                                    {removingUid === item.uid ? (
                                        <ActivityIndicator color="#FF0000" size="small" />
                                    ) : (
                                        <Text style={styles.removeText}>Remove</Text>
                                    )}
                                </Pressable>
                            )}
                        </View>
                    );
                }}
            />
        </View>
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
        flex: 1,
        padding: 12,
    },
    list: {
        gap: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
    },
    rowText: {
        flex: 1,
    },
    name: {
        fontSize: 17,
        fontWeight: "bold",
        color: "#111111",
    },
    details: {
        fontSize: 13,
        color: "#666666",
        marginTop: 2,
    },
    removeButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#FF0000",
        borderRadius: 8,
        minWidth: 80,
        alignItems: "center",
    },
    removeText: {
        color: "#FF0000",
        fontSize: 15,
    },
    error: {
        color: "#FF0000",
        marginBottom: 12,
    },
});