"use server";

import { createServerFn } from "@tanstack/react-start";
import { db } from "~/lib/db";
import type { AttendanceStatus, VerificationStatus } from "@prisma/client";
import { assertCanEdit } from "./permissions";

export const recordAttendance = createServerFn({ method: "POST" })
  .validator(
    (input: {
      labourId: string;
      date: string;
      status: AttendanceStatus;
      projectId?: string;
      projectName?: string;
      inTime?: string;
      outTime?: string;
      hoursWorked?: number;
      earnedMoney?: number;
      workDescription?: string;
      weeklyWage?: number;
      remarks?: string;
      inPhotoUrl?: string;
      outPhotoUrl?: string;
      requestedByRole?: string | null;
      requestedBySubRole?: string | null;
    }) => input
  )
  .handler(async ({ data }) => {
    if (data.requestedBySubRole === "CS" || data.requestedBySubRole === "BS") {
      throw new Error("Access denied: view-only role");
    }
    const id = `${data.labourId}_${data.date}`;
    const date = new Date(data.date);
    const lab = await db.labour.findUnique({ where: { id: data.labourId } });
    return db.attendanceRecord.upsert({
      where: { labourId_date: { labourId: data.labourId, date } },
      create: {
        id,
        labourId: data.labourId,
        labourName: lab?.name,
        projectId: data.projectId,
        projectName: data.projectName,
        date,
        status: data.status,
        inTime: data.inTime,
        outTime: data.outTime,
        hoursWorked: data.hoursWorked,
        earnedMoney: data.earnedMoney,
        workDescription: data.workDescription,
        weeklyWage: data.weeklyWage,
        remarks: data.remarks,
        inPhotoUrl: data.inPhotoUrl,
        outPhotoUrl: data.outPhotoUrl,
      },
      update: {
        status: data.status,
        projectId: data.projectId,
        projectName: data.projectName,
        inTime: data.inTime,
        outTime: data.outTime,
        hoursWorked: data.hoursWorked,
        earnedMoney: data.earnedMoney,
        workDescription: data.workDescription,
        weeklyWage: data.weeklyWage,
        remarks: data.remarks,
        inPhotoUrl: data.inPhotoUrl !== undefined ? data.inPhotoUrl : undefined,
        outPhotoUrl: data.outPhotoUrl !== undefined ? data.outPhotoUrl : undefined,
      },
    });
  });


export const verifyAttendanceRecord = createServerFn({ method: "POST" })
  .validator(
    (input: { attendanceId: string; status: VerificationStatus; verifierName: string; comments?: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input
  )
  .handler(async ({ data }) => {
    assertCanEdit(data);
    return db.attendanceRecord.update({
      where: { id: data.attendanceId },
      data: {
        verificationStatus: data.status,
        verifiedBy: data.verifierName,
        verifiedDate: new Date(),
        verificationComments: data.comments,
      },
    });
  });

