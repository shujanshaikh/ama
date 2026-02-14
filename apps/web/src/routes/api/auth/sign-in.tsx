import { createFileRoute } from '@tanstack/react-router';
import { getConfig } from '../../../authkit/ssr/config';
import { getWorkOS } from '../../../authkit/ssr/workos';

export const Route = createFileRoute('/api/auth/sign-in')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const state = url.searchParams.get('state');

        // Use the same callback URI registered in WorkOS dashboard
        const baseUrl = new URL(request.url).origin;
        const desktopRedirectUri = `${baseUrl}/api/auth/callback`;

        try {
          const authUrl = getWorkOS().userManagement.getAuthorizationUrl({
            provider: 'authkit',
            clientId: getConfig('clientId'),
            redirectUri: desktopRedirectUri,
            state: state || undefined,
            screenHint: 'sign-in',
          });

          return Response.redirect(authUrl, 302);
        } catch (error) {
          console.error('Sign-in redirect failed:', error);
          return new Response(
            JSON.stringify({
              error: 'Sign-in failed',
              message: error instanceof Error ? error.message : String(error),
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
