import { WorkOS } from "@workos-inc/node";

let workosInstance: WorkOS | null = null;

function getWorkOS(): WorkOS {
  if (!workosInstance) {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) throw new Error("WORKOS_API_KEY is not set");
    workosInstance = new WorkOS(apiKey);
  }
  return workosInstance;
}

function vaultObjectName(userId: string): string {
  return `byok-gateway-${userId}`;
}

async function findVaultObject(
  name: string,
): Promise<{ id: string } | null> {
  const workos = getWorkOS();
  let after: string | undefined;

  do {
    const result = await workos.vault.listObjects(
      after ? { after } : undefined,
    );
    const match = result.data.find((obj) => obj.name === name);
    if (match) return { id: match.id };
    after = result.listMetadata.after;
  } while (after);

  return null;
}

export async function readGatewayKeyFromVault(
  userId: string,
): Promise<string | null> {
  const name = vaultObjectName(userId);
  const existing = await findVaultObject(name);
  if (!existing) return null;

  const workos = getWorkOS();
  const obj = await workos.vault.readObject({ id: existing.id });
  return obj.value ?? null;
}
