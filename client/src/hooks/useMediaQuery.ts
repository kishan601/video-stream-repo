import { useEffect, useState } from "react";

/**
 * Hook to detect responsive breakpoints
 * Returns true if the media query matches the current viewport
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * Hook to detect if device is mobile
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}

/**
 * Hook to detect if device is tablet
 */
export function useIsTablet(): boolean {
  return useMediaQuery("(max-width: 1024px)");
}
