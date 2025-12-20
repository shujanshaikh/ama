import { Toaster } from "@/components/ui/sonner";
import { Box, Button, Card, Container, Flex, Theme } from '@radix-ui/themes';
import { HeadContent, Link, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import appCss from "../index.css?url";
import type { QueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { PanelLeftIcon } from "lucide-react";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { FetchConnection } from "@/components/fetchConnection";
import { Sidepanel } from "@/components/side-panel";
import type { AppRouter } from "@/server/routers";
import { getAuth, getSignInUrl } from "@/authkit/serverFunction";
import { Suspense, type ReactNode } from "react";
import SignInButton from "@/components/sign-in-components";

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
	
	component: RootComponent,
	notFoundComponent: () => <div>Not Found</div>,
});


function RootComponent() {
	const { user, url } = Route.useLoaderData();
	return (
	  <RootDocument>
		<Theme accentColor="iris" panelBackground="solid" style={{ backgroundColor: 'var(--gray-1)' }}>
		  <Container style={{ backgroundColor: 'var(--gray-1)' }}>
			<Flex direction="column" gap="5" p="5" height="100vh">
			  <Box asChild flexGrow="1">
				<Card size="4">
				  <Flex direction="column" height="100%">
					<Flex asChild justify="between">
					  <header>
						<Flex gap="4">
						  <Button asChild variant="soft">
							<Link to="/">Home</Link>
						  </Button>
  
						  <Button asChild variant="soft">
							<Link to="/dashboard">Dashboard</Link>
						  </Button>
						</Flex>
  
						<Suspense fallback={<div>Loading...</div>}>
						  <SignInButton user={user} url={url} />
						</Suspense>
					  </header>
					</Flex>
  
					<Flex flexGrow="1" align="center" justify="center">
					  <main>
						<Outlet />
					  </main>
					</Flex>
				  </Flex>
				</Card>
			  </Box>
			</Flex>
		  </Container>
		</Theme>
		<TanStackRouterDevtools position="bottom-right" />
	  </RootDocument>
	);
  }

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
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
				{children}
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
				size="1"
				className="size-7 h-8 w-8 rounded-md hover:bg-muted transition-colors flex-shrink-0"
				onClick={toggleSidebar}
			>
				<PanelLeftIcon />
				<span className="sr-only">Toggle Sidebar</span>
			</Button>
		</div>
	);
}
