import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  for (const keyword of ["Outstanding", "BAD Debits", "Collection list", "MD Follows", "Other Follows"]) {
    const r = await db.project.deleteMany({ where: { internalNotes: { contains: keyword } } });
    console.log(`Deleted ${r.count} with "${keyword}"`);
  }
  console.log(`\nRemaining projects: ${await db.project.count()}`);
}

main().finally(() => db.$disconnect());
