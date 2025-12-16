import { createFileRoute } from "@tanstack/react-router";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});


function HomeComponent() {
	const user = useUser();
	if (!user) {
		return <div>Redirecting...</div>;
	}
	return (
	  <div>
		<h1>Welcome, {user.firstName} {user.lastName}</h1>
		<p>Email: {user.email}</p>
		<p>Email Verified: {user.emailVerified ? 'Yes' : 'No'}</p>
	  </div>
	);
}
