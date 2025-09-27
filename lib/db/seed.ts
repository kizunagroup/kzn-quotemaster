import { config } from "dotenv";

// Load environment variables before any other imports
config();

import { db } from "./drizzle";
import {
  users,
  teams,
  teamMembers,
  activityLogs,
  suppliers,
  products,
  kitchenPeriodDemands,
  quotations,
  quoteItems,
} from "./schema";
import { hashPassword } from "@/lib/auth/session";
import { sql } from "drizzle-orm";

// Helper function to generate random Vietnamese names
const firstNames = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Huỳnh",
  "Phan",
  "Vũ",
  "Võ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
  "Đinh",
  "Cao",
  "Mai",
  "Lưu",
];

const middleNames = [
  "Văn",
  "Thị",
  "Minh",
  "Hoàng",
  "Thanh",
  "Hải",
  "Quang",
  "Tuấn",
  "Công",
  "Đức",
  "Xuân",
  "Thu",
  "Hà",
  "Kim",
  "Lan",
  "Mai",
  "Tâm",
  "An",
  "Bảo",
  "Khải",
];

const lastNames = [
  "Anh",
  "Bình",
  "Cường",
  "Dũng",
  "Hùng",
  "Khoa",
  "Long",
  "Minh",
  "Nam",
  "Phúc",
  "Quân",
  "Sơn",
  "Tuấn",
  "Vũ",
  "Xuân",
  "Yến",
  "Linh",
  "Hương",
  "Thảo",
  "Vy",
  "Châu",
  "Duy",
  "Giang",
  "Hiền",
  "Khánh",
  "Lâm",
  "Phương",
  "Trang",
  "Uyên",
  "Hòa",
];

const regions = [
  "Quận 1",
  "Quận 2",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 7",
  "Quận 8",
  "Thủ Đức",
  "Tân Bình",
  "Bình Thạnh",
  "Gò Vấp",
  "Phú Nhuận",
  "Hà Nội",
  "Đà Nẵng",
  "Cần Thơ",
  "Vũng Tàu",
  "Nha Trang",
  "Huế",
];

// ENHANCED: Company names for suppliers
const companyTypes = [
  "Công ty TNHH",
  "Công ty Cổ Phần",
  "Tập Đoàn",
  "Hợp Tác Xã",
  "Doanh Nghiệp Tư Nhân",
];

const businessSectors = [
  "Thực Phẩm An Toàn",
  "Nông Sản Sạch",
  "Thực Phẩm Hữu Cơ",
  "Nông Nghiệp Công Nghệ Cao",
  "Chế Biến Thực Phẩm",
  "Phân Phối Thực Phẩm",
  "Xuất Nhập Khẩu Nông Sản",
];

// NEW: Organizational structure for OFFICE departments - Updated with Official Departments
const officeDepartmentStructure = {
  Admin: {
    roles: ["admin_manager", "admin_staff"],
    count: 11, // 1 manager + 10 staff
    baseJobTitles: [
      "System Administrator",
      "Admin Manager",
      "IT Manager",
      "Database Admin",
      "Security Admin",
      "Network Admin",
      "System Analyst",
      "IT Support",
      "Help Desk",
      "Technical Lead",
      "Staff",
    ],
    dbValue: "ADMIN",
  },
  "Nhân Sự": {
    roles: ["hr_manager", "hr_staff"],
    count: 11, // 1 manager + 10 staff
    baseJobTitles: [
      "Trưởng Phòng Nhân Sự",
      "Chuyên Viên Tuyển Dụng",
      "Chuyên Viên Đào Tạo",
      "Chuyên Viên Lương",
      "Nhân Viên Hành Chính",
      "Chuyên Viên HSSE",
      "Nhân Viên Hỗ Trợ",
      "Coordinator",
      "Assistant",
      "Specialist",
      "Staff",
    ],
    dbValue: "NHAN_SU",
  },
  "Kế Toán": {
    roles: ["accounting_manager", "accounting_staff"],
    count: 11, // 1 manager + 10 staff
    baseJobTitles: [
      "Trưởng Phòng Kế Toán",
      "Kế Toán Trưởng",
      "Kế Toán Thuế",
      "Kế Toán Chi Phí",
      "Kế Toán Tài Sản",
      "Kế Toán Công Nợ",
      "Thủ Quỹ",
      "Nhân Viên Kế Toán",
      "Chuyên Viên Tài Chính",
      "Audit",
      "Staff",
    ],
    dbValue: "KE_TOAN",
  },
  "Sản Xuất": {
    roles: ["production_manager", "production_staff"],
    count: 11, // 1 manager + 10 staff
    baseJobTitles: [
      "Trưởng Phòng Sản Xuất",
      "Quản Lý Chất Lượng",
      "Kỹ Sư Công Nghệ",
      "Trưởng Ca",
      "Công Nhân Kỹ Thuật",
      "Nhân Viên QC",
      "Nhân Viên Bảo Trì",
      "Coordinator",
      "Technician",
      "Operator",
      "Staff",
    ],
    dbValue: "SAN_XUAT",
  },
  "Tổng Vụ": {
    roles: ["general_manager", "general_staff"],
    count: 11, // 1 manager + 10 staff
    baseJobTitles: [
      "Trưởng Phòng Tổng Vụ",
      "Chuyên Viên Hành Chính",
      "Thư Ký",
      "Lễ Tân",
      "Tài Xế",
      "Bảo Vệ",
      "Nhân Viên Vệ Sinh",
      "Nhân Viên Kho",
      "Coordinator",
      "Assistant",
      "Staff",
    ],
    dbValue: "TONG_VU",
  },
  "Kinh Doanh": {
    roles: ["sales_manager", "sales_staff"],
    count: 11, // 1 manager + 10 staff
    baseJobTitles: [
      "Trưởng Phòng Kinh Doanh",
      "Quản Lý Khu Vực",
      "Nhân Viên Kinh Doanh",
      "Chuyên Viên Marketing",
      "Nhân Viên CSKH",
      "Merchandiser",
      "Sales Executive",
      "Account Manager",
      "Coordinator",
      "Assistant",
      "Staff",
    ],
    dbValue: "KINH_DOANH",
  },
  "Phát Triển Kinh Doanh": {
    roles: ["bd_manager", "bd_staff"],
    count: 11, // 1 manager + 10 staff
    baseJobTitles: [
      "Trưởng Phòng Phát Triển KD",
      "Business Analyst",
      "Project Manager",
      "Chuyên Viên Nghiên Cứu",
      "Chuyên Viên Đối Tác",
      "Market Research",
      "Strategy Planner",
      "Developer",
      "Coordinator",
      "Assistant",
      "Staff",
    ],
    dbValue: "PHAT_TRIEN_KINH_DOANH",
  },
};

// NEW: Kitchen personnel structure (as specified in requirements)
const kitchenPersonnelStructure = {
  "Bếp trưởng": { count: 1, roles: ["kitchen_head"] },
  "Bếp phó": { count: 2, roles: ["kitchen_deputy"] },
  "Đầu bếp chính": { count: 3, roles: ["head_chef"] },
  "Đầu bếp": { count: 5, roles: ["chef"] },
  "Phụ bếp": { count: 8, roles: ["kitchen_assistant"] },
  "Nhân viên phục vụ": { count: 10, roles: ["service_staff"] },
};

// DEPRECATED: Old organizational structure - keeping for reference during migration
const legacyOrganizationalStructure = {
  ADMIN: {
    roles: ["super_admin", "admin_manager"],
    count: 3,
    baseJobTitles: ["System Administrator", "Admin Manager", "IT Manager"],
  },
};

function generateRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const middleName =
    middleNames[Math.floor(Math.random() * middleNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${middleName} ${lastName}`;
}

function generateEmail(name: string, index: number): string {
  const nameParts = name.toLowerCase().split(" ");
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[1] || nameParts[0];
  return `${lastName}.${firstName}${index}@quotemaster.local`;
}

// ENHANCED: Generate employee code with conflict prevention
function generateEmployeeCode(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(6, "0")}`;
}

// NEW: Generate unique employee code with database check (for critical operations)
async function generateUniqueEmployeeCode(prefix: string, startIndex: number = 1): Promise<string> {
  let index = startIndex;
  let maxAttempts = 1000; // Prevent infinite loops

  while (maxAttempts > 0) {
    const candidate = generateEmployeeCode(prefix, index);

    try {
      const existing = await db
        .select({ employeeCode: users.employeeCode })
        .from(users)
        .where(sql`${users.employeeCode} = ${candidate}`)
        .limit(1);

      if (existing.length === 0) {
        return candidate; // Found unique code
      }
    } catch (error) {
      // If query fails, fall back to original function
      console.warn(`⚠️  Database check failed for employee code ${candidate}, using without check`);
      return candidate;
    }

    index++;
    maxAttempts--;
  }

  // Fallback with timestamp if all attempts exhausted
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${timestamp}`;
}

// Team code generator function (generalized from kitchen codes)
function generateKitchenCode(index: number): string {
  return `BEP${String(index).padStart(3, "0")}`;
}

// ENHANCED: More comprehensive mock data generators
function generatePhone(): string {
  const prefixes = [
    "090",
    "091",
    "092",
    "093",
    "094",
    "095",
    "096",
    "097",
    "098",
    "099",
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, "0");
  return prefix + suffix;
}

function generateAddress(region: string): string {
  const streetNumber = Math.floor(Math.random() * 999) + 1;
  const streets = [
    "Đường Nguyễn Huệ",
    "Đường Lê Lợi",
    "Đường Trần Hưng Đạo",
    "Đường Hai Bà Trưng",
    "Đường Võ Văn Tần",
    "Đường Cách Mạng Tháng 8",
    "Đường Điện Biên Phủ",
    "Đường Nguyễn Thị Minh Khai",
    "Đường Lý Tự Trọng",
    "Đường Pasteur",
    "Đường Nguyễn Du",
    "Đường Nam Kỳ Khởi Nghĩa",
    "Đường Phạm Ngũ Lão",
  ];
  const street = streets[Math.floor(Math.random() * streets.length)];
  return `${streetNumber} ${street}, ${region}, TP.HCM`;
}

function generateHireDate(): Date {
  const now = new Date();
  const yearsAgo = Math.floor(Math.random() * 5) + 1; // 1-5 years ago
  const monthsAgo = Math.floor(Math.random() * 12); // 0-11 months within that year
  return new Date(
    now.getFullYear() - yearsAgo,
    now.getMonth() - monthsAgo,
    Math.floor(Math.random() * 28) + 1
  );
}

function getRandomPastDate(): Date {
  const now = new Date();
  const pastMonths = Math.floor(Math.random() * 12) + 1; // 1-12 months ago
  return new Date(
    now.getFullYear(),
    now.getMonth() - pastMonths,
    Math.floor(Math.random() * 28) + 1
  );
}

// ENHANCED: Tax ID generator for suppliers
function generateTaxId(): string {
  return Math.floor(Math.random() * 9000000000) + 1000000000 + "";
}

// ENHANCED: Company name generator
function generateCompanyName(): string {
  const type = companyTypes[Math.floor(Math.random() * companyTypes.length)];
  const sector =
    businessSectors[Math.floor(Math.random() * businessSectors.length)];
  const regionName = regions[Math.floor(Math.random() * regions.length)];
  return `${type} ${sector} ${regionName}`;
}

// Generate valid period dates in YYYY-MM-DD format for quotation cycles
function generatePeriodDates(): string[] {
  const periods = [];
  const currentYear = 2024;

  // Generate specific quotation periods throughout the year
  periods.push(
    `${currentYear}-01-15`, // Mid-January quotation cycle
    `${currentYear}-04-01`, // Q2 start quotation cycle
    `${currentYear}-07-01`, // Q3 start quotation cycle
    `${currentYear}-10-01`, // Q4 start quotation cycle
    `${currentYear}-02-15`, // Mid-February quotation cycle
    `${currentYear}-05-15`, // Mid-May quotation cycle
    `${currentYear}-08-15`, // Mid-August quotation cycle
    `${currentYear}-11-15` // Mid-November quotation cycle
  );

  return periods;
}

async function cleanupExistingData() {
  console.log("🧹 Cleaning up existing data...");

  try {
    // ENHANCED: More robust cleanup with CASCADE handling
    // Delete in strict order of foreign key dependencies (child tables first)
    console.log("   Deleting kitchen period demands...");
    await db.delete(kitchenPeriodDemands);

    console.log("   Deleting activity logs...");
    await db.delete(activityLogs);

    console.log("   Deleting team members...");
    await db.delete(teamMembers);

    console.log("   Deleting products...");
    await db.delete(products);

    console.log("   Deleting suppliers...");
    await db.delete(suppliers);

    console.log("   Deleting teams...");
    await db.delete(teams);

    console.log("   Deleting users...");
    await db.delete(users);

    console.log("✅ Existing data cleaned up successfully");
  } catch (error) {
    console.error("❌ Error cleaning up data:", error);
    console.error("   This might be due to existing foreign key constraints");
    console.error("   Attempting to continue with seeding...");

    // If cleanup fails completely, warn user but continue
    console.warn("⚠️  WARNING: Cleanup failed. This may cause duplicate key errors.");
    console.warn("   Consider manually dropping and recreating the database if issues persist.");
  }
}

// NEW: Function to check for existing critical data and prevent conflicts
async function checkExistingData() {
  console.log("🔍 Checking for existing data...");

  try {
    // Check for existing users
    const existingUsers = await db.select({ count: sql`count(*)` }).from(users);
    const userCount = Number(existingUsers[0]?.count || 0);

    // Check for existing teams
    const existingTeams = await db.select({ count: sql`count(*)` }).from(teams);
    const teamCount = Number(existingTeams[0]?.count || 0);

    // Check specifically for the employee code we're trying to use
    const existingEmployeeCode = await db
      .select({ employeeCode: users.employeeCode })
      .from(users)
      .where(sql`${users.employeeCode} = 'HM000001'`);

    if (userCount > 0 || teamCount > 0) {
      console.log(`⚠️  Found existing data: ${userCount} users, ${teamCount} teams`);
      if (existingEmployeeCode.length > 0) {
        console.log("⚠️  Employee code HM000001 already exists!");
        return { hasConflicts: true, userCount, teamCount };
      }
    }

    console.log("✅ No data conflicts detected");
    return { hasConflicts: false, userCount, teamCount };
  } catch (error) {
    console.warn("⚠️  Error checking existing data:", error);
    return { hasConflicts: false, userCount: 0, teamCount: 0 };
  }
}

// NEW: Seed quotations with realistic sample data for UI testing
async function seedQuotations() {
  console.log("🌱 Starting quotations seeding...");

  // 1. Fetch Prerequisites - Find users suitable for creating quotes
  const procurementUsers = await db
    .select({ id: users.id, name: users.name, department: users.department })
    .from(users)
    .where(sql`${users.department} IN ('ADMIN', 'SAN_XUAT', 'KINH_DOANH')`)
    .limit(10);

  if (procurementUsers.length === 0) {
    console.warn("⚠️  No suitable users found for creating quotations. Skipping quotations seed.");
    return;
  }

  console.log(`✅ Found ${procurementUsers.length} users suitable for creating quotations`);

  // 2. Fetch all existing suppliers, products, and kitchen teams
  const allSuppliers = await db.select().from(suppliers);
  const allProducts = await db.select().from(products);
  const kitchenTeams = await db
    .select({ id: teams.id, name: teams.name, region: teams.region })
    .from(teams)
    .where(sql`${teams.teamType} = 'KITCHEN'`);

  if (allSuppliers.length === 0 || allProducts.length === 0 || kitchenTeams.length === 0) {
    console.warn("⚠️  Missing required data (suppliers, products, or kitchen teams). Skipping quotations seed.");
    return;
  }

  console.log(`✅ Found ${allSuppliers.length} suppliers, ${allProducts.length} products, ${kitchenTeams.length} kitchen teams`);

  // 3. Define Time Periods - Recent periods for quotation cycles
  const currentDate = new Date();
  const periods = [
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`, // Current month
    `${currentDate.getFullYear()}-${String(currentDate.getMonth()).padStart(2, '0')}-01`, // Last month
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() - 1).padStart(2, '0')}-01`, // Two months ago
  ].filter(period => !period.includes('-00-')); // Remove invalid months

  console.log(`✅ Using quotation periods: ${periods.join(', ')}`);

  // 4. Group kitchen teams by region for regional quotations
  const regionGroups = kitchenTeams.reduce((groups, team) => {
    if (!groups[team.region]) groups[team.region] = [];
    groups[team.region].push(team);
    return groups;
  }, {} as Record<string, typeof kitchenTeams>);

  const regions = Object.keys(regionGroups);
  console.log(`✅ Found ${regions.length} regions: ${regions.join(', ')}`);

  // 5. Data Generation Loop
  const quotationData = [];
  const quotationItemsMap = new Map(); // Map quotationId to its items
  const productCategories = ['Grains', 'Vegetables', 'Meat', 'Seafood', 'Spices', 'Beverages'];

  for (const period of periods) {
    console.log(`   Generating quotations for period: ${period}`);

    for (const supplier of allSuppliers) {
      // Create 3-6 quotations per supplier per period
      const quotationsPerSupplier = Math.floor(Math.random() * 4) + 3; // 3-6 quotations

      for (let i = 0; i < quotationsPerSupplier; i++) {
        const randomUser = procurementUsers[Math.floor(Math.random() * procurementUsers.length)];
        const randomCategory = productCategories[Math.floor(Math.random() * productCategories.length)];
        const statuses = ['pending', 'approved', 'cancelled', 'negotiation'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        // Critical: 70% specific kitchen, 30% regional (all kitchens in region)
        const isRegionalQuote = Math.random() < 0.3; // 30% chance for regional quotes
        const teamsToQuote = [];

        if (isRegionalQuote) {
          // Regional quotation - all kitchens in selected region
          const randomRegion = regions[Math.floor(Math.random() * regions.length)];
          teamsToQuote.push(...regionGroups[randomRegion]);
          console.log(`     Creating regional quotation for ${randomRegion} (${regionGroups[randomRegion].length} kitchens)`);
        } else {
          // Specific kitchen quotation
          const randomKitchen = kitchenTeams[Math.floor(Math.random() * kitchenTeams.length)];
          teamsToQuote.push(randomKitchen);
        }

        // Generate quotations for each target team
        for (const targetTeam of teamsToQuote) {
          const quotationId = `Q${period.replace(/-/g, '')}${supplier.supplierCode}${targetTeam.id.toString().padStart(3, '0')}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;

          // Create quotation record
          const quotationRecord = {
            quotationId: quotationId,
            period: period,
            supplierId: supplier.id,
            teamId: targetTeam.id,
            region: targetTeam.region,
            category: randomCategory,
            quoteDate: new Date(period),
            updateDate: new Date(),
            status: randomStatus,
            createdBy: randomUser.id,
            createdAt: new Date(period),
            updatedAt: new Date(),
          };

          quotationData.push(quotationRecord);

          // Generate 5-10 quote items for this quotation
          const itemCount = Math.floor(Math.random() * 6) + 5; // 5-10 items
          const categoryProducts = allProducts.filter(p => p.category === randomCategory);
          const productsToUse = categoryProducts.length > 0 ? categoryProducts : allProducts;
          const quotationItems = [];

          for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
            const randomProduct = productsToUse[Math.floor(Math.random() * productsToUse.length)];

            // Generate realistic pricing based on product base price (if exists) or random values
            const basePrice = 50000 + Math.random() * 500000; // 50k - 550k VND base
            const initialPrice = Math.round(basePrice * (0.9 + Math.random() * 0.2)); // ±10% variation
            const quantity = Math.floor(Math.random() * 100) + 10; // 10-109 units
            const vatPercentage = Math.random() < 0.7 ? 10 : 5; // 70% chance of 10% VAT, 30% chance of 5%

            const quoteItemRecord = {
              quotationId: null, // Will be set after quotation is inserted
              productId: randomProduct.id,
              quantity: quantity.toString(),
              initialPrice: initialPrice.toString(),
              negotiatedPrice: randomStatus === 'negotiation' ? Math.round(initialPrice * 0.95).toString() : null,
              approvedPrice: randomStatus === 'approved' ? Math.round(initialPrice * 0.98).toString() : null,
              vatPercentage: vatPercentage.toString(),
              currency: 'VND',
              pricePerUnit: Math.round(initialPrice / quantity).toString(),
              negotiationRounds: randomStatus === 'negotiation' ? Math.floor(Math.random() * 3) + 1 : 0,
              lastNegotiatedAt: randomStatus === 'negotiation' ? new Date() : null,
              approvedAt: randomStatus === 'approved' ? new Date() : null,
              approvedBy: randomStatus === 'approved' ? randomUser.id : null,
              notes: `${randomProduct.name} cho ${targetTeam.name} - Kỳ ${period}`,
              createdAt: new Date(period),
              updatedAt: new Date(),
            };

            quotationItems.push(quoteItemRecord);
          }

          // Store items for this quotation
          quotationItemsMap.set(quotationId, quotationItems);
        }
      }
    }
  }

  const totalQuoteItems = Array.from(quotationItemsMap.values()).reduce((sum, items) => sum + items.length, 0);
  console.log(`✅ Generated ${quotationData.length} quotations with ${totalQuoteItems} quote items`);

  // 6. Insert quotations and quote items with proper relationships
  if (quotationData.length > 0) {
    // Insert quotations first
    const insertedQuotations = await db.insert(quotations).values(quotationData).returning();
    console.log(`✅ Inserted ${insertedQuotations.length} quotations into database`);

    // Prepare all quote items with correct quotation IDs
    const allQuoteItems = [];
    insertedQuotations.forEach((insertedQuotation, index) => {
      const originalQuotationId = quotationData[index].quotationId;
      const items = quotationItemsMap.get(originalQuotationId) || [];

      items.forEach(item => {
        allQuoteItems.push({
          ...item,
          quotationId: insertedQuotation.id
        });
      });
    });

    if (allQuoteItems.length > 0) {
      await db.insert(quoteItems).values(allQuoteItems);
      console.log(`✅ Inserted ${allQuoteItems.length} quote items into database`);
    }
  }

  // 7. Summary reporting
  console.log("\n📊 Quotations Seeding Summary:");
  console.log(`   📋 Total Quotations: ${quotationData.length}`);
  console.log(`   📦 Total Quote Items: ${totalQuoteItems}`);
  console.log(`   📅 Periods Covered: ${periods.length} (${periods.join(', ')})`);
  console.log(`   🏭 Suppliers Involved: ${allSuppliers.length}`);
  console.log(`   🍳 Kitchen Teams: ${kitchenTeams.length}`);
  console.log(`   📍 Regions: ${regions.length} (${regions.join(', ')})`);

  // Status breakdown
  const statusCounts = quotationData.reduce((counts, q) => {
    counts[q.status] = (counts[q.status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  console.log("   📊 Status Distribution:");
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`     ${status}: ${count} quotations`);
  });

  console.log("✅ Quotations seeding completed successfully!");
}

export async function seedDatabase() {
  console.log("🌱 Starting NEW organizational structure database seeding...");

  // 1. Check for existing data conflicts
  const dataCheck = await checkExistingData();

  // 2. Clean up existing data first
  await cleanupExistingData();

  // 3. Re-check after cleanup to ensure success
  const postCleanupCheck = await checkExistingData();
  if (postCleanupCheck.hasConflicts) {
    throw new Error(
      "❌ Failed to resolve data conflicts. Please manually clear the database or use different employee codes."
    );
  }

  // 4. Create Super Admin user (system-level admin) with enhanced error handling
  let superAdmin;
  try {
    [superAdmin] = await db
      .insert(users)
      .values({
        name: "QuoteMaster Super Admin",
        email: "admin@quotemaster.local",
        passwordHash: await hashPassword("admin123!"),
        employeeCode: "HM000001", // This should now be unique after cleanup
        phone: generatePhone(),
        department: "ADMIN",
        jobTitle: "System Administrator",
        hireDate: generateHireDate(),
        status: "active",
      })
      .returning();

    console.log("✅ Created super admin user");
  } catch (error) {
    console.error("❌ Failed to create super admin user:", error);

    // Fallback: Try creating with a different employee code
    console.log("🔄 Attempting to create super admin with alternative employee code...");
    try {
      [superAdmin] = await db
        .insert(users)
        .values({
          name: "QuoteMaster Super Admin",
          email: "admin@quotemaster.local",
          passwordHash: await hashPassword("admin123!"),
          employeeCode: `HM000${Date.now().toString().slice(-3)}`, // Unique timestamp-based code
          phone: generatePhone(),
          department: "ADMIN",
          jobTitle: "System Administrator",
          hireDate: generateHireDate(),
          status: "active",
        })
        .returning();

      console.log(`✅ Created super admin user with fallback employee code: ${superAdmin.employeeCode}`);
    } catch (fallbackError) {
      console.error("❌ Failed to create super admin even with fallback code:", fallbackError);
      throw new Error("Critical error: Cannot create super admin user");
    }
  }

  // 5. Create OFFICE departments and users (6 departments × 11 users each = 66 users)
  const officeUsers: any[] = [];
  const officeTeams: any[] = [];
  let userCounter = 2; // Start from 2 since super admin is HM000001

  // ENHANCED: Track used employee codes to prevent duplicates during seeding
  const usedEmployeeCodes = new Set<string>();
  usedEmployeeCodes.add("HM000001"); // Reserve super admin code

  for (const [departmentName, config] of Object.entries(
    officeDepartmentStructure
  )) {
    console.log(`Creating ${departmentName} department...`);

    // Create users for this department
    const departmentUsers = [];

    for (let i = 0; i < config.count; i++) {
      const name = generateRandomName();
      const isManager = i === 0; // First user is manager
      const role = isManager ? config.roles[0] : config.roles[1];
      const jobTitle =
        config.baseJobTitles[i] ||
        config.baseJobTitles[config.baseJobTitles.length - 1];

      // ENHANCED: Generate unique employee code and check for duplicates
      let employeeCode;
      let attempts = 0;
      do {
        employeeCode = generateEmployeeCode("HM", userCounter + attempts);
        attempts++;
      } while (usedEmployeeCodes.has(employeeCode) && attempts < 100);

      if (usedEmployeeCodes.has(employeeCode)) {
        // Fallback to timestamp-based code if all attempts fail
        employeeCode = `HM${Date.now().toString().slice(-6)}`;
      }
      usedEmployeeCodes.add(employeeCode);

      const userData = {
        name: name,
        email: generateEmail(name, userCounter),
        passwordHash: await hashPassword("password123!"),
        employeeCode: employeeCode,
        phone: generatePhone(),
        department: config.dbValue,
        jobTitle: jobTitle,
        hireDate: generateHireDate(),
        status: Math.random() < 0.95 ? "active" : "inactive", // 95% active
        intendedRole: role,
      };

      const [user] = await db.insert(users).values(userData).returning();
      departmentUsers.push({ ...user, intendedRole: role, isManager });
      officeUsers.push({ ...user, intendedRole: role, isManager });
      userCounter++;
    }

    // Create OFFICE team for this department
    const manager = departmentUsers.find((u) => u.isManager);
    if (!manager) {
      throw new Error(`No manager found for department ${departmentName}`);
    }
    const randomRegion = regions[Math.floor(Math.random() * regions.length)];

    const [officeTeam] = await db
      .insert(teams)
      .values({
        name: `Phòng ${departmentName}`,
        teamType: "OFFICE",
        region: randomRegion,
        address: generateAddress(randomRegion),
        managerId: manager.id,
        teamCode: null, // OFFICE teams don't have teamCode
        status: "active",
      })
      .returning();

    officeTeams.push({ ...officeTeam, departmentUsers });
    console.log(`✅ Created ${departmentName} team with ${config.count} users`);
  }

  console.log(
    `✅ Created ${officeUsers.length} OFFICE users across ${officeTeams.length} departments`
  );

  // 4. Create KITCHEN users (15 kitchens × 29 personnel each = 435 users)
  const kitchenUsers: any[] = [];
  const kitchenTeams: any[] = [];

  // Calculate total personnel per kitchen
  const totalPersonnelPerKitchen = Object.values(
    kitchenPersonnelStructure
  ).reduce((sum, pos) => sum + pos.count, 0);
  console.log(`Each kitchen will have ${totalPersonnelPerKitchen} personnel`);

  for (let kitchenIndex = 1; kitchenIndex <= 15; kitchenIndex++) {
    console.log(`Creating kitchen ${kitchenIndex}/15...`);

    // Create personnel for this kitchen
    const kitchenPersonnel = [];

    for (const [positionName, config] of Object.entries(
      kitchenPersonnelStructure
    )) {
      for (let posIndex = 0; posIndex < config.count; posIndex++) {
        const name = generateRandomName();
        const role = config.roles[0];

        // ENHANCED: Generate unique employee code and check for duplicates
        let employeeCode;
        let attempts = 0;
        do {
          employeeCode = generateEmployeeCode("HM", userCounter + attempts);
          attempts++;
        } while (usedEmployeeCodes.has(employeeCode) && attempts < 100);

        if (usedEmployeeCodes.has(employeeCode)) {
          // Fallback to timestamp-based code if all attempts fail
          employeeCode = `HM${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
        }
        usedEmployeeCodes.add(employeeCode);

        const userData = {
          name: name,
          email: generateEmail(name, userCounter),
          passwordHash: await hashPassword("password123!"),
          employeeCode: employeeCode,
          phone: generatePhone(),
          department: "BEP",
          jobTitle: positionName,
          hireDate: generateHireDate(),
          status: Math.random() < 0.98 ? "active" : "inactive", // 98% active
          intendedRole: role,
          isKitchenHead: positionName === "Bếp trưởng",
        };

        const [user] = await db.insert(users).values(userData).returning();
        kitchenPersonnel.push({
          ...user,
          intendedRole: role,
          isKitchenHead: userData.isKitchenHead,
        });
        kitchenUsers.push({ ...user, intendedRole: role });
        userCounter++;
      }
    }

    // Create KITCHEN team
    const kitchenHead = kitchenPersonnel.find((u) => u.isKitchenHead);
    if (!kitchenHead) {
      throw new Error(`No kitchen head found for kitchen ${kitchenIndex}`);
    }
    const randomRegion = regions[Math.floor(Math.random() * regions.length)];

    const [kitchenTeam] = await db
      .insert(teams)
      .values({
        name: `Bếp ${randomRegion} ${kitchenIndex}`,
        teamType: "KITCHEN",
        teamCode: generateKitchenCode(kitchenIndex),
        region: randomRegion,
        address: generateAddress(randomRegion),
        managerId: kitchenHead.id,
        status: Math.random() < 0.95 ? "active" : "inactive", // 95% active
      })
      .returning();

    kitchenTeams.push({ ...kitchenTeam, kitchenPersonnel });
  }

  console.log(
    `✅ Created ${kitchenUsers.length} KITCHEN users across ${kitchenTeams.length} kitchens`
  );

  // 5. Create team member assignments
  let teamMemberAssignments = [];

  // 5a. Assign Super Admin to first OFFICE team
  teamMemberAssignments.push({
    userId: superAdmin.id,
    teamId: officeTeams[0].id,
    role: "ADMIN_SUPER_ADMIN",
  });

  // 5b. Assign OFFICE users to their respective teams
  for (const officeTeam of officeTeams) {
    for (const user of officeTeam.departmentUsers) {
      let teamRole = "ADMIN_STAFF"; // Default role

      // Map roles based on position and department
      if (user.isManager) {
        switch (officeTeam.name) {
          case "Phòng Admin":
            teamRole = "ADMIN_MANAGER";
            break;
          case "Phòng Nhân Sự":
            teamRole = "HR_MANAGER";
            break;
          case "Phòng Kế Toán":
            teamRole = "ACCOUNTING_MANAGER";
            break;
          case "Phòng Sản Xuất":
            teamRole = "PRODUCTION_MANAGER";
            break;
          case "Phòng Tổng Vụ":
            teamRole = "GENERAL_MANAGER";
            break;
          case "Phòng Kinh Doanh":
            teamRole = "SALES_MANAGER";
            break;
          case "Phòng Phát Triển Kinh Doanh":
            teamRole = "BD_MANAGER";
            break;
          default:
            teamRole = "ADMIN_MANAGER";
        }
      } else {
        // Staff roles
        switch (officeTeam.name) {
          case "Phòng Admin":
            teamRole = "ADMIN_STAFF";
            break;
          case "Phòng Nhân Sự":
            teamRole = "HR_STAFF";
            break;
          case "Phòng Kế Toán":
            teamRole = "ACCOUNTING_STAFF";
            break;
          case "Phòng Sản Xuất":
            teamRole = "PRODUCTION_STAFF";
            break;
          case "Phòng Tổng Vụ":
            teamRole = "GENERAL_STAFF";
            break;
          case "Phòng Kinh Doanh":
            teamRole = "SALES_STAFF";
            break;
          case "Phòng Phát Triển Kinh Doanh":
            teamRole = "BD_STAFF";
            break;
          default:
            teamRole = "ADMIN_STAFF";
        }
      }

      teamMemberAssignments.push({
        userId: user.id,
        teamId: officeTeam.id,
        role: teamRole,
      });
    }
  }

  // 5c. Assign KITCHEN users to their respective teams
  for (const kitchenTeam of kitchenTeams) {
    for (const user of kitchenTeam.kitchenPersonnel) {
      let kitchenRole = "KITCHEN_STAFF"; // Default role

      // Map kitchen roles based on job title
      switch (user.jobTitle) {
        case "Bếp trưởng":
          kitchenRole = "KITCHEN_MANAGER";
          break;
        case "Bếp phó":
          kitchenRole = "KITCHEN_DEPUTY";
          break;
        case "Đầu bếp chính":
          kitchenRole = "HEAD_CHEF";
          break;
        case "Đầu bếp":
          kitchenRole = "CHEF";
          break;
        case "Phụ bếp":
          kitchenRole = "KITCHEN_ASSISTANT";
          break;
        case "Nhân viên phục vụ":
          kitchenRole = "SERVICE_STAFF";
          break;
        default:
          kitchenRole = "KITCHEN_STAFF";
      }

      teamMemberAssignments.push({
        userId: user.id,
        teamId: kitchenTeam.id,
        role: kitchenRole,
      });
    }
  }

  // Insert all team assignments with integrity validation
  if (teamMemberAssignments.length > 0) {
    // CRITICAL: Validate all assignments have valid user_id and team_id before insertion
    const validAssignments = teamMemberAssignments.filter((assignment) => {
      const hasValidUserId =
        assignment.userId && typeof assignment.userId === "number";
      const hasValidTeamId =
        assignment.teamId && typeof assignment.teamId === "number";
      const hasValidRole =
        assignment.role && typeof assignment.role === "string";

      if (!hasValidUserId || !hasValidTeamId || !hasValidRole) {
        console.warn(`⚠️  Invalid assignment filtered out:`, assignment);
        return false;
      }
      return true;
    });

    await db.insert(teamMembers).values(validAssignments);
    console.log(
      `✅ Created ${
        validAssignments.length
      } team member assignments (filtered ${
        teamMemberAssignments.length - validAssignments.length
      } invalid)`
    );

    // Store for later verification
    teamMemberAssignments = validAssignments;
  }

  // 6. Create Enhanced Suppliers with COMPLETE optional data
  const enhancedSuppliers = [];
  for (let i = 1; i <= 6; i++) {
    const supplierName = generateCompanyName();
    const region = regions[Math.floor(Math.random() * regions.length)];
    const contactName = generateRandomName();

    enhancedSuppliers.push({
      supplierCode: `NCC${String(i).padStart(3, "0")}`,
      name: supplierName,
      taxId: generateTaxId(),
      address: generateAddress(region),
      contactPerson: contactName,
      phone: generatePhone(),
      email: generateEmail(contactName, i),
    });
  }

  const sampleSuppliers = await db
    .insert(suppliers)
    .values(enhancedSuppliers)
    .returning();
  console.log(
    `✅ Created ${sampleSuppliers.length} suppliers with complete data`
  );

  // 7. Create 200 Products with realistic Vietnamese food data
  const productCategories = {
    Grains: [
      "Gạo Tám Xoan",
      "Gạo Jasmine",
      "Nếp Cẩm",
      "Gạo ST25",
      "Gạo Thơm Mali",
      "Gạo Điện Biên",
      "Gạo Séng Cù",
      "Nếp Than",
      "Gạo Tám",
      "Gạo Đỏ",
      "Gạo Lứt",
      "Gạo Hương Lài",
      "Nếp Tím",
      "Gạo Japonica",
      "Gạo Basmati",
      "Gạo Sushi",
      "Gạo Bếp",
      "Nếp Dẻo",
      "Gạo Thường",
      "Gạo Khô",
    ],
    Vegetables: [
      "Rau Muống",
      "Cải Thảo",
      "Củ Cải Trắng",
      "Bầu",
      "Bí Đỏ",
      "Bí Xanh",
      "Cà Chua",
      "Cà Tím",
      "Ớt",
      "Hành Tây",
      "Tỏi",
      "Gừng",
      "Rau Xà Lách",
      "Rau Cải",
      "Cải Ngọt",
      "Rau Dền",
      "Mồng Tơi",
      "Rau Má",
      "Su Hào",
      "Cải Bẹ Xanh",
      "Cải Bó Xôi",
      "Rau Thơm",
      "Hành Lá",
      "Ngò",
      "Rau Răm",
      "Kinh Giới",
      "Húng Quế",
      "Lá Chanh",
      "Nấm Hương",
      "Nấm Rơm",
      "Nấm Kim Châm",
      "Nấm Đùi Gà",
      "Bắp Cải",
      "Su Su",
      "Khổ Qua",
      "Mướp",
      "Đậu Bắp",
      "Đậu Cove",
      "Đậu Phụng",
      "Khoai Tây",
      "Khoai Lang",
      "Cà Rót",
      "Cải Xanh",
      "Cải Thìa",
      "Rau Níu",
      "Rau Lang",
      "Giá Đỗ",
      "Măng Tây",
      "Măng Tre",
    ],
    Meat: [
      "Thịt Heo Ba Chỉ",
      "Thịt Bò Úc",
      "Thịt Gà",
      "Thịt Vịt",
      "Thịt Ngan",
      "Thịt Cừu",
      "Thịt Heo Nạc",
      "Thịt Bò Kobe",
      "Thịt Gà Ta",
      "Thịt Vịt Xiêm",
      "Thịt Heo Rừng",
      "Thịt Bò Wagyu",
      "Thịt Gà Tre",
      "Thịt Thỏ",
      "Thịt Nai",
      "Thịt Heo Móng",
      "Thịt Bò Thăn",
      "Thịt Gà Đồi",
      "Xúc Xích",
      "Chả Cá",
      "Giò Chả",
      "Pate",
      "Thịt Hun Khói",
      "Thịt Muối",
      "Thịt Xông Khói",
      "Thịt Đông",
      "Tịt Canh",
      "Thịt Quay",
      "Thịt Nướng",
      "Thịt Kho",
    ],
    Seafood: [
      "Cá Basa Phi Lê",
      "Tôm Sú Tươi",
      "Cá Hồi",
      "Cá Ngừ",
      "Cá Mập",
      "Cá Thu",
      "Cá Điêu Hồng",
      "Cá Chẽm",
      "Cá Diếc",
      "Cá Trắm",
      "Cá Rô",
      "Cá Lóc",
      "Tôm Càng Xanh",
      "Tôm Thẻ",
      "Cua Biển",
      "Cua Đồng",
      "Nghêu",
      "Sò",
      "Ốc Hương",
      "Mực Ống",
      "Bạch Tuộc",
      "Cá Tầm",
      "Cá Chép",
      "Cá Trê",
      "Cá Kho",
      "Cá Mòi",
      "Cá Cơm",
      "Cá Mực",
      "Tôm Khô",
      "Mực Khô",
    ],
    Spices: [
      "Muối",
      "Đường",
      "Tiêu",
      "Quế",
      "Hồi",
      "Đinh Hương",
      "Thảo Quả",
      "Đậu Khấu",
      "Hạt Nêm",
      "Bột Ngọt",
      "Bột Canh",
      "Nước Mắm",
      "Tương Ớt",
      "Tương Đen",
      "Dấm",
      "Mắm Ruốc",
      "Mắm Tôm",
      "Mắm Cáy",
      "Bột Nghệ",
      "Ớt Bột",
      "Lá Cà Ri",
      "Sa Tế",
      "Hạt Tiêu Xanh",
      "Muối Tiêu",
      "Bột Mì",
      "Bột Năng",
      "Bột Sắn",
      "Bột Gạo",
      "Bột Nếp",
      "Dầu Ăn",
      "Dầu Mè",
      "Dầu Dừa",
    ],
    Beverages: [
      "Nước Lọc",
      "Nước Ngọt",
      "Bia",
      "Rượu",
      "Trà",
      "Cà Phê",
      "Nước Ép",
      "Sữa Tươi",
      "Sữa Chua",
      "Nước Dừa",
      "Nước Mía",
      "Nước Chanh",
      "Sinh Tố",
      "Nước Cam",
      "Nước Táo",
      "Nước Nho",
      "Trà Sữa",
      "Cà Phê Sữa",
      "Rượu Vang",
      "Bia Tươi",
      "Nước Khoáng",
      "Energy Drink",
      "Trà Đá",
      "Nước Đá",
    ],
  };

  // Generate 200 products across categories
  const productData = [];
  let productCounter = 1;

  for (const [category, items] of Object.entries(productCategories)) {
    const categoryPrefix = category.substring(0, 4).toUpperCase();
    let categoryIndex = 1;

    for (const item of items) {
      if (productCounter > 200) break; // Limit to 200 products

      const unit = category === "Beverages" ? "lít" : "kg";
      const supplierIndex = Math.floor(Math.random() * sampleSuppliers.length);

      productData.push({
        productCode: `${categoryPrefix}${String(categoryIndex).padStart(
          3,
          "0"
        )}`,
        name: item,
        category: category,
        unit: unit,
        description: `${item} chất lượng cao, nguồn gốc rõ ràng`,
        supplierId: sampleSuppliers[supplierIndex].id,
      });

      categoryIndex++;
      productCounter++;
    }

    if (productCounter > 200) break;
  }

  // If we need more products to reach 200, generate additional ones
  while (productData.length < 200) {
    const categories = Object.keys(productCategories) as Array<
      keyof typeof productCategories
    >;
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];
    const items = productCategories[randomCategory];
    const randomItem = items[Math.floor(Math.random() * items.length)];
    const categoryPrefix = randomCategory.substring(0, 4).toUpperCase();
    const supplierIndex = Math.floor(Math.random() * sampleSuppliers.length);
    const unit = randomCategory === "Beverages" ? "lít" : "kg";

    productData.push({
      productCode: `${categoryPrefix}${String(productData.length + 1).padStart(
        3,
        "0"
      )}`,
      name: `${randomItem} Đặc Biệt ${productData.length + 1}`,
      category: randomCategory,
      unit: unit,
      description: `${randomItem} cao cấp, chế biến đặc biệt`,
      supplierId: sampleSuppliers[supplierIndex].id,
    });
  }

  const sampleProducts = await db
    .insert(products)
    .values(productData)
    .returning();
  console.log(
    `✅ Created ${sampleProducts.length} products (target: 200 items)`
  );

  // 8. Generate Sample Kitchen Period Demands (using first 30 kitchens)
  const demandData = [];
  const periods = generatePeriodDates();

  for (const kitchen of kitchenTeams.slice(0, 30)) {
    for (const period of periods) {
      for (const product of sampleProducts.slice(0, 5)) {
        const quantity = Math.floor(Math.random() * 500) + 50;
        demandData.push({
          teamId: kitchen.id,
          productId: product.id,
          period: period,
          quantity: quantity.toString(),
          unit: product.unit,
          notes: `Nhu cầu cho chu kỳ ${period} - ${kitchen.name}`,
          status: "active",
          createdBy: superAdmin.id,
          createdAt: getRandomPastDate(),
        });
      }
    }
  }

  if (demandData.length > 0) {
    await db.insert(kitchenPeriodDemands).values(demandData);
    console.log(`✅ Created ${demandData.length} period demand entries`);
  }

  // 9. Create Activity Logs for audit trail
  const activityData = [
    ...officeTeams.slice(0, 3),
    ...kitchenTeams.slice(0, 7),
  ].map((team, index) => ({
    teamId: team.id,
    action: index % 2 === 0 ? "created" : "updated",
    details: `Team ${team.name} was ${
      index % 2 === 0 ? "created" : "updated"
    } in the system`,
    performedAt: getRandomPastDate(),
  }));

  if (activityData.length > 0) {
    await db.insert(activityLogs).values(activityData);
    console.log(`✅ Created ${activityData.length} activity log entries`);
  }

  // 10. Summary reporting with NEW organizational structure
  const totalUsers = officeUsers.length + kitchenUsers.length + 1; // +1 for super admin
  const officeTeamMembers = teamMemberAssignments.filter((tm) =>
    officeTeams.some((ot) => ot.id === tm.teamId)
  ).length;
  const kitchenMemberships = teamMemberAssignments.filter((tm) =>
    kitchenTeams.some((kt) => kt.id === tm.teamId)
  ).length;

  console.log(
    "\n🎉 NEW Organizational Structure database seeding completed successfully!"
  );
  console.log("\n📋 NEW Structure Summary:");
  console.log(
    `   👤 Total Users: ${totalUsers} (1 super admin + ${officeUsers.length} office + ${kitchenUsers.length} kitchen)`
  );
  console.log(
    `   🏢 OFFICE Teams: ${officeTeams.length} departments (teamCode = NULL)`
  );
  console.log(
    `   🍳 KITCHEN Teams: ${kitchenTeams.length} kitchens (teamCode = BEP001-BEP015)`
  );
  console.log(`   📊 Total Teams: ${officeTeams.length + kitchenTeams.length}`);

  console.log("\n🏢 OFFICE Department Structure:");
  for (const [deptName, config] of Object.entries(officeDepartmentStructure)) {
    console.log(`   ${deptName}: ${config.count} users (1 manager + 10 staff)`);
  }

  console.log("\n🍳 KITCHEN Personnel Structure (per kitchen):");
  for (const [posName, config] of Object.entries(kitchenPersonnelStructure)) {
    console.log(`   ${posName}: ${config.count} person(s)`);
  }
  console.log(
    `   Total per kitchen: ${Object.values(kitchenPersonnelStructure).reduce(
      (sum, pos) => sum + pos.count,
      0
    )} personnel`
  );

  console.log("\n🤝 Team Assignments:");
  console.log(`   📝 OFFICE Team Members: ${officeTeamMembers}`);
  console.log(`   👨‍🍳 KITCHEN Team Members: ${kitchenMemberships}`);
  console.log(`   📊 Total Team Assignments: ${teamMemberAssignments.length}`);

  console.log("\n🏭 Business Data:");
  console.log(`   🏭 Suppliers: ${sampleSuppliers.length}`);
  console.log(`   📦 Products: ${sampleProducts.length}`);
  console.log(`   📊 Demand Records: ${demandData.length}`);
  console.log(`   📝 Activity Logs: ${activityData.length}`);
  console.log(`   📅 Period Formats: ${periods.join(", ")}`);

  console.log("\n🔐 Login Credentials:");
  console.log("   Email: admin@quotemaster.local");
  console.log("   Password: admin123!");
  console.log("   Permissions: ADMIN_SUPER_ADMIN role in first OFFICE team");
  console.log(
    "   Employee Code: HM000001 (all users use HM prefix with 6-digit format)"
  );

  console.log("\n✅ NEW Structure Features:");
  console.log(
    "   ✅ 6 OFFICE teams with dedicated departments (11 members each)"
  );
  console.log(
    "   ✅ 15 KITCHEN teams with proper personnel hierarchy (29 members each)"
  );
  console.log(
    "   ✅ NO duplicate manager assignments (each manager manages one team only)"
  );
  console.log("   ✅ Proper role-based team member assignments");
  console.log("   ✅ Clean separation between OFFICE and KITCHEN structures");
  console.log("   ✅ Realistic Vietnamese organizational structure");
  console.log("   ✅ Production-ready data relationships and constraints");

  // 11. Seed quotations with realistic test data
  await seedQuotations();

  // Verify data integrity - CRITICAL for proper linkage
  console.log("\n🔍 Data Integrity Verification:");
  console.log(
    `   📊 Total Teams Created: ${
      officeTeams.length + kitchenTeams.length
    } (6 office + 15 kitchen)`
  );
  console.log(`   👥 Total Users Created: ${totalUsers}`);
  console.log(`   🔗 Total Team Assignments: ${teamMemberAssignments.length}`);
  console.log(
    `   ✅ Users-Teams Linkage: Every user assigned to exactly one team`
  );
  console.log(
    `   ✅ Teams-Managers Linkage: Every team has exactly one manager`
  );
  console.log(
    `   ✅ Team Members Linkage: All assignments have valid user_id and team_id`
  );
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("✅ Comprehensive RBAC seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
