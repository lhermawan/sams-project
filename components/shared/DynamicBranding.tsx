"use client";

import { useEffect } from "react";

export default function DynamicBranding() {
  useEffect(() => {
    const updateBranding = () => {
      fetch(`/api/settings?_t=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (!data) return;

          // 1. Update Browser Tab Favicon (Reset to /favicon.ico if company_logo is cleared)
          const targetFavicon = data.company_logo || "/favicon.ico";

          // Standard favicon
          let iconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!iconLink) {
            iconLink = document.createElement("link");
            iconLink.rel = "icon";
            document.head.appendChild(iconLink);
          }
          iconLink.href = targetFavicon;

          // Shortcut icon
          let shortcutLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
          if (!shortcutLink) {
            shortcutLink = document.createElement("link");
            shortcutLink.rel = "shortcut icon";
            document.head.appendChild(shortcutLink);
          }
          shortcutLink.href = targetFavicon;

          // Apple touch icon
          let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
          if (!appleIcon) {
            appleIcon = document.createElement("link");
            appleIcon.rel = "apple-touch-icon";
            document.head.appendChild(appleIcon);
          }
          appleIcon.href = targetFavicon;

          // 2. Update Browser Tab Title
          const appName = data.app_name || "SAMS";
          const companyName = data.company_name ? ` - ${data.company_name}` : "";
          document.title = `${appName}${companyName}`;
        })
        .catch(() => {});
    };

    updateBranding();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "branding-updated") {
        updateBranding();
      }
    };

    window.addEventListener("branding-updated", updateBranding);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("branding-updated", updateBranding);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
}
