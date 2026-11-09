// Uppercase letters and numbers, without O, 0, I and 1 because they're easy to mix up.
const CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export function generateInviteCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
        const index = Math.floor(Math.random() * CHARACTERS.length);
        code += CHARACTERS[index];
    }
    return code;
}
