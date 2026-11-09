import { router } from "expo-router";
import { FirebaseError } from "firebase/app";
import { collection, doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { generateInviteCode } from "@/utils/inviteCode";

export default function CreateOrganization() {
    const { user } = useAuth();
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

            // Gets a new auto-generated ID before anything is saved, so the member doc can use it.
            const orgRef = doc(collection(db, "organizations"));
            const memberRef = doc(db, "organizations", orgRef.id, "members", user.uid);

            // Both writes are saved together, or neither is.
            const batch = writeBatch(db);
            batch.set(orgRef, {
                name: trimmedName,
                createdBy: user.uid,
                inviteCode: generateInviteCode(),
                createdAt: serverTimestamp(),
            });
            batch.set(memberRef, {
                uid: user.uid,
                role: "admin",
                displayName,
                joinedAt: serverTimestamp(),
            });
            await batch.commit();

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
        <View style={styles.container}>
            <Text style={styles.header}>Create Organization</Text>
            <TextInput
                style={styles.input}
                placeholder="Organization name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                maxLength={50}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable onPress={handleCreate} style={styles.button} disabled={submitting}>
                {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.buttonText}>Create</Text>
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
