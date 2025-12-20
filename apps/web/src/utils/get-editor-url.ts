
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "./trpc";

export function getEditorUrl(projectId: string) {
  const trpc = useTRPC();
    const { data: projectData } = useQuery({
        ...trpc.project.getProject.queryOptions({ projectId }),
        enabled: !!projectId,
      });
    
      // Build editor URL with folder parameter
      const editorUrl = projectData && 'cwd' in projectData 
        ? `http://localhost:8081/?folder=${encodeURIComponent(projectData.cwd as string)}`
        : 'http://localhost:8081';

    return editorUrl;
}