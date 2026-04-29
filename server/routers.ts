import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { createRoom, getRoomByCode, getRoomById, addPlayer, getPlayersInRoom, updateRoomStatus, updatePlayerVote, updatePlayerCharacter, getAllCharacters } from "./db";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  game: router({
    createRoom: publicProcedure.mutation(async ({ ctx }) => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const hostId = ctx.user?.id || 0;
      const room = await createRoom(hostId, code);
      if (!room) throw new Error("Failed to create room");
      return { code: room.code, id: room.id };
    }),

    getRoomByCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await getRoomByCode(input.code);
      }),

    getRoomById: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return await getRoomById(input.roomId);
      }),

    joinRoom: publicProcedure
      .input(z.object({ roomId: z.number(), name: z.string() }))
      .mutation(async ({ input }) => {
        const result = await addPlayer(input.roomId, input.name);
        return result;
      }),

    getPlayersInRoom: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return await getPlayersInRoom(input.roomId);
      }),

    updateRoomStatus: publicProcedure
      .input(z.object({ roomId: z.number(), status: z.string() }))
      .mutation(async ({ input }) => {
        await updateRoomStatus(input.roomId, input.status);
        return { success: true };
      }),

    updatePlayerVote: publicProcedure
      .input(z.object({ playerId: z.number(), voto: z.number() }))
      .mutation(async ({ input }) => {
        await updatePlayerVote(input.playerId, input.voto);
        return { success: true };
      }),

    updatePlayerCharacter: publicProcedure
      .input(z.object({ playerId: z.number(), characterId: z.number(), isImpostor: z.boolean() }))
      .mutation(async ({ input }) => {
        await updatePlayerCharacter(input.playerId, input.characterId, input.isImpostor);
        return { success: true };
      }),

    getAllCharacters: publicProcedure.query(async () => {
      return await getAllCharacters();
    }),
  }),
});

export type AppRouter = typeof appRouter;
