import { router, Stack } from "expo-router";
import { FirebaseError } from "firebase/app";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, Card, Screen, StatusMessage, TextField } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { db } from "@/firebase";
import { colors, fontSize } from "@/theme";

export default function JoinOrganization() {
    const { user } = useAuth();
    const { setActiveOrgId } = useOrg();
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleJoin = async () => {
        const trimmedCode = code.trim();
        if (trimmedCode.length !== 6) {
            setError("Invite codes are 6 characters long");
            return;
        }
        if (!user) {
            setError("You need to be logged in to join an organization");
            return;
        }

        setError("");
        setSubmitting(true);

        try {
            // The code is the document ID in inviteCodes, so one read finds its organization.
            const codeSnapshot = await getDoc(doc(db, "inviteCodes", trimmedCode));
            if (!codeSnapshot.exists()) {
                setError("Invalid invite code");
                return;
            }
            const orgId = codeSnapshot.data().orgId;

            const memberRef = doc(db, "organizations", orgId, "members", user.uid);
            const memberSnapshot = await getDoc(memberRef);
            if (memberSnapshot.exists()) {
                setError("You're already a member of this organization");
                return;
            }

            // Members store a copy of the display name, which is saved in users/{uid} at signup.
            const userSnapshot = await getDoc(doc(db, "users", user.uid));
            const displayName = userSnapshot.data()?.displayName ?? "";

            await setDoc(memberRef, {
                uid: user.uid,
                role: "member",
                displayName,
                // The security rules check that this code really belongs to the organization.
                inviteCode: trimmedCode,
                joinedAt: serverTimestamp(),
            });
            await setActiveOrgId(orgId);

            router.replace({ pathname: "/organization/[orgId]", params: { orgId } });
        } catch (err) {
            if (err instanceof FirebaseError && err.code === "permission-denied") {
                setError("You don't have permission to join this organization");
            } else {
                setError("Sorry, something went wrong, please try again later");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Screen>
            <Stack.Screen options={{ title: "Join organization" }} />
            <Card>
                <Text style={styles.title} accessibilityRole="header">
                    Join with a code
                </Text>
                <Text style={styles.subtitle}>Ask an admin of the organization for its 6-character invite code.</Text>
                <TextField
                    label="Invite code"
                    placeholder="ABC234"
                    value={code}
                    onChangeText={(text) => setCode(text.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    maxLength={6}
                    returnKeyType="go"
                    onSubmitEditing={handleJoin}
                    style={styles.codeInput}
                />
                <StatusMessage type="error" message={error} />
                <Button title="Join" onPress={handleJoin} loading={submitting} />
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: fontSize.xl,
        fontWeight: "700",
        color: colors.primaryDark,
    },
    subtitle: {
        fontSize: fontSize.md,
        color: colors.textMuted,
    },
    codeInput: {
        fontSize: fontSize.xl,
        fontWeight: "700",
        letterSpacing: 6,
        textAlign: "center",
    },
});
