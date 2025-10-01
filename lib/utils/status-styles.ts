/**
 * Centralized status styling utility for consistent Badge variants across the application.
 *
 * This utility provides a single source of truth for status-to-variant mappings,
 * ensuring visual consistency across all data tables and UI components.
 */

/**
 * Maps a status string to the corresponding Badge variant.
 *
 * @param status - The status value (case-insensitive)
 * @returns The Badge variant name
 */
export const getStatusVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  if (!status) return "outline";

  switch (status.toLowerCase()) {
    // Active/Approved states -> Green (default variant)
    case "active":
    case "approved":
      return "default";

    // Pending/Inactive states -> Gray (outline variant)
    case "inactive":
    case "pending":
      return "outline";

    // In-progress/Negotiation states -> Orange (secondary variant)
    case "negotiation":
      return "secondary";

    // Cancelled/Terminated/Rejected states -> Red (destructive variant)
    case "cancelled":
    case "terminated":
    case "rejected":
      return "destructive";

    default:
      return "outline";
  }
};

/**
 * Maps a status string to the corresponding Vietnamese label.
 *
 * @param status - The status value (case-insensitive)
 * @returns The Vietnamese label for the status
 */
export const getStatusLabel = (status: string | null | undefined): string => {
  if (!status) return "Không xác định";

  switch (status.toLowerCase()) {
    case "active":
      return "Hoạt động";
    case "inactive":
      return "Ngừng hoạt động";
    case "pending":
      return "Chờ duyệt";
    case "approved":
      return "Đã duyệt";
    case "negotiation":
      return "Đang đàm phán";
    case "cancelled":
      return "Đã hủy";
    case "terminated":
      return "Đã chấm dứt";
    case "rejected":
      return "Đã từ chối";
    default:
      return status;
  }
};
