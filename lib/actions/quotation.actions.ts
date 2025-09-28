"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/db/queries";
import { QuotationStatusUpdateInput } from "@/lib/schemas/quotation.schemas";
import { db } from "@/lib/db/drizzle";
import { quotations, suppliers, teams } from "@/lib/db/schema";
import { sql, eq, distinct, asc } from "drizzle-orm";

// Return type for server actions
type ActionResult = {
  success?: string;
  error?: string;
};

// Server Action: Update Quotation Status (Placeholder for Phase 2)
export async function updateQuotationStatus(data: QuotationStatusUpdateInput): Promise<ActionResult> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền truy cập" };
    }

    // TODO: Implement full business logic in Phase 2
    // - Validate user has permission to change quotation status
    // - Check quotation exists and user has access to it
    // - Validate status transition is allowed (business rules)
    // - Update quotation status in database
    // - Log activity for audit trail
    // - Send notifications if required

    // Placeholder successful response
    revalidatePath("/bao-gia");
    return { success: "Trạng thái báo giá sẽ được cập nhật trong Phase 2" };
  } catch (error) {
    console.error("Update quotation status error:", error);
    return { error: "Có lỗi xảy ra khi cập nhật trạng thái báo giá" };
  }
}

// Server Action: Cancel Quotation (Placeholder for Phase 2)
export async function cancelQuotation(quotationId: number, reason: string): Promise<ActionResult> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền truy cập" };
    }

    // TODO: Implement full business logic in Phase 2
    // - Validate user has permission to cancel quotations
    // - Check quotation exists and user has access to it
    // - Validate quotation can be cancelled (business rules)
    // - Update status to 'cancelled' with reason
    // - Log activity for audit trail
    // - Send notifications to relevant parties

    // Placeholder successful response
    revalidatePath("/bao-gia");
    return { success: "Báo giá sẽ được hủy trong Phase 2" };
  } catch (error) {
    console.error("Cancel quotation error:", error);
    return { error: "Có lỗi xảy ra khi hủy báo giá" };
  }
}

// Server Action: Get Quotation Periods for Dynamic Filtering
export async function getQuotationPeriods(): Promise<string[]> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return [];
    }

    // 2. Fetch distinct periods from quotations table
    const periods = await db
      .selectDistinct({
        period: quotations.period,
      })
      .from(quotations)
      .orderBy(asc(quotations.period));

    return periods.map(p => p.period);
  } catch (error) {
    console.error("Get quotation periods error:", error);
    return [];
  }
}

// Server Action: Get Quotation Suppliers for Dynamic Filtering
export async function getQuotationSuppliers(): Promise<Array<{ id: number; name: string }>> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return [];
    }

    // 2. Fetch suppliers that have quotations
    const suppliersData = await db
      .selectDistinct({
        id: suppliers.id,
        name: suppliers.name,
      })
      .from(suppliers)
      .innerJoin(quotations, eq(quotations.supplierId, suppliers.id))
      .orderBy(asc(suppliers.name));

    return suppliersData;
  } catch (error) {
    console.error("Get quotation suppliers error:", error);
    return [];
  }
}

// Server Action: Get Quotation Teams for Dynamic Filtering
export async function getQuotationTeams(): Promise<Array<{ id: number; name: string }>> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return [];
    }

    // 2. Fetch kitchen teams that have quotations
    const teamsData = await db
      .selectDistinct({
        id: teams.id,
        name: teams.name,
      })
      .from(teams)
      .innerJoin(quotations, eq(quotations.teamId, teams.id))
      .where(eq(teams.teamType, 'KITCHEN'))
      .orderBy(asc(teams.name));

    return teamsData;
  } catch (error) {
    console.error("Get quotation teams error:", error);
    return [];
  }
}