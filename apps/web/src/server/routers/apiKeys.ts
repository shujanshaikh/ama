import { z } from "zod";
import { protectedProcedure, router } from "../index";
import {
  storeGatewayKey,
  deleteGatewayKey,
  hasGatewayKey,
} from "../lib/vault";

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
});
