"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleCloseTask(
  clientId: string,
  month: string,
  taskLabel: string,
  done: boolean
) {
  await prisma.closeTask.upsert({
    where: { clientId_month_taskLabel: { clientId, month, taskLabel } },
    create: { clientId, month, taskLabel, done, doneAt: done ? new Date() : null },
    update: { done, doneAt: done ? new Date() : null },
  });
  revalidatePath("/dashboard/close-checklist");
}
