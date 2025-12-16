import {
    createContext,
    useContext,
    useCallback,
    type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";

// Types
export interface AuthUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    emailVerified: boolean;
    profilePictureUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signUp: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const trpc = useTRPC();

    // Query for current user
    const {
        data: authData,
        isLoading,
        refetch,
    } = useQuery(trpc.auth.getUser.queryOptions());

    // Query for sign-in URL
    const { data: signInUrlData } = useQuery(
        trpc.auth.getSignInUrl.queryOptions()
    );

    // Query for sign-up URL
    const { data: signUpUrlData } = useQuery(
        trpc.auth.getSignUpUrl.queryOptions()
    );

    const signIn = useCallback(async () => {
        if (signInUrlData?.url) {
            window.location.href = signInUrlData.url;
        }
    }, [signInUrlData]);

    const signUp = useCallback(async () => {
        if (signUpUrlData?.url) {
            window.location.href = signUpUrlData.url;
        }
    }, [signUpUrlData]);

    const signOut = useCallback(async () => {
        // Navigate to the backend logout endpoint which handles WorkOS logout
        const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
        window.location.href = `${serverUrl}/api/v1/auth/logout`;
    }, []);

    const refreshUser = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const value: AuthContextType = {
        user: authData?.user ?? null,
        isLoading,
        isAuthenticated: authData?.isAuthenticated ?? false,
        signIn,
        signUp,
        signOut,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
