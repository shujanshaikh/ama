import { createFileRoute } from "@tanstack/react-router";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});


function HomeComponent() {
	const trpc = useTRPC();

    const { data, isLoading, error, refetch, isFetching } = useQuery(trpc.hello.queryOptions());

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			Welcome to ama {data?.greeting}
		</div>
	);
}
