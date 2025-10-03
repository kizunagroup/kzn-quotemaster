"use client";

import * as React from "react";
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle, X, Download } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { importProductsFromExcel, generateProductImportTemplate } from "@/lib/actions/product.actions";

interface ProductImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Import progress states
type ImportState =
  | { type: "idle" }
  | { type: "uploading"; progress: number }
  | { type: "processing" }
  | {
      type: "success";
      created: number;
      updated: number;
      errors: string[];
    }
  | { type: "error"; error: string };

export function ProductImportModal({
  open,
  onOpenChange,
  onSuccess,
}: ProductImportModalProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [importState, setImportState] = React.useState<ImportState>({
    type: "idle",
  });
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form and state when modal closes
  React.useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setImportState({ type: "idle" });
    }
  }, [open]);

  // Handle download template
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const result = await generateProductImportTemplate();

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      // Convert Base64 string back to Blob
      const blob = await (await fetch(
        `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.base64}`
      )).blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Template_Import_Hang_Hoa_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Đã tải Template Import thành công');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Có lỗi xảy ra khi tải template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Validate and process file
  const validateAndProcessFile = (file: File) => {
    // Validate file type
    const isExcel =
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel" ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls");

    if (!isExcel) {
      toast.error(`File ${file.name} không phải là file Excel`);
      return;
    }

    setSelectedFile(file);
  };

  // File selection handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
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

    const file = event.dataTransfer.files[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  // Remove file handler
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Form submission handler
  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Vui lòng chọn file Excel");
      return;
    }

    try {
      setImportState({ type: "uploading", progress: 0 });

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setImportState({ type: "uploading", progress: i });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      setImportState({ type: "processing" });

      // Convert file to ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();

      // Call the import action
      const result = await importProductsFromExcel(arrayBuffer);

      if (result.success && result.errors.length === 0) {
        setImportState({
          type: "success",
          created: result.created,
          updated: result.updated,
          errors: [],
        });
        toast.success(result.success);

        // Call success callback after a short delay to show results
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 2000);
      } else if (result.errors.length > 0) {
        // Partial success or errors
        setImportState({
          type: "success",
          created: result.created,
          updated: result.updated,
          errors: result.errors,
        });
        toast.warning(
          `Import hoàn tất với ${result.errors.length} lỗi. Vui lòng kiểm tra chi tiết.`
        );
      } else {
        setImportState({
          type: "error",
          error: result.errors[0] || "Có lỗi xảy ra khi import",
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportState({
        type: "error",
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    }
  };

  const isProcessing =
    importState.type === "uploading" || importState.type === "processing";
  const canSubmit = selectedFile && !isProcessing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Hàng hóa từ Excel
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              Tải lên file Excel chứa danh sách hàng hóa. File phải có sheet "Danh
              sách Hàng hóa" với các cột: Mã hàng, Tên hàng hóa, Quy cách, Đơn vị
              tính, Nhóm hàng, Giá cơ sở, Số lượng cơ sở, Trạng thái.
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="p-0 h-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloadingTemplate ? 'Đang tải...' : 'Tải file mẫu'}
            </Button>
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
                  <Upload
                    className={`h-8 w-8 mx-auto mb-2 ${isDragActive ? "text-blue-600" : "text-gray-400"}`}
                  />
                  <p className="text-sm font-medium mb-1">
                    {isDragActive
                      ? "Thả file vào đây..."
                      : "Kéo thả file Excel hoặc nhấn để chọn"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hỗ trợ file .xlsx, .xls
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected File */}
              {selectedFile && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">File đã chọn</label>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span className="text-sm truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {(selectedFile.size / 1024).toFixed(0)} KB
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
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
            onClick={handleImport}
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
                Import
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
            <span className="text-sm">Đang xử lý file Excel...</span>
          </div>
          <Progress value={50} className="w-full" />
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
              <span className="text-muted-foreground">Hàng hóa mới:</span>
              <span className="font-medium ml-1">{state.created}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Hàng hóa cập nhật:</span>
              <span className="font-medium ml-1">{state.updated}</span>
            </div>
          </div>
          {state.errors.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-yellow-600 font-medium">
                Lỗi ({state.errors.length}):
              </span>
              <ScrollArea className="h-[100px] w-full rounded border p-2">
                <ul className="text-xs text-muted-foreground space-y-1">
                  {state.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </ScrollArea>
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
