import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { PromptBox } from "@/components/prompt-box";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStatus } from "@/hooks/use-user";
import { useNavigate } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";



export const Route = createFileRoute("/dashboard")({
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
    try {
      const chatId = await createChat({
        title: `Chat for ${project.name}`,
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

  const { user, isLoading, isAuthenticated } = useAuthStatus();



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen overflow-hidden">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    navigate({ to: "/login" });
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden font-sans selection:bg-primary/10">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24 flex flex-col gap-12">

          {/* Hero Section */}
          <div className="flex flex-col items-center gap-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 select-none hover:scale-105 transition-transform duration-300">
              <div className="relative">
                <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full" />
                <AmaLogo size={56} />
              </div>
              <span className="text-5xl font-bold tracking-tight text-foreground/80">
                ama
              </span>
            </div>

            <div className="w-full max-w-2xl mt-2 relative z-10">
              <PromptBox
                onSubmit={handleSubmit}
                placeholder="What would you like to build?"
                className="shadow-2xl shadow-primary/5 border-primary/10 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/30 text-lg rounded-2xl transition-all duration-300 hover:shadow-primary/10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            {/* Active Project Section */}
            {currentProject && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Active Session
                  </h2>
                </div>
                <div
                  onClick={() => handleProjectClick(currentProject)}
                  className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 cursor-pointer"
                >
                  <div className="absolute inset-0 from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xl tracking-tight">
                          {currentProject.name}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 ring-1 ring-inset ring-green-500/20">
                          Active
                        </span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground/80 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        {currentProject.cwd}
                      </span>
                    </div>
                    {currentProject.gitRepo && (
                      <div className="text-muted-foreground/40 group-hover:text-foreground/60 transition-colors">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}


            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {otherProjects.length > 0 ? "Recent Projects" : "No other projects"}
                </h2>
              </div>

              {otherProjects.length === 0 ? (
                !currentProject && (
                  <div className="rounded-2xl border border-dashed p-12 text-center">
                    <p className="text-muted-foreground">Import a project to get started</p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleProjectClick(project)}
                      className="group flex flex-col justify-between h-full rounded-xl border bg-card/50 hover:bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 cursor-pointer"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-base group-hover:text-primary transition-colors">
                            {project.name}
                          </span>
                          {project.gitRepo && (
                            <svg className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60" viewBox="0 0 24 24" fill="currentColor">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate font-mono opacity-60">
                          {project.cwd}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {cwd?.projectName && !currentProject && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Detected Project
                  </h2>
                </div>
                <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-6 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-lg">{cwd.projectName}</span>
                    <span className="text-sm text-muted-foreground font-mono">{cwd.cwd}</span>
                  </div>
                  <Button
                    size="lg"
                    onClick={() =>
                      handleCreateProject(
                        cwd.projectName,
                        cwd.cwd,
                        cwd.isGitRepo ? cwd.cwd : ""
                      )
                    }
                  >
                    Import Project
                  </Button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
