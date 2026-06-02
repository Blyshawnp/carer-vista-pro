const APP_URL_ENV = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;

export function getConfiguredAppOrigin() {
  return normalizeOrigin(APP_URL_ENV);
}

export function getRequestAppOrigin(request: Request) {
  return getConfiguredAppOrigin() ?? normalizeOrigin(request.headers.get("origin")) ?? new URL(request.url).origin;
}

export function buildAppUrl(path: string, request: Request) {
  return `${getRequestAppOrigin(request)}${normalizePath(path)}`;
}

export function buildAppUrlFromOrigin(path: string, fallbackOrigin?: string | null) {
  const origin = getConfiguredAppOrigin() ?? normalizeOrigin(fallbackOrigin);
  if (!origin) {
    throw new Error("App URL is not configured.");
  }

  return `${origin}${normalizePath(path)}`;
}

export function getBrowserAppOrigin() {
  return getConfiguredAppOrigin() ?? window.location.origin;
}

export function buildBrowserAppUrl(path: string) {
  return `${getBrowserAppOrigin()}${normalizePath(path)}`;
}

function normalizeOrigin(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}
