import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { routeTree } from "./routeTree.gen";
import Loader from "./components/loader";
import "./index.css";

export function getRouter() {
	

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
			},
		},
	});

	const router = routerWithQueryClient(
		createTanStackRouter({
			routeTree,
			defaultPreload: "intent",
			defaultPendingComponent: () => <Loader />,
			defaultNotFoundComponent: () => <div>Not Found</div>,
			context: { queryClient },
		}),
		queryClient,
	);
	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}