import { Toaster } from "@/components/ui/sonner";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useLocation } from '@tanstack/react-router';
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import appCss from "../index.css?url";
import type { QueryClient } from "@tanstack/react-query";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { FetchConnection } from "@/components/fetchConnection";
import type { AppRouter } from "@/server/routers";
import { getAuth, getSignInUrl } from "@/authkit/serverFunction";
import { UserStreamProvider } from "@/components/user-stream-provider";

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
	const { user } = Route.useLoaderData();
	const isPublicPage = location.pathname === "/" || location.pathname === "/install";

	return (
		<html lang="en" className="dark h-full" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="h-full overflow-hidden">
				<UserStreamProvider userId={user?.id}>
					<div className="relative w-full h-full flex flex-col min-h-0">
						{!isPublicPage && <FetchConnection />}
						<div className="flex-1 overflow-y-auto min-h-0">
							<Outlet />
						</div>
					</div>
				</UserStreamProvider>
				<Toaster richColors />
				<TanStackRouterDevtools position="bottom-left" initialIsOpen={false} />
				<Scripts />
			</body>
		</html>
	);
}
