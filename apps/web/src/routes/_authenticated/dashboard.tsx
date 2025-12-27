import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { PromptBox } from "@/components/prompt-box";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { IdeProjects } from "@/components/ideProjects";
import { getSignInUrl } from "@/authkit/serverFunction";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect } from "react";
import { Search, FolderPlus, Plus, X } from "lucide-react";
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

  const handleSubmit = async (message: string) => {
    console.log("Submitted:", message);
  };

  const isLoadingProjects = !projects;

  const [searchQuery, setSearchQuery] = useState("");
  const [manualPath, setManualPath] = useState("");
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [showAddProjectCard, setShowAddProjectCard] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowAddProjectCard(false);
      }
    };

    if (showAddProjectCard) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddProjectCard]);

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
        setShowAddProjectCard(false);
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
    <div className="w-full h-full bg-background text-foreground">
      <div className="flex flex-col justify-center min-h-[45vh] px-6 pt-24 pb-12">
        <div className="w-full max-w-2xl mx-auto">
          <div className="mb-12">
            <AmaLogo size={52} />
            <h1 className="text-xl font-medium mt-4 text-foreground/90">
              Welcome, {user?.firstName}
            </h1>
          </div>

          <div className="relative mb-4">
            <Button
              onClick={() => setShowAddProjectCard(!showAddProjectCard)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-lg transition-all duration-200"
            >
              <Plus className="size-3.5 text-muted-foreground" />
              <span>Import</span>
            </Button>

            {showAddProjectCard && (
              <div
                ref={popoverRef}
                className="absolute top-full left-0 mt-2 w-full max-w-md z-50 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FolderPlus className="size-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-foreground">
                        Add project manually
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowAddProjectCard(false)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-zinc-800 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Enter the full path to your project directory
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="/Users/name/projects/my-app"
                      value={manualPath}
                      onChange={(e) => setManualPath(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && manualPath.trim()) {
                          handleManualPathSubmit();
                        }
                        if (e.key === "Escape") {
                          setShowAddProjectCard(false);
                        }
                      }}
                      autoFocus
                      className="flex-1 h-9 px-3 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={handleManualPathSubmit}
                      disabled={!manualPath.trim() || isCreatingManual}
                      className="flex items-center gap-1.5 px-4 h-9 bg-white hover:bg-zinc-200 text-zinc-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {isCreatingManual ? (
                        <div className="size-3.5 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30">
              <div className="flex items-center justify-between gap-3 mb-3 px-1">
                <h2 className="text-xs font-medium text-muted-foreground">
                  Open existing project
                </h2>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 w-40 pl-7 pr-2 text-xs bg-zinc-800/50 border border-zinc-700 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all"
                  />
                </div>
              </div>
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {filteredProjects.map((project) => {
                    const firstLetter = project.name.charAt(0).toUpperCase();
                    const colors = [
                      "bg-red-500",
                      "bg-orange-500",
                      "bg-amber-500",
                      "bg-yellow-500",
                      "bg-lime-500",
                      "bg-green-500",
                      "bg-emerald-500",
                      "bg-teal-500",
                      "bg-cyan-500",
                      "bg-sky-500",
                      "bg-blue-500",
                      "bg-indigo-500",
                      "bg-violet-500",
                      "bg-purple-500",
                      "bg-fuchsia-500",
                      "bg-pink-500",
                      "bg-rose-500",
                    ];
                    const colorIndex = firstLetter.charCodeAt(0) % colors.length;
                    const avatarColor = colors[colorIndex];

                    return (
                      <div
                        key={project.id}
                        className="group cursor-pointer bg-zinc-800/40 hover:bg-zinc-800/70 rounded-md p-2.5 transition-colors"
                        onClick={() => handleProjectClick(project)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`size-6 rounded ${avatarColor} flex items-center justify-center text-white font-medium text-xs shrink-0`}
                          >
                            {firstLetter}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-xs text-foreground truncate">
                              {project.name}
                            </h3>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {project.cwd.split("/").slice(-2).join("/")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No projects found matching "{searchQuery}"
                  </p>
                </div>
              )}
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
