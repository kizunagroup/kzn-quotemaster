import { config } from "dotenv";

// Load environment variables before any other imports
config();

import { db } from "./drizzle";
import {
  users,
  teams,
  teamMembers,
  suppliers,
  supplierServiceScopes,
  products,
  quotations,
  quoteItems,
  priceHistory,
} from "./schema";
import { hashPassword } from "@/lib/auth/session";
import { sql } from "drizzle-orm";

// Helper function to generate random Vietnamese names
const firstNames = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Cao", "Mai", "Lưu",
];

const middleNames = [
  "Văn", "Thị", "Minh", "Hoàng", "Thanh", "Hải", "Quang", "Tuấn", "Công", "Đức",
  "Xuân", "Thu", "Hà", "Kim", "Lan", "Mai", "Tâm", "An", "Bảo", "Khải",
];

const lastNames = [
  "Anh", "Bình", "Cường", "Dũng", "Hùng", "Khoa", "Long", "Minh", "Nam", "Phúc",
  "Quân", "Sơn", "Tuấn", "Vũ", "Xuân", "Yến", "Linh", "Hương", "Thảo", "Vy",
  "Châu", "Duy", "Giang", "Hiền", "Khánh", "Lâm", "Phương", "Trang", "Uyên", "Hòa",
];

const regions = [
  "Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Hải Phòng", "Nha Trang",
  "Quận 1", "Quận 2", "Quận 3", "Quận 7", "Thủ Đức", "Tân Bình",
  "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Huế", "Vũng Tàu", "Quy Nhon",
];

// V3.2 Enhanced department structure
const departmentStructure = {
  ADMIN: {
    roles: ["ADMIN_SUPER_ADMIN", "ADMIN_MANAGER", "ADMIN_STAFF"],
    count: 8,
    jobTitles: ["System Administrator", "Admin Manager", "IT Manager", "Database Admin", "Security Admin", "Network Admin", "System Analyst", "IT Support"],
  },
  PROCUREMENT: {
    roles: ["PROCUREMENT_SUPER_ADMIN", "PROCUREMENT_MANAGER", "PROCUREMENT_STAFF"],
    count: 12,
    jobTitles: ["Procurement Director", "Procurement Manager", "Category Manager", "Sourcing Specialist", "Contract Manager", "Vendor Manager", "Quality Assurance", "Cost Analyst", "Supply Chain Coordinator", "Procurement Assistant", "Market Analyst", "Compliance Officer"],
  },
  KITCHEN: {
    roles: ["KITCHEN_MANAGER", "KITCHEN_STAFF", "KITCHEN_VIEWER"],
    count: 25,
    jobTitles: ["Bếp trưởng", "Bếp phó", "Đầu bếp chính", "Đầu bếp", "Phụ bếp", "Nhân viên phục vụ"],
  },
  ACCOUNTING: {
    roles: ["ACCOUNTING_MANAGER", "ACCOUNTING_STAFF"],
    count: 6,
    jobTitles: ["Trưởng Phòng Kế Toán", "Kế Toán Trưởng", "Kế Toán Thuế", "Kế Toán Chi Phí", "Thủ Quỹ", "Nhân Viên Kế Toán"],
  },
  OPERATIONS: {
    roles: ["OPERATIONS_MANAGER", "OPERATIONS_STAFF"],
    count: 8,
    jobTitles: ["Operations Director", "Operations Manager", "Process Manager", "Quality Manager", "Logistics Coordinator", "Operations Analyst", "Performance Specialist", "Operations Assistant"],
  },
};

function generateRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${middleName} ${lastName}`;
}

function generateEmail(name: string, index: number): string {
  const nameParts = name.toLowerCase().split(" ");
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[1] || nameParts[0];
  return `${lastName}.${firstName}${index}@quotemaster.local`;
}

function generateEmployeeCode(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(6, "0")}`;
}

function generateTeamCode(index: number): string {
  return `BEP${String(index).padStart(3, "0")}`;
}

function generatePhone(): string {
  const prefixes = ["090", "091", "092", "093", "094", "095", "096", "097", "098", "099"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
  return prefix + suffix;
}

function generateAddress(region: string): string {
  const streetNumber = Math.floor(Math.random() * 999) + 1;
  const streets = [
    "Đường Nguyễn Huệ", "Đường Lê Lợi", "Đường Trần Hưng Đạo", "Đường Hai Bà Trưng",
    "Đường Võ Văn Tần", "Đường Cách Mạng Tháng 8", "Đường Điện Biên Phủ",
    "Đường Nguyễn Thị Minh Khai", "Đường Lý Tự Trọng", "Đường Pasteur",
  ];
  const street = streets[Math.floor(Math.random() * streets.length)];
  return `${streetNumber} ${street}, ${region}`;
}

function generateHireDate(): Date {
  const now = new Date();
  const yearsAgo = Math.floor(Math.random() * 5) + 1;
  const monthsAgo = Math.floor(Math.random() * 12);
  return new Date(
    now.getFullYear() - yearsAgo,
    now.getMonth() - monthsAgo,
    Math.floor(Math.random() * 28) + 1
  );
}

function generateTaxId(): string {
  return Math.floor(Math.random() * 9000000000) + 1000000000 + "";
}

function generateCompanyName(): string {
  const types = ["Công ty TNHH", "Công ty Cổ Phần", "Tập Đoàn", "Hợp Tác Xã"];
  const sectors = ["Thực Phẩm An Toàn", "Nông Sản Sạch", "Thực Phẩm Hữu Cơ", "Chế Biến Thực Phẩm"];
  const type = types[Math.floor(Math.random() * types.length)];
  const sector = sectors[Math.floor(Math.random() * sectors.length)];
  const regionName = regions[Math.floor(Math.random() * regions.length)];
  return `${type} ${sector} ${regionName}`;
}

function getRandomPastDate(): Date {
  const now = new Date();
  const pastMonths = Math.floor(Math.random() * 12) + 1;
  return new Date(
    now.getFullYear(),
    now.getMonth() - pastMonths,
    Math.floor(Math.random() * 28) + 1
  );
}

async function cleanupExistingData() {
  console.log("🧹 Cleaning up existing data...");

  try {
    // Delete in order of foreign key dependencies (child tables first)
    console.log("   Deleting price history...");
    await db.delete(priceHistory);

    console.log("   Deleting quote items...");
    await db.delete(quoteItems);

    console.log("   Deleting quotations...");
    await db.delete(quotations);

    console.log("   Deleting supplier service scopes...");
    await db.delete(supplierServiceScopes);

    console.log("   Deleting products...");
    await db.delete(products);

    console.log("   Deleting suppliers...");
    await db.delete(suppliers);

    console.log("   Deleting team members...");
    await db.delete(teamMembers);

    console.log("   Deleting teams...");
    await db.delete(teams);

    console.log("   Deleting users...");
    await db.delete(users);

    console.log("✅ Existing data cleaned up successfully");
  } catch (error) {
    console.error("❌ Error cleaning up data:", error);
    console.warn("⚠️  WARNING: Cleanup failed. This may cause duplicate key errors.");
  }
}

export async function seedDatabase() {
  console.log("🌱 Starting V3.2 database seeding...");

  // 1. Clean up existing data
  await cleanupExistingData();

  // 2. Create Super Admin user
  let superAdmin;
  try {
    [superAdmin] = await db
      .insert(users)
      .values({
        name: "QuoteMaster Super Admin",
        email: "admin@quotemaster.local",
        passwordHash: await hashPassword("admin123!"),
        employeeCode: "HM000001",
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
    throw new Error("Critical error: Cannot create super admin user");
  }

  // 3. Create users for each department
  const allUsers = [superAdmin];
  const allTeams = [];
  let userCounter = 2;

  for (const [departmentName, config] of Object.entries(departmentStructure)) {
    console.log(`Creating ${departmentName} department...`);

    const departmentUsers = [];

    for (let i = 0; i < config.count; i++) {
      const name = generateRandomName();
      const isManager = i === 0;
      const role = isManager ? config.roles[1] : config.roles[2]; // Manager or Staff
      const jobTitle = config.jobTitles[i % config.jobTitles.length];

      const userData = {
        name: name,
        email: generateEmail(name, userCounter),
        passwordHash: await hashPassword("password123!"),
        employeeCode: generateEmployeeCode("HM", userCounter),
        phone: generatePhone(),
        department: departmentName,
        jobTitle: jobTitle,
        hireDate: generateHireDate(),
        status: Math.random() < 0.95 ? "active" : "inactive",
      };

      const [user] = await db.insert(users).values(userData).returning();
      departmentUsers.push({ ...user, isManager, role });
      allUsers.push(user);
      userCounter++;
    }

    // Create teams based on department type
    if (departmentName === "KITCHEN") {
      // Create multiple kitchen teams (15 teams)
      for (let kitchenIndex = 1; kitchenIndex <= 15; kitchenIndex++) {
        const manager = departmentUsers[Math.floor(Math.random() * departmentUsers.length)];
        const randomRegion = regions[Math.floor(Math.random() * regions.length)];

        const [team] = await db
          .insert(teams)
          .values({
            name: `Bếp ${randomRegion} ${kitchenIndex}`,
            teamType: "KITCHEN",
            teamCode: generateTeamCode(kitchenIndex),
            region: randomRegion,
            address: generateAddress(randomRegion),
            managerId: manager.id,
            status: "active",
          })
          .returning();

        allTeams.push({ ...team, departmentUsers, departmentName });
      }
    } else {
      // Create one office team per department
      const manager = departmentUsers.find(u => u.isManager);
      const randomRegion = regions[Math.floor(Math.random() * regions.length)];

      const [team] = await db
        .insert(teams)
        .values({
          name: `Phòng ${departmentName}`,
          teamType: "OFFICE",
          teamCode: null,
          region: randomRegion,
          address: generateAddress(randomRegion),
          managerId: manager.id,
          status: "active",
        })
        .returning();

      allTeams.push({ ...team, departmentUsers, departmentName });
    }

    console.log(`✅ Created ${departmentName} with ${config.count} users`);
  }

  console.log(`✅ Created ${allUsers.length} users and ${allTeams.length} teams`);

  // 4. Create team member assignments
  const teamMemberAssignments = [];

  // Assign super admin to first admin team
  const adminTeam = allTeams.find(t => t.departmentName === "ADMIN");
  if (adminTeam) {
    teamMemberAssignments.push({
      userId: superAdmin.id,
      teamId: adminTeam.id,
      role: "ADMIN_SUPER_ADMIN",
    });
  }

  // Assign users to their department teams
  for (const team of allTeams) {
    if (team.departmentName === "KITCHEN") {
      // For kitchen teams, assign random users from kitchen department
      const kitchenUsers = team.departmentUsers.slice(0, Math.min(25, team.departmentUsers.length));
      for (const user of kitchenUsers) {
        teamMemberAssignments.push({
          userId: user.id,
          teamId: team.id,
          role: user.role,
        });
      }
    } else {
      // For office teams, assign all department users
      for (const user of team.departmentUsers) {
        teamMemberAssignments.push({
          userId: user.id,
          teamId: team.id,
          role: user.role,
        });
      }
    }
  }

  if (teamMemberAssignments.length > 0) {
    await db.insert(teamMembers).values(teamMemberAssignments);
    console.log(`✅ Created ${teamMemberAssignments.length} team member assignments`);
  }

  // 5. Create suppliers with enhanced data
  const supplierData = [];
  for (let i = 1; i <= 8; i++) {
    const supplierName = generateCompanyName();
    const region = regions[Math.floor(Math.random() * regions.length)];
    const contactName = generateRandomName();

    supplierData.push({
      supplierCode: `NCC${String(i).padStart(3, "0")}`,
      name: supplierName,
      taxId: generateTaxId(),
      address: generateAddress(region),
      contactPerson: contactName,
      phone: generatePhone(),
      contactEmail: generateEmail(contactName, i),
      status: "active",
    });
  }

  const suppliers = await db.insert(suppliers).values(supplierData).returning();
  console.log(`✅ Created ${suppliers.length} suppliers`);

  // 6. Create supplier service scopes (V3.2 CRITICAL)
  const kitchenTeams = allTeams.filter(t => t.departmentName === "KITCHEN");
  const serviceScopeData = [];

  for (const supplier of suppliers) {
    // Each supplier can service 8-12 random kitchen teams
    const servicableTeams = kitchenTeams
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 5) + 8); // 8-12 teams

    for (const team of servicableTeams) {
      serviceScopeData.push({
        supplierId: supplier.id,
        teamId: team.id,
        isActive: Math.random() < 0.9, // 90% active
      });
    }
  }

  await db.insert(supplierServiceScopes).values(serviceScopeData);
  console.log(`✅ Created ${serviceScopeData.length} supplier service scope records`);

  // 7. Create products with realistic Vietnamese food data
  const productCategories = {
    Grains: [
      "Gạo Tám Xoan", "Gạo Jasmine", "Nếp Cẩm", "Gạo ST25", "Gạo Thơm Mali",
      "Gạo Điện Biên", "Gạo Séng Cù", "Nếp Than", "Gạo Tám", "Gạo Đỏ",
      "Gạo Lứt", "Gạo Hương Lài", "Nếp Tím", "Gạo Japonica", "Gạo Basmati",
    ],
    Vegetables: [
      "Rau Muống", "Cải Thảo", "Củ Cải Trắng", "Bầu", "Bí Đỏ", "Bí Xanh",
      "Cà Chua", "Cà Tím", "Ớt", "Hành Tây", "Tỏi", "Gừng", "Rau Xà Lách",
      "Rau Cải", "Cải Ngọt", "Rau Dền", "Mồng Tơi", "Rau Má", "Su Hào",
      "Cải Bẹ Xanh", "Cải Bó Xôi", "Rau Thơm", "Hành Lá", "Ngò", "Rau Răm",
    ],
    Meat: [
      "Thịt Heo Ba Chỉ", "Thịt Bò Úc", "Thịt Gà", "Thịt Vịt", "Thịt Ngan",
      "Thịt Cừu", "Thịt Heo Nạc", "Thịt Bò Kobe", "Thịt Gà Ta", "Thịt Vịt Xiêm",
      "Thịt Heo Rừng", "Thịt Bò Wagyu", "Thịt Gà Tre", "Thịt Thỏ", "Thịt Nai",
    ],
    Seafood: [
      "Cá Basa Phi Lê", "Tôm Sú Tươi", "Cá Hồi", "Cá Ngừ", "Cá Mập",
      "Cá Thu", "Cá Điêu Hồng", "Cá Chẽm", "Cá Diếc", "Cá Trắm", "Cá Rô",
      "Cá Lóc", "Tôm Càng Xanh", "Tôm Thẻ", "Cua Biển", "Cua Đồng",
    ],
    Spices: [
      "Muối", "Đường", "Tiêu", "Quế", "Hồi", "Đinh Hương", "Thảo Quả",
      "Đậu Khấu", "Hạt Nêm", "Bột Ngọt", "Bột Canh", "Nước Mắm", "Tương Ớt",
      "Tương Đen", "Dấm", "Mắm Ruốc", "Mắm Tôm", "Mắm Cáy", "Bột Nghệ",
    ],
    Beverages: [
      "Nước Lọc", "Nước Ngọt", "Bia", "Rượu", "Trà", "Cà Phê", "Nước Ép",
      "Sữa Tươi", "Sữa Chua", "Nước Dừa", "Nước Mía", "Nước Chanh",
      "Sinh Tố", "Nước Cam", "Nước Táo", "Nước Nho", "Trà Sữa", "Cà Phê Sữa",
    ],
  };

  const productData = [];
  let productCounter = 1;

  for (const [category, items] of Object.entries(productCategories)) {
    const categoryPrefix = category.substring(0, 4).toUpperCase();
    let categoryIndex = 1;

    for (const item of items) {
      if (productCounter > 150) break;

      const unit = category === "Beverages" ? "lít" : "kg";
      const supplierIndex = Math.floor(Math.random() * suppliers.length);
      const baseQuantity = Math.floor(Math.random() * 100) + 10; // 10-109

      productData.push({
        code: `${categoryPrefix}${String(categoryIndex).padStart(3, "0")}`,
        name: item,
        category: category,
        unit: unit,
        description: `${item} chất lượng cao, nguồn gốc rõ ràng`,
        baseQuantity: baseQuantity,
        supplierId: suppliers[supplierIndex].id,
      });

      categoryIndex++;
      productCounter++;
    }

    if (productCounter > 150) break;
  }

  const products = await db.insert(products).values(productData).returning();
  console.log(`✅ Created ${products.length} products`);

  // 8. Create V3.2 quotations (WITHOUT teamId)
  const quotationData = [];
  const quotationItemsData = [];

  // Generate periods for the last 6 months
  const periods = [];
  const currentDate = new Date();
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    periods.push(date.toISOString().split('T')[0]);
  }

  const statuses = ['pending', 'approved', 'cancelled', 'negotiation'];
  const procurementUsers = allUsers.filter(u => u.department === 'PROCUREMENT' || u.department === 'ADMIN');

  for (const period of periods) {
    for (const supplier of suppliers) {
      // Each supplier creates 2-4 quotations per period for different regions
      const regionsToQuote = regions.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 2);

      for (const region of regionsToQuote) {
        const randomUser = procurementUsers[Math.floor(Math.random() * procurementUsers.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        const quotationRecord = {
          period: period,
          supplierId: supplier.id,
          region: region,
          status: randomStatus,
          createdBy: randomUser.id,
          notes: `Báo giá ${supplier.name} cho khu vực ${region} - Kỳ ${period}`,
          createdAt: new Date(period),
          updatedAt: new Date(),
          approvedAt: randomStatus === 'approved' ? new Date() : null,
          approvedBy: randomStatus === 'approved' ? randomUser.id : null,
        };

        const [insertedQuotation] = await db.insert(quotations).values(quotationRecord).returning();

        // Generate 5-10 quote items for this quotation
        const categoryProducts = products.slice(0, Math.floor(Math.random() * 10) + 5);

        for (const product of categoryProducts) {
          const quantity = Math.floor(Math.random() * 100) + 10;
          const unitPrice = Math.floor(Math.random() * 500000) + 50000; // 50k - 550k VND

          quotationItemsData.push({
            quotationId: insertedQuotation.id,
            productId: product.id,
            quantity: quantity,
            unitPrice: unitPrice,
            notes: `${product.name} cho khu vực ${region}`,
            createdAt: new Date(period),
            updatedAt: new Date(),
          });
        }

        quotationData.push(quotationRecord);
      }
    }
  }

  if (quotationItemsData.length > 0) {
    await db.insert(quoteItems).values(quotationItemsData);
    console.log(`✅ Created ${quotationData.length} quotations with ${quotationItemsData.length} quote items`);
  }

  // 9. Create price history for approved quotations
  const approvedQuotations = await db
    .select()
    .from(quotations)
    .where(sql`${quotations.status} = 'approved'`);

  const priceHistoryData = [];
  for (const quotation of approvedQuotations) {
    const quotationItems = await db
      .select()
      .from(quoteItems)
      .where(sql`${quoteItems.quotationId} = ${quotation.id}`);

    for (const item of quotationItems) {
      priceHistoryData.push({
        quotationId: quotation.id,
        productId: item.productId,
        period: quotation.period,
        region: quotation.region,
        supplierId: quotation.supplierId,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        approvedAt: quotation.approvedAt,
        approvedBy: quotation.approvedBy,
      });
    }
  }

  if (priceHistoryData.length > 0) {
    await db.insert(priceHistory).values(priceHistoryData);
    console.log(`✅ Created ${priceHistoryData.length} price history records`);
  }

  // 10. Summary reporting
  console.log("\n🎉 V3.2 database seeding completed successfully!");
  console.log("\n📋 V3.2 Architecture Summary:");
  console.log(`   👤 Total Users: ${allUsers.length}`);
  console.log(`   🏢 Total Teams: ${allTeams.length} (${allTeams.filter(t => t.teamType === 'OFFICE').length} office + ${allTeams.filter(t => t.teamType === 'KITCHEN').length} kitchen)`);
  console.log(`   🏭 Suppliers: ${suppliers.length}`);
  console.log(`   🔗 Supplier Service Scopes: ${serviceScopeData.length}`);
  console.log(`   📦 Products: ${products.length}`);
  console.log(`   📋 Quotations: ${quotationData.length} (V3.2 - no teamId)`);
  console.log(`   📊 Quote Items: ${quotationItemsData.length}`);
  console.log(`   💰 Price History: ${priceHistoryData.length}`);
  console.log(`   📅 Periods Covered: ${periods.length} (${periods.join(', ')})`);

  console.log("\n🔐 Login Credentials:");
  console.log("   Email: admin@quotemaster.local");
  console.log("   Password: admin123!");

  console.log("\n✅ V3.2 Key Features:");
  console.log("   ✅ Quotations without teamId (V3.2 architecture)");
  console.log("   ✅ Supplier service scopes define team access");
  console.log("   ✅ Regional quotations instead of team-based");
  console.log("   ✅ Enhanced RBAC with procurement roles");
  console.log("   ✅ Price history tracking for approved quotations");
  console.log("   ✅ Realistic Vietnamese business data");
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("✅ V3.2 database seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}