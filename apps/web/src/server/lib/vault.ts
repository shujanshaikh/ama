import { getWorkOS } from "@/authkit/ssr/workos";

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

export async function storeGatewayKey(
  userId: string,
  apiKey: string,
): Promise<string> {
  const name = vaultObjectName(userId);
  const workos = getWorkOS();

  const existing = await findVaultObject(name);
  if (existing) {
    await workos.vault.updateObject({ id: existing.id, value: apiKey });
    return existing.id;
  }

  const metadata = await workos.vault.createObject({
    name,
    value: apiKey,
    context: { userId },
  });
  return metadata.id;
}

export async function deleteGatewayKey(userId: string): Promise<boolean> {
  const name = vaultObjectName(userId);
  const existing = await findVaultObject(name);
  if (!existing) return false;

  const workos = getWorkOS();
  await workos.vault.deleteObject({ id: existing.id });
  return true;
}

export async function hasGatewayKey(userId: string): Promise<boolean> {
  const name = vaultObjectName(userId);
  const existing = await findVaultObject(name);
  return existing !== null;
}
