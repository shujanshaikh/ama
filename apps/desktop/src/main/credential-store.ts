import { safeStorage } from "electron";
import Store from "electron-store";

const STORE_KEY = "auth_encrypted";
const LEGACY_AUTH_KEY = "auth";

interface EncryptedBlob {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

const store = new Store<{ [STORE_KEY]: string | null; [LEGACY_AUTH_KEY]?: EncryptedBlob | null }>({
  defaults: { [STORE_KEY]: null },
});

const PREFIX_ENCRYPTED = "enc:";
const PREFIX_PLAIN = "plain:";

function encrypt(data: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return PREFIX_ENCRYPTED + Buffer.from(safeStorage.encryptString(data)).toString("base64");
  }
  return PREFIX_PLAIN + Buffer.from(data, "utf-8").toString("base64");
}

function decrypt(stored: string): string {
  const buf = Buffer.from(stored.slice(stored.startsWith(PREFIX_ENCRYPTED) ? PREFIX_ENCRYPTED.length : PREFIX_PLAIN.length), "base64");
  if (stored.startsWith(PREFIX_ENCRYPTED) && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(buf);
  }
  return buf.toString("utf-8");
}

export function setCredentials(data: EncryptedBlob): void {
  store.set(STORE_KEY, encrypt(JSON.stringify(data)));
}

function migrateLegacyAuth(): EncryptedBlob | null {
  const legacy = store.get(LEGACY_AUTH_KEY) as EncryptedBlob | undefined;
  if (legacy?.accessToken && legacy?.refreshToken && legacy?.user) {
    setCredentials(legacy);
    store.delete(LEGACY_AUTH_KEY);
    return legacy;
  }
  return null;
}

export function getCredentials(): EncryptedBlob | null {
  const raw = store.get(STORE_KEY);
  if (!raw) {
    return migrateLegacyAuth();
  }
  try {
    return JSON.parse(decrypt(raw)) as EncryptedBlob;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  store.delete(STORE_KEY);
}
