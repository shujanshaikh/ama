import os from "os";
import path from "path";
import fs from "fs";

const HOME = os.homedir();

const IDE_PROJECTS_PATHS = {
  vscode: path.join(HOME, ".vscode", "projects"),
  cursor: path.join(HOME, ".cursor", "projects"),
  claude: path.join(HOME, ".claude", "projects"),
};

export const scanIdeProjects = async () => {
    try {
        const allProjects: Array<{ name: string; path: string; type: string }> = [];
        const seenPaths = new Set<string>();
        
        for (const [ide, dirPath] of Object.entries(IDE_PROJECTS_PATHS)) {
            if (fs.existsSync(dirPath)) {
                const projects = fs.readdirSync(dirPath);
                projects.forEach(project => {
                    const projectPath = path.join(dirPath, project);
                    if (!seenPaths.has(projectPath)) {
                        seenPaths.add(projectPath);
                        const projectName = path.basename(projectPath);
                        allProjects.push({
                            name: projectName,
                            path: projectPath,
                            type: ide,
                        });
                    }
                });
            }
        }
        
        return allProjects;
    } catch (error) {
        console.debug(`Error scanning IDE projects: ${error}`);
        return [];
    }
}