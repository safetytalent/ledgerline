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
