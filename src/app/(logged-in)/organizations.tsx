import { Link, Stack, useFocusEffect } from "expo-router";
import { collectionGroup, getDoc, getDocs, query, where } from "firebase/firestore";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Screen, StatusMessage } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { db } from "@/firebase";
import { colors, fontSize, radius, shadow, spacing } from "@/theme";

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
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <Screen scroll={false}>
            <Stack.Screen options={{ title: "Organizations" }} />

            <View style={styles.actions}>
                <Link href="/create-organization" asChild>
                    <Button title="Create" style={styles.actionButton} />
                </Link>
                <Link href="/join-organization" asChild>
                    <Button title="Join with code" variant="outline" style={styles.actionButton} />
                </Link>
            </View>

            <StatusMessage type="error" message={error} />

            <FlatList
                data={memberships}
                keyExtractor={(item) => item.orgId}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    error ? null : (
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>No organizations yet</Text>
                            <Text style={styles.emptyText}>
                                Create one for your group, or join one with an invite code.
                            </Text>
                        </View>
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
                                accessibilityHint="Makes this your active organization"
                            >
                                <Text style={styles.orgName}>{item.name}</Text>
                                <View style={styles.badges}>
                                    <Text style={styles.roleBadge}>{item.role === "admin" ? "Admin" : "Member"}</Text>
                                    {isActive && <Text style={styles.activeBadge}>Active</Text>}
                                </View>
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
    actions: {
        flexDirection: "row",
        gap: spacing.md,
    },
    actionButton: {
        flex: 1,
    },
    list: {
        gap: spacing.md,
        paddingBottom: spacing.lg,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: "transparent",
        ...shadow,
    },
    activeRow: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    rowMain: {
        flex: 1,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    orgName: {
        fontSize: fontSize.lg,
        fontWeight: "700",
        color: colors.text,
    },
    badges: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    roleBadge: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        backgroundColor: colors.background,
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        overflow: "hidden",
    },
    activeBadge: {
        fontSize: fontSize.sm,
        fontWeight: "700",
        color: colors.textOnPrimary,
        backgroundColor: colors.primary,
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        overflow: "hidden",
    },
    viewLink: {
        color: colors.primary,
        fontSize: fontSize.md,
        fontWeight: "700",
        padding: spacing.lg,
    },
    empty: {
        alignItems: "center",
        gap: spacing.xs,
        marginTop: spacing.xxl,
    },
    emptyTitle: {
        fontSize: fontSize.lg,
        fontWeight: "700",
        color: colors.text,
    },
    emptyText: {
        fontSize: fontSize.md,
        color: colors.textMuted,
        textAlign: "center",
    },
});
