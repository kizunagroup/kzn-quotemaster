import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  unique,
  check,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    // Existing template fields preserved ✅
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    // REMOVED: role column - now using pure team-based RBAC via team_members table
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),

    // QuoteMaster staff extensions (already defined in spec)
    employeeCode: varchar("employee_code", { length: 50 }).unique(),
    phone: varchar("phone", { length: 20 }),

    // Additional staff-specific fields
    jobTitle: varchar("job_title", { length: 100 }),
    department: varchar("department", { length: 50 }),
    hireDate: timestamp("hire_date"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
  },
  (table) => ({
    // Performance indexes
    employeeCodeIdx: index("idx_users_employee_code")
      .on(table.employeeCode)
      .where(sql`${table.employeeCode} IS NOT NULL`),
    departmentIdx: index("idx_users_department").on(table.department),
    statusIdx: index("idx_users_status").on(table.status),
    // PHASE 1 OPTIMIZATION: Comprehensive composite index for manager search performance
    managerSearchIdx: index("idx_users_manager_search")
      .on(
        table.status,
        table.name,
        table.email,
        table.employeeCode,
        table.department,
        table.jobTitle
      )
      .where(sql`${table.deletedAt} IS NULL`),

    // Data integrity constraints
    employeeCodeCheck: check(
      "employee_code_format",
      sql`${table.employeeCode} ~ '^[A-Z0-9_-]+$'`
    ),
    statusCheck: check(
      "status_values",
      sql`${table.status} IN ('active', 'inactive', 'terminated')`
    ),
  })
);

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripeProductId: text("stripe_product_id"),
    planName: varchar("plan_name", { length: 50 }),
    subscriptionStatus: varchar("subscription_status", { length: 20 }),
    // QuoteMaster extensions for team mapping (renamed from kitchenCode)
    teamCode: varchar("team_code", { length: 50 }).unique(),
    region: varchar("region", { length: 50 }),
    address: text("address"),
    // Manager relationship (NORMALIZED)
    managerId: integer("manager_id").references(() => users.id, {
      onDelete: "set null",
    }),
    teamType: varchar("team_type", { length: 20 }).default("OFFICE").notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
  },
  (table) => ({
    // Performance indexes for Team Management (renamed from Kitchen Management)
    teamCodeIdx: index("idx_teams_team_code")
      .on(table.teamCode)
      .where(sql`${table.teamCode} IS NOT NULL`),
    teamTypeIdx: index("idx_teams_team_type").on(table.teamType),
    regionStatusIdx: index("idx_teams_region_status").on(
      table.region,
      table.deletedAt
    ),
    nameSearchIdx: index("idx_teams_name_search")
      .on(table.name)
      .where(sql`${table.teamType} = 'KITCHEN'`),
    managerIdx: index("idx_teams_manager_id")
      .on(table.managerId)
      .where(sql`${table.managerId} IS NOT NULL`),
    compositeIdx: index("idx_teams_kitchen_composite").on(
      table.teamType,
      table.region,
      table.deletedAt,
      table.name
    ),

    // Business rule constraint - KITCHEN teams require team_code, OFFICE teams have null team_code
    teamCodeBusinessRule: check(
      "team_code_business_rule",
      sql`(${table.teamType} = 'KITCHEN' AND ${table.teamCode} IS NOT NULL) OR (${table.teamType} = 'OFFICE')`
    ),
  })
);

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onUpdate: "cascade", onDelete: "cascade" }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onUpdate: "cascade", onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onUpdate: "cascade", onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, {
    onUpdate: "cascade",
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onUpdate: "cascade", onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  invitedBy: integer("invited_by")
    .notNull()
    .references(() => users.id, { onUpdate: "cascade", onDelete: "set null" }),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});

// QuoteMaster-specific tables
export const suppliers = pgTable(
  "suppliers",
  {
    id: serial("id").primaryKey(),
    supplierCode: varchar("supplier_code", { length: 20 }).unique(),
    name: varchar("name", { length: 255 }).notNull(),
    taxId: varchar("tax_id", { length: 50 }),
    address: text("address"),
    contactPerson: varchar("contact_person", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    supplierCodeIdx: index("idx_suppliers_supplier_code").on(
      table.supplierCode
    ),
    nameIdx: index("idx_suppliers_name").on(table.name),
    statusIdx: index("idx_suppliers_status").on(table.status),
    deletedAtIdx: index("idx_suppliers_deleted_at").on(table.deletedAt),
  })
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    productCode: varchar("product_code", { length: 50 }).unique().notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    specification: text("specification"), // Quy cách
    unit: varchar("unit", { length: 50 }).notNull(), // Đvt (Đơn vị tính)
    category: varchar("category", { length: 100 }).notNull(), // Nhóm hàng
    basePrice: decimal("base_price", { precision: 12, scale: 2 }), // Giá cơ sở - Reference base price
    baseQuantity: decimal("base_quantity", { precision: 10, scale: 2 }), // Fallback quantity for price calculations
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    productCodeIdx: index("idx_products_product_code").on(table.productCode),
    nameIdx: index("idx_products_name").on(table.name),
    categoryIdx: index("idx_products_category").on(table.category),
    statusIdx: index("idx_products_status").on(table.status),
    categoryStatusIdx: index("idx_products_category_status").on(
      table.category,
      table.status
    ),
    deletedAtIdx: index("idx_products_deleted_at").on(table.deletedAt),
  })
);

export const quotations = pgTable(
  "quotations",
  {
    id: serial("id").primaryKey(),
    quotationId: varchar("quotation_id", { length: 100 }).notNull().unique(),
    period: varchar("period", { length: 10 }).notNull(),
    supplierId: integer("supplier_id")
      .references(() => suppliers.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      })
      .notNull(),
    region: varchar("region", { length: 50 }).notNull(),
    quoteDate: timestamp("quote_date"),
    updateDate: timestamp("update_date"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    createdBy: integer("created_by")
      .references(() => users.id, { onUpdate: "cascade", onDelete: "set null" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Performance indexes for quotations display
    periodIdx: index("idx_quotations_period").on(table.period),
    supplierRegionIdx: index("idx_quotations_supplier_region").on(
      table.supplierId,
      table.region
    ),
    statusPeriodIdx: index("idx_quotations_status_period").on(
      table.status,
      table.period
    ),
    regionStatusIdx: index("idx_quotations_region_status").on(
      table.region,
      table.status
    ),

    // V3.2 constraint: unique per supplier, period, region (centralized purchasing model)
    uniqueQuotePerSupplierPeriodRegion: unique().on(
      table.supplierId,
      table.period,
      table.region
    ),
    periodFormatCheck: check(
      "period_format",
      sql`${table.period} ~ '^\\d{4}-\\d{2}-\\d{2}$'`
    ),
    validStatus: check(
      "valid_status",
      sql`${table.status} IN ('pending', 'approved', 'cancelled', 'negotiation')`
    ),
  })
);

export const quoteItems = pgTable(
  "quote_items",
  {
    id: serial("id").primaryKey(),
    quotationId: integer("quotation_id")
      .references(() => quotations.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      })
      .notNull(),
    productId: integer("product_id")
      .references(() => products.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      })
      .notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2 }),
    initialPrice: decimal("initial_price", { precision: 12, scale: 2 }),
    negotiatedPrice: decimal("negotiated_price", { precision: 12, scale: 2 }),
    approvedPrice: decimal("approved_price", { precision: 12, scale: 2 }),
    vatPercentage: decimal("vat_percentage", {
      precision: 5,
      scale: 2,
    }).default("0"),
    currency: varchar("currency", { length: 3 }).default("VND"),
    negotiationRounds: integer("negotiation_rounds").default(0),
    lastNegotiatedAt: timestamp("last_negotiated_at"),
    approvedAt: timestamp("approved_at"),
    approvedBy: integer("approved_by").references(() => users.id, {
      onUpdate: "cascade",
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueQuoteItem: unique().on(table.quotationId, table.productId),
    positiveQuantity: check("positive_quantity", sql`${table.quantity} > 0`),
    nonNegativePrices: check(
      "non_negative_prices",
      sql`
    ${table.initialPrice} >= 0 AND
    (${table.negotiatedPrice} >= 0 OR ${table.negotiatedPrice} IS NULL) AND
    (${table.approvedPrice} >= 0 OR ${table.approvedPrice} IS NULL)
  `
    ),
    validVatPercentage: check(
      "valid_vat",
      sql`${table.vatPercentage} >= 0 AND ${table.vatPercentage} <= 100`
    ),
  })
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .references(() => products.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      })
      .notNull(),
    supplierId: integer("supplier_id")
      .references(() => suppliers.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      })
      .notNull(),
    teamId: integer("team_id").references(() => teams.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
    period: varchar("period", { length: 10 }).notNull(),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    priceType: varchar("price_type", { length: 20 }).notNull(),
    region: varchar("region", { length: 50 }),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (table) => ({
    nonNegativePrice: check("non_negative_price", sql`${table.price} >= 0`),
    periodFormatCheck: check(
      "period_format",
      sql`${table.period} ~ '^\\d{4}-\\d{2}-\\d{2}$'`
    ),
    validPriceType: check(
      "valid_price_type",
      sql`${table.priceType} IN ('initial', 'negotiated', 'approved')`
    ),
  })
);

export const supplierServiceScopes = pgTable(
  "supplier_service_scopes",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onUpdate: "cascade", onDelete: "cascade" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSupplierTeam: unique().on(table.supplierId, table.teamId),
    supplierIdx: index("idx_supplier_service_scopes_supplier").on(
      table.supplierId
    ),
    teamIdx: index("idx_supplier_service_scopes_team").on(table.teamId),
    activeIdx: index("idx_supplier_service_scopes_active").on(table.isActive),
  })
);

export const kitchenPeriodDemands = pgTable(
  "kitchen_period_demands",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .references(() => teams.id, { onUpdate: "cascade", onDelete: "cascade" })
      .notNull(),
    productId: integer("product_id")
      .references(() => products.id, {
        onUpdate: "cascade",
        onDelete: "cascade",
      })
      .notNull(),
    period: varchar("period", { length: 10 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 50 }).notNull(),
    notes: text("notes"),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    createdBy: integer("created_by").references(() => users.id, {
      onUpdate: "cascade",
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueDemand: unique().on(table.teamId, table.productId, table.period),
    positiveQuantity: check("positive_quantity", sql`${table.quantity} > 0`),
    periodFormatCheck: check(
      "period_format",
      sql`${table.period} ~ '^\\d{4}-\\d{2}-\\d{2}$'`
    ),
    validStatus: check(
      "valid_status",
      sql`${table.status} IN ('active', 'inactive')`
    ),
  })
);

// Relations
export const teamsRelations = relations(teams, ({ one, many }) => ({
  // Template relations preserved
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  // Manager relationship - normalized reference to users table
  manager: one(users, {
    fields: [teams.managerId],
    references: [users.id],
    relationName: "teamManager",
  }),
  // QuoteMaster extensions
  demands: many(kitchenPeriodDemands),
  supplierServiceScopes: many(supplierServiceScopes),
}));

export const usersRelations = relations(users, ({ many }) => ({
  // Template relations preserved
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  // Managed teams relationship (one manager can manage multiple teams)
  managedTeams: many(teams, {
    relationName: "teamManager",
  }),
  // QuoteMaster extensions
  quotations: many(quotations),
  createdDemands: many(kitchenPeriodDemands),
  approvedQuoteItems: many(quoteItems),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// QuoteMaster relations
export const suppliersRelations = relations(suppliers, ({ many }) => ({
  quotations: many(quotations),
  priceHistory: many(priceHistory),
  supplierServiceScopes: many(supplierServiceScopes),
}));

export const productsRelations = relations(products, ({ many }) => ({
  quoteItems: many(quoteItems),
  priceHistory: many(priceHistory),
  demands: many(kitchenPeriodDemands),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [quotations.supplierId],
    references: [suppliers.id],
  }),
  createdBy: one(users, {
    fields: [quotations.createdBy],
    references: [users.id],
  }),
  items: many(quoteItems),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quoteItems.quotationId],
    references: [quotations.id],
  }),
  product: one(products, {
    fields: [quoteItems.productId],
    references: [products.id],
  }),
  approvedBy: one(users, {
    fields: [quoteItems.approvedBy],
    references: [users.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(products, {
    fields: [priceHistory.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [priceHistory.supplierId],
    references: [suppliers.id],
  }),
  team: one(teams, {
    fields: [priceHistory.teamId],
    references: [teams.id],
  }),
}));

export const supplierServiceScopesRelations = relations(
  supplierServiceScopes,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [supplierServiceScopes.supplierId],
      references: [suppliers.id],
    }),
    team: one(teams, {
      fields: [supplierServiceScopes.teamId],
      references: [teams.id],
    }),
  })
);

export const kitchenPeriodDemandsRelations = relations(
  kitchenPeriodDemands,
  ({ one }) => ({
    team: one(teams, {
      fields: [kitchenPeriodDemands.teamId],
      references: [teams.id],
    }),
    product: one(products, {
      fields: [kitchenPeriodDemands.productId],
      references: [products.id],
    }),
    createdBy: one(users, {
      fields: [kitchenPeriodDemands.createdBy],
      references: [users.id],
    }),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, "id" | "name" | "email">;
  })[];
};

// Type exports (Template + QuoteMaster)
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type NewQuoteItem = typeof quoteItems.$inferInsert;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;
export type SupplierServiceScope = typeof supplierServiceScopes.$inferSelect;
export type NewSupplierServiceScope = typeof supplierServiceScopes.$inferInsert;
export type KitchenPeriodDemand = typeof kitchenPeriodDemands.$inferSelect;
export type NewKitchenPeriodDemand = typeof kitchenPeriodDemands.$inferInsert;

export enum ActivityType {
  // Template activities preserved
  SIGN_UP = "SIGN_UP",
  SIGN_IN = "SIGN_IN",
  SIGN_OUT = "SIGN_OUT",
  UPDATE_PASSWORD = "UPDATE_PASSWORD",
  DELETE_ACCOUNT = "DELETE_ACCOUNT",
  UPDATE_ACCOUNT = "UPDATE_ACCOUNT",
  CREATE_TEAM = "CREATE_TEAM",
  REMOVE_TEAM_MEMBER = "REMOVE_TEAM_MEMBER",
  INVITE_TEAM_MEMBER = "INVITE_TEAM_MEMBER",
  ACCEPT_INVITATION = "ACCEPT_INVITATION",
  // QuoteMaster extensions
  UPLOAD_QUOTE = "UPLOAD_QUOTE",
  APPROVE_QUOTE = "APPROVE_QUOTE",
  NEGOTIATE_QUOTE = "NEGOTIATE_QUOTE",
  CANCEL_QUOTE = "CANCEL_QUOTE",
  CREATE_PRODUCT = "CREATE_PRODUCT",
  UPDATE_PRODUCT = "UPDATE_PRODUCT",
  DELETE_PRODUCT = "DELETE_PRODUCT",
  CREATE_SUPPLIER = "CREATE_SUPPLIER",
  UPDATE_SUPPLIER = "UPDATE_SUPPLIER",
  DELETE_SUPPLIER = "DELETE_SUPPLIER",
  CREATE_KITCHEN = "CREATE_KITCHEN",
  UPDATE_KITCHEN = "UPDATE_KITCHEN",
  DELETE_KITCHEN = "DELETE_KITCHEN",
  SEED_DATABASE = "SEED_DATABASE",
}
