import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { PromptBox } from "@/components/prompt-box";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { useAuthStatus } from "@/hooks/use-user";
import { useNavigate } from "@tanstack/react-router";


export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const trpc = useTRPC();
  const { data: projects } = useQuery(trpc.project.getProjects.queryOptions());
  const navigate = useNavigate();
  console.log(projects);
  const handleSubmit = async (message: string) => {
    console.log("Submitted:", message);
    // You can navigate to a chat route here:
    // navigate({ to: "/chat", search: { q: message } });
  };

  const { user, isLoading, isAuthenticated } = useAuthStatus();



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4">
      <div className="flex flex-1 items-center justify-center">
        <div className="flex w-full max-w-2xl flex-col items-center gap-10 -mt-40">
          <div className="flex items-center w-full max-w-2xl mx-auto pt-6 pb-4">
            <AmaLogo size={32} />
            <span className="text-[32px] text-muted-foreground/70 font-bold leading-none ml-0">
              ma
            </span>
          </div>
          <PromptBox
            onSubmit={handleSubmit}
            placeholder="Start typing to build something amazing..."
            className="w-full"
          />
        </div>
        <div className="flex flex-col items-center justify-center"> 
          {projects?.data?.map((project: any) => (
          <div key={project.id}>
            <h1>{project.name}</h1>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
}
