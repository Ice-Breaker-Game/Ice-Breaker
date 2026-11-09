import { AuthHeader, Button, Card, Screen, StatusMessage, TextField } from "@/components";
import { colors, fontSize, spacing } from "@/theme";
import { Link } from "expo-router";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { auth } from "../../firebase";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Fields missing, please fill in all fields to continue");
      return;
    }
    if (!(/^[^\s]+@[^\s]+\.[^\s]+$/.test(email.trim()))) {
      setError("Please enter a valid email");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-credential":
            setError("Incorrect email or password, please try again");
            break;
          case "auth/too-many-requests":
            setError("Too many attempts, please try again later");
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
      <AuthHeader title="Welcome back" subtitle="Log in to find people to play with." />
      <Card>
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
          placeholder="Your password"
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />
        <StatusMessage type="error" message={error} />
        <Button title="Log in" onPress={handleLogin} loading={submitting} />
        <Link href="/forgot-password" style={styles.secondaryLink}>
          Forgot password?
        </Link>
      </Card>
      <Text style={styles.footer}>
        {"Don't have an account? "}
        <Link href="/signup" style={styles.link}>
          Sign up
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

  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 12,
    textAlign: "center"
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

  link: {
    color: "#0000EE",
    fontWeight: "bold"
  },

});
