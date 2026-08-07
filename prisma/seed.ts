import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const now = () => new Date();

// ============================================================
// MASTER DATA — waterproofing / chemical-service themed
// ============================================================

const masterDataSeed: { category: string; value: string; isDefault?: boolean }[] = [
  // Lead Source
  ...["Phone Call", "Website", "Google Search", "WhatsApp", "Instagram", "Facebook", "YouTube", "Word of Mouth", "Existing Customer", "Builder Reference", "Engineer Reference", "CEO Reference", "Advertisement", "Other"].map((v) => ({ category: "Lead Source", value: v, isDefault: true })),

  // Referred By Options
  ...["CEO", "Existing Customer", "Website", "Google", "Friend", "Neighbor", "Contractor", "Architect", "Builder", "Other"].map((v) => ({ category: "Referred By Options", value: v, isDefault: true })),

  // Leakage Type / Nature of Issue (waterproofing themed — from real Excel data)
  ...["Pu Injection", "Sunken Waterproofing", "Terrace Waterproofing", "Tank Waterproofing", "Crack Filling Work", "Tile Grout", "APP Membrane", "Bore Packing", "Epoxy Grouting", "Micro Concreting", "Self Adhesive Membrane", "Expansion Joint Treatment", "Pu Grouting", "Joint Treatment", "Repair Work", "Material Supply", "Coating Work", "Water Proofing"].map((v) => ({ category: "Leakage Type", value: v, isDefault: true })),

  // Nature Of Work (same list — waterproofing services)
  ...["Pu Injection", "Sunken Waterproofing", "Terrace Waterproofing", "Tank Waterproofing", "Crack Filling Work", "Tile Grout", "APP Membrane", "Bore Packing", "Epoxy Grouting", "Micro Concreting", "Self Adhesive Membrane", "Expansion Joint Treatment", "Pu Grouting", "Joint Treatment", "Repair Work", "Material Supply", "Coating Work"].map((v) => ({ category: "Nature Of Work", value: v, isDefault: true })),

  // Engineer Names
  ...["Er. Rajesh Kumar", "Er. Suresh V.", "Er. Ananya Sharma", "Er. Vikramaditya M."].map((v) => ({ category: "Engineer Names", value: v, isDefault: true })),

  // Labour Types
  ...["Permanent", "Contract"].map((v) => ({ category: "Labour Types", value: v, isDefault: true })),

  // Cancellation Reasons
  ...["Client chose internal team due to budget constraints", "Project deferred to next quarter", "Client changed scope", "Site conditions unsuitable"].map((v) => ({ category: "Cancellation Reasons", value: v, isDefault: true })),

  // Payment Modes
  ...["Cash", "Bank Transfer", "UPI", "Google Pay / UPI", "PhonePe", "Paytm", "Cheque", "Credit Collection"].map((v) => ({ category: "Payment Modes", value: v, isDefault: true })),

  // Customer Decision
  ...["Follow Up", "Thinking", "Approved", "Cancelled"].map((v) => ({ category: "Customer Decision", value: v, isDefault: true })),

  // Customer Status
  ...["Active", "Prospective", "VIP Account", "Repeat Customer"].map((v) => ({ category: "Customer Status", value: v, isDefault: true })),

  // Project Status
  ...["Waiting", "Scheduled", "Ongoing", "Completed", "Closed"].map((v) => ({ category: "Project Status", value: v, isDefault: true })),

  // Site Visit Status
  ...["Pending", "Assigned", "Visited", "Completed"].map((v) => ({ category: "Site Visit Status", value: v, isDefault: true })),

  // Work Descriptions (from real Excel daily updates)
  ...["Grinding and Cleaning Work", "Coating works", "Crack cutting & filling", "Packer rod installation", "PU chemical injection", "APP membrane applying work", "Tile Grouts - bathrooms", "Labour work", "Material shifting", "Patch work", "Self-adhesive membrane laying"].map((v) => ({ category: "Work Descriptions", value: v, isDefault: true })),

  // Machine Category
  ...["Grinding Tools", "Cutting Tools", "Injection Equipment", "Coating Tools", "Measurement Tools", "Safety Equipment"].map((v) => ({ category: "Machine Category", value: v, isDefault: true })),

  // Machine Brand
  ...["Aardwolf", "Bosch", "Makita", "DeWalt", "Hilti", "Local"].map((v) => ({ category: "Machine Brand", value: v, isDefault: true })),

  // Machine Unit
  ...["Nos", "Set", "Unit", "Pcs"].map((v) => ({ category: "Machine Unit", value: v, isDefault: true })),

  // Material Category
  ...["Waterproofing Chemicals", "PU Chemicals", "Sealants & Adhesives", "Cement & Grouts", "Tile Grout", "Membranes", "Safety Consumables", "Cleaning Chemicals", "Tools & Blades"].map((v) => ({ category: "Material Category", value: v, isDefault: true })),

  // Material Unit
  ...["Ltr", "Kg", "Meters", "Pcs", "Boxes", "Rolls", "Set", "Bags", "Kit"].map((v) => ({ category: "Material Unit", value: v, isDefault: true })),

  // Locations (frequent sites from real data)
  ...["Rangampalayam", "Kokkarayanpettai", "Kakapalayam", "Anthiyur", "Ashokapuram", "Sipcot-Perundurai", "Bhavani", "Kurikkaranpalayam", "IRT Medical Collage", "Ragupathinaicken Palayam", "Mullamparappu", "Aravakuruchi", "Sampath Nagar", "Manikkampalayam", "Perundurai", "Coimbatore", "Erode"].map((v) => ({ category: "Locations", value: v, isDefault: true })),
];

// ============================================================
// ENGINEERS
// ============================================================

const engineersSeed = [
  { id: "ENG-001", name: "Er. Rajesh Kumar", phone: "9876001122", specialty: "Waterproofing & Membrane Specialist" },
  { id: "ENG-002", name: "Er. Suresh V.", phone: "9876002233", specialty: "PU Injection & Crack Repair Expert" },
  { id: "ENG-003", name: "Er. Ananya Sharma", phone: "9876003344", specialty: "Site Survey & Estimation Lead" },
  { id: "ENG-004", name: "Er. Vikramaditya M.", phone: "9876004455", specialty: "Chemical Application & QC Lead" },
];

// ============================================================
// LABOURS — 14 real workers from the company's Excel sheet
// ============================================================

// Helper: clean phone (strip spaces)
const p = (s: string) => s.replace(/\s+/g, "");

// Random 4-digit PIN generator
const genPin = () => String(Math.floor(1000 + Math.random() * 9000));

const laboursSeed = [
  // Company labours (Permanent)
  { id: "LBR-001", name: "Pradeep Kumar E",  phone: p("96888 24729"), type: "Permanent" as const, defaultWeeklyWage: 14000, skills: ["Waterproofing", "Grinding", "General Servicing"] },
  { id: "LBR-002", name: "Sellakumar",       phone: p("93842 25775"), type: "Permanent" as const, defaultWeeklyWage: 14000, skills: ["PU Injection", "Membrane Work", "Tile Grout"] },
  { id: "LBR-003", name: "Dinesh Kumar",     phone: p("88384 91801"), type: "Permanent" as const, defaultWeeklyWage: 14000, skills: ["Crack Filling", "Tile Grout", "Grinding"] },
  { id: "LBR-004", name: "Velmurugan",       phone: p("73971 12177"), type: "Permanent" as const, defaultWeeklyWage: 14000, skills: ["Waterproofing", "Coating Work"] },
  { id: "LBR-005", name: "Gurumoorthi",      phone: p("81483 37597"), type: "Permanent" as const, defaultWeeklyWage: 14000, skills: ["APP Membrane", "Terrace Waterproofing"] },
  { id: "LBR-006", name: "Soundar",          phone: p("63826 78747"), type: "Permanent" as const, defaultWeeklyWage: 12000, skills: ["Material Shifting", "General Servicing"] },
  { id: "LBR-007", name: "Ajith",            phone: p("98651 74015"), type: "Permanent" as const, defaultWeeklyWage: 14000, skills: ["Waterproofing", "Grinding"] },
  { id: "LBR-008", name: "Ajay",             phone: p("93636 87391"), type: "Permanent" as const, defaultWeeklyWage: 10000, skills: ["General Servicing"] },
  // Contract labours
  { id: "LBR-101", name: "Sathish Kumar",    phone: p("88830 76457"), type: "Contract"  as const, defaultWeeklyWage: 9500,  skills: ["Waterproofing"],           address: "Coimbatore" },
  { id: "LBR-102", name: "Prakash",          phone: p("75025 69398"), type: "Contract"  as const, defaultWeeklyWage: 9500,  skills: ["Crack Repair"],            address: "Anthiyur" },
  { id: "LBR-103", name: "Nagendar",         phone: p("994368150"),   type: "Contract"  as const, defaultWeeklyWage: 9500,  skills: ["General Servicing"],        address: "Coimbatore" },
  { id: "LBR-104", name: "Anand",            phone: p("75300 70638"), type: "Contract"  as const, defaultWeeklyWage: 9500,  skills: ["Waterproofing"],           address: "Nasiyanur" },
  { id: "LBR-105", name: "Nivash",           phone: p("90036 49593"), type: "Contract"  as const, defaultWeeklyWage: 9500,  skills: ["Tile Grout"],              address: "Erode" },
  { id: "LBR-106", name: "Sanjeev",          phone: p("90803 19050"), type: "Contract"  as const, defaultWeeklyWage: 9500,  skills: ["Coating Work"],            address: "Erode" },
];

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Wipe existing seed-scope data (do NOT wipe historical Projects/Payments here — this is idempotent seed only)
  console.log("   Clearing MasterDataItem, Engineer, Labour, SystemSettings...");
  await db.labourWageHistory.deleteMany();
  await db.labour.deleteMany();
  await db.engineer.deleteMany();
  await db.masterDataItem.deleteMany();
  await db.systemSettings.deleteMany();

  // 2. System Settings (singleton)
  console.log("   Seeding SystemSettings...");
  await db.systemSettings.create({
    data: {
      id: "singleton",
      companyName: "Robotics Bricks and Blocks Pvt. Ltd.",
      companyAddress: "Erode, Tamil Nadu, India",
      phone: "+91 98765 43210",
      email: "office@roboticsbricks.com",
      taxId: "GSTIN33AABCR1234F1Z9",
      autoUpdateProjectStatusOnPayment: true,
      defaultLeadSources: ["Phone Call", "Website", "Word of Mouth", "Existing Customer", "Builder Reference"],
      defaultLeakageTypes: ["Pu Injection", "Terrace Waterproofing", "Sunken Waterproofing", "Crack Filling Work", "Tile Grout"],
      defaultWeeklyWagePermanent: 14000,
      defaultWeeklyWageContract: 9500,
    },
  });

  // 3. Master Data
  console.log(`   Seeding ${masterDataSeed.length} MasterDataItems...`);
  for (const item of masterDataSeed) {
    const id = `MD-${item.category.slice(0, 3).toUpperCase()}-${item.value.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
    await db.masterDataItem.create({
      data: {
        id,
        category: item.category,
        value: item.value,
        isActive: true,
        isDefault: item.isDefault ?? false,
        createdAt: now(),
      },
    });
  }

  // 4. Engineers
  console.log(`   Seeding ${engineersSeed.length} Engineers...`);
  for (const eng of engineersSeed) {
    await db.engineer.create({
      data: { ...eng, status: "Available" },
    });
  }

  // 5. Labours
  console.log(`   Seeding ${laboursSeed.length} Labours...`);
  for (const lab of laboursSeed) {
    const loginId = lab.name.split(" ")[0].toLowerCase();
    const pin = genPin();
    await db.labour.create({
      data: {
        id: lab.id,
        name: lab.name,
        phone: lab.phone,
        type: lab.type,
        defaultWeeklyWage: lab.defaultWeeklyWage,
        status: "Available",
        skills: lab.skills,
        loginId,
        pin,
        address: (lab as any).address,
      },
    });
    console.log(`      → ${lab.name.padEnd(20)} loginId=${loginId.padEnd(12)} pin=${pin}`);
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
