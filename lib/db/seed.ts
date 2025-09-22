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

const managerRoles = [
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

function generateKitchenCode(index: number): string {
  return `BEP${String(index).padStart(3, '0')}`;
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

async function cleanupExistingData() {
  console.log("🧹 Cleaning up existing data...");

  try {
    // Delete in order of dependencies (child tables first)
    await db.delete(kitchenPeriodDemands);
    await db.delete(activityLogs);
    await db.delete(teamMembers);
    await db.delete(teams);
    await db.delete(users);
    await db.delete(products);
    await db.delete(suppliers);

    console.log("✅ Cleanup completed successfully");
  } catch (error) {
    console.log("⚠️ Cleanup encountered errors (likely empty tables):", error);
  }
}

async function seedLargeQuoteMasterDataset() {
  console.log("🌱 Seeding Large QuoteMaster Dataset...");

  // 1. Clean up existing data first
  await cleanupExistingData();

  // 2. Create Super Admin User
  const [superAdmin] = await db.insert(users).values({
    name: "QuoteMaster Admin",
    email: "admin@quotemaster.local",
    passwordHash: await hashPassword("admin123!"),
    employeeCode: "ADMIN001",
    phone: "0901234567",
    role: "owner"
  }).returning();

  console.log("✅ Created super admin user");

  // 3. Generate 15 Manager Users with diverse roles
  const managerUsers = [];
  for (let i = 1; i <= 15; i++) {
    const name = generateRandomName();
    const role = managerRoles[Math.floor(Math.random() * managerRoles.length)];
    const manager = await db.insert(users).values({
      name: name,
      email: generateEmail(name, i),
      passwordHash: await hashPassword("manager123!"),
      employeeCode: generateEmployeeCode("MG", i),
      phone: generatePhone(),
      role: role
    }).returning();

    managerUsers.push(manager[0]);
  }

  console.log(`✅ Created ${managerUsers.length} manager users`);

  // 4. Create Office Team
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
  const kitchenData = [];

  for (let i = 1; i <= 120; i++) {
    // Random assignments
    const randomManager = managerUsers[Math.floor(Math.random() * managerUsers.length)];
    const randomRegion = regions[Math.floor(Math.random() * regions.length)];
    const isActive = Math.random() > 0.15; // 85% active, 15% inactive

    const kitchenRecord = {
      name: `Bếp ${randomRegion} ${i}`,
      teamType: "KITCHEN" as const,
      kitchenCode: generateKitchenCode(i),
      region: randomRegion,
      address: generateAddress(randomRegion),
      managerId: randomManager.id,
      status: isActive ? "active" as const : "inactive" as const,
      ...(isActive ? {} : { deletedAt: getRandomPastDate() })
    };

    kitchenData.push(kitchenRecord);
  }

  // Batch insert kitchens for better performance
  const batchSize = 20;
  for (let i = 0; i < kitchenData.length; i += batchSize) {
    const batch = kitchenData.slice(i, i + batchSize);
    const insertedBatch = await db.insert(teams).values(batch).returning();
    kitchenTeams.push(...insertedBatch);
  }

  console.log(`✅ Created ${kitchenTeams.length} diverse kitchen teams`);

  // 6. Assign All Manager Users to Office Team
  const teamMemberData = [
    {
      userId: superAdmin.id,
      teamId: officeTeam.id,
      role: "ADMIN_SUPER_ADMIN"
    },
    ...managerUsers.map(manager => ({
      userId: manager.id,
      teamId: officeTeam.id,
      role: manager.role.toUpperCase().replace('_', '_') as string
    }))
  ];

  await db.insert(teamMembers).values(teamMemberData);

  console.log("✅ Assigned all users to office team");

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
      email: "coop@organic.vn"
    },
    {
      supplierCode: "NCC005",
      name: "Công ty Thực Phẩm Sài Gòn",
      taxId: "5432167890",
      address: "555 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM",
      contactPerson: "Đặng Văn I",
      phone: "0283456789",
      email: "saigonfood@supplier.vn"
    },
    {
      supplierCode: "NCC006",
      name: "Nhà Phân Phối Thực Phẩm Miền Bắc",
      taxId: "6789012345",
      address: "888 Đường Giải Phóng, Hà Nội",
      contactPerson: "Bùi Thị K",
      phone: "0244567890",
      email: "northfood@supplier.vn"
    }
  ]).returning();

  console.log("✅ Created enhanced supplier catalog");

  // 8. Create Comprehensive Product Catalog
  const sampleProducts = await db.insert(products).values([
    // Thịt category (8 products)
    {
      productCode: "SP001", name: "Thịt heo ba chỉ", specification: "Thịt heo ba chỉ tươi, không hóa chất",
      unit: "kg", category: "Thịt", basePrice: "120000", baseQuantity: "100"
    },
    {
      productCode: "SP002", name: "Thịt bò thăn", specification: "Thịt bò thăn tươi, cao cấp",
      unit: "kg", category: "Thịt", basePrice: "280000", baseQuantity: "50"
    },
    {
      productCode: "SP003", name: "Thịt gà ta", specification: "Thịt gà ta tươi, nuôi tự nhiên",
      unit: "kg", category: "Thịt", basePrice: "85000", baseQuantity: "80"
    },
    {
      productCode: "SP004", name: "Thịt vịt", specification: "Thịt vịt tươi, loại 1",
      unit: "kg", category: "Thịt", basePrice: "95000", baseQuantity: "60"
    },
    {
      productCode: "SP005", name: "Thịt nạc vai heo", specification: "Thịt nạc vai heo tươi",
      unit: "kg", category: "Thịt", basePrice: "140000", baseQuantity: "70"
    },
    {
      productCode: "SP006", name: "Thịt bò xay", specification: "Thịt bò xay tươi, không chất bảo quản",
      unit: "kg", category: "Thịt", basePrice: "200000", baseQuantity: "40"
    },
    {
      productCode: "SP007", name: "Sườn heo", specification: "Sườn heo tươi, có xương",
      unit: "kg", category: "Thịt", basePrice: "110000", baseQuantity: "60"
    },
    {
      productCode: "SP008", name: "Thịt gà công nghiệp", specification: "Thịt gà công nghiệp, đông lạnh",
      unit: "kg", category: "Thịt", basePrice: "65000", baseQuantity: "100"
    },

    // Rau củ category (10 products)
    {
      productCode: "SP009", name: "Cà chua", specification: "Cà chua tươi, loại 1",
      unit: "kg", category: "Rau củ", basePrice: "15000", baseQuantity: "200"
    },
    {
      productCode: "SP010", name: "Hành tây", specification: "Hành tây tươi, size vừa",
      unit: "kg", category: "Rau củ", basePrice: "12000", baseQuantity: "150"
    },
    {
      productCode: "SP011", name: "Rau cải ngọt", specification: "Rau cải ngọt tươi, hữu cơ",
      unit: "kg", category: "Rau củ", basePrice: "8000", baseQuantity: "120"
    },
    {
      productCode: "SP012", name: "Cà rót", specification: "Cà rót tươi, hữu cơ",
      unit: "kg", category: "Rau củ", basePrice: "18000", baseQuantity: "100"
    },
    {
      productCode: "SP013", name: "Khoai tây", specification: "Khoai tây Đà Lạt, loại 1",
      unit: "kg", category: "Rau củ", basePrice: "20000", baseQuantity: "180"
    },
    {
      productCode: "SP014", name: "Cà rốt", specification: "Cà rốt Đà Lạt, tươi",
      unit: "kg", category: "Rau củ", basePrice: "25000", baseQuantity: "160"
    },
    {
      productCode: "SP015", name: "Bắp cải", specification: "Bắp cải tươi, không thuốc trừ sâu",
      unit: "kg", category: "Rau củ", basePrice: "10000", baseQuantity: "140"
    },
    {
      productCode: "SP016", name: "Rau muống", specification: "Rau muống tươi, hữu cơ",
      unit: "kg", category: "Rau củ", basePrice: "6000", baseQuantity: "100"
    },
    {
      productCode: "SP017", name: "Dưa chuột", specification: "Dưa chuột tươi, loại 1",
      unit: "kg", category: "Rau củ", basePrice: "12000", baseQuantity: "130"
    },
    {
      productCode: "SP018", name: "Ớt xanh", specification: "Ớt xanh tươi, cay vừa",
      unit: "kg", category: "Rau củ", basePrice: "30000", baseQuantity: "50"
    },

    // Gia vị category (6 products)
    {
      productCode: "SP019", name: "Muối biển", specification: "Muối biển tinh khiết, bao 1kg",
      unit: "bao", category: "Gia vị", basePrice: "8000", baseQuantity: "100"
    },
    {
      productCode: "SP020", name: "Nước mắm", specification: "Nước mắm truyền thống, chai 500ml",
      unit: "chai", category: "Gia vị", basePrice: "25000", baseQuantity: "60"
    },
    {
      productCode: "SP021", name: "Dầu ăn", specification: "Dầu ăn cao cấp, chai 1L",
      unit: "chai", category: "Gia vị", basePrice: "45000", baseQuantity: "80"
    },
    {
      productCode: "SP022", name: "Tương ớt", specification: "Tương ớt Việt Nam, chai 250ml",
      unit: "chai", category: "Gia vị", basePrice: "18000", baseQuantity: "70"
    },
    {
      productCode: "SP023", name: "Bột ngọt", specification: "Bột ngọt MSG, gói 500g",
      unit: "gói", category: "Gia vị", basePrice: "12000", baseQuantity: "90"
    },
    {
      productCode: "SP024", name: "Tiêu đen", specification: "Tiêu đen xay, hộp 100g",
      unit: "hộp", category: "Gia vị", basePrice: "35000", baseQuantity: "40"
    },

    // Hải sản category (6 products)
    {
      productCode: "SP025", name: "Cá thu", specification: "Cá thu tươi, size 1-2kg/con",
      unit: "kg", category: "Hải sản", basePrice: "95000", baseQuantity: "40"
    },
    {
      productCode: "SP026", name: "Tôm sú", specification: "Tôm sú tươi, size 20-30 con/kg",
      unit: "kg", category: "Hải sản", basePrice: "180000", baseQuantity: "30"
    },
    {
      productCode: "SP027", name: "Cá basa", specification: "Cá basa phi lê, đông lạnh",
      unit: "kg", category: "Hải sản", basePrice: "65000", baseQuantity: "70"
    },
    {
      productCode: "SP028", name: "Mực ống", specification: "Mực ống tươi, loại 1",
      unit: "kg", category: "Hải sản", basePrice: "120000", baseQuantity: "35"
    },
    {
      productCode: "SP029", name: "Cá hồi", specification: "Cá hồi phi lê, nhập khẩu",
      unit: "kg", category: "Hải sản", basePrice: "320000", baseQuantity: "20"
    },
    {
      productCode: "SP030", name: "Tôm thẻ", specification: "Tôm thẻ tươi, size nhỏ",
      unit: "kg", category: "Hải sản", basePrice: "140000", baseQuantity: "40"
    },

    // Ngũ cốc category (5 products)
    {
      productCode: "SP031", name: "Gạo tám xoan", specification: "Gạo tám xoan An Giang, bao 25kg",
      unit: "bao", category: "Ngũ cốc", basePrice: "850000", baseQuantity: "20"
    },
    {
      productCode: "SP032", name: "Mì sợi", specification: "Mì sợi tươi, gói 500g",
      unit: "gói", category: "Ngũ cốc", basePrice: "8000", baseQuantity: "200"
    },
    {
      productCode: "SP033", name: "Bún tươi", specification: "Bún tươi, gói 500g",
      unit: "gói", category: "Ngũ cốc", basePrice: "7000", baseQuantity: "180"
    },
    {
      productCode: "SP034", name: "Bánh phở", specification: "Bánh phở tươi, gói 1kg",
      unit: "gói", category: "Ngũ cốc", basePrice: "15000", baseQuantity: "100"
    },
    {
      productCode: "SP035", name: "Gạo nếp", specification: "Gạo nếp thơm, bao 10kg",
      unit: "bao", category: "Ngũ cốc", basePrice: "400000", baseQuantity: "15"
    }
  ]).returning();

  console.log("✅ Created comprehensive product catalog (35 products)");

  // 9. Create Sample Kitchen Demands (only for active kitchens)
  const currentPeriod = new Date().toISOString().slice(0, 7) + "-01";
  const activeKitchens = kitchenTeams.filter(k => k.status === 'active');

  console.log(`🔄 Creating demands for ${activeKitchens.length} active kitchens...`);

  const demands = [];
  let demandCounter = 0;

  // Create demands in smaller batches to avoid memory issues
  for (const kitchen of activeKitchens) {
    for (const product of sampleProducts) {
      // Create realistic demand quantities
      let baseQuantity = parseFloat(product.baseQuantity || "50");

      // Adjust by category
      if (product.category === "Thịt") baseQuantity = baseQuantity * 0.6;
      if (product.category === "Rau củ") baseQuantity = baseQuantity * 1.2;
      if (product.category === "Gia vị") baseQuantity = baseQuantity * 0.3;
      if (product.category === "Hải sản") baseQuantity = baseQuantity * 0.4;
      if (product.category === "Ngũ cốc") baseQuantity = baseQuantity * 0.7;

      // Add randomness
      const randomFactor = 0.5 + (Math.random() * 1.0); // 0.5 to 1.5
      const finalQuantity = (baseQuantity * randomFactor).toFixed(2);

      demands.push({
        teamId: kitchen.id,
        productId: product.id,
        period: currentPeriod,
        quantity: finalQuantity,
        unit: product.unit,
        notes: `Nhu cầu ${currentPeriod} cho ${kitchen.name}`,
        createdBy: kitchen.managerId || superAdmin.id
      });

      demandCounter++;
    }
  }

  // Insert demands in batches
  const demandBatchSize = 100;
  for (let i = 0; i < demands.length; i += demandBatchSize) {
    const batch = demands.slice(i, i + demandBatchSize);
    await db.insert(kitchenPeriodDemands).values(batch);
  }

  console.log(`✅ Created ${demands.length} kitchen demands`);

  // 10. Create Activity Logs
  await db.insert(activityLogs).values([
    {
      teamId: officeTeam.id,
      userId: superAdmin.id,
      action: "SEED_DATABASE",
      ipAddress: "127.0.0.1"
    },
    {
      teamId: kitchenTeams[0]?.id || officeTeam.id,
      userId: managerUsers[0]?.id || superAdmin.id,
      action: "ASSIGN_MANAGER",
      ipAddress: "127.0.0.1"
    }
  ]);

  console.log("✅ Created activity logs");

  // 11. Summary Statistics
  const activeKitchenCount = kitchenTeams.filter(k => k.status === 'active').length;
  const inactiveKitchenCount = kitchenTeams.filter(k => k.status === 'inactive').length;
  const regionStats = regions.map(region => ({
    region,
    count: kitchenTeams.filter(k => k.region === region).length
  }));

  console.log("\n📊 LARGE DATASET SEEDING SUMMARY:");
  console.log(`   👥 Users: ${managerUsers.length + 1} total`);
  console.log(`      - 1 Super Admin (owner)`);
  console.log(`      - ${managerUsers.length} Manager Users (diverse roles)`);
  console.log(`   🏢 Teams: ${kitchenTeams.length + 1} total`);
  console.log(`      - 1 Office team`);
  console.log(`      - ${kitchenTeams.length} Kitchen teams (${activeKitchenCount} active, ${inactiveKitchenCount} inactive)`);
  console.log(`   🌍 Region Distribution:`);
  regionStats.forEach(stat => {
    if (stat.count > 0) {
      console.log(`      - ${stat.region}: ${stat.count} kitchens`);
    }
  });
  console.log(`   🏪 Suppliers: ${sampleSuppliers.length} total`);
  console.log(`   📦 Products: ${sampleProducts.length} total (5 categories)`);
  console.log(`   📋 Demands: ${demands.length} total (${activeKitchenCount} active kitchens × ${sampleProducts.length} products)`);

  console.log("\n✅ Large QuoteMaster Dataset seeding completed!");
}

async function seed() {
  await seedLargeQuoteMasterDataset();
  console.log("🎉 Large-scale QuoteMaster seeding completed successfully!");
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