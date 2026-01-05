import { faker } from "@faker-js/faker";
import { hashPassword } from "better-auth/crypto";
import prisma from "../lib/prisma";

async function main(total: number) {
  await prisma.$transaction(async (tx) => {
    console.log("Creating users...");

    const password = await hashPassword("12345678");

    const users = Array.from({ length: total }).map(() => ({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      emailVerified: false,
    }));

    const emails = users.map((u) => u.email);

    await tx.users.createMany({
      data: users,
      skipDuplicates: true,
    });

    const getUsers = await tx.users.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });

    const accounts = getUsers.map(({ id }) => ({
      userId: id,
      accountId: id,
      providerId: "credential",
      password,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    console.log("Linking users with accounts...");

    await tx.accounts.createMany({
      data: accounts,
      skipDuplicates: true,
    });

    console.log(`Created ${getUsers.length} users with accounts.`);
  });
}

main(50)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
