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
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Cao', 'Mai', 'Lưu'
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

// ENHANCED: Company names for suppliers
const companyTypes = [
  'Công ty TNHH', 'Công ty Cổ Phần', 'Tập Đoàn', 'Hợp Tác Xã', 'Doanh Nghiệp Tư Nhân'
];

const businessSectors = [
  'Thực Phẩm An Toàn', 'Nông Sản Sạch', 'Thực Phẩm Hữu Cơ', 'Nông Nghiệp Công Nghệ Cao',
  'Chế Biến Thực Phẩm', 'Phân Phối Thực Phẩm', 'Xuất Nhập Khẩu Nông Sản'
];

// RBAC-focused organizational structure
const organizationalStructure = {
  ADMIN: {
    roles: ['super_admin', 'admin_manager'],
    count: 3, // 1 super admin + 2 admin managers
    baseJobTitles: ['System Administrator', 'Admin Manager', 'IT Manager']
  },
  PROCUREMENT: {
    roles: ['procurement_manager', 'procurement_staff'],
    count: 3, // 1 manager + 2 staff
    baseJobTitles: ['Procurement Manager', 'Purchasing Officer', 'Vendor Relations Specialist']
  },
  KITCHEN: {
    roles: ['kitchen_manager', 'kitchen_staff'],
    count: 4, // 2 managers + 2 staff
    baseJobTitles: ['Kitchen Manager', 'Head Chef', 'Sous Chef', 'Kitchen Assistant']
  },
  ACCOUNTING: {
    roles: ['accounting_manager', 'accounting_staff'],
    count: 3, // 1 manager + 2 staff
    baseJobTitles: ['Accounting Manager', 'Financial Analyst', 'Bookkeeper']
  },
  OPERATIONS: {
    roles: ['operations_manager', 'operations_staff'],
    count: 3, // 1 manager + 2 staff
    baseJobTitles: ['Operations Manager', 'Operations Coordinator', 'Logistics Specialist']
  },
  // FIXED: GENERAL users now get proper departments instead of NULL
  GENERAL: {
    roles: ['general_staff'],
    count: 14, // Additional users to reach 30+ total
    baseJobTitles: ['General Staff', 'Assistant', 'Coordinator', 'Specialist'],
    // FIXED: Assign proper departments for GENERAL users
    departments: ['OPERATIONS', 'ADMIN', 'KITCHEN', 'PROCUREMENT', 'ACCOUNTING']
  }
};

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

// Team code generator function (generalized from kitchen codes)
function generateKitchenCode(index: number): string {
  return `BEP${String(index).padStart(3, '0')}`;
}

// ENHANCED: More comprehensive mock data generators
function generatePhone(): string {
  const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return prefix + suffix;
}

function generateAddress(region: string): string {
  const streetNumber = Math.floor(Math.random() * 999) + 1;
  const streets = [
    'Đường Nguyễn Huệ', 'Đường Lê Lợi', 'Đường Trần Hưng Đạo', 'Đường Hai Bà Trưng',
    'Đường Võ Văn Tần', 'Đường Cách Mạng Tháng 8', 'Đường Điện Biên Phủ',
    'Đường Nguyễn Thị Minh Khai', 'Đường Lý Tự Trọng', 'Đường Pasteur',
    'Đường Nguyễn Du', 'Đường Nam Kỳ Khởi Nghĩa', 'Đường Phạm Ngũ Lão'
  ];
  const street = streets[Math.floor(Math.random() * streets.length)];
  return `${streetNumber} ${street}, ${region}, TP.HCM`;
}

function generateHireDate(): Date {
  const now = new Date();
  const yearsAgo = Math.floor(Math.random() * 5) + 1; // 1-5 years ago
  const monthsAgo = Math.floor(Math.random() * 12); // 0-11 months within that year
  return new Date(now.getFullYear() - yearsAgo, now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1);
}

function getRandomPastDate(): Date {
  const now = new Date();
  const pastMonths = Math.floor(Math.random() * 12) + 1; // 1-12 months ago
  return new Date(now.getFullYear(), now.getMonth() - pastMonths, Math.floor(Math.random() * 28) + 1);
}

// ENHANCED: Tax ID generator for suppliers
function generateTaxId(): string {
  return Math.floor(Math.random() * 9000000000) + 1000000000 + '';
}

// ENHANCED: Company name generator
function generateCompanyName(): string {
  const type = companyTypes[Math.floor(Math.random() * companyTypes.length)];
  const sector = businessSectors[Math.floor(Math.random() * businessSectors.length)];
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
  console.log("🌱 Starting comprehensive RBAC database seeding...");

  // 1. Clean up existing data first
  await cleanupExistingData();

  // 2. Create comprehensive organizational structure for RBAC testing
  const allUsers: any[] = [];
  const departmentUsers: Record<string, any[]> = {};
  let userCounter = 1;

  // Create users for each department with proper RBAC structure
  for (const [department, config] of Object.entries(organizationalStructure)) {
    departmentUsers[department] = [];

    for (let i = 0; i < config.count; i++) {
      const name = generateRandomName();
      const roleIndex = Math.floor(i / Math.ceil(config.count / config.roles.length));
      const intendedRole = config.roles[roleIndex] || config.roles[0];
      const jobTitle = config.baseJobTitles[i] || config.baseJobTitles[0];

      // FIXED: Assign proper departments for GENERAL users
      let userDepartment = department;
      if (department === 'GENERAL' && config.departments) {
        userDepartment = config.departments[i % config.departments.length];
      }

      const userData = {
        name: name,
        email: generateEmail(name, userCounter),
        passwordHash: await hashPassword("password123!"),
        employeeCode: generateEmployeeCode(department.substring(0, 3), userCounter),
        phone: generatePhone(), // ENHANCED: All users get phone numbers
        department: userDepartment, // FIXED: No more NULL departments
        jobTitle: jobTitle, // ENHANCED: All users get job titles
        hireDate: generateHireDate(), // ENHANCED: All users get hire dates
        status: Math.random() < 0.9 ? 'active' : 'inactive', // 90% active, 10% inactive for testing
        intendedRole: intendedRole // Store for team assignment later
      };

      const [user] = await db.insert(users).values(userData).returning();
      allUsers.push({ ...user, intendedRole });
      departmentUsers[department].push({ ...user, intendedRole });
      userCounter++;
    }
  }

  console.log(`✅ Created ${allUsers.length} users across ${Object.keys(organizationalStructure).length} departments`);

  // 3. Create the Super Admin user (separate from organizational structure)
  const [superAdmin] = await db.insert(users).values({
    name: "QuoteMaster Super Admin",
    email: "admin@quotemaster.local",
    passwordHash: await hashPassword("admin123!"),
    employeeCode: "ADMIN001",
    phone: generatePhone(), // ENHANCED: Super admin gets phone
    department: "ADMIN",
    jobTitle: "System Administrator",
    hireDate: generateHireDate(), // FIXED: Super admin gets hire date
    status: "active"
  }).returning();

  console.log("✅ Created super admin user");

  // 4. Create Office Team (Central command for admin operations)
  const [officeTeam] = await db.insert(teams).values({
    name: "Văn Phòng Trung Tâm",
    teamType: "OFFICE",
    region: "Trung Tâm",
    address: generateAddress("Quận 1"), // ENHANCED: Generated address for office team
    managerId: superAdmin.id,
    teamCode: null, // FIXED: NULL for office teams
    status: "active"
  }).returning();

  console.log("✅ Created office team");

  // 5. Generate 120 Kitchen Teams with unique kitchen codes and diverse management
  const kitchenTeams = [];
  const kitchenManagers = departmentUsers.KITCHEN.filter(user =>
    user.intendedRole === 'kitchen_manager'
  );

  for (let i = 1; i <= 120; i++) {
    // Cycle through available kitchen managers, or assign random users if not enough managers
    const assignedManager = kitchenManagers[i % kitchenManagers.length] ||
                           allUsers[Math.floor(Math.random() * allUsers.length)];
    const randomRegion = regions[Math.floor(Math.random() * regions.length)];

    const kitchen = await db.insert(teams).values({
      name: `Bếp ${randomRegion} ${i}`,
      teamType: "KITCHEN",
      teamCode: generateKitchenCode(i), // FIXED: Generate unique team codes (BEP001, BEP002, etc.)
      region: randomRegion,
      address: generateAddress(randomRegion), // ENHANCED: All kitchen teams get addresses
      managerId: assignedManager.id,
      status: i % 15 === 0 ? "inactive" : "active" // 1 in 15 kitchens inactive for testing
    }).returning();

    kitchenTeams.push(kitchen[0]);
  }

  console.log(`✅ Created ${kitchenTeams.length} kitchen teams with unique kitchen codes`);

  // 6. COMPREHENSIVE RBAC TEAM ASSIGNMENTS
  const teamMemberAssignments = [];

  // 6a. Assign Super Admin to Office Team
  teamMemberAssignments.push({
    userId: superAdmin.id,
    teamId: officeTeam.id,
    role: "ADMIN_SUPER_ADMIN"
  });

  // 6b. Assign department users to Office Team with appropriate roles
  for (const [department, users] of Object.entries(departmentUsers)) {
    if (department === 'KITCHEN') continue; // Kitchen users handled separately
    if (department === 'GENERAL') continue; // General users get no team assignments initially

    for (const user of users) {
      let teamRole = "ADMIN_STAFF"; // Default role

      // Map intended roles to team roles
      switch (user.intendedRole) {
        case 'super_admin':
          teamRole = "ADMIN_SUPER_ADMIN";
          break;
        case 'admin_manager':
          teamRole = "ADMIN_MANAGER";
          break;
        case 'procurement_manager':
          teamRole = "PROCUREMENT_MANAGER";
          break;
        case 'procurement_staff':
          teamRole = "PROCUREMENT_STAFF";
          break;
        case 'accounting_manager':
          teamRole = "ACCOUNTING_MANAGER";
          break;
        case 'accounting_staff':
          teamRole = "ACCOUNTING_STAFF";
          break;
        case 'operations_manager':
          teamRole = "OPERATIONS_MANAGER";
          break;
        case 'operations_staff':
          teamRole = "OPERATIONS_STAFF";
          break;
        default:
          teamRole = "ADMIN_STAFF";
      }

      teamMemberAssignments.push({
        userId: user.id,
        teamId: officeTeam.id,
        role: teamRole
      });
    }
  }

  // 6c. Assign kitchen users to specific kitchen teams
  const kitchenUsers = departmentUsers.KITCHEN;
  for (let i = 0; i < kitchenUsers.length; i++) {
    const user = kitchenUsers[i];
    // Distribute kitchen users across different kitchen teams
    const assignedKitchen = kitchenTeams[i % Math.min(kitchenTeams.length, 10)]; // Assign to first 10 kitchens

    const kitchenRole = user.intendedRole === 'kitchen_manager' ? 'KITCHEN_MANAGER' : 'KITCHEN_STAFF';

    teamMemberAssignments.push({
      userId: user.id,
      teamId: assignedKitchen.id,
      role: kitchenRole
    });
  }

  // 6d. Create kitchen manager memberships for all kitchen teams
  for (const kitchen of kitchenTeams) {
    teamMemberAssignments.push({
      userId: kitchen.managerId!,
      teamId: kitchen.id,
      role: "KITCHEN_MANAGER"
    });
  }

  // Insert all team assignments
  if (teamMemberAssignments.length > 0) {
    await db.insert(teamMembers).values(teamMemberAssignments);
    console.log(`✅ Created ${teamMemberAssignments.length} team member assignments`);
  }

  // 7. Create Enhanced Suppliers with COMPLETE optional data
  const enhancedSuppliers = [];
  for (let i = 1; i <= 6; i++) {
    const supplierName = generateCompanyName();
    const region = regions[Math.floor(Math.random() * regions.length)];
    const contactName = generateRandomName();

    enhancedSuppliers.push({
      supplierCode: `NCC${String(i).padStart(3, '0')}`,
      name: supplierName,
      taxId: generateTaxId(), // ENHANCED: All suppliers get tax IDs
      address: generateAddress(region), // ENHANCED: All suppliers get addresses
      contactPerson: contactName, // ENHANCED: All suppliers get contact persons
      phone: generatePhone(), // ENHANCED: All suppliers get phone numbers
      email: generateEmail(contactName, i) // ENHANCED: All suppliers get email addresses
    });
  }

  const sampleSuppliers = await db.insert(suppliers).values(enhancedSuppliers).returning();
  console.log(`✅ Created ${sampleSuppliers.length} suppliers with complete data`);

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
      supplierId: sampleSuppliers[4].id
    },
    {
      productCode: "FISH002",
      name: "Tôm Sú Tươi",
      category: "Seafood",
      unit: "kg",
      description: "Tôm sú size 20-30 tươi sống",
      supplierId: sampleSuppliers[5].id
    }
  ]).returning();

  console.log(`✅ Created ${sampleProducts.length} products`);

  // 9. Generate Sample Kitchen Period Demands
  const demandData = [];
  const periods = generatePeriodDates();

  for (const kitchen of kitchenTeams.slice(0, 20)) { // Use first 20 kitchens
    for (const period of periods) {
      for (const product of sampleProducts.slice(0, 5)) { // Use first 5 products
        const quantity = Math.floor(Math.random() * 500) + 50; // 50-550 units
        demandData.push({
          teamId: kitchen.id,
          productId: product.id,
          period: period,
          quantity: quantity.toString(),
          unit: product.unit,
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

  // 11. Summary reporting with RBAC breakdown
  const totalUsers = allUsers.length + 1; // +1 for super admin
  const officeTeamMembers = teamMemberAssignments.filter(tm => tm.teamId === officeTeam.id).length;
  const kitchenMemberships = teamMemberAssignments.filter(tm => tm.teamId !== officeTeam.id).length;

  console.log("\n🎉 Comprehensive RBAC database seeding completed successfully!");
  console.log("\n📋 RBAC Testing Summary:");
  console.log(`   👤 Total Users: ${totalUsers}`);
  console.log(`   🏢 Teams: ${1 + kitchenTeams.length} (1 office, ${kitchenTeams.length} kitchens)`);
  console.log(`   🏢 Office Team: teamCode = NULL`);
  console.log(`   🍳 Kitchen Teams: teamCode = BEP001-BEP120 (unique)`);

  console.log("\n📊 Department Breakdown:");
  for (const [dept, users] of Object.entries(departmentUsers)) {
    console.log(`   ${dept}: ${users.length} users`);
  }

  console.log("\n🤝 Team Assignments:");
  console.log(`   📝 Office Team Members: ${officeTeamMembers}`);
  console.log(`   👨‍🍳 Kitchen Memberships: ${kitchenMemberships}`);
  console.log(`   📊 Total Team Assignments: ${teamMemberAssignments.length}`);

  console.log("\n🏭 Business Data:");
  console.log(`   🏭 Suppliers: ${sampleSuppliers.length}`);
  console.log(`   📦 Products: ${sampleProducts.length}`);
  console.log(`   📊 Demand Records: ${demandData.length}`);
  console.log(`   📝 Activity Logs: ${activityData.length}`);
  console.log(`   📅 Period Formats: ${periods.join(', ')}`);

  console.log("\n🔐 Login Credentials:");
  console.log("   Email: admin@quotemaster.local");
  console.log("   Password: admin123!");
  console.log("   Permissions: ADMIN_SUPER_ADMIN role in Office Team");

  console.log("\n🔗 RBAC Testing Features:");
  console.log("   ✅ Multi-department users with varied roles");
  console.log("   ✅ Users with no team assignments (GENERAL department)");
  console.log("   ✅ Mixed active/inactive users for status filtering");
  console.log("   ✅ Kitchen managers assigned to specific kitchens");
  console.log("   ✅ Office team with diverse role hierarchy");
  console.log("   ✅ Production-ready data relationships");
  console.log("   ✅ FIXED: All users have proper departments (no NULL)");
  console.log("   ✅ ENHANCED: All optional fields populated with realistic data");
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