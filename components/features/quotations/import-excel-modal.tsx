"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle, X, ChevronUp, ChevronDown } from "lucide-react";
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
  getLatestPeriod,
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
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [periodYear, setPeriodYear] = React.useState("");
  const [periodMonth, setPeriodMonth] = React.useState("");
  const [periodSequence, setPeriodSequence] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      period: "",
      region: "",
      overwrite: false,
    },
  });

  // Load latest period when modal opens
  React.useEffect(() => {
    if (open) {
      const loadLatestPeriod = async () => {
        try {
          const latestPeriod = await getLatestPeriod();
          if (latestPeriod) {
            // Parse period: YYYY-MM-XX
            const parts = latestPeriod.split("-");
            if (parts.length === 3) {
              setPeriodYear(parts[0]);
              setPeriodMonth(parts[1]);
              const currentSequence = parseInt(parts[2], 10);
              // Auto-increment sequence for new period
              setPeriodSequence(String(currentSequence + 1).padStart(2, "0"));
            }
          } else {
            // No existing periods, suggest first period
            const now = new Date();
            setPeriodYear(String(now.getFullYear()));
            setPeriodMonth(String(now.getMonth() + 1).padStart(2, "0"));
            setPeriodSequence("01");
          }
        } catch (error) {
          console.error("Error loading latest period:", error);
        }
      };

      loadLatestPeriod();
    }
  }, [open]);

  // Sync period parts to form value
  React.useEffect(() => {
    if (periodYear && periodMonth && periodSequence) {
      const period = `${periodYear}-${periodMonth}-${periodSequence}`;
      form.setValue("period", period);
    }
  }, [periodYear, periodMonth, periodSequence, form]);

  // Reset form and state when modal closes
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedFiles([]);
      setImportState({ type: "idle" });
      setPeriodYear("");
      setPeriodMonth("");
      setPeriodSequence("");
    }
  }, [open, form]);

  // Period input handlers
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPeriodYear(value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2);
    if (value === "" || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 12)) {
      setPeriodMonth(value.padStart(2, "0"));
    }
  };

  const handleSequenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2);
    setPeriodSequence(value.padStart(2, "0"));
  };

  const handleSequenceIncrement = () => {
    const current = parseInt(periodSequence || "0", 10);
    setPeriodSequence(String(current + 1).padStart(2, "0"));
  };

  const handleSequenceDecrement = () => {
    const current = parseInt(periodSequence || "0", 10);
    if (current > 1) {
      setPeriodSequence(String(current - 1).padStart(2, "0"));
    }
  };

  // Validate and process files
  const validateAndProcessFiles = (files: File[]) => {
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
  };

  // File selection handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    validateAndProcessFiles(files);
  };

  // Drag and drop handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(event.dataTransfer.files);
    validateAndProcessFiles(files);
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

            {/* File Selection with Drag & Drop */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Chọn file Excel</label>
                <div
                  className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                >
                  <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragActive ? "text-blue-600" : "text-gray-400"}`} />
                  <p className="text-sm font-medium mb-1">
                    {isDragActive ? "Thả file vào đây..." : "Kéo thả file Excel hoặc nhấn để chọn"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hỗ trợ file .xlsx, .xls
                  </p>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFiles}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Xóa tất cả
                    </Button>
                  </div>
                )}
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
                  {/* Period Field - 3-Part Input */}
                  <FormField
                    control={form.control}
                    name="period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kỳ báo giá *</FormLabel>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {/* Year Input */}
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Năm (YYYY)
                              </label>
                              <Input
                                type="text"
                                placeholder="2024"
                                value={periodYear}
                                onChange={handleYearChange}
                                disabled={isProcessing}
                                className="text-center"
                                maxLength={4}
                              />
                            </div>

                            <span className="text-xl text-muted-foreground pt-5">-</span>

                            {/* Month Input */}
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Tháng (MM)
                              </label>
                              <Input
                                type="text"
                                placeholder="01"
                                value={periodMonth}
                                onChange={handleMonthChange}
                                disabled={isProcessing}
                                className="text-center"
                                maxLength={2}
                              />
                            </div>

                            <span className="text-xl text-muted-foreground pt-5">-</span>

                            {/* Sequence Input with Up/Down Buttons */}
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Đợt (XX)
                              </label>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="text"
                                  placeholder="01"
                                  value={periodSequence}
                                  onChange={handleSequenceChange}
                                  disabled={isProcessing}
                                  className="text-center"
                                  maxLength={2}
                                />
                                <div className="flex flex-col gap-0.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSequenceIncrement}
                                    disabled={isProcessing}
                                    className="h-5 w-6 p-0"
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSequenceDecrement}
                                    disabled={isProcessing || parseInt(periodSequence || "0", 10) <= 1}
                                    className="h-5 w-6 p-0"
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Preview of complete period */}
                          {periodYear && periodMonth && periodSequence && (
                            <div className="text-sm text-muted-foreground">
                              Kỳ: <span className="font-medium">{periodYear}-{periodMonth}-{periodSequence}</span>
                            </div>
                          )}
                        </div>
                        <FormDescription>
                          Kỳ báo giá tự động tăng dựa trên kỳ mới nhất. Kỳ này phải khớp với thông tin trong file Excel.
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