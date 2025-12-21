import os from "os";
import path from "path";
import fs from "fs";

const HOME = os.homedir();

const IDE_PROJECTS_PATHS = {
  vscode: path.join(HOME, ".vscode", "projects"),
  cursor: path.join(HOME, ".cursor", "projects"),
  claude: path.join(HOME, ".claude", "projects"),
};


function getWorkspaceStoragePath(ide: 'cursor' | 'vscode'): string {
    const platform = os.platform();
    const appName = ide === 'cursor' ? 'Cursor' : 'Code';
    
    if (platform === 'darwin') {
        return path.join(HOME, 'Library', 'Application Support', appName, 'User', 'workspaceStorage');
    } else if (platform === 'win32') {
        return path.join(process.env.APPDATA || '', appName, 'User', 'workspaceStorage');
    } else {
        // Linux
        return path.join(HOME, '.config', appName, 'User', 'workspaceStorage');
    }
}


function scanWorkspaceStorage(ide: 'cursor' | 'vscode'): Array<{ name: string; path: string; type: string }> {
    const projects: Array<{ name: string; path: string; type: string }> = [];
    const storagePath = getWorkspaceStoragePath(ide);
    
    if (!fs.existsSync(storagePath)) {
        return projects;
    }
    
    try {
        const workspaces = fs.readdirSync(storagePath);
        
        for (const workspace of workspaces) {
            const workspaceJsonPath = path.join(storagePath, workspace, 'workspace.json');
            
            if (fs.existsSync(workspaceJsonPath)) {
                try {
                    const content = fs.readFileSync(workspaceJsonPath, 'utf-8');
                    const data = JSON.parse(content);
                    
                    if (data.folder && typeof data.folder === 'string') {
                        let projectPath = data.folder;
                        
                        if (projectPath.startsWith('file://')) {
                            projectPath = projectPath.replace('file://', '');
                            projectPath = decodeURIComponent(projectPath);
                        }
                        
                        if (fs.existsSync(projectPath) && fs.statSync(projectPath).isDirectory()) {
                            projects.push({
                                name: path.basename(projectPath),
                                path: projectPath,
                                type: ide,
                            });
                        }
                    }
                } catch (err) {
                    console.debug(`Error reading workspace.json at ${workspaceJsonPath}: ${err}`);
                }
            }
        }
    } catch (err) {
        console.debug(`Error scanning workspaceStorage for ${ide}: ${err}`);
    }
    
    return projects;
}

export const scanIdeProjects = async () => {
    try {
        const allProjects: Array<{ name: string; path: string; type: string }> = [];
        const seenPaths = new Set<string>();
        
        const addProject = (projectPath: string, ide: string) => {
            try {
                const resolvedPath = fs.realpathSync(projectPath);
                if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory() && !seenPaths.has(resolvedPath)) {
                    const isIdeProjectsDir = Object.values(IDE_PROJECTS_PATHS).some(ideDir => {
                        try {
                            return fs.realpathSync(ideDir) === resolvedPath;
                        } catch {
                            return false;
                        }
                    });
                    
                    if (!isIdeProjectsDir) {
                        seenPaths.add(resolvedPath);
                        allProjects.push({
                            name: path.basename(resolvedPath),
                            path: resolvedPath,
                            type: ide,
                        });
                    }
                }
            } catch {
            }
        };
        
        const cursorProjects = scanWorkspaceStorage('cursor');
        for (const project of cursorProjects) {
            addProject(project.path, 'cursor');
        }
        
        // For other IDEs (claude, vscode if using ~/.vscode/projects pattern), use legacy scanning
        for (const [ide, dirPath] of Object.entries(IDE_PROJECTS_PATHS)) {
            // Skip cursor as we handle it via workspaceStorage
            if (ide === 'cursor') continue;
            
            if (fs.existsSync(dirPath)) {
                const projects = fs.readdirSync(dirPath);
                projects.forEach(project => {
                    const projectPath = path.join(dirPath, project);
                    try {
                        const stats = fs.lstatSync(projectPath);
                        let actualPath: string | null = null;
                        
                        if (stats.isSymbolicLink()) {
                            actualPath = fs.realpathSync(projectPath);
                        } else if (stats.isFile()) {
                            try {
                                let content = fs.readFileSync(projectPath, 'utf-8').trim();
                                
                                if (content.startsWith('~/') || content === '~') {
                                    content = content.replace(/^~/, HOME);
                                }
                                
                                const resolvedContent = path.isAbsolute(content) 
                                    ? content 
                                    : path.resolve(path.dirname(projectPath), content);
                                
                                if (fs.existsSync(resolvedContent) && fs.statSync(resolvedContent).isDirectory()) {
                                    actualPath = fs.realpathSync(resolvedContent);
                                }
                            } catch {
                                return;
                            }
                        } else if (stats.isDirectory()) {
                            actualPath = fs.realpathSync(projectPath);
                        }
                        
                        if (actualPath) {
                            addProject(actualPath, ide);
                        }
                    } catch {
                        // Skip invalid entries
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