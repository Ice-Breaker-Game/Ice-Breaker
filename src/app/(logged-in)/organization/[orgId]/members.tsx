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
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
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
            <Stack.Screen options={{ title: "Manage members" }} />

            <View style={styles.tabs} accessibilityRole="tablist">
                <Pressable
                    onPress={() => setTab("members")}
                    style={tab === "members" ? styles.tabActive : styles.tab}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === "members" }}
                >
                    <Text style={tab === "members" ? styles.tabTextActive : styles.tabText}>
                        Members ({members.length})
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setTab("reports")}
                    style={tab === "reports" ? styles.tabActive : styles.tab}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === "reports" }}
                >
                    <Text style={tab === "reports" ? styles.tabTextActive : styles.tabText}>
                        Reports ({reports.length})
                    </Text>
                </Pressable>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

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
                                    <Pressable style={styles.rowText} accessibilityRole="link">
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
                                    </Pressable>
                                </Link>

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
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No open reports.</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.reportCard}>
                            <Text style={styles.name}>{nameFor(item.reportedId)}</Text>
                            <Text style={styles.reportReason}>{item.reason}</Text>
                            {!!item.details && <Text style={styles.reportDetails}>{item.details}</Text>}
                            <Text style={styles.details}>
                                Reported by {nameFor(item.reporterId)}
                                {item.createdAt ? ` · ${item.createdAt.toDate().toLocaleDateString()}` : ""}
                            </Text>
                            <Pressable
                                onPress={() => handleResolve(item)}
                                disabled={resolvingId !== null}
                                style={styles.resolveButton}
                                accessibilityRole="button"
                            >
                                {resolvingId === item.id ? (
                                    <ActivityIndicator color="#007BFF" size="small" />
                                ) : (
                                    <Text style={styles.resolveText}>Mark resolved</Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                />
            )}
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
    tabs: {
        flexDirection: "row",
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "#007BFF",
    },
    tabText: {
        fontSize: 15,
        color: "#666666",
    },
    tabTextActive: {
        fontSize: 15,
        color: "#007BFF",
        fontWeight: "bold",
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
    reportCard: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        gap: 4,
    },
    reportReason: {
        fontSize: 15,
        color: "#FF0000",
    },
    reportDetails: {
        fontSize: 15,
        color: "#111111",
    },
    resolveButton: {
        alignSelf: "flex-start",
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#007BFF",
        borderRadius: 8,
        minWidth: 130,
        alignItems: "center",
    },
    resolveText: {
        color: "#007BFF",
        fontSize: 15,
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
