import { queryOptions, useQuery, useMutation } from "@tanstack/react-query";
import * as React from "react";
import { LayoutGrid, List, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/utils/trpc";
import { useNavigate } from "@tanstack/react-router";

type IdeProject = {
  name: string;
  path: string;
  ide?: string;
  type?: string;
};

function projectInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0]?.toUpperCase() ?? "?";
}

function projectAccentClass(key: string) {
  // Deterministic-ish, stable per project.
  const palettes = [
    "bg-blue-600/20 text-blue-200 ring-blue-500/20",
    "bg-pink-600/20 text-pink-200 ring-pink-500/20",
    "bg-amber-600/20 text-amber-200 ring-amber-500/20",
    "bg-emerald-600/20 text-emerald-200 ring-emerald-500/20",
    "bg-violet-600/20 text-violet-200 ring-violet-500/20",
    "bg-cyan-600/20 text-cyan-200 ring-cyan-500/20",
  ];

  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length]!;
}

function subtitleForProject(p: IdeProject) {
  const t = (p.type ?? p.ide ?? "").toLowerCase();
  if (t.includes("cursor")) return "New Chat";
  if (t.includes("vscode")) return "Open in VS Code";
  if (t.includes("claude")) return "Open in Claude";
  return "Open";
}

export function IdeProjects() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const { data: ideProjects, isLoading } = useQuery(
    queryOptions({
      queryKey: ["ide-projects"],
      queryFn: async () => {
        const response = await fetch(`http://localhost:3456/ide-projects`);
        return response.json();
      },
    })
  );

  const { mutateAsync: createProject } = useMutation({
    ...trpc.project.createProject.mutationOptions(),
  });

  const projects: IdeProject[] = ideProjects?.projects ?? [];
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [creatingProjectId, setCreatingProjectId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const n = (p.name ?? "").toLowerCase();
      const path = (p.path ?? "").toLowerCase();
      return n.includes(q) || path.includes(q);
    });
  }, [projects, search]);

  const suggestedProjects = filtered;

  const handleCreateProject = async (project: IdeProject) => {
    setCreatingProjectId(project.path);
    try {
      const newProject = await createProject({
        name: project.name,
        cwd: project.path,
        gitRepo: "", // Empty for now, can be updated later
      });
      
      if (newProject?.id) {
        navigate({
          to: '/chat/$projectId',
          params: { projectId: newProject.id },
          search: { chat: "" },
        });
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreatingProjectId(null);
    }
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-medium text-foreground/90">Open existing project</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" disabled>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9" disabled>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            value=""
            placeholder="Search projects"
            className="h-10 rounded-md pl-9 bg-card/40"
            disabled
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground/60 text-sm py-6 rounded-md border border-border bg-card/30">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground/70 rounded-full animate-spin" />
          Scanning...
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-medium text-foreground/90">Suggested projects</h2>

        <div className="flex items-center gap-1 rounded-md border border-border bg-card/30 p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn("rounded-lg", view === "grid" && "bg-muted/60")}
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn("rounded-lg", view === "list" && "bg-muted/60")}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects"
          className="h-10 rounded-xl pl-9 bg-card/40"
        />
      </div>

      <div
        className={cn(
          view === "grid"
            ? "grid grid-cols-2 gap-3"
            : "flex flex-col gap-2"
        )}
      >
        {suggestedProjects.map((project) => (
          <div
            key={project.path}
            className="group rounded-md border border-border bg-card/30 hover:bg-muted/40 transition-colors p-3"
          >
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  "size-7 rounded-md flex items-center justify-center text-xs font-semibold ring-1",
                  projectAccentClass(project.path)
                )}
              >
                {projectInitial(project.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-foreground/90 truncate">
                    {project.name}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 rounded-md shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateProject(project);
                    }}
                    disabled={creatingProjectId === project.path}
                  >
                    {creatingProjectId === project.path ? (
                      <div className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground/70 rounded-full animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground/70">
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-3 rounded-full border border-muted-foreground/30" />
                <span className="truncate">{subtitleForProject(project)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}