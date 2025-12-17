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
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Sidepanel } from "@/components/side-panel";
import { Button } from "@/components/ui/button";
import { PanelLeftIcon } from "lucide-react";

import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@ama/server";
import { FetchConnection } from "@/components/fetchCOnnection";

export interface RouterAppContext {
	trpc: TRPCOptionsProxy<AppRouter>;
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
					<SidebarInset className="h-svh relative">
						<FetchConnection />
						<CollapsedSidebarTrigger />
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

function CollapsedSidebarTrigger() {
	const { state, toggleSidebar } = useSidebar();
	
	if (state === "expanded") {
		return null;
	}
	
	return (
		<div className="absolute top-4 left-4 z-10">
			<Button
				data-sidebar="trigger"
				data-slot="sidebar-trigger"
				variant="ghost"
				size="icon"
				className="size-7 h-8 w-8 rounded-md hover:bg-muted transition-colors flex-shrink-0"
				onClick={toggleSidebar}
			>
				<PanelLeftIcon />
				<span className="sr-only">Toggle Sidebar</span>
			</Button>
		</div>
	);
}
