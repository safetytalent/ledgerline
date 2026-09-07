"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { EntityType } from "@/lib/taxRequirements";

export async function setEntityType(clientId: string, entityType: EntityType) {
  await prisma.client.update({
    where: { id: clientId },
    data: { entityType },
  });
  revalidatePath("/dashboard/tax-prep");
}

export async function addOwner(clientId: string, name: string, ownershipPercent: number) {
  if (!name.trim()) return;
  await prisma.clientOwner.create({
    data: { clientId, name: name.trim(), ownershipPercent },
  });
  revalidatePath("/dashboard/tax-prep");
}

export async function removeOwner(ownerId: string) {
  await prisma.clientOwner.delete({ where: { id: ownerId } });
  revalidatePath("/dashboard/tax-prep");
}

export async function tagDocumentType(documentId: string, docType: string) {
  await prisma.document.update({
    where: { id: documentId },
    data: { docType },
  });
  revalidatePath("/dashboard/tax-prep");
}
