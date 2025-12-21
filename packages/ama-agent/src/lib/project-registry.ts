import fs from "fs";
import path from "path";
import { AMA_DIR } from "../constant";

interface RegisteredProject {
    id: string;
    cwd: string;
    name: string;
    active: boolean;
}

const REGISTRY_FILE = path.join(AMA_DIR, 'projects.json');

class ProjectRegistry {
    private projects = new Map<string, RegisteredProject>();

    constructor() {
        this.load();
    }

    private load() {
        try {
            if (fs.existsSync(REGISTRY_FILE)) {
                const data = fs.readFileSync(REGISTRY_FILE, 'utf8');
                const parsed = JSON.parse(data);
                
                if (!Array.isArray(parsed)) {
                    console.error('Invalid project registry format: expected array, got', typeof parsed);
                    const backupFile = REGISTRY_FILE + '.backup.' + Date.now();
                    fs.copyFileSync(REGISTRY_FILE, backupFile);
                    fs.unlinkSync(REGISTRY_FILE);
                    return;
                }
                
                const projects = parsed as RegisteredProject[];
                this.projects.clear();
                projects.forEach(project => {
                    if (project && typeof project === 'object' && project.id && project.cwd) {
                        this.projects.set(project.id, project);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load project registry:', error);
            if (fs.existsSync(REGISTRY_FILE)) {
                try {
                    const backupFile = REGISTRY_FILE + '.backup.' + Date.now();
                    fs.copyFileSync(REGISTRY_FILE, backupFile);
                    fs.unlinkSync(REGISTRY_FILE);
                    console.log('Corrupted registry file backed up and removed. Starting fresh.');
                } catch (backupError) {
                    // Ignore backup errors
                }
            }
        }
    }

    private save() {
        try {
            if (!fs.existsSync(AMA_DIR)) {
                fs.mkdirSync(AMA_DIR, { recursive: true });
            }
            const projects = Array.from(this.projects.values());
            fs.writeFileSync(REGISTRY_FILE, JSON.stringify(projects, null, 2), 'utf8');
        } catch (error) {
            console.error('Failed to save project registry:', error);
        }
    }

    register(projectId: string, cwd: string, name?: string): void {
        const normalizedCwd = path.normalize(path.resolve(cwd));
        this.projects.set(projectId, {
            id: projectId,
            cwd: normalizedCwd,
            name: name || path.basename(normalizedCwd),
            active: true,
        });
        this.save();
    }

    unregister(projectId: string): void {
        this.projects.delete(projectId);
        this.save();
    }

    getProjectCwd(projectId: string): string | null {
        const project = this.projects.get(projectId);
        return project?.cwd || null;
    }

    isPathAllowed(projectId: string, targetPath: string): boolean {
        const projectCwd = this.getProjectCwd(projectId);
        if (!projectCwd) {
            return false;
        }
        return isPathWithinProject(targetPath, projectCwd);
    }

    list(): RegisteredProject[] {
        return Array.from(this.projects.values());
    }

    getProject(projectId: string): RegisteredProject | null {
        return this.projects.get(projectId) || null;
    }
}

// Export singleton instance
export const projectRegistry = new ProjectRegistry();

// Export helper function for path validation
export function isPathWithinProject(filePath: string, projectCwd: string): boolean {
    try {
        const resolved = path.resolve(projectCwd, filePath);
        const normalized = path.normalize(resolved);
        const normalizedCwd = path.normalize(projectCwd);
        return normalized.startsWith(normalizedCwd);
    } catch {
        return false;
    }
}

