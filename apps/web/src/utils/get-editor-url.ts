import { trpc } from "@/router";
import { useQuery } from "@tanstack/react-query";

export function getEditorUrl(projectId: string) {
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