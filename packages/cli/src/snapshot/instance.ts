import { Context } from "../lib/context"

interface Context {
    directory: string
    worktree: string
    project: string
  }
const context = Context.create<Context>("instance")
export namespace Instance {
   export function getProject() {
        return context.use().project
    }
}