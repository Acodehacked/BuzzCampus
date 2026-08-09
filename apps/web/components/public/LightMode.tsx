"use client";

import { useEffect } from "react";

/**
 * Adds `html.light` while a public page is mounted and removes it on the
 * way out, so navigating from the landing page into the app shell lands in
 * dark mode without a flash of the wrong palette.
 */
export function LightMode() {
  useEffect(() => {
    document.documentElement.classList.add("light");
    return () => document.documentElement.classList.remove("light");
  }, []);

  return null;
}
