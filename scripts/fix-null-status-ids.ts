import prisma from "@/lib/prisma";

async function fixNullStatusIds() {
  console.log("🔍 Finding matters with NULL statusId but valid status text...\n");

  // Find matters with NULL statusId but "Request for Evidence Received" text
  const nullRFEMatters = await prisma.matters.findMany({
    where: {
      statusId: null,
      status: { contains: "Request for Evidence Received", mode: 'insensitive' }
    },
    select: {
      id: true,
      docketwiseId: true,
      status: true,
      statusId: true,
      statusForFilingId: true,
    }
  });

  console.log(`Found ${nullRFEMatters.length} matters with NULL statusId and RFE text`);

  if (nullRFEMatters.length === 0) {
    console.log("✅ No matters to fix!");
    return;
  }

  // Get the correct statusId for "Request for Evidence Received"
  const rfeStatus = await prisma.matterStatuses.findFirst({
    where: {
      name: { contains: "Request for Evidence Received", mode: 'insensitive' }
    }
  });

  if (!rfeStatus) {
    console.log("❌ Could not find RFE status in matterStatuses table");
    return;
  }

  console.log(`\n✅ Found correct statusId: ${rfeStatus.docketwiseId} - "${rfeStatus.name}"`);
  console.log(`\nUpdating ${nullRFEMatters.length} matters...`);

  // Update matters to have correct statusId
  const result = await prisma.matters.updateMany({
    where: {
      statusId: null,
      status: { contains: "Request for Evidence Received", mode: 'insensitive' }
    },
    data: {
      statusId: rfeStatus.docketwiseId
    }
  });

  console.log(`✅ Updated ${result.count} matters with statusId = ${rfeStatus.docketwiseId}`);

  // Verify counts now
  console.log("\n📊 Verifying counts...");

  // Get RFE status group
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
    console.log("❌ RFE status group not found");
    return;
  }

  const mappedIds = rfeGroup.statusGroupMappings.map(m => m.matterStatus.docketwiseId);

  // Count by text filter
  const textCount = await prisma.matters.count({
    where: {
      OR: [
        { status: { contains: "Request for Evidence Received", mode: 'insensitive' } },
        { statusForFiling: { contains: "Request for Evidence Received", mode: 'insensitive' } }
      ]
    }
  });

  // Count by status group IDs
  const groupCount = await prisma.matters.count({
    where: {
      OR: [
        { statusId: { in: mappedIds } },
        { statusForFilingId: { in: mappedIds } }
      ]
    }
  });

  console.log(`Text filter count: ${textCount}`);
  console.log(`Status group count: ${groupCount}`);
  console.log(`Difference: ${textCount - groupCount}`);

  if (textCount === groupCount) {
    console.log("\n🎉 SUCCESS! Counts now match!");
  } else {
    console.log("\n⚠️  Still a mismatch. Additional investigation needed.");
  }
}

fixNullStatusIds()
  .then(() => {
    console.log("\n✅ Fix complete!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
