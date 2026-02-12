import { TRPC_URL } from "./constants";

// Simple fetch-based API helpers. Avoids tRPC client type coupling with the server.
// tRPC is served by the web app at /api/trpc, not the API server.
export const api = {
  async getProjects() {
    const res = await fetch(`${TRPC_URL}/api/trpc/project.getProjects`, {
      credentials: "include",
    });
    const data = await res.json();
    return (data?.result?.data ?? []) as any[];
  },

  async createProject(input: { name: string; cwd: string; gitRepo?: string }) {
    const res = await fetch(`${TRPC_URL}/api/trpc/project.createProject`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, gitRepo: input.gitRepo ?? "" }),
    });
    const data = await res.json();
    return data?.result?.data as any;
  },

  async getChats(projectId: string) {
    const res = await fetch(
      `${TRPC_URL}/api/trpc/chat.getChats?input=${encodeURIComponent(JSON.stringify({ projectId }))}`,
      { credentials: "include" },
    );
    const data = await res.json();
    return (data?.result?.data ?? []) as any[];
  },

  async getProject(projectId: string) {
    const res = await fetch(
      `${TRPC_URL}/api/trpc/project.getProject?input=${encodeURIComponent(JSON.stringify({ projectId }))}`,
      { credentials: "include" },
    );
    const data = await res.json();
    return data?.result?.data as any;
  },

  async createChat(projectId: string, title?: string) {
    const res = await fetch(`${TRPC_URL}/api/trpc/chat.createChat`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title }),
    });
    const data = await res.json();
    return data?.result?.data as any;
  },

  async getMessages(chatId: string) {
    const res = await fetch(
      `${TRPC_URL}/api/trpc/chat.getMessages?input=${encodeURIComponent(JSON.stringify({ chatId }))}`,
      { credentials: "include" },
    );
    const data = await res.json();
    return (data?.result?.data ?? []) as any[];
  },

  async generateTitle(input: { chatId: string; message: string }) {
    const res = await fetch(
      `${TRPC_URL}/api/trpc/generateTitle.generateTitle`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const data = await res.json();
    return data?.result?.data as any;
  },

  async getGatewayToken() {
    const res = await fetch(`${TRPC_URL}/api/trpc/apiKeys.getGatewayToken`, {
      credentials: "include",
    });
    const data = await res.json();
    return (data?.result?.data?.token ?? null) as string | null;
  },

  async hasApiKey() {
    const res = await fetch(`${TRPC_URL}/api/trpc/apiKeys.getKeyStatus`, {
      credentials: "include",
    });
    const data = await res.json();
    return (data?.result?.data?.hasKey === true) as boolean;
  },

  async saveApiKey(key: string) {
    const res = await fetch(`${TRPC_URL}/api/trpc/apiKeys.saveKey`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key }),
    });
    const data = await res.json();
    return data?.result?.data as any;
  },

  async deleteApiKey() {
    const res = await fetch(`${TRPC_URL}/api/trpc/apiKeys.deleteKey`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data?.result?.data as any;
  },
};
