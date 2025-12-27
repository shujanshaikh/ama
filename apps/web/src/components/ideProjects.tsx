import { useQuery, useMutation } from "@tanstack/react-query";
import * as React from "react";
import { Plus, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/utils/trpc";
import { useNavigate } from "@tanstack/react-router";
import { useUserStreamContextOptional } from "@/components/user-stream-provider";

type IdeProject = {
  name: string;
  path: string;
  ide?: string;
  type?: string;
};

const ITEMS_PER_PAGE = 8;

export function IdeProjects() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const userStream = useUserStreamContextOptional();

  const { data: ideProjects, isLoading, error } = useQuery({
    queryKey: ["ide-projects", userStream?.cliConnected],
    queryFn: async () => {
      if (!userStream?.rpc) {
        throw new Error('RPC not available');
      }
      return await userStream.rpc.getIdeProjects();
    },
    enabled: userStream?.cliConnected ?? false,
    retry: false,
    staleTime: 30000,
  });

  const { mutateAsync: createProject } = useMutation({
    ...trpc.project.createProject.mutationOptions(),
  });

  const projects: IdeProject[] = ideProjects?.projects ?? [];
  const [creatingProjectId, setCreatingProjectId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProjects = projects.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleCreateProject = async (project: IdeProject) => {
    setCreatingProjectId(project.path);
    try {
      const newProject = await createProject({
        name: project.name,
        cwd: project.path,
        gitRepo: "",
      });

      if (newProject?.id) {
        if (userStream?.cliConnected && userStream?.rpc) {
          try {
            await userStream.rpc.registerProject(newProject.id, project.path, project.name);
          } catch (rpcError) {
            console.warn('Failed to register project with CLI:', rpcError);
          }
        }

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

  if (!userStream?.cliConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="mb-8">
        <div className="mb-2">
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-neutral-800 px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 text-neutral-500 text-sm py-6">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load projects</span>
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-sm font-medium text-neutral-200 mb-0.5">
          Suggested
        </h2>
        <p className="text-xs text-neutral-500">
          Based on folders you recently opened in Claude Code or VSCode
        </p>
      </div>

      <div className="grid grid-cols-2">
        {paginatedProjects.map((project) => (
          <div
            key={project.path}
            className="flex items-center justify-between border border-neutral-800 px-4 py-2.5 -mt-px -ml-px first:mt-0 first:ml-0"
          >
            <span className="text-sm text-neutral-300 truncate pr-3">
              {project.name}
            </span>
            <button
              type="button"
              onClick={() => handleCreateProject(project)}
              disabled={creatingProjectId === project.path}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors shrink-0 disabled:opacity-50"
            >
              {creatingProjectId === project.path ? (
                <div className="w-3 h-3 border border-neutral-500 border-t-neutral-300 rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Import</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>
          <span className="text-xs text-neutral-600">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}