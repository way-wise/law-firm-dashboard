import { hashPassword } from "better-auth/crypto";
import prisma from "../lib/prisma";

async function main() {
  await prisma.$transaction(async (tx) => {
    console.log("Creating admin user...");

    const password = await hashPassword("admin12345");

    // Check if user already exists
    let user = await tx.users.findUnique({
      where: { email: "admin@example.com" },
    });

    if (!user) {
      // Create admin user
      user = await tx.users.create({
        data: {
          name: "Admin User",
          email: "admin@example.com",
          emailVerified: true,
          role: "super"
        },
      });
    }

    console.log("Linking user with account...");

    // Check if account already exists
    const existingAccount = await tx.accounts.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    if (!existingAccount) {
      // Create account for admin user
      await tx.accounts.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      // Update password if account exists
      await tx.accounts.update({
        where: { id: existingAccount.id },
        data: {
          password,
          updatedAt: new Date(),
        },
      });
    }

    console.log("Admin user created successfully!");
    console.log("Email: admin@example.com");
    console.log("Password: admin12345");

    // Create system status groups
    console.log("\nCreating system status groups...");
    
    const systemStatusGroups = [
      { name: "Pending", color: "#F59E0B", icon: "Clock", displayOrder: 1, description: "Matters awaiting action or review" },
      { name: "Active", color: "#3B82F6", icon: "Activity", displayOrder: 2, description: "Currently active matters in progress" },
      { name: "Filed", color: "#8B5CF6", icon: "FileText", displayOrder: 3, description: "Matters that have been filed" },
      { name: "RFE", color: "#EF4444", icon: "AlertCircle", displayOrder: 4, description: "Request for Evidence received" },
      { name: "Interview", color: "#14B8A6", icon: "Users", displayOrder: 5, description: "Interview scheduled or completed" },
      { name: "Approved", color: "#10B981", icon: "CheckCircle", displayOrder: 6, description: "Matters that have been approved" },
      { name: "Denied", color: "#DC2626", icon: "XCircle", displayOrder: 7, description: "Matters that have been denied" },
      { name: "Closed", color: "#6B7280", icon: "Archive", displayOrder: 8, description: "Completed or closed matters" },
      { name: "Inactive", color: "#9CA3AF", icon: "Pause", displayOrder: 9, description: "Inactive or on-hold matters" },
    ];

    for (const group of systemStatusGroups) {
      const existing = await tx.statusGroups.findFirst({
        where: {
          userId: user.id,
          name: group.name,
        },
      });

      if (!existing) {
        await tx.statusGroups.create({
          data: {
            userId: user.id,
            name: group.name,
            description: group.description,
            color: group.color,
            icon: group.icon,
            displayOrder: group.displayOrder,
            isActive: true,
            isSystem: true,
          },
        });
        console.log(`✓ Created system status group: ${group.name}`);
      } else {
        // Update existing to mark as system
        await tx.statusGroups.update({
          where: { id: existing.id },
          data: { isSystem: true },
        });
        console.log(`✓ Updated existing status group to system: ${group.name}`);
      }
    }

    console.log("\n✅ System status groups created successfully!");
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
