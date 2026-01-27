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
