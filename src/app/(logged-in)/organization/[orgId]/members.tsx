import { Link, Stack, useLocalSearchParams } from "expo-router";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    type Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Button, Card, Screen, StatusMessage } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { colors, fontSize, radius, shadow, spacing } from "@/theme";
import { confirmAction } from "@/utils/confirm";

type Member = {
    uid: string;
    displayName: string;
    role: string;
    joinedAt: Timestamp | null;
};

type Report = {
    id: string;
    reporterId: string;
    reportedId: string;
    reason: string;
    details: string;
    createdAt: Timestamp | null;
};

type Tab = "members" | "reports";

export default function ManageMembers() {
    const { orgId } = useLocalSearchParams<{ orgId: string }>();
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [tab, setTab] = useState<Tab>("members");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingUid, setRemovingUid] = useState<string | null>(null);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    useEffect(() => {
        const loadMembers = async () => {
            try {
                // Only admins can use this screen, so check the user's role first.
                const mySnapshot = await getDoc(doc(db, "organizations", orgId, "members", user.uid));
                if (!mySnapshot.exists() || mySnapshot.data().role !== "admin") {
                    return;
                }
                setIsAdmin(true);

                const [membersSnapshot, reportsSnapshot] = await Promise.all([
                    getDocs(collection(db, "organizations", orgId, "members")),
                    getDocs(query(collection(db, "organizations", orgId, "reports"), where("status", "==", "open"))),
                ]);

                const memberResults = membersSnapshot.docs.map((memberDoc) => {
                    const data = memberDoc.data();
                    return {
                        uid: memberDoc.id,
                        displayName: data.displayName || "Unnamed user",
                        role: data.role,
                        joinedAt: data.joinedAt ?? null,
                    };
                });

                // Admins first, then everyone else by name.
                memberResults.sort((a, b) => {
                    if (a.role !== b.role) {
                        return a.role === "admin" ? -1 : 1;
                    }
                    return a.displayName.localeCompare(b.displayName);
                });
                setMembers(memberResults);

                const reportResults = reportsSnapshot.docs.map((reportDoc) => {
                    const data = reportDoc.data();
                    return {
                        id: reportDoc.id,
                        reporterId: data.reporterId,
                        reportedId: data.reportedId,
                        reason: data.reason,
                        details: data.details ?? "",
                        createdAt: data.createdAt ?? null,
                    };
                });

                // Newest first.
                reportResults.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
                setReports(reportResults);
            } catch {
                setError("Could not load members, please try again later");
            } finally {
                setLoading(false);
            }
        };

        void loadMembers();
    }, [orgId, user]);

    // Reports only store user IDs, so look up names from the member list.
    const nameFor = (uid: string) =>
        members.find((member) => member.uid === uid)?.displayName ?? "Former member";

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

    const handleResolve = async (report: Report) => {
        setError("");
        setResolvingId(report.id);
        try {
            await updateDoc(doc(db, "organizations", orgId, "reports", report.id), {
                status: "resolved",
                resolvedBy: user.uid,
                resolvedAt: serverTimestamp(),
            });
            setReports((current) => current.filter((r) => r.id !== report.id));
        } catch {
            setError("Could not resolve this report, please try again later");
        } finally {
            setResolvingId(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!isAdmin) {
        return (
            <Screen centered>
                <Stack.Screen options={{ title: "Members" }} />
                <StatusMessage type="error" message={error || "Only admins can manage members."} />
            </Screen>
        );
    }

    return (
        <Screen scroll={false}>
            <Stack.Screen options={{ title: "Manage members" }} />

            <View style={styles.tabs} accessibilityRole="tablist">
                <Pressable
                    onPress={() => setTab("members")}
                    style={[styles.tab, tab === "members" && styles.tabActive]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === "members" }}
                >
                    <Text style={[styles.tabText, tab === "members" && styles.tabTextActive]}>
                        Members ({members.length})
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setTab("reports")}
                    style={[styles.tab, tab === "reports" && styles.tabActive]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === "reports" }}
                >
                    <Text style={[styles.tabText, tab === "reports" && styles.tabTextActive]}>
                        Reports ({reports.length})
                    </Text>
                </Pressable>
            </View>

            <StatusMessage type="error" message={error} />

            {tab === "members" ? (
                <FlatList
                    data={members}
                    keyExtractor={(item) => item.uid}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                        const isMe = item.uid === user.uid;
                        return (
                            <View style={styles.row}>
                                <Link
                                    href={{
                                        pathname: "/organization/[orgId]/member/[uid]",
                                        params: { orgId, uid: item.uid },
                                    }}
                                    asChild
                                >
                                    <Pressable style={styles.rowMain} accessibilityRole="link">
                                        <Avatar name={item.displayName} size={40} />
                                        <View style={styles.rowText}>
                                            <Text style={styles.name}>
                                                {item.displayName}
                                                {isMe ? " (you)" : ""}
                                            </Text>
                                            <Text style={styles.details}>
                                                {item.role === "admin" ? "Admin" : "Member"}
                                                {item.joinedAt
                                                    ? ` · Joined ${item.joinedAt.toDate().toLocaleDateString()}`
                                                    : ""}
                                            </Text>
                                        </View>
                                    </Pressable>
                                </Link>

                                {!isMe && (
                                    <Button
                                        title="Remove"
                                        variant="danger"
                                        size="sm"
                                        onPress={() => handleRemove(item)}
                                        loading={removingUid === item.uid}
                                        disabled={removingUid !== null}
                                        accessibilityLabel={`Remove ${item.displayName}`}
                                    />
                                )}
                            </View>
                        );
                    }}
                />
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No open reports. Nice!</Text>}
                    renderItem={({ item }) => (
                        <Card>
                            <View style={styles.reportHeader}>
                                <Text style={styles.name}>{nameFor(item.reportedId)}</Text>
                                <Text style={styles.reasonBadge}>{item.reason}</Text>
                            </View>
                            {!!item.details && <Text style={styles.reportDetails}>{item.details}</Text>}
                            <Text style={styles.details}>
                                Reported by {nameFor(item.reporterId)}
                                {item.createdAt ? ` · ${item.createdAt.toDate().toLocaleDateString()}` : ""}
                            </Text>
                            <Button
                                title="Mark resolved"
                                variant="outline"
                                size="sm"
                                onPress={() => handleResolve(item)}
                                loading={resolvingId === item.id}
                                disabled={resolvingId !== null}
                                style={styles.resolveButton}
                            />
                        </Card>
                    )}
                />
            )}
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
    tabs: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: radius.md,
        padding: spacing.xs,
        ...shadow,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: "center",
        borderRadius: radius.sm,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: fontSize.md,
        fontWeight: "600",
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.textOnPrimary,
    },
    list: {
        gap: spacing.md,
        paddingBottom: spacing.lg,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.md,
        ...shadow,
    },
    rowMain: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    rowText: {
        flex: 1,
    },
    name: {
        fontSize: fontSize.lg,
        fontWeight: "700",
        color: colors.text,
    },
    details: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        marginTop: 2,
    },
    reportHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    reasonBadge: {
        fontSize: fontSize.sm,
        fontWeight: "600",
        color: colors.danger,
        backgroundColor: colors.dangerLight,
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        overflow: "hidden",
    },
    reportDetails: {
        fontSize: fontSize.md,
        color: colors.text,
    },
    resolveButton: {
        alignSelf: "flex-start",
    },
    empty: {
        textAlign: "center",
        fontSize: fontSize.md,
        color: colors.textMuted,
        marginTop: spacing.xxl,
    },
});
