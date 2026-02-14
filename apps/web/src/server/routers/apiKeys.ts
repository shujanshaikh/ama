import { z } from "zod";
import { decodeJwt } from "jose";
import { protectedProcedure, router } from "../index";
import {
  storeGatewayKey,
  deleteGatewayKey,
  hasGatewayKey,
} from "../lib/vault";
import { createGatewayAuthToken } from "../lib/gatewayAuth";
import { decryptSession, saveSession } from "@/authkit/ssr/session";
import { getConfig } from "@/authkit/ssr/config";
import { getWorkOS } from "@/authkit/ssr/workos";

export const apiKeysRouter = router({
  getKeyStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user!.id;
    const hasKey = await hasGatewayKey(userId);
    return { hasKey };
  }),

  saveKey: protectedProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user!.id;
      await storeGatewayKey(userId, input.apiKey);
      return { success: true };
    }),

  deleteKey: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user!.id;
    const deleted = await deleteGatewayKey(userId);
    return { success: deleted };
  }),

  getGatewayToken: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user!.id;
    const token = createGatewayAuthToken(userId);
    if (!token) {
      throw new Error("Gateway auth secret is not configured");
    }
    return { token };
  }),

  getAccessToken: protectedProcedure.query(async ({ ctx }) => {
    const cookieName = getConfig("cookieName") || "wos-session";
    const cookieHeader = ctx.req.headers.get("cookie");
    if (!cookieHeader) {
      throw new Error("No session cookie");
    }
    const cookies = Object.fromEntries(
      cookieHeader.split(/;\s*/).map((c) => {
        const [name, ...parts] = c.split("=");
        return [name, parts.join("=")];
      })
    );
    const sessionCookie = cookies[cookieName];
    if (!sessionCookie) {
      throw new Error("No session cookie");
    }
    const session = await decryptSession(decodeURIComponent(sessionCookie));
    if (!session?.accessToken) {
      throw new Error("No access token in session");
    }
    const claims = decodeJwt<{ exp?: number }>(session.accessToken);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = claims.exp ? claims.exp - now : 0;
    if (expiresIn < 60 && session.refreshToken) {
      try {
        const { org_id: orgId } = decodeJwt(session.accessToken) as { org_id?: string };
        const result = await getWorkOS().userManagement.authenticateWithRefreshToken({
          clientId: getConfig("clientId"),
          refreshToken: session.refreshToken,
          ...(orgId && { organizationId: orgId }),
        });
        await saveSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          impersonator: result.impersonator,
        });
        return { token: result.accessToken };
      } catch (err) {
        console.warn("[getAccessToken] Refresh failed:", err);
      }
    }
    return { token: session.accessToken };
  }),
});
