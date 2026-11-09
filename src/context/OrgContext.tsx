import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

type OrgContextValue = {
    activeOrgId: string | null;
    setActiveOrgId: (orgId: string | null) => Promise<void>;
    loading: boolean;
};

const OrgContext = createContext<OrgContextValue | null>(null);

// Wraps the logged-in screens (see src/app/(logged-in)/_layout.tsx), because it needs the current user.
export function OrgProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // One saved choice per account, so switching accounts on the same device doesn't mix them up.
    const storageKey = `activeOrgId-${user.uid}`;

    // Load the saved choice when the user logs in.
    useEffect(() => {
        const loadSavedOrg = async () => {
            try {
                setActiveOrgIdState(await AsyncStorage.getItem(storageKey));
            } catch {
                // If storage can't be read, start with no active organization.
            } finally {
                setLoading(false);
            }
        };

        void loadSavedOrg();
    }, [storageKey]);

    const setActiveOrgId = async (orgId: string | null) => {
        setActiveOrgIdState(orgId);
        try {
            if (orgId) {
                await AsyncStorage.setItem(storageKey, orgId);
            } else {
                await AsyncStorage.removeItem(storageKey);
            }
        } catch {
            // If saving fails, the choice still works until the app is restarted.
        }
    };

    return (
        <OrgContext.Provider value={{ activeOrgId, setActiveOrgId, loading }}>
            {children}
        </OrgContext.Provider>
    );
}

export function useOrg() {
    const context = useContext(OrgContext);
    if (!context) {
        throw new Error("useOrg() must be used inside OrgProvider (only logged-in screens have it)");
    }
    return context;
}