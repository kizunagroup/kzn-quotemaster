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

async function seedQuoteMasterFoundation() {
  console.log("🌱 Seeding QuoteMaster Foundation...");

  // 1. Create Super Admin User
  const [superAdmin] = await db.insert(users).values({
    name: "QuoteMaster Admin",
    email: "admin@quotemaster.local",
    passwordHash: await hashPassword("admin123!"),
    employeeCode: "QM001",
    phone: "0901234567",
    role: "owner"
  }).returning();

  console.log("✅ Created super admin user");

  // 2. Create Additional Manager Users
  const [procurementManager] = await db.insert(users).values({
    name: "Nguyễn Văn Hùng",
    email: "hung.procurement@quotemaster.local",
    passwordHash: await hashPassword("manager123!"),
    employeeCode: "PM001",
    phone: "0912345001",
    role: "procurement_manager"
  }).returning();

  const [kitchenManager1] = await db.insert(users).values({
    name: "Trần Thị Bích",
    email: "bich.kitchen@quotemaster.local",
    passwordHash: await hashPassword("manager123!"),
    employeeCode: "KM001",
    phone: "0912345002",
    role: "kitchen_manager"
  }).returning();

  const [kitchenManager2] = await db.insert(users).values({
    name: "Lê Văn Cường",
    email: "cuong.kitchen@quotemaster.local",
    passwordHash: await hashPassword("manager123!"),
    employeeCode: "KM002",
    phone: "0912345003",
    role: "kitchen_manager"
  }).returning();

  // 3. Create Non-Manager User (Kitchen Staff)
  const [kitchenStaff] = await db.insert(users).values({
    name: "Phạm Thị Duyên",
    email: "duyen.staff@quotemaster.local",
    passwordHash: await hashPassword("staff123!"),
    employeeCode: "KS001",
    phone: "0912345004",
    role: "kitchen_staff"
  }).returning();

  console.log("✅ Created additional users (managers and staff)");

  // 4. Create Office Team (for departments)
  const [officeTeam] = await db.insert(teams).values({
    name: "Văn Phòng Trung Tâm",
    teamType: "OFFICE",
    region: "Trung Tâm",
    address: "123 Đường ABC, Quận 1, TP.HCM",
    managerId: superAdmin.id // Assign super admin as office manager
  }).returning();

  console.log("✅ Created office team");

  // 5. Create Enhanced Kitchen Teams with Diverse Scenarios
  const kitchenTeams = await db.insert(teams).values([
    {
      name: "Bếp Trung Tâm",
      teamType: "KITCHEN",
      kitchenCode: "BEP001",
      region: "Trung Tâm",
      address: "456 Đường DEF, Quận 3, TP.HCM",
      managerId: kitchenManager1.id, // Assigned to Trần Thị Bích
      status: "active"
    },
    {
      name: "Bếp Thủ Đức",
      teamType: "KITCHEN",
      kitchenCode: "BEP002",
      region: "Thủ Đức",
      address: "789 Đường GHI, Thủ Đức, TP.HCM",
      managerId: kitchenManager2.id, // Assigned to Lê Văn Cường
      status: "active"
    },
    {
      name: "Bếp Tân Bình",
      teamType: "KITCHEN",
      kitchenCode: "BEP003",
      region: "Tân Bình",
      address: "321 Đường JKL, Tân Bình, TP.HCM",
      managerId: procurementManager.id, // Assigned to Nguyễn Văn Hùng
      status: "active"
    },
    {
      name: "Bếp Quận 7",
      teamType: "KITCHEN",
      kitchenCode: "BEP004",
      region: "Quận 7",
      address: "654 Đường MNO, Quận 7, TP.HCM",
      managerId: null, // NO MANAGER ASSIGNED - Testing scenario
      status: "active"
    },
    {
      name: "Bếp Bình Thạnh (Tạm dừng)",
      teamType: "KITCHEN",
      kitchenCode: "BEP005",
      region: "Bình Thạnh",
      address: "987 Đường PQR, Bình Thạnh, TP.HCM",
      managerId: kitchenManager1.id, // Assigned but inactive kitchen
      status: "inactive" // INACTIVE KITCHEN - Testing scenario
    },
    {
      name: "Bếp Gò Vấp",
      teamType: "KITCHEN",
      kitchenCode: "BEP006",
      region: "Gò Vấp",
      address: "147 Đường STU, Gò Vấp, TP.HCM",
      managerId: kitchenManager2.id, // Multiple kitchens per manager
      status: "active"
    }
  ]).returning();

  console.log("✅ Created enhanced kitchen teams with diverse scenarios");

  // 6. Assign All Users to Office Team with Appropriate Roles
  await db.insert(teamMembers).values([
    {
      userId: superAdmin.id,
      teamId: officeTeam.id,
      role: "ADMIN_SUPER_ADMIN"
    },
    {
      userId: procurementManager.id,
      teamId: officeTeam.id,
      role: "PROCUREMENT_MANAGER"
    },
    {
      userId: kitchenManager1.id,
      teamId: officeTeam.id,
      role: "KITCHEN_MANAGER"
    },
    {
      userId: kitchenManager2.id,
      teamId: officeTeam.id,
      role: "KITCHEN_MANAGER"
    },
    {
      userId: kitchenStaff.id,
      teamId: officeTeam.id,
      role: "KITCHEN_STAFF"
    }
  ]);

  console.log("✅ Assigned all users to office team");

  // 7. Create Sample Suppliers
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
      email: "coop@organic.vn"
    }
  ]).returning();

  console.log("✅ Created sample suppliers");

  // 8. Create Sample Product Categories and Products
  const sampleProducts = await db.insert(products).values([
    // Thịt category
    {
      productCode: "SP001",
      name: "Thịt heo ba chỉ",
      specification: "Thịt heo ba chỉ tươi, không hóa chất",
      unit: "kg",
      category: "Thịt",
      basePrice: "120000",
      baseQuantity: "100"
    },
    {
      productCode: "SP002",
      name: "Thịt bò thăn",
      specification: "Thịt bò thăn tươi, cao cấp",
      unit: "kg",
      category: "Thịt",
      basePrice: "280000",
      baseQuantity: "50"
    },
    {
      productCode: "SP003",
      name: "Thịt gà ta",
      specification: "Thịt gà ta tươi, nuôi tự nhiên",
      unit: "kg",
      category: "Thịt",
      basePrice: "85000",
      baseQuantity: "80"
    },
    {
      productCode: "SP004",
      name: "Thịt vịt",
      specification: "Thịt vịt tươi, loại 1",
      unit: "kg",
      category: "Thịt",
      basePrice: "95000",
      baseQuantity: "60"
    },
    // Rau củ category
    {
      productCode: "SP005",
      name: "Cà chua",
      specification: "Cà chua tươi, loại 1",
      unit: "kg",
      category: "Rau củ",
      basePrice: "15000",
      baseQuantity: "200"
    },
    {
      productCode: "SP006",
      name: "Hành tây",
      specification: "Hành tây tươi, size vừa",
      unit: "kg",
      category: "Rau củ",
      basePrice: "12000",
      baseQuantity: "150"
    },
    {
      productCode: "SP007",
      name: "Rau cải ngọt",
      specification: "Rau cải ngọt tươi, hữu cơ",
      unit: "kg",
      category: "Rau củ",
      basePrice: "8000",
      baseQuantity: "120"
    },
    {
      productCode: "SP008",
      name: "Cà rót",
      specification: "Cà rót tươi, hữu cơ",
      unit: "kg",
      category: "Rau củ",
      basePrice: "18000",
      baseQuantity: "100"
    },
    {
      productCode: "SP009",
      name: "Khoai tây",
      specification: "Khoai tây Đà Lạt, loại 1",
      unit: "kg",
      category: "Rau củ",
      basePrice: "20000",
      baseQuantity: "180"
    },
    // Gia vị category
    {
      productCode: "SP010",
      name: "Muối biển",
      specification: "Muối biển tinh khiết, bao 1kg",
      unit: "bao",
      category: "Gia vị",
      basePrice: "8000",
      baseQuantity: "100"
    },
    {
      productCode: "SP011",
      name: "Nước mắm",
      specification: "Nước mắm truyền thống, chai 500ml",
      unit: "chai",
      category: "Gia vị",
      basePrice: "25000",
      baseQuantity: "60"
    },
    {
      productCode: "SP012",
      name: "Dầu ăn",
      specification: "Dầu ăn cao cấp, chai 1L",
      unit: "chai",
      category: "Gia vị",
      basePrice: "45000",
      baseQuantity: "80"
    },
    // Hải sản category
    {
      productCode: "SP013",
      name: "Cá thu",
      specification: "Cá thu tươi, size 1-2kg/con",
      unit: "kg",
      category: "Hải sản",
      basePrice: "95000",
      baseQuantity: "40"
    },
    {
      productCode: "SP014",
      name: "Tôm sú",
      specification: "Tôm sú tươi, size 20-30 con/kg",
      unit: "kg",
      category: "Hải sản",
      basePrice: "180000",
      baseQuantity: "30"
    },
    {
      productCode: "SP015",
      name: "Cá basa",
      specification: "Cá basa phi lê, đông lạnh",
      unit: "kg",
      category: "Hải sản",
      basePrice: "65000",
      baseQuantity: "70"
    },
    // Ngũ cốc category
    {
      productCode: "SP016",
      name: "Gạo tám xoan",
      specification: "Gạo tám xoan An Giang, bao 25kg",
      unit: "bao",
      category: "Ngũ cốc",
      basePrice: "850000",
      baseQuantity: "20"
    },
    {
      productCode: "SP017",
      name: "Mì sợi",
      specification: "Mì sợi tươi, gói 500g",
      unit: "gói",
      category: "Ngũ cốc",
      basePrice: "8000",
      baseQuantity: "200"
    }
  ]).returning();

  console.log("✅ Created comprehensive product catalog");

  // 9. Create Sample Kitchen Demands for Multiple Periods
  const periods = [
    new Date().toISOString().slice(0, 7) + "-01", // Current month
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7) + "-01", // Last month
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7) + "-01"  // Next month
  ];

  const demands = [];
  const activeKitchens = kitchenTeams.filter(k => k.status === 'active');

  for (const period of periods) {
    for (const kitchen of activeKitchens) {
      for (const product of sampleProducts) {
        // Create realistic demand quantities based on product type and kitchen
        let demandMultiplier = 1;

        // Kitchen size factors
        if (kitchen.kitchenCode === "BEP001") demandMultiplier = 1.5; // Central kitchen - largest
        if (kitchen.kitchenCode === "BEP002") demandMultiplier = 1.2; // Thu Duc - large
        if (kitchen.kitchenCode === "BEP003") demandMultiplier = 1.0; // Tan Binh - medium
        if (kitchen.kitchenCode === "BEP004") demandMultiplier = 0.8; // Quan 7 - smaller (no manager)
        if (kitchen.kitchenCode === "BEP006") demandMultiplier = 0.9; // Go Vap - medium-small

        // Vary quantities by category
        let baseQuantity = parseFloat(product.baseQuantity || "50");
        if (product.category === "Thịt") baseQuantity = baseQuantity * 0.6; // Less meat needed
        if (product.category === "Rau củ") baseQuantity = baseQuantity * 1.2; // More vegetables
        if (product.category === "Gia vị") baseQuantity = baseQuantity * 0.3; // Less spices
        if (product.category === "Hải sản") baseQuantity = baseQuantity * 0.4; // Less seafood
        if (product.category === "Ngũ cốc") baseQuantity = baseQuantity * 0.7; // Moderate grains

        // Add some randomness for realism
        const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
        const finalQuantity = (baseQuantity * demandMultiplier * randomFactor).toFixed(2);

        demands.push({
          teamId: kitchen.id,
          productId: product.id,
          period: period,
          quantity: finalQuantity,
          unit: product.unit,
          notes: `Nhu cầu ${period} cho ${kitchen.name}`,
          createdBy: kitchen.managerId || superAdmin.id
        });
      }
    }
  }

  await db.insert(kitchenPeriodDemands).values(demands);
  console.log("✅ Created comprehensive kitchen demands for multiple periods");

  // 10. Log initial activities for different users
  await db.insert(activityLogs).values([
    {
      teamId: officeTeam.id,
      userId: superAdmin.id,
      action: "SEED_DATABASE",
      ipAddress: "127.0.0.1"
    },
    {
      teamId: kitchenTeams[0].id,
      userId: kitchenManager1.id,
      action: "ASSIGN_MANAGER",
      ipAddress: "127.0.0.1"
    },
    {
      teamId: kitchenTeams[1].id,
      userId: kitchenManager2.id,
      action: "ASSIGN_MANAGER",
      ipAddress: "127.0.0.1"
    }
  ]);

  console.log("✅ Created activity logs");

  // 11. Summary of what was created
  console.log("\n📊 SEEDING SUMMARY:");
  console.log(`   👥 Users: 5 total`);
  console.log(`      - 1 Super Admin (owner)`);
  console.log(`      - 1 Procurement Manager`);
  console.log(`      - 2 Kitchen Managers`);
  console.log(`      - 1 Kitchen Staff`);
  console.log(`   🏢 Teams: 7 total`);
  console.log(`      - 1 Office team`);
  console.log(`      - 6 Kitchen teams (5 active, 1 inactive)`);
  console.log(`   🌍 Regions: 6 total`);
  console.log(`      - Trung Tâm, Thủ Đức, Tân Bình, Quận 7, Bình Thạnh, Gò Vấp`);
  console.log(`   👨‍💼 Manager Assignments:`);
  console.log(`      - BEP001: Trần Thị Bích (Kitchen Manager)`);
  console.log(`      - BEP002: Lê Văn Cường (Kitchen Manager)`);
  console.log(`      - BEP003: Nguyễn Văn Hùng (Procurement Manager)`);
  console.log(`      - BEP004: NO MANAGER (testing scenario)`);
  console.log(`      - BEP005: Trần Thị Bích (INACTIVE kitchen)`);
  console.log(`      - BEP006: Lê Văn Cường (multiple kitchens)`);
  console.log(`   🏪 Suppliers: 4 total`);
  console.log(`   📦 Products: 17 total (5 categories)`);
  console.log(`   📋 Demands: ${demands.length} total (3 periods x 5 active kitchens x 17 products)`);

  console.log("\n✅ QuoteMaster Foundation seeding completed!");
}

async function seed() {
  // Execute QuoteMaster foundation seed only
  await seedQuoteMasterFoundation();
  console.log("🎉 QuoteMaster seeding completed successfully!");
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });