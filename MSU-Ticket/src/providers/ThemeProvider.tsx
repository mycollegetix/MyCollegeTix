import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthProvider';

interface Theme {
  primary: string;
  secondary: string;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  const theme = {
    primary: profile?.college?.primary_color || '#18453b',
    secondary: profile?.college?.secondary_color || '#ffd700',
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
