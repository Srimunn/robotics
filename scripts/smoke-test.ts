import { runWithStartContext } from "@tanstack/start-storage-context";
import { db } from "../src/lib/db";
import { addEnquiry, updateEnquiry, approveAndConvertEnquiryToProject } from "../src/server/enquiries";
import { addPayment } from "../src/server/payments";
import { assignLaboursToProject, updateProjectStatus } from "../src/server/projects";
import { issueMachineToProject, returnMachineFromProject } from "../src/server/machines";
import { recordAttendance } from "../src/server/attendance";

/**
 * Helper to invoke TanStack Start server functions directly in Node CLI environment
 */
async function callServerFn<T = any>(serverFn: any, payload: any): Promise<T> {
  const res = await serverFn.__executeServer({ data: payload });
  if (res.error) {
    throw res.error;
  }
  return res.result as T;
}

async function runSmokeTest() {
  let passedCount = 0;
  const totalChecks = 9;

  let createdEnquiryId: string | null = null;
  let createdProjectId: string | null = null;
  let secondProjectId: string | null = null;
  let createdLabourId: string | null = null;
  let isNewLabourCreated = false;
  let createdMachineId: string | null = null;
  let isNewMachineCreated = false;
  let issueRecordId: string | null = null;

  const testCustomerName = "SMOKETEST-Customer-" + Date.now();

  try {
    // ----------------------------------------------------
    // CHECK 1: Create a test Enquiry & verify default values
    // ----------------------------------------------------
    console.log("\n1. Testing Enquiry Creation...");
    try {
      const enquiry = await callServerFn(addEnquiry, {
        enquiryDate: new Date(),
        customerName: testCustomerName,
        phone: "9876543210",
        location: "Smoke Test City",
        leadSource: "Website",
        leakageType: "Roof Leakage",
        quotationAmount: 50000,
      });

      if (!enquiry || !enquiry.id || !enquiry.id.startsWith("ENQ-")) {
        throw new Error(`Enquiry creation failed or invalid ID format: ${enquiry?.id}`);
      }
      if (enquiry.customerName !== testCustomerName) {
        throw new Error(`Expected customerName ${testCustomerName}, got ${enquiry.customerName}`);
      }
      if (enquiry.siteVisitStatus !== "Pending") {
        throw new Error(`Expected default siteVisitStatus "Pending", got ${enquiry.siteVisitStatus}`);
      }
      if (enquiry.customerDecision !== "FollowUp") {
        throw new Error(`Expected default customerDecision "FollowUp", got ${enquiry.customerDecision}`);
      }

      createdEnquiryId = enquiry.id;
      passedCount++;
      console.log(`  ✅ Check 1 Passed: Enquiry ${enquiry.id} created with correct defaults.`);
    } catch (err: any) {
      console.log(`  ❌ Check 1 Failed: ${err.message}`);
    }

    // ----------------------------------------------------
    // CHECK 2: Update customerDecision to Approved & convert to Project
    // ----------------------------------------------------
    console.log("\n2. Testing Enquiry Approval & Conversion to Project...");
    try {
      if (!createdEnquiryId) throw new Error("Skipped: Check 1 failed.");

      await callServerFn(updateEnquiry, {
        id: createdEnquiryId,
        updates: { customerDecision: "Approved" },
      });

      const project = await callServerFn(approveAndConvertEnquiryToProject, {
        enquiryId: createdEnquiryId,
      });

      if (!project || !project.id || !project.id.startsWith("PRJ-")) {
        throw new Error(`Project creation failed or invalid ID: ${project?.id}`);
      }
      if (project.customerName !== testCustomerName) {
        throw new Error(`Inherited customerName mismatch. Expected ${testCustomerName}, got ${project.customerName}`);
      }
      if (Number(project.projectValue) !== 50000) {
        throw new Error(`Inherited projectValue mismatch. Expected 50000, got ${project.projectValue}`);
      }
      if (project.status !== "Scheduled") {
        throw new Error(`Expected initial project status "Scheduled", got ${project.status}`);
      }

      createdProjectId = project.id;
      passedCount++;
      console.log(`  ✅ Check 2 Passed: Project ${project.id} converted from Enquiry with inherited fields.`);
    } catch (err: any) {
      console.log(`  ❌ Check 2 Failed: ${err.message}`);
    }

    // ----------------------------------------------------
    // CHECK 3: Add Payment & verify recalculation
    // ----------------------------------------------------
    console.log("\n3. Testing Payment Recording & Balance Recalculation...");
    try {
      if (!createdProjectId) throw new Error("Skipped: Check 2 failed.");

      const payment = await callServerFn(addPayment, {
        projectId: createdProjectId,
        paymentDate: new Date(),
        amount: 20000,
        mode: "Bank Transfer",
        referenceNumber: `SMOKETEST-PAY-${Date.now()}`,
        remarks: "Smoke test payment",
      });

      if (!payment || !payment.id || !payment.id.startsWith("PAY-")) {
        throw new Error(`Payment creation failed: ${payment?.id}`);
      }

      const updatedProj = await db.project.findUnique({
        where: { id: createdProjectId },
      });

      if (!updatedProj) throw new Error("Project not found in DB after payment.");

      const recAmt = Number(updatedProj.receivedAmount);
      const balAmt = Number(updatedProj.balanceAmount);

      if (recAmt !== 20000) {
        throw new Error(`Expected receivedAmount 20000, got ${recAmt}`);
      }
      if (balAmt !== 30000) {
        throw new Error(`Expected balanceAmount 30000, got ${balAmt}`);
      }
      if (updatedProj.paymentStatus !== "Partial") {
        throw new Error(`Expected paymentStatus "Partial", got ${updatedProj.paymentStatus}`);
      }

      passedCount++;
      console.log(`  ✅ Check 3 Passed: Payment recorded. receivedAmount=₹20,000, balanceAmount=₹30,000, status=Partial.`);
    } catch (err: any) {
      console.log(`  ❌ Check 3 Failed: ${err.message}`);
    }

    // ----------------------------------------------------
    // CHECK 4: Assign Labour & test double-booking prevention
    // ----------------------------------------------------
    console.log("\n4. Testing Labour Assignment & Double-Booking Prevention...");
    try {
      if (!createdProjectId) throw new Error("Skipped: Check 2 failed.");

      let labour = await db.labour.findFirst({ where: { isActive: true } });
      if (!labour) {
        labour = await db.labour.create({
          data: {
            id: `LAB-TEST-${Date.now()}`,
            name: "SMOKETEST-Labour",
            phone: "9998887776",
            type: "Permanent",
            defaultWeeklyWage: 6000,
            status: "Available",
            loginId: `smoketest_lab_${Date.now()}`,
            pin: "1234",
          },
        });
        isNewLabourCreated = true;
      }
      createdLabourId = labour.id;

      const assignRes1 = await callServerFn(assignLaboursToProject, {
        projectId: createdProjectId,
        assignments: [{ labourId: labour.id, weeklyWage: 6000 }],
      });

      if (!assignRes1.results[0]?.ok) {
        throw new Error(`Failed to assign labour to primary project: ${assignRes1.results[0]?.reason}`);
      }

      const secondEnquiry = await callServerFn(addEnquiry, {
        enquiryDate: new Date(),
        customerName: testCustomerName + "-Second",
        phone: "9876543211",
        location: "City 2",
        leadSource: "Referral",
        leakageType: "Wall",
        quotationAmount: 30000,
      });

      await callServerFn(updateEnquiry, {
        id: secondEnquiry.id,
        updates: { customerDecision: "Approved" },
      });

      const secondProj = await callServerFn(approveAndConvertEnquiryToProject, {
        enquiryId: secondEnquiry.id,
      });
      secondProjectId = secondProj.id;

      const assignRes2 = await callServerFn(assignLaboursToProject, {
        projectId: secondProjectId,
        assignments: [{ labourId: labour.id, weeklyWage: 6000 }],
      });

      if (assignRes2.results[0]?.ok) {
        throw new Error("Double-booking check failed: Labour assignment to second active project was erroneously accepted!");
      }

      passedCount++;
      console.log(`  ✅ Check 4 Passed: Labour ${labour.id} assigned to ${createdProjectId}, and double-booking to ${secondProjectId} was correctly rejected.`);
    } catch (err: any) {
      console.log(`  ❌ Check 4 Failed: ${err.message}`);
    }

    // ----------------------------------------------------
    // CHECK 5: Add Machine Issue & verify stock decrease
    // ----------------------------------------------------
    console.log("\n5. Testing Machine Issuance & Stock Deduction...");
    try {
      if (!createdProjectId) throw new Error("Skipped: Check 2 failed.");

      let machine = await db.machine.findFirst({ where: { availableQuantity: { gte: 1 } } });
      if (!machine) {
        machine = await db.machine.create({
          data: {
            id: `MAC-TEST-${Date.now()}`,
            toolName: "SMOKETEST-Drill",
            category: "Power Tools",
            brand: "Bosch",
            currentStock: 5,
            availableQuantity: 5,
            issuedQuantity: 0,
            unit: "Nos",
            condition: "Good",
          },
        });
        isNewMachineCreated = true;
      }
      createdMachineId = machine.id;

      const initAvail = machine.availableQuantity;
      const initIssued = machine.issuedQuantity;

      const issueRecord = await callServerFn(issueMachineToProject, {
        machineId: machine.id,
        projectId: createdProjectId,
        quantity: 1,
        issueDate: new Date().toISOString().slice(0, 10),
        expectedReturnDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
        issuedBy: "SMOKETEST-Tester",
      });

      issueRecordId = issueRecord.id;

      const updatedMachine = await db.machine.findUnique({ where: { id: machine.id } });
      if (!updatedMachine) throw new Error("Machine record not found after issuance.");

      if (updatedMachine.availableQuantity !== initAvail - 1) {
        throw new Error(`Expected availableQuantity ${initAvail - 1}, got ${updatedMachine.availableQuantity}`);
      }
      if (updatedMachine.issuedQuantity !== initIssued + 1) {
        throw new Error(`Expected issuedQuantity ${initIssued + 1}, got ${updatedMachine.issuedQuantity}`);
      }

      passedCount++;
      console.log(`  ✅ Check 5 Passed: Machine ${machine.id} issued. Available stock decreased from ${initAvail} to ${updatedMachine.availableQuantity}.`);
    } catch (err: any) {
      console.log(`  ❌ Check 5 Failed: ${err.message}`);
    }

    // ----------------------------------------------------
    // CHECK 6: Return Machine & verify stock restoration
    // ----------------------------------------------------
    console.log("\n6. Testing Machine Return & Stock Restoration...");
    try {
      if (!issueRecordId || !createdMachineId) throw new Error("Skipped: Check 5 failed.");

      const preReturnMachine = await db.machine.findUnique({ where: { id: createdMachineId } });
      if (!preReturnMachine) throw new Error("Machine not found before return.");

      const preAvail = preReturnMachine.availableQuantity;

      await callServerFn(returnMachineFromProject, {
        issueRecordId,
        returnQty: 1,
        condition: "Good",
        returnedBy: "SMOKETEST-Tester",
      });

      const postReturnMachine = await db.machine.findUnique({ where: { id: createdMachineId } });
      if (!postReturnMachine) throw new Error("Machine not found after return.");

      if (postReturnMachine.availableQuantity !== preAvail + 1) {
        throw new Error(`Expected availableQuantity ${preAvail + 1}, got ${postReturnMachine.availableQuantity}`);
      }

      passedCount++;
      console.log(`  ✅ Check 6 Passed: Machine returned. Available stock restored from ${preAvail} to ${postReturnMachine.availableQuantity}.`);
    } catch (err: any) {
      console.log(`  ❌ Check 6 Failed: ${err.message}`);
    }

    // ----------------------------------------------------
    // CHECK 7: Record Attendance & verify queryability
    // ----------------------------------------------------
    console.log("\n7. Testing Attendance Record & Queryability...");
    try {
      if (!createdLabourId || !createdProjectId) throw new Error("Skipped: Check 4 failed.");

      const todayStr = new Date().toISOString().slice(0, 10);

      await callServerFn(recordAttendance, {
        labourId: createdLabourId,
        date: todayStr,
        status: "Present",
        projectId: createdProjectId,
        projectName: testCustomerName,
        inTime: "09:00",
        outTime: "17:00",
        hoursWorked: 8,
        earnedMoney: 1000,
        workDescription: "Smoke test waterproofing work",
      });

      const queryRec = await db.attendanceRecord.findFirst({
        where: { labourId: createdLabourId, date: new Date(todayStr) },
      });

      if (!queryRec) throw new Error("Attendance record not found via DB query.");
      if (queryRec.status !== "Present") throw new Error(`Expected status "Present", got ${queryRec.status}`);

      passedCount++;
      console.log(`  ✅ Check 7 Passed: Attendance record for labour ${createdLabourId} created and verified via query.`);
    } catch (err: any) {
      console.log(`  ❌ Check 7 Failed: ${err.message}`);
    }

    // ----------------------------------------------------
    // CHECK 8: Full Project Lifecycle Status Updates & History Logs
    // ----------------------------------------------------
    console.log("\n8. Testing Project Status Lifecycle (Waiting → Scheduled → Ongoing → Completed)...");
    try {
      if (!createdProjectId) throw new Error("Skipped: Check 2 failed.");

      const statuses: Array<"Waiting" | "Scheduled" | "Ongoing" | "Completed"> = [
        "Waiting",
        "Scheduled",
        "Ongoing",
        "Completed",
      ];

      for (const st of statuses) {
        await callServerFn(updateProjectStatus, {
          id: createdProjectId,
          status: st,
          note: `Transitioning to ${st} via Smoke Test`,
        });
      }

      const historyLogs = await db.projectStatusHistory.findMany({
        where: { projectId: createdProjectId },
        orderBy: { timestamp: "asc" },
      });

      const historyStatuses = historyLogs.map((h) => h.status);
      for (const st of statuses) {
        if (!historyStatuses.includes(st)) {
          throw new Error(`Missing expected status "${st}" in project status history. Recorded: ${historyStatuses.join(", ")}`);
        }
      }

      passedCount++;
      console.log(`  ✅ Check 8 Passed: Project lifecycle status transitions recorded and verified in status history.`);
    } catch (err: any) {
      console.log(`  ❌ Check 8 Failed: ${err.message}`);
    }

    // ----------------------------------------------------
    // CHECK 9: Clean Up Test Records
    // ----------------------------------------------------
    console.log("\n9. Testing Test Data Cleanup...");
    try {
      // 1. Unlink linked enquiries first
      await db.enquiry.updateMany({
        where: { customerName: { contains: "SMOKETEST-" } },
        data: { projectId: null },
      });

      const testProjects = await db.project.findMany({
        where: { customerName: { contains: "SMOKETEST-" } },
        select: { id: true },
      });
      const projectIds = testProjects.map((p) => p.id);

      if (projectIds.length > 0) {
        await db.projectLabourAssignment.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.labourWageHistory.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.projectStatusHistory.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.projectActivity.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.paymentStageItem.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.payment.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.machineIssueRecord.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.attendanceRecord.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.projectLabourLog.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.stockAuditLog.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.materialIssueRecord.deleteMany({ where: { projectId: { in: projectIds } } });
        await db.project.deleteMany({ where: { id: { in: projectIds } } });
      }

      await db.enquiry.deleteMany({
        where: { customerName: { contains: "SMOKETEST-" } },
      });

      if (isNewLabourCreated && createdLabourId) {
        await db.attendanceRecord.deleteMany({ where: { labourId: createdLabourId } });
        await db.labour.delete({ where: { id: createdLabourId } }).catch(() => {});
      } else if (createdLabourId) {
        await db.labour.update({ where: { id: createdLabourId }, data: { status: "Available" } }).catch(() => {});
      }

      if (isNewMachineCreated && createdMachineId) {
        await db.machine.delete({ where: { id: createdMachineId } }).catch(() => {});
      }

      passedCount++;
      console.log(`  ✅ Check 9 Passed: Successfully cleaned up all test records matching "SMOKETEST-".`);
    } catch (err: any) {
      console.log(`  ❌ Check 9 Failed: ${err.message}`);
    }

  } finally {
    await db.$disconnect();
  }

  console.log(`\n========================================`);
  console.log(`${passedCount}/${totalChecks} checks passed`);
  console.log(`========================================\n`);

  if (passedCount < totalChecks) {
    process.exit(1);
  }
}

runWithStartContext({ request: new Request("http://localhost"), startOptions: {} } as any, () => runSmokeTest()).catch((err) => {
  console.error("Unhandled Error in Smoke Test Execution:", err);
  process.exit(1);
});
