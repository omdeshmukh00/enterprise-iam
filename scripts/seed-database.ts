import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import path from 'path';

// Load identity server environment configuration
dotenv.config({ path: path.resolve(process.cwd(), 'apps/identity-server/.env') });

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'ChangeMeImmediately';

  const memoryCost = parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10);
  const timeCost = parseInt(process.env.ARGON2_TIME_COST || '3', 10);
  const parallelism = parseInt(process.env.ARGON2_PARALLELISM || '1', 10);

  console.log('--- IdentityHub Database Seed ---');
  console.log(`Target admin email: ${email}`);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost,
    timeCost,
    parallelism,
  });

  if (existing) {
    console.log(`Admin user with email ${email} already exists. Updating role and status...`);
    const updated = await prisma.user.update({
      where: { email },
      data: {
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        passwordHash,
      },
    });
    console.log(`✔ Admin account updated: ${updated.id}`);
  } else {
    console.log(`Creating initial admin user...`);
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`✔ Admin account successfully created: ${created.id}`);
  }

  // Create an initial audit log entry for seeding
  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_SEEDED',
      resourceType: 'SYSTEM',
      status: 'SUCCESS',
      metadata: { email },
    },
  });

  console.log('Seed completed successfully.');
}

seedAdmin()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
