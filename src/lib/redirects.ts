function toSameOriginPath(value: string | null | undefined): string | null {
  if (!value || typeof window === "undefined") {
    return null;
  }

  try {
    const resolvedUrl = new URL(value, window.location.origin);
    if (resolvedUrl.origin !== window.location.origin) {
      return null;
    }

    const path = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
    return path.startsWith("/") ? path : null;
  } catch {
    return null;
  }
}

export function getLocalNavigationTarget(
  url: string | null | undefined,
  fallback: string,
) {
  return (
    toSameOriginPath(url) ??
    toSameOriginPath(fallback) ??
    "/"
  );
}
