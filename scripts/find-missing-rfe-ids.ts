import prisma from "@/lib/prisma";

async function findMissingRFEStatusIds() {
  // Get RFE status group and its mapped IDs
  const rfeGroup = await prisma.statusGroups.findFirst({
    where: {
      name: { contains: 'RFE', mode: 'insensitive' }
    },
    include: {
      statusGroupMappings: {
        include: {
          matterStatus: true
        }
      }
    }
  });

  if (!rfeGroup) {
    console.log("❌ RFE status group not found!");
    return;
  }

  const mappedStatusIds = rfeGroup.statusGroupMappings.map(
    m => m.matterStatus.docketwiseId
  );

  console.log("\n📊 RFE Status Group Info:");
  console.log(`Group Name: ${rfeGroup.name}`);
  console.log(`Mapped Status IDs: ${mappedStatusIds.join(', ')}`);
  console.log(`\nMapped Statuses:`);
  rfeGroup.statusGroupMappings.forEach(m => {
    console.log(`  - ${m.matterStatus.docketwiseId}: ${m.matterStatus.name}`);
  });

  // Find ALL matters with "evidence" in status text
  const allRFEMatters = await prisma.matters.findMany({
    where: {
      OR: [
        { status: { contains: 'evidence', mode: 'insensitive' } },
        { statusForFiling: { contains: 'evidence', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      statusId: true,
      statusForFilingId: true,
      status: true,
      statusForFiling: true,
    }
  });

  console.log(`\n✅ Total matters with "evidence" in text: ${allRFEMatters.length}`);

  // Find matters counted by status group (using mapped IDs)
  const groupMatters = await prisma.matters.count({
    where: {
      OR: [
        { statusId: { in: mappedStatusIds } },
        { statusForFilingId: { in: mappedStatusIds } }
      ]
    }
  });

  console.log(`✅ Matters counted by RFE status group: ${groupMatters}`);
  console.log(`❌ Missing from group: ${allRFEMatters.length - groupMatters}`);

  // Find unique statusIds from all RFE matters
  const allStatusIds = new Set<number>();
  allRFEMatters.forEach(m => {
    if (m.statusId) allStatusIds.add(m.statusId);
    if (m.statusForFilingId) allStatusIds.add(m.statusForFilingId);
  });

  // Find statusIds NOT in the mapping
  const missingIds = Array.from(allStatusIds).filter(
    id => !mappedStatusIds.includes(id)
  );

  if (missingIds.length > 0) {
    console.log(`\n⚠️  Missing Status IDs from RFE group mapping:`);
    
    // Get status names for missing IDs
    const missingStatuses = await prisma.matterStatuses.findMany({
      where: {
        docketwiseId: { in: missingIds }
      }
    });

    missingStatuses.forEach(s => {
      const count = allRFEMatters.filter(
        m => m.statusId === s.docketwiseId || m.statusForFilingId === s.docketwiseId
      ).length;
      console.log(`  - ID ${s.docketwiseId}: "${s.name}" (${count} matters)`);
    });

    console.log(`\n💡 To fix: Add these ${missingIds.length} status IDs to your RFE status group`);
  } else {
    console.log(`\n✅ All status IDs are mapped correctly!`);
  }

  // Show sample of missing matters
  const missingMatters = allRFEMatters.filter(m => {
    const hasId = m.statusId && mappedStatusIds.includes(m.statusId);
    const hasFilingId = m.statusForFilingId && mappedStatusIds.includes(m.statusForFilingId);
    return !hasId && !hasFilingId;
  });

  if (missingMatters.length > 0) {
    console.log(`\n📋 Sample missing matters (first 5):`);
    missingMatters.slice(0, 5).forEach(m => {
      console.log(`  - Matter ID: ${m.id}`);
      console.log(`    statusId: ${m.statusId}, status: "${m.status}"`);
      console.log(`    statusForFilingId: ${m.statusForFilingId}, statusForFiling: "${m.statusForFiling}"`);
    });
  }
}

findMissingRFEStatusIds()
  .then(() => {
    console.log("\n✅ Analysis complete!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
