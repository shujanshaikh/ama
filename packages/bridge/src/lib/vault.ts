import type { WorkerBindings } from "@/env";

function vaultObjectName(userId: string): string {
  return `byok-gateway-${userId}`;
}

export async function readGatewayKeyFromVault(
  env: WorkerBindings,
  userId: string,
): Promise<string | null> {
  const apiKey = env.WORKOS_API_KEY;
  if (!apiKey) throw new Error("WORKOS_API_KEY is not set");

  const name = vaultObjectName(userId);
  const response = await fetch(
    `https://api.workos.com/vault/v1/kv/name/${encodeURIComponent(name)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to read vault object: ${response.status} ${body}`);
  }

  const object = (await response.json()) as { value?: string | null };
  return object.value ?? null;
}
