import { router, Stack } from "expo-router";
import { FirebaseError } from "firebase/app";
import { collection, doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, Card, Screen, StatusMessage, TextField } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { db } from "@/firebase";
import { colors, fontSize } from "@/theme";
import { generateUniqueInviteCode } from "@/utils/inviteCode";

export default function CreateOrganization() {
    const { user } = useAuth();
    const { setActiveOrgId } = useOrg();
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Please enter an organization name");
            return;
        }
        if (!user) {
            setError("You need to be logged in to create an organization");
            return;
        }

        setError("");
        setSubmitting(true);

        try {
            // Members store a copy of the display name, which is saved in users/{uid} at signup.
            const userSnapshot = await getDoc(doc(db, "users", user.uid));
            const displayName = userSnapshot.data()?.displayName ?? "";

            // Pick a code that no other organization is using.
            const inviteCode = await generateUniqueInviteCode();

            // Gets a new auto-generated ID before anything is saved, so the other docs can use it.
            const orgRef = doc(collection(db, "organizations"));
            const memberRef = doc(db, "organizations", orgRef.id, "members", user.uid);
            const privateInviteRef = doc(db, "organizations", orgRef.id, "private", "invite");
            const inviteCodeRef = doc(db, "inviteCodes", inviteCode);

            // All four writes are saved together, or none are.
            const batch = writeBatch(db);
            batch.set(orgRef, {
                name: trimmedName,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
            });
            batch.set(memberRef, {
                uid: user.uid,
                role: "admin",
                displayName,
                joinedAt: serverTimestamp(),
            });
            batch.set(privateInviteRef, { code: inviteCode });
            batch.set(inviteCodeRef, { orgId: orgRef.id, createdAt: serverTimestamp() });
            await batch.commit();
            await setActiveOrgId(orgRef.id);


            router.replace({ pathname: "/organization/[orgId]", params: { orgId: orgRef.id } });
        } catch (err) {
            if (err instanceof FirebaseError && err.code === "permission-denied") {
                setError("You don't have permission to create an organization");
            } else {
                setError("Sorry, something went wrong, please try again later");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Screen>
            <Stack.Screen options={{ title: "Create organization" }} />
            <Card>
                <Text style={styles.title} accessibilityRole="header">
                    Start a new organization
                </Text>
                <Text style={styles.subtitle}>You&apos;ll be its admin and get an invite code to share.</Text>
                <TextField
                    label="Organization name"
                    placeholder="e.g. Downtown Library Book Club"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    maxLength={50}
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                />
                <StatusMessage type="error" message={error} />
                <Button title="Create" onPress={handleCreate} loading={submitting} />
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
});
