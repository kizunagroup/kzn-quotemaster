import { config } from 'dotenv';

// Load environment variables before any other imports
config();

import { db } from './drizzle';
import {
  users,
  teams,
  teamMembers,
  activityLogs,
  suppliers,
  products,
  kitchenPeriodDemands
} from './schema';
import { hashPassword } from '@/lib/auth/session';

// Helper function to generate random Vietnamese names
const firstNames = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Cao', 'Tran', 'Lưu'
];

const middleNames = [
  'Văn', 'Thị', 'Minh', 'Hoàng', 'Thanh', 'Hải', 'Quang', 'Tuấn', 'Công', 'Đức',
  'Xuân', 'Thu', 'Hà', 'Kim', 'Lan', 'Mai', 'Tâm', 'An', 'Bảo', 'Khải'
];

const lastNames = [
  'Anh', 'Bình', 'Cường', 'Dũng', 'Hùng', 'Khoa', 'Long', 'Minh', 'Nam', 'Phúc',
  'Quân', 'Sơn', 'Tuấn', 'Vũ', 'Xuân', 'Yến', 'Linh', 'Hương', 'Thảo', 'Vy',
  'Châu', 'Duy', 'Giang', 'Hiền', 'Khánh', 'Lâm', 'Phương', 'Trang', 'Uyên', 'Hòa'
];

const regions = [
  'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 7', 'Quận 8',
  'Thủ Đức', 'Tân Bình', 'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận',
  'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Vũng Tàu', 'Nha Trang', 'Huế'
];

const managerRoles: string[] = [
  'kitchen_manager',
  'procurement_manager',
  'admin',
  'manager',
  'super_admin'
];

function generateRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${middleName} ${lastName}`;
}

function generateEmail(name: string, index: number): string {
  const nameParts = name.toLowerCase().split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[1] || nameParts[0];
  return `${lastName}.${firstName}${index}@quotemaster.local`;
}

function generateEmployeeCode(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(3, '0')}`;
}

function generatePhone(): string {
  const prefix = '09';
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
}

function generateAddress(region: string): string {
  const streetNumber = Math.floor(Math.random() * 999) + 1;
  const streets = [
    'Đường Nguyễn Huệ', 'Đường Lê Lợi', 'Đường Trần Hưng Đạo', 'Đường Hai Bà Trưng',
    'Đường Võ Văn Tần', 'Đường Cách Mạng Tháng 8', 'Đường Điện Biên Phủ',
    'Đường Nguyễn Thị Minh Khai', 'Đường Lý Tự Trọng', 'Đường Pasteur'
  ];
  const street = streets[Math.floor(Math.random() * streets.length)];
  return `${streetNumber} ${street}, ${region}, TP.HCM`;
}

function getRandomPastDate(): Date {
  const now = new Date();
  const pastMonths = Math.floor(Math.random() * 12) + 1; // 1-12 months ago
  return new Date(now.getFullYear(), now.getMonth() - pastMonths, Math.floor(Math.random() * 28) + 1);
}

// Generate valid period dates in YYYY-MM-DD format for quotation cycles
function generatePeriodDates(): string[] {
  const periods = [];
  const currentYear = 2024;

  // Generate specific quotation periods throughout the year
  // These represent quotation cycle dates, not quarters
  periods.push(
    `${currentYear}-01-15`, // Mid-January quotation cycle
    `${currentYear}-04-01`, // Q2 start quotation cycle
    `${currentYear}-07-01`, // Q3 start quotation cycle
    `${currentYear}-10-01`, // Q4 start quotation cycle
    `${currentYear}-02-15`, // Mid-February quotation cycle
    `${currentYear}-05-15`, // Mid-May quotation cycle
    `${currentYear}-08-15`, // Mid-August quotation cycle
    `${currentYear}-11-15`  // Mid-November quotation cycle
  );

  return periods;
}

async function cleanupExistingData() {
  console.log("🧹 Cleaning up existing data...");

  try {
    // Delete in order of dependencies (child tables first)
    await db.delete(kitchenPeriodDemands);
    await db.delete(activityLogs);
    await db.delete(teamMembers);
    await db.delete(products);
    await db.delete(suppliers);
    await db.delete(teams);
    await db.delete(users);

    console.log("✅ Existing data cleaned up");
  } catch (error) {
    console.error("❌ Error cleaning up data:", error);
    // Continue with seeding even if cleanup fails
  }
}

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  // 1. Clean up existing data first
  await cleanupExistingData();

  // 2. Create Super Admin User (CRITICAL: Admin power comes from team assignment)
  const [superAdmin] = await db.insert(users).values({
    name: "QuoteMaster Admin",
    email: "admin@quotemaster.local",
    passwordHash: await hashPassword("admin123!"),
    employeeCode: "ADMIN001",
    phone: "0901234567",
    // REMOVED: role field - admin power comes from ADMIN_SUPER_ADMIN role in Office Team
    department: "ADMIN",
    jobTitle: "System Administrator",
    status: "active"
  }).returning();

  console.log("✅ Created super admin user");

  // 3. Generate 15 Manager Users (roles assigned via team memberships)
  const managerUsers = [];
  const managerUserRoles: string[] = []; // Track intended roles for team assignment

  for (let i = 1; i <= 15; i++) {
    const name = generateRandomName();
    const intendedRole = managerRoles[Math.floor(Math.random() * managerRoles.length)];
    const manager = await db.insert(users).values({
      name: name,
      email: generateEmail(name, i),
      passwordHash: await hashPassword("manager123!"),
      employeeCode: generateEmployeeCode("MG", i),
      phone: generatePhone(),
      // REMOVED: role field - roles now assigned via team memberships
      department: "ADMIN",
      jobTitle: "Manager",
      status: "active"
    }).returning();

    managerUsers.push(manager[0]);
    managerUserRoles.push(intendedRole); // Store for team assignment
  }

  console.log(`✅ Created ${managerUsers.length} manager users`);

  // 4. Create Office Team (CRITICAL: This is where admin will be assigned)
  const [officeTeam] = await db.insert(teams).values({
    name: "Văn Phòng Trung Tâm",
    teamType: "OFFICE",
    region: "Trung Tâm",
    address: "123 Đường ABC, Quận 1, TP.HCM",
    managerId: superAdmin.id,
    status: "active"
  }).returning();

  console.log("✅ Created office team");

  // 5. Generate 120 Kitchen Teams with diverse data
  const kitchenTeams = [];

  for (let i = 1; i <= 120; i++) {
    // Random assignments
    const randomManager = managerUsers[Math.floor(Math.random() * managerUsers.length)];
    const randomRegion = regions[Math.floor(Math.random() * regions.length)];

    const kitchen = await db.insert(teams).values({
      name: `Bếp ${randomRegion} ${i}`,
      teamType: "KITCHEN",
      region: randomRegion,
      address: generateAddress(randomRegion),
      managerId: randomManager.id,
      status: i % 15 === 0 ? "inactive" : "active" // 1 in 15 kitchens inactive
    }).returning();

    kitchenTeams.push(kitchen[0]);
  }

  console.log(`✅ Created ${kitchenTeams.length} kitchen teams`);

  // 6. CRITICAL: Assign All Manager Users to Office Team with Proper Roles
  const teamMemberData = [
    // SUPER ADMIN assignment - this is the critical fix
    {
      userId: superAdmin.id,
      teamId: officeTeam.id,
      role: "ADMIN_SUPER_ADMIN" // This role allows staff management
    },
    // Assign manager users to office team with appropriate roles
    ...managerUsers.map((manager, index) => {
      // Convert intended role to enhanced role format
      let enhancedRole = "ADMIN_STAFF"; // Default role
      const intendedRole = managerUserRoles[index];

      switch (intendedRole) {
        case 'super_admin':
          enhancedRole = "ADMIN_SUPER_ADMIN";
          break;
        case 'admin':
        case 'manager':
          enhancedRole = "ADMIN_MANAGER";
          break;
        case 'kitchen_manager':
          enhancedRole = "KITCHEN_MANAGER";
          break;
        case 'procurement_manager':
          enhancedRole = "PROCUREMENT_MANAGER";
          break;
        default:
          enhancedRole = "ADMIN_STAFF";
      }

      return {
        userId: manager.id,
        teamId: officeTeam.id,
        role: enhancedRole
      };
    })
  ];

  await db.insert(teamMembers).values(teamMemberData);

  console.log("✅ Assigned all users to office team with proper roles");
  console.log(`✅ Super Admin assigned with role: ADMIN_SUPER_ADMIN`);

  // 7. Create Enhanced Suppliers
  const sampleSuppliers = await db.insert(suppliers).values([
    {
      supplierCode: "NCC001",
      name: "Công ty TNHH Thực Phẩm An Toàn",
      taxId: "0123456789",
      address: "123 Đường Cầu Giấy, Hà Nội",
      contactPerson: "Nguyễn Văn E",
      phone: "0243456789",
      email: "contact@antoancorp.vn"
    },
    {
      supplierCode: "NCC002",
      name: "Tập Đoàn Thực Phẩm Sạch",
      taxId: "9876543210",
      address: "456 Đường Lê Lợi, Quận 1, TP.HCM",
      contactPerson: "Trần Thị F",
      phone: "0287654321",
      email: "info@cleanfood.vn"
    },
    {
      supplierCode: "NCC003",
      name: "Công ty Cổ Phần Nông Sản Việt",
      taxId: "1357924680",
      address: "789 Đường Hoàng Văn Thụ, Đà Nẵng",
      contactPerson: "Lê Văn G",
      phone: "0236789123",
      email: "sales@nongsanviet.com"
    },
    {
      supplierCode: "NCC004",
      name: "Hợp Tác Xã Nông Nghiệp Hữu Cơ",
      taxId: "2468135790",
      address: "321 Đường Nguyễn Huệ, Cần Thơ",
      contactPerson: "Võ Thị H",
      phone: "0292456789",
      email: "organic@huuco.vn"
    }
  ]).returning();

  console.log(`✅ Created ${sampleSuppliers.length} suppliers`);

  // 8. Create Enhanced Products with realistic Vietnamese food data
  const sampleProducts = await db.insert(products).values([
    // Rice and Grains
    {
      productCode: "FOOD001",
      name: "Gạo Tám Xoan",
      category: "Grains",
      unit: "kg",
      description: "Gạo thơm cao cấp vùng miền Tây",
      supplierId: sampleSuppliers[0].id
    },
    {
      productCode: "FOOD002",
      name: "Gạo Jasmine",
      category: "Grains",
      unit: "kg",
      description: "Gạo thơm nhập khẩu Thái Lan",
      supplierId: sampleSuppliers[1].id
    },
    {
      productCode: "FOOD003",
      name: "Nếp Cẩm",
      category: "Grains",
      unit: "kg",
      description: "Nếp tím đặc sản miền Bắc",
      supplierId: sampleSuppliers[2].id
    },

    // Vegetables
    {
      productCode: "VEG001",
      name: "Rau Muống",
      category: "Vegetables",
      unit: "kg",
      description: "Rau muống tươi từ Đà Lạt",
      supplierId: sampleSuppliers[3].id
    },
    {
      productCode: "VEG002",
      name: "Cải Thảo",
      category: "Vegetables",
      unit: "kg",
      description: "Bắp cải trắng tươi ngon",
      supplierId: sampleSuppliers[0].id
    },
    {
      productCode: "VEG003",
      name: "Củ Cải Trắng",
      category: "Vegetables",
      unit: "kg",
      description: "Củ cải trắng to, tươi ngon",
      supplierId: sampleSuppliers[1].id
    },

    // Proteins
    {
      productCode: "MEAT001",
      name: "Thịt Heo Ba Chỉ",
      category: "Meat",
      unit: "kg",
      description: "Thịt heo tươi từ trang trại sạch",
      supplierId: sampleSuppliers[2].id
    },
    {
      productCode: "MEAT002",
      name: "Thịt Bò Úc",
      category: "Meat",
      unit: "kg",
      description: "Thịt bò nhập khẩu Úc",
      supplierId: sampleSuppliers[3].id
    },
    {
      productCode: "FISH001",
      name: "Cá Basa Phi Lê",
      category: "Seafood",
      unit: "kg",
      description: "Cá basa phi lê tươi sống",
      supplierId: sampleSuppliers[0].id
    },
    {
      productCode: "FISH002",
      name: "Tôm Sú Tươi",
      category: "Seafood",
      unit: "kg",
      description: "Tôm sú size 20-30 tươi sống",
      supplierId: sampleSuppliers[1].id
    }
  ]).returning();

  console.log(`✅ Created ${sampleProducts.length} products`);

  // 9. Generate Sample Kitchen Period Demands - FIXED PERIOD FORMAT
  const demandData = [];
  const periods = generatePeriodDates(); // FIXED: Now generates YYYY-MM-DD format periods

  for (const kitchen of kitchenTeams.slice(0, 20)) { // Use first 20 kitchens
    for (const period of periods) {
      for (const product of sampleProducts.slice(0, 5)) { // Use first 5 products
        const quantity = Math.floor(Math.random() * 500) + 50; // 50-550 units
        demandData.push({
          teamId: kitchen.id,           // FIXED: Use teamId instead of kitchenId
          productId: product.id,
          period: period,               // FIXED: Now uses YYYY-MM-DD format
          quantity: quantity.toString(), // FIXED: Use quantity field (decimal as string)
          unit: product.unit,           // FIXED: Add required unit field
          notes: `Nhu cầu cho chu kỳ ${period} - ${kitchen.name}`,
          status: "active",
          createdBy: superAdmin.id,
          createdAt: getRandomPastDate()
        });
      }
    }
  }

  if (demandData.length > 0) {
    await db.insert(kitchenPeriodDemands).values(demandData);
    console.log(`✅ Created ${demandData.length} period demand entries`);
  }

  // 10. Create Activity Logs for audit trail
  const activityData = kitchenTeams.slice(0, 10).map((kitchen, index) => ({
    teamId: kitchen.id,
    action: index % 2 === 0 ? 'created' : 'updated',
    details: `Kitchen ${kitchen.name} was ${index % 2 === 0 ? 'created' : 'updated'} in the system`,
    performedAt: getRandomPastDate(),
  }));

  if (activityData.length > 0) {
    await db.insert(activityLogs).values(activityData);
    console.log(`✅ Created ${activityData.length} activity log entries`);
  }

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`   👤 Users: ${1 + managerUsers.length} (1 super admin, ${managerUsers.length} managers)`);
  console.log(`   🏢 Teams: ${1 + kitchenTeams.length} (1 office, ${kitchenTeams.length} kitchens)`);
  console.log(`   🤝 Team Members: ${teamMemberData.length}`);
  console.log(`   🏭 Suppliers: ${sampleSuppliers.length}`);
  console.log(`   📦 Products: ${sampleProducts.length}`);
  console.log(`   📊 Demand Records: ${demandData.length}`);
  console.log(`   📝 Activity Logs: ${activityData.length}`);
  console.log(`   📅 Period Formats: ${periods.join(', ')}`);
  console.log("\n🔐 Login Credentials:");
  console.log("   Email: admin@quotemaster.local");
  console.log("   Password: admin123!");
  console.log("   Permissions: ADMIN_SUPER_ADMIN role in Office Team");
  console.log("   RBAC Model: Pure team-based authorization via team_members table");
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("✅ Seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}