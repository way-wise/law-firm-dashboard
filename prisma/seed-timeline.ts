import prisma from "../lib/prisma";

/**
 * Backfill script for matterStatusHistory table.
 * Seeds every existing matter with 1 timeline entry (its current status).
 * Idempotent — skips matters that already have history entries.
 *
 * Run with: npx tsx prisma/seed-timeline.ts
 */
async function main() {
  console.log("[BACKFILL] Starting timeline backfill...");

  // Get all matters with a status
  const matters = await prisma.matters.findMany({
    where: {
      status: { not: null },
    },
    select: {
      id: true,
      status: true,
      statusId: true,
      docketwiseCreatedAt: true,
      createdAt: true,
    },
  });

  console.log(`[BACKFILL] Found ${matters.length} matters with a status`);

  // Get matters that already have history entries (to skip them)
  const mattersWithHistory = await prisma.matterStatusHistory.findMany({
    select: { matterId: true },
    distinct: ["matterId"],
  });
  const alreadyHasHistory = new Set(mattersWithHistory.map((h) => h.matterId));

  console.log(`[BACKFILL] ${alreadyHasHistory.size} matters already have history entries — will skip`);

  let created = 0;
  let skipped = 0;

  const BATCH_SIZE = 100;
  for (let i = 0; i < matters.length; i += BATCH_SIZE) {
    const batch = matters.slice(i, i + BATCH_SIZE);
    const toCreate = [];

    for (const matter of batch) {
      if (alreadyHasHistory.has(matter.id)) {
        skipped++;
        continue;
      }

      toCreate.push({
        matterId: matter.id,
        status: matter.status!,
        statusId: matter.statusId,
        source: "backfill",
        changedAt: matter.docketwiseCreatedAt || matter.createdAt,
      });
    }

    if (toCreate.length > 0) {
      await prisma.matterStatusHistory.createMany({ data: toCreate });
      created += toCreate.length;
    }

    console.log(`[BACKFILL] Progress: ${Math.min(i + BATCH_SIZE, matters.length)}/${matters.length} (created: ${created}, skipped: ${skipped})`);
  }

  console.log(`[BACKFILL] ✅ Done! Created ${created} history entries, skipped ${skipped}`);
}

main()
  .catch((err) => {
    console.error("[BACKFILL] ❌ Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
