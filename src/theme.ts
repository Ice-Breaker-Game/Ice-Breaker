// The app's shared look (#64): teal and icy, built from the colors the home screen already uses.
// Import from here instead of hardcoding colors, so a color only ever changes in one place.

export const colors = {
    primary: "#0e7490",
    primaryDark: "#155e75",
    primaryLight: "#e0f2f7", // selected rows, chips and tints
    background: "#f0f7fa",
    card: "#ffffff",
    border: "#cbd5e1",
    text: "#0f172a",
    textMuted: "#64748b",
    placeholder: "#94a3b8", // lighter than textMuted, so hints don't look like typed text
    textOnPrimary: "#ffffff",
    danger: "#dc2626",
    dangerLight: "#fee2e2",
    success: "#16a34a",
    successLight: "#dcfce7",
    overlay: "rgba(15, 23, 42, 0.45)", // dark tint over pictures while they upload
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
};

export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
};

export const fontSize = {
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    title: 28,
};

// Soft shadow for cards. boxShadow works on web, iOS and Android.
export const shadow = {
    boxShadow: "0px 2px 8px rgba(15, 23, 42, 0.08)",
};

// Content never gets wider than this, so screens still look right in a wide desktop browser.
export const maxContentWidth = 480;
