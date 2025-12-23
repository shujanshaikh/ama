import { queryOptions, useQuery, useMutation } from "@tanstack/react-query";
import * as React from "react";
import { LayoutGrid, List, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  // Deterministic-ish, stable per project - simplified for minimalistic look
  const palettes = [
    "bg-muted text-muted-foreground",
    "bg-muted text-muted-foreground",
    "bg-muted text-muted-foreground",
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
  const [currentPage, setCurrentPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const n = (p.name ?? "").toLowerCase();
      const path = (p.path ?? "").toLowerCase();
      return n.includes(q) || path.includes(q);
    });
  }, [projects, search]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const itemsPerPage = view === "grid" ? 6 : 10;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const suggestedProjects = filtered.slice(startIndex, endIndex);

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
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>

        <div className="relative mb-3">
          <Skeleton className="h-10 rounded-lg" />
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-6">
          <Skeleton className="h-4 w-4 rounded-full" />
          <span>Scanning...</span>
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
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Suggested projects
        </h2>

        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn("rounded-md", view === "grid" && "bg-muted")}
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn("rounded-md", view === "list" && "bg-muted")}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects"
          className="h-10 rounded-lg pl-9"
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
          <Card
            key={project.path}
            className="group cursor-pointer hover:border-border transition-colors p-3"
          >
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  "size-7 rounded-md flex items-center justify-center text-xs font-medium",
                  projectAccentClass(project.path)
                )}
              >
                {projectInitial(project.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-foreground truncate">
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
                      <div className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{subtitleForProject(project)}</span>
            </div>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage((prev) => Math.max(1, prev - 1));
            }}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
          />
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage((prev) => Math.min(totalPages, prev + 1));
            }}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </div>
      )}
    </section>
  );
}