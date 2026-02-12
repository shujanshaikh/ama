import { createFileRoute } from '@tanstack/react-router';
import { getConfig } from '../../../authkit/ssr/config';
import { getWorkOS } from '../../../authkit/ssr/workos';

export const Route = createFileRoute('/api/auth/desktop-callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        let parsedState: { desktop?: boolean; returnTo?: string } = {};
        try {
          if (state && state !== 'null') {
            parsedState = JSON.parse(atob(state));
          }
        } catch {
          // ignore parse errors
        }

        if (!code) {
          return new Response(
            JSON.stringify({ error: 'Missing authorization code' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }

        try {
          const { accessToken, refreshToken, user } =
            await getWorkOS().userManagement.authenticateWithCode({
              clientId: getConfig('clientId'),
              code,
            });

          if (!accessToken || !refreshToken) {
            throw new Error('Response is missing tokens');
          }

          // Encode auth data for deep link
          const authData = btoa(
            JSON.stringify({
              accessToken,
              refreshToken,
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
              },
            }),
          );

          // Redirect to ama:// deep link
          const deepLinkUrl = `ama://auth/callback?data=${encodeURIComponent(authData)}`;

          return new Response(
            `<!DOCTYPE html>
<html>
<head><title>Redirecting to AMA...</title></head>
<body style="background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center">
    <p style="font-size:18px;margin-bottom:8px">Redirecting to AMA Desktop...</p>
    <p style="color:#71717a;font-size:14px">You can close this tab.</p>
  </div>
  <script>window.location.href = ${JSON.stringify(deepLinkUrl)};</script>
</body>
</html>`,
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' },
            },
          );
        } catch (error) {
          console.error('Desktop callback auth failed:', error);
          return new Response(
            JSON.stringify({
              error: 'Authentication failed',
              message: error instanceof Error ? error.message : String(error),
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
