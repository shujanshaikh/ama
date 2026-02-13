import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  profilePictureUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.auth) {
      setIsLoading(false);
      return;
    }

    // Get initial user (auto-refreshes expired tokens)
    api.auth.getUser().then((u: User | null) => {
      setUser(u);
      setIsLoading(false);
    });

    // Subscribe to auth state changes pushed from main process
    const cleanup = api.auth.onAuthChange(({ user: u }: { user: User | null }) => {
      setUser(u);
      setIsLoading(false);
    });

    return cleanup;
  }, []);

  const signIn = useCallback(async () => {
    if (!window.electronAPI?.auth) {
      throw new Error("Desktop API not available. Try restarting the app.");
    }
    await window.electronAPI.auth.signIn();
  }, []);

  const signOut = useCallback(async () => {
    if (window.electronAPI?.auth) {
      await window.electronAPI.auth.signOut();
    }
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    signIn,
    signOut,
  };
}
