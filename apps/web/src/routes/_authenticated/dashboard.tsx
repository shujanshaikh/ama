import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { IdeProjects } from "@/components/ideProjects";
import { getSignInUrl } from "@/authkit/serverFunction";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUserStreamContextOptional } from "@/components/user-stream-provider";
import { Button } from "@/components/ui/button";

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
  const queryClient = useQueryClient();
  const userStream = useUserStreamContextOptional();

  const { data: projects } = useQuery(trpc.project.getProjects.queryOptions());
  const { user } = Route.useLoaderData();

  const { mutateAsync: createChat } = useMutation({
    ...trpc.chat.createChat.mutationOptions(),
  });

  const { mutateAsync: createProject } = useMutation({
    ...trpc.project.createProject.mutationOptions(),
  });

  const handleProjectClick = async (project: Project) => {
    if (project.id) {
      navigate({
        to: "/chat/$projectId",
        params: { projectId: project.id },
        search: { chat: "" },
      });
    } else {
      try {
        const chatId = await createChat({
          title: "New Chat",
          projectId: project.id,
        });
        if (chatId) {
          navigate({
            to: "/chat/$projectId",
            params: { projectId: project.id },
            search: { chat: chatId },
          });
        }
      } catch (error) {
        console.error("Failed to create chat:", error);
      }
    }
  };

  const projectsList: Project[] = (projects as Project[] | undefined) ?? [];

  const isLoadingProjects = !projects;

  const [searchQuery, setSearchQuery] = useState("");
  const [manualPath, setManualPath] = useState("");
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const filteredProjects = projectsList.filter((project) => {
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.cwd.toLowerCase().includes(query)
    );
  });

  const handleManualPathSubmit = async () => {
    const trimmedPath = manualPath.trim();
    if (!trimmedPath) return;

    setIsCreatingManual(true);
    try {
      const projectName = trimmedPath.split("/").pop() || "Untitled Project";

      const newProject = await createProject({
        name: projectName,
        cwd: trimmedPath,
        gitRepo: "",
      });

      if (newProject?.id) {
        if (userStream?.cliConnected && userStream?.rpc) {
          try {
            await userStream.rpc.registerProject(
              newProject.id,
              trimmedPath,
              projectName
            );
          } catch (rpcError) {
            console.warn("Failed to register project with CLI:", rpcError);
          }
        }

        await queryClient.invalidateQueries({
          queryKey: trpc.project.getProjects.queryKey(),
        });

        setManualPath("");
        setIsImportDialogOpen(false);
        navigate({
          to: "/chat/$projectId",
          params: { projectId: newProject.id },
          search: { chat: "" },
        });
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreatingManual(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-background text-foreground overflow-auto">
      <div className="grain-overlay" aria-hidden="true" />

      <div className="absolute top-8 right-6 z-10">
        <div className="text-xs font-medium text-muted-foreground/70 px-3 py-1.5 bg-muted/40 rounded-sm border border-border/40 shadow-rough backdrop-blur-sm">
          {user?.email}
        </div>
      </div>

      <div className="absolute top-8 left-6 flex items-center gap-2 z-10">
        <AmaLogo size={24} />
        <span className="text-xl font-bold text-foreground tracking-tight">ama</span>
      </div>

      <div className="flex flex-col justify-center min-h-[35vh] px-6 pt-16 pb-2">
        <div className="w-full max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-lg font-semibold tracking-tight text-foreground mb-4">
              Welcome back, {user?.firstName}
            </h1>

            <div className="flex items-center gap-3">
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="transition-none shadow-rough bg-background hover:bg-secondary/60 rounded-sm border-border/60">
                    <Plus className="size-3" />
                    Import Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm rounded-sm shadow-rough border-border/60">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-medium">
                      Import project
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Run <code className="px-1 py-0.5 bg-secondary border border-border rounded-sm text-[10px] font-mono">pwd</code> in your terminal to get the actual path
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        Project path
                      </label>
                      <input
                        type="text"
                        placeholder="/Users/name/projects/my-app"
                        value={manualPath}
                        onChange={(e) => setManualPath(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && manualPath.trim()) {
                            handleManualPathSubmit();
                          }
                        }}
                        autoFocus
                        className="w-full h-9 px-3 text-sm bg-secondary/50 border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/40 transition-colors input-rough"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={handleManualPathSubmit}
                        disabled={!manualPath.trim() || isCreatingManual}
                        className="h-8 px-3 text-xs bg-foreground text-background hover:bg-foreground/90 rounded-sm transition-colors disabled:opacity-50"
                      >
                        {isCreatingManual ? (
                          <div className="size-3 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                        ) : (
                          "Add project"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <p className="text-[10px] text-muted-foreground/70 hidden sm:block">
                Connect your local project with ama
              </p>
            </div>
          </div>
        </div>

      </div>


      <div className="max-w-2xl mx-auto px-6 pb-20">
        <hr className="border-border/40 mb-4" style={{ borderStyle: 'dashed' }} />
        {isLoadingProjects ? (
          <section className="mb-8">
            <Skeleton className="h-4 w-20 mb-3 rounded-sm" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-sm" />
              ))}
            </div>
          </section>
        ) : projectsList.length > 0 ? (
          <section className="mb-8">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Projects
                </h2>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 w-64 pl-7 pr-2 text-xs bg-muted/20 border border-border/40 rounded-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring/30 focus:border-border/60 transition-all input-rough"
                  />
                </div>
              </div>
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {filteredProjects.map((project) => {
                    const firstLetter = project.name.charAt(0).toUpperCase();
                    const muted = [
                      "bg-red-400/80",
                      "bg-orange-400/80",
                      "bg-amber-400/80",
                      "bg-yellow-400/80",
                      "bg-lime-400/80",
                      "bg-green-400/80",
                      "bg-emerald-400/80",
                      "bg-teal-400/80",
                      "bg-cyan-400/80",
                      "bg-sky-400/80",
                      "bg-blue-400/80",
                      "bg-indigo-400/80",
                      "bg-violet-400/80",
                      "bg-purple-400/80",
                      "bg-fuchsia-400/80",
                      "bg-pink-400/80",
                      "bg-rose-400/80",
                    ];
                    const colorIndex = firstLetter.charCodeAt(0) % muted.length;
                    const avatarColor = muted[colorIndex];

                    return (
                      <div
                        key={project.id}
                        className="group cursor-pointer border border-border/30 hover:border-border/60 rounded-sm p-2.5 transition-all duration-150 hover:bg-muted/15 shadow-rough"
                        onClick={() => handleProjectClick(project)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`size-7 rounded-sm ${avatarColor} flex items-center justify-center text-white font-bold text-[11px] shrink-0`}
                          >
                            {firstLetter}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-foreground truncate">
                              {project.name}
                            </h3>
                            <p className="text-[10px] text-muted-foreground/60 truncate font-mono">
                              {project.cwd.split("/").slice(-2).join("/")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-[11px] text-muted-foreground/60">
                    No projects found matching "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground/70">No projects yet</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Open a project folder to get started
            </p>
          </div>
        )}
        <IdeProjects />
      </div>


    </div>
  );
}
