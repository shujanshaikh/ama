import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { PromptBox } from "@/components/prompt-box";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getSignInUrl } from "@/authkit/serverFunction";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  // loader: async ({ context }) => {
  //   const { user } = context;
  //   const url = await getSignInUrl();
  //   return { user, url };
  // },

});

interface Project {
  id: string;
  name: string;
  cwd: string;
  gitRepo: string;
}

function DashboardPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: projects } = useQuery(trpc.project.getProjects.queryOptions());
  const { mutate: createProject } = useMutation({
    ...trpc.project.createProject.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.project.getProjects.queryOptions().queryKey });
    },
  });

  const { mutateAsync: createChat } = useMutation({
    ...trpc.chat.createChat.mutationOptions(),
  });

  const handleCreateProject = async (name: string, cwd: string, gitRepo: string) => {
    createProject({ name, cwd, gitRepo });
  };

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
  const { data: cwd } = useQuery(
    queryOptions(
      {
        queryKey: ['cwd'],
        queryFn: async () => {
          const response = await fetch(`http://localhost:3456/cwd`);
          return response.json();
        },
      }
    )
  );

  const currentProject = cwd?.projectName
    ? projectsList.find(p => p.name === cwd.projectName || p.cwd === cwd.cwd)
    : null;

  const otherProjects = currentProject
    ? projectsList.filter(p => p.id !== currentProject.id)
    : projectsList;
  const navigate = useNavigate();
  const handleSubmit = async (message: string) => {
    console.log("Submitted:", message);
  };



  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex flex-col justify-center min-h-[45vh] px-6 pt-24 pb-12">
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

      <div className="max-w-2xl mx-auto px-6 pb-20">
        {currentProject && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 px-1">
              Active
            </h2>
            <div
              onClick={() => handleProjectClick(currentProject)}
              className="group p-4 cursor-pointer transition-colors hover:bg-muted/40 rounded-lg -mx-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">{currentProject.name}</h3>
                  <p className="font-mono text-[11px] text-muted-foreground/60 truncate max-w-[400px] mt-0.5">
                    {currentProject.cwd}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  Open
                </span>
              </div>
            </div>
          </section>
        )}

        {otherProjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 px-1">
              Projects
            </h2>
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {otherProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="group bg-card/50 p-4 cursor-pointer transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-sm text-foreground/85 group-hover:text-foreground transition-colors">
                        {project.name}
                      </h3>
                      <p className="font-mono text-[11px] text-muted-foreground/60 truncate max-w-[350px] mt-0.5">
                        {project.cwd}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      Open
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {cwd?.projectName && !currentProject && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 px-1">
              Detected
            </h2>
            <div className="rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[15px] mb-1">{cwd.projectName}</h3>
                <p className="font-mono text-xs text-muted-foreground">{cwd.cwd}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  handleCreateProject(
                    cwd.projectName,
                    cwd.cwd,
                    cwd.isGitRepo ? cwd.cwd : ""
                  )
                }
              >
                Import
              </Button>
            </div>
          </section>
        )}

        {projectsList.length === 0 && !cwd?.projectName && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground text-sm">No projects yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Open a project folder to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
