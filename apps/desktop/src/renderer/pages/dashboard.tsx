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
  const [discoveredProjects, setDiscoveredProjects] = useState<
    DiscoveredProject[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const result = await api.getProjects();
      setProjects(Array.isArray(result) ? result : []);
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

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.cwd.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredDiscovered = discoveredProjects.filter(
    (dp) =>
      dp.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !projects.some((p) => p.cwd === dp.path),
  );

  return (
    <div className="relative flex h-screen w-full flex-col bg-background text-foreground">
      <div className="drag-region h-8 flex-shrink-0" />

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

      <div className="flex flex-1 flex-col justify-start px-6 pt-12 pb-2">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-8">
            <h1 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFolder}
                disabled={isCreating}
                className="bg-background shadow-sm transition-none hover:bg-secondary"
              >
                {isCreating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <FolderOpen className="size-3" />
                )}
                Open Folder
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Connect your local project with ama
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="no-drag mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-6 pb-20">
        <hr className="mb-4 border-border" />

        {isLoading ? (
          <section className="mb-8">
            <Skeleton className="mb-3 h-4 w-20" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-md" />
              ))}
            </div>
          </section>
        ) : projects.length > 0 ? (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xs font-medium text-foreground/70">
                Open existing project
              </h2>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 w-64 rounded-md border border-border/50 bg-muted/30 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-border focus:outline-none focus:ring-1 focus:ring-ring/50"
                />
              </div>
            </div>

            {filteredProjects.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group cursor-pointer rounded-md border border-border/50 p-2 transition-all duration-150 hover:border-border hover:bg-muted/20"
                    onClick={() => handleProjectClick(project)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white",
                          getAvatarColor(project.name),
                        )}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-foreground">
                          {project.name}
                        </h3>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {project.cwd.split("/").slice(-2).join("/")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-[11px] text-muted-foreground">
                  No projects found matching "{searchQuery}"
                </p>
              </div>
            )}
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open a project folder to get started
            </p>
          </div>
        )}
  
        {filteredDiscovered.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-medium text-foreground/70">
              Discovered from IDEs
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {filteredDiscovered.map((dp) => (
                <div
                  key={dp.path}
                  className="group cursor-pointer rounded-md border border-dashed border-border/50 p-2 transition-all duration-150 hover:border-border hover:bg-muted/20"
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
                        <h3 className="truncate text-sm font-medium text-foreground/80">
                          {dp.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 text-[9px]"
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
  );
}
