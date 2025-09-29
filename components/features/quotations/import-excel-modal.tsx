"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { RegionAutocomplete } from "@/components/ui/region-autocomplete";
import {
  importQuotationsFromExcel,
  type ImportResult,
} from "@/lib/actions/quotations.actions";

// Form validation schema
const importFormSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Kỳ báo giá phải có định dạng YYYY-MM-DD (ví dụ: 2024-01-01)",
  }),
  region: z.string().min(1, {
    message: "Vui lòng chọn khu vực",
  }),
  overwrite: z.boolean().default(false),
});

type ImportFormValues = z.infer<typeof importFormSchema>;

interface ImportExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Import progress states
type ImportState =
  | { type: "idle" }
  | { type: "uploading"; progress: number }
  | { type: "processing"; files: number; current: number }
  | { type: "success"; result: ImportResult }
  | { type: "error"; error: string };

export function ImportExcelModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportExcelModalProps) {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [importState, setImportState] = React.useState<ImportState>({ type: "idle" });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      period: "",
      region: "",
      overwrite: false,
    },
  });

  // Reset form and state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedFiles([]);
      setImportState({ type: "idle" });
    }
  }, [open, form]);

  // File selection handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Validate file types
    const validFiles = files.filter(file => {
      const isExcel = file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                     file.type === "application/vnd.ms-excel" ||
                     file.name.endsWith(".xlsx") ||
                     file.name.endsWith(".xls");

      if (!isExcel) {
        toast.error(`File ${file.name} không phải là file Excel`);
        return false;
      }

      return true;
    });

    setSelectedFiles(validFiles);

    // Auto-suggest period from first file name if it contains a date pattern
    if (validFiles.length > 0 && !form.getValues("period")) {
      const fileName = validFiles[0].name;
      const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        form.setValue("period", dateMatch[0]);
      }
    }
  };

  // Remove file handler
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  // Clear all files
  const handleClearFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Form submission handler
  const onSubmit = async (values: ImportFormValues) => {
    if (selectedFiles.length === 0) {
      toast.error("Vui lòng chọn ít nhất một file Excel");
      return;
    }

    try {
      setImportState({ type: "uploading", progress: 0 });

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setImportState({ type: "uploading", progress: i });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setImportState({
        type: "processing",
        files: selectedFiles.length,
        current: 0
      });

      // Call the import action
      const result = await importQuotationsFromExcel(selectedFiles, {
        period: values.period,
        region: values.region,
        overwrite: values.overwrite,
      });

      if (result.success) {
        setImportState({ type: "success", result });
        toast.success(
          `Import thành công: ${result.createdQuotations} báo giá mới, ${result.updatedQuotations} báo giá cập nhật`
        );

        // Call success callback after a short delay to show results
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 2000);
      } else {
        setImportState({
          type: "error",
          error: result.errors.join(", ") || "Có lỗi xảy ra khi import"
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportState({
        type: "error",
        error: error instanceof Error ? error.message : "Lỗi không xác định"
      });
    }
  };

  const isProcessing = importState.type === "uploading" || importState.type === "processing";
  const canSubmit = selectedFiles.length > 0 && !isProcessing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Báo giá từ Excel
          </DialogTitle>
          <DialogDescription>
            Tải lên các file Excel chứa báo giá từ nhà cung cấp.
            Mỗi file phải có sheet "Thông tin báo giá" và "Danh sách sản phẩm".
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Import Progress */}
            {importState.type !== "idle" && (
              <Card>
                <CardContent className="pt-6">
                  <ImportProgress state={importState} />
                </CardContent>
              </Card>
            )}

            {/* File Selection */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Chọn file Excel</label>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Chọn file...
                  </Button>
                  {selectedFiles.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFiles}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                      Xóa tất cả
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    File đã chọn ({selectedFiles.length})
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileSpreadsheet className="h-4 w-4 text-green-600" />
                          <span className="text-sm truncate" title={file.name}>
                            {file.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {(file.size / 1024).toFixed(0)} KB
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                          disabled={isProcessing}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Import Form */}
            {selectedFiles.length > 0 && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Period Field */}
                  <FormField
                    control={form.control}
                    name="period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kỳ báo giá *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="YYYY-MM-DD (ví dụ: 2024-01-01)"
                            {...field}
                            disabled={isProcessing}
                          />
                        </FormControl>
                        <FormDescription>
                          Định dạng: YYYY-MM-DD. Kỳ này phải khớp với thông tin trong file Excel.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Region Field */}
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Khu vực *</FormLabel>
                        <FormControl>
                          <RegionAutocomplete
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Chọn khu vực..."
                            disabled={isProcessing}
                          />
                        </FormControl>
                        <FormDescription>
                          Khu vực này phải khớp với thông tin trong file Excel.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Overwrite Checkbox */}
                  <FormField
                    control={form.control}
                    name="overwrite"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isProcessing}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Ghi đè báo giá trùng lặp
                          </FormLabel>
                          <FormDescription>
                            Nếu đã có báo giá cho NCC trong cùng kỳ và khu vực,
                            hệ thống sẽ cập nhật thay vì tạo mới.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={!canSubmit}
            className="min-w-[120px]"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Đang xử lý...
              </div>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import ({selectedFiles.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Import progress component
function ImportProgress({ state }: { state: ImportState }) {
  switch (state.type) {
    case "uploading":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Đang tải file lên...</span>
          </div>
          <Progress value={state.progress} className="w-full" />
        </div>
      );

    case "processing":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">
              Đang xử lý file {state.current + 1} / {state.files}...
            </span>
          </div>
          <Progress value={(state.current / state.files) * 100} className="w-full" />
        </div>
      );

    case "success":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Import thành công!</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">File đã xử lý:</span>
              <span className="font-medium ml-1">{state.result.processedFiles}/{state.result.totalFiles}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Báo giá mới:</span>
              <span className="font-medium ml-1">{state.result.createdQuotations}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Báo giá cập nhật:</span>
              <span className="font-medium ml-1">{state.result.updatedQuotations}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tổng sản phẩm:</span>
              <span className="font-medium ml-1">{state.result.totalItems}</span>
            </div>
          </div>
          {state.result.warnings.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-yellow-600 font-medium">Cảnh báo:</span>
              <ul className="text-xs text-muted-foreground space-y-1">
                {state.result.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );

    case "error":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Có lỗi xảy ra</span>
          </div>
          <p className="text-sm text-muted-foreground">{state.error}</p>
        </div>
      );

    default:
      return null;
  }
}