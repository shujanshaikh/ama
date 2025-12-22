import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";

export const userStreams = new Hono();

userStreams.get("/user-streams", async (c) => {
    upgradeWebSocket(async (_c) => {
        return {
            onOpen: (_evt, ws) => {
                console.log("User connected");
            },
        };
    });
});