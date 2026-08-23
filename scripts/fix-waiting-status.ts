import { db } from "../src/lib/db";

/**
 * One-time data fix script:
 * Bulk-updates all Project records currently in "Waiting" status to "Scheduled".
 *
 * Usage:
 *   npx tsx scripts/fix-waiting-status.ts
 */
async function fixWaitingStatus() {
  console.log("Checking for projects with status 'Waiting'...");

  const waitingProjects = await db.project.findMany({
    where: { status: "Waiting" },
    select: { id: true, customerName: true, status: true },
  });

  console.log(`Found ${waitingProjects.length} project(s) in 'Waiting' status.`);

  if (waitingProjects.length === 0) {
    console.log("No action needed. All project statuses are valid (Scheduled, Ongoing, Completed, Closed).");
    return;
  }

  for (const proj of waitingProjects) {
    console.log(`- Updating Project ${proj.id} (${proj.customerName}) from 'Waiting' -> 'Scheduled'`);
  }

  const result = await db.project.updateMany({
    where: { status: "Waiting" },
    data: { status: "Scheduled" },
  });

  console.log(`\nSuccessfully updated ${result.count} project record(s) to 'Scheduled' status.`);
}

fixWaitingStatus()
  .catch((err) => {
    console.error("Failed to update project statuses:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
