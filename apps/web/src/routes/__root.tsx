import { Toaster } from "@/components/ui/sonner";

import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import appCss from "../index.css?url";
import type { QueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Sidepanel } from "@/components/side-panel";

export interface RouterAppContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "ama"
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				<SidebarProvider defaultOpen={false}>
					<Sidepanel />
					<SidebarInset className="h-svh">
						<Outlet />
					</SidebarInset>
				</SidebarProvider>
				<Toaster richColors />
				<TanStackRouterDevtools position="bottom-left" />
				<Scripts />
			</body>
		</html>
	);
}
