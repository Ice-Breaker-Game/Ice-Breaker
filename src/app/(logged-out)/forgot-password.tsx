import { Link } from "expo-router";
import { FirebaseError } from "firebase/app";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { AuthHeader, Button, Card, Screen, StatusMessage, TextField } from "@/components";
import { colors, fontSize, spacing } from "@/theme";
import { auth } from "../../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPassword() {

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleReset = async () => {

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!(/^[^\s]+@[^\s]+\.[^\s]+$/.test(email.trim()))) {
      setError("Please enter a valid email");
      return;
    }
    setSubmitting(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("If an account exists for that email, a reset link has been sent.");
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/too-many-requests":
            setError("Too many attempts, please try again later");
            break;
          case "auth/network-request-failed":
            setError("Network error, please try again");
            break;
          case "auth/user-not-found":
            setMessage("If an account exists for that email, a reset link has been sent.");
            break;
          default:
            setError("Sorry, something went wrong, please try again later");
            break;
        }
      } else {
        setError("Sorry, something went wrong, please try again later");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen centered safeArea>
      <AuthHeader title="Reset password" subtitle="We'll email you a link to choose a new one." />
      <Card>
        <TextField
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={handleReset}
        />
        <StatusMessage type="error" message={error} />
        <StatusMessage type="success" message={message} />
        <Button title="Send reset link" onPress={handleReset} loading={submitting} />
      </Card>
      <Text style={styles.footer}>
        {"Remembered it? "}
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
  secondaryLink: {
    color: colors.primary,
    fontSize: fontSize.md,
    textAlign: "center",
  },
});
