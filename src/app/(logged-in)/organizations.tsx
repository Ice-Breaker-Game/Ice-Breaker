import { Link, Stack, useFocusEffect } from "expo-router";
import { collectionGroup, getDoc, getDocs, query, where } from "firebase/firestore";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { db } from "@/firebase";

type Membership = {
    orgId: string;
    name: string;
    role: string;
};

export default function Organizations() {
    const { user } = useAuth();
    const { activeOrgId, setActiveOrgId } = useOrg();
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Reloads every time this screen is shown, so newly created or joined organizations appear.
    useFocusEffect(
        useCallback(() => {
            const loadMemberships = async () => {
                try {
                    // Finds this user's member doc in every organization, in one query.
                    const membersQuery = query(collectionGroup(db, "members"), where("uid", "==", user.uid));
                    const snapshot = await getDocs(membersQuery);

                    // Member docs don't store the organization's name, so read each organization too.
                    const results = await Promise.all(
                        snapshot.docs.map(async (memberDoc) => {
                            // Member docs live at organizations/{orgId}/members/{uid}, so the organization is two levels up.
                            const orgRef = memberDoc.ref.parent.parent!;
                            const orgSnapshot = await getDoc(orgRef);
                            return {
                                orgId: orgRef.id,
                                name: orgSnapshot.data()?.name ?? "Unknown organization",
                                role: memberDoc.data().role,
                            };
                        })
                    );

                    results.sort((a, b) => a.name.localeCompare(b.name));
                    setMemberships(results);
                    setError("");
                } catch (err) {
                    // The first time, Firestore needs an index for this query. The logged error has a link to create it.
                    console.error(err);
                    setError("Could not load your organizations, please try again later");
                } finally {
                    setLoading(false);
                }
            };

            void loadMemberships();
        }, [user])
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Organizations" }} />

            <View style={styles.actions}>
                <Link href="/create-organization" asChild>
                    <Pressable style={styles.button}>
                        <Text style={styles.buttonText}>Create</Text>
                    </Pressable>
                </Link>
                <Link href="/join-organization" asChild>
                    <Pressable style={StyleSheet.flatten([styles.button, styles.secondaryButton])}>
                        <Text style={styles.secondaryButtonText}>Join with code</Text>
                    </Pressable>
                </Link>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <FlatList
                data={memberships}
                keyExtractor={(item) => item.orgId}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    error ? null : (
                        <Text style={styles.empty}>
                            You&apos;re not in any organizations yet. Create one, or join one with an invite code.
                        </Text>
                    )
                }
                renderItem={({ item }) => {
                    const isActive = item.orgId === activeOrgId;
                    return (
                        <View style={[styles.row, isActive && styles.activeRow]}>
                            <Pressable
                                style={styles.rowMain}
                                onPress={() => setActiveOrgId(item.orgId)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isActive }}
                            >
                                <Text style={styles.orgName}>{item.name}</Text>
                                <Text style={styles.role}>
                                    {item.role === "admin" ? "Admin" : "Member"}
                                    {isActive ? " · Active" : ""}
                                </Text>
                            </Pressable>
                            <Link
                                href={{ pathname: "/organization/[orgId]", params: { orgId: item.orgId } }}
                                style={styles.viewLink}
                            >
                                View
                            </Link>
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
    },
    container: {
        flex: 1,
        padding: 12,
    },
    actions: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
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
    list: {
        gap: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
    },
    activeRow: {
        borderColor: "#007BFF",
        backgroundColor: "#EAF3FF",
    },
    rowMain: {
        flex: 1,
        padding: 12,
    },
    orgName: {
        fontSize: 17,
        fontWeight: "bold",
        color: "#111111",
    },
    role: {
        fontSize: 13,
        color: "#666666",
        marginTop: 2,
    },
    viewLink: {
        color: "#007BFF",
        fontSize: 15,
        padding: 12,
    },
    empty: {
        textAlign: "center",
        color: "#666666",
        marginTop: 24,
    },
    error: {
        color: "#FF0000",
        marginBottom: 12,
    },
});