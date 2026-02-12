import { createFileRoute } from '@tanstack/react-router';
import { getConfig } from '../../../authkit/ssr/config';
import { getWorkOS } from '../../../authkit/ssr/workos';
import { setDesktopPkceVerifier, parseAndValidateDesktopState } from '../../../authkit/ssr/desktop-auth';

export const Route = createFileRoute('/api/auth/desktop-start')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const stateParam = url.searchParams.get('state');

        if (!stateParam) {
          return new Response(
            JSON.stringify({ error: 'Missing state parameter' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }

        const parsedState = parseAndValidateDesktopState(stateParam);
        if (!parsedState) {
          return new Response(
            JSON.stringify({ error: 'Invalid or expired state' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }

        const baseUrl = new URL(request.url).origin;
        const redirectUri = `${baseUrl}/api/auth/callback`;

        try {
          const { url: authUrl, codeVerifier } =
            await getWorkOS().userManagement.getAuthorizationUrlWithPKCE({
              provider: 'authkit',
              clientId: getConfig('clientId'),
              redirectUri,
              screenHint: 'sign-in',
            });

          setDesktopPkceVerifier(stateParam, codeVerifier);

          // Append our state to the auth URL (SDK omits state from PKCE options)
          const urlWithState = new URL(authUrl);
          urlWithState.searchParams.set('state', stateParam);

          return Response.redirect(urlWithState.toString(), 302);
        } catch (error) {
          console.error('Desktop auth start failed:', error);
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
