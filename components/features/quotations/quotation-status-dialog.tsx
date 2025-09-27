"use client";

import type { Quotation } from "@/lib/hooks/use-quotations";

// Placeholder component interface for TypeScript compliance
interface QuotationStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  quotation: Quotation | null;
}

// Placeholder component for QuotationStatusDialog
// This component will be fully implemented in Phase 2
export function QuotationStatusDialog({
  isOpen,
  onClose,
  onSuccess,
  quotation,
}: QuotationStatusDialogProps) {
  // Return null to render nothing while maintaining component interface
  // This prevents build errors while keeping the import structure intact
  return null;
}