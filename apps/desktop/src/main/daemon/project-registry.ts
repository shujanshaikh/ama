import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

interface RegisteredProject {
  id: string;
  cwd: string;
  name: string;
  active: boolean;
}

const AMA_DESKTOP_DIR = path.join(homedir(), ".ama-desktop");
const REGISTRY_FILE = path.join(AMA_DESKTOP_DIR, "projects.json");

class ProjectRegistry {
  private projects = new Map<string, RegisteredProject>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(REGISTRY_FILE)) {
        const data = fs.readFileSync(REGISTRY_FILE, "utf8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.projects.clear();
          for (const project of parsed) {
            if (project?.id && project?.cwd) {
              this.projects.set(project.id, project);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load project registry:", error);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(AMA_DESKTOP_DIR)) {
        fs.mkdirSync(AMA_DESKTOP_DIR, { recursive: true });
      }
      const projects = Array.from(this.projects.values());
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(projects, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to save project registry:", error);
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
    return this.projects.get(projectId)?.cwd || null;
  }

  list(): RegisteredProject[] {
    return Array.from(this.projects.values());
  }

  getProject(projectId: string): RegisteredProject | null {
    return this.projects.get(projectId) || null;
  }
}

export const projectRegistry = new ProjectRegistry();
