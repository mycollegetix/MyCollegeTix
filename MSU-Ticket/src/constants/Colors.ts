const msuGreen = "#18453B";
const msuWhite = "#FFFFFF";
const msuGray = "#535955";

export default {
  light: {
    text: "#000000",
    background: "#FFFFFF",
    tint: msuGreen,
    tabIconDefault: msuGray,
    tabIconSelected: msuGreen,
    primary: msuGreen,
    secondary: msuGray,
    accent: "#D3BC8D", // MSU Gold
    surface: "#F5F5F5",
    error: "#B71C1C",
    success: "#2E7D32",
    border: "#E0E0E0",
    card: "#FFFFFF",
  },
  dark: {
    text: "#FFFFFF",
    background: "#121212",
    tint: msuWhite,
    tabIconDefault: "#888888",
    tabIconSelected: msuWhite,
    primary: msuGreen,
    secondary: msuGray,
    accent: "#D3BC8D", // MSU Gold
    surface: "#1E1E1E",
    error: "#CF6679",
    success: "#81C784",
    border: "#2C2C2C",
    card: "#242424",
  },
} as const;
