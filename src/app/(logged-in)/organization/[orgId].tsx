import { Stack, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { db } from "@/firebase";

type Organization = {
    name: string;
    inviteCode: string;
};

// Placeholder organization page. The real one is built in #33.
export default function OrganizationPage() {
    const { orgId } = useLocalSearchParams<{ orgId: string }>();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadOrganization = async () => {
            try {
                const snapshot = await getDoc(doc(db, "organizations", orgId));
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setOrganization({ name: data.name, inviteCode: data.inviteCode });
                } else {
                    setError("Organization not found");
                }
            } catch {
                setError("Could not load this organization, please try again later");
            } finally {
                setLoading(false);
            }
        };

        void loadOrganization();
    }, [orgId]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!organization) {
        return (
            <View style={styles.container}>
                <Text style={styles.error}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: organization.name }} />
            <Text style={styles.header}>{organization.name}</Text>
            {/* #31 will show this to admins only */}
            <Text style={styles.label}>Invite code</Text>
            <Text style={styles.code}>{organization.inviteCode}</Text>

        </View>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 12,
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#111111",
        marginBottom: 24,
        textAlign: "center",
    },
    label: {
        fontSize: 14,
        color: "#666666",
    },
    code: {
        fontSize: 32,
        fontWeight: "bold",
        letterSpacing: 4,
    },
    error: {
        color: "#FF0000",
    },
});
