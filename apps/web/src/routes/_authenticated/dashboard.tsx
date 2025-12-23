import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { PromptBox } from "@/components/prompt-box";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Folder } from "lucide-react";
import { IdeProjects } from "@/components/ideProjects";
import { getSignInUrl } from "@/authkit/serverFunction";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  loader: async ({ context }) => {
    const { user } = context;
    const url = await getSignInUrl();
    return { user, url };
  },
});

interface Project {
  id: string;
  name: string;
  cwd: string;
  gitRepo: string;
}


function DashboardPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const { data: projects } = useQuery(trpc.project.getProjects.queryOptions());
  const { user } = Route.useLoaderData();


  const { mutateAsync: createChat } = useMutation({
    ...trpc.chat.createChat.mutationOptions(),
  });

  const handleProjectClick = async (project: Project) => {
    if (project.id) {
      navigate({
        to: '/chat/$projectId',
        params: { projectId: project.id },
        search: { chat: "" },
      })
    } else {
      try {
        const chatId = await createChat({
          title: "New Chat",
          projectId: project.id,
        });
        if (chatId) {
          navigate({
            to: '/chat/$projectId',
            params: { projectId: project.id },
            search: { chat: chatId },
          });
        }
      } catch (error) {
        console.error('Failed to create chat:', error);
      }
    }
  };

  const projectsList: Project[] = (projects as Project[] | undefined) ?? [];

  const handleSubmit = async (message: string) => {
    console.log("Submitted:", message);
  };



  const isLoadingProjects = !projects;

  return (
    <div className="w-full h-full bg-background text-foreground">
      <div className="flex flex-col justify-center min-h-[45vh] px-6 pt-24 pb-12">
        <div className="w-full max-w-2xl mx-auto">
          <div className="mb-12">
            <AmaLogo size={52} />
            <h1 className="text-xl font-medium mt-4 text-foreground/90">
              Welcome, {user?.firstName}
            </h1>
          </div>
          <PromptBox
            onSubmit={handleSubmit}
            placeholder="ask ama what you want to build..."
            className="text-base rounded-lg border-border bg-card focus-within:border-border transition-colors"
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-20">
        {isLoadingProjects ? (
          <section className="mb-8">
            <Skeleton className="h-4 w-20 mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          </section>
        ) : projectsList.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Projects
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {projectsList.map((project) => (
                <Card
                  key={project.id}
                  className="group cursor-pointer hover:border-border transition-colors p-3"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <Folder className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground truncate">
                        {project.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono">
                        {project.cwd.split('/').slice(-2).join('/')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Open a project folder to get started
            </p>
          </div>
        )}

        <IdeProjects />
      </div>
    </div>
  );
}
