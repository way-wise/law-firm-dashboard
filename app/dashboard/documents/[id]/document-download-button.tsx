"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";

interface DocumentDownloadButtonProps {
  documentUrl: string;
  documentId: number;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  className?: string;
}

const DocumentDownloadButton = ({ 
  documentUrl, 
  documentId, 
  variant = "default",
  className 
}: DocumentDownloadButtonProps) => {
  const handleDownload = () => {
    // TODO: Implement download functionality
    // This would call GET /documents/:id/download to get temporary URL
    // For now, open the document URL
    window.open(documentUrl, "_blank");
  };

  return (
    <Button onClick={handleDownload} variant={variant} className={className}>
      <Download className="mr-2 size-4" />
      {variant === "outline" ? "Download Document" : "Download"}
    </Button>
  );
};

export default DocumentDownloadButton;

