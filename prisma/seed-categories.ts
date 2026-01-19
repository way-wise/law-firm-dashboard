import prisma from "../lib/prisma";

const categories = [
  { name: "Employment", description: "Employment-based immigration (H-1B, L-1, O-1, EB categories)", color: "#3B82F6", sortOrder: 1 },
  { name: "Humanitarian", description: "Asylum, refugee, TPS, VAWA, U-Visa", color: "#EF4444", sortOrder: 2 },
  { name: "Family", description: "Family-based immigration (IR, F categories)", color: "#10B981", sortOrder: 3 },
  { name: "Citizenship", description: "Naturalization and citizenship", color: "#8B5CF6", sortOrder: 4 },
  { name: "Business", description: "Business immigration (E-1, E-2, EB-5)", color: "#F59E0B", sortOrder: 5 },
  { name: "Other", description: "Other immigration matters", color: "#6B7280", sortOrder: 6 },
];

async function seedCategories() {
  console.log("Seeding categories...");

  for (const category of categories) {
    await prisma.categories.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
        color: category.color,
        sortOrder: category.sortOrder,
      },
      create: category,
    });
    console.log(`  ✓ ${category.name}`);
  }

  console.log("Categories seeded successfully!");
}

seedCategories()
  .catch((e) => {
    console.error("Error seeding categories:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
