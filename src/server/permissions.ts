export interface RequestUserMeta {
  requestedByRole?: string | null;
  requestedBySubRole?: string | null;
}

/**
 * Ensures caller is authorized to perform mutations across standard ERP modules.
 * Throws an error if caller is in view-only subRoles ("CS" or "BS").
 * CEO, RS, and DRS have full mutating access.
 */
export function assertCanEdit(meta?: RequestUserMeta) {
  if (meta?.requestedBySubRole === "CS" || meta?.requestedBySubRole === "BS") {
    throw new Error("Access denied: view-only role");
  }
}

/**
 * Ensures caller is authorized to convert an Enquiry to a Project.
 * Strictly restricted to CEO, RS, and DRS. CS and BS cannot convert enquiries.
 */
export function assertCanConvertEnquiry(meta?: RequestUserMeta) {
  if (meta?.requestedBySubRole === "CS" || meta?.requestedBySubRole === "BS") {
    throw new Error("Access denied: view-only role");
  }
}

/**
 * Enforces enquiry update restrictions:
 * CS and BS can update enquiry details, but CANNOT change customerDecision to "Approved".
 */
export function assertCanUpdateEnquiry(
  updates?: { customerDecision?: string | null },
  meta?: RequestUserMeta
) {
  if (
    (meta?.requestedBySubRole === "CS" || meta?.requestedBySubRole === "BS") &&
    updates?.customerDecision === "Approved"
  ) {
    throw new Error("Access denied: CS/BS roles cannot approve enquiries");
  }
}
