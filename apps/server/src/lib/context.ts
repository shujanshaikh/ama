import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  token: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getToken = (): string => {
  const ctx = requestContext.getStore();
  if (!ctx?.token) {
    throw new Error("No token in request context");
  }
  return ctx.token;
};

