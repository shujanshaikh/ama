import { Toaster } from "@/components/ui/sonner";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useLocation } from '@tanstack/react-router';
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import appCss from "../index.css?url";
import type { QueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeftIcon } from "lucide-react";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { FetchConnection } from "@/components/fetchConnection";
import { Sidepanel } from "@/components/side-panel";
import type { AppRouter } from "@/server/routers";
import { getAuth, getSignInUrl } from "@/authkit/serverFunction";

export interface RouterAppContext {
	trpc: TRPCOptionsProxy<AppRouter>;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	beforeLoad: async () => {
		const { user } = await getAuth();

		return { user };
	},

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
				title: "ama",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/ama.svg",
			},
		],
	}),
	loader: async ({ context }) => {
		const { user } = context;
		const url = await getSignInUrl();
		return {
			user,
			url,
		};
	},

	component: RootDocument,
	notFoundComponent: () => <div>Not Found</div>,
});

function RootDocument() {
	const location = useLocation();
	const isPublicPage = location.pathname === "/" || location.pathname === "/install";

	return (
		<html lang="en" className="dark" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<SidebarProvider defaultOpen={true}>
					<Sidepanel />
					<SidebarInset className="h-svh relative">
						{!isPublicPage && <FetchConnection />}
						<CollapsedSidebarTrigger />
						<Outlet />
					</SidebarInset>
				</SidebarProvider>
				<Toaster richColors />
				<TanStackRouterDevtools position="bottom-left" initialIsOpen={false} />
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
				size="icon-sm"
				className="rounded-md hover:bg-muted transition-colors flex-shrink-0"
				onClick={toggleSidebar}
			>
				<PanelLeftIcon />
				<span className="sr-only">Toggle Sidebar</span>
			</Button>
		</div>
	);
}
