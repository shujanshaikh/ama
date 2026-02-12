import { createFileRoute } from '@tanstack/react-router';
import { getConfig } from '../../../authkit/ssr/config';
import { saveSession } from '../../../authkit/ssr/session';
import { getWorkOS } from '../../../authkit/ssr/workos';

export const Route = createFileRoute('/api/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        let parsedState: { returnPathname?: string; desktop?: boolean; callbackPort?: number } = {};
        try {
          if (state && state !== 'null') {
            parsedState = JSON.parse(atob(state));
          }
        } catch {
          // ignore parse errors
        }
        let returnPathname = parsedState.returnPathname ?? null;

        if (code) {
          try {
            // Desktop PKCE flow: redirect code+state to localhost; desktop will exchange via /api/auth/desktop-exchange
            if (parsedState.desktop && typeof parsedState.callbackPort === 'number') {
              const callbackUrl = `http://127.0.0.1:${parsedState.callbackPort}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`;
              return Response.redirect(callbackUrl, 302);
            }

            // Web flow: exchange code for tokens and save session
            const { accessToken, refreshToken, user, impersonator } =
              await getWorkOS().userManagement.authenticateWithCode({
                clientId: getConfig('clientId'),
                code,
              });

            if (!accessToken || !refreshToken) throw new Error('response is missing tokens');

            // If baseURL is provided, use it instead of request.nextUrl
            // This is useful if the app is being run in a container like docker where
            // the hostname can be different from the one in the request
            const url = new URL(request.url);

            // Cleanup params
            url.searchParams.delete('code');
            url.searchParams.delete('state');

            // Redirect to the requested path and store the session
            returnPathname = returnPathname ?? '/';

            // Extract the search params if they are present
            if (returnPathname.includes('?')) {
              const newUrl = new URL(returnPathname, 'https://example.com');
              url.pathname = newUrl.pathname;

              for (const [key, value] of newUrl.searchParams) {
                url.searchParams.append(key, value);
              }
            } else {
              url.pathname = returnPathname;
            }

            const response = redirectWithFallback(url.toString());

            await saveSession({ accessToken, refreshToken, user, impersonator });

            return response;
          } catch (error) {
            const errorRes = {
              error: error instanceof Error ? error.message : String(error),
            };

            console.error(errorRes);

            return errorResponse();
          }
        }

        return errorResponse();

        function errorResponse() {
          return errorResponseWithFallback({
            error: {
              message: 'Something went wrong',
              description:
                "Couldn't sign in. If you are not sure what happened, please contact your organization admin.",
            },
          });
        }
      },
    },
  },
});

function redirectWithFallback(redirectUri: string, headers?: Headers) {
  const newHeaders = headers ? new Headers(headers) : new Headers();
  newHeaders.set('Location', redirectUri);

  return new Response(null, { status: 307, headers: newHeaders });
}

function errorResponseWithFallback(errorBody: { error: { message: string; description: string } }) {
  return new Response(JSON.stringify(errorBody), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}