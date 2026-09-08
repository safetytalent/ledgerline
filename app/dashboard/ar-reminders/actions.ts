"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";

async function currentUserId(): Promise<string> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "unknown";
}

/**
 * The human checkpoint for the AR Nudge Agent — per the ops spec,
 * "Always — every send needs human approval." A bookkeeper sends the
 * drafted reminder through their own email, then marks it sent here.
 * This app never emails a client on its own.
 */
export async function markReminderSent(reminderId: string) {
  const userId = await currentUserId();
  if (userId === "unknown") {
    throw new Error("Marking a reminder as sent requires a signed-in user.");
  }

  await prisma.arReminderDraft.update({
    where: { id: reminderId },
    data: { status: "SENT", sentBy: userId, sentAt: new Date() },
  });

  await prisma.approval.create({
    data: { userId, actionType: "MARK_REMINDER_SENT", recordId: reminderId },
  });

  revalidatePath("/dashboard/ar-reminders");
}
