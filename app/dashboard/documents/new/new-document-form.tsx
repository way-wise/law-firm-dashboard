"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const documentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  filename: z.string().min(1, "Filename is required"),
  description: z.string().optional(),
  client_id: z.string().optional(),
  matter_id: z.string().optional(),
  base64_data: z.string().optional(), // For file upload
});

type DocumentInput = z.infer<typeof documentSchema>;

const NewDocumentForm = () => {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<DocumentInput>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      filename: "",
      description: "",
      client_id: "",
      matter_id: "",
      base64_data: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      form.setValue("filename", file.name);
      
      // Convert file to base64 (for demo purposes)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue("base64_data", base64String.split(",")[1] || "");
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: DocumentInput) => {
    console.log("New document:", data);
    // TODO: API call - POST /documents
    // await fetch("/api/documents", {
    //   method: "POST",
    //   body: JSON.stringify({ document: data }),
    // });
    router.push("/dashboard/documents");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/documents">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Upload Document</h1>
          <p className="text-muted-foreground">Add a new document to the system</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-card p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
          <FieldSet disabled={form.formState.isSubmitting}>
            <FieldGroup>
              <FieldGroup className="grid sm:grid-cols-2">
                <Controller
                  name="title"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="title">
                        Title <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input {...field} id="title" placeholder="Document title" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name="filename"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="filename">
                        Filename <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id="filename"
                        placeholder="document.pdf"
                        readOnly
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </FieldGroup>

              <Field>
                <FieldLabel htmlFor="file">File Upload</FieldLabel>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="file"
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 hover:bg-muted"
                  >
                    <Upload className="size-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : "Choose file"}
                    </span>
                    <input
                      id="file"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>
                {selectedFile && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </Field>

              <FieldGroup className="grid sm:grid-cols-2">
                <Controller
                  name="client_id"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="client_id">Client ID</FieldLabel>
                      <Input
                        {...field}
                        id="client_id"
                        type="number"
                        placeholder="Optional"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name="matter_id"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="matter_id">Matter ID</FieldLabel>
                      <Input
                        {...field}
                        id="matter_id"
                        type="number"
                        placeholder="Optional"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </FieldGroup>

              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      {...field}
                      id="description"
                      placeholder="Enter document description..."
                      rows={4}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/documents">Cancel</Link>
              </Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>
                <FileText className="mr-2 size-4" />
                Upload Document
              </Button>
            </div>
          </FieldSet>
        </form>
      </div>
    </div>
  );
};

export default NewDocumentForm;

