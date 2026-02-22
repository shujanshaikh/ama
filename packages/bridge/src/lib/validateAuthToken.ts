import type { WorkerBindings } from "@/env";

export async function validateAuthToken(token: string, env: WorkerBindings): Promise<boolean> {
  try {
    if (!env.WORKOS_CLIENT_ID) return false;

    const response = await fetch("https://api.workos.com/user_management/authorize/device", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({
        client_id: env.WORKOS_CLIENT_ID,
      }),
    });

    if (!response.ok) {
      return false;
    }

    await response.json();
    return true;
  } catch {
    return false;
  }
}
