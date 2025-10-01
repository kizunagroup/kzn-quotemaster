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
      return "Tạm dừng";
    case "pending":
      return "Chờ duyệt";
    case "approved":
      return "Đã duyệt";
    case "negotiation":
      return "Đàm phán";
    case "cancelled":
      return "Đã hủy";
    case "terminated":
      return "Đã nghỉ";
    case "rejected":
      return "Đã từ chối";
    default:
      return status;
  }
};

/**
 * Maps a status string to enhanced colored Badge className for rich visual styling.
 * Uses a subtle, consistent color palette with font-medium weight for better readability.
 *
 * @param status - The status value (case-insensitive)
 * @returns Tailwind CSS classes for colored badge styling
 */
export const getStatusClassName = (status: string | null | undefined): string => {
  if (!status) return "bg-slate-100 text-slate-600 border-slate-200 font-medium";

  switch (status.toLowerCase()) {
    // Active/Approved states -> Light green background, dark green text
    case "active":
    case "approved":
      return "bg-green-100 text-green-800 border-green-200 font-medium";

    // Pending states -> White background with yellow text for lighter appearance
    case "pending":
      return "bg-white text-yellow-700 border-yellow-300 font-medium";

    // In-progress/Negotiation states -> Light orange background, dark orange text
    case "negotiation":
      return "bg-orange-100 text-orange-800 border-orange-200 font-medium";

    // Inactive/Terminated/Cancelled states -> Light slate background, dark slate text
    case "inactive":
    case "terminated":
    case "cancelled":
    case "rejected":
      return "bg-slate-100 text-slate-600 border-slate-200 font-medium";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200 font-medium";
  }
};
