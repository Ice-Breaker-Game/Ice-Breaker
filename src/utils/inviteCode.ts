import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

// Uppercase letters and numbers, without O, 0, I and 1 because they're easy to mix up.
const CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 5;

export function generateInviteCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
        const index = Math.floor(Math.random() * CHARACTERS.length);
        code += CHARACTERS[index];
    }
    return code;
}

// Keeps generating codes until it finds one that isn't in inviteCodes yet.
export async function generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const code = generateInviteCode();
        const snapshot = await getDoc(doc(db, "inviteCodes", code));
        if (!snapshot.exists()) {
            return code;
        }
    }
    throw new Error("Could not find an unused invite code");
}