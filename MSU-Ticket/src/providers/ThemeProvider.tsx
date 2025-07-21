//themeprovider.tsx

import React, { createContext, useContext } from "react";
import { useAuth } from "./AuthProvider";

interface Theme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  border: string;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  const theme: Theme = {
    primary: profile?.college?.primary_color || "#18453b",
    secondary: profile?.college?.secondary_color || "#ffd700",
    background: "#f8fafc", // Light gray background
    surface: "#ffffff", // White surface for cards/inputs
    text: "#1f2937", // Dark gray text
    border: "#e5e7eb", // Light gray borders
  };

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
