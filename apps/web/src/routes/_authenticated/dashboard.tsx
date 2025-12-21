import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { PromptBox } from "@/components/prompt-box";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Folder } from "lucide-react";
import { IdeProjects } from "@/components/ideProjects";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
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
          <div className="mb-8">
            <AmaLogo size={52} />
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
                  className="group relative flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-300 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Folder className="size-4 text-muted-foreground/70 group-hover:text-primary transition-colors shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground/90 truncate group-hover:text-foreground transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/50 truncate font-mono mt-0.5">
                      {project.cwd}
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
