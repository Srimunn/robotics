"use server";

import nodeFs from "fs";

if (typeof (globalThis as any).__dirname === "undefined") {
  (globalThis as any).__dirname = typeof process !== "undefined" && process.cwd ? process.cwd() : "/";
}
if (typeof (globalThis as any).__filename === "undefined") {
  (globalThis as any).__filename = typeof process !== "undefined" && process.cwd ? process.cwd() : "/";
}

// Polyfill globalThis.fs for PDFKit standalone bundle in Node/Vite SSR
if (typeof (globalThis as any).fs === "undefined") {
  (globalThis as any).fs = {};
}
if (!(globalThis as any).fs.readFileSync) {
  (globalThis as any).fs.readFileSync = (filePath: string) => {
    try {
      if (nodeFs && typeof nodeFs.readFileSync === "function") {
        return nodeFs.readFileSync(filePath);
      }
    } catch {
      // ignore
    }
    return Buffer.from("");
  };
}

import { createServerFn } from "@tanstack/react-start";
// @ts-ignore
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { db } from "~/lib/db";
import { toNumber } from "./utils";

/** Helper to validate if an ArrayBuffer has JPEG or PNG magic byte headers for PDFKit image parser */
function isValidPdfImageBuffer(buf: ArrayBuffer | Buffer | null): boolean {
  if (!buf) return false;
  const uint8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  if (uint8.length < 4) return false;
  // JPEG: 0xFF 0xD8 0xFF
  const isJpeg = uint8[0] === 0xff && uint8[1] === 0xd8;
  // PNG: 0x89 0x50 0x4E 0x47 ('\x89PNG')
  const isPng = uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47;
  return isJpeg || isPng;
}

/** Fetch image from URL safely into an ArrayBuffer for PDFKit standalone */
async function fetchImageBuffer(url: string | null | undefined, timeoutMs = 10000): Promise<ArrayBuffer | null> {
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    console.log("[reports.ts fetchImageBuffer] Skipped empty or non-HTTP URL:", url);
    return null;
  }

  let targetUrl = url;
  if (targetUrl.includes("res.cloudinary.com") && targetUrl.includes("/upload/")) {
    if (!targetUrl.includes("f_jpg")) {
      targetUrl = targetUrl.replace("/upload/", "/upload/w_600,c_limit,q_auto,f_jpg/");
    }
  }

  console.log(`[reports.ts fetchImageBuffer] Fetching image from: ${targetUrl} (original: ${url})`);

  // 1. Try fetching transformed baseline JPG from Cloudinary
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "RoboticsERP/1.0",
        "Accept": "image/*,*/*",
      },
    });
    clearTimeout(timer);

    console.log(`[reports.ts fetchImageBuffer] HTTP Status: ${res.status} ${res.statusText}`);
    console.log(`[reports.ts fetchImageBuffer] Content-Type: ${res.headers.get("content-type")}, Content-Length: ${res.headers.get("content-length")}`);

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      console.log(`[reports.ts fetchImageBuffer] Received ${arrayBuffer.byteLength} bytes. First 4 bytes (hex): ${Buffer.from(uint8.slice(0, 4)).toString("hex")}`);

      const isJpeg = uint8[0] === 0xff && uint8[1] === 0xd8;
      const isPng = uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47;
      console.log(`[reports.ts fetchImageBuffer] isJpeg: ${isJpeg}, isPng: ${isPng}`);

      if (isJpeg || isPng) {
        return arrayBuffer;
      }
    } else {
      console.error(`[reports.ts fetchImageBuffer] Non-200 HTTP status returned: ${res.status}`);
    }
  } catch (err: any) {
    console.error(`[reports.ts fetchImageBuffer] Error fetching transformed URL ${targetUrl}:`, err?.message || err);
  }

  // 2. Fallback to fetching original URL
  if (targetUrl !== url) {
    console.log(`[reports.ts fetchImageBuffer] Falling back to original URL: ${url}`);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "RoboticsERP/1.0",
          "Accept": "image/*,*/*",
        },
      });
      clearTimeout(timer);

      console.log(`[reports.ts fetchImageBuffer fallback] HTTP Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        console.log(`[reports.ts fetchImageBuffer fallback] Received ${arrayBuffer.byteLength} bytes.`);
        const isJpeg = uint8[0] === 0xff && uint8[1] === 0xd8;
        const isPng = uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47;
        if (isJpeg || isPng) {
          return arrayBuffer;
        }
      }
    } catch (err: any) {
      console.error(`[reports.ts fetchImageBuffer fallback] Error fetching original URL:`, err?.message || err);
    }
  }

  return null;
}

/** Format dates into short, clean DD-MM-YY format to avoid column overflow ###### */
function formatPdfDate(val: any): string {
  if (!val) return "N/A";
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val).slice(0, 10) || "N/A";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/** Format timestamps into clean short DD-MM-YY HH:MM AM/PM format */
function formatPdfDateTime(val: any): string {
  if (!val) return "N/A";
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val).slice(0, 16) || "N/A";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

/** Utility to generate PDF buffer using pdfkit standalone bundle with inlined fonts */
function renderPdf(builder: (doc: any) => Promise<void>): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: "A4" });
      doc.font("Helvetica");

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

    const nowStr = formatPdfDate(new Date());

    const pdfBuffer = await renderPdf(async (doc) => {
      // Title Header
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("Robotics Bricks & Blocks — Project Master Report", { align: "center" })
        .moveDown(0.3);

      doc
        .fontSize(9)
        .font("Helvetica")
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
        doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text(`${p.id} — ${p.customerName}`, 38, startY + 6);
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#38bdf8").text(`Status: ${p.status} | Pay Status: ${p.paymentStatus || "Pending"}`, 340, startY + 6, { align: "right" });

        doc.y = startY + 30;

        // 2. Basic Info & Financial Details
        doc.fillColor("#0f172a").fontSize(8.5).font("Helvetica-Bold").text("BASIC & FINANCIAL DETAILS:", 35, doc.y);
        doc.moveDown(0.2);

        const infoY = doc.y;
        doc.font("Helvetica").fontSize(8).fillColor("#334155");
        doc.text(`Phone: ${p.phone || "N/A"}`, 40, infoY);
        doc.text(`Location: ${p.location || "N/A"}`, 40, infoY + 12);
        doc.text(`Nature of Work: ${p.natureOfWork || "N/A"}`, 40, infoY + 24);

        doc.text(`Contract Value: INR ${val.toLocaleString("en-IN")}`, 230, infoY);
        doc.text(`Received Amount: INR ${rec.toLocaleString("en-IN")}`, 230, infoY + 12);
        doc.text(`Balance Amount: INR ${bal.toLocaleString("en-IN")}`, 230, infoY + 24);

        // Before & After Photos
        const beforeBuffer = await fetchImageBuffer(p.beforeWorkPhotoUrl);
        const afterBuffer = await fetchImageBuffer(p.afterWorkPhotoUrl);

        const beforeX = 430;
        const afterX = 495;
        const photoY = infoY;

        doc.fontSize(7.5).fillColor("#64748b").text("Before", beforeX, photoY - 9);
        if (beforeBuffer && isValidPdfImageBuffer(beforeBuffer)) {
          try {
            doc.image(beforeBuffer, beforeX, photoY, { fit: [50, 50], align: "center", valign: "center" });
            console.log(`[reports.ts] Embedded before photo in projects report for ${p.id}`);
          } catch (err) {
            console.error("[PDFKit] Error embedding before photo in projects report:", err);
            doc.rect(beforeX, photoY, 50, 50).fillAndStroke("#fef2f2", "#fca5a5");
            doc.fontSize(6).fillColor("#dc2626").text("Photo N/A", beforeX + 2, photoY + 20);
          }
        } else if (p.beforeWorkPhotoUrl) {
          doc.rect(beforeX, photoY, 50, 50).fillAndStroke("#fef2f2", "#fca5a5");
          doc.fontSize(6).fillColor("#dc2626").text("Photo N/A", beforeX + 2, photoY + 20);
        } else {
          doc.rect(beforeX, photoY, 50, 50).fillAndStroke("#f1f5f9", "#cbd5e1");
        }

        doc.fontSize(7.5).fillColor("#64748b").text("After", afterX, photoY - 9);
        if (afterBuffer && isValidPdfImageBuffer(afterBuffer)) {
          try {
            doc.image(afterBuffer, afterX, photoY, { fit: [50, 50], align: "center", valign: "center" });
            console.log(`[reports.ts] Embedded after photo in projects report for ${p.id}`);
          } catch (err) {
            console.error("[PDFKit] Error embedding after photo in projects report:", err);
            doc.rect(afterX, photoY, 50, 50).fillAndStroke("#fef2f2", "#fca5a5");
            doc.fontSize(6).fillColor("#dc2626").text("Photo N/A", afterX + 2, photoY + 20);
          }
        } else if (p.afterWorkPhotoUrl) {
          doc.rect(afterX, photoY, 50, 50).fillAndStroke("#fef2f2", "#fca5a5");
          doc.fontSize(6).fillColor("#dc2626").text("Photo N/A", afterX + 2, photoY + 20);
        } else {
          doc.rect(beforeX, photoY, 50, 50).fillAndStroke("#f1f5f9", "#cbd5e1");
        }

        doc.y = Math.max(infoY + 38, photoY + 55);

        // 3. Assigned Labours & Work Logs Summary
        doc.fillColor("#0f172a").fontSize(8.5).font("Helvetica-Bold").text("ASSIGNED LABOUR ROSTER & WORK LOGS SUMMARY:", 35, doc.y);
        doc.moveDown(0.2);

        const assignments = p.labourAssignments || [];
        if (assignments.length === 0) {
          doc.fontSize(8).font("Helvetica").fillColor("#64748b").text("No labours assigned to this project.", 40, doc.y);
          doc.moveDown(0.4);
        } else {
          for (const asgn of assignments) {
            if (doc.y > 730) doc.addPage();
            const labLogs = (p.labourLogs || []).filter((l: any) => l.labourId === asgn.labourId);
            const daysPresent = labLogs.filter((l: any) => (l.attendance || "Present") !== "Absent").length;
            const totalHours = labLogs.reduce((sum: number, l: any) => sum + (toNumber(l.hoursWorked) || 0), 0);
            const totalEarned = labLogs.reduce((sum: number, l: any) => sum + (toNumber(l.earnedMoney) || 0), 0);

            const statusTag = (asgn as any).isActive !== false ? "[Active]" : "[Previously Assigned / Inactive]";
            const dateStr = formatPdfDate(asgn.assignedDate);

            doc.fontSize(8).font("Helvetica-Bold").fillColor("#1e293b").text(`• ${asgn.labourName} (${asgn.labourType || "Permanent"}) ${statusTag}:`, 40, doc.y);
            doc.font("Helvetica").fillColor("#475569").text(`   Wage: INR ${(asgn.weeklyWage || 0).toLocaleString("en-IN")}/wk | Assigned: ${dateStr} | Days Present: ${daysPresent} | Hours: ${totalHours} hrs | Earned: INR ${Math.round(totalEarned).toLocaleString("en-IN")}`);
            doc.moveDown(0.2);
          }
          doc.moveDown(0.3);
        }

        // 4. Payment Collection History
        doc.fillColor("#0f172a").fontSize(8.5).font("Helvetica-Bold").text("PAYMENT COLLECTION HISTORY:", 35, doc.y);
        doc.moveDown(0.2);

        const payList = p.payments || [];
        if (payList.length === 0) {
          doc.fontSize(8).font("Helvetica").fillColor("#64748b").text("No payments recorded yet for this project.", 40, doc.y);
          doc.moveDown(0.4);
        } else {
          for (const pay of payList) {
            if (doc.y > 730) doc.addPage();
            const payDate = formatPdfDate(pay.paymentDate);
            const pAmt = toNumber(pay.amount);
            doc.fontSize(8).font("Helvetica").fillColor("#334155").text(`• Date: ${payDate} | Amount: INR ${pAmt.toLocaleString("en-IN")} | Mode: ${pay.mode} | Received By: ${pay.receivedBy || "Accounts Desk"}`, 40, doc.y);
            doc.moveDown(0.15);
          }
          doc.moveDown(0.3);
        }

        // 5. Timeline / Status History
        doc.fillColor("#0f172a").fontSize(8.5).font("Helvetica-Bold").text("PROJECT TIMELINE & STATUS HISTORY:", 35, doc.y);
        doc.moveDown(0.2);

        const createdDateStr = formatPdfDate(p.createdAt);
        doc.fontSize(8).font("Helvetica").fillColor("#475569").text(`• Created: ${createdDateStr}`, 40, doc.y);
        doc.moveDown(0.15);

        const history = p.statusHistory || [];
        for (const st of history) {
          if (doc.y > 730) doc.addPage();
          const stTime = formatPdfDate(st.timestamp);
          doc.fontSize(8).font("Helvetica").fillColor("#475569").text(`• ${stTime}: Status changed to ${st.status}${st.note ? ` (${st.note})` : ""}`, 40, doc.y);
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

    const dateRangeStr = startDate && endDate ? `${formatPdfDate(startDate)} to ${formatPdfDate(endDate)}` : "All Recorded Dates";

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

          doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#0f172a").text(`Date: ${formatPdfDate(log.date)}`, 40, startY + 8);
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
          if (inBuffer && isValidPdfImageBuffer(inBuffer)) {
            try {
              doc.image(inBuffer, inX, photoY, { fit: [40, 40], align: "center", valign: "center" });
            } catch (err) {
              console.error("[PDFKit] Error embedding inPhoto:", err);
              doc.rect(inX, photoY, 40, 40).fillAndStroke("#f1f5f9", "#cbd5e1");
              doc.fontSize(7).fillColor("#94a3b8").text("No Photo", inX + 3, photoY + 15);
            }
          } else {
            doc.rect(inX, photoY, 40, 40).fillAndStroke("#f1f5f9", "#cbd5e1");
            doc.fontSize(7).fillColor("#94a3b8").text("No Photo", inX + 3, photoY + 15);
          }

          // Out Photo
          const outBuffer = await fetchImageBuffer(log.outPhotoUrl);
          if (outBuffer && isValidPdfImageBuffer(outBuffer)) {
            try {
              doc.image(outBuffer, outX, photoY, { fit: [40, 40], align: "center", valign: "center" });
            } catch (err) {
              console.error("[PDFKit] Error embedding outPhoto:", err);
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

    const fileDateStr = startDate && endDate ? `${formatPdfDate(startDate)}-to-${formatPdfDate(endDate)}` : formatPdfDate(new Date());
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

    const nowStr = formatPdfDate(new Date());
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
      doc.text(`Lead Engineer: ${project.assignedEngineerName || project.assignedEngineer?.name || "Unassigned"}`, 300, startY + 22);
      doc.text(`Lead Source: ${project.leadSource || "Direct"}`, 300, startY + 36);

      doc.y = startY + 68;

      // Section 2: Important Dates & Timeline
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("2. Key Milestones & Dates", 30, doc.y);
      doc.moveDown(0.3);

      const datesY = doc.y;
      doc.rect(30, datesY, 535, 50).fillAndStroke("#f8fafc", "#cbd5e1");
      doc.fontSize(8.5).font("Helvetica").fillColor("#334155");

      const enquiryDateStr = formatPdfDate(project.enquiry?.enquiryDate);
      const siteVisitStr = formatPdfDate(project.siteVisitDate);
      const scheduledStr = formatPdfDate(project.scheduledDate);
      const committedStr = formatPdfDate(project.workCommittedDate);
      const actualStartStr = formatPdfDate(project.actualWorkStartedDate);

      doc.text(`Enquiry Date: ${enquiryDateStr}`, 40, datesY + 8);
      doc.text(`Site Visit Date: ${siteVisitStr}`, 40, datesY + 24);
      doc.text(`Scheduled Date: ${scheduledStr}`, 200, datesY + 8);
      doc.text(`Work Committed: ${committedStr}`, 200, datesY + 24);
      doc.text(`Actual Start: ${actualStartStr}`, 380, datesY + 8);

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
          const tsStr = formatPdfDateTime(st.timestamp);
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
          const asgnDateStr = formatPdfDate(asgn.assignedDate);
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
          const payDateStr = formatPdfDate(pay.paymentDate);
          const pAmt = toNumber(pay.amount);
          doc.fontSize(8.5).font("Helvetica").fillColor("#334155").text(`• Date: ${payDateStr} | ID: ${pay.id} | Amount: INR ${pAmt.toLocaleString("en-IN")} | Mode: ${pay.mode} | Received By: ${pay.receivedBy || "Accounts"}`, 40, doc.y);
          doc.moveDown(0.2);
        }
        doc.moveDown(0.5);
      }

      // Section 7: Before / After Work Photos
      if (project.beforeWorkPhotoUrl || project.afterWorkPhotoUrl) {
        if (doc.y > 640) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("7. Work Verification Photos", 30, doc.y);
        doc.moveDown(0.5);

        const photoBoxY = doc.y;
        console.log(`[reports.ts Section 7] Fetching verification photos: before=${project.beforeWorkPhotoUrl}, after=${project.afterWorkPhotoUrl}`);
        const beforeBuffer = await fetchImageBuffer(project.beforeWorkPhotoUrl);
        const afterBuffer = await fetchImageBuffer(project.afterWorkPhotoUrl);

        if (project.beforeWorkPhotoUrl) {
          doc.fontSize(8).font("Helvetica-Bold").fillColor("#475569").text("Before Work Photo:", 40, photoBoxY);
          if (beforeBuffer && isValidPdfImageBuffer(beforeBuffer)) {
            try {
              doc.image(beforeBuffer, 40, photoBoxY + 14, { fit: [200, 120] });
              console.log("[reports.ts Section 7] Successfully embedded before work photo into single project report");
            } catch (err) {
              console.error("[PDFKit] Failed to embed before work photo:", err);
              doc.rect(40, photoBoxY + 14, 200, 100).fillAndStroke("#f8fafc", "#e2e8f0");
              doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#dc2626").text("Photo unavailable", 50, photoBoxY + 55);
            }
          } else {
            doc.rect(40, photoBoxY + 14, 200, 100).fillAndStroke("#f8fafc", "#e2e8f0");
            doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#dc2626").text("Photo unavailable", 50, photoBoxY + 55);
          }
        }

        if (project.afterWorkPhotoUrl) {
          doc.fontSize(8).font("Helvetica-Bold").fillColor("#475569").text("After Work Photo:", 280, photoBoxY);
          if (afterBuffer && isValidPdfImageBuffer(afterBuffer)) {
            try {
              doc.image(afterBuffer, 280, photoBoxY + 14, { fit: [200, 120] });
              console.log("[reports.ts Section 7] Successfully embedded after work photo into single project report");
            } catch (err) {
              console.error("[PDFKit] Failed to embed after work photo:", err);
              doc.rect(280, photoBoxY + 14, 200, 100).fillAndStroke("#f8fafc", "#e2e8f0");
              doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#dc2626").text("Photo unavailable", 290, photoBoxY + 55);
            }
          } else {
            doc.rect(280, photoBoxY + 14, 200, 100).fillAndStroke("#f8fafc", "#e2e8f0");
            doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#dc2626").text("Photo unavailable", 290, photoBoxY + 55);
          }
        }

        doc.y = photoBoxY + 140;
        doc.moveDown(0.5);
      }

      // Section 8: Project Activity History Log
      if (project.activities && project.activities.length > 0) {
        if (doc.y > 680) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("8. Project Activity Audit Trail", 30, doc.y);
        doc.moveDown(0.3);

        for (const act of project.activities) {
          if (doc.y > 720) doc.addPage();
          const actTs = formatPdfDateTime(act.timestamp);
          doc.fontSize(8.5).font("Helvetica").fillColor("#475569").text(`[${actTs}] ${act.actor}: ${act.event} — ${act.details}`, 40, doc.y);
          doc.moveDown(0.2);
        }
      }
    });

    return {
      base64: pdfBuffer.toString("base64"),
      filename: `project-report-${project.id}.pdf`,
    };
  });
