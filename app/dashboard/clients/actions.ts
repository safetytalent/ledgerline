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
