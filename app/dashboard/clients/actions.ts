"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateClientServices(clientId: string, services: string[]) {
  await prisma.client.update({
    where: { id: clientId },
    data: { activeServices: services },
  });
  revalidatePath("/dashboard/clients");
}

export async function createClient(name: string) {
  if (!name.trim()) return;

  // Attach to whatever Location already exists — real multi-location
  // support is Phase 4 (franchise), so for now every new client goes
  // to the first Location on file.
  const location = await prisma.location.findFirst();
  if (!location) {
    throw new Error("No Location exists yet — this shouldn't happen if seed data ran.");
  }

  await prisma.client.create({
    data: { name: name.trim(), locationId: location.id },
  });
  revalidatePath("/dashboard/clients");
}

/**
 * Permanently removes a client and everything tied to it — every
 * transaction, document, tax draft, invoice, and reminder. There is
 * no undo. Deletes child records first in dependency order since
 * nothing in this schema cascades automatically; the whole thing
 * runs as one transaction so it either fully succeeds or leaves
 * nothing partially deleted.
 *
 * Note: this removes the database rows only — any files already
 * uploaded to Supabase Storage for this client are not deleted here.
 */
export async function deleteClient(clientId: string) {
  await prisma.$transaction([
    prisma.arReminderDraft.deleteMany({ where: { invoice: { clientId } } }),
    prisma.invoice.deleteMany({ where: { clientId } }),
    prisma.formInstance.deleteMany({ where: { clientId } }),
    prisma.taxReturnDraft.deleteMany({ where: { clientId } }),
    prisma.clientOwner.deleteMany({ where: { clientId } }),
    prisma.document.deleteMany({ where: { clientId } }),
    prisma.closeTask.deleteMany({ where: { clientId } }),
    prisma.correctionMemory.deleteMany({ where: { clientId } }),
    prisma.transaction.deleteMany({ where: { clientId } }),
    prisma.subscription.deleteMany({ where: { clientId } }),
    prisma.qboConnection.deleteMany({ where: { clientId } }),
    prisma.client.delete({ where: { id: clientId } }),
  ]);
  revalidatePath("/dashboard/clients");
}
