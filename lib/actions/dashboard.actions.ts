'use server';

import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teams, products, suppliers, quotations, teamMembers } from '@/lib/db/schema';
import { eq, and, isNull, sql, count } from 'drizzle-orm';

/**
 * Dashboard Statistics Data
 *
 * Centralized business logic for fetching dashboard KPI metrics.
 * This function is used by both the API route and Server Components.
 */

export interface DashboardStats {
  totalKitchens: number;
  totalProducts: number;
  totalSuppliers: number;
  totalQuotations: number;
}

export async function getDashboardStatsData(): Promise<DashboardStats> {
  // 1. Authorization Check - CRITICAL FIRST STEP
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }

  // 2. Get user's team membership and role for data filtering
  const userTeamMemberships = await db
    .select({
      teamId: teamMembers.teamId,
      role: teamMembers.role,
      teamType: teams.teamType,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teamMembers.userId, user.id),
        isNull(teams.deletedAt)
      )
    );

  // If user has no team memberships, return empty stats
  if (userTeamMemberships.length === 0) {
    return {
      totalKitchens: 0,
      totalProducts: 0,
      totalSuppliers: 0,
      totalQuotations: 0,
    };
  }

  // Determine user's highest privilege role
  const userRole = userTeamMemberships[0].role;
  const isAdmin = userRole?.startsWith('ADMIN_');
  const isProcurement = userRole?.startsWith('PROCUREMENT_');
  const isKitchenManager = userRole === 'KITCHEN_MANAGER';

  // 3. Query Database for KPI Counts

  // Total Kitchens - count teams where team_type = 'KITCHEN'
  const kitchenCountResult = await db
    .select({ count: count() })
    .from(teams)
    .where(
      and(
        eq(teams.teamType, 'KITCHEN'),
        isNull(teams.deletedAt)
      )
    );
  const totalKitchens = kitchenCountResult[0]?.count || 0;

  // Total Products - count active products
  const productCountResult = await db
    .select({ count: count() })
    .from(products)
    .where(
      and(
        eq(products.status, 'active'),
        isNull(products.deletedAt)
      )
    );
  const totalProducts = productCountResult[0]?.count || 0;

  // Total Suppliers - count active suppliers
  const supplierCountResult = await db
    .select({ count: count() })
    .from(suppliers)
    .where(
      and(
        eq(suppliers.status, 'active'),
        isNull(suppliers.deletedAt)
      )
    );
  const totalSuppliers = supplierCountResult[0]?.count || 0;

  // Total Quotations - filtered by user role
  let quotationCountResult;

  if (isAdmin || isProcurement) {
    // Admin and Procurement can see all quotations
    quotationCountResult = await db
      .select({ count: count() })
      .from(quotations);
  } else if (isKitchenManager) {
    // Kitchen Manager can only see quotations for their kitchen teams
    const userTeamIds = userTeamMemberships
      .filter(tm => tm.teamType === 'KITCHEN')
      .map(tm => tm.teamId);

    if (userTeamIds.length > 0) {
      quotationCountResult = await db
        .select({ count: count() })
        .from(quotations)
        .where(
          sql`${quotations.teamId} IN ${userTeamIds}`
        );
    } else {
      quotationCountResult = [{ count: 0 }];
    }
  } else {
    // Other roles: limited or no access to quotation counts
    quotationCountResult = [{ count: 0 }];
  }

  const totalQuotations = quotationCountResult[0]?.count || 0;

  // 4. Return KPI Data
  return {
    totalKitchens: Number(totalKitchens),
    totalProducts: Number(totalProducts),
    totalSuppliers: Number(totalSuppliers),
    totalQuotations: Number(totalQuotations),
  };
}
