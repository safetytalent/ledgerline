import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const firm = await prisma.firm.create({
    data: { name: "Sierra Business & Tax Services" }, // placeholder — update when the name is final
  });

  const location = await prisma.location.create({
    data: { firmId: firm.id, name: "Houston TX3", territory: "Greater Houston" },
  });

  const clientA = await prisma.client.create({
    data: { locationId: location.id, name: "Sierra Construction" },
  });

  const clientB = await prisma.client.create({
    data: { locationId: location.id, name: "Infinite Field Services" },
  });

  // Seed one confirmed correction so the categorization agent has
  // something in memory to demonstrate the "learning" behavior against.
  await prisma.correctionMemory.create({
    data: {
      clientId: clientA.id,
      vendorName: "Gulf Coast Equipment Rental",
      correctCategory: "Job Expense",
      jobOrCostCode: "Job 4412",
      timesConfirmed: 1,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        clientId: clientA.id,
        qboTxnId: "seed-1",
        vendorName: "Gulf Coast Equipment Rental",
        amount: 4280,
        txnDate: new Date("2026-09-03"),
        suggestedCategory: "Job 4412",
        confidenceScore: 41,
        reasoning:
          "First transaction from this vendor for Sierra Construction. Similar amount/timing to prior Job 4412 entries, but no PO on file to confirm.",
        reviewStatus: "PENDING_REVIEW",
      },
      {
        clientId: clientB.id,
        qboTxnId: "seed-2",
        vendorName: "IRS — Estimated Payment",
        amount: 12500,
        txnDate: new Date("2026-09-02"),
        suggestedCategory: "Estimated Tax Payment",
        confidenceScore: 58,
        reasoning:
          "Amount is 30% higher than this client's typical quarterly estimate. Flagged for confirmation rather than auto-post.",
        reviewStatus: "PENDING_REVIEW",
      },
    ],
  });

  console.log("Seed complete:", { firm: firm.name, location: location.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
