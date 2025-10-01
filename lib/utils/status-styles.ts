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

/**
 * Maps a status string to enhanced colored Badge className for rich visual styling.
 *
 * @param status - The status value (case-insensitive)
 * @returns Tailwind CSS classes for colored badge styling
 */
export const getStatusClassName = (status: string | null | undefined): string => {
  if (!status) return "bg-gray-100 text-gray-800 border-gray-200";

  switch (status.toLowerCase()) {
    // Active/Approved states -> Light green background, dark green text
    case "active":
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";

    // Pending states -> Light yellow background, dark yellow text
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";

    // Inactive states -> Light gray background, dark gray text
    case "inactive":
      return "bg-gray-100 text-gray-600 border-gray-200";

    // In-progress/Negotiation states -> Light orange background, dark orange text
    case "negotiation":
      return "bg-orange-100 text-orange-800 border-orange-200";

    // Cancelled/Terminated/Rejected states -> Light red background, dark red text
    case "cancelled":
    case "terminated":
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";

    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};
