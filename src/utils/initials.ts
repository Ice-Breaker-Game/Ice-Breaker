// "Jane Doe" -> "JD". Shown in place of a profile picture.
export function getInitials(name: string) {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");
    return initials || "?";
}
