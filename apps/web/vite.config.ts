import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from 'nitro/vite'
import type { PluginOption } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";


export default defineConfig({
	server: {
		port: 3001,
	},
	plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), viteReact(), nitro() as PluginOption , 
		viteTsConfigPaths({
		projects: ["./tsconfig.json"],
	  }),],
});
