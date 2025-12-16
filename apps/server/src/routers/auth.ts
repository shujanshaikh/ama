import { router, publicProcedure } from "./trpc";
import { workos, cookiePassword, clientId, frontendUrl } from "../lib/workos";
import type { AuthenticateWithSessionCookieSuccessResponse } from "@workos-inc/node";

// Type for the user object returned by WorkOS
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

export const authRouter = router({
    // Get the current authenticated user
    getUser: publicProcedure.query(async ({ ctx }) => {
        const sessionCookie = ctx.sessionCookie;

        if (!sessionCookie) {
            return { user: null, isAuthenticated: false };
        }

        try {
            const session = workos.userManagement.loadSealedSession({
                sessionData: sessionCookie,
                cookiePassword: cookiePassword,
            });

            const authResult = await session.authenticate();

            if (authResult.authenticated) {
                const { user } = authResult as AuthenticateWithSessionCookieSuccessResponse;
                return {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        emailVerified: user.emailVerified,
                        profilePictureUrl: user.profilePictureUrl,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    } as AuthUser,
                    isAuthenticated: true,
                };
            }

            // Try to refresh the session
            try {
                const refreshResult = await session.refresh();
                if (refreshResult.authenticated) {
                    // Session was refreshed, need to update cookie
                    // This will be handled by the response headers
                    const { user } = refreshResult as AuthenticateWithSessionCookieSuccessResponse;
                    return {
                        user: {
                            id: user.id,
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            emailVerified: user.emailVerified,
                            profilePictureUrl: user.profilePictureUrl,
                            createdAt: user.createdAt,
                            updatedAt: user.updatedAt,
                        } as AuthUser,
                        isAuthenticated: true,
                        newSession: refreshResult.sealedSession,
                    };
                }
            } catch {
                // Session refresh failed
            }

            return { user: null, isAuthenticated: false };
        } catch (error) {
            console.error("Error authenticating session:", error);
            return { user: null, isAuthenticated: false };
        }
    }),

    // Get sign-in URL
    getSignInUrl: publicProcedure.query(async () => {
        const authorizationUrl = workos.userManagement.getAuthorizationUrl({
            provider: "authkit",
            redirectUri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/callback`,
            clientId: clientId,
        });
        return { url: authorizationUrl };
    }),

    // Get sign-up URL
    getSignUpUrl: publicProcedure.query(async () => {
        const authorizationUrl = workos.userManagement.getAuthorizationUrl({
            provider: "authkit",
            redirectUri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/callback`,
            clientId: clientId,
            screenHint: "sign-up",
        });
        return { url: authorizationUrl };
    }),

    // Get logout URL
    getLogoutUrl: publicProcedure.query(async ({ ctx }) => {
        const sessionCookie = ctx.sessionCookie;

        if (!sessionCookie) {
            return { url: frontendUrl };
        }

        try {
            const session = workos.userManagement.loadSealedSession({
                sessionData: sessionCookie,
                cookiePassword: cookiePassword,
            });

            const logoutUrl = await session.getLogoutUrl();
            return { url: logoutUrl };
        } catch {
            return { url: frontendUrl };
        }
    }),
});

export type AuthRouter = typeof authRouter;
