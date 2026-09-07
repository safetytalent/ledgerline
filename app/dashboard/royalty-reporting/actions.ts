"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addRoyaltyReport(
  locationId: string,
  periodEnd: string,
  revenue: number,
  royaltyRatePercent: number
) {
  const royaltyDue = revenue * (royaltyRatePercent / 100);
  await prisma.royaltyReport.create({
    data: {
      locationId,
      periodEnd: new Date(periodEnd),
      revenue,
      royaltyDue,
    },
  });
  revalidatePath("/dashboard/royalty-reporting");
}
