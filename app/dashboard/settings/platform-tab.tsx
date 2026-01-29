"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

export function PlatformTab() {
  const [title, setTitle] = useState("Law Firm Dashboard");
  const [description, setDescription] = useState("Professional immigration law firm management system");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/platform");
        if (response.ok) {
          const data = await response.json();
          setTitle(data.title || "Law Firm Dashboard");
          setDescription(data.description || "Professional immigration law firm management system");
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    // Validate PNG only
    if (file.type !== "image/png") {
      toast.error("Only PNG files are allowed");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await fetch("/api/settings/platform", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save settings");
      }

      toast.success("Platform settings saved successfully");
      
      // Reload to refresh logo everywhere
      if (logoFile) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label htmlFor="logo">Logo (PNG only)</Label>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label
                htmlFor="logo"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
              >
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    width={150}
                    height={100}
                    className="max-h-28 w-auto object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="size-8" />
                    <p className="text-sm">Click to upload logo</p>
                    <p className="text-xs">PNG only, max 5MB</p>
                  </div>
                )}
                <input
                  id="logo"
                  type="file"
                  accept=".png,image/png"
                  className="sr-only"
                  onChange={handleLogoChange}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                This will replace the current logo across the entire dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter dashboard title"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter dashboard description"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Used for page metadata and SEO
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            Save Settings
          </Button>
        </div>
      </div>
    </Card>
  );
}
