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
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Button, Card, Screen, StatusMessage, TextField } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { colors, fontSize, radius, spacing } from "@/theme";
import { confirmAction } from "@/utils/confirm";

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
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!member) {
        return (
            <Screen centered>
                <Stack.Screen options={{ title: "Profile" }} />
                <StatusMessage type="error" message={error} />
            </Screen>
        );
    }

    return (
        <Screen>
            <Stack.Screen options={{ title: member.displayName }} />

            <Card style={styles.profileCard}>
                <Avatar name={member.displayName} size={112} />
                <Text style={styles.name} accessibilityRole="header">
                    {member.displayName}
                </Text>
                <Text style={styles.details}>
                    {member.role === "admin" ? "Admin" : "Member"}
                    {member.joinedAt ? ` · Joined ${member.joinedAt.toDate().toLocaleDateString()}` : ""}
                </Text>

                {isMe ? (
                    <Text style={styles.details}>This is you.</Text>
                ) : (
                    <View style={styles.actions}>
                        <Button
                            title={isBlocked ? "Unblock" : "Block"}
                            variant="danger"
                            onPress={isBlocked ? handleUnblock : handleBlock}
                            loading={savingBlock}
                            style={styles.actionButton}
                        />
                        {!reportFormOpen && (
                            <Button
                                title="Report"
                                variant="danger"
                                onPress={() => setReportFormOpen(true)}
                                style={styles.actionButton}
                            />
                        )}
                    </View>
                )}
            </Card>

            {reportFormOpen && (
                <Card>
                    <Text style={styles.formTitle}>Report {member.displayName}</Text>
                    <Text style={styles.label}>Reason</Text>
                    <View style={styles.reasons} accessibilityRole="radiogroup">
                        {REPORT_REASONS.map((option) => {
                            const selected = option === reason;
                            return (
                                <Pressable
                                    key={option}
                                    onPress={() => setReason(option)}
                                    style={[styles.reason, selected && styles.reasonSelected]}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: selected }}
                                >
                                    <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                                        {option}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <TextField
                        label="Details (optional)"
                        value={details}
                        onChangeText={setDetails}
                        placeholder="What happened?"
                        multiline
                        maxLength={DETAILS_MAX_LENGTH}
                        style={styles.detailsInput}
                    />
                    <Text style={styles.counter}>
                        {details.length}/{DETAILS_MAX_LENGTH}
                    </Text>

                    <View style={styles.actions}>
                        <Button
                            title="Cancel"
                            variant="outline"
                            onPress={closeReportForm}
                            disabled={submittingReport}
                            style={styles.actionButton}
                        />
                        <Button
                            title="Send report"
                            onPress={handleSubmitReport}
                            loading={submittingReport}
                            style={styles.actionButton}
                        />
                    </View>
                </Card>
            )}

            <StatusMessage type="error" message={error} />
            <StatusMessage type="success" message={message} />
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
    name: {
        fontSize: fontSize.xl,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
    },
    details: {
        fontSize: fontSize.md,
        color: colors.textMuted,
        textAlign: "center",
    },
    actions: {
        flexDirection: "row",
        gap: spacing.md,
        alignSelf: "stretch",
    },
    actionButton: {
        flex: 1,
    },
    formTitle: {
        fontSize: fontSize.lg,
        fontWeight: "700",
        color: colors.text,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: "600",
        color: colors.textMuted,
    },
    reasons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    reason: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.pill,
        backgroundColor: colors.card,
    },
    reasonSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    reasonText: {
        fontSize: fontSize.sm,
        color: colors.text,
    },
    reasonTextSelected: {
        color: colors.textOnPrimary,
        fontWeight: "600",
    },
    detailsInput: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    counter: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        textAlign: "right",
    },
});
