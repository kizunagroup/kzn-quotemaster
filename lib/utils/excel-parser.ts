import { z } from "zod";

// Validation schemas for Excel data structure
export const QuotationInfoSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Period must be in YYYY-MM-XX format"),
  region: z.string().min(1, "Region is required"),
  supplierCode: z.string().min(1, "Supplier code is required"),
  supplierName: z.string().min(1, "Supplier name is required"),
  quoteDate: z.string().optional(),
});

export const QuotationItemSchema = z.object({
  productCode: z.string().min(1, "Product code is required"),
  productName: z.string().optional(),
  unit: z.string().optional(),
  quantity: z
    .number()
    .positive("Quantity must be positive")
    .optional()
    .default(1),
  initialPrice: z.number().nonnegative("Price must be non-negative"),
  vatRate: z.number().min(0).max(100, "VAT rate must be between 0 and 100"),
  specification: z.string().optional(),
  notes: z.string().optional(),
});

export const ParsedQuotationSchema = z.object({
  info: QuotationInfoSchema,
  items: z.array(QuotationItemSchema),
});

export type QuotationInfo = z.infer<typeof QuotationInfoSchema>;
export type QuotationItem = z.infer<typeof QuotationItemSchema>;
export type ParsedQuotation = z.infer<typeof ParsedQuotationSchema>;

export interface ValidationError {
  type: "error";
  message: string;
  field?: string;
  row?: number;
}

export interface ValidationWarning {
  type: "warning";
  message: string;
  field?: string;
  row?: number;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedQuotation;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Process an Excel file and extract quotation data
 * Expected Excel structure:
 * - Sheet 1: "Thông tin báo giá" - Contains quotation metadata
 * - Sheet 2: "Danh sách sản phẩm" - Contains product pricing data
 */
export async function processExcelFile(
  file: File,
  region: string,
  period: string
): Promise<ParseResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Use exceljs for Excel file processing
    const ExcelJS = await import("exceljs");

    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Validate required sheets exist
    const requiredSheets = ["Thông tin báo giá", "Danh sách sản phẩm"];
    const worksheetNames = workbook.worksheets.map((ws) => ws.name);
    const missingSheets = requiredSheets.filter(
      (sheet) => !worksheetNames.includes(sheet)
    );

    if (missingSheets.length > 0) {
      errors.push({
        type: "error",
        message: `Thiếu sheet bắt buộc: ${missingSheets.join(", ")}`,
      });
      return { success: false, errors, warnings };
    }

    // Parse quotation info sheet
    const infoSheet = workbook.getWorksheet("Thông tin báo giá");
    const infoResult = parseQuotationInfo(infoSheet, region, period);

    if (!infoResult.success) {
      errors.push(...infoResult.errors);
      return { success: false, errors, warnings };
    }

    // Parse product items sheet
    const itemsSheet = workbook.getWorksheet("Danh sách sản phẩm");
    const itemsResult = parseQuotationItems(itemsSheet);

    if (!itemsResult.success) {
      errors.push(...itemsResult.errors);
      warnings.push(...itemsResult.warnings);
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    // Validate the complete parsed data
    const parsedData: ParsedQuotation = {
      info: infoResult.data!,
      items: itemsResult.data!,
    };

    const validationResult = ParsedQuotationSchema.safeParse(parsedData);
    if (!validationResult.success) {
      errors.push({
        type: "error",
        message: "Dữ liệu không hợp lệ: " + validationResult.error.message,
      });
      return { success: false, errors, warnings };
    }

    return {
      success: true,
      data: parsedData,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push({
      type: "error",
      message: `Lỗi đọc file Excel: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
    return { success: false, errors, warnings };
  }
}

/**
 * Parse the quotation information sheet
 * Reads data directly from fixed cells according to specification:
 * - B6: supplierCode (Mã NCC)
 * - B7: supplierName (Tên NCC)
 * Note: period and region are provided from the import form
 */
function parseQuotationInfo(
  sheet: any,
  region: string,
  period: string
): { success: boolean; data?: QuotationInfo; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  try {
    // Read data directly from fixed cells as per specification
    // Note: period is now provided from import form, not from Excel
    const supplierCodeCell = sheet.getCell("B6");
    const supplierNameCell = sheet.getCell("B7");

    // Extract values and handle potential null/undefined
    const supplierCode = supplierCodeCell.value
      ? String(supplierCodeCell.value).trim()
      : "";
    const supplierName = supplierNameCell.value
      ? String(supplierNameCell.value).trim()
      : "";

    // Optional fields - check for quote date in nearby cells
    const quoteDateCell = sheet.getCell("B8"); // Assuming quote date might be in B8
    const quoteDate = quoteDateCell.value
      ? String(quoteDateCell.value).trim()
      : undefined;

    // Build the quotation info object using the region from the import form
    const quotationInfo: QuotationInfo = {
      period,
      region, // Use region passed from import form
      supplierCode,
      supplierName,
      quoteDate,
    };

    // Validate required fields
    const missingFields: string[] = [];
    if (!period) missingFields.push("period (from form)");
    if (!region) missingFields.push("region (from form)");
    if (!supplierCode) missingFields.push("supplierCode (B6)");
    if (!supplierName) missingFields.push("supplierName (B7)");

    if (missingFields.length > 0) {
      errors.push({
        type: "error",
        message: `Thiếu thông tin bắt buộc: ${missingFields.join(", ")}`,
      });
      return { success: false, errors };
    }

    // Validate the data against schema
    const validationResult = QuotationInfoSchema.safeParse(quotationInfo);
    if (!validationResult.success) {
      errors.push({
        type: "error",
        message:
          "Thông tin báo giá không hợp lệ: " + validationResult.error.message,
      });
      return { success: false, errors };
    }

    return {
      success: true,
      data: validationResult.data,
      errors,
    };
  } catch (error) {
    errors.push({
      type: "error",
      message: `Lỗi đọc sheet "Thông tin báo giá": ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
    return { success: false, errors };
  }
}

/**
 * Parse the product items sheet
 */
function parseQuotationItems(sheet: any): {
  success: boolean;
  data?: QuotationItem[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Use exceljs worksheet API
    // Convert sheet to JSON array (assuming first row is headers)
    const jsonData: any[][] = [];
    const maxRow = sheet.actualRowCount || 0;
    const maxCol = sheet.actualColumnCount || 0;

    for (let row = 1; row <= maxRow; row++) {
      const rowData: any[] = [];
      for (let col = 1; col <= maxCol; col++) {
        const cell = sheet.getCell(row, col);
        rowData.push(cell.value);
      }
      jsonData.push(rowData);
    }

    if (jsonData.length < 2) {
      errors.push({
        type: "error",
        message: 'Sheet "Danh sách sản phẩm" không có dữ liệu',
      });
      return { success: false, errors, warnings };
    }

    // Get headers from first row
    const headers = jsonData[0] as string[];

    // Expected column mapping (Vietnamese headers to English fields)
    const columnMapping: Record<string, string> = {
      "Mã sản phẩm": "productCode",
      "Tên sản phẩm": "productName",
      "Quy cách": "specification",
      "Đơn vị tính": "unit",
      "Số lượng": "quantity",
      "Đơn giá": "initialPrice",
      "VAT %": "vatRate",
      "Ghi chú": "notes",
    };

    // Find column indexes
    const columnIndexes: Record<string, number> = {};
    for (const [vietnameseHeader, englishField] of Object.entries(
      columnMapping
    )) {
      const index = headers.findIndex((header) =>
        String(header)
          .trim()
          .toLowerCase()
          .includes(vietnameseHeader.toLowerCase())
      );
      if (index !== -1) {
        columnIndexes[englishField] = index;
      }
    }

    // Validate required columns exist (only mandatory columns per business requirements)
    const requiredColumns = ["productCode", "initialPrice", "vatRate"];
    const missingColumns = requiredColumns.filter(
      (col) => columnIndexes[col] === undefined
    );

    if (missingColumns.length > 0) {
      errors.push({
        type: "error",
        message: `Thiếu cột bắt buộc trong sheet "Danh sách sản phẩm": ${missingColumns.join(
          ", "
        )}`,
      });
      return { success: false, errors, warnings };
    }

    // Parse data rows
    const items: QuotationItem[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const rowNumber = i + 1; // 1-based row number

      // Skip empty rows
      if (!row || row.every((cell) => !cell)) {
        continue;
      }

      try {
        const item: Partial<QuotationItem> = {};

        // Extract data based on column mapping
        for (const [field, columnIndex] of Object.entries(columnIndexes)) {
          const cellValue = row[columnIndex];

          if (
            cellValue !== undefined &&
            cellValue !== null &&
            cellValue !== ""
          ) {
            if (
              field === "quantity" ||
              field === "initialPrice" ||
              field === "vatRate"
            ) {
              const numValue = Number(cellValue);
              if (isNaN(numValue)) {
                errors.push({
                  type: "error",
                  message: `Giá trị số không hợp lệ tại dòng ${rowNumber}, cột ${field}`,
                  field,
                  row: rowNumber,
                });
                continue;
              }
              (item as any)[field] = numValue;
            } else {
              const stringValue = String(cellValue).trim();
              // Apply normalization for productCode
              (item as any)[field] = field === 'productCode' ? stringValue.toUpperCase() : stringValue;
            }
          }
        }

        // Set defaults for optional fields
        if ((item as any).vatRate === undefined) {
          (item as any).vatRate = 0;
          warnings.push({
            type: "warning",
            message: `Không có thông tin VAT tại dòng ${rowNumber}, sử dụng mặc định 0%`,
            row: rowNumber,
          });
        }

        if ((item as any).quantity === undefined) {
          (item as any).quantity = 1;
        }

        if ((item as any).productName === undefined) {
          (item as any).productName = "";
        }

        if ((item as any).unit === undefined) {
          (item as any).unit = "";
        }

        // Validate the item
        const validationResult = QuotationItemSchema.safeParse(item);
        if (validationResult.success) {
          items.push(validationResult.data);
        } else {
          errors.push({
            type: "error",
            message: `Dữ liệu không hợp lệ tại dòng ${rowNumber}: ${validationResult.error.message}`,
            row: rowNumber,
          });
        }
      } catch (error) {
        errors.push({
          type: "error",
          message: `Lỗi xử lý dòng ${rowNumber}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          row: rowNumber,
        });
      }
    }

    if (items.length === 0) {
      errors.push({
        type: "error",
        message:
          'Không tìm thấy sản phẩm hợp lệ nào trong sheet "Danh sách sản phẩm"',
      });
      return { success: false, errors, warnings };
    }

    return {
      success: true,
      data: items,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push({
      type: "error",
      message: `Lỗi đọc sheet "Danh sách sản phẩm": ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
    return { success: false, errors, warnings };
  }
}

/**
 * Validate supplier and product codes against database
 * This function should be called after parsing but before saving to database
 */
export interface CodeValidationResult {
  validSupplier: boolean;
  validProducts: string[];
  invalidProducts: string[];
  supplierName?: string;
  productNames: Record<string, string>;
}

export async function validateCodes(
  supplierCode: string,
  productCodes: string[]
): Promise<CodeValidationResult> {
  // This function will be implemented when database queries are available
  // For now, return a placeholder structure
  return {
    validSupplier: false,
    validProducts: [],
    invalidProducts: productCodes,
    productNames: {},
  };
}
