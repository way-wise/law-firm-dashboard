"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Upload, FileImage, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  value?: File[];
  onValueChange?: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  accept = "image/*,.pdf,.txt,.md",
  maxSize = 5 * 1024 * 1024, // 5MB
  maxFiles = 1,
  value = [],
  onValueChange,
  className,
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>(value);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return;

    const fileArray = Array.from(selectedFiles);
    const validFiles = fileArray.filter(file => file.size <= maxSize);
    
    if (validFiles.length === 0) return;

    const newFiles = [...files, ...validFiles].slice(0, maxFiles);
    setFiles(newFiles);
    onValueChange?.(newFiles);

    // Generate previews for images
    validFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((prev) => ({
            ...prev,
            [file.name]: e.target?.result as string,
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const removedFile = files[index];
    setFiles(newFiles);
    onValueChange?.(newFiles);

    // Remove preview if it exists
    if (previews[removedFile.name]) {
      setPreviews((prev) => {
        const newPreviews = { ...prev };
        delete newPreviews[removedFile.name];
        return newPreviews;
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <FileImage className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} file(s), up to {formatFileSize(maxSize)}
          </p>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <Card key={file.name} className="p-3">
              <div className="flex items-center gap-3">
                {previews[file.name] ? (
                  <Image
                    src={previews[file.name]}
                    alt={file.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                    {getFileIcon(file)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
