"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export default function ViewTracker({ slug }: { slug: string }) {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    // Skip logging for internal views
    const shouldSkip = () => {
      // Skip if user is authenticated
      if (isSignedIn) return true;

      // Skip if localhost
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return true;

      // Skip if ?preview=true param
      const params = new URLSearchParams(window.location.search);
      if (params.get("preview") === "true") return true;

      return false;
    };

    if (shouldSkip()) return;

    // Log view on mount (only once)
    const logView = async () => {
      try {
        await fetch("/api/analytics/log-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            referrer: document.referrer || null,
          }),
        });
      } catch (error) {
        // Silently fail - don't break the page for analytics
        console.error("Failed to log view:", error);
      }
    };

    logView();
  }, [slug, isSignedIn]);

  // This component renders nothing
  return null;
}
