"use client";

import { useEffect } from "react";

export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
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
  }, [slug]);

  // This component renders nothing
  return null;
}
