import { StyleSheet, Text, View, Pressable, TextInput, ActivityIndicator } from "react-native";
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
        <View style={styles.container}>
            <Text style={styles.header}>
                Create Account
            </Text>
            <TextInput
                style={styles.input}
                placeholder="Enter your display name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
            />
            <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
            />
            <TextInput
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoComplete="new-password"
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                secureTextEntry={true}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
            />
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable onPress={handleSignUp}
                style={styles.button}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color='#fff' size="small" />
                ) : (
                    <Text style={styles.buttonText}>Sign up</Text>
                )}
            </Pressable>
            <Text style={styles.haveAccount}>
                Already have an account?{" "}
                <Link href="/login" style={styles.login}>
                    Log in
                </Link>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({

    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111111',
        marginBottom: 12,
        textAlign: "center"
    },

    container: {
        flex: 1,
        justifyContent: "center",
        padding: 12,
    },

    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },

    button: {
        backgroundColor: '#007BFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
    },

    buttonText: {
        color: "#fff",
        fontSize: 15,
    },

    error: {
        color: "#FF0000",
    },

    haveAccount: {
        textAlign: "center",
        marginTop: 20,
    },

    login: {
        color: "#0000EE",
        fontWeight: "bold"
    },
});