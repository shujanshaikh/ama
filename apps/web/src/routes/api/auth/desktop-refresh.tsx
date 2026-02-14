import { createFileRoute } from '@tanstack/react-router';
import { encryptSession, serializeCookie } from '../../../authkit/ssr/session';
import { getWorkOS } from '../../../authkit/ssr/workos';
import { getConfig } from '../../../authkit/ssr/config';
import { decodeJwt } from 'jose';

export const Route = createFileRoute('/api/auth/desktop-refresh')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { refreshToken } = body;

          if (!refreshToken) {
            return new Response(
              JSON.stringify({ error: 'Missing refresh token' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

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

          let expiresAt: number | undefined;
          try {
            const decoded = decodeJwt(result.accessToken);
            if (decoded.exp) expiresAt = decoded.exp * 1000;
          } catch {
            // ignore
          }

          return new Response(
            JSON.stringify({
              success: true,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              user: {
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
              },
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
        } catch (error: any) {
          console.error('Desktop refresh failed:', error);

          // Forward 429 rate-limit to the client so it can back off
          if (error?.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded, try again later' }),
              {
                status: 429,
                headers: {
                  'Content-Type': 'application/json',
                  'Retry-After': '60',
                },
              },
            );
          }

          return new Response(
            JSON.stringify({ error: 'Token refresh failed' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
