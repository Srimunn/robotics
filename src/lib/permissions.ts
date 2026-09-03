import type { CurrentUser } from "./robotics-types";

/**
 * Returns true if the user can perform general mutating actions across modules
 * (Projects, Labours, Engineers, Tools/Machines, Materials, Payments, Customers, Attendance, Settings, Imports).
 *
 * CEO, RS, and DRS (subRole === "RS" | "DRS" or no subRole set for legacy Supervisor/CEO) have full edit permissions.
 * CS and BS (subRole === "CS" or "BS") have strict read-only permissions across these modules.
 */
export function canEdit(currentUser: CurrentUser | null | undefined): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "CEO") return true;
  if (currentUser.role === "Worker") {
    if (currentUser.subRole === "CS" || currentUser.subRole === "BS") {
      return false;
    }
    // RS, DRS, or legacy manager/supervisor without subRole
    return true;
  }
  return false;
}

/**
 * Returns true if the user can create or edit Enquiries.
 * All management roles (CEO, RS, DRS, CS, and BS) have enquiry create and field editing rights.
 */
export function canEditEnquiries(currentUser: CurrentUser | null | undefined): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "CEO" || currentUser.role === "Worker") {
    return true;
  }
  return false;
}

/**
 * Returns true if the user can approve and convert an Enquiry into a Project.
 * Strictly restricted to CEO, RS, and DRS. CS and BS CANNOT convert enquiries.
 */
export function canConvertEnquiry(currentUser: CurrentUser | null | undefined): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "CEO") return true;
  if (currentUser.role === "Worker") {
    if (currentUser.subRole === "CS" || currentUser.subRole === "BS") {
      return false;
    }
    return true;
  }
  return false;
}
