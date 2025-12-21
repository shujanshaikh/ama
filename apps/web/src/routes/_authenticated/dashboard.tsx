import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { PromptBox } from "@/components/prompt-box";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Folder } from "lucide-react";
import { IdeProjects } from "@/components/ideProjects";
import { getSignInUrl } from "@/authkit/serverFunction";

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



  return (
    <div className="w-full h-full bg-background text-foreground">
      <div className="flex flex-col justify-center min-h-[45vh] px-6 pt-24 pb-12 bg-background">
        <div className="w-full max-w-2xl mx-auto">
          <div className="mb-12">
            <AmaLogo size={52} />
            <h1 className="text-2xl font-bold">Welcome, {user?.firstName}</h1>
          </div>
          <PromptBox
            onSubmit={handleSubmit}
            placeholder="Describe what you want to create..."
            className="text-base rounded-xl border-border bg-card focus-within:border-primary/40 transition-colors"
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-20 bg-background">
        {projectsList.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 px-1">
              Projects
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {projectsList.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="group relative flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-card/20 hover:bg-card/60 hover:border-primary/10 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="size-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary/70 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                    <Folder className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground/90 truncate group-hover:text-foreground transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5 font-mono opacity-70">
                      {project.cwd.split('/').slice(-2).join('/')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {projectsList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground text-sm">No projects yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Open a project folder to get started
            </p>
          </div>
        )}

        <IdeProjects />
      </div>
    </div>
  );
}
