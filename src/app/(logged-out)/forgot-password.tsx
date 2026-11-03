import { Link } from "expo-router";
import { FirebaseError } from "firebase/app";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
    <View style={styles.container}>
      <Text style={styles.header}>
        Reset Password
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!message && <Text style={styles.success}>{message}</Text>}
      <Pressable onPress={handleReset}
        style={styles.button}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color='#fff' size="small" />
        ) : (
          <Text style={styles.buttonText}>Send Reset Link</Text>
        )}
      </Pressable>
      <Text style={styles.haveAccount}>
        {"Have an account? "}
        <Link href="/login" style={styles.link}>
          Log in
        </Link>
      </Text>
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

  success: {
    color: "#4BB543"
  }

});
