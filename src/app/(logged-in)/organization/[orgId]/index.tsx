import * as Clipboard from "expo-clipboard";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { collection, doc, getDoc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Avatar, Button, Card, Screen, StatusMessage } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { colors, fontSize, radius, spacing } from "@/theme";
import { generateUniqueInviteCode } from "@/utils/inviteCode";

type MemberSummary = {
    uid: string;
    displayName: string;
    role: string;
};

export default function OrganizationPage() {
    const { orgId } = useLocalSearchParams<{ orgId: string }>();
    const { user } = useAuth();
    const [name, setName] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const [members, setMembers] = useState<MemberSummary[]>([]);
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

                // Everyone in the organization can see who else is in it (#35).
                if (memberSnapshot.exists()) {
                    setIsMember(true);
                    const membersSnapshot = await getDocs(collection(db, "organizations", orgId, "members"));
                    const results = membersSnapshot.docs.map((memberDoc) => ({
                        uid: memberDoc.id,
                        displayName: memberDoc.data().displayName || "Unnamed user",
                        role: memberDoc.data().role,
                    }));
                    results.sort((a, b) => a.displayName.localeCompare(b.displayName));
                    setMembers(results);
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
            <View style={styles.centered}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <Screen centered>
                <StatusMessage type="error" message={error} />
            </Screen>
        );
    }

    return (
        <Screen>
            <Stack.Screen options={{ title: name }} />
            <Text style={styles.header} accessibilityRole="header">
                {name}
            </Text>

            {isAdmin && (
                <Card>
                    <Text style={styles.sectionTitle}>Invite people</Text>
                    <Pressable
                        onPress={handleCopy}
                        style={styles.codeBox}
                        accessibilityRole="button"
                        accessibilityLabel={`Copy invite code ${inviteCode}`}
                    >
                        <Text style={styles.code}>{inviteCode}</Text>
                        <Text style={styles.hint}>Tap to copy</Text>
                    </Pressable>

                    <Button title="Share" onPress={handleShare} />
                    <Button
                        title="Regenerate code"
                        variant="outline"
                        onPress={handleRegenerate}
                        loading={regenerating}
                    />
                    <Link href={{ pathname: "/organization/[orgId]/members", params: { orgId } }} asChild>
                        <Button title="Manage members" variant="outline" />
                    </Link>

                    <StatusMessage type="info" message={message} />
                </Card>
            )}

            {isMember && (
                <Card>
                    <Text style={styles.sectionTitle}>Members ({members.length})</Text>
                    {members.map((member) => (
                        <Link
                            key={member.uid}
                            href={{
                                pathname: "/organization/[orgId]/member/[uid]",
                                params: { orgId, uid: member.uid },
                            }}
                            asChild
                        >
                            <Pressable style={styles.memberRow} accessibilityRole="link">
                                <Avatar name={member.displayName} size={36} />
                                <Text style={styles.memberName}>
                                    {member.displayName}
                                    {member.uid === user.uid ? " (you)" : ""}
                                </Text>
                                <Text style={styles.memberRole}>{member.role === "admin" ? "Admin" : "Member"}</Text>
                            </Pressable>
                        </Link>
                    ))}
                </Card>
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
    header: {
        fontSize: fontSize.title,
        fontWeight: "700",
        color: colors.primaryDark,
        textAlign: "center",
        marginVertical: spacing.sm,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: "700",
        color: colors.text,
    },
    codeBox: {
        alignItems: "center",
        paddingVertical: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    code: {
        fontSize: 32,
        fontWeight: "700",
        letterSpacing: 6,
        color: colors.primaryDark,
    },
    hint: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
    },
    memberRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.sm,
    },
    memberName: {
        flex: 1,
        fontSize: fontSize.md,
        color: colors.text,
    },
    memberRole: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
    },
});
