"use server";

import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { createServerFn } from "@tanstack/react-start";
import PDFDocument from "pdfkit";
import { db } from "~/lib/db";
import { toNumber } from "./utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof (globalThis as any).__dirname === "undefined") {
  (globalThis as any).__dirname = __dirname;
}

function getFontPaths() {
  const possibleRegularPaths = [
    path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf"),
    path.join(process.cwd(), ".output", "public", "fonts", "Roboto-Regular.ttf"),
    path.resolve(__dirname, "../../public/fonts/Roboto-Regular.ttf"),
    path.resolve(__dirname, "../public/fonts/Roboto-Regular.ttf"),
  ];
  const possibleBoldPaths = [
    path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf"),
    path.join(process.cwd(), ".output", "public", "fonts", "Roboto-Bold.ttf"),
    path.resolve(__dirname, "../../public/fonts/Roboto-Bold.ttf"),
    path.resolve(__dirname, "../public/fonts/Roboto-Bold.ttf"),
  ];

  const regular = possibleRegularPaths.find((p) => fs.existsSync(p)) || possibleRegularPaths[0];
  const bold = possibleBoldPaths.find((p) => fs.existsSync(p)) || possibleBoldPaths[0];

  return { regular, bold };
}

/** Fetch image from URL safely into a Buffer, returning null on error or timeout */
async function fetchImageBuffer(url: string | null | undefined, timeoutMs = 4000): Promise<Buffer | null> {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/** Utility to generate PDF buffer using pdfkit with embedded fonts */
function renderPdf(builder: (doc: InstanceType<typeof PDFDocument>) => Promise<void>): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: "A4" });
      const { regular, bold } = getFontPaths();

      doc.registerFont("Roboto", regular);
      doc.registerFont("Roboto-Bold", bold);
      doc.font("Roboto");

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      await builder(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/** Server function to generate Projects Report PDF with embedded before/after photos */
export const generateProjectsReport = createServerFn({ method: "POST" })
  .validator((input: { status?: string; startDate?: string; endDate?: string }) => input)
  .handler(async ({ data }) => {
    const { status, startDate, endDate } = data;

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const projects = await db.project.findMany({
      where,
      include: {
        labourAssignments: true,
        labourLogs: true,
        payments: { orderBy: { paymentDate: "desc" } },
        statusHistory: { orderBy: { timestamp: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by date if provided
    const filteredProjects = projects.filter((p) => {
      const schedStr = p.scheduledDate ? (p.scheduledDate instanceof Date ? p.scheduledDate.toISOString().slice(0, 10) : String(p.scheduledDate).slice(0, 10)) : "";
      const createdStr = p.createdAt instanceof Date ? p.createdAt.toISOString().slice(0, 10) : String(p.createdAt).slice(0, 10);
      const pDate: string = schedStr || createdStr;
      if (startDate && pDate < startDate) return false;
      if (endDate && pDate > endDate) return false;
      return true;
    });

    const nowStr = new Date().toISOString().slice(0, 10);

    const pdfBuffer = await renderPdf(async (doc) => {
      // Title Header
      doc
        .fontSize(16)
        .font("Roboto-Bold")
        .fillColor("#0f172a")
        .text("Robotics Bricks & Blocks — Project Master Report", { align: "center" })
        .moveDown(0.3);

      doc
        .fontSize(9)
        .font("Roboto")
        .fillColor("#475569")
        .text(`Generated on: ${nowStr} | Total Projects: ${filteredProjects.length}`, { align: "center" })
        .moveDown(0.8);

      doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor("#cbd5e1").stroke().moveDown(0.8);

      if (filteredProjects.length === 0) {
        doc.fontSize(11).fillColor("#64748b").text("No projects found matching the selected filters.", { align: "center" });
        return;
      }

      for (let i = 0; i < filteredProjects.length; i++) {
        const p = filteredProjects[i];
        const val = toNumber(p.projectValue);
        const rec = toNumber(p.receivedAmount);
        const bal = toNumber(p.balanceAmount);

        if (doc.y > 580) {
          doc.addPage();
        }

        const startY = doc.y;

        // 1. Project Title Banner
        doc.rect(30, startY, 535, 24).fillAndStroke("#1e293b", "#0f172a");
        doc.fillColor("#ffffff").fontSize(10).font("Roboto-Bold").text(`${p.id} — ${p.customerName}`, 38, startY + 6);
        doc.fontSize(8.5).font("Roboto-Bold").fillColor("#38bdf8").text(`Status: ${p.status} | Pay Status: ${p.paymentStatus || "Pending"}`, 340, startY + 6, { align: "right" });

        doc.y = startY + 30;

        // 2. Basic Info & Financial Details
        doc.fillColor("#0f172a").fontSize(8.5).font("Roboto-Bold").text("BASIC & FINANCIAL DETAILS:", 35, doc.y);
        doc.moveDown(0.2);

        const infoY = doc.y;
        doc.font("Roboto").fontSize(8).fillColor("#334155");
        doc.text(`Phone: ${p.phone || "N/A"}`, 40, infoY);
        doc.text(`Location: ${p.location || "N/A"}`, 40, infoY + 12);
        doc.text(`Nature of Work: ${p.natureOfWork || "N/A"}`, 40, infoY + 24);

        doc.text(`Contract Value: ₹${val.toLocaleString("en-IN")}`, 230, infoY);
        doc.text(`Received Amount: ₹${rec.toLocaleString("en-IN")}`, 230, infoY + 12);
        doc.text(`Balance Amount: ₹${bal.toLocaleString("en-IN")}`, 230, infoY + 24);

        // Before & After Photos
        const beforeBuffer = await fetchImageBuffer(p.beforeWorkPhotoUrl);
        const afterBuffer = await fetchImageBuffer(p.afterWorkPhotoUrl);

        const beforeX = 430;
        const afterX = 495;
        const photoY = infoY;

        doc.fontSize(7.5).fillColor("#64748b").text("Before", beforeX, photoY - 9);
        if (beforeBuffer) {
          try { doc.image(beforeBuffer, beforeX, photoY, { fit: [50, 50], align: "center", valign: "center" }); }
          catch { doc.rect(beforeX, photoY, 50, 50).fillAndStroke("#f1f5f9", "#cbd5e1"); }
        } else {
          doc.rect(beforeX, photoY, 50, 50).fillAndStroke("#f1f5f9", "#cbd5e1");
        }

        doc.fontSize(7.5).fillColor("#64748b").text("After", afterX, photoY - 9);
        if (afterBuffer) {
          try { doc.image(afterBuffer, afterX, photoY, { fit: [50, 50], align: "center", valign: "center" }); }
          catch { doc.rect(afterX, photoY, 50, 50).fillAndStroke("#f1f5f9", "#cbd5e1"); }
        } else {
          doc.rect(afterX, photoY, 50, 50).fillAndStroke("#f1f5f9", "#cbd5e1");
        }

        doc.y = Math.max(infoY + 38, photoY + 55);

        // 3. Assigned Labours & Work Logs Summary
        doc.fillColor("#0f172a").fontSize(8.5).font("Roboto-Bold").text("ASSIGNED LABOUR ROSTER & WORK LOGS SUMMARY:", 35, doc.y);
        doc.moveDown(0.2);

        const assignments = p.labourAssignments || [];
        if (assignments.length === 0) {
          doc.fontSize(8).font("Roboto").fillColor("#64748b").text("No labours assigned to this project.", 40, doc.y);
          doc.moveDown(0.4);
        } else {
          for (const asgn of assignments) {
            if (doc.y > 730) doc.addPage();
            const labLogs = (p.labourLogs || []).filter((l: any) => l.labourId === asgn.labourId);
            const daysPresent = labLogs.filter((l: any) => (l.attendance || "Present") !== "Absent").length;
            const totalHours = labLogs.reduce((sum: number, l: any) => sum + (toNumber(l.hoursWorked) || 0), 0);
            const totalEarned = labLogs.reduce((sum: number, l: any) => sum + (toNumber(l.earnedMoney) || 0), 0);

            const statusTag = (asgn as any).isActive !== false ? "[Active]" : "[Previously Assigned / Inactive]";
            const dateStr = asgn.assignedDate ? (asgn.assignedDate instanceof Date ? asgn.assignedDate.toISOString().slice(0, 10) : String(asgn.assignedDate).slice(0, 10)) : "";

            doc.fontSize(8).font("Roboto-Bold").fillColor("#1e293b").text(`• ${asgn.labourName} (${asgn.labourType || "Permanent"}) ${statusTag}:`, 40, doc.y);
            doc.font("Roboto").fillColor("#475569").text(`   Wage: ₹${(asgn.weeklyWage || 0).toLocaleString("en-IN")}/wk | Assigned: ${dateStr || "N/A"} | Days Present: ${daysPresent} | Hours: ${totalHours} hrs | Earned: ₹${Math.round(totalEarned).toLocaleString("en-IN")}`);
            doc.moveDown(0.2);
          }
          doc.moveDown(0.3);
        }

        // 4. Payment Collection History
        doc.fillColor("#0f172a").fontSize(8.5).font("Roboto-Bold").text("PAYMENT COLLECTION HISTORY:", 35, doc.y);
        doc.moveDown(0.2);

        const payList = p.payments || [];
        if (payList.length === 0) {
          doc.fontSize(8).font("Roboto").fillColor("#64748b").text("No payments recorded yet for this project.", 40, doc.y);
          doc.moveDown(0.4);
        } else {
          for (const pay of payList) {
            if (doc.y > 730) doc.addPage();
            const payDate = pay.paymentDate ? (pay.paymentDate instanceof Date ? pay.paymentDate.toISOString().slice(0, 10) : String(pay.paymentDate).slice(0, 10)) : "";
            const pAmt = toNumber(pay.amount);
            doc.fontSize(8).font("Roboto").fillColor("#334155").text(`• Date: ${payDate} | Amount: ₹${pAmt.toLocaleString("en-IN")} | Mode: ${pay.mode} | Received By: ${pay.receivedBy || "Accounts Desk"}`, 40, doc.y);
            doc.moveDown(0.15);
          }
          doc.moveDown(0.3);
        }

        // 5. Timeline / Status History
        doc.fillColor("#0f172a").fontSize(8.5).font("Roboto-Bold").text("PROJECT TIMELINE & STATUS HISTORY:", 35, doc.y);
        doc.moveDown(0.2);

        const createdDateStr = p.createdAt instanceof Date ? p.createdAt.toISOString().slice(0, 10) : String(p.createdAt).slice(0, 10);
        doc.fontSize(8).font("Roboto").fillColor("#475569").text(`• Created: ${createdDateStr}`, 40, doc.y);
        doc.moveDown(0.15);

        const history = p.statusHistory || [];
        for (const st of history) {
          if (doc.y > 730) doc.addPage();
          const stTime = st.timestamp ? (st.timestamp instanceof Date ? st.timestamp.toISOString().slice(0, 10) : String(st.timestamp).slice(0, 10)) : "";
          doc.fontSize(8).font("Roboto").fillColor("#475569").text(`• ${stTime}: Status changed to ${st.status}${st.note ? ` (${st.note})` : ""}`, 40, doc.y);
          doc.moveDown(0.15);
        }

        doc.moveDown(0.8);
        doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor("#cbd5e1").stroke().moveDown(0.8);
      }
    });

    return {
      base64: pdfBuffer.toString("base64"),
      filename: `projects-report-${nowStr}.pdf`,
    };
  });

/** Server function to generate Attendance Report PDF with embedded check-in/out photos */
export const generateAttendanceReport = createServerFn({ method: "POST" })
  .validator((input: { startDate?: string; endDate?: string; labourId?: string }) => input)
  .handler(async ({ data }) => {
    const { startDate, endDate, labourId } = data;

    const [attendanceRecords, projects] = await Promise.all([
      db.attendanceRecord.findMany({ orderBy: { date: "desc" } }),
      db.project.findMany({ select: { id: true, customerName: true, labourLogs: true } }),
    ]);

    interface LogItem {
      labourId: string;
      labourName: string;
      date: string;
      inTime?: string;
      outTime?: string;
      hoursWorked?: number;
      status: string;
      inPhotoUrl?: string;
      outPhotoUrl?: string;
    }

    const logMap = new Map<string, LogItem>();

    for (const ar of attendanceRecords) {
      const dateStr = ar.date instanceof Date ? ar.date.toISOString().slice(0, 10) : String(ar.date).slice(0, 10);
      const key = `${ar.labourId}_${dateStr}`;
      logMap.set(key, {
        labourId: ar.labourId,
        labourName: ar.labourName || ar.labourId,
        date: dateStr,
        inTime: ar.inTime || undefined,
        outTime: ar.outTime || undefined,
        hoursWorked: ar.hoursWorked || 0,
        status: ar.status,
        inPhotoUrl: ar.inPhotoUrl || undefined,
        outPhotoUrl: ar.outPhotoUrl || undefined,
      });
    }

    for (const p of projects) {
      for (const lg of p.labourLogs || []) {
        const lgDateStr = lg.date instanceof Date ? lg.date.toISOString().slice(0, 10) : String(lg.date).slice(0, 10);
        const key = `${lg.labourId}_${lgDateStr}`;
        if (!logMap.has(key)) {
          logMap.set(key, {
            labourId: lg.labourId,
            labourName: lg.labourName || lg.labourId,
            date: lgDateStr,
            inTime: lg.inTime || undefined,
            outTime: lg.outTime || undefined,
            hoursWorked: lg.hoursWorked || 0,
            status: lg.attendance || "Present",
            inPhotoUrl: lg.inPhotoUrl || undefined,
            outPhotoUrl: lg.outPhotoUrl || undefined,
          });
        }
      }
    }


    let logs = Array.from(logMap.values());
    if (labourId && labourId !== "ALL") {
      logs = logs.filter((l) => l.labourId === labourId);
    }
    if (startDate) {
      logs = logs.filter((l) => l.date >= startDate);
    }
    if (endDate) {
      logs = logs.filter((l) => l.date <= endDate);
    }

    // Group by labour name
    const grouped = new Map<string, LogItem[]>();
    for (const l of logs) {
      const gName = l.labourName;
      if (!grouped.has(gName)) grouped.set(gName, []);
      grouped.get(gName)!.push(l);
    }

    const dateRangeStr = startDate && endDate ? `${startDate} to ${endDate}` : "All Recorded Dates";

    const pdfBuffer = await renderPdf(async (doc) => {
      // Header
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("Robotics Bricks & Blocks — Attendance Report", { align: "center" })
        .moveDown(0.3);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#475569")
        .text(`Date Range: ${dateRangeStr} | Total Attendance Logs: ${logs.length}`, { align: "center" })
        .moveDown(0.8);

      doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor("#cbd5e1").stroke().moveDown(0.8);

      if (logs.length === 0) {
        doc.fontSize(11).fillColor("#64748b").text("No attendance records found for the selected filter.", { align: "center" });
        return;
      }

      for (const [lName, lLogs] of grouped.entries()) {
        if (doc.y > 700) doc.addPage();

        doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b").text(`Labour: ${lName}`, 30, doc.y);
        doc.moveDown(0.3);

        const sortedLogs = lLogs.sort((a, b) => b.date.localeCompare(a.date));

        for (const log of sortedLogs) {
          if (doc.y > 710) doc.addPage();

          const startY = doc.y;
          doc.rect(30, startY, 535, 52).fillAndStroke("#f8fafc", "#e2e8f0");

          doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#0f172a").text(`Date: ${log.date}`, 40, startY + 8);
          doc
            .font("Helvetica")
            .fillColor("#475569")
            .text(`In: ${log.inTime || "—"} | Out: ${log.outTime || "—"} | Worked: ${log.hoursWorked || 0} hrs | Status: ${log.status}`);

          // In & Out thumbnails (40x40px)
          const inX = 420;
          const outX = 490;
          const photoY = startY + 6;

          // In Photo
          const inBuffer = await fetchImageBuffer(log.inPhotoUrl);
          if (inBuffer) {
            try {
              doc.image(inBuffer, inX, photoY, { fit: [40, 40], align: "center", valign: "center" });
            } catch {
              doc.rect(inX, photoY, 40, 40).fillAndStroke("#f1f5f9", "#cbd5e1");
              doc.fontSize(7).fillColor("#94a3b8").text("No Photo", inX + 3, photoY + 15);
            }
          } else {
            doc.rect(inX, photoY, 40, 40).fillAndStroke("#f1f5f9", "#cbd5e1");
            doc.fontSize(7).fillColor("#94a3b8").text("No Photo", inX + 3, photoY + 15);
          }

          // Out Photo
          const outBuffer = await fetchImageBuffer(log.outPhotoUrl);
          if (outBuffer) {
            try {
              doc.image(outBuffer, outX, photoY, { fit: [40, 40], align: "center", valign: "center" });
            } catch {
              doc.rect(outX, photoY, 40, 40).fillAndStroke("#f1f5f9", "#cbd5e1");
              doc.fontSize(7).fillColor("#94a3b8").text("No Photo", outX + 3, photoY + 15);
            }
          } else {
            doc.rect(outX, photoY, 40, 40).fillAndStroke("#f1f5f9", "#cbd5e1");
            doc.fontSize(7).fillColor("#94a3b8").text("No Photo", outX + 3, photoY + 15);
          }

          doc.y = startY + 58;
        }

        doc.moveDown(0.4);
      }
    });

    const fileDateStr = startDate && endDate ? `${startDate}-to-${endDate}` : new Date().toISOString().slice(0, 10);
    return {
      base64: pdfBuffer.toString("base64"),
      filename: `attendance-report-${fileDateStr}.pdf`,
    };
  });

/** Server function to generate a comprehensive Single Project Completion Report PDF */
export const generateSingleProjectReport = createServerFn({ method: "POST" })
  .validator((input: { projectId: string }) => input)
  .handler(async ({ data }) => {
    const { projectId } = data;
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        enquiry: true,
        assignedEngineer: true,
        statusHistory: { orderBy: { timestamp: "asc" } },
        activities: { orderBy: { timestamp: "desc" } },
        labourAssignments: true,
        labourLogs: true,
        payments: { orderBy: { paymentDate: "asc" } },
      },
    });

    if (!project) throw new Error(`Project ${projectId} not found`);

    const nowStr = new Date().toISOString().slice(0, 10);
    const projVal = toNumber(project.projectValue);
    const recAmt = toNumber(project.receivedAmount);
    const balAmt = toNumber(project.balanceAmount);

    const pdfBuffer = await renderPdf(async (doc) => {
      // Branding Header
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("Robotics Bricks & Blocks — Single Project Master Report", { align: "center" })
        .moveDown(0.3);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#475569")
        .text(`Project ID: ${project.id} | Generated on: ${nowStr} | Status: ${project.status}`, { align: "center" })
        .moveDown(0.8);

      doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor("#cbd5e1").stroke().moveDown(0.8);

      // Section 1: Customer & Site Details
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("1. Customer & Site Overview", 30, doc.y);
      doc.moveDown(0.3);

      const startY = doc.y;
      doc.rect(30, startY, 535, 60).fillAndStroke("#f8fafc", "#cbd5e1");
      doc.fontSize(8.5).font("Helvetica").fillColor("#334155");

      doc.text(`Customer Name: ${project.customerName}`, 40, startY + 8);
      doc.text(`Contact Phone: ${project.phone || "N/A"}`, 40, startY + 22);
      doc.text(`Site Location: ${project.location}`, 40, startY + 36);

      doc.text(`Nature of Work: ${project.natureOfWork}`, 300, startY + 8);
      doc.text(`Lead Engineer: ${project.assignedEngineerName || project.assignedEngineer?.name || "Er. Rajesh Kumar"}`, 300, startY + 22);
      doc.text(`Lead Source: ${project.leadSource || "Direct"}`, 300, startY + 36);

      doc.y = startY + 68;

      // Section 2: Important Dates & Timeline
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("2. Key Milestones & Dates", 30, doc.y);
      doc.moveDown(0.3);

      const datesY = doc.y;
      doc.rect(30, datesY, 535, 50).fillAndStroke("#f8fafc", "#cbd5e1");
      doc.fontSize(8.5).font("Helvetica").fillColor("#334155");

      const enquiryDateStr = project.enquiry?.enquiryDate ? (project.enquiry.enquiryDate instanceof Date ? project.enquiry.enquiryDate.toISOString().slice(0, 10) : String(project.enquiry.enquiryDate).slice(0, 10)) : "N/A";
      const siteVisitStr = project.siteVisitDate ? (project.siteVisitDate instanceof Date ? project.siteVisitDate.toISOString().slice(0, 10) : String(project.siteVisitDate).slice(0, 10)) : "N/A";
      const scheduledStr = project.scheduledDate ? (project.scheduledDate instanceof Date ? project.scheduledDate.toISOString().slice(0, 10) : String(project.scheduledDate).slice(0, 10)) : "N/A";
      const committedStr = project.workCommittedDate ? (project.workCommittedDate instanceof Date ? project.workCommittedDate.toISOString().slice(0, 10) : String(project.workCommittedDate).slice(0, 10)) : "Not Set";
      const actualStartStr = project.actualWorkStartedDate ? (project.actualWorkStartedDate instanceof Date ? project.actualWorkStartedDate.toISOString().slice(0, 10) : String(project.actualWorkStartedDate).slice(0, 10)) : "Work Pending";

      doc.text(`Enquiry Date: ${enquiryDateStr}`, 40, datesY + 8);
      doc.text(`Site Visit Date: ${siteVisitStr}`, 40, datesY + 24);
      doc.text(`Scheduled Date: ${scheduledStr}`, 210, datesY + 8);
      doc.text(`Work Committed Date: ${committedStr}`, 210, datesY + 24);
      doc.text(`Actual Work Started: ${actualStartStr}`, 390, datesY + 8);

      doc.y = datesY + 58;

      // Section 3: Financial Summary
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("3. Financial & Billing Summary", 30, doc.y);
      doc.moveDown(0.3);

      const finY = doc.y;
      doc.rect(30, finY, 535, 45).fillAndStroke("#f0fdf4", "#bbf7d0");
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#14532d");

      doc.text(`Contract Value: INR ${projVal.toLocaleString("en-IN")}`, 40, finY + 10);
      doc.text(`Total Received: INR ${recAmt.toLocaleString("en-IN")}`, 210, finY + 10);
      doc.text(`Balance Due: INR ${balAmt.toLocaleString("en-IN")}`, 380, finY + 10);
      doc.fontSize(8.5).font("Helvetica").fillColor("#166534").text(`Payment Status: ${project.paymentStatus}`, 40, finY + 26);

      doc.y = finY + 53;

      // Section 4: Status History Timeline
      if (project.statusHistory && project.statusHistory.length > 0) {
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("4. Project Status Progress History", 30, doc.y);
        doc.moveDown(0.3);

        for (const st of project.statusHistory) {
          if (doc.y > 720) doc.addPage();
          const tsStr = st.timestamp instanceof Date ? st.timestamp.toISOString().slice(0, 16).replace("T", " ") : String(st.timestamp).slice(0, 16).replace("T", " ");
          doc.fontSize(8.5).font("Helvetica").fillColor("#334155").text(`• ${tsStr} — Status: ${st.status}${st.note ? ` (${st.note})` : ""}`, 40, doc.y);
          doc.moveDown(0.2);
        }
        doc.moveDown(0.5);
      }

      // Section 5: Assigned Labour Staff & Work Log Summary
      if (project.labourAssignments && project.labourAssignments.length > 0) {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("5. Assigned Labour Crew & Work Summary", 30, doc.y);
        doc.moveDown(0.3);

        for (const asgn of project.labourAssignments) {
          if (doc.y > 720) doc.addPage();
          const asgnDateStr = asgn.assignedDate instanceof Date ? asgn.assignedDate.toISOString().slice(0, 10) : String(asgn.assignedDate).slice(0, 10);
          const logs = (project.labourLogs || []).filter((l) => l.labourId === asgn.labourId);
          const totalDays = logs.length;
          const totalHours = logs.reduce((s, l) => s + (toNumber(l.hoursWorked) || 0), 0);
          const totalEarned = logs.reduce((s, l) => s + (toNumber(l.earnedMoney || l.dailyWage) || 0), 0);

          doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#1e293b").text(`• ${asgn.labourName} (${asgn.labourType}) — Wage: INR ${asgn.weeklyWage}/wk`, 40, doc.y);
          doc.font("Helvetica").fillColor("#475569").text(`   Assigned: ${asgnDateStr} | Days Worked: ${totalDays} | Hours: ${totalHours} hrs | Earned: INR ${Math.round(totalEarned).toLocaleString("en-IN")}`);
          doc.moveDown(0.3);
        }
        doc.moveDown(0.5);
      }

      // Section 6: Payments Received History
      if (project.payments && project.payments.length > 0) {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("6. Payment Transaction History", 30, doc.y);
        doc.moveDown(0.3);

        for (const pay of project.payments) {
          if (doc.y > 720) doc.addPage();
          const payDateStr = pay.paymentDate instanceof Date ? pay.paymentDate.toISOString().slice(0, 10) : String(pay.paymentDate).slice(0, 10);
          const pAmt = toNumber(pay.amount);
          doc.fontSize(8.5).font("Helvetica").fillColor("#334155").text(`• Date: ${payDateStr} | ID: ${pay.id} | Amount: INR ${pAmt.toLocaleString("en-IN")} | Mode: ${pay.mode} | Received By: ${pay.receivedBy || "Accounts"}`, 40, doc.y);
          doc.moveDown(0.2);
        }
        doc.moveDown(0.5);
      }

      // Section 7: Before / After Work Photos
      if (project.beforeWorkPhotoUrl || project.afterWorkPhotoUrl) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("7. Work Verification Photos", 30, doc.y);
        doc.moveDown(0.5);

        const photoBoxY = doc.y;
        const beforeBuf = await fetchImageBuffer(project.beforeWorkPhotoUrl);
        const afterBuf = await fetchImageBuffer(project.afterWorkPhotoUrl);

        if (beforeBuf) {
          try {
            doc.fontSize(8).font("Helvetica-Bold").fillColor("#475569").text("Before Work Photo:", 40, photoBoxY);
            doc.image(beforeBuf, 40, photoBoxY + 12, { fit: [200, 120] });
          } catch {}
        }
        if (afterBuf) {
          try {
            doc.fontSize(8).font("Helvetica-Bold").fillColor("#475569").text("After Work Photo:", 280, photoBoxY);
            doc.image(afterBuf, 280, photoBoxY + 12, { fit: [200, 120] });
          } catch {}
        }

        if (beforeBuf || afterBuf) {
          doc.y = photoBoxY + 140;
        }
        doc.moveDown(0.5);
      }

      // Section 8: Project Activity History Log
      if (project.activities && project.activities.length > 0) {
        if (doc.y > 680) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("8. Project Activity Audit Trail", 30, doc.y);
        doc.moveDown(0.3);

        for (const act of project.activities) {
          if (doc.y > 720) doc.addPage();
          const actTs = act.timestamp instanceof Date ? act.timestamp.toISOString().slice(0, 16).replace("T", " ") : String(act.timestamp).slice(0, 16).replace("T", " ");
          doc.fontSize(8).font("Helvetica").fillColor("#475569").text(`[${actTs}] ${act.actor}: ${act.event} — ${act.details}`, 40, doc.y);
          doc.moveDown(0.2);
        }
      }
    });

    return {
      base64: pdfBuffer.toString("base64"),
      filename: `project-report-${project.id}.pdf`,
    };
  });

