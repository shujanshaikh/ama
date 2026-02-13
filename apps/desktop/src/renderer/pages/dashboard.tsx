import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";
import { api } from "../lib/trpc";
import { cn } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AmaLogo } from "@/components/ama-logo";
import {
  Search,
  FolderOpen,
  Plus,
  LogOut,
  Monitor,
  Loader2,
  Download,
  LayoutGrid,
  List,
  MessageSquare,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  cwd: string;
  userId: string;
  createdAt: string;
}

interface DiscoveredProject {
  name: string;
  path: string;
  ide: string;
}

const AVATAR_COLORS = [
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

function getAvatarColor(name: string): string {
  const firstLetter = name.charAt(0).toUpperCase();
  const colorIndex = firstLetter.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex];
}

const IDE_LABELS: Record<string, string> = {
  vscode: "VS Code",
  cursor: "Cursor",
  webstorm: "WebStorm",
  zed: "Zed",
};

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectChats, setProjectChats] = useState<
    Record<string, { title: string; createdAt: string }[]>
  >({});
  const [discoveredProjects, setDiscoveredProjects] = useState<
    DiscoveredProject[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchProjects = useCallback(async () => {
    try {
      const result = await api.getProjects();
      const projectList = Array.isArray(result) ? result : [];
      setProjects(projectList);

      const chatResults: Record<string, { title: string; createdAt: string }[]> = {};
      await Promise.all(
        projectList.map(async (p: Project) => {
          try {
            const chats = await api.getChats(p.id);
            if (chats?.length > 0) {
              chatResults[p.id] = chats.map((c: any) => ({
                title: c.title || c.name || "Untitled",
                createdAt: c.createdAt,
              }));
            }
          } catch {}
        }),
      );
      setProjectChats(chatResults);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const discoverProjects = useCallback(async () => {
    try {
      const discovered = await window.electronAPI.projects.discover();
      setDiscoveredProjects(discovered);
    } catch (error) {
      console.error("Failed to discover projects:", error);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    discoverProjects();
  }, [fetchProjects, discoverProjects]);

  const handleProjectClick = (project: Project) => {
    navigate(`/chat/${project.id}`);
  };

  const handleDiscoveredProjectClick = async (dp: DiscoveredProject) => {
    setIsCreating(true);
    try {
      const existing = projects.find((p) => p.cwd === dp.path);
      if (existing) {
        navigate(`/chat/${existing.id}`);
        return;
      }
      const created = await api.createProject({ name: dp.name, cwd: dp.path });
      if (created?.id) {
        navigate(`/chat/${created.id}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenFolder = async () => {
    const folderPath = await window.electronAPI.projects.selectFolder();
    if (!folderPath) return;

    setIsCreating(true);
    try {
      const name = folderPath.split("/").pop() || "Project";
      const existing = projects.find((p) => p.cwd === folderPath);
      if (existing) {
        navigate(`/chat/${existing.id}`);
        return;
      }
      const created = await api.createProject({ name, cwd: folderPath });
      if (created?.id) {
        navigate(`/chat/${created.id}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cwd.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredDiscovered = discoveredProjects.filter(
    (dp) =>
      dp.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !projects.some((p) => p.cwd === dp.path),
  );

  function timeAgo(dateStr: string) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="relative flex h-screen w-full flex-col bg-background text-foreground">
      <div className="drag-region h-8 flex-shrink-0" />

      {/* Top bar */}
      <div className="no-drag absolute left-6 top-8 flex items-center gap-2">
        <AmaLogo size={24} />
        <span className="text-xl font-bold tracking-tight text-foreground">
          ama
        </span>
      </div>

      <div className="no-drag absolute right-6 top-8 flex items-center gap-2">
        <div className="rounded-full border border-border/30 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground/70">
          {user?.email || user?.firstName || "User"}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={signOut}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-3.5" />
        </Button>
      </div>

      {/* Main content */}
      <div className="no-drag flex flex-1 flex-col overflow-y-auto pt-12 pb-12">
        <div className="mx-auto w-full max-w-[600px] px-6">
          {/* Welcome */}
          <h1 className="mb-3 text-[13px] font-semibold tracking-tight text-foreground">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>

          {/* Action cards */}
          <div className="mb-6 flex gap-2.5">
            <button
              onClick={handleOpenFolder}
              disabled={isCreating}
              className="flex w-36 cursor-pointer flex-col gap-3 rounded-md border border-border/50 bg-card px-3 pb-2.5 pt-3 text-left transition-colors hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <FolderOpen className="size-4 text-muted-foreground" />
              )}
              <span className="text-xs font-medium text-foreground">
                Open folder
              </span>
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("discovered-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex w-36 cursor-pointer flex-col gap-3 rounded-md border border-border/50 bg-card px-3 pb-2.5 pt-3 text-left transition-colors hover:bg-muted/30"
            >
              <Download className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                Import from suggested
              </span>
            </button>
          </div>

          {/* Open existing project heading */}
          <h2 className="mb-2 text-xs font-medium text-foreground/70">
            Open existing project
          </h2>

          {/* Search bar + view toggle */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-full rounded-md border border-border/50 bg-muted/30 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-ring focus:outline-none"
              />
            </div>
            <div className="flex items-center overflow-hidden rounded-md border border-border/50">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex size-7 items-center justify-center transition-colors",
                  viewMode === "grid"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="size-3" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex size-7 items-center justify-center border-l border-border/50 transition-colors",
                  viewMode === "list"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-3" />
              </button>
            </div>
          </div>

          {/* Project cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[76px] rounded-md" />
              ))}
            </div>
          ) : filteredProjects.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredProjects.map((project) => {
                  const chats = projectChats[project.id];
                  const latestChat = chats?.[0];
                  return (
                    <div
                      key={project.id}
                      className="group cursor-pointer rounded-md border border-border/50 bg-card p-2.5 transition-colors hover:bg-muted/20"
                      onClick={() => handleProjectClick(project)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white",
                            getAvatarColor(project.name),
                          )}
                        >
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-xs font-semibold text-foreground">
                            {project.name}
                          </h3>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {project.cwd.split("/").slice(-2).join("/")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 border-t border-border/30 pt-1.5">
                        {latestChat ? (
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex min-w-0 items-center gap-1">
                              <MessageSquare className="size-2.5 shrink-0 text-muted-foreground/40" />
                              <span className="truncate text-[10px] text-muted-foreground/70">
                                {latestChat.title}
                              </span>
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground/40">
                              {timeAgo(latestChat.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/40">
                            No chats yet
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredProjects.map((project) => {
                  const chats = projectChats[project.id];
                  const latestChat = chats?.[0];
                  return (
                    <div
                      key={project.id}
                      className="group flex cursor-pointer items-center gap-2 rounded-md border border-border/50 bg-card px-2.5 py-2 transition-colors hover:bg-muted/20"
                      onClick={() => handleProjectClick(project)}
                    >
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white",
                          getAvatarColor(project.name),
                        )}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-xs font-semibold text-foreground">
                          {project.name}
                        </h3>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {project.cwd.split("/").slice(-2).join("/")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {latestChat ? (
                          <span className="text-[10px] text-muted-foreground/40">
                            {timeAgo(latestChat.createdAt)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">
                            No chats yet
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : projects.length > 0 ? (
            <div className="py-6 text-center">
              <p className="text-[11px] text-muted-foreground">
                No projects found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-xs text-muted-foreground">No projects yet</p>
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                Open a project folder to get started
              </p>
            </div>
          )}

          {/* Discovered from IDEs */}
          {filteredDiscovered.length > 0 && (
            <section id="discovered-section" className="mt-6">
              <h2 className="mb-2 text-xs font-medium text-foreground/70">
                Discovered from IDEs
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {filteredDiscovered.map((dp) => (
                  <div
                    key={dp.path}
                    className="group cursor-pointer rounded-md border border-dashed border-border/50 bg-card/60 p-2.5 transition-colors hover:bg-muted/20"
                    onClick={() =>
                      !isCreating && handleDiscoveredProjectClick(dp)
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded bg-secondary">
                        <Monitor className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-xs font-medium text-foreground/80">
                            {dp.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="px-1 py-0 text-[8px]"
                          >
                            {IDE_LABELS[dp.ide] || dp.ide}
                          </Badge>
                        </div>
                        <p className="truncate text-[10px] text-muted-foreground/60">
                          {dp.path}
                        </p>
                      </div>
                      <Plus className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
