// src/providers/AnalyticsProvider.tsx
// Automatic screen tracking and user identification for GA4

import React, { useEffect, useRef } from "react";
import { usePathname, useSegments } from "expo-router";
import { useAuth } from "./AuthProvider";
import { analyticsService } from "../services/analyticsService";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segments = useSegments();
  const { user, profile } = useAuth();
  const previousPathRef = useRef<string | null>(null);

  // Automatic screen tracking on navigation
  useEffect(() => {
    if (pathname && pathname !== previousPathRef.current) {
      previousPathRef.current = pathname;

      // Build a readable screen name from segments
      // e.g. ["(tabs)", "chat", "[id]"] → "tabs/chat/[id]"
      const screenName = segments
        .map((s) => s.replace(/^\(|\)$/g, "")) // strip parens from groups
        .join("/") || "home";

      analyticsService.logScreenView(screenName);
    }
  }, [pathname, segments]);

  // User identification when auth state changes
  useEffect(() => {
    if (user?.id) {
      analyticsService.setUserProperties(
        user.id,
        profile?.college?.name,
        profile?.is_admin
      );
    } else {
      analyticsService.clearUserProperties();
    }
  }, [user?.id, profile?.college?.name, profile?.is_admin]);

  return <>{children}</>;
}
