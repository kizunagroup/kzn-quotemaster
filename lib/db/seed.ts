import { stripe } from '../payments/stripe';
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

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

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

  // 2. Create Office Team (for departments)
  const [officeTeam] = await db.insert(teams).values({
    name: "Văn Phòng Trung Tâm",
    teamType: "OFFICE",
    region: "Trung Tâm",
    address: "123 Đường ABC, Quận 1, TP.HCM",
    managerName: "Nguyễn Văn A",
    phone: "0287654321",
    email: "office@quotemaster.local"
  }).returning();

  // 3. Create Sample Kitchen Teams
  const kitchenTeams = await db.insert(teams).values([
    {
      name: "Bếp Trung Tâm",
      teamType: "KITCHEN",
      kitchenCode: "BEP001",
      region: "Trung Tâm",
      address: "456 Đường DEF, Quận 3, TP.HCM",
      managerName: "Trần Thị B",
      phone: "0909876543",
      email: "bep001@quotemaster.local"
    },
    {
      name: "Bếp Thủ Đức",
      teamType: "KITCHEN",
      kitchenCode: "BEP002",
      region: "Thủ Đức",
      address: "789 Đường GHI, Thủ Đức, TP.HCM",
      managerName: "Lê Văn C",
      phone: "0912345678",
      email: "bep002@quotemaster.local"
    },
    {
      name: "Bếp Tân Bình",
      teamType: "KITCHEN",
      kitchenCode: "BEP003",
      region: "Tân Bình",
      address: "321 Đường JKL, Tân Bình, TP.HCM",
      managerName: "Phạm Thị D",
      phone: "0934567890",
      email: "bep003@quotemaster.local"
    }
  ]).returning();

  console.log("✅ Created office and kitchen teams");

  // 4. Assign Super Admin to Office Team
  await db.insert(teamMembers).values({
    userId: superAdmin.id,
    teamId: officeTeam.id,
    role: "ADMIN_SUPER_ADMIN"
  });

  console.log("✅ Assigned super admin to office team");

  // 5. Create Sample Suppliers
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
    }
  ]).returning();

  console.log("✅ Created sample suppliers");

  // 6. Create Sample Product Categories and Products
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
    // Rau củ category
    {
      productCode: "SP004",
      name: "Cà chua",
      specification: "Cà chua tươi, loại 1",
      unit: "kg",
      category: "Rau củ",
      basePrice: "15000",
      baseQuantity: "200"
    },
    {
      productCode: "SP005",
      name: "Hành tây",
      specification: "Hành tây tươi, size vừa",
      unit: "kg",
      category: "Rau củ",
      basePrice: "12000",
      baseQuantity: "150"
    },
    {
      productCode: "SP006",
      name: "Rau cải ngọt",
      specification: "Rau cải ngọt tươi, hữu cơ",
      unit: "kg",
      category: "Rau củ",
      basePrice: "8000",
      baseQuantity: "120"
    },
    // Gia vị category
    {
      productCode: "SP007",
      name: "Muối biển",
      specification: "Muối biển tinh khiết, bao 1kg",
      unit: "bao",
      category: "Gia vị",
      basePrice: "8000",
      baseQuantity: "100"
    },
    {
      productCode: "SP008",
      name: "Nước mắm",
      specification: "Nước mắm truyền thống, chai 500ml",
      unit: "chai",
      category: "Gia vị",
      basePrice: "25000",
      baseQuantity: "60"
    },
    // Hải sản category
    {
      productCode: "SP009",
      name: "Cá thu",
      specification: "Cá thu tươi, size 1-2kg/con",
      unit: "kg",
      category: "Hải sản",
      basePrice: "95000",
      baseQuantity: "40"
    },
    {
      productCode: "SP010",
      name: "Tôm sú",
      specification: "Tôm sú tươi, size 20-30 con/kg",
      unit: "kg",
      category: "Hải sản",
      basePrice: "180000",
      baseQuantity: "30"
    }
  ]).returning();

  console.log("✅ Created sample products");

  // 7. Create Sample Kitchen Demands for current period
  const currentPeriod = new Date().toISOString().slice(0, 7) + "-01"; // YYYY-MM-01 format

  const demands = [];
  for (const kitchen of kitchenTeams) {
    for (const product of sampleProducts) {
      // Create realistic demand quantities based on product type and kitchen
      let demandMultiplier = 1;
      if (kitchen.kitchenCode === "BEP001") demandMultiplier = 1.2; // Central kitchen needs more
      if (kitchen.kitchenCode === "BEP002") demandMultiplier = 0.8; // Thu Duc smaller
      if (kitchen.kitchenCode === "BEP003") demandMultiplier = 0.9; // Tan Binh medium

      // Vary quantities by category
      let baseQuantity = parseFloat(product.baseQuantity || "50");
      if (product.category === "Thịt") baseQuantity = baseQuantity * 0.6; // Less meat needed
      if (product.category === "Rau củ") baseQuantity = baseQuantity * 1.2; // More vegetables
      if (product.category === "Gia vị") baseQuantity = baseQuantity * 0.3; // Less spices
      if (product.category === "Hải sản") baseQuantity = baseQuantity * 0.4; // Less seafood

      const finalQuantity = (baseQuantity * demandMultiplier).toFixed(2);

      demands.push({
        teamId: kitchen.id,
        productId: product.id,
        period: currentPeriod,
        quantity: finalQuantity,
        unit: product.unit,
        notes: `Nhu cầu ${currentPeriod} cho ${kitchen.name}`,
        createdBy: superAdmin.id
      });
    }
  }

  await db.insert(kitchenPeriodDemands).values(demands);
  console.log("✅ Created sample kitchen demands");

  // 8. Log initial activity
  await db.insert(activityLogs).values({
    teamId: officeTeam.id,
    userId: superAdmin.id,
    action: "SEED_DATABASE",
    ipAddress: "127.0.0.1"
  });

  console.log("✅ QuoteMaster Foundation seeding completed!");
}

async function seed() {
  // Execute existing template seed first ✅
  const email = 'test@test.com';
  const password = 'admin123';
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values([
      {
        email: email,
        passwordHash: passwordHash,
        role: "owner",
      },
    ])
    .returning();

  console.log('Initial template user created.');

  const [team] = await db
    .insert(teams)
    .values({
      name: 'Test Team',
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: 'owner',
  });

  await createStripeProducts();

  // Execute QuoteMaster foundation seed
  await seedQuoteMasterFoundation();

  console.log("🎉 All seeding completed successfully!");
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
