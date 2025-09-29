import { z } from 'zod';

// Validation schemas for Excel data structure
export const QuotationInfoSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Period must be in YYYY-MM-DD format'),
  region: z.string().min(1, 'Region is required'),
  supplierCode: z.string().min(1, 'Supplier code is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  quoteDate: z.string().optional(),
});

export const QuotationItemSchema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  productName: z.string().min(1, 'Product name is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().positive('Quantity must be positive'),
  initialPrice: z.number().nonnegative('Price must be non-negative'),
  vatRate: z.number().min(0).max(100, 'VAT rate must be between 0 and 100'),
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
  type: 'error';
  message: string;
  field?: string;
  row?: number;
}

export interface ValidationWarning {
  type: 'warning';
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
export async function processExcelFile(file: File): Promise<ParseResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Dynamic import to reduce bundle size
    const XLSX = await import('xlsx');

    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Validate required sheets exist
    const requiredSheets = ['Thông tin báo giá', 'Danh sách sản phẩm'];
    const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));

    if (missingSheets.length > 0) {
      errors.push({
        type: 'error',
        message: `Thiếu sheet bắt buộc: ${missingSheets.join(', ')}`
      });
      return { success: false, errors, warnings };
    }

    // Parse quotation info sheet
    const infoSheet = workbook.Sheets['Thông tin báo giá'];
    const infoResult = parseQuotationInfo(infoSheet);

    if (!infoResult.success) {
      errors.push(...infoResult.errors);
      return { success: false, errors, warnings };
    }

    // Parse product items sheet
    const itemsSheet = workbook.Sheets['Danh sách sản phẩm'];
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
      items: itemsResult.data!
    };

    const validationResult = ParsedQuotationSchema.safeParse(parsedData);
    if (!validationResult.success) {
      errors.push({
        type: 'error',
        message: 'Dữ liệu không hợp lệ: ' + validationResult.error.message
      });
      return { success: false, errors, warnings };
    }

    return {
      success: true,
      data: parsedData,
      errors,
      warnings
    };

  } catch (error) {
    errors.push({
      type: 'error',
      message: `Lỗi đọc file Excel: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    return { success: false, errors, warnings };
  }
}

/**
 * Parse the quotation information sheet
 */
function parseQuotationInfo(sheet: any): { success: boolean; data?: QuotationInfo; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  try {
    // Dynamic import for xlsx utilities
    const XLSX = require('xlsx');

    // Convert sheet to JSON with expected structure
    // Assuming the info sheet has labeled cells like:
    // A1: "Kỳ báo giá:", B1: "2024-01-01"
    // A2: "Khu vực:", B2: "Hà Nội"
    // A3: "Mã NCC:", B3: "NCC001"
    // A4: "Tên NCC:", B4: "Công ty ABC"

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:B10');
    const data: Record<string, string> = {};

    // Read key-value pairs from the sheet
    for (let row = range.s.r; row <= range.e.r; row++) {
      const keyCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
      const valueCell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];

      if (keyCell && valueCell) {
        const key = String(keyCell.v).trim().replace(':', '');
        const value = String(valueCell.v).trim();
        data[key] = value;
      }
    }

    // Map Vietnamese labels to English fields
    const fieldMapping: Record<string, string> = {
      'Kỳ báo giá': 'period',
      'Khu vực': 'region',
      'Mã NCC': 'supplierCode',
      'Tên NCC': 'supplierName',
      'Ngày báo giá': 'quoteDate'
    };

    const mappedData: Partial<QuotationInfo> = {};

    for (const [vietnameseLabel, englishField] of Object.entries(fieldMapping)) {
      if (data[vietnameseLabel]) {
        mappedData[englishField as keyof QuotationInfo] = data[vietnameseLabel];
      }
    }

    // Validate required fields
    const requiredFields = ['period', 'region', 'supplierCode', 'supplierName'];
    const missingFields = requiredFields.filter(field => !mappedData[field as keyof QuotationInfo]);

    if (missingFields.length > 0) {
      errors.push({
        type: 'error',
        message: `Thiếu thông tin bắt buộc trong sheet "Thông tin báo giá": ${missingFields.join(', ')}`
      });
      return { success: false, errors };
    }

    // Validate the data against schema
    const validationResult = QuotationInfoSchema.safeParse(mappedData);
    if (!validationResult.success) {
      errors.push({
        type: 'error',
        message: 'Thông tin báo giá không hợp lệ: ' + validationResult.error.message
      });
      return { success: false, errors };
    }

    return {
      success: true,
      data: validationResult.data,
      errors
    };

  } catch (error) {
    errors.push({
      type: 'error',
      message: `Lỗi đọc sheet "Thông tin báo giá": ${error instanceof Error ? error.message : 'Unknown error'}`
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
    // Dynamic import for xlsx utilities
    const XLSX = require('xlsx');

    // Convert sheet to JSON array (assuming first row is headers)
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (jsonData.length < 2) {
      errors.push({
        type: 'error',
        message: 'Sheet "Danh sách sản phẩm" không có dữ liệu'
      });
      return { success: false, errors, warnings };
    }

    // Get headers from first row
    const headers = jsonData[0] as string[];

    // Expected column mapping (Vietnamese headers to English fields)
    const columnMapping: Record<string, string> = {
      'Mã sản phẩm': 'productCode',
      'Tên sản phẩm': 'productName',
      'Quy cách': 'specification',
      'Đơn vị tính': 'unit',
      'Số lượng': 'quantity',
      'Đơn giá': 'initialPrice',
      'VAT (%)': 'vatRate',
      'Ghi chú': 'notes'
    };

    // Find column indexes
    const columnIndexes: Record<string, number> = {};
    for (const [vietnameseHeader, englishField] of Object.entries(columnMapping)) {
      const index = headers.findIndex(header =>
        String(header).trim().toLowerCase().includes(vietnameseHeader.toLowerCase())
      );
      if (index !== -1) {
        columnIndexes[englishField] = index;
      }
    }

    // Validate required columns exist
    const requiredColumns = ['productCode', 'productName', 'unit', 'quantity', 'initialPrice'];
    const missingColumns = requiredColumns.filter(col => columnIndexes[col] === undefined);

    if (missingColumns.length > 0) {
      errors.push({
        type: 'error',
        message: `Thiếu cột bắt buộc trong sheet "Danh sách sản phẩm": ${missingColumns.join(', ')}`
      });
      return { success: false, errors, warnings };
    }

    // Parse data rows
    const items: QuotationItem[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const rowNumber = i + 1; // 1-based row number

      // Skip empty rows
      if (!row || row.every(cell => !cell)) {
        continue;
      }

      try {
        const item: Partial<QuotationItem> = {};

        // Extract data based on column mapping
        for (const [field, columnIndex] of Object.entries(columnIndexes)) {
          const cellValue = row[columnIndex];

          if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
            if (field === 'quantity' || field === 'initialPrice' || field === 'vatRate') {
              const numValue = Number(cellValue);
              if (isNaN(numValue)) {
                errors.push({
                  type: 'error',
                  message: `Giá trị số không hợp lệ tại dòng ${rowNumber}, cột ${field}`,
                  field,
                  row: rowNumber
                });
                continue;
              }
              item[field as keyof QuotationItem] = numValue;
            } else {
              item[field as keyof QuotationItem] = String(cellValue).trim();
            }
          }
        }

        // Set default VAT rate if not provided
        if (item.vatRate === undefined) {
          item.vatRate = 0;
          warnings.push({
            type: 'warning',
            message: `Không có thông tin VAT tại dòng ${rowNumber}, sử dụng mặc định 0%`,
            row: rowNumber
          });
        }

        // Validate the item
        const validationResult = QuotationItemSchema.safeParse(item);
        if (validationResult.success) {
          items.push(validationResult.data);
        } else {
          errors.push({
            type: 'error',
            message: `Dữ liệu không hợp lệ tại dòng ${rowNumber}: ${validationResult.error.message}`,
            row: rowNumber
          });
        }

      } catch (error) {
        errors.push({
          type: 'error',
          message: `Lỗi xử lý dòng ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          row: rowNumber
        });
      }
    }

    if (items.length === 0) {
      errors.push({
        type: 'error',
        message: 'Không tìm thấy sản phẩm hợp lệ nào trong sheet "Danh sách sản phẩm"'
      });
      return { success: false, errors, warnings };
    }

    return {
      success: true,
      data: items,
      errors,
      warnings
    };

  } catch (error) {
    errors.push({
      type: 'error',
      message: `Lỗi đọc sheet "Danh sách sản phẩm": ${error instanceof Error ? error.message : 'Unknown error'}`
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
    productNames: {}
  };
}