import { getDocumentById } from "@/data/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFileSize, getFileExtension } from "@/data/documents";
import { format } from "date-fns";
import { ArrowLeft, Download, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import DocumentDownloadButton from "./document-download-button";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

const DocumentPage = async ({ params }: DocumentPageProps) => {
  const { id } = await params;
  const document = getDocumentById(Number(id));

  if (!document) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/documents">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{document.title}</h1>
            {document.filename && (
              <p className="text-muted-foreground">
                {document.filename}
                {document.filename && (
                  <span className="ml-1">({getFileExtension(document.filename)})</span>
                )}
              </p>
            )}
          </div>
        </div>
        <DocumentDownloadButton documentUrl={document.doc_url} documentId={document.id} />
      </div>

      {/* Document Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info Card */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Document Information</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Title</h3>
              <p className="text-sm">{document.title}</p>
            </div>
            {document.description && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-sm">{document.description}</p>
              </div>
            )}
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">File Size</h3>
              <p className="text-sm">{formatFileSize(document.size)}</p>
            </div>
            {document.filename && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Filename</h3>
                <p className="text-sm">{document.filename}</p>
              </div>
            )}
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <Badge variant={document.archived ? "secondary" : "default"}>
                {document.archived ? "Archived" : "Active"}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Uploaded By</h3>
              <p className="text-sm">{document.uploaded_by_email || "Unknown"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
              <p className="text-sm">
                {format(new Date(document.created_at), "PPpp")}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
              <p className="text-sm">
                {format(new Date(document.updated_at), "PPpp")}
              </p>
            </div>
          </div>
        </div>

        {/* Document Preview Card */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Document Preview</h2>
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8">
            <div className="flex size-16 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">{document.title}</p>
              {document.filename && (
                <p className="text-sm text-muted-foreground">
                  {getFileExtension(document.filename)} • {formatFileSize(document.size)}
                </p>
              )}
            </div>
            <DocumentDownloadButton 
              documentUrl={document.doc_url} 
              documentId={document.id}
              variant="outline"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPage;

