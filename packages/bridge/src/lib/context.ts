// Worker runtime shim. Tool execution now uses explicit request context.
export interface RequestContext {
  token: string;
  projectId?: string;
  projectCwd?: string;
}

export const requestContext = {
  run: async <T>(_ctx: RequestContext, fn: () => Promise<T>): Promise<T> => fn(),
};

export const getToken = (): string => {
  throw new Error("getToken is not supported in Worker runtime");
};

export const getProjectInfo = (): { projectId?: string; projectCwd?: string } => ({
  projectId: undefined,
  projectCwd: undefined,
});
