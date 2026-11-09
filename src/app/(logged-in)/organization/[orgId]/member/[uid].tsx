import { Stack, useLocalSearchParams } from "expo-router";
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteField,
    doc,
    getDoc,
    serverTimestamp,
    type Timestamp,
    updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { confirmAction } from "@/utils/confirm";
import { getInitials } from "@/utils/initials";

const REPORT_REASONS = ["Harassment or bullying", "Hate speech", "Inappropriate content", "Spam", "Other"];
const DETAILS_MAX_LENGTH = 500;

type Member = {
    displayName: string;
    role: string;
    joinedAt: Timestamp | null;
};

// Another member's profile inside an organization, with Block and Report (#35).
// The post-game screen (Epic 4) can link here too: /organization/{orgId}/member/{uid}
export default function MemberProfile() {
    const { orgId, uid } = useLocalSearchParams<{ orgId: string; uid: string }>();
    const { user } = useAuth();
    const [member, setMember] = useState<Member | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [savingBlock, setSavingBlock] = useState(false);
    const [reportFormOpen, setReportFormOpen] = useState(false);
    const [reason, setReason] = useState<string | null>(null);
    const [details, setDetails] = useState("");
    const [submittingReport, setSubmittingReport] = useState(false);

    const isMe = uid === user.uid;

    useEffect(() => {
        const loadMember = async () => {
            try {
                const memberSnapshot = await getDoc(doc(db, "organizations", orgId, "members", uid));
                if (!memberSnapshot.exists()) {
                    setError("This person isn't a member of this organization");
                    return;
                }
                const data = memberSnapshot.data();
                setMember({
                    displayName: data.displayName || "Unnamed user",
                    role: data.role,
                    joinedAt: data.joinedAt ?? null,
                });

                const mySnapshot = await getDoc(doc(db, "users", user.uid));
                const blockedIds: string[] = mySnapshot.data()?.blockedUserIds ?? [];
                setIsBlocked(blockedIds.includes(uid));
            } catch {
                setError("Could not load this profile, please try again later");
            } finally {
                setLoading(false);
            }
        };

        void loadMember();
    }, [orgId, uid, user]);

    const handleBlock = async () => {
        if (!member) {
            return;
        }
        const confirmed = await confirmAction(
            `Block ${member.displayName}?`,
            "You won't be matched with them in games. You can unblock them anytime from your Profile.",
            "Block"
        );
        if (!confirmed) {
            return;
        }

        setError("");
        setMessage("");
        setSavingBlock(true);
        try {
            // The name is saved too, so your Profile can list who you've blocked
            // (other users' docs are private, so it can't look them up later).
            await updateDoc(doc(db, "users", user.uid), {
                blockedUserIds: arrayUnion(uid),
                [`blockedUserNames.${uid}`]: member.displayName,
            });
            setIsBlocked(true);
            setMessage(`${member.displayName} is blocked`);
        } catch {
            setError("Could not block this person, please try again later");
        } finally {
            setSavingBlock(false);
        }
    };

    const handleUnblock = async () => {
        if (!member) {
            return;
        }
        setError("");
        setMessage("");
        setSavingBlock(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                blockedUserIds: arrayRemove(uid),
                [`blockedUserNames.${uid}`]: deleteField(),
            });
            setIsBlocked(false);
            setMessage(`${member.displayName} is unblocked`);
        } catch {
            setError("Could not unblock this person, please try again later");
        } finally {
            setSavingBlock(false);
        }
    };

    const closeReportForm = () => {
        setReportFormOpen(false);
        setReason(null);
        setDetails("");
    };

    const handleSubmitReport = async () => {
        if (!reason) {
            setError("Please choose a reason");
            return;
        }

        setError("");
        setMessage("");
        setSubmittingReport(true);
        try {
            // Reports live inside the organization, so only its admins can read them.
            await addDoc(collection(db, "organizations", orgId, "reports"), {
                reporterId: user.uid,
                reportedId: uid,
                reason,
                details: details.trim(),
                status: "open",
                createdAt: serverTimestamp(),
            });
            closeReportForm();
            setMessage("Thanks. Your report was sent to this organization's admins.");
        } catch {
            setError("Could not send your report, please try again later");
        } finally {
            setSubmittingReport(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!member) {
        return (
            <View style={styles.centered}>
                <Stack.Screen options={{ title: "Profile" }} />
                <Text style={styles.error}>{error}</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Stack.Screen options={{ title: member.displayName }} />

            <View style={styles.avatar}>
                <Text style={styles.initials}>{getInitials(member.displayName)}</Text>
            </View>
            <Text style={styles.name}>{member.displayName}</Text>
            <Text style={styles.details}>
                {member.role === "admin" ? "Admin" : "Member"}
                {member.joinedAt ? ` · Joined ${member.joinedAt.toDate().toLocaleDateString()}` : ""}
            </Text>

            {isMe ? (
                <Text style={styles.details}>This is you.</Text>
            ) : (
                <View style={styles.actions}>
                    <Pressable
                        onPress={isBlocked ? handleUnblock : handleBlock}
                        disabled={savingBlock}
                        style={styles.outlineButton}
                        accessibilityRole="button"
                    >
                        {savingBlock ? (
                            <ActivityIndicator color="#FF0000" size="small" />
                        ) : (
                            <Text style={styles.dangerText}>{isBlocked ? "Unblock" : "Block"}</Text>
                        )}
                    </Pressable>

                    {!reportFormOpen && (
                        <Pressable
                            onPress={() => setReportFormOpen(true)}
                            style={styles.outlineButton}
                            accessibilityRole="button"
                        >
                            <Text style={styles.dangerText}>Report</Text>
                        </Pressable>
                    )}
                </View>
            )}

            {reportFormOpen && (
                <View style={styles.reportForm}>
                    <Text style={styles.formTitle}>Report {member.displayName}</Text>
                    <Text style={styles.label}>Reason</Text>
                    <View style={styles.reasons}>
                        {REPORT_REASONS.map((option) => {
                            const selected = option === reason;
                            return (
                                <Pressable
                                    key={option}
                                    onPress={() => setReason(option)}
                                    style={selected ? styles.reasonSelected : styles.reason}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: selected }}
                                >
                                    <Text style={selected ? styles.reasonTextSelected : styles.reasonText}>
                                        {option}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Text style={styles.label}>Details (optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={details}
                        onChangeText={setDetails}
                        placeholder="What happened?"
                        multiline
                        maxLength={DETAILS_MAX_LENGTH}
                    />
                    <Text style={styles.counter}>
                        {details.length}/{DETAILS_MAX_LENGTH}
                    </Text>

                    <View style={styles.formButtons}>
                        <Pressable
                            onPress={closeReportForm}
                            disabled={submittingReport}
                            style={[styles.formButton, styles.cancelButton]}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSubmitReport}
                            disabled={submittingReport}
                            style={[styles.formButton, styles.submitButton]}
                        >
                            {submittingReport ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.submitText}>Send report</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!message && <Text style={styles.message}>{message}</Text>}
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
        gap: 12,
        width: "100%",
        maxWidth: 480,
        alignSelf: "center",
        alignItems: "center",
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#007BFF",
        justifyContent: "center",
        alignItems: "center",
    },
    initials: {
        color: "#fff",
        fontSize: 40,
        fontWeight: "bold",
    },
    name: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#111111",
    },
    details: {
        fontSize: 14,
        color: "#666666",
    },
    actions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
    },
    outlineButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderColor: "#FF0000",
        borderRadius: 8,
        minWidth: 110,
        alignItems: "center",
    },
    dangerText: {
        color: "#FF0000",
        fontSize: 15,
    },
    reportForm: {
        alignSelf: "stretch",
        gap: 8,
        marginTop: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#111111",
    },
    label: {
        fontSize: 14,
        color: "#666666",
        marginTop: 4,
    },
    reasons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    reason: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 16,
    },
    reasonSelected: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#007BFF",
        borderRadius: 16,
        backgroundColor: "#007BFF",
    },
    reasonText: {
        color: "#111111",
        fontSize: 14,
    },
    reasonTextSelected: {
        color: "#fff",
        fontSize: 14,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        minHeight: 90,
        textAlignVertical: "top",
    },
    counter: {
        fontSize: 12,
        color: "#666666",
        textAlign: "right",
    },
    formButtons: {
        flexDirection: "row",
        gap: 12,
    },
    formButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: "#007BFF",
    },
    cancelText: {
        color: "#007BFF",
        fontSize: 15,
    },
    submitButton: {
        backgroundColor: "#FF0000",
    },
    submitText: {
        color: "#fff",
        fontSize: 15,
    },
    error: {
        color: "#FF0000",
    },
    message: {
        color: "#333333",
        textAlign: "center",
    },
});
