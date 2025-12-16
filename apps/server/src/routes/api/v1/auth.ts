import { Hono, type Context } from "hono";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from 'hono/cookie'
import { workos, clientId, cookiePassword, frontendUrl, backendUrl } from '../../../lib/workos';


export const router = new Hono();


router.get('/login', async (c) => {
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: 'authkit',
    redirectUri: `${backendUrl}/api/v1/auth/callback`,
    clientId: clientId,
  });
  return c.redirect(authorizationUrl);
});


router.get('/callback', async (c) => {
  const code = c.req.query('code');

  if (!code) {
    return c.redirect(`${frontendUrl}/auth-test?error=no_code`);
  }

  try {
    const authenticateResponse =
      await workos.userManagement.authenticateWithCode({
        clientId: clientId,
        code,
        session: {
          sealSession: true,
          cookiePassword: cookiePassword,
        },
      });

    const { sealedSession  } = authenticateResponse;
    setCookie(c, 'wos-session', sealedSession!, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return c.redirect(`${frontendUrl}/dashboard`);
  } catch (error) {
    console.error('Login error:', error);
    return c.redirect(`${frontendUrl}/auth-test?error=login_failed`);
  }
});



async function withAuth(c: Context, next: () => Promise<void>) {
  const sessionCookie = getCookie(c, 'wos-session');

  if (!sessionCookie) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  try {
    const session = workos.userManagement.loadSealedSession({
      sessionData: sessionCookie,
      cookiePassword: cookiePassword,
    });

    const { authenticated } = await session.authenticate();

    if (authenticated) {
      return await next();
    }

    try {
      const refreshResult = await session.refresh();

      if (!refreshResult.authenticated) {
        deleteCookie(c, 'wos-session');
        return c.json({ error: 'Session expired' }, 401);
      }

      const newSealedSession = (refreshResult as any).sealedSession;
      if (newSealedSession) {
        setCookie(c, 'wos-session', newSealedSession, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }

      return await next();
    } catch (e) {
      deleteCookie(c, 'wos-session');
      return c.json({ error: 'Session invalid' }, 401);
    }
  } catch (e) {
    deleteCookie(c, 'wos-session');
    return c.json({ error: 'Invalid session' }, 401);
  }
}


router.get('/logout', async (c) => {
  const sessionCookie = getCookie(c, 'wos-session');

  if (sessionCookie) {
    try {
      const session = workos.userManagement.loadSealedSession({
        sessionData: sessionCookie,
        cookiePassword: cookiePassword,
      });

      const logoutUrl = await session.getLogoutUrl();
      deleteCookie(c, 'wos-session');
      return c.redirect(logoutUrl);
    } catch {
      deleteCookie(c, 'wos-session');
      return c.redirect(frontendUrl);
    }
  }

  return c.redirect(frontendUrl);
});


export { withAuth };