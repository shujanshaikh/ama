import { createFileRoute } from '@tanstack/react-router';
import { encryptSession, serializeCookie } from '../../../authkit/ssr/session';
import { getWorkOS } from '../../../authkit/ssr/workos';
import { getConfig } from '../../../authkit/ssr/config';

export const Route = createFileRoute('/api/auth/desktop')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { accessToken, refreshToken, user } = body;

          if (!accessToken || !refreshToken || !user) {
            return new Response(
              JSON.stringify({ error: 'Missing required fields' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          // Refresh the token to get a valid session — the CLI's access token
          // may be expired, but the refresh token should still be valid
          const result =
            await getWorkOS().userManagement.authenticateWithRefreshToken({
              clientId: getConfig('clientId'),
              refreshToken,
            });

          const cookieName = getConfig('cookieName') || 'wos-session';
          const encryptedSession = await encryptSession({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
          });

          return new Response(
            JSON.stringify({ success: true }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': serializeCookie(cookieName, encryptedSession),
              },
            },
          );
        } catch (error) {
          console.error('Desktop auth failed:', error);
          return new Response(
            JSON.stringify({ error: 'Authentication failed' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
