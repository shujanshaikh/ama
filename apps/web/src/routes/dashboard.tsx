import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { PromptBox } from "@/components/prompt-box";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStatus } from "@/hooks/use-user";
import { useNavigate } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";


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
    await createProject({ name, cwd, gitRepo });
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
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <div className="flex flex-1 items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="flex w-full max-w-3xl flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="flex items-center gap-2">
              <AmaLogo size={40} />
              <span className="text-[40px] text-muted-foreground/70 font-bold leading-none">
                ma
              </span>
            </div>
            <PromptBox
              onSubmit={handleSubmit}
              placeholder="Start typing to build something amazing..."
              className="w-full"
            />
          </div>

          {currentProject && (
            <Card className="w-full border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <span>Current Project</span>
                      <span className="text-xs font-normal text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Working in {currentProject.name}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  onClick={() => handleProjectClick(currentProject)}
                  className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 cursor-pointer"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="font-semibold text-sm">
                        {currentProject.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {currentProject.cwd}
                      </span>
                    </div>
                  </div>
                  {currentProject.gitRepo && (
                    <div className="ml-4 flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1">
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Git
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Your Projects</CardTitle>
                  <CardDescription className="mt-1.5">
                    {otherProjects.length > 0
                      ? `${otherProjects.length} project${otherProjects.length > 1 ? 's' : ''}`
                      : "No other projects"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {otherProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm font-medium text-foreground mb-1">
                    No other projects
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {currentProject
                      ? "All your projects are shown above."
                      : "Import a project to get started."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {otherProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleProjectClick(project)}
                      className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 cursor-pointer"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="font-semibold text-sm">
                            {project.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {project.cwd}
                          </span>
                        </div>
                      </div>
                      {project.gitRepo && (
                        <div className="ml-4 flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1">
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            Git
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {cwd?.projectName && !currentProject && (
            <Card className="w-full border-dashed">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Import Project</CardTitle>
                    <CardDescription className="mt-1.5">
                      Detected project: {cwd.projectName}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() =>
                      handleCreateProject(
                        cwd.projectName,
                        cwd.cwd,
                        cwd.isGitRepo ? cwd.cwd : ""
                      )
                    }
                  >
                    Import "{cwd.projectName}"
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="font-semibold text-sm">
                      {cwd.projectName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {cwd.cwd}
                    </span>
                    {cwd.isGitRepo && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Git repository detected
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
