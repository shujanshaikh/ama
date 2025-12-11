import { Hono } from "hono";
import net from "node:net";
import { DEFAULT_PORT } from "./constant"
import { serve } from "@hono/node-server";
import pc from "picocolors";
import { pathToFileURL } from "node:url";
import { cors } from "hono/cors";
import { read_file } from "./tools/read-file";
import { apply_patch } from "./tools/apply-patch";


const VERSION = process.env.VERSION ?? "0.0.1";

export const createServer = () => {
    const app = new Hono();

    app.use("/*", cors());  
    
    app.post("/read-file", async (c) => {
        const body = await c.req.json();
        const { relative_file_path, should_read_entire_file, start_line_one_indexed, end_line_one_indexed } = body;
        const fileContent = await read_file({ relative_file_path, should_read_entire_file, start_line_one_indexed, end_line_one_indexed });
        return c.json({ fileContent });
    });

    app.post("/apply-patch", async (c) => {
        const body = await c.req.json();
        const { file_path, new_string, old_string } = body;
        const patch = await apply_patch({ file_path, new_string, old_string });
        return c.json({ patch });
    });

    app.get("/health", (context) => {
        return context.json({ status: "ok", provider: "ama" });
    });


    return app;
};


const isPortInUse = (port: number): Promise<boolean> =>
    new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(true));
        server.once("listening", () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });

export const startServer = async (port: number = DEFAULT_PORT) => {
    if (await isPortInUse(port)) {
        return
    }
    const app = createServer()
    serve({ fetch: app.fetch, port });
    console.log(`${pc.magenta("⚛")} ${pc.bold("Kai Agent")} ${pc.gray(VERSION)} ${pc.dim("(Kai)")}`);
    console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    startServer(DEFAULT_PORT).catch(console.error);
}