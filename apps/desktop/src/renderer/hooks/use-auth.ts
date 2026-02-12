import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
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

    // Get initial session
    api.auth.getSession().then((session: AuthSession | null) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const cleanup = api.auth.onAuthStateChange(
      (_event: any, session: AuthSession | null) => {
        setUser(session?.user ?? null);
      },
    );

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
