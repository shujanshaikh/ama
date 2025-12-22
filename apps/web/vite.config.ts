import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from 'nitro/vite'


export default defineConfig({
	server: {
		port: 3001,
	},
	ssr: {
		external: [
			'@workos-inc/node',
			'drizzle-orm',
			'@neondatabase/serverless',
			'@trpc/server',
			'iron-session',
			'jose',
			'@ai-sdk/google',
			'ai',
		],
		noExternal: ['uploadthing', '@uploadthing/shared'],
	},
	build: {
		rollupOptions: {
			external: [
				'@workos-inc/node',
				'drizzle-orm',
				'@neondatabase/serverless',
				'@trpc/server',
				'iron-session',
				'jose',
				'@ai-sdk/google',
			],
		},
	},
	plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), viteReact(), nitro()],
});
