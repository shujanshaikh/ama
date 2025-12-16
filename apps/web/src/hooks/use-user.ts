import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type AuthUser } from "@/lib/auth";

interface UseUserOptions {
    /**
     * If true, redirects to sign-in when user is not authenticated
     * @default true
     */
    redirectToSignIn?: boolean;
    /**
     * Custom redirect path when not authenticated
     */
    redirectPath?: string;
}

/**
 * Hook to get the current user and optionally redirect if not authenticated.
 * Use this in protected routes to ensure the user is logged in.
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const user = useUser();
 *   
 *   if (!user) {
 *     return <div>Redirecting to sign in...</div>;
 *   }
 *   
 *   return <div>Welcome, {user.firstName}!</div>;
 * }
 * ```
 */
export function useUser(options: UseUserOptions = {}): AuthUser | null {
    const { redirectToSignIn = true, redirectPath } = options;
    const { user, isLoading, isAuthenticated, signIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            if (redirectToSignIn) {
                if (redirectPath) {
                    navigate({ to: redirectPath });
                } else {
                    // Use signIn to redirect to WorkOS AuthKit
                    signIn();
                }
            }
        }
    }, [isLoading, isAuthenticated, redirectToSignIn, redirectPath, navigate, signIn]);

    return user;
}

/**
 * Hook to check if the user is authenticated without redirecting.
 * Useful for conditional rendering based on auth state.
 * 
 * @example
 * ```tsx
 * function NavBar() {
 *   const { isAuthenticated, isLoading } = useAuthStatus();
 *   
 *   return (
 *     <nav>
 *       {isLoading ? (
 *         <span>Loading...</span>
 *       ) : isAuthenticated ? (
 *         <button onClick={signOut}>Sign out</button>
 *       ) : (
 *         <button onClick={signIn}>Sign in</button>
 *       )}
 *     </nav>
 *   );
 * }
 * ```
 */
export function useAuthStatus() {
    const { user, isLoading, isAuthenticated, signIn, signUp, signOut } = useAuth();

    return {
        user,
        isLoading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
    };
}
