import { createFileRoute } from '@tanstack/react-router';
import { encryptSession, serializeCookie } from '../../../authkit/ssr/session';
import { getWorkOS } from '../../../authkit/ssr/workos';
import { getConfig } from '../../../authkit/ssr/config';
import { getDesktopPkceVerifier, parseAndValidateDesktopState } from '../../../authkit/ssr/desktop-auth';
import { decodeJwt } from 'jose';

export const Route = createFileRoute('/api/auth/desktop-exchange')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { code, state } = body;

          if (!code || !state) {
            return new Response(
              JSON.stringify({ error: 'Missing code or state' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const parsedState = parseAndValidateDesktopState(state);
          if (!parsedState) {
            return new Response(
              JSON.stringify({ error: 'Invalid or expired state' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const codeVerifier = getDesktopPkceVerifier(state);
          if (!codeVerifier) {
            return new Response(
              JSON.stringify({ error: 'Invalid or expired state - please try signing in again' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const { accessToken, refreshToken, user } =
            await getWorkOS().userManagement.authenticateWithCode({
              clientId: getConfig('clientId'),
              code,
              codeVerifier,
            });

          if (!accessToken || !refreshToken) {
            throw new Error('WorkOS response missing tokens');
          }

          const cookieName = getConfig('cookieName') || 'wos-session';
          const encryptedSession = await encryptSession({
            accessToken,
            refreshToken,
            user,
          });

          let expiresAt: number | undefined;
          try {
            const decoded = decodeJwt(accessToken);
            if (decoded.exp) expiresAt = decoded.exp * 1000;
          } catch {
            // ignore
          }

          return new Response(
            JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
              },
              accessToken,
              refreshToken,
              expiresAt,
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': serializeCookie(cookieName, encryptedSession),
              },
            },
          );
        } catch (error) {
          console.error('Desktop auth exchange failed:', error);
          return new Response(
            JSON.stringify({
              error: 'Authentication failed',
              message: error instanceof Error ? error.message : String(error),
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
