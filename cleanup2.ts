import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  // Remove any projects that came from Old_Collection sheets
  const keywords = ["Collection list", "BAD Debits", "MD Follows", "Other Follows", "Received", "Outstanding"];
  for (const k of keywords) {
    const r = await db.project.deleteMany({ where: { internalNotes: { contains: k } } });
    console.log(`Deleted ${r.count} with "${k}"`);
  }
  console.log(`\nProjects remaining: ${await db.project.count()}`);
}
main().finally(() => db.$disconnect());
