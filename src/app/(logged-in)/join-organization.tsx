import { router } from "expo-router";
import { FirebaseError } from "firebase/app";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { db } from "@/firebase";

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
        <View style={styles.container}>
            <Text style={styles.header}>Join Organization</Text>
            <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="Invite code"
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={6}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable onPress={handleJoin} style={styles.button} disabled={submitting}>
                {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.buttonText}>Join</Text>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 12,
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#111111",
        marginBottom: 12,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    codeInput: {
        fontSize: 20,
        letterSpacing: 4,
        textAlign: "center",
    },
    button: {
        backgroundColor: "#007BFF",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 15,
    },
    error: {
        color: "#FF0000",
        marginBottom: 12,
    },
});
