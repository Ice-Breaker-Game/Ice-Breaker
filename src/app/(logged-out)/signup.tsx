import { StyleSheet, Text } from "react-native";
import { AuthHeader, Button, Card, Screen, StatusMessage, TextField } from "@/components";
import { colors, fontSize, spacing } from "@/theme";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { Link } from "expo-router";

export default function Signup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSignUp = async () => {
        if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
            setError("Fields missing, please fill in all fields to continue");
            return;
        }
        if (!(/^[^\s]+@[^\s]+\.[^\s]+$/.test(email.trim()))) {
            setError("Please enter a valid email");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setError("");
        setSubmitting(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const userRef = doc(db, "users", userCredential.user.uid);
            await setDoc(userRef, {
                displayName: displayName.trim(),
                email: email.trim(),
                photoURL: null,
                blockedUserIds: [],
                createdAt: serverTimestamp(),
            });
        } catch (err) {
            if (err instanceof FirebaseError) {
                switch (err.code) {
                    case "auth/email-already-in-use":
                        setError("This email is taken, please try another");
                        break;
                    case "auth/invalid-email":
                        setError("This email format is not accepted, try another email");
                        break;
                    case "auth/weak-password":
                        setError("Weak password, choose a stronger password");
                        break;
                    default:
                        setError("Sorry, something went wrong, please try again later");
                }
            } else {
                setError("Something went wrong, please try again later");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Screen centered safeArea>
            <AuthHeader title="Create account" subtitle="Join your group and start breaking the ice." />
            <Card>
                <TextField
                    label="Display name"
                    placeholder="What should people call you?"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                />
                <TextField
                    label="Email"
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                />
                <TextField
                    label="Password"
                    placeholder="At least 6 characters"
                    secureTextEntry={true}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                />
                <TextField
                    label="Confirm password"
                    placeholder="Type it again"
                    secureTextEntry={true}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    returnKeyType="go"
                    onSubmitEditing={handleSignUp}
                />
                <StatusMessage type="error" message={error} />
                <Button title="Sign up" onPress={handleSignUp} loading={submitting} />
            </Card>
            <Text style={styles.footer}>
                Already have an account?{" "}
                <Link href="/login" style={styles.link}>
                    Log in
                </Link>
            </Text>
        </Screen>
    );
}

const styles = StyleSheet.create({
    footer: {
        textAlign: "center",
        color: colors.textMuted,
        fontSize: fontSize.md,
        marginTop: spacing.sm,
    },
    link: {
        color: colors.primary,
        fontWeight: "700",
    },
});
