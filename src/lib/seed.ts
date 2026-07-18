import { Role } from '@prisma/client';
import { hashPassword } from './auth';
import { prisma } from './prisma';

let seedPromise: Promise<void> | null = null;

export function ensureSeedData() {
  seedPromise ??= seedDatabase();
  return seedPromise;
}

async function seedDatabase() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@nexcup.gg';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: 'Admin',
        fullName: 'NexCup Admin',
        email: adminEmail.toLowerCase(),
        phone: '+91 99999 99999',
        role: Role.ADMIN,
        passwordHash: hashPassword(adminPassword),
      },
    });
  }
}
