
const STATE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  codeVerifier: string;
  expiresAt: number;
}

const desktopPkceCache = new Map<string, CacheEntry>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of desktopPkceCache) {
    if (entry.expiresAt < now) desktopPkceCache.delete(key);
  }
}

export function setDesktopPkceVerifier(state: string, codeVerifier: string): void {
  pruneExpired();
  desktopPkceCache.set(state, {
    codeVerifier,
    expiresAt: Date.now() + STATE_TTL_MS,
  });
}

export function getDesktopPkceVerifier(state: string): string | null {
  const entry = desktopPkceCache.get(state);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    desktopPkceCache.delete(state);
    return null;
  }
  desktopPkceCache.delete(state); // One-time use
  return entry.codeVerifier;
}

export interface DesktopState {
  desktop: boolean;
  callbackPort: number;
  nonce: string;
  createdAt: number;
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export function parseAndValidateDesktopState(stateB64: string): DesktopState | null {
  try {
    const json = atob(stateB64);
    const parsed = JSON.parse(json) as DesktopState;
    if (
      parsed?.desktop !== true ||
      typeof parsed.callbackPort !== 'number' ||
      !parsed.nonce ||
      typeof parsed.createdAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - parsed.createdAt > STATE_MAX_AGE_MS) {
      return null; // Expired
    }
    return parsed;
  } catch {
    return null;
  }
}
